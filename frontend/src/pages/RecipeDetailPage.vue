<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { Pencil, Trash2, Link as LinkIcon, ChefHat, ArrowLeft, StickyNote } from 'lucide-vue-next'

import { getRecipe } from '@/api/recipes'
import { parseIngredient } from '@/utils/parseIngredient'
import { convertIngredient, type UnitSystem } from '@/utils/units'
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

const UNIT_KEY = 'recipbot:unit-system'
const UNIT_OPTIONS: { value: UnitSystem; label: string }[] = [
  { value: 'original', label: 'Original' },
  { value: 'g', label: 'g' },
  { value: 'ml', label: 'ml' },
  { value: 'cup', label: 'xícara' },
]

function loadUnitSystem(): UnitSystem {
  try {
    const saved = localStorage.getItem(UNIT_KEY)
    if (saved && UNIT_OPTIONS.some((o) => o.value === saved)) {
      return saved as UnitSystem
    }
  } catch {
    // localStorage can be unavailable (private mode) - fall back to original.
  }
  return 'original'
}

const unitSystem = ref<UnitSystem>(loadUnitSystem())

function setUnitSystem(value: UnitSystem): void {
  unitSystem.value = value
  try {
    localStorage.setItem(UNIT_KEY, value)
  } catch {
    // Persisting the preference is best-effort.
  }
}

// Each ingredient rendered as { measure, name, converted }. When a target unit
// is chosen and the line can be converted, show the converted amount (marked
// approximate); otherwise fall back to the original highlighted measure.
const displayIngredients = computed(() =>
  (recipe.value?.ingredients ?? []).map((raw) => {
    if (unitSystem.value !== 'original') {
      const converted = convertIngredient(raw, unitSystem.value)
      if (converted) {
        return { ...converted, converted: true }
      }
    }
    const { measure, name } = parseIngredient(raw)
    return { measure, name, converted: false }
  }),
)

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

/**
 * Split note text into plain and link segments so URLs render as clickable
 * anchors without ever using v-html (the raw text stays escaped by Vue).
 */
function noteSegments(text: string): { text: string; href: string | null }[] {
  return text.split(/(https?:\/\/[^\s]+)/g).map((part) => ({
    text: part,
    href: /^https?:\/\//.test(part) ? part : null,
  }))
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

      <div v-if="recipe.tags?.length" class="flex flex-wrap gap-2 mt-4">
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

            <div
              class="inline-flex items-center rounded-lg border border-border bg-muted/40 p-0.5 mb-4"
              role="group"
              aria-label="Unidade de exibição"
            >
              <button
                v-for="opt in UNIT_OPTIONS"
                :key="opt.value"
                type="button"
                class="rounded-md px-2.5 py-1 text-xs font-medium transition-colors"
                :class="
                  unitSystem === opt.value
                    ? 'bg-background text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                "
                :aria-pressed="unitSystem === opt.value"
                @click="setUnitSystem(opt.value)"
              >
                {{ opt.label }}
              </button>
            </div>

            <ul class="space-y-3">
              <li v-for="(item, i) in displayIngredients" :key="i" class="flex items-start">
                <div
                  class="mr-3 mt-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-primary/20 text-primary"
                >
                  <span class="h-1.5 w-1.5 rounded-full bg-primary"></span>
                </div>
                <span class="text-sm text-card-foreground leading-tight">
                  <template v-if="item.measure">
                    <span class="font-semibold text-primary tabular-nums"
                      ><span
                        v-if="item.converted"
                        class="text-muted-foreground"
                        title="Valor aproximado"
                        >≈ </span
                      >{{ item.measure }}</span
                    >
                    {{ item.name }}
                  </template>
                  <template v-else>{{ item.name }}</template>
                </span>
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

        <Card v-if="recipe.notes" class="bg-card shadow-sm border-border/50">
          <CardContent class="p-6">
            <h2 class="flex items-center text-lg font-semibold text-foreground mb-3">
              <StickyNote class="h-5 w-5 mr-2 text-primary" />
              Observação
            </h2>
            <p class="text-sm text-card-foreground leading-relaxed whitespace-pre-line break-words">
              <template v-for="(seg, i) in noteSegments(recipe.notes)" :key="i"
                ><a
                  v-if="seg.href"
                  :href="seg.href"
                  target="_blank"
                  rel="noopener nofollow"
                  class="text-primary underline underline-offset-2 break-all"
                  >{{ seg.text }}</a
                ><template v-else>{{ seg.text }}</template></template
              >
            </p>
          </CardContent>
        </Card>
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
