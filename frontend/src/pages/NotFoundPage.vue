<script setup lang="ts">
import { useRouter } from 'vue-router'
import { ChefHat } from 'lucide-vue-next'
import Button from '@/components/ui/Button.vue'

const router = useRouter()

function goHome() {
  router.push({ name: 'recipes' })
}
</script>

<template>
  <div class="flex flex-col items-center justify-center py-20 text-center animate-in fade-in zoom-in-95 duration-500">
    <div class="relative mb-8">
      <div class="flex h-24 w-24 items-center justify-center rounded-3xl bg-muted/50 border-2 border-dashed border-border">
        <ChefHat class="h-12 w-12 text-muted-foreground/40" />
      </div>
      <div class="absolute -top-2 -right-2 flex h-10 w-10 items-center justify-center rounded-full bg-destructive/10 text-destructive text-lg font-bold border border-destructive/20">
        ?
      </div>
    </div>
    
    <h1 class="text-4xl font-bold tracking-tight text-foreground mb-2">404</h1>
    <h2 class="text-xl font-semibold text-foreground mb-2">Página não encontrada</h2>
    <p class="text-muted-foreground max-w-sm mb-8">
      A página que você está procurando não existe ou foi movida para outro endereço.
    </p>
    
    <Button @click="goHome" class="shadow-md">
      Voltar para minhas receitas
    </Button>
  </div>
</template>
