<script setup lang="ts">
import { ref } from 'vue'
import { PenLine, Link as LinkIcon, Loader2, Save, DownloadCloud, X } from 'lucide-vue-next'

import type { FromUrlInput, Recipe, RecipeFormInput } from '@/types'
import Card from './ui/Card.vue'
import CardContent from './ui/CardContent.vue'
import Input from './ui/Input.vue'
import Label from './ui/Label.vue'
import Button from './ui/Button.vue'
import { cn } from '@/utils/cn'

const props = withDefaults(
  defineProps<{
    recipe?: Recipe | null
    loading?: boolean
  }>(),
  { recipe: null, loading: false },
)

const emit = defineEmits<{
  submit: [input: RecipeFormInput]
  submitFromUrl: [input: FromUrlInput]
}>()

const mode = ref<'manual' | 'url'>('manual')

const title = ref(props.recipe?.title ?? '')
const ingredientsText = ref(props.recipe?.ingredients?.join('\n') ?? '')
const instructionsText = ref(props.recipe?.instructions?.join('\n') ?? '')
const sourceUrl = ref(props.recipe?.source_url ?? '')
const importUrl = ref('')

// Tag Chips Logic
const tags = ref<string[]>(props.recipe?.tags ? [...props.recipe.tags] : [])
const tagInput = ref('')

function handleTagInput(e: KeyboardEvent) {
  if (e.key === ',' || e.key === 'Enter') {
    e.preventDefault()
    addTag()
  } else if (e.key === 'Backspace' && tagInput.value === '') {
    tags.value.pop()
  }
}

function addTag() {
  const val = tagInput.value.trim().replace(/,/g, '')
  if (val && !tags.value.includes(val)) {
    tags.value.push(val)
  }
  tagInput.value = ''
}

function removeTag(index: number) {
  tags.value.splice(index, 1)
}

function parseLines(text: string): string[] {
  return text
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
}

function handleManualSubmit() {
  // force add any pending tag before submit
  if (tagInput.value) addTag()

  emit('submit', {
    title: title.value,
    ingredients: parseLines(ingredientsText.value),
    instructions: parseLines(instructionsText.value),
    tags: tags.value,
    source_url: sourceUrl.value || null,
  })
}

function handleUrlSubmit() {
  if (tagInput.value) addTag()

  emit('submitFromUrl', {
    url: importUrl.value,
    tags: tags.value,
  })
}

const textareaClass =
  'flex min-h-[120px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 transition-shadow'
</script>

<template>
  <Card class="border-border/50 shadow-sm animate-in fade-in slide-in-from-bottom-4 duration-500">
    <div v-if="!props.recipe" class="flex border-b border-border/50">
      <button
        type="button"
        class="flex flex-1 items-center justify-center gap-2 py-4 text-sm font-medium transition-colors"
        :class="
          mode === 'manual'
            ? 'border-b-2 border-primary text-primary'
            : 'text-muted-foreground hover:text-foreground hover:bg-muted/30'
        "
        @click="mode = 'manual'"
      >
        <PenLine class="h-4 w-4" />
        Entrada Manual
      </button>
      <button
        type="button"
        class="flex flex-1 items-center justify-center gap-2 py-4 text-sm font-medium transition-colors"
        :class="
          mode === 'url'
            ? 'border-b-2 border-primary text-primary'
            : 'text-muted-foreground hover:text-foreground hover:bg-muted/30'
        "
        @click="mode = 'url'"
      >
        <LinkIcon class="h-4 w-4" />
        Importar de URL
      </button>
    </div>

    <CardContent class="pt-6">
      <form v-if="mode === 'manual'" class="space-y-6" @submit.prevent="handleManualSubmit">
        <div class="space-y-2">
          <Label for="title">Título</Label>
          <Input
            id="title"
            v-model="title"
            type="text"
            required
            minlength="3"
            placeholder="ex: Bolo de Cenoura com Chocolate"
          />
        </div>
        <div class="space-y-2">
          <Label for="ingredients">Ingredientes (um por linha)</Label>
          <textarea
            id="ingredients"
            v-model="ingredientsText"
            required
            rows="6"
            :class="cn(textareaClass)"
            placeholder="2 xícaras de farinha&#10;1 xícara de açúcar&#10;..."
          />
        </div>
        <div class="space-y-2">
          <Label for="instructions">Modo de Preparo (um passo por linha)</Label>
          <textarea
            id="instructions"
            v-model="instructionsText"
            rows="6"
            :class="cn(textareaClass)"
            placeholder="Pré-aqueça o forno a 180°C&#10;Misture os ingredientes secos&#10;..."
          />
        </div>

        <!-- Tags Input -->
        <div class="space-y-2">
          <Label for="tags">Tags (pressione vírgula ou Enter para adicionar)</Label>
          <div
            class="flex flex-wrap items-center gap-2 p-2 rounded-md border border-input bg-background focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2 min-h-[44px] transition-shadow"
          >
            <span
              v-for="(tag, index) in tags"
              :key="tag"
              class="inline-flex items-center gap-1 rounded-full bg-primary/15 text-primary px-2.5 py-1 text-sm font-medium animate-in zoom-in duration-200"
            >
              {{ tag }}
              <button
                type="button"
                class="hover:bg-primary/20 rounded-full p-0.5 transition-colors focus:outline-none"
                @click="removeTag(index)"
              >
                <X class="h-3 w-3" />
              </button>
            </span>
            <input
              id="tags"
              v-model="tagInput"
              type="text"
              class="flex-1 bg-transparent min-w-[120px] outline-none text-sm placeholder:text-muted-foreground"
              placeholder="Adicionar tag..."
              @keydown="handleTagInput"
              @blur="addTag"
            />
          </div>
        </div>

        <div class="pt-2">
          <Button type="submit" :disabled="props.loading" class="w-full sm:w-auto">
            <Loader2 v-if="props.loading" class="mr-2 h-4 w-4 animate-spin" />
            <Save v-else class="mr-2 h-4 w-4" />
            {{ props.recipe ? 'Salvar alterações' : 'Criar receita' }}
          </Button>
        </div>
      </form>

      <form v-else class="space-y-6" @submit.prevent="handleUrlSubmit">
        <div class="space-y-2">
          <Label for="url">URL da Receita</Label>
          <div class="relative">
            <LinkIcon
              class="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
            />
            <Input
              id="url"
              v-model="importUrl"
              type="url"
              required
              class="pl-9"
              placeholder="https://www.tudogostoso.com.br/receita/..."
            />
          </div>
          <p class="text-xs text-muted-foreground mt-1.5 flex items-center">
            <span class="inline-block w-1.5 h-1.5 rounded-full bg-primary/60 mr-1.5"></span>
            Suporta tudogostoso.com.br, cybercook.com.br, e receitas.globo.com
          </p>
        </div>

        <!-- Tags Input for URL -->
        <div class="space-y-2">
          <Label for="import-tags">Tags (pressione vírgula ou Enter para adicionar)</Label>
          <div
            class="flex flex-wrap items-center gap-2 p-2 rounded-md border border-input bg-background focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2 min-h-[44px] transition-shadow"
          >
            <span
              v-for="(tag, index) in tags"
              :key="tag"
              class="inline-flex items-center gap-1 rounded-full bg-primary/15 text-primary px-2.5 py-1 text-sm font-medium animate-in zoom-in duration-200"
            >
              {{ tag }}
              <button
                type="button"
                class="hover:bg-primary/20 rounded-full p-0.5 transition-colors focus:outline-none"
                @click="removeTag(index)"
              >
                <X class="h-3 w-3" />
              </button>
            </span>
            <input
              id="import-tags"
              v-model="tagInput"
              type="text"
              class="flex-1 bg-transparent min-w-[120px] outline-none text-sm placeholder:text-muted-foreground"
              placeholder="Adicionar tag..."
              @keydown="handleTagInput"
              @blur="addTag"
            />
          </div>
        </div>

        <div class="pt-2">
          <Button type="submit" :disabled="props.loading" class="w-full sm:w-auto">
            <Loader2 v-if="props.loading" class="mr-2 h-4 w-4 animate-spin" />
            <DownloadCloud v-else class="mr-2 h-4 w-4" />
            Importar receita
          </Button>
        </div>
      </form>
    </CardContent>
  </Card>
</template>
