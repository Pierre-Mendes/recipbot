<script setup lang="ts">
import { ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ChefHat, Loader2 } from 'lucide-vue-next'

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
  <div class="mx-auto max-w-md animate-in fade-in zoom-in-95 duration-500 pt-8">
    <div class="flex justify-center mb-8">
      <div class="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-lg">
        <ChefHat class="h-10 w-10" />
      </div>
    </div>
    
    <Card class="border-border/50 shadow-xl">
      <CardHeader class="space-y-1 text-center pb-6">
        <CardTitle class="text-2xl font-bold">Bem-vindo de volta</CardTitle>
        <CardDescription>Digite seu e-mail para entrar na sua conta</CardDescription>
      </CardHeader>
      
      <CardContent>
        <form class="space-y-4" @submit.prevent="handleSubmit">
          <div class="space-y-2">
            <Label for="email">E-mail</Label>
            <Input
              id="email"
              v-model="email"
              type="email"
              placeholder="seu@email.com"
              required
            />
          </div>
          <div class="space-y-2">
            <div class="flex items-center justify-between">
              <Label for="password">Senha</Label>
              <RouterLink to="#" class="text-sm text-primary hover:underline" tabindex="-1">
                Esqueceu a senha?
              </RouterLink>
            </div>
            <Input
              id="password"
              v-model="password"
              type="password"
              required
            />
          </div>
          
          <div v-if="auth.error" class="rounded-md bg-destructive/15 p-3 text-sm text-destructive mt-4 border border-destructive/20">
            {{ auth.error }}
          </div>
          
          <Button
            type="submit"
            :disabled="auth.loading"
            class="w-full mt-6"
          >
            <Loader2 v-if="auth.loading" class="mr-2 h-4 w-4 animate-spin" />
            Entrar
          </Button>
        </form>
      </CardContent>
      
      <CardFooter class="flex flex-col border-t p-6">
        <p class="text-center text-sm text-muted-foreground w-full">
          Não tem uma conta? 
          <RouterLink to="/register" class="text-primary hover:underline font-medium">
            Cadastre-se
          </RouterLink>
        </p>
      </CardFooter>
    </Card>
  </div>
</template>
