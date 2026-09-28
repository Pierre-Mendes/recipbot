<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ArrowLeft } from 'lucide-vue-next'

import RecipeForm from '@/components/RecipeForm.vue'
import PdfImportReview from '@/components/PdfImportReview.vue'
import { getRecipe } from '@/api/recipes'
import type {
  FromUrlInput,
  PdfImportAnalysis,
  PdfRecipeGroup,
  Recipe,
  RecipeDraft,
  RecipeFormInput,
} from '@/types'
import { importErrorMessage } from '@/utils/importError'
import { useRecipesStore } from '@/stores/recipes'
import { useToast } from '@/composables/useToast'
import Button from '@/components/ui/Button.vue'

const route = useRoute()
const router = useRouter()
const store = useRecipesStore()
const toast = useToast()

const recipe = ref<Recipe | null>(null)
// Drafts extracted by an import, awaiting the user's review one at a time.
// The form renders prefilled with the first - importing produces drafts to
// confirm, never saved recipes. A multi-recipe PDF queues several.
const draftQueue = ref<RecipeDraft[]>([])
const draftTotal = ref(0)
const reviewDraft = computed(() => draftQueue.value[0] ?? null)
const draftPosition = computed(() => draftTotal.value - draftQueue.value.length + 1)
// An analyzed PDF waiting for the user to confirm which pages are recipes.
const pdfImport = ref<{ file: File; analysis: PdfImportAnalysis } | null>(null)
const loading = ref(false)
const error = ref<string | null>(null)
// Kept separate from `error` (used for submit failures): a failed initial load
// must hide the form and skeleton, while a submit failure must keep the form
// visible so the user can retry without losing their edits.
const loadError = ref<string | null>(null)

const recipeId = route.params.id as string | undefined

onMounted(async () => {
  if (!recipeId) return
  try {
    recipe.value = await getRecipe(recipeId)
  } catch {
    // Without this, a failed load (404/network) would reject unhandled and
    // leave the page stuck on the "Carregando" skeleton forever.
    loadError.value = 'Não foi possível carregar a receita. Tente novamente.'
    toast.error(loadError.value)
  }
})

function startReview(drafts: RecipeDraft[]) {
  draftQueue.value = drafts
  draftTotal.value = drafts.length
}

async function handleSubmit(input: RecipeFormInput) {
  loading.value = true
  error.value = null
  try {
    const saved = recipeId ? await store.update(recipeId, input) : await store.create(input)
    toast.success(recipeId ? 'Receita atualizada com sucesso.' : 'Receita criada com sucesso.')
    if (draftQueue.value.length > 1) {
      // More recipes from the same import still await review.
      draftQueue.value = draftQueue.value.slice(1)
      window.scrollTo?.({ top: 0 })
      return
    }
    if (draftTotal.value > 1) {
      draftQueue.value = []
      router.push({ name: 'recipes' })
      return
    }
    router.push({ name: 'recipe-detail', params: { id: saved.id } })
  } catch {
    error.value = 'Não foi possível salvar a receita. Verifique o formulário e tente novamente.'
    toast.error(error.value)
  } finally {
    loading.value = false
  }
}

async function handleSubmitFromUrl(input: FromUrlInput) {
  loading.value = true
  error.value = null
  try {
    // Import no longer saves: it extracts a draft the user reviews and edits
    // before the recipe is actually created (through handleSubmit).
    startReview([await store.previewFromUrl(input)])
    toast.success('Receita extraída. Revise e ajuste antes de criar.')
  } catch (e) {
    error.value = importErrorMessage(e, 'Não foi possível importar a receita desta URL.')
    toast.error(error.value)
  } finally {
    loading.value = false
  }
}

async function handleSubmitFile(file: File) {
  loading.value = true
  error.value = null
  try {
    if (file.name.toLowerCase().endsWith('.pdf')) {
      // A PDF may hold a whole e-book: first let the user confirm which
      // pages are which recipe.
      pdfImport.value = { file, analysis: await store.analyzePdf(file) }
      return
    }
    // Like URL import: a file becomes a draft to review, not a save.
    startReview([await store.importFile(file)])
    toast.success('Arquivo lido. Revise e ajuste antes de criar.')
  } catch (e) {
    error.value = importErrorMessage(e, 'Não foi possível ler uma receita deste arquivo.')
    toast.error(error.value)
  } finally {
    loading.value = false
  }
}

async function handleConfirmPdf(groups: PdfRecipeGroup[]) {
  if (!pdfImport.value) return
  loading.value = true
  error.value = null
  try {
    const drafts = await store.confirmPdf(pdfImport.value.analysis.id, groups)
    pdfImport.value = null
    startReview(drafts)
    toast.success(
      drafts.length === 1
        ? 'Receita extraída. Revise e ajuste antes de criar.'
        : `${drafts.length} receitas extraídas. Revise uma a uma antes de criar.`,
    )
  } catch (e) {
    error.value = importErrorMessage(e, 'Não foi possível extrair as receitas deste PDF.')
    toast.error(error.value)
  } finally {
    loading.value = false
  }
}

function cancelPdf() {
  pdfImport.value = null
  error.value = null
}

function skipDraft() {
  if (draftQueue.value.length > 1) {
    draftQueue.value = draftQueue.value.slice(1)
    error.value = null
    return
  }
  discardDraft()
}

function discardDraft() {
  if (draftTotal.value > 1) {
    router.push({ name: 'recipes' })
  }
  draftQueue.value = []
  draftTotal.value = 0
  error.value = null
}

function goBack() {
  if (recipeId) {
    router.push({ name: 'recipe-detail', params: { id: recipeId } })
  } else {
    router.push({ name: 'recipes' })
  }
}
</script>

<template>
  <div
    class="mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500"
    :class="pdfImport ? 'max-w-6xl' : 'max-w-2xl'"
  >
    <Button
      variant="ghost"
      size="sm"
      class="mb-4 -ml-3 text-muted-foreground hover:text-foreground"
      @click="goBack"
    >
      <ArrowLeft class="mr-2 h-4 w-4" />
      Voltar
    </Button>

    <div class="mb-8">
      <h1 class="text-3xl font-bold tracking-tight text-foreground">
        {{
          recipeId
            ? 'Editar Receita'
            : pdfImport
              ? 'Importar PDF'
              : reviewDraft
                ? 'Revisar Importação'
                : 'Nova Receita'
        }}
      </h1>
      <p class="text-muted-foreground mt-1">
        {{
          recipeId
            ? 'Atualize os detalhes da sua receita.'
            : pdfImport
              ? pdfImport.file.name
              : reviewDraft
                ? 'Confira o que foi extraído, ajuste o que precisar e crie a receita.'
                : 'Crie uma nova receita manualmente ou importe de uma URL.'
        }}
      </p>
    </div>

    <div
      v-if="reviewDraft"
      class="mb-6 flex items-start justify-between gap-4 rounded-md border border-primary/20 bg-primary/10 p-4 text-sm"
    >
      <p class="text-foreground/80">
        <strong v-if="draftTotal > 1" class="block mb-1 text-foreground">
          Receita {{ draftPosition }} de {{ draftTotal }}
        </strong>
        Estes dados vieram da importação e ainda <strong>não foram salvos</strong>. Revise antes de
        criar.
      </p>
      <div class="flex shrink-0 gap-1 -mr-2 -my-1">
        <Button v-if="draftQueue.length > 1" variant="ghost" size="sm" @click="skipDraft">
          Pular
        </Button>
        <Button variant="ghost" size="sm" @click="discardDraft">
          {{ draftTotal > 1 ? 'Descartar todas' : 'Descartar' }}
        </Button>
      </div>
    </div>

    <div
      v-if="error || loadError"
      class="mb-6 rounded-md bg-destructive/15 p-4 text-sm text-destructive border border-destructive/20 font-medium"
    >
      {{ error || loadError }}
    </div>

    <div
      v-if="recipeId && !recipe && !loadError"
      class="py-12 flex justify-center text-muted-foreground animate-pulse"
    >
      Carregando detalhes da receita...
    </div>

    <PdfImportReview
      v-else-if="pdfImport"
      :analysis="pdfImport.analysis"
      :file="pdfImport.file"
      :loading="loading"
      @confirm="handleConfirmPdf"
      @cancel="cancelPdf"
    />

    <RecipeForm
      v-else-if="!loadError"
      :recipe="recipe ?? reviewDraft"
      :loading="loading"
      :submit-label="
        reviewDraft ? (draftQueue.length > 1 ? 'Criar e revisar a próxima' : 'Criar receita') : null
      "
      @submit="handleSubmit"
      @submit-from-url="handleSubmitFromUrl"
      @submit-file="handleSubmitFile"
    />
  </div>
</template>
