<?php

namespace App\Services;

use App\Models\Recipe;
use PhpOffice\PhpSpreadsheet\Cell\DataType;
use PhpOffice\PhpSpreadsheet\Spreadsheet;
use PhpOffice\PhpSpreadsheet\Worksheet\Worksheet;
use PhpOffice\PhpSpreadsheet\Writer\Xlsx;

/**
 * Writes recipes as .xlsx workbooks - one recipe per worksheet - so a user can
 * export their recipes and (later) fill a template and import them back. Both
 * directions share this one schema, keeping import and export in lock-step.
 */
class RecipeSpreadsheetService
{
    public const LABEL_TITLE = 'Título';

    public const LABEL_SOURCE = 'Fonte';

    public const LABEL_TAGS = 'Tags';

    public const LABEL_NOTES = 'Observação';

    public const HEADING_INGREDIENTS = 'Ingredientes';

    public const HEADING_INSTRUCTIONS = 'Modo de Preparo';

    /**
     * Build an .xlsx workbook (one sheet per recipe) and return its raw bytes.
     *
     * @param  iterable<Recipe>  $recipes
     */
    public function write(iterable $recipes): string
    {
        $spreadsheet = new Spreadsheet;
        $spreadsheet->removeSheetByIndex(0);

        $usedTitles = [];
        $index = 0;

        foreach ($recipes as $recipe) {
            $this->fillSheet($spreadsheet->createSheet($index++), $recipe, $usedTitles);
        }

        if ($index === 0) {
            // A workbook must have at least one sheet.
            $spreadsheet->createSheet(0)->setTitle('Receitas');
        }

        $spreadsheet->setActiveSheetIndex(0);

        ob_start();
        (new Xlsx($spreadsheet))->save('php://output');
        $bytes = (string) ob_get_clean();

        $spreadsheet->disconnectWorksheets();

        return $bytes;
    }

    /**
     * @param  array<string, true>  $usedTitles
     */
    private function fillSheet(Worksheet $sheet, Recipe $recipe, array &$usedTitles): void
    {
        $sheet->setTitle($this->uniqueSheetTitle($recipe->title, $usedTitles));

        $row = 1;
        $field = function (string $label, string $value) use ($sheet, &$row): void {
            $sheet->setCellValue([1, $row], $label);
            $sheet->setCellValueExplicit([2, $row], $value, DataType::TYPE_STRING);
            $row++;
        };

        $field(self::LABEL_TITLE, $recipe->title);
        $field(self::LABEL_SOURCE, $recipe->source_url ?? '');
        $field(self::LABEL_TAGS, implode(', ', $this->stringList($recipe->tags)));
        $field(self::LABEL_NOTES, $recipe->notes ?? '');

        $row++;
        $this->list($sheet, $row, self::HEADING_INGREDIENTS, $this->stringList($recipe->ingredients));

        $row++;
        $this->list($sheet, $row, self::HEADING_INSTRUCTIONS, $this->stringList($recipe->instructions));

        $sheet->getColumnDimension('A')->setWidth(50);
        $sheet->getColumnDimension('B')->setWidth(50);
    }

    /**
     * The jsonb array columns are loosely typed (array|string) to static
     * analysis; coerce to a clean list of strings before writing.
     *
     * @return list<string>
     */
    private function stringList(mixed $value): array
    {
        if (! is_array($value)) {
            return [];
        }

        return array_values(array_map(fn ($item): string => (string) $item, $value));
    }

    /**
     * Write a heading followed by one item per row in column A.
     *
     * @param  list<string>  $items
     */
    private function list(Worksheet $sheet, int &$row, string $heading, array $items): void
    {
        $sheet->setCellValue([1, $row], $heading);
        $row++;
        foreach ($items as $item) {
            $sheet->setCellValueExplicit([1, $row], $item, DataType::TYPE_STRING);
            $row++;
        }
    }

    /**
     * Excel sheet names are capped at 31 chars, forbid []:*?/\, and must be
     * unique within a workbook.
     *
     * @param  array<string, true>  $usedTitles
     */
    private function uniqueSheetTitle(string $title, array &$usedTitles): string
    {
        $clean = preg_replace('/[\[\]\*\/\\\\\?:]/', ' ', $title) ?? $title;
        $clean = trim(mb_substr(trim($clean), 0, 31));
        if ($clean === '') {
            $clean = 'Receita';
        }

        $candidate = $clean;
        $suffix = 2;
        while (isset($usedTitles[mb_strtolower($candidate)])) {
            $tail = ' ('.$suffix.')';
            $candidate = mb_substr($clean, 0, 31 - mb_strlen($tail)).$tail;
            $suffix++;
        }

        $usedTitles[mb_strtolower($candidate)] = true;

        return $candidate;
    }
}
