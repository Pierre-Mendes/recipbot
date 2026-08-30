# Vue 3 Frontend Context - CodingAgent

## 📚 Contexto Específico para Implementação Frontend

Este arquivo contém padrões, convenções e exemplos para o FrontendBuilder subagent implementar código Vue 3 de qualidade.

---

## 🏗️ Estrutura Vue 3 + TypeScript

### Diretório App Structure
```
frontend/src/
├── App.vue                     # Root component
├── main.ts                     # Entry point
├── components/                 # Reusable components
│   ├── ui/                     # ShadcN Vue components
│   │   ├── Button.vue
│   │   ├── Input.vue
│   │   ├── Card.vue
│   │   └── ...
│   ├── recipes/                # Feature components
│   │   ├── RecipeForm.vue
│   │   ├── RecipeCard.vue
│   │   ├── RecipeSearch.vue
│   │   └── RecipeDetail.vue
│   └── common/                 # Common components
│       ├── Header.vue
│       ├── Navbar.vue
│       └── Footer.vue
├── pages/                      # Route views
│   ├── HomePage.vue
│   ├── RecipesPage.vue
│   ├── SearchPage.vue
│   ├── ProfilePage.vue
│   └── NotFoundPage.vue
├── stores/                     # Pinia state management
│   ├── authStore.ts
│   ├── recipesStore.ts
│   └── uiStore.ts
├── composables/                # Reusable logic hooks
│   ├── useAuth.ts
│   ├── useRecipes.ts
│   ├── useSearch.ts
│   └── useFetch.ts
├── services/                   # API clients
│   ├── authService.ts
│   ├── recipeService.ts
│   └── searchService.ts
├── types/                      # TypeScript interfaces
│   ├── Recipe.ts
│   ├── User.ts
│   ├── API.ts
│   └── index.ts
├── utils/                      # Helper functions
│   ├── formatters.ts
│   ├── validators.ts
│   └── constants.ts
├── styles/                     # Global styles
│   ├── main.css
│   ├── tailwind.css
│   └── variables.css
└── router/                     # Vue Router config
    └── index.ts
```

---

## 🔑 Padrões de Código

### 1. Single File Components (SFC) com `<script setup>`

**Localização:** `src/components/recipes/RecipeCard.vue`

**Padrão:**
```vue
<template>
  <div class="recipe-card">
    <div class="recipe-header">
      <h2 class="recipe-title">{{ recipe.title }}</h2>
      <button @click="handleDelete" class="btn btn-sm btn-danger">
        Delete
      </button>
    </div>
    
    <div class="recipe-body">
      <p class="recipe-time">
        ⏱️ {{ recipe.totalTimeMinutes }} min
      </p>
      <div class="recipe-tags">
        <span 
          v-for="tag in recipe.tags" 
          :key="tag"
          class="badge badge-primary"
        >
          {{ tag }}
        </span>
      </div>
    </div>

    <div class="recipe-footer">
      <router-link 
        :to="`/recipes/${recipe.id}`"
        class="btn btn-primary"
      >
        View Details
      </router-link>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import type { Recipe } from '@/types'
import { useRecipes } from '@/composables/useRecipes'

interface Props {
  recipe: Recipe
}

const props = defineProps<Props>()

const emit = defineEmits<{
  deleted: [id: string]
}>()

const isDeleting = ref(false)
const { deleteRecipe } = useRecipes()

const handleDelete = async () => {
  if (!confirm('Delete this recipe?')) return

  isDeleting.value = true
  try {
    await deleteRecipe(props.recipe.id)
    emit('deleted', props.recipe.id)
  } catch (error) {
    console.error('Failed to delete recipe', error)
  } finally {
    isDeleting.value = false
  }
}
</script>

<style scoped>
.recipe-card {
  @apply border rounded-lg p-4 hover:shadow-lg transition-shadow;
}

.recipe-header {
  @apply flex justify-between items-center mb-4;
}

.recipe-title {
  @apply text-xl font-bold text-gray-900 dark:text-white;
}

.recipe-time {
  @apply text-sm text-gray-600 dark:text-gray-400 mb-2;
}

.recipe-tags {
  @apply flex flex-wrap gap-2 mb-4;
}

.badge {
  @apply px-2 py-1 text-xs rounded;
}

.badge-primary {
  @apply bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200;
}

.recipe-footer {
  @apply flex gap-2 justify-end;
}
</style>
```

**Regras:**
- ✅ Usar `<script setup>` (mais conciso)
- ✅ TypeScript strict mode sempre
- ✅ Props com type validation
- ✅ Emits bem definidos
- ✅ Tailwind CSS para styling
- ✅ Responsive design
- ❌ Nunca usar inline styles
- ❌ Nunca usar `this.`

### 2. Pinia Stores (State Management)

**Localização:** `src/stores/recipesStore.ts`

**Padrão:**
```typescript
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { Recipe } from '@/types'
import { recipeService } from '@/services/recipeService'

export const useRecipesStore = defineStore('recipes', () => {
  // State
  const recipes = ref<Recipe[]>([])
  const isLoading = ref(false)
  const error = ref<string | null>(null)

  // Computed
  const sortedRecipes = computed(() => {
    return [...recipes.value].sort((a, b) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    )
  })

  const recipeCount = computed(() => recipes.value.length)

  // Actions
  const fetchRecipes = async () => {
    isLoading.value = true
    error.value = null
    try {
      recipes.value = await recipeService.getAll()
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Unknown error'
    } finally {
      isLoading.value = false
    }
  }

  const getRecipeById = (id: string) => {
    return recipes.value.find(r => r.id === id)
  }

  const addRecipe = async (data: Omit<Recipe, 'id' | 'createdAt'>) => {
    try {
      const newRecipe = await recipeService.create(data)
      recipes.value.push(newRecipe)
      return newRecipe
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Unknown error'
      throw err
    }
  }

  const updateRecipe = async (id: string, data: Partial<Recipe>) => {
    try {
      const updated = await recipeService.update(id, data)
      const index = recipes.value.findIndex(r => r.id === id)
      if (index !== -1) {
        recipes.value[index] = updated
      }
      return updated
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Unknown error'
      throw err
    }
  }

  const deleteRecipe = async (id: string) => {
    try {
      await recipeService.delete(id)
      recipes.value = recipes.value.filter(r => r.id !== id)
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Unknown error'
      throw err
    }
  }

  return {
    // State
    recipes,
    isLoading,
    error,
    
    // Computed
    sortedRecipes,
    recipeCount,
    
    // Actions
    fetchRecipes,
    getRecipeById,
    addRecipe,
    updateRecipe,
    deleteRecipe,
  }
})
```

**Regras:**
- ✅ Usar Composition API (defineStore com função)
- ✅ Separar: state, computed, actions
- ✅ Sempre ter isLoading e error
- ✅ Ações async com try/catch
- ✅ Retornar explicitamente
- ❌ Nunca usar mutations
- ❌ Nunca compartilhar state sem store

### 3. Composables (Reusable Logic)

**Localização:** `src/composables/useRecipes.ts`

**Padrão:**
```typescript
import { ref, computed } from 'vue'
import type { Recipe } from '@/types'
import { recipeService } from '@/services/recipeService'

export function useRecipes() {
  const recipes = ref<Recipe[]>([])
  const isLoading = ref(false)
  const error = ref<string | null>(null)
  const selectedRecipe = ref<Recipe | null>(null)

  const filteredRecipes = computed(() => {
    return recipes.value.filter(r => 
      selectedRecipe.value?.tags.some(tag => r.tags.includes(tag))
    )
  })

  const fetchRecipes = async () => {
    isLoading.value = true
    try {
      recipes.value = await recipeService.getAll()
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Unknown error'
    } finally {
      isLoading.value = false
    }
  }

  const searchRecipes = async (query: string) => {
    isLoading.value = true
    try {
      recipes.value = await recipeService.search(query)
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Unknown error'
    } finally {
      isLoading.value = false
    }
  }

  return {
    recipes,
    isLoading,
    error,
    selectedRecipe,
    filteredRecipes,
    fetchRecipes,
    searchRecipes,
  }
}
```

**Regras:**
- ✅ Reutilizar em múltiplos componentes
- ✅ Retornar valores reatos e funções
- ✅ Naming: `use` prefix (useRecipes)
- ✅ Manter composables pequenos (<100 linhas)
- ❌ Nunca colocar JSX/template em composables

### 4. TypeScript Interfaces

**Localização:** `src/types/Recipe.ts`

**Padrão:**
```typescript
export interface Recipe {
  id: string
  userId: string
  title: string
  ingredients: string[]
  instructions: string
  tags: string[]
  sourceUrl?: string
  prepTimeMinutes?: number
  cookTimeMinutes?: number
  createdAt: Date
  updatedAt: Date
  deletedAt?: Date
}

export interface RecipeFormData {
  title: string
  ingredients: string[]
  instructions: string
  tags: string[]
  sourceUrl?: string
  prepTimeMinutes?: number
  cookTimeMinutes?: number
}

export interface RecipeSearchQuery {
  tags?: string[]
  query?: string
  skip?: number
  limit?: number
}

export type RecipeResponse = {
  data: Recipe
  message: string
}

export type RecipesListResponse = {
  data: Recipe[]
  count: number
  message: string
}
```

**Regras:**
- ✅ Usar interfaces (não types)
- ✅ Naming: PascalCase
- ✅ Export tudo que é usado
- ✅ Documentar tipos complexos
- ❌ Nunca usar `any`
- ❌ Nunca usar `as` type assertion

### 5. API Services

**Localização:** `src/services/recipeService.ts`

**Padrão:**
```typescript
import axios from 'axios'
import type { Recipe, RecipeFormData, RecipeSearchQuery } from '@/types'

const API_BASE_URL = import.meta.env.VITE_API_URL

export const recipeService = {
  async getAll(): Promise<Recipe[]> {
    const { data } = await axios.get(`${API_BASE_URL}/recipes`)
    return data.data
  },

  async getById(id: string): Promise<Recipe> {
    const { data } = await axios.get(`${API_BASE_URL}/recipes/${id}`)
    return data.data
  },

  async create(recipe: RecipeFormData): Promise<Recipe> {
    const { data } = await axios.post(`${API_BASE_URL}/recipes`, recipe)
    return data.data
  },

  async update(id: string, recipe: Partial<RecipeFormData>): Promise<Recipe> {
    const { data } = await axios.put(`${API_BASE_URL}/recipes/${id}`, recipe)
    return data.data
  },

  async delete(id: string): Promise<void> {
    await axios.delete(`${API_BASE_URL}/recipes/${id}`)
  },

  async search(query: RecipeSearchQuery): Promise<Recipe[]> {
    const { data } = await axios.get(`${API_BASE_URL}/recipes/search`, {
      params: query,
    })
    return data.data
  },

  async searchByTags(tags: string[]): Promise<Recipe[]> {
    const { data } = await axios.get(`${API_BASE_URL}/recipes/tags`, {
      params: { tags },
    })
    return data.data
  },
}
```

**Regras:**
- ✅ Centralizar todas as chamadas API
- ✅ Usar axios com interceptors para auth
- ✅ Typing completo (entrada e saída)
- ✅ Error handling em composables/stores
- ❌ Nunca fazer fetch direto em componentes
- ❌ Nunca hardcoded URLs

### 6. Routes Configuration

**Localização:** `src/router/index.ts`

**Padrão:**
```typescript
import { createRouter, createWebHistory } from 'vue-router'
import type { RouteRecordRaw } from 'vue-router'
import { useAuthStore } from '@/stores/authStore'

const routes: RouteRecordRaw[] = [
  {
    path: '/',
    name: 'Home',
    component: () => import('@/pages/HomePage.vue'),
  },
  {
    path: '/recipes',
    name: 'Recipes',
    component: () => import('@/pages/RecipesPage.vue'),
    meta: { requiresAuth: true },
  },
  {
    path: '/recipes/:id',
    name: 'RecipeDetail',
    component: () => import('@/pages/RecipeDetailPage.vue'),
    meta: { requiresAuth: true },
  },
  {
    path: '/search',
    name: 'Search',
    component: () => import('@/pages/SearchPage.vue'),
    meta: { requiresAuth: true },
  },
  {
    path: '/profile',
    name: 'Profile',
    component: () => import('@/pages/ProfilePage.vue'),
    meta: { requiresAuth: true },
  },
  {
    path: '/:pathMatch(.*)*',
    name: 'NotFound',
    component: () => import('@/pages/NotFoundPage.vue'),
  },
]

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes,
})

router.beforeEach((to, from, next) => {
  const authStore = useAuthStore()
  
  if (to.meta.requiresAuth && !authStore.isAuthenticated) {
    next({ name: 'Home' })
  } else {
    next()
  }
})

export default router
```

**Regras:**
- ✅ Lazy loading com `() => import(...)`
- ✅ Meta guards para autenticação
- ✅ Named routes
- ✅ Type-safe routing
- ❌ Nunca usar hardcoded paths

### 7. Testing com Vitest

**Localização:** `src/components/recipes/__tests__/RecipeCard.spec.ts`

**Padrão:**
```typescript
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import RecipeCard from '../RecipeCard.vue'
import type { Recipe } from '@/types'

describe('RecipeCard.vue', () => {
  let recipe: Recipe

  beforeEach(() => {
    recipe = {
      id: '1',
      userId: 'user1',
      title: 'Bolo de Chocolate',
      ingredients: ['Chocolate', 'Ovos'],
      instructions: 'Misture tudo...',
      tags: ['dessert', 'chocolate'],
      prepTimeMinutes: 20,
      cookTimeMinutes: 30,
      createdAt: new Date(),
      updatedAt: new Date(),
    }
  })

  it('renders recipe title', () => {
    const wrapper = mount(RecipeCard, {
      props: { recipe },
    })
    expect(wrapper.text()).toContain('Bolo de Chocolate')
  })

  it('displays recipe time correctly', () => {
    const wrapper = mount(RecipeCard, {
      props: { recipe },
    })
    expect(wrapper.text()).toContain('50 min')
  })

  it('emits deleted event on delete button click', async () => {
    const wrapper = mount(RecipeCard, {
      props: { recipe },
    })

    // Mock window.confirm
    vi.stubGlobal('confirm', () => true)

    await wrapper.find('.btn-danger').trigger('click')
    
    expect(wrapper.emitted('deleted')).toBeTruthy()
    expect(wrapper.emitted('deleted')?.[0]).toEqual(['1'])
  })

  it('renders all tags', () => {
    const wrapper = mount(RecipeCard, {
      props: { recipe },
    })
    expect(wrapper.findAll('.badge')).toHaveLength(2)
  })
})
```

**Regras:**
- ✅ 1 teste por comportamento
- ✅ Usar @vue/test-utils
- ✅ Mock dependencies apropriadamente
- ✅ Coverage >70% obrigatório
- ❌ Nunca testar implementação (test behavior)

---

## 🎨 Tailwind CSS + Responsive Design

### Breakpoints
```
Base: 0-639px (mobile)
sm: 640px (landscape mobile)
md: 768px (tablet)
lg: 1024px (desktop)
xl: 1280px (large desktop)
```

### Component Responsive
```vue
<div class="
  grid 
  grid-cols-1 
  sm:grid-cols-2 
  md:grid-cols-3 
  lg:grid-cols-4
  gap-4 
  p-4 
  md:p-6 
  lg:p-8
">
  <!-- Cards here -->
</div>
```

---

## 🔐 Segurança Frontend

### XSS Prevention
```typescript
// ❌ BAD - Vulnerable to XSS
<div v-html="userContent"></div>

// ✅ GOOD - Safe
<div>{{ userContent }}</div>
```

### CSRF Protection
```typescript
// Headers automáticos via axios interceptors
axios.defaults.headers.common['X-CSRF-TOKEN'] = token
```

### Auth Token Management
```typescript
// Store em localStorage (with caution)
localStorage.setItem('token', token)

// Usar em axios interceptor
axios.interceptors.request.use(config => {
  const token = localStorage.getItem('token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})
```

---

## 📊 Performance Benchmarks

| Métrica | Target | Atual |
|---------|--------|-------|
| Page Load | <3s | ~2.5s ✅ |
| Component Render | <100ms | ~80ms ✅ |
| Search Results | <500ms | ~400ms ✅ |
| Image Load | <1s | ~0.8s ✅ |

---

## 🚀 Checklist para Implementação Frontend

Quando implementar novo componente/feature:

- [ ] Criar component com `<script setup>`
- [ ] TypeScript strict mode
- [ ] Props com validation
- [ ] Emits bem definidos
- [ ] Tailwind CSS responsivo (3 breakpoints)
- [ ] Testes com Vitest (>70% coverage)
- [ ] Acessibilidade (ARIA labels)
- [ ] Dark mode support
- [ ] ESLint + Prettier passando
- [ ] Commit com mensagem clara

