<script setup lang="ts">
import { ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'

import { useAuthStore } from '@/stores/auth'

const auth = useAuthStore()
const router = useRouter()
const route = useRoute()

const email = ref('')
const password = ref('')

async function handleSubmit() {
  await auth.login(email.value, password.value)
  const redirect = typeof route.query.redirect === 'string' ? route.query.redirect : '/'
  router.push(redirect)
}
</script>

<template>
  <div class="mx-auto max-w-sm">
    <h1 class="mb-4 text-xl font-semibold">Log in</h1>
    <form class="space-y-4" @submit.prevent="handleSubmit">
      <div>
        <label class="block text-sm font-medium text-gray-700" for="email">Email</label>
        <input
          id="email"
          v-model="email"
          type="email"
          required
          class="mt-1 w-full rounded border border-gray-300 px-3 py-2"
        />
      </div>
      <div>
        <label class="block text-sm font-medium text-gray-700" for="password">Password</label>
        <input
          id="password"
          v-model="password"
          type="password"
          required
          class="mt-1 w-full rounded border border-gray-300 px-3 py-2"
        />
      </div>
      <p v-if="auth.error" class="text-sm text-red-600">{{ auth.error }}</p>
      <button
        type="submit"
        :disabled="auth.loading"
        class="w-full rounded bg-purple-600 px-4 py-2 text-white disabled:opacity-50"
      >
        Log in
      </button>
    </form>
    <p class="mt-4 text-sm text-gray-600">
      No account? <RouterLink to="/register" class="text-purple-600">Register</RouterLink>
    </p>
  </div>
</template>
