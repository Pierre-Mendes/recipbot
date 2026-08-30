<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'

import { useAuthStore } from '@/stores/auth'
import { extractValidationErrors, firstValidationMessage } from '@/utils/errors'

const auth = useAuthStore()
const router = useRouter()

const name = ref('')
const email = ref('')
const password = ref('')
const passwordConfirmation = ref('')
const success = ref(false)
const fieldErrors = ref<Record<string, string[]>>({})

async function handleSubmit() {
  fieldErrors.value = {}
  try {
    await auth.register(name.value, email.value, password.value, passwordConfirmation.value)
    success.value = true
    setTimeout(() => router.push({ name: 'login' }), 1200)
  } catch (e) {
    fieldErrors.value = extractValidationErrors(e)
  }
}
</script>

<template>
  <div class="mx-auto max-w-sm">
    <h1 class="mb-4 text-xl font-semibold">Create an account</h1>
    <p v-if="success" class="text-sm text-green-600">Registered! Redirecting to login...</p>
    <form v-else class="space-y-4" @submit.prevent="handleSubmit">
      <div>
        <label class="block text-sm font-medium text-gray-700" for="name">Name</label>
        <input
          id="name"
          v-model="name"
          type="text"
          required
          class="mt-1 w-full rounded border border-gray-300 px-3 py-2"
        />
        <p v-if="firstValidationMessage(fieldErrors, 'name')" class="mt-1 text-xs text-red-600">
          {{ firstValidationMessage(fieldErrors, 'name') }}
        </p>
      </div>
      <div>
        <label class="block text-sm font-medium text-gray-700" for="email">Email</label>
        <input
          id="email"
          v-model="email"
          type="email"
          required
          class="mt-1 w-full rounded border border-gray-300 px-3 py-2"
        />
        <p v-if="firstValidationMessage(fieldErrors, 'email')" class="mt-1 text-xs text-red-600">
          {{ firstValidationMessage(fieldErrors, 'email') }}
        </p>
      </div>
      <div>
        <label class="block text-sm font-medium text-gray-700" for="password">Password</label>
        <input
          id="password"
          v-model="password"
          type="password"
          required
          minlength="8"
          class="mt-1 w-full rounded border border-gray-300 px-3 py-2"
        />
        <p v-if="firstValidationMessage(fieldErrors, 'password')" class="mt-1 text-xs text-red-600">
          {{ firstValidationMessage(fieldErrors, 'password') }}
        </p>
      </div>
      <div>
        <label class="block text-sm font-medium text-gray-700" for="password_confirmation"
          >Confirm password</label
        >
        <input
          id="password_confirmation"
          v-model="passwordConfirmation"
          type="password"
          required
          class="mt-1 w-full rounded border border-gray-300 px-3 py-2"
        />
        <p
          v-if="firstValidationMessage(fieldErrors, 'password_confirmation')"
          class="mt-1 text-xs text-red-600"
        >
          {{ firstValidationMessage(fieldErrors, 'password_confirmation') }}
        </p>
      </div>
      <p v-if="auth.error" class="text-sm text-red-600">{{ auth.error }}</p>
      <button
        type="submit"
        :disabled="auth.loading"
        class="w-full rounded bg-purple-600 px-4 py-2 text-white disabled:opacity-50"
      >
        Register
      </button>
    </form>
    <p class="mt-4 text-sm text-gray-600">
      Already have an account? <RouterLink to="/login" class="text-purple-600">Log in</RouterLink>
    </p>
  </div>
</template>
