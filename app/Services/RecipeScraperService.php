<?php

namespace App\Services;

use App\Exceptions\RecipeScrapingException;
use Illuminate\Http\Client\ConnectionException;
use Illuminate\Support\Facades\Http;

class RecipeScraperService
{
    private const TIMEOUT_SECONDS = 10;

    private const MAX_RESPONSE_BYTES = 5 * 1024 * 1024;

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
        $this->ssrfGuard->assertSafe($url);

        try {
            $response = Http::timeout(self::TIMEOUT_SECONDS)
                ->withOptions(['allow_redirects' => false])
                ->get($url);
        } catch (ConnectionException) {
            throw new RecipeScrapingException('URL extraction timeout.');
        }

        if ($response->redirect()) {
            throw new RecipeScrapingException('Redirects are not followed for scraping.');
        }

        if (! $response->successful()) {
            throw new RecipeScrapingException('Could not fetch the page.');
        }

        $contentLength = $response->header('Content-Length');
        if ($contentLength !== '' && (int) $contentLength > self::MAX_RESPONSE_BYTES) {
            throw new RecipeScrapingException('Response too large.');
        }

        $body = $response->body();
        if (strlen($body) > self::MAX_RESPONSE_BYTES) {
            throw new RecipeScrapingException('Response too large.');
        }

        $extracted = $this->parse($body);

        if ($extracted['title'] === '' || $extracted['ingredients'] === []) {
            throw new RecipeScrapingException('Could not extract a recipe from this page.');
        }

        return $extracted;
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
                    fn ($v) => is_string($v) ? trim($v) : '',
                    (array) ($node['recipeIngredient'] ?? [])
                ), fn ($v) => $v !== ''));

                return [
                    'title' => is_string($node['name'] ?? null) ? trim($node['name']) : '',
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
                $steps[] = trim($item);

                continue;
            }

            if (is_array($item)) {
                $text = $item['text'] ?? $item['name'] ?? '';
                if (is_string($text) && $text !== '') {
                    $steps[] = trim($text);
                }
            }
        }

        return array_values(array_filter($steps, fn ($s) => $s !== ''));
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
            $title = trim($h1->item(0)->textContent ?? '');
        }

        $ingredients = [];
        $nodes = $xpath->query(
            '//*[contains(concat(" ", normalize-space(@class), " "), " ingredient")]//li'
            .' | //*[contains(concat(" ", normalize-space(@class), " "), " ingredients")]//li'
        );
        if ($nodes !== false) {
            foreach ($nodes as $node) {
                $text = trim($node->textContent ?? '');
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
