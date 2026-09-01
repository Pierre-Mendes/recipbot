<?php

namespace App\Services;

use App\Exceptions\RecipeScrapingException;
use GuzzleHttp\Exception\RequestException;
use Illuminate\Http\Client\ConnectionException;
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
            $response = Http::timeout((int) config('scraper.timeout'))
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

        if ($response->redirect()) {
            throw new RecipeScrapingException('Redirects are not followed for scraping.');
        }

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

        $extracted = $this->capExtraction($this->parse($body));

        if ($extracted['title'] === '' || $extracted['ingredients'] === []) {
            throw new RecipeScrapingException('Could not extract a recipe from this page.');
        }

        return $extracted;
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

            foreach ($this->flattenJsonLd($data) as $node) {
                if (! is_array($node) || ! $this->isRecipeNode($node)) {
                    continue;
                }

                $ingredients = array_values(array_filter(array_map(
                    fn ($v) => is_string($v) ? $this->clean($v) : '',
                    (array) ($node['recipeIngredient'] ?? [])
                ), fn ($v) => $v !== ''));

                return [
                    'title' => is_string($node['name'] ?? null) ? $this->clean($node['name']) : '',
                    'ingredients' => $ingredients,
                    'instructions' => $this->extractInstructions($node['recipeInstructions'] ?? []),
                ];
            }
        }

        return null;
    }

    /**
     * JSON-LD can be a single object, a list of objects, or wrapped in
     * "@graph" - normalize to a flat list of nodes to search.
     *
     * @param  array<mixed>  $data
     * @return list<mixed>
     */
    private function flattenJsonLd(array $data): array
    {
        if (isset($data['@graph']) && is_array($data['@graph'])) {
            return array_values($data['@graph']);
        }

        if (array_is_list($data)) {
            return $data;
        }

        return [$data];
    }

    /**
     * @param  array<mixed>  $node
     */
    private function isRecipeNode(array $node): bool
    {
        $type = $node['@type'] ?? null;

        if (is_string($type)) {
            return $type === 'Recipe';
        }

        if (is_array($type)) {
            return in_array('Recipe', $type, true);
        }

        return false;
    }

    /**
     * recipeInstructions is commonly a string, a list of strings, or a list
     * of HowToStep objects with a "text" field.
     *
     * @return list<string>
     */
    private function extractInstructions(mixed $raw): array
    {
        if (is_string($raw)) {
            return $raw === '' ? [] : [$raw];
        }

        if (! is_array($raw)) {
            return [];
        }

        $steps = [];
        foreach ($raw as $item) {
            if (is_string($item)) {
                $steps[] = $this->clean($item);

                continue;
            }

            if (is_array($item)) {
                $text = $item['text'] ?? $item['name'] ?? '';
                if (is_string($text) && $text !== '') {
                    $steps[] = $this->clean($text);
                }
            }
        }

        return array_values(array_filter($steps, fn ($s) => $s !== ''));
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
