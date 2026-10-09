<script setup lang="ts">
import { useRouter } from 'vue-router'
import Button from '@/components/ui/Button.vue'
import BitMascot from '@/components/brand/BitMascot.vue'

const router = useRouter()

function goHome() {
  router.push({ name: 'recipes' })
}
</script>

<template>
  <div
    class="flex flex-col items-center justify-center py-20 text-center animate-in fade-in zoom-in-95 duration-500"
  >
    <div class="mb-6">
      <BitMascot pose="oops" :size="140" />
    </div>

    <h1 class="text-4xl font-bold tracking-tight text-foreground mb-2">404</h1>
    <h2 class="text-xl font-semibold text-foreground mb-2">Página não encontrada</h2>
    <p class="text-muted-foreground max-w-sm mb-8">
      A página que você está procurando não existe ou foi movida para outro endereço.
    </p>

    <Button @click="goHome"> Voltar para minhas receitas </Button>
  </div>
</template>
