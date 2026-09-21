<script setup lang="ts">
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const router = useRouter()
const authStore = useAuthStore()

const logout = async () => {
  await authStore.logout()
  router.push({ name: 'login' })
}
</script>

<template>
  <nav class="bg-white shadow-sm">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div class="flex justify-between h-16">
        <div class="flex items-center">
          <router-link to="/" class="text-xl font-bold text-gray-900">RecipBot</router-link>
        </div>
        <div class="flex items-center space-x-4">
          <router-link
            to="/help"
            class="text-gray-700 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium"
            active-class="text-blue-600"
          >
            Ajuda
          </router-link>
          <button
            @click="logout"
            class="text-gray-700 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium"
          >
            Sair
          </button>
        </div>
      </div>
    </div>
  </nav>
</template>
