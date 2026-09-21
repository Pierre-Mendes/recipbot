<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { KeyRound, Loader2, CheckCircle2 } from 'lucide-vue-next'

import { useAuthStore } from '@/stores/auth'
import Card from '@/components/ui/Card.vue'
import CardContent from '@/components/ui/CardContent.vue'
import CardHeader from '@/components/ui/CardHeader.vue'
import CardTitle from '@/components/ui/CardTitle.vue'
import CardDescription from '@/components/ui/CardDescription.vue'
import Input from '@/components/ui/Input.vue'
import Label from '@/components/ui/Label.vue'
import Button from '@/components/ui/Button.vue'

const auth = useAuthStore()
const route = useRoute()
const router = useRouter()

const token = ref('')
const email = ref('')
const password = ref('')
const passwordConfirmation = ref('')
const success = ref(false)

onMounted(() => {
  token.value = route.query.token as string
  email.value = route.query.email as string
})

async function handleSubmit() {
  await auth.resetPassword(
    email.value,
    token.value,
    password.value,
    passwordConfirmation.value
  )
  success.value = true
  setTimeout(() => router.push({ name: 'login' }), 1200)
}
</script>

<template>
  <div class="mx-auto max-w-md animate-in fade-in zoom-in-95 duration-500 pt-8">
    <div class="flex justify-center mb-8">
      <div
        class="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-lg"
      >
        <KeyRound class="h-8 w-8" />
      </div>
    </div>

    <Card class="border-border/50 shadow-xl">
      <CardHeader class="space-y-1 text-center pb-6">
        <CardTitle class="text-2xl font-bold">Redefinir Senha</CardTitle>
        <CardDescription>Digite sua nova senha</CardDescription>
      </CardHeader>

      <CardContent>
        <div
          v-if="success"
          class="flex flex-col items-center justify-center py-6 animate-in fade-in zoom-in"
        >
          <CheckCircle2 class="h-12 w-12 text-primary mb-4" />
          <p class="text-lg font-medium">Senha redefinida com sucesso!</p>
          <p class="text-muted-foreground text-sm">Redirecionando para o login...</p>
        </div>

        <form v-else class="space-y-4" @submit.prevent="handleSubmit">
          <div class="space-y-2">
            <Label for="password">Nova Senha</Label>
            <Input id="password" v-model="password" type="password" required minlength="8" />
          </div>
          <div class="space-y-2">
            <Label for="password_confirmation">Confirmar Nova Senha</Label>
            <Input
              id="password_confirmation"
              v-model="passwordConfirmation"
              type="password"
              required
            />
          </div>

          <div
            v-if="auth.error"
            class="rounded-md bg-destructive/15 p-3 text-sm text-destructive mt-4 border border-destructive/20"
          >
            {{ auth.error }}
          </div>

          <Button type="submit" :disabled="auth.loading" class="w-full mt-6">
            <Loader2 v-if="auth.loading" class="mr-2 h-4 w-4 animate-spin" />
            Redefinir Senha
          </Button>
        </form>
      </CardContent>
    </Card>
  </div>
</template>
