<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { Pencil, Trash2, Link as LinkIcon, ChefHat, ArrowLeft } from 'lucide-vue-next'

import { getRecipe } from '@/api/recipes'
import type { Recipe } from '@/types'
import { useRecipesStore } from '@/stores/recipes'
import { useToast } from '@/composables/useToast'
import { useConfirmDialog } from '@/composables/useConfirmDialog'
import Button from '@/components/ui/Button.vue'
import Card from '@/components/ui/Card.vue'
import CardContent from '@/components/ui/CardContent.vue'
import Skeleton from '@/components/ui/Skeleton.vue'

const route = useRoute()
const router = useRouter()
const store = useRecipesStore()
const toast = useToast()
const { confirm } = useConfirmDialog()

const recipe = ref<Recipe | null>(null)
const loading = ref(true)
const notFound = ref(false)

const id = route.params.id as string

onMounted(async () => {
  try {
    recipe.value = await getRecipe(id)
  } catch {
    notFound.value = true
  } finally {
    loading.value = false
  }
})

async function handleDelete() {
  const confirmed = await confirm({
    title: 'Excluir receita',
    message: 'Tem certeza de que deseja excluir esta receita? Esta ação não pode ser desfeita.',
    confirmLabel: 'Excluir',
    cancelLabel: 'Cancelar',
    variant: 'destructive',
  })
  if (!confirmed) return

  try {
    await store.remove(id)
    toast.success('Receita excluída com sucesso.')
    router.push({ name: 'recipes' })
  } catch {
    toast.error('Não foi possível excluir a receita. Tente novamente.')
  }
}

function goBack() {
  router.push({ name: 'recipes' })
}
</script>

<template>
  <!-- Loading skeleton (mirrors the real layout) -->
  <div v-if="loading" class="animate-in fade-in duration-300">
    <Skeleton class="h-8 w-24 mb-6" />
    <div class="mb-8">
      <Skeleton class="h-10 w-2/3 mb-4" />
      <div class="flex gap-2">
        <Skeleton class="h-6 w-20 rounded-full" />
        <Skeleton class="h-6 w-24 rounded-full" />
      </div>
    </div>
    <div class="grid grid-cols-1 md:grid-cols-3 gap-8">
      <div class="md:col-span-1">
        <Card class="border-border/50">
          <CardContent class="p-6 space-y-3">
            <Skeleton class="h-6 w-32 mb-4" />
            <Skeleton v-for="i in 5" :key="i" class="h-4 w-full" />
          </CardContent>
        </Card>
      </div>
      <div class="md:col-span-2">
        <Card class="border-border/50">
          <CardContent class="p-6 sm:p-8 space-y-4">
            <Skeleton class="h-7 w-40 mb-4" />
            <Skeleton v-for="i in 6" :key="i" class="h-4 w-full" />
          </CardContent>
        </Card>
      </div>
    </div>
  </div>

  <div
    v-else-if="notFound"
    class="flex flex-col items-center justify-center py-20 text-center animate-in fade-in"
  >
    <ChefHat class="h-16 w-16 text-muted-foreground/30 mb-4" />
    <h2 class="text-2xl font-semibold mb-2">Receita não encontrada</h2>
    <p class="text-muted-foreground mb-6">
      A receita que você está procurando não existe ou foi removida.
    </p>
    <Button @click="goBack">Voltar para receitas</Button>
  </div>

  <div v-else-if="recipe" class="animate-in fade-in slide-in-from-bottom-4 duration-500">
    <!-- Botão Voltar -->
    <Button
      variant="ghost"
      size="sm"
      class="mb-6 -ml-3 text-muted-foreground hover:text-foreground"
      @click="goBack"
    >
      <ArrowLeft class="mr-2 h-4 w-4" />
      Voltar
    </Button>

    <!-- Hero Section -->
    <div class="mb-8">
      <div class="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-4">
        <h1 class="text-3xl sm:text-4xl font-bold tracking-tight text-foreground">
          {{ recipe.title }}
        </h1>
        <div class="flex gap-2 shrink-0">
          <RouterLink :to="{ name: 'recipe-edit', params: { id: recipe.id } }">
            <Button variant="outline" size="sm">
              <Pencil class="h-4 w-4 mr-2" />
              Editar
            </Button>
          </RouterLink>
          <Button variant="destructive" size="sm" @click="handleDelete">
            <Trash2 class="h-4 w-4 mr-2" />
            Excluir
          </Button>
        </div>
      </div>

      <div v-if="recipe.tags.length" class="flex flex-wrap gap-2 mt-4">
        <span
          v-for="tag in recipe.tags"
          :key="tag"
          class="inline-flex items-center rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary"
        >
          {{ tag }}
        </span>
      </div>
    </div>

    <div class="grid grid-cols-1 md:grid-cols-3 gap-8">
      <!-- Ingredients Sidebar -->
      <div class="md:col-span-1 space-y-6">
        <Card class="bg-card shadow-sm border-border/50">
          <CardContent class="p-6">
            <h2 class="flex items-center text-lg font-semibold text-foreground mb-4">
              <ChefHat class="h-5 w-5 mr-2 text-primary" />
              Ingredientes
            </h2>
            <ul class="space-y-3">
              <li v-for="(ingredient, i) in recipe.ingredients" :key="i" class="flex items-start">
                <div
                  class="mr-3 mt-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-primary/20 text-primary"
                >
                  <span class="h-1.5 w-1.5 rounded-full bg-primary"></span>
                </div>
                <span class="text-sm text-card-foreground leading-tight">{{ ingredient }}</span>
              </li>
            </ul>
          </CardContent>
        </Card>

        <a
          v-if="recipe.source_url"
          :href="recipe.source_url"
          target="_blank"
          rel="noopener"
          class="flex items-center justify-center gap-2 w-full rounded-lg border border-border bg-muted/50 p-4 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
        >
          <LinkIcon class="h-4 w-4" />
          Fonte Original
        </a>
      </div>

      <!-- Instructions -->
      <div class="md:col-span-2">
        <Card class="h-full shadow-sm border-border/50">
          <CardContent class="p-6 sm:p-8">
            <h2 class="text-xl font-semibold text-foreground mb-6">Modo de Preparo</h2>
            <template v-if="recipe.instructions?.length">
              <ol
                class="space-y-8 relative before:absolute before:inset-y-0 before:left-[15px] before:w-0.5 before:bg-border/50 pl-0"
              >
                <li v-for="(step, i) in recipe.instructions" :key="i" class="relative pl-10">
                  <div
                    class="absolute left-0 flex h-8 w-8 items-center justify-center rounded-full bg-background border-2 border-primary text-primary font-bold text-sm shadow-sm"
                  >
                    {{ i + 1 }}
                  </div>
                  <p class="text-foreground leading-relaxed pt-1">{{ step }}</p>
                </li>
              </ol>
            </template>
            <div v-else class="text-muted-foreground italic bg-muted/30 p-6 rounded-lg text-center">
              Nenhuma instrução fornecida para esta receita.
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  </div>
</template>
