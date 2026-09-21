<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { helpContent } from '@/content/help'

const router = useRouter()
const searchQuery = ref('')
const activeIndex = ref<number | null>(null)

const filteredContent = computed(() => {
  if (!searchQuery.value) return helpContent

  const query = searchQuery.value.toLowerCase()
  return helpContent.filter(item =>
    item.question.toLowerCase().includes(query) ||
    item.answer.toLowerCase().includes(query)
  )
})

const toggleItem = (index: number) => {
  activeIndex.value = activeIndex.value === index ? null : index
}

const goBack = () => {
  router.back()
}
</script>

<template>
  <div class="max-w-3xl mx-auto p-4">
    <div class="flex items-center mb-6">
      <button
        @click="goBack"
        class="mr-4 p-2 rounded-full hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
        aria-label="Voltar"
      >
        <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
        </svg>
      </button>
      <h1 class="text-2xl font-bold">Ajuda</h1>
    </div>

    <div class="mb-6">
      <label for="search" class="block text-sm font-medium text-gray-700 mb-1">Buscar perguntas</label>
      <input
        id="search"
        v-model="searchQuery"
        type="text"
        placeholder="Digite sua dúvida..."
        class="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
      />
    </div>

    <div class="space-y-4">
      <div v-for="(item, index) in filteredContent" :key="index" class="border-b border-gray-200">
        <button
          @click="toggleItem(index)"
          class="w-full text-left p-4 flex justify-between items-center focus:outline-none focus:ring-2 focus:ring-blue-500"
          :aria-expanded="activeIndex === index"
          :aria-controls="`faq-${index}`"
        >
          <span class="font-medium">{{ item.question }}</span>
          <svg
            xmlns="http://www.w3.org/2000/svg"
            class="h-5 w-5 transition-transform duration-200"
            :class="{ 'transform rotate-180': activeIndex === index }"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        <div
          v-show="activeIndex === index"
          :id="`faq-${index}`"
          class="p-4 pt-0 text-gray-700"
        >
          <p v-html="item.answer"></p>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.fade-enter-active, .fade-leave-active {
  transition: opacity 0.3s ease;
}

.fade-enter-from, .fade-leave-to {
  opacity: 0;
}
</style>
