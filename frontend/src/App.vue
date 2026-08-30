<script setup lang="ts">
import { onMounted } from 'vue'

import AppNotifications from '@/components/AppNotifications.vue'
import NavBar from '@/components/NavBar.vue'
import { useAuthStore } from '@/stores/auth'

const auth = useAuthStore()

onMounted(() => {
  if (auth.isAuthenticated) {
    auth.fetchCurrentUser()
  }
})
</script>

<template>
  <div class="min-h-screen bg-gray-50">
    <AppNotifications />
    <NavBar />
    <main class="mx-auto max-w-4xl px-4 py-6">
      <RouterView />
    </main>
  </div>
</template>
