<?php

namespace App\Services;

/**
 * Guesses which pages of a multi-recipe PDF (an e-book, a course handout)
 * belong to which recipe. It is only a suggestion: the user sees it in the
 * page picker, confirms or corrects it, and only then are drafts created.
 *
 * A recipe starts on a page with an "Ingredientes" header, optionally preceded
 * by a short title-only page. It then runs over the following pages while
 * they read as a continuation (a "Preparo"/"Cobertura"/tips header, or text
 * picking up a sentence the previous page left open). Anything else - cover,
 * index, closing remarks - is left unassigned.
 */
class RecipePdfSegmenter
{
    private const MAX_TITLE_PAGE_LENGTH = 80;

    private const MAX_TITLE_PAGE_LINES = 4;

    public function __construct(
        private readonly RecipeTextImportService $text,
    ) {}

    /**
     * @param  list<string>  $pages  Text per page, index 0 = page 1.
     * @return list<array{title: string, pages: list<int>}> 1-based page numbers.
     */
    public function segment(array $pages): array
    {
        $lines = array_map(fn (string $page) => $this->text->lines($page), $pages);

        $starts = array_keys(array_filter(
            $lines,
            fn (array $pageLines) => $this->hasHeader($pageLines, RecipeTextImportService::INGREDIENTS_HEADER),
        ));

        if ($starts === []) {
            return $this->singleRecipe($pages, $lines);
        }

        $recipes = [];
        foreach ($starts as $position => $start) {
            $previousStart = $starts[$position - 1] ?? -1;
            $nextStart = $starts[$position + 1] ?? count($pages);

            $titlePage = $start - 1 > $previousStart && $this->isTitlePage($lines[$start - 1] ?? [])
                ? $start - 1
                : null;

            $members = $titlePage !== null ? [$titlePage, $start] : [$start];

            // The next recipe's title page is not a continuation of this one.
            $limit = $nextStart - 1;
            if ($nextStart < count($pages) && $this->isTitlePage($lines[$nextStart - 1])) {
                $limit = $nextStart - 2;
            }

            for ($index = $start + 1; $index <= $limit; $index++) {
                if (! $this->continues($lines[$index - 1], $lines[$index])) {
                    break;
                }
                $members[] = $index;
            }

            $recipes[] = [
                'title' => $titlePage !== null
                    ? mb_substr(implode(' ', $lines[$titlePage]), 0, 255)
                    : $this->text->parse($pages[$start])['title'],
                'pages' => array_map(fn (int $index) => $index + 1, $members),
            ];
        }

        return $recipes;
    }

    /**
     * No "Ingredientes" header anywhere: treat the text pages as one recipe
     * and let the user trim it down.
     *
     * @param  list<string>  $pages
     * @param  list<list<string>>  $lines
     * @return list<array{title: string, pages: list<int>}>
     */
    private function singleRecipe(array $pages, array $lines): array
    {
        $withText = array_keys(array_filter($lines, fn (array $pageLines) => $pageLines !== []));

        if ($withText === []) {
            return [];
        }

        return [[
            'title' => $this->text->parse(implode("\n", $pages))['title'],
            'pages' => array_map(fn (int $index) => $index + 1, $withText),
        ]];
    }

    /**
     * @param  list<string>  $lines
     */
    private function isTitlePage(array $lines): bool
    {
        return $lines !== []
            && count($lines) <= self::MAX_TITLE_PAGE_LINES
            && mb_strlen(implode(' ', $lines)) <= self::MAX_TITLE_PAGE_LENGTH;
    }

    /**
     * @param  list<string>  $previous
     * @param  list<string>  $current
     */
    private function continues(array $previous, array $current): bool
    {
        if ($current === []) {
            return false;
        }

        foreach ([
            RecipeTextImportService::INSTRUCTIONS_HEADER,
            RecipeTextImportService::NOTES_HEADER,
            RecipeTextImportService::SUBSECTION_HEADER,
        ] as $pattern) {
            if ($this->text->isHeader($current[0], $pattern)) {
                return true;
            }
        }

        // The previous page stopped mid-sentence, or this one opens lowercase.
        $lastLine = $previous[array_key_last($previous) ?? 0] ?? '';

        return ($lastLine !== '' && preg_match('/[.!?]$/u', $lastLine) !== 1)
            || preg_match('/^\p{Ll}/u', $current[0]) === 1;
    }

    /**
     * @param  list<string>  $lines
     */
    private function hasHeader(array $lines, string $pattern): bool
    {
        foreach ($lines as $line) {
            if ($this->text->isHeader($line, $pattern)) {
                return true;
            }
        }

        return false;
    }
}
