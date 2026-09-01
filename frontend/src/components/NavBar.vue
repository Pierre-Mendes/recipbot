<script setup lang="ts">
import { useRouter } from 'vue-router'
import { ChefHat, LogOut, Plus, BookOpen, Sun, Moon, UserCircle } from 'lucide-vue-next'

import { useAuthStore } from '@/stores/auth'
import { useDarkMode } from '@/composables/useDarkMode'
import Button from '@/components/ui/Button.vue'

const auth = useAuthStore()
const router = useRouter()
const { isDark, toggle: toggleDarkMode } = useDarkMode()

async function handleLogout() {
  await auth.logout()
  router.push({ name: 'login' })
}
</script>

<template>
  <header class="sticky top-0 z-50 glass">
    <div class="mx-auto flex max-w-4xl items-center justify-between px-4 py-4">
      <RouterLink to="/" class="flex items-center gap-2 transition-transform hover:scale-105">
        <div
          class="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-sm"
        >
          <ChefHat class="h-5 w-5" />
        </div>
        <span class="text-xl font-bold tracking-tight text-foreground">RecipBot</span>
      </RouterLink>

      <nav class="flex items-center gap-2 sm:gap-4">
        <template v-if="auth.isAuthenticated">
          <RouterLink v-slot="{ isActive }" to="/">
            <Button
              variant="ghost"
              size="sm"
              :class="[
                isActive ? 'bg-accent text-accent-foreground' : 'text-muted-foreground',
                'hidden sm:flex',
              ]"
            >
              <BookOpen class="mr-2 h-4 w-4" />
              Minhas Receitas
            </Button>
          </RouterLink>
          <RouterLink to="/recipes/new">
            <Button
              variant="default"
              size="sm"
              class="shadow-md transition-transform hover:-translate-y-0.5"
            >
              <Plus class="mr-2 h-4 w-4" />
              Nova Receita
            </Button>
          </RouterLink>
        </template>

        <div class="flex items-center gap-2 ml-2 pl-3 border-l border-border">
          <!-- Dark Mode Toggle -->
          <Button
            variant="ghost"
            size="icon"
            :title="isDark ? 'Modo claro' : 'Modo escuro'"
            class="text-muted-foreground hover:text-foreground"
            @click="toggleDarkMode"
          >
            <Transition
              enter-active-class="transition-all duration-200"
              leave-active-class="transition-all duration-150"
              enter-from-class="rotate-90 scale-0 opacity-0"
              enter-to-class="rotate-0 scale-100 opacity-100"
              leave-from-class="rotate-0 scale-100 opacity-100"
              leave-to-class="-rotate-90 scale-0 opacity-0"
              mode="out-in"
            >
              <Moon v-if="!isDark" class="h-4 w-4" />
              <Sun v-else class="h-4 w-4" />
            </Transition>
          </Button>

          <template v-if="auth.isAuthenticated">
            <RouterLink
              :to="{ name: 'profile' }"
              class="flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
              title="Perfil"
            >
              <UserCircle class="h-5 w-5" />
              <span v-if="auth.user" class="hidden md:block">{{ auth.user.name }}</span>
            </RouterLink>
            <Button
              variant="ghost"
              size="icon"
              title="Sair"
              class="text-muted-foreground hover:text-destructive hover:bg-destructive/10"
              @click="handleLogout"
            >
              <LogOut class="h-4 w-4" />
            </Button>
          </template>
        </div>
      </nav>
    </div>
  </header>
</template>
