<?php

namespace App\Services;

use Illuminate\Http\UploadedFile;
use Smalot\PdfParser\Parser as PdfParser;
use thiagoalessio\TesseractOCR\TesseractOCR;

/**
 * Turns an uploaded PDF or photo into a best-effort recipe draft: PDFs that
 * carry a text layer are read directly (deterministic), images are run through
 * Tesseract OCR. Either way the raw text is split heuristically into a draft
 * the user then reviews - extraction is never trusted to be perfect, which is
 * exactly why import lands on the review screen.
 */
class RecipeTextImportService
{
    public const INGREDIENTS_HEADER = '/^ingredientes?\b/iu';

    public const INSTRUCTIONS_HEADER = '/^(modo de preparo|preparo|prepara|instru|como fazer)/iu';

    public const NOTES_HEADER = '/^(anote essa dica|dicas?\b|observa[çc]([ãa]o|[õo]es)|obs\b)/iu';

    /**
     * Sub-recipes that usually follow the main one on the same page ("Cobertura",
     * "Recheio"...): their ingredients and steps are kept, under a label item.
     */
    public const SUBSECTION_HEADER = '/^(cobertura|recheio|calda|massa|glac[êe]|brigadeiro|creme|farofa|decora[çc][ãa]o|montagem)\b/iu';

    private const MAX_HEADER_LENGTH = 30;

    private const MAX_TITLE_LENGTH = 255;

    private const MAX_INGREDIENTS = 20;

    private const MAX_INGREDIENT_LENGTH = 255;

    private const MAX_INSTRUCTIONS = 50;

    private const MAX_INSTRUCTION_LENGTH = 1000;

    private const MAX_NOTES_LENGTH = 2000;

    /**
     * Extract raw text from the upload, dispatching by kind.
     */
    public function extractText(UploadedFile $file): string
    {
        $extension = strtolower($file->getClientOriginalExtension());

        if ($extension === 'pdf') {
            return trim(implode("\n", $this->extractPdfPages($file->getRealPath())));
        }

        // Portuguese model (the app is pt-BR); lang() is a magic __call option
        // on the OCR wrapper, invisible to static analysis.
        /** @phpstan-ignore method.notFound */
        return trim((new TesseractOCR($file->getRealPath()))->lang('por')->run());
    }

    /**
     * Read a PDF's text layer page by page (index 0 = page 1). A page without
     * a text layer (a scanned image) comes back as an empty string.
     *
     * @return list<string>
     */
    public function extractPdfPages(string $path): array
    {
        $document = (new PdfParser)->parseFile($path);

        return array_values(array_map(
            fn ($page) => trim($page->getText()),
            $document->getPages(),
        ));
    }

    /**
     * Split raw recipe text into a draft. Prefers explicit section headers
     * ("Ingredientes", "Modo de preparo"); falls back to classifying each line
     * when there are none.
     *
     * @param  string|null  $title  Known title (e.g. confirmed by the user in the
     *                              PDF page picker); otherwise it is guessed.
     * @return array{title: string, ingredients: list<string>, instructions: list<string>, tags: list<string>, source_url: string|null, notes: string|null}
     */
    public function parse(string $text, ?string $title = null): array
    {
        $lines = $this->lines($text);

        $draft = [
            'title' => '',
            'ingredients' => [],
            'instructions' => [],
            'tags' => [],
            'source_url' => null,
            'notes' => null,
        ];

        if ($lines === []) {
            return $draft;
        }

        $title = $title !== null && trim($title) !== '' ? trim($title) : $this->guessTitle($lines);
        $draft['title'] = mb_substr($title, 0, self::MAX_TITLE_LENGTH);

        $ingredientsAt = $this->headerIndex($lines, self::INGREDIENTS_HEADER);
        $instructionsAt = $this->headerIndex($lines, self::INSTRUCTIONS_HEADER);

        if ($ingredientsAt !== null && $instructionsAt !== null && $ingredientsAt < $instructionsAt) {
            [$ingredients, $instructions, $notes] = $this->sections(array_slice($lines, $ingredientsAt), $title);
        } else {
            [$ingredients, $instructions] = $this->classify(array_slice($lines, 1));
            $ingredients = array_map(fn (string $l) => $this->stripBullet($l), $ingredients);
            $instructions = array_map(fn (string $l) => $this->stripStepNumber($this->stripBullet($l)), $instructions);
            $notes = [];
        }

        $draft['ingredients'] = $this->capList($ingredients, self::MAX_INGREDIENTS, self::MAX_INGREDIENT_LENGTH);
        $draft['instructions'] = $this->capList($instructions, self::MAX_INSTRUCTIONS, self::MAX_INSTRUCTION_LENGTH);

        $notesText = trim(implode("\n", $notes));
        $draft['notes'] = $notesText === '' ? null : mb_substr($notesText, 0, self::MAX_NOTES_LENGTH);

        return $draft;
    }

    /**
     * True for a short label line matching the given header pattern - not a
     * sentence that merely starts with the same word. Labels are capitalized
     * and never end a sentence, which keeps a wrapped fragment such as
     * "massa lisa." from being read as the "Massa" sub-section.
     */
    public function isHeader(string $line, string $pattern): bool
    {
        return mb_strlen($line) <= self::MAX_HEADER_LENGTH
            && preg_match('/^\p{Lu}/u', $line) === 1
            && preg_match('/[.,;]$/u', $line) !== 1
            && preg_match($pattern, $line) === 1;
    }

    /**
     * Normalize text into trimmed, non-empty, whitespace-collapsed lines.
     *
     * @return list<string>
     */
    public function lines(string $text): array
    {
        $lines = preg_split('/\r\n|\r|\n/', $text) ?: [];
        $lines = array_map(fn (string $l) => trim(preg_replace('/\s+/u', ' ', $l) ?? $l), $lines);

        return array_values(array_filter($lines, fn (string $l) => $l !== ''));
    }

    /**
     * The first line, unless the text opens straight on a section header (a
     * PDF page that starts with "Ingredientes"): then the first line after the
     * headers that doesn't look like an ingredient.
     *
     * @param  list<string>  $lines
     */
    private function guessTitle(array $lines): string
    {
        if (! $this->isAnyHeader($lines[0])) {
            return $lines[0];
        }

        foreach ($lines as $line) {
            if (! $this->isAnyHeader($line) && ! $this->startsWithQuantity($line)) {
                return $line;
            }
        }

        return $lines[0];
    }

    /**
     * Walk header-delimited text, routing each line to ingredients, steps or
     * notes. PDF text wraps long lines, so a line continuing the previous one
     * is joined back instead of becoming an item of its own.
     *
     * @param  list<string>  $lines  Starting at the first ingredients header.
     * @return array{0: list<string>, 1: list<string>, 2: list<string>}
     */
    private function sections(array $lines, string $title): array
    {
        $ingredients = [];
        $instructions = [];
        $notes = [];
        $mode = 'ingredients';
        $afterHeader = false;
        $pendingStepLabel = null;

        foreach ($lines as $line) {
            if ($this->isHeader($line, self::INGREDIENTS_HEADER)) {
                $mode = 'ingredients';
                $afterHeader = true;

                continue;
            }

            if ($this->isHeader($line, self::INSTRUCTIONS_HEADER)) {
                $mode = 'instructions';
                $afterHeader = true;
                if ($pendingStepLabel !== null) {
                    $instructions[] = $pendingStepLabel;
                    $pendingStepLabel = null;
                }

                continue;
            }

            if ($this->isHeader($line, self::NOTES_HEADER)) {
                $mode = 'notes';
                $afterHeader = true;

                continue;
            }

            if ($mode !== 'notes' && $this->isHeader($line, self::SUBSECTION_HEADER)) {
                $label = rtrim($line, ': ').':';
                $mode = 'ingredients';
                $afterHeader = true;
                $ingredients[] = $label;
                $pendingStepLabel = $label;

                continue;
            }

            // Recipe PDFs often repeat the recipe name right under each header.
            if ($afterHeader && $this->echoesTitle($line, $title)) {
                $afterHeader = false;

                continue;
            }
            $afterHeader = false;

            match ($mode) {
                'ingredients' => $this->appendIngredient($ingredients, $this->stripBullet($line)),
                'instructions' => $this->appendSentence($instructions, $this->stripStepNumber($this->stripBullet($line)), $line),
                default => $this->appendSentence($notes, $line, $line),
            };
        }

        return [$ingredients, $instructions, $notes];
    }

    /**
     * @param  list<string>  $ingredients
     */
    private function appendIngredient(array &$ingredients, string $line): void
    {
        $last = array_key_last($ingredients);

        $continues = $last !== null
            && ! $this->startsWithQuantity($line)
            && (preg_match('/(\s(e|de|da|do|com|ou|para|a)|,)$/iu', $ingredients[$last]) === 1
                || str_starts_with($line, '('));

        if ($continues) {
            $ingredients[$last] .= ' '.$line;
        } else {
            $ingredients[] = $line;
        }
    }

    /**
     * @param  list<string>  $items
     */
    private function appendSentence(array &$items, string $text, string $rawLine): void
    {
        $last = array_key_last($items);

        $startsNewItem = $last === null
            || preg_match('/[.!?:]$/u', $items[$last]) === 1
            || $text !== $rawLine
            || preg_match('/^[\p{Ll}(\d]/u', $text) !== 1
            // Consecutive quantity-led lines are a list, not a wrapped sentence.
            || ($this->startsWithQuantity($text) && $this->startsWithQuantity($items[$last]));

        if ($startsNewItem) {
            $items[] = $text;
        } else {
            $items[$last] .= ' '.$text;
        }
    }

    private function echoesTitle(string $line, string $title): bool
    {
        $line = mb_strtolower($line);
        $title = mb_strtolower($title);

        return ! $this->startsWithQuantity($line)
            && mb_strlen($line) >= 4
            && $title !== ''
            && (str_contains($title, $line) || str_contains($line, $title));
    }

    private function isAnyHeader(string $line): bool
    {
        foreach ([self::INGREDIENTS_HEADER, self::INSTRUCTIONS_HEADER, self::NOTES_HEADER] as $pattern) {
            if ($this->isHeader($line, $pattern)) {
                return true;
            }
        }

        return false;
    }

    /**
     * @param  list<string>  $lines
     */
    private function headerIndex(array $lines, string $pattern): ?int
    {
        foreach ($lines as $index => $line) {
            if ($this->isHeader($line, $pattern)) {
                return $index;
            }
        }

        return null;
    }

    /**
     * With no headers, treat quantity-led or short lines as ingredients and
     * longer sentence lines as steps.
     *
     * @param  list<string>  $lines
     * @return array{0: list<string>, 1: list<string>}
     */
    private function classify(array $lines): array
    {
        $ingredients = [];
        $instructions = [];

        foreach ($lines as $line) {
            if ($this->looksLikeIngredient($line)) {
                $ingredients[] = $line;
            } else {
                $instructions[] = $line;
            }
        }

        return [$ingredients, $instructions];
    }

    private function looksLikeIngredient(string $line): bool
    {
        if ($this->startsWithQuantity($line)) {
            return true;
        }

        // ...or is a short fragment without sentence-ending punctuation.
        return mb_strlen($line) <= 40 && preg_match('/[.!?]$/u', $line) !== 1;
    }

    /**
     * Starts with a quantity (digit or common fraction glyph).
     */
    private function startsWithQuantity(string $line): bool
    {
        return preg_match('/^\s*(\d|[¼½¾⅓⅔⅛])/u', $line) === 1;
    }

    private function stripBullet(string $line): string
    {
        return trim(preg_replace('/^[•\-\*\x{2013}\x{2014}]\s+/u', '', $line) ?? $line);
    }

    private function stripStepNumber(string $line): string
    {
        return trim(preg_replace('/^\d+\s*[.)\-\x{2013}]\s+/u', '', $line) ?? $line);
    }

    /**
     * @param  list<string>  $items
     * @return list<string>
     */
    private function capList(array $items, int $maxCount, int $maxLength): array
    {
        $items = array_values(array_filter($items, fn (string $l) => $l !== ''));

        return array_map(
            fn (string $item) => mb_substr($item, 0, $maxLength),
            array_slice($items, 0, $maxCount),
        );
    }
}
