<script setup lang="ts">
import { Heart } from 'lucide-vue-next'

const year = new Date().getFullYear()
</script>

<template>
  <footer class="border-t border-border/40 mt-auto">
    <div class="mx-auto max-w-4xl px-4 py-6">
      <div
        class="flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-muted-foreground"
      >
        <div class="flex flex-wrap items-center justify-center gap-x-1.5 gap-y-1">
          <span>© {{ year }} RecipBot</span>
          <span class="text-border">•</span>
          <span>Seu caderno de receitas inteligente</span>
        </div>

        <nav class="flex items-center gap-4">
          <RouterLink to="/" class="transition-colors hover:text-foreground"> Receitas </RouterLink>
          <RouterLink to="/help" class="transition-colors hover:text-foreground">
            Ajuda
          </RouterLink>
        </nav>

        <div class="flex items-center gap-1">
          <span>Feito com</span>
          <Heart class="h-3 w-3 text-destructive fill-destructive" />
          <span>no Brasil</span>
        </div>
      </div>
    </div>
  </footer>
</template>
