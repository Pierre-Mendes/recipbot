<script setup lang="ts">
import { useRouter } from 'vue-router'
import { ChefHat, LogOut, Plus, BookOpen } from 'lucide-vue-next'

import { useAuthStore } from '@/stores/auth'
import Button from '@/components/ui/Button.vue'

const auth = useAuthStore()
const router = useRouter()

async function handleLogout() {
  await auth.logout()
  router.push({ name: 'login' })
}
</script>

<template>
  <header class="sticky top-0 z-50 glass">
    <div class="mx-auto flex max-w-4xl items-center justify-between px-4 py-4">
      <RouterLink to="/" class="flex items-center gap-2 transition-transform hover:scale-105">
        <div class="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-sm">
          <ChefHat class="h-5 w-5" />
        </div>
        <span class="text-xl font-bold tracking-tight text-foreground">RecipBot</span>
      </RouterLink>
      
      <nav v-if="auth.isAuthenticated" class="flex items-center gap-2 sm:gap-4">
        <RouterLink to="/" v-slot="{ isActive }">
          <Button variant="ghost" size="sm" :class="[isActive ? 'bg-accent text-accent-foreground' : 'text-muted-foreground', 'hidden sm:flex']">
            <BookOpen class="mr-2 h-4 w-4" />
            Minhas Receitas
          </Button>
        </RouterLink>
        <RouterLink to="/recipes/new">
          <Button variant="default" size="sm" class="shadow-md transition-transform hover:-translate-y-0.5">
            <Plus class="mr-2 h-4 w-4" />
            Nova Receita
          </Button>
        </RouterLink>
        
        <div class="flex items-center gap-4 ml-2 pl-4 border-l border-border">
          <span v-if="auth.user" class="text-sm font-medium text-muted-foreground hidden md:block">
            {{ auth.user.name }}
          </span>
          <Button variant="ghost" size="icon" title="Sair" @click="handleLogout" class="text-muted-foreground hover:text-destructive hover:bg-destructive/10">
            <LogOut class="h-4 w-4" />
          </Button>
        </div>
      </nav>
    </div>
  </header>
</template>
