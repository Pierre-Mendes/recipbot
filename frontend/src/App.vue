<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'

import NavBar from '@/components/NavBar.vue'
import AppFooter from '@/components/AppFooter.vue'
import BottomNav from '@/components/BottomNav.vue'
import ToastContainer from '@/components/ui/ToastContainer.vue'
import ConfirmDialog from '@/components/ui/ConfirmDialog.vue'
import { useAuthStore } from '@/stores/auth'
import { useDarkMode } from '@/composables/useDarkMode'

const auth = useAuthStore()
const currentRoute = useRoute()

// Phones get an app-style bottom tab bar once signed in (not on the
// login/register screens, which have nothing to navigate to yet).
const showBottomNav = computed(() => auth.isAuthenticated && !currentRoute.meta.guestOnly)

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
    <main
      class="mx-auto max-w-6xl w-full px-4 py-6 sm:px-6 sm:py-8 flex-1"
      :class="showBottomNav ? 'pb-28 md:pb-8' : ''"
    >
      <RouterView v-slot="{ Component, route }">
        <component :is="Component" :key="route.path" />
      </RouterView>
    </main>
    <AppFooter :class="showBottomNav ? 'hidden md:block' : ''" />
    <BottomNav v-if="showBottomNav" />
    <ToastContainer />
    <ConfirmDialog />
  </div>
</template>
