<script setup lang="ts">
import { AlertTriangle, Trash2 } from 'lucide-vue-next'
import { useConfirmDialog } from '@/composables/useConfirmDialog'
import Button from './Button.vue'

const { isOpen, options, handleConfirm, handleCancel } = useConfirmDialog()
</script>

<template>
  <Teleport to="body">
    <Transition
      enter-active-class="transition-all duration-200 ease-out"
      leave-active-class="transition-all duration-150 ease-in"
      enter-from-class="opacity-0"
      enter-to-class="opacity-100"
      leave-from-class="opacity-100"
      leave-to-class="opacity-0"
    >
      <div
        v-if="isOpen"
        class="fixed inset-0 z-[90] flex items-center justify-center p-4"
      >
        <!-- Backdrop -->
        <div class="absolute inset-0 bg-black/50 backdrop-blur-sm" @click="handleCancel" />
        
        <!-- Dialog -->
        <div class="relative bg-card rounded-xl border border-border shadow-2xl max-w-sm w-full animate-in fade-in zoom-in-95 duration-200">
          <div class="p-6">
            <div class="flex items-center gap-3 mb-4">
              <div
                :class="[
                  'flex h-10 w-10 shrink-0 items-center justify-center rounded-full',
                  options.variant === 'destructive'
                    ? 'bg-destructive/15 text-destructive'
                    : 'bg-primary/15 text-primary',
                ]"
              >
                <AlertTriangle v-if="options.variant === 'destructive'" class="h-5 w-5" />
                <Trash2 v-else class="h-5 w-5" />
              </div>
              <h3 class="text-lg font-semibold text-foreground">{{ options.title }}</h3>
            </div>
            <p class="text-sm text-muted-foreground ml-[52px]">
              {{ options.message }}
            </p>
          </div>
          <div class="flex justify-end gap-3 border-t border-border p-4 bg-muted/30 rounded-b-xl">
            <Button variant="outline" size="sm" @click="handleCancel">
              {{ options.cancelLabel || 'Cancelar' }}
            </Button>
            <Button
              :variant="options.variant === 'destructive' ? 'destructive' : 'default'"
              size="sm"
              @click="handleConfirm"
            >
              {{ options.confirmLabel || 'Confirmar' }}
            </Button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>
