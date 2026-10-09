<script setup lang="ts">
import { CheckCircle2, XCircle, Info, X } from 'lucide-vue-next'
import { useToast } from '@/composables/useToast'

const { toasts, removeToast } = useToast()

const icons = {
  success: CheckCircle2,
  error: XCircle,
  info: Info,
}

const variantClasses = {
  success: 'border-primary/30 bg-secondary text-secondary-foreground',
  error: 'border-destructive/30 bg-card text-destructive',
  info: 'border-border bg-card text-foreground',
}
</script>

<template>
  <Teleport to="body">
    <div
      class="fixed bottom-4 right-4 z-[100] flex flex-col gap-2 max-w-sm w-full pointer-events-none"
    >
      <TransitionGroup
        enter-active-class="transition-all duration-300 ease-out"
        leave-active-class="transition-all duration-200 ease-in"
        enter-from-class="translate-x-full opacity-0 scale-95"
        enter-to-class="translate-x-0 opacity-100 scale-100"
        leave-from-class="translate-x-0 opacity-100 scale-100"
        leave-to-class="translate-x-full opacity-0 scale-95"
        move-class="transition-all duration-300"
      >
        <div
          v-for="toast in toasts"
          :key="toast.id"
          :class="[
            'pointer-events-auto flex items-start gap-3 rounded-lg border px-4 py-3 shadow-lg',
            variantClasses[toast.variant],
          ]"
        >
          <component :is="icons[toast.variant]" class="h-5 w-5 mt-0.5 shrink-0" />
          <p class="text-sm font-medium flex-1">{{ toast.message }}</p>
          <button
            type="button"
            aria-label="Fechar notificação"
            class="shrink-0 rounded-full p-1 hover:bg-foreground/10 transition-colors"
            @click="removeToast(toast.id)"
          >
            <X class="h-4 w-4" />
          </button>
        </div>
      </TransitionGroup>
    </div>
  </Teleport>
</template>
