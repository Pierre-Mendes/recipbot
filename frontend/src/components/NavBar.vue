<script setup lang="ts">
import { useRouter } from 'vue-router'

import { useAuthStore } from '@/stores/auth'

const auth = useAuthStore()
const router = useRouter()

async function handleLogout() {
  await auth.logout()
  router.push({ name: 'login' })
}
</script>

<template>
  <header class="border-b border-gray-200 bg-white">
    <div class="mx-auto flex max-w-4xl items-center justify-between px-4 py-3">
      <RouterLink to="/" class="text-lg font-semibold text-gray-900">RecipBot</RouterLink>
      <nav v-if="auth.isAuthenticated" class="flex items-center gap-4 text-sm">
        <RouterLink to="/" class="text-gray-600 hover:text-gray-900">My Recipes</RouterLink>
        <RouterLink to="/recipes/new" class="text-gray-600 hover:text-gray-900"
          >Add Recipe</RouterLink
        >
        <span v-if="auth.user" class="text-gray-400">{{ auth.user.name }}</span>
        <button
          type="button"
          class="rounded bg-gray-100 px-3 py-1 text-gray-700 hover:bg-gray-200"
          @click="handleLogout"
        >
          Logout
        </button>
      </nav>
    </div>
  </header>
</template>
