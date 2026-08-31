<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { UserPlus, Loader2, CheckCircle2 } from 'lucide-vue-next'

import { useAuthStore } from '@/stores/auth'
import Card from '@/components/ui/Card.vue'
import CardContent from '@/components/ui/CardContent.vue'
import CardHeader from '@/components/ui/CardHeader.vue'
import CardTitle from '@/components/ui/CardTitle.vue'
import CardDescription from '@/components/ui/CardDescription.vue'
import CardFooter from '@/components/ui/CardFooter.vue'
import Input from '@/components/ui/Input.vue'
import Label from '@/components/ui/Label.vue'
import Button from '@/components/ui/Button.vue'

const auth = useAuthStore()
const router = useRouter()

const name = ref('')
const email = ref('')
const password = ref('')
const passwordConfirmation = ref('')
const success = ref(false)

async function handleSubmit() {
  await auth.register(name.value, email.value, password.value, passwordConfirmation.value)
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
        <UserPlus class="h-8 w-8" />
      </div>
    </div>

    <Card class="border-border/50 shadow-xl">
      <CardHeader class="space-y-1 text-center pb-6">
        <CardTitle class="text-2xl font-bold">Criar uma conta</CardTitle>
        <CardDescription>Preencha seus dados para entrar no RecipBot</CardDescription>
      </CardHeader>

      <CardContent>
        <div
          v-if="success"
          class="flex flex-col items-center justify-center py-6 animate-in fade-in zoom-in"
        >
          <CheckCircle2 class="h-12 w-12 text-primary mb-4" />
          <p class="text-lg font-medium">Conta criada com sucesso!</p>
          <p class="text-muted-foreground text-sm">Redirecionando para o login...</p>
        </div>

        <form v-else class="space-y-4" @submit.prevent="handleSubmit">
          <div class="space-y-2">
            <Label for="name">Nome</Label>
            <Input id="name" v-model="name" type="text" placeholder="João Silva" required />
          </div>
          <div class="space-y-2">
            <Label for="email">E-mail</Label>
            <Input id="email" v-model="email" type="email" placeholder="seu@email.com" required />
          </div>
          <div class="space-y-2">
            <Label for="password">Senha</Label>
            <Input id="password" v-model="password" type="password" required minlength="8" />
          </div>
          <div class="space-y-2">
            <Label for="password_confirmation">Confirmar Senha</Label>
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
            Cadastrar
          </Button>
        </form>
      </CardContent>

      <CardFooter class="flex flex-col border-t p-6">
        <p class="text-center text-sm text-muted-foreground w-full">
          Já tem uma conta?
          <RouterLink to="/login" class="text-primary hover:underline font-medium">
            Entrar
          </RouterLink>
        </p>
      </CardFooter>
    </Card>
  </div>
</template>
