import { computed, ref, watch, type Ref } from 'vue'

const STORAGE_PREFIX = 'recipbot:checklist:'

function load(recipeId: string): number[] {
  try {
    const raw = localStorage.getItem(STORAGE_PREFIX + recipeId)
    const parsed: unknown = raw ? JSON.parse(raw) : []
    return Array.isArray(parsed) ? parsed.filter((n): n is number => Number.isInteger(n)) : []
  } catch {
    return []
  }
}

function save(recipeId: string, indexes: number[]): void {
  try {
    if (indexes.length === 0) {
      localStorage.removeItem(STORAGE_PREFIX + recipeId)
    } else {
      localStorage.setItem(STORAGE_PREFIX + recipeId, JSON.stringify(indexes))
    }
  } catch {
    // Persisting the checklist is best-effort (private mode, quota).
  }
}

/**
 * "Mise en place" checklist for a recipe's ingredients. Checked lines are kept
 * per recipe in localStorage so progress survives a reload or a locked phone
 * mid-cooking. Indexes beyond the current ingredient count are ignored, so an
 * edited recipe never shows phantom checks.
 */
export function useIngredientChecklist(recipeId: string, ingredientCount: Ref<number>) {
  const checked = ref<Set<number>>(new Set(load(recipeId)))

  const validChecked = computed(
    () => new Set([...checked.value].filter((i) => i >= 0 && i < ingredientCount.value)),
  )

  const checkedCount = computed(() => validChecked.value.size)

  const progressLabel = computed(
    () => `${checkedCount.value} de ${ingredientCount.value} separados`,
  )

  function isChecked(index: number): boolean {
    return validChecked.value.has(index)
  }

  function toggle(index: number): void {
    const next = new Set(validChecked.value)
    if (next.has(index)) {
      next.delete(index)
    } else {
      next.add(index)
    }
    checked.value = next
  }

  function reset(): void {
    checked.value = new Set()
  }

  watch(validChecked, (value) =>
    save(
      recipeId,
      [...value].sort((a, b) => a - b),
    ),
  )

  return { isChecked, toggle, reset, checkedCount, progressLabel }
}
