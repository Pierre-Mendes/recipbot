<script setup lang="ts">
import { ref, watch, nextTick } from 'vue'
import { Plus, X, ArrowUp, ArrowDown, ClipboardPaste } from 'lucide-vue-next'

import Button from './ui/Button.vue'
import Label from './ui/Label.vue'
import { cn } from '@/utils/cn'

const props = withDefaults(
  defineProps<{
    modelValue: string[]
    label: string
    /** Singular noun for the add button / placeholder, e.g. "ingrediente". */
    itemLabel: string
    /** When true, each row shows its 1-based position (steps); the UI owns the number. */
    ordered?: boolean
    maxItems?: number
    maxLength?: number
  }>(),
  { ordered: false, maxItems: 50, maxLength: 1000 },
)

const emit = defineEmits<{
  'update:modelValue': [value: string[]]
}>()

// Internal working rows. We keep empty rows the user is mid-typing (which the
// emitted value omits), so the list always has at least one editable row.
const rows = ref<string[]>(props.modelValue.length ? [...props.modelValue] : [''])
const inputs = ref<HTMLInputElement[]>([])

// Bulk-paste escape hatch: paste a whole list, one item per line.
const bulkMode = ref(false)
const bulkText = ref('')

let lastEmitted = clean(rows.value)

function clean(list: string[]): string[] {
  return list.map((r) => r.trim()).filter((r) => r !== '')
}

function sync() {
  const cleaned = clean(rows.value)
  lastEmitted = cleaned
  emit('update:modelValue', cleaned)
}

// Re-seed rows when the bound value changes from OUTSIDE (edit load, import
// review rehydrate, discard). Ignore the echo of our own emit.
watch(
  () => props.modelValue,
  (value) => {
    if (JSON.stringify(value) === JSON.stringify(lastEmitted)) {
      return
    }
    rows.value = value.length ? [...value] : ['']
    lastEmitted = clean(rows.value)
  },
)

function updateRow(index: number, value: string) {
  rows.value[index] = value
  sync()
}

function addRow() {
  if (rows.value.length >= props.maxItems) {
    return
  }
  rows.value.push('')
  void nextTick(() => {
    inputs.value[rows.value.length - 1]?.focus()
  })
}

function removeRow(index: number) {
  rows.value.splice(index, 1)
  if (rows.value.length === 0) {
    rows.value.push('')
  }
  sync()
}

function move(index: number, delta: number) {
  const target = index + delta
  if (target < 0 || target >= rows.value.length) {
    return
  }
  const [item] = rows.value.splice(index, 1)
  rows.value.splice(target, 0, item)
  sync()
}

// Enter on a row adds the next one (fast keyboard entry), like the tag input.
function onEnter(index: number, event: KeyboardEvent) {
  event.preventDefault()
  if (index === rows.value.length - 1) {
    addRow()
  } else {
    inputs.value[index + 1]?.focus()
  }
}

function openBulk() {
  bulkText.value = clean(rows.value).join('\n')
  bulkMode.value = true
}

function applyBulk() {
  const items = bulkText.value
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean)
    .slice(0, props.maxItems)
  rows.value = items.length ? items : ['']
  bulkMode.value = false
  sync()
}

const inputClass =
  'flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 transition-shadow'
const iconBtnClass =
  'flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/50 disabled:opacity-30 disabled:pointer-events-none transition-colors'
</script>

<template>
  <div class="space-y-2">
    <div class="flex items-center justify-between">
      <Label>{{ label }}</Label>
      <button
        type="button"
        class="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
        @click="bulkMode ? (bulkMode = false) : openBulk()"
      >
        <ClipboardPaste class="h-3.5 w-3.5" />
        {{ bulkMode ? 'Voltar à lista' : 'Colar em massa' }}
      </button>
    </div>

    <!-- Bulk paste mode -->
    <div v-if="bulkMode" class="space-y-2">
      <textarea
        v-model="bulkText"
        rows="6"
        :class="cn(inputClass, 'min-h-[120px] py-2')"
        :placeholder="`Um ${itemLabel} por linha...`"
      />
      <Button type="button" size="sm" variant="secondary" @click="applyBulk">
        Aplicar lista
      </Button>
    </div>

    <!-- Structured rows -->
    <template v-else>
      <ul class="space-y-2">
        <li v-for="(row, index) in rows" :key="index" class="flex items-center gap-2">
          <span
            v-if="ordered"
            class="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/15 text-xs font-semibold text-primary tabular-nums"
          >
            {{ index + 1 }}
          </span>
          <input
            :ref="
              (el) => {
                if (el) inputs[index] = el as HTMLInputElement
              }
            "
            :value="row"
            type="text"
            :maxlength="maxLength"
            :aria-label="`${itemLabel} ${index + 1}`"
            :class="cn(inputClass)"
            :placeholder="`${itemLabel}...`"
            @input="updateRow(index, ($event.target as HTMLInputElement).value)"
            @keydown.enter="onEnter(index, $event)"
          />
          <button
            type="button"
            :class="iconBtnClass"
            :disabled="index === 0"
            :aria-label="`Mover ${itemLabel} ${index + 1} para cima`"
            @click="move(index, -1)"
          >
            <ArrowUp class="h-4 w-4" />
          </button>
          <button
            type="button"
            :class="iconBtnClass"
            :disabled="index === rows.length - 1"
            :aria-label="`Mover ${itemLabel} ${index + 1} para baixo`"
            @click="move(index, 1)"
          >
            <ArrowDown class="h-4 w-4" />
          </button>
          <button
            type="button"
            :class="iconBtnClass"
            :aria-label="`Remover ${itemLabel} ${index + 1}`"
            @click="removeRow(index)"
          >
            <X class="h-4 w-4" />
          </button>
        </li>
      </ul>

      <Button
        type="button"
        variant="ghost"
        size="sm"
        class="text-muted-foreground"
        :disabled="rows.length >= maxItems"
        @click="addRow"
      >
        <Plus class="mr-1.5 h-4 w-4" />
        Adicionar {{ itemLabel }}
      </Button>
    </template>
  </div>
</template>
