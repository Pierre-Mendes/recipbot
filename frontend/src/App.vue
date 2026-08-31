<script setup lang="ts">
import { onMounted } from 'vue'

import NavBar from '@/components/NavBar.vue'
import AppFooter from '@/components/AppFooter.vue'
import ToastContainer from '@/components/ui/ToastContainer.vue'
import ConfirmDialog from '@/components/ui/ConfirmDialog.vue'
import { useAuthStore } from '@/stores/auth'
import { useDarkMode } from '@/composables/useDarkMode'

const auth = useAuthStore()

// Initialize dark mode on app boot
useDarkMode()

onMounted(() => {
  if (auth.isAuthenticated) {
    auth.fetchCurrentUser()
  }
})
</script>

<template>
  <div class="min-h-screen bg-background flex flex-col">
    <NavBar />
    <main class="mx-auto max-w-4xl w-full px-4 py-6 flex-1">
      <RouterView v-slot="{ Component, route }">
        <component :is="Component" :key="route.path" />
      </RouterView>
    </main>
    <AppFooter />
    <ToastContainer />
    <ConfirmDialog />
  </div>
</template>
