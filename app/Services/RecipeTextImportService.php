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
    private const MAX_INGREDIENTS = 20;

    private const MAX_INGREDIENT_LENGTH = 255;

    private const MAX_INSTRUCTIONS = 50;

    private const MAX_INSTRUCTION_LENGTH = 1000;

    /**
     * Extract raw text from the upload, dispatching by kind.
     */
    public function extractText(UploadedFile $file): string
    {
        $extension = strtolower($file->getClientOriginalExtension());

        if ($extension === 'pdf') {
            $document = (new PdfParser)->parseFile($file->getRealPath());

            return trim($document->getText());
        }

        // Portuguese model (the app is pt-BR); lang() is a magic __call option
        // on the OCR wrapper, invisible to static analysis.
        /** @phpstan-ignore method.notFound */
        return trim((new TesseractOCR($file->getRealPath()))->lang('por')->run());
    }

    /**
     * Split raw recipe text into a draft. Prefers explicit section headers
     * ("Ingredientes", "Modo de preparo"); falls back to classifying each line
     * when there are none.
     *
     * @return array{title: string, ingredients: list<string>, instructions: list<string>, tags: list<string>, source_url: string|null, notes: string|null}
     */
    public function parse(string $text): array
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

        $draft['title'] = mb_substr($lines[0], 0, 255);

        $ingredientsAt = $this->headerIndex($lines, '/^ingredient/iu');
        $instructionsAt = $this->headerIndex($lines, '/^(modo de preparo|preparo|prepara|instru|como fazer)/iu');

        if ($ingredientsAt !== null && $instructionsAt !== null && $ingredientsAt < $instructionsAt) {
            $ingredients = array_slice($lines, $ingredientsAt + 1, $instructionsAt - $ingredientsAt - 1);
            $instructions = array_slice($lines, $instructionsAt + 1);
        } else {
            [$ingredients, $instructions] = $this->classify(array_slice($lines, 1));
        }

        $draft['ingredients'] = $this->capList(
            array_map(fn (string $l) => $this->stripBullet($l), $ingredients),
            self::MAX_INGREDIENTS,
            self::MAX_INGREDIENT_LENGTH,
        );
        $draft['instructions'] = $this->capList(
            array_map(fn (string $l) => $this->stripStepNumber($this->stripBullet($l)), $instructions),
            self::MAX_INSTRUCTIONS,
            self::MAX_INSTRUCTION_LENGTH,
        );

        return $draft;
    }

    /**
     * @return list<string>
     */
    private function lines(string $text): array
    {
        $lines = preg_split('/\r\n|\r|\n/', $text) ?: [];
        $lines = array_map(fn (string $l) => trim(preg_replace('/\s+/u', ' ', $l) ?? $l), $lines);

        return array_values(array_filter($lines, fn (string $l) => $l !== ''));
    }

    /**
     * @param  list<string>  $lines
     */
    private function headerIndex(array $lines, string $pattern): ?int
    {
        foreach ($lines as $index => $line) {
            // A header is a short label line, not a sentence that merely starts
            // with the word.
            if (mb_strlen($line) <= 30 && preg_match($pattern, $line) === 1) {
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
        // Starts with a quantity (digit or common fraction glyph)...
        if (preg_match('/^\s*(\d|[¼½¾⅓⅔⅛])/u', $line) === 1) {
            return true;
        }

        // ...or is a short fragment without sentence-ending punctuation.
        return mb_strlen($line) <= 40 && preg_match('/[.!?]$/u', $line) !== 1;
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
