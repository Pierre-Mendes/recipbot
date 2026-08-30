import { defineStore } from 'pinia'
import { ref } from 'vue'

interface AppNotification {
  id: number
  message: string
  level: 'error' | 'info'
}

export const useUiStore = defineStore('ui', () => {
  const notifications = ref<AppNotification[]>([])
  let nextId = 1

  function notify(message: string, level: 'error' | 'info' = 'info'): void {
    const id = nextId++
    notifications.value.push({ id, message, level })
    window.setTimeout(() => removeNotification(id), 5000)
  }

  function removeNotification(id: number): void {
    notifications.value = notifications.value.filter((notification) => notification.id !== id)
  }

  return {
    notifications,
    notify,
    removeNotification,
  }
})
