<script setup lang="ts">
import { computed, onBeforeUnmount, ref } from 'vue'
import {
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  FileText,
  Loader2,
  Plus,
  Trash2,
} from 'lucide-vue-next'

import type { PdfImportAnalysis, PdfRecipeGroup } from '@/types'
import Card from './ui/Card.vue'
import CardContent from './ui/CardContent.vue'
import Input from './ui/Input.vue'
import Button from './ui/Button.vue'
import PdfPageCanvas from './PdfPageCanvas.vue'
import { usePdfDocument } from '@/composables/usePdfDocument'

/**
 * Page picker for a (possibly multi-recipe) PDF. Shows the document next to
 * the system's guess of which pages form which recipe, asks the user whether
 * that's right, and lets them rename, add or drop recipes and move pages
 * between them before any draft is created.
 */
const props = withDefaults(
  defineProps<{
    analysis: PdfImportAnalysis
    /** The uploaded file, previewed locally - it is never re-downloaded. */
    file?: File | null
    loading?: boolean
  }>(),
  { file: null, loading: false },
)

const emit = defineEmits<{
  confirm: [groups: PdfRecipeGroup[]]
  cancel: []
}>()

interface EditableRecipe {
  key: number
  title: string
}

let nextKey = 0
const recipes = ref<EditableRecipe[]>([])
// Page number -> recipe key; a page belongs to at most one recipe.
const assignment = ref<Record<number, number | null>>({})

for (const group of props.analysis.recipes) {
  const key = nextKey++
  recipes.value.push({ key, title: group.title ?? '' })
  for (const page of group.pages) {
    assignment.value[page] = key
  }
}

const currentPage = ref(props.analysis.recipes[0]?.pages[0] ?? 1)

// Pages are drawn locally with pdf.js (no re-download). jsdom (tests) has no
// createObjectURL; the blob URL only backs the "open in a new tab" link.
const { document: pdfDocument, failed: previewFailed } = usePdfDocument(props.file)
const previewUrl =
  props.file && typeof URL.createObjectURL === 'function' ? URL.createObjectURL(props.file) : null

onBeforeUnmount(() => {
  if (previewUrl) URL.revokeObjectURL(previewUrl)
})

function goToPage(delta: number) {
  const target = currentPage.value + delta
  if (target >= 1 && target <= props.analysis.page_count) currentPage.value = target
}

function pagesOf(key: number): number[] {
  return props.analysis.pages
    .map((page) => page.number)
    .filter((number) => assignment.value[number] === key)
}

function describePages(pages: number[]): string {
  if (pages.length === 0) return 'Nenhuma página'
  const ranges: string[] = []
  let start = pages[0]!
  let end = start
  for (const page of [...pages.slice(1), Number.NaN]) {
    if (page === end + 1) {
      end = page
      continue
    }
    ranges.push(start === end ? `${start}` : `${start}–${end}`)
    start = page
    end = page
  }
  return `${pages.length === 1 ? 'Página' : 'Páginas'} ${ranges.join(', ')}`
}

const groups = computed<PdfRecipeGroup[]>(() =>
  recipes.value
    .map((recipe) => ({ title: recipe.title.trim() || null, pages: pagesOf(recipe.key) }))
    .filter((group) => group.pages.length > 0),
)

const question = computed(() => {
  const count = props.analysis.recipes.length
  if (count === 0) {
    return 'Não identificamos receitas automaticamente. Indique abaixo em quais páginas elas estão.'
  }
  return count === 1
    ? 'Encontramos 1 receita neste PDF. Está certo?'
    : `Encontramos ${count} receitas neste PDF. Está certo?`
})

function addRecipe() {
  recipes.value.push({ key: nextKey++, title: '' })
}

function removeRecipe(key: number) {
  recipes.value = recipes.value.filter((recipe) => recipe.key !== key)
  for (const [page, owner] of Object.entries(assignment.value)) {
    if (owner === key) assignment.value[Number(page)] = null
  }
}

function assign(page: number, value: string) {
  assignment.value[page] = value === '' ? null : Number(value)
}

function recipeLabel(recipe: EditableRecipe, index: number): string {
  return recipe.title.trim() || `Receita ${index + 1}`
}

function assignedLabel(page: number): string {
  const index = recipes.value.findIndex((recipe) => recipe.key === assignment.value[page])
  return index === -1 ? 'Não é receita' : recipeLabel(recipes.value[index]!, index)
}

function confirm() {
  if (groups.value.length > 0) emit('confirm', groups.value)
}
</script>

<template>
  <div class="space-y-6">
    <div class="rounded-md border border-primary/20 bg-primary/10 p-4 text-sm">
      <p class="font-medium text-foreground">{{ question }}</p>
      <p class="mt-1 text-foreground/70">
        Confira as páginas de cada receita. Você pode renomear, mover páginas entre receitas,
        adicionar ou remover receitas. Nada é salvo antes da revisão de cada uma.
      </p>
    </div>

    <div class="grid gap-6 lg:grid-cols-2">
      <!-- Preview -->
      <Card class="border-border/50 shadow-sm overflow-hidden lg:sticky lg:top-4 lg:self-start">
        <div class="flex items-center justify-between border-b border-border/50 px-4 py-2 text-sm">
          <span class="font-medium">Página {{ currentPage }} de {{ analysis.page_count }}</span>
          <a
            v-if="previewUrl"
            :href="`${previewUrl}#page=${currentPage}`"
            target="_blank"
            rel="noopener"
            class="inline-flex items-center gap-1 text-primary hover:underline"
          >
            Abrir em nova aba
            <ExternalLink class="h-3.5 w-3.5" />
          </a>
        </div>
        <div v-if="pdfDocument" class="max-h-[50vh] overflow-y-auto bg-muted/30 lg:max-h-[70vh]">
          <PdfPageCanvas :document="pdfDocument" :page-number="currentPage" />
        </div>
        <p v-else-if="previewFailed || !file" class="p-4 text-sm text-muted-foreground">
          Pré-visualização indisponível. Use o texto de cada página para conferir.
        </p>
        <div v-else class="flex h-[40vh] items-center justify-center text-muted-foreground">
          <Loader2 class="mr-2 h-4 w-4 animate-spin" />
          Carregando pré-visualização...
        </div>
        <div class="flex items-center justify-between border-t border-border/50 px-2 py-1 text-sm">
          <Button
            variant="ghost"
            size="sm"
            type="button"
            aria-label="Página anterior"
            :disabled="currentPage <= 1"
            @click="goToPage(-1)"
          >
            <ChevronLeft class="h-4 w-4" />
          </Button>
          <span class="text-muted-foreground">{{ assignedLabel(currentPage) }}</span>
          <Button
            variant="ghost"
            size="sm"
            type="button"
            aria-label="Próxima página"
            :disabled="currentPage >= analysis.page_count"
            @click="goToPage(1)"
          >
            <ChevronRight class="h-4 w-4" />
          </Button>
        </div>
      </Card>

      <div class="space-y-6">
        <!-- Recipes -->
        <Card class="border-border/50 shadow-sm">
          <CardContent class="pt-6 space-y-3">
            <h2 class="text-sm font-semibold text-foreground">Receitas</h2>
            <div
              v-for="(recipe, index) in recipes"
              :key="recipe.key"
              class="flex items-start gap-2"
            >
              <div class="flex-1 space-y-1">
                <Input
                  v-model="recipe.title"
                  :aria-label="`Título da receita ${index + 1}`"
                  placeholder="Título da receita"
                />
                <p
                  class="text-xs"
                  :class="pagesOf(recipe.key).length ? 'text-muted-foreground' : 'text-destructive'"
                >
                  {{ describePages(pagesOf(recipe.key)) }}
                </p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                type="button"
                :aria-label="`Remover ${recipeLabel(recipe, index)}`"
                @click="removeRecipe(recipe.key)"
              >
                <Trash2 class="h-4 w-4" />
              </Button>
            </div>
            <Button variant="outline" size="sm" type="button" @click="addRecipe">
              <Plus class="mr-2 h-4 w-4" />
              Adicionar receita
            </Button>
          </CardContent>
        </Card>

        <!-- Pages -->
        <Card class="border-border/50 shadow-sm">
          <CardContent class="pt-6">
            <h2 class="mb-3 text-sm font-semibold text-foreground">Páginas</h2>
            <ul class="divide-y divide-border/50 max-h-[50vh] overflow-y-auto pr-1">
              <li
                v-for="page in analysis.pages"
                :key="page.number"
                class="flex flex-col gap-2 py-3 sm:flex-row sm:items-start"
                :class="page.number === currentPage ? 'bg-primary/5 -mx-2 px-2 rounded-md' : ''"
              >
                <button
                  type="button"
                  class="flex flex-1 items-start gap-2 text-left text-sm"
                  :aria-label="`Ver página ${page.number}`"
                  @click="currentPage = page.number"
                >
                  <span
                    class="w-12 shrink-0 overflow-hidden rounded border border-border/60 bg-muted/30"
                  >
                    <PdfPageCanvas
                      v-if="pdfDocument"
                      :document="pdfDocument"
                      :page-number="page.number"
                      :render-width="96"
                      lazy
                    />
                    <FileText v-else class="m-3 h-6 w-6 text-muted-foreground" />
                  </span>
                  <span>
                    <span class="font-medium">Página {{ page.number }}</span>
                    <span class="block text-xs text-muted-foreground line-clamp-2">
                      {{ page.has_text ? page.excerpt : 'Sem texto (imagem)' }}
                    </span>
                  </span>
                </button>
                <select
                  :value="assignment[page.number] ?? ''"
                  :aria-label="`Receita da página ${page.number}`"
                  class="h-9 rounded-md border border-input bg-background px-2 text-sm sm:w-48"
                  @change="assign(page.number, ($event.target as HTMLSelectElement).value)"
                >
                  <option value="">Não é receita</option>
                  <option v-for="(recipe, index) in recipes" :key="recipe.key" :value="recipe.key">
                    {{ recipeLabel(recipe, index) }}
                  </option>
                </select>
              </li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>

    <div class="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
      <Button variant="ghost" type="button" :disabled="loading" @click="emit('cancel')">
        Cancelar
      </Button>
      <Button type="button" :disabled="loading || groups.length === 0" @click="confirm">
        <Loader2 v-if="loading" class="mr-2 h-4 w-4 animate-spin" />
        {{
          groups.length === 1
            ? 'Sim, importar 1 receita'
            : `Sim, importar ${groups.length} receitas`
        }}
      </Button>
    </div>
  </div>
</template>
