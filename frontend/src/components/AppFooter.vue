<script setup lang="ts">
import { Heart } from 'lucide-vue-next'
</script>

<template>
  <footer class="border-t border-border/40 mt-auto">
    <div class="mx-auto max-w-4xl px-4 py-6">
      <div
        class="flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-muted-foreground"
      >
        <div class="flex items-center gap-1.5">
          <span>RecipBot</span>
          <span class="text-border">•</span>
          <span>Seu caderno de receitas inteligente</span>
        </div>
        <div class="flex items-center gap-1">
          <span>Feito com</span>
          <Heart class="h-3 w-3 text-destructive fill-destructive" />
          <span>no Brasil</span>
        </div>
      </div>
    </div>
  </footer>
</template>
