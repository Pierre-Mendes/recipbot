<script setup lang="ts">
import { ref } from 'vue'
import { Mail, Loader2, CheckCircle2 } from 'lucide-vue-next'

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

const email = ref('')
const success = ref(false)

async function handleSubmit() {
  await auth.forgotPassword(email.value)
  success.value = true
}
</script>

<template>
  <div class="mx-auto max-w-md animate-in fade-in zoom-in-95 duration-500 pt-8">
    <div class="flex justify-center mb-8">
      <div
        class="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-lg"
      >
        <Mail class="h-8 w-8" />
      </div>
    </div>

    <Card class="border-border/50 shadow-xl">
      <CardHeader class="space-y-1 text-center pb-6">
        <CardTitle class="text-2xl font-bold">Esqueceu sua senha?</CardTitle>
        <CardDescription>Digite seu e-mail para receber um link de redefinição</CardDescription>
      </CardHeader>

      <CardContent>
        <div
          v-if="success"
          class="flex flex-col items-center justify-center py-6 animate-in fade-in zoom-in"
        >
          <CheckCircle2 class="h-12 w-12 text-primary mb-4" />
          <p class="text-lg font-medium">Link enviado!</p>
          <p class="text-muted-foreground text-sm">Verifique seu e-mail para prosseguir</p>
        </div>

        <form v-else class="space-y-4" @submit.prevent="handleSubmit">
          <div class="space-y-2">
            <Label for="email">E-mail</Label>
            <Input id="email" v-model="email" type="email" placeholder="seu@email.com" required />
          </div>

          <Button type="submit" :disabled="auth.loading" class="w-full mt-6">
            <Loader2 v-if="auth.loading" class="mr-2 h-4 w-4 animate-spin" />
            Enviar link de redefinição
          </Button>
        </form>
      </CardContent>

      <CardFooter class="flex flex-col border-t p-6">
        <p class="text-center text-sm text-muted-foreground w-full">
          Lembrou sua senha?
          <RouterLink to="/login" class="text-primary hover:underline font-medium">
            Entrar
          </RouterLink>
        </p>
      </CardFooter>
    </Card>
  </div>
</template>
