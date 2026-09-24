<?php

namespace App\Services;

use App\Exceptions\RecipeScrapingException;
use GuzzleHttp\Exception\RequestException;
use Illuminate\Http\Client\ConnectionException;
use Illuminate\Http\Client\Response;
use Illuminate\Support\Facades\Http;

class RecipeScraperService
{
    // Mirrors App\Models\Recipe::rules()'s declared bounds - scraped content
    // is stored via RecipeService::create() without going through a
    // FormRequest, so nothing else enforces these limits before it's saved.
    private const MAX_TITLE_LENGTH = 255;

    private const MAX_INGREDIENTS = 20;

    private const MAX_INGREDIENT_LENGTH = 255;

    private const MAX_INSTRUCTIONS = 50;

    private const MAX_INSTRUCTION_LENGTH = 1000;

    private const MAX_REDIRECTS = 3;

    private const MAX_JSON_LD_DEPTH = 6;

    public function __construct(
        private readonly SsrfGuard $ssrfGuard,
    ) {}

    /**
     * Fetch and extract a recipe from a whitelisted URL.
     *
     * @return array{title: string, ingredients: list<string>, instructions: list<string>}
     */
    public function extract(string $url): array
    {
        $extracted = $this->capExtraction($this->parse($this->fetch($url)));

        if ($extracted['title'] === '' || $extracted['ingredients'] === []) {
            throw new RecipeScrapingException('Could not extract a recipe from this page.');
        }

        return $extracted;
    }

    /**
     * Fetch the page body, following a bounded number of redirects.
     *
     * Sites move their recipes around (receitas.globo.com now answers with a
     * redirect to gshow.globo.com; plain http:// links bounce to https://), so
     * refusing every redirect made perfectly valid links fail. Redirects are
     * still never delegated to Guzzle: each hop is re-validated through the
     * SSRF guard - whitelist and resolved IP - exactly like the original URL,
     * so a redirect can never lead the scraper off the whitelist.
     */
    private function fetch(string $url): string
    {
        for ($hop = 0; $hop <= self::MAX_REDIRECTS; $hop++) {
            $response = $this->request($url);

            if (! $response->redirect()) {
                return $this->body($response);
            }

            $location = $response->header('Location');
            if ($location === '') {
                throw new RecipeScrapingException('Could not fetch the page.');
            }

            $url = $this->resolveLocation($url, $location);
        }

        throw new RecipeScrapingException('Too many redirects.');
    }

    /**
     * Perform a single, non-following GET against an SSRF-validated URL.
     */
    private function request(string $url): Response
    {
        $maxBytes = (int) config('scraper.max_response_bytes');

        // assertSafe resolves and validates the host's IP; pin the actual
        // connection to that same IP (CURLOPT_RESOLVE) instead of letting
        // Guzzle/cURL re-resolve the hostname independently, otherwise DNS
        // changing between the check and this request bypasses the guard.
        $ips = $this->ssrfGuard->assertSafe($url);
        $parts = parse_url($url);
        if ($parts === false || ! isset($parts['host'], $parts['scheme'])) {
            // Unreachable in practice - assertSafe() above already parsed
            // and validated this same URL - but keeps this method's own
            // typing sound independent of that.
            throw new RecipeScrapingException('Invalid URL.');
        }
        $host = strtolower($parts['host']);
        $port = $parts['port'] ?? (strtolower($parts['scheme']) === 'https' ? 443 : 80);

        try {
            // Recipe portals sit behind CDNs/WAFs that reject the default
            // "GuzzleHttp/7" agent outright, so present as a regular browser.
            return Http::timeout((int) config('scraper.timeout'))
                ->withHeaders([
                    'User-Agent' => (string) config('scraper.user_agent'),
                    'Accept' => 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
                    'Accept-Language' => 'pt-BR,pt;q=0.9,en;q=0.8',
                ])
                ->withOptions([
                    'allow_redirects' => false,
                    'curl' => [
                        CURLOPT_RESOLVE => ["{$host}:{$port}:{$ips[0]}"],
                        // Content-Length can be absent (chunked encoding) or
                        // simply lied about, so enforce the size cap against
                        // bytes actually received, not just the header.
                        CURLOPT_NOPROGRESS => false,
                        CURLOPT_XFERINFOFUNCTION => function ($resource, $downloadSize, $downloaded) use ($maxBytes) {
                            return $downloaded > $maxBytes ? 1 : 0;
                        },
                    ],
                ])
                ->get($url);
        } catch (ConnectionException) {
            throw new RecipeScrapingException('URL extraction timeout.');
        } catch (RequestException) {
            throw new RecipeScrapingException('Response too large.');
        }
    }

    /**
     * Validate a final (non-redirect) response and return its body.
     */
    private function body(Response $response): string
    {
        $maxBytes = (int) config('scraper.max_response_bytes');

        if (! $response->successful()) {
            throw new RecipeScrapingException('Could not fetch the page.');
        }

        $contentLength = $response->header('Content-Length');
        if ($contentLength !== '' && (int) $contentLength > $maxBytes) {
            throw new RecipeScrapingException('Response too large.');
        }

        $body = $response->body();
        if (strlen($body) > $maxBytes) {
            throw new RecipeScrapingException('Response too large.');
        }

        return $body;
    }

    /**
     * Turn a Location header (absolute, protocol-relative or path-relative)
     * into an absolute URL based on the URL that produced it.
     */
    private function resolveLocation(string $base, string $location): string
    {
        if (preg_match('#^[a-z][a-z0-9+.\-]*://#i', $location) === 1) {
            return $location;
        }

        $parts = parse_url($base);
        if ($parts === false || ! isset($parts['scheme'], $parts['host'])) {
            throw new RecipeScrapingException('Invalid URL.');
        }

        $scheme = $parts['scheme'];
        if (str_starts_with($location, '//')) {
            return "{$scheme}:{$location}";
        }

        $origin = "{$scheme}://{$parts['host']}".(isset($parts['port']) ? ":{$parts['port']}" : '');
        if (str_starts_with($location, '/')) {
            return $origin.$location;
        }

        $directory = preg_replace('#/[^/]*$#', '/', $parts['path'] ?? '/') ?? '/';

        return $origin.$directory.$location;
    }

    /**
     * @param  array{title: string, ingredients: list<string>, instructions: list<string>}  $extracted
     * @return array{title: string, ingredients: list<string>, instructions: list<string>}
     */
    private function capExtraction(array $extracted): array
    {
        return [
            'title' => mb_substr($extracted['title'], 0, self::MAX_TITLE_LENGTH),
            'ingredients' => $this->capList($extracted['ingredients'], self::MAX_INGREDIENTS, self::MAX_INGREDIENT_LENGTH),
            'instructions' => $this->capList($extracted['instructions'], self::MAX_INSTRUCTIONS, self::MAX_INSTRUCTION_LENGTH),
        ];
    }

    /**
     * @param  list<string>  $items
     * @return list<string>
     */
    private function capList(array $items, int $maxCount, int $maxLength): array
    {
        return array_map(
            fn (string $item) => mb_substr($item, 0, $maxLength),
            array_slice($items, 0, $maxCount)
        );
    }

    /**
     * @return array{title: string, ingredients: list<string>, instructions: list<string>}
     */
    private function parse(string $html): array
    {
        return $this->parseJsonLd($html) ?? $this->parseHeuristic($html);
    }

    /**
     * Try schema.org Recipe structured data (JSON-LD) first - the reliable
     * path when the site provides it.
     *
     * @return array{title: string, ingredients: list<string>, instructions: list<string>}|null
     */
    private function parseJsonLd(string $html): ?array
    {
        if (! preg_match_all(
            '/<script[^>]*type=["\']application\/ld\+json["\'][^>]*>(.*?)<\/script>/is',
            $html,
            $matches
        )) {
            return null;
        }

        foreach ($matches[1] as $block) {
            $data = json_decode(trim($block), true);
            if (! is_array($data)) {
                continue;
            }

            $node = $this->findRecipeNode($data, 0);
            if ($node === null) {
                continue;
            }

            $ingredients = array_values(array_filter(array_map(
                fn ($v) => is_string($v) ? $this->clean($v) : '',
                (array) ($node['recipeIngredient'] ?? $node['ingredients'] ?? [])
            ), fn ($v) => $v !== ''));

            return [
                'title' => is_string($node['name'] ?? null) ? $this->clean($node['name']) : '',
                'ingredients' => $ingredients,
                'instructions' => $this->extractInstructions($node['recipeInstructions'] ?? []),
            ];
        }

        return null;
    }

    /**
     * Depth-first search for the schema.org Recipe node. Sites nest it in
     * every possible way - a bare object, a list, an "@graph", or inside a
     * WebPage's "mainEntity" - so walk the whole (bounded-depth) structure
     * rather than guessing the wrapper.
     *
     * @param  array<mixed>  $data
     * @return array<mixed>|null
     */
    private function findRecipeNode(array $data, int $depth): ?array
    {
        if ($depth > self::MAX_JSON_LD_DEPTH) {
            return null;
        }

        if ($this->isRecipeNode($data)) {
            return $data;
        }

        foreach ($data as $value) {
            if (is_array($value)) {
                $found = $this->findRecipeNode($value, $depth + 1);
                if ($found !== null) {
                    return $found;
                }
            }
        }

        return null;
    }

    /**
     * @param  array<mixed>  $node
     */
    private function isRecipeNode(array $node): bool
    {
        $types = array_filter((array) ($node['@type'] ?? []), 'is_string');

        foreach ($types as $type) {
            // Accept "Recipe" as well as prefixed/IRI forms like
            // "schema:Recipe" or "http://schema.org/Recipe".
            if (preg_match('#(^|[/:])Recipe$#', $type) === 1) {
                return true;
            }
        }

        return false;
    }

    /**
     * recipeInstructions is commonly a string, a list of strings, a list of
     * HowToStep objects with a "text" field, or HowToSection objects that
     * group steps under "itemListElement".
     *
     * @return list<string>
     */
    private function extractInstructions(mixed $raw): array
    {
        $steps = array_values(array_filter(
            array_map(fn (string $s) => $this->clean($s), $this->collectSteps($raw, 0)),
            fn (string $s) => $s !== ''
        ));

        return array_map(
            fn (string $step, int $index) => $this->stripLeadingStepNumber($step, $index + 1),
            $steps,
            array_keys($steps),
        );
    }

    /**
     * @return list<string>
     */
    private function collectSteps(mixed $raw, int $depth): array
    {
        if ($depth > self::MAX_JSON_LD_DEPTH) {
            return [];
        }

        if (is_string($raw)) {
            // A single string may hold every step, separated by line breaks
            // or HTML paragraphs/list items.
            $parts = preg_split('#\r\n|\n|<br\s*/?>|</p>|</li>#i', $raw) ?: [$raw];

            return array_map(fn (string $p) => strip_tags($p), $parts);
        }

        if (! is_array($raw)) {
            return [];
        }

        if (isset($raw['itemListElement'])) {
            return $this->collectSteps($raw['itemListElement'], $depth + 1);
        }

        if (! array_is_list($raw)) {
            $text = $raw['text'] ?? $raw['name'] ?? '';

            return is_string($text) ? [strip_tags($text)] : [];
        }

        $steps = [];
        foreach ($raw as $item) {
            array_push($steps, ...$this->collectSteps($item, $depth + 1));
        }

        return $steps;
    }

    /**
     * Strip a leading step number that duplicates the step's own position.
     *
     * Some sites embed the step number in the instruction text ("2 Quando o
     * leite ferver...", or "2. ..."), which the UI then renders a second time
     * because it numbers the list itself. Only strip a leading number that
     * equals this step's 1-based position, so genuine content like a step that
     * really starts with a quantity is never touched.
     */
    private function stripLeadingStepNumber(string $text, int $position): string
    {
        $pattern = '/^'.$position.'\s*[.)\-\x{2013}\x{2014}]?\s+/u';

        return preg_replace($pattern, '', $text) ?? $text;
    }

    /**
     * Normalize a scraped text fragment.
     *
     * Some sites (e.g. TudoGostoso) HTML-encode - and even double-encode -
     * accented characters inside their JSON-LD, so a HowToStep text arrives
     * as "l&amp;iacute;quidos" instead of "líquidos". json_decode() only
     * resolves JSON escapes, never HTML entities, so decode them here.
     * Decode repeatedly until stable to unwrap the double-encoded case.
     */
    private function clean(string $text): string
    {
        do {
            $previous = $text;
            $text = html_entity_decode($text, ENT_QUOTES | ENT_HTML5, 'UTF-8');
        } while ($text !== $previous);

        $text = preg_replace('/\s+/u', ' ', $text) ?? $text;

        return trim($text);
    }

    /**
     * Fallback for pages without schema.org markup: a generic best-effort
     * scrape (title from the first <h1>, ingredients from common list
     * class names). Deliberately loose - this is a fallback, not the
     * primary extraction path.
     *
     * @return array{title: string, ingredients: list<string>, instructions: list<string>}
     */
    private function parseHeuristic(string $html): array
    {
        $dom = new \DOMDocument;
        libxml_use_internal_errors(true);
        $dom->loadHTML($html);
        libxml_clear_errors();

        $xpath = new \DOMXPath($dom);

        $title = '';
        $h1 = $xpath->query('//h1');
        if ($h1 !== false && $h1->length > 0) {
            $title = $this->clean($h1->item(0)->textContent ?? '');
        }

        $ingredients = [];
        $nodes = $xpath->query(
            '//*[contains(concat(" ", normalize-space(@class), " "), " ingredient")]//li'
            .' | //*[contains(concat(" ", normalize-space(@class), " "), " ingredients")]//li'
        );
        if ($nodes !== false) {
            foreach ($nodes as $node) {
                $text = $this->clean($node->textContent ?? '');
                if ($text !== '') {
                    $ingredients[] = $text;
                }
            }
        }

        return [
            'title' => $title,
            'ingredients' => $ingredients,
            'instructions' => [],
        ];
    }
}
