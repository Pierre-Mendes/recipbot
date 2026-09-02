<script setup lang="ts">
import { ref } from 'vue'
import { Loader2, Save, UserCog, KeyRound } from 'lucide-vue-next'

import { useAuthStore } from '@/stores/auth'
import { useToast } from '@/composables/useToast'
import type { ApiValidationError } from '@/types'
import Card from '@/components/ui/Card.vue'
import CardContent from '@/components/ui/CardContent.vue'
import Input from '@/components/ui/Input.vue'
import Label from '@/components/ui/Label.vue'
import Button from '@/components/ui/Button.vue'

const auth = useAuthStore()
const toast = useToast()

const name = ref(auth.user?.name ?? '')
const email = ref(auth.user?.email ?? '')
const savingProfile = ref(false)

const currentPassword = ref('')
const newPassword = ref('')
const confirmPassword = ref('')
const savingPassword = ref(false)

/** Pull the most useful message out of a Laravel error response. */
function messageFrom(e: unknown, fallback: string): string {
  const data = (e as { response?: { data?: Partial<ApiValidationError> } })?.response?.data
  if (data?.errors) {
    const first = Object.values(data.errors)[0]
    if (Array.isArray(first) && typeof first[0] === 'string') return first[0]
  }
  if (typeof data?.message === 'string') return data.message
  return fallback
}

async function saveProfile() {
  savingProfile.value = true
  try {
    await auth.updateProfile({ name: name.value, email: email.value })
    toast.success('Perfil atualizado com sucesso.')
  } catch (e) {
    toast.error(messageFrom(e, 'Não foi possível atualizar o perfil.'))
  } finally {
    savingProfile.value = false
  }
}

async function savePassword() {
  savingPassword.value = true
  try {
    await auth.changePassword({
      current_password: currentPassword.value,
      password: newPassword.value,
      password_confirmation: confirmPassword.value,
    })
    toast.success('Senha alterada com sucesso.')
    currentPassword.value = ''
    newPassword.value = ''
    confirmPassword.value = ''
  } catch (e) {
    toast.error(messageFrom(e, 'Não foi possível alterar a senha.'))
  } finally {
    savingPassword.value = false
  }
}
</script>

<template>
  <div class="max-w-2xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
    <div class="mb-8">
      <h1 class="text-3xl font-bold tracking-tight text-foreground">Perfil</h1>
      <p class="text-muted-foreground mt-1">Gerencie seus dados de conta e sua senha.</p>
    </div>

    <div class="space-y-6">
      <Card class="border-border/50 shadow-sm">
        <CardContent class="pt-6">
          <h2 class="flex items-center text-lg font-semibold text-foreground mb-4">
            <UserCog class="h-5 w-5 mr-2 text-primary" />
            Dados da conta
          </h2>
          <form class="space-y-4" @submit.prevent="saveProfile">
            <div class="space-y-2">
              <Label for="name">Nome</Label>
              <Input id="name" v-model="name" type="text" required minlength="1" />
            </div>
            <div class="space-y-2">
              <Label for="email">E-mail</Label>
              <Input id="email" v-model="email" type="email" required />
            </div>
            <div class="pt-1">
              <Button type="submit" :disabled="savingProfile">
                <Loader2 v-if="savingProfile" class="mr-2 h-4 w-4 animate-spin" />
                <Save v-else class="mr-2 h-4 w-4" />
                Salvar dados
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card class="border-border/50 shadow-sm">
        <CardContent class="pt-6">
          <h2 class="flex items-center text-lg font-semibold text-foreground mb-4">
            <KeyRound class="h-5 w-5 mr-2 text-primary" />
            Trocar senha
          </h2>
          <form class="space-y-4" @submit.prevent="savePassword">
            <div class="space-y-2">
              <Label for="current-password">Senha atual</Label>
              <Input
                id="current-password"
                v-model="currentPassword"
                type="password"
                required
                autocomplete="current-password"
              />
            </div>
            <div class="space-y-2">
              <Label for="new-password">Nova senha</Label>
              <Input
                id="new-password"
                v-model="newPassword"
                type="password"
                required
                minlength="8"
                autocomplete="new-password"
              />
            </div>
            <div class="space-y-2">
              <Label for="confirm-password">Confirmar nova senha</Label>
              <Input
                id="confirm-password"
                v-model="confirmPassword"
                type="password"
                required
                minlength="8"
                autocomplete="new-password"
              />
            </div>
            <div class="pt-1">
              <Button type="submit" :disabled="savingPassword">
                <Loader2 v-if="savingPassword" class="mr-2 h-4 w-4 animate-spin" />
                <KeyRound v-else class="mr-2 h-4 w-4" />
                Alterar senha
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  </div>
</template>
