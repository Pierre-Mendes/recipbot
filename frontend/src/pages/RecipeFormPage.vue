<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ArrowLeft } from 'lucide-vue-next'

import RecipeForm from '@/components/RecipeForm.vue'
import { getRecipe } from '@/api/recipes'
import type { FromUrlInput, Recipe, RecipeFormInput } from '@/types'
import { useRecipesStore } from '@/stores/recipes'
import Button from '@/components/ui/Button.vue'

const route = useRoute()
const router = useRouter()
const store = useRecipesStore()

const recipe = ref<Recipe | null>(null)
const loading = ref(false)
const error = ref<string | null>(null)

const recipeId = route.params.id as string | undefined

onMounted(async () => {
  if (recipeId) {
    recipe.value = await getRecipe(recipeId)
  }
})

async function handleSubmit(input: RecipeFormInput) {
  loading.value = true
  error.value = null
  try {
    const saved = recipeId ? await store.update(recipeId, input) : await store.create(input)
    router.push({ name: 'recipe-detail', params: { id: saved.id } })
  } catch {
    error.value = 'Não foi possível salvar a receita. Verifique o formulário e tente novamente.'
  } finally {
    loading.value = false
  }
}

async function handleSubmitFromUrl(input: FromUrlInput) {
  loading.value = true
  error.value = null
  try {
    const saved = await store.createFromUrl(input)
    router.push({ name: 'recipe-detail', params: { id: saved.id } })
  } catch {
    error.value = 'Não foi possível importar a receita desta URL.'
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
    <Button variant="ghost" size="sm" @click="goBack" class="mb-4 -ml-3 text-muted-foreground hover:text-foreground">
      <ArrowLeft class="mr-2 h-4 w-4" />
      Voltar
    </Button>
    
    <div class="mb-8">
      <h1 class="text-3xl font-bold tracking-tight text-foreground">
        {{ recipeId ? 'Editar Receita' : 'Nova Receita' }}
      </h1>
      <p class="text-muted-foreground mt-1">
        {{ recipeId ? 'Atualize os detalhes da sua receita.' : 'Crie uma nova receita manualmente ou importe de uma URL.' }}
      </p>
    </div>
    
    <div v-if="error" class="mb-6 rounded-md bg-destructive/15 p-4 text-sm text-destructive border border-destructive/20 font-medium">
      {{ error }}
    </div>
    
    <div v-if="recipeId && !recipe" class="py-12 flex justify-center text-muted-foreground animate-pulse">
      Carregando detalhes da receita...
    </div>
    
    <RecipeForm
      v-else
      :recipe="recipe"
      :loading="loading"
      @submit="handleSubmit"
      @submit-from-url="handleSubmitFromUrl"
    />
  </div>
</template>
