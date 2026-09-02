<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ArrowLeft } from 'lucide-vue-next'

import RecipeForm from '@/components/RecipeForm.vue'
import { getRecipe } from '@/api/recipes'
import type { FromUrlInput, Recipe, RecipeDraft, RecipeFormInput } from '@/types'
import { useRecipesStore } from '@/stores/recipes'
import { useToast } from '@/composables/useToast'
import Button from '@/components/ui/Button.vue'

const route = useRoute()
const router = useRouter()
const store = useRecipesStore()
const toast = useToast()

const recipe = ref<Recipe | null>(null)
// Draft extracted from a URL, awaiting the user's review. When set, the form
// renders prefilled with it - importing produces a draft to confirm, never a
// saved recipe.
const reviewDraft = ref<RecipeDraft | null>(null)
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

async function handleSubmit(input: RecipeFormInput) {
  loading.value = true
  error.value = null
  try {
    const saved = recipeId ? await store.update(recipeId, input) : await store.create(input)
    toast.success(recipeId ? 'Receita atualizada com sucesso.' : 'Receita criada com sucesso.')
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
    reviewDraft.value = await store.previewFromUrl(input)
    toast.success('Receita extraída. Revise e ajuste antes de criar.')
  } catch {
    error.value = 'Não foi possível importar a receita desta URL.'
    toast.error(error.value)
  } finally {
    loading.value = false
  }
}

async function handleSubmitFile(file: File) {
  loading.value = true
  error.value = null
  try {
    // Like URL import: a spreadsheet becomes a draft to review, not a save.
    reviewDraft.value = await store.importSpreadsheet(file)
    toast.success('Planilha lida. Revise e ajuste antes de criar.')
  } catch {
    error.value = 'Não foi possível ler uma receita desta planilha.'
    toast.error(error.value)
  } finally {
    loading.value = false
  }
}

function discardDraft() {
  reviewDraft.value = null
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
  <div class="max-w-2xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
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
        {{ recipeId ? 'Editar Receita' : reviewDraft ? 'Revisar Importação' : 'Nova Receita' }}
      </h1>
      <p class="text-muted-foreground mt-1">
        {{
          recipeId
            ? 'Atualize os detalhes da sua receita.'
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
        Estes dados vieram da importação e ainda <strong>não foram salvos</strong>. Revise antes de
        criar.
      </p>
      <Button variant="ghost" size="sm" class="shrink-0 -mr-2 -my-1" @click="discardDraft">
        Descartar
      </Button>
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

    <RecipeForm
      v-else-if="!loadError"
      :recipe="recipe ?? reviewDraft"
      :loading="loading"
      :submit-label="reviewDraft ? 'Criar receita' : null"
      @submit="handleSubmit"
      @submit-from-url="handleSubmitFromUrl"
      @submit-file="handleSubmitFile"
    />
  </div>
</template>
