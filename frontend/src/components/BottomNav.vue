<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { BookOpen, Search, Plus, HelpCircle, UserCircle } from 'lucide-vue-next'

/**
 * App-style tab bar for phones (hidden from `md` up, where the top NavBar
 * has room for the same links). Respects the iOS home-indicator safe area.
 */
const route = useRoute()

const isRecipes = computed(() => route.name === 'recipes' && route.query.search === undefined)
const isSearch = computed(() => route.name === 'recipes' && route.query.search !== undefined)

const itemClass =
  'flex min-h-14 flex-1 flex-col items-center justify-center gap-1 text-[11px] font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring'
</script>

<template>
  <nav
    class="fixed inset-x-0 bottom-0 z-50 border-t border-border bg-background pb-[env(safe-area-inset-bottom)] md:hidden"
    aria-label="Navegação principal"
  >
    <div class="mx-auto flex max-w-md items-stretch px-2">
      <RouterLink
        :to="{ name: 'recipes' }"
        :class="[itemClass, isRecipes ? 'text-primary' : 'text-muted-foreground']"
        :aria-current="isRecipes ? 'page' : undefined"
      >
        <BookOpen class="h-5 w-5" />
        Receitas
      </RouterLink>
      <RouterLink
        :to="{ name: 'recipes', query: { search: '' } }"
        :class="[itemClass, isSearch ? 'text-primary' : 'text-muted-foreground']"
        :aria-current="isSearch ? 'page' : undefined"
      >
        <Search class="h-5 w-5" />
        Buscar
      </RouterLink>
      <div class="flex flex-1 items-start justify-center">
        <RouterLink
          :to="{ name: 'recipe-new' }"
          class="-mt-5 flex h-14 w-14 items-center justify-center rounded-full border-4 border-background bg-primary text-primary-foreground shadow-md transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          aria-label="Nova receita"
        >
          <Plus class="h-6 w-6" />
        </RouterLink>
      </div>
      <RouterLink
        :to="{ name: 'help' }"
        :class="itemClass"
        class="text-muted-foreground"
        active-class="!text-primary"
      >
        <HelpCircle class="h-5 w-5" />
        Ajuda
      </RouterLink>
      <RouterLink
        :to="{ name: 'profile' }"
        :class="itemClass"
        class="text-muted-foreground"
        active-class="!text-primary"
      >
        <UserCircle class="h-5 w-5" />
        Perfil
      </RouterLink>
    </div>
  </nav>
</template>
