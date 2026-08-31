<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ArrowLeft } from 'lucide-vue-next'

import RecipeForm from '@/components/RecipeForm.vue'
import { getRecipe } from '@/api/recipes'
import type { FromUrlInput, Recipe, RecipeFormInput } from '@/types'
import { useRecipesStore } from '@/stores/recipes'
import { useToast } from '@/composables/useToast'
import Button from '@/components/ui/Button.vue'

const route = useRoute()
const router = useRouter()
const store = useRecipesStore()
const toast = useToast()

const recipe = ref<Recipe | null>(null)
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
    const saved = await store.createFromUrl(input)
    toast.success('Receita importada com sucesso.')
    router.push({ name: 'recipe-detail', params: { id: saved.id } })
  } catch {
    error.value = 'Não foi possível importar a receita desta URL.'
    toast.error(error.value)
  } finally {
    loading.value = false
  }
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
        {{ recipeId ? 'Editar Receita' : 'Nova Receita' }}
      </h1>
      <p class="text-muted-foreground mt-1">
        {{
          recipeId
            ? 'Atualize os detalhes da sua receita.'
            : 'Crie uma nova receita manualmente ou importe de uma URL.'
        }}
      </p>
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
      :recipe="recipe"
      :loading="loading"
      @submit="handleSubmit"
      @submit-from-url="handleSubmitFromUrl"
    />
  </div>
</template>
