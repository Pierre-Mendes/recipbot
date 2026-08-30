import { ref, watch } from 'vue'

const STORAGE_KEY = 'recipbot-theme'

const isDark = ref(false)

function applyTheme(dark: boolean) {
  document.documentElement.classList.toggle('dark', dark)
}

/** Stored preference wins; otherwise fall back to the OS setting. */
function resolveInitialTheme(): boolean {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored === 'dark' || stored === 'light') return stored === 'dark'
  } catch {
    /* localStorage unavailable */
  }
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ?? false
}

// Initialize once, at module load, so the theme is applied before Vue paints
// (avoids a flash) and the watcher below is registered a single time even
// though useDarkMode() is called from several components.
isDark.value = resolveInitialTheme()
applyTheme(isDark.value)

watch(isDark, (val) => {
  applyTheme(val)
  try {
    localStorage.setItem(STORAGE_KEY, val ? 'dark' : 'light')
  } catch {
    /* ignore persistence failures */
  }
})

export function useDarkMode() {
  function toggle() {
    isDark.value = !isDark.value
  }

  return { isDark, toggle }
}
