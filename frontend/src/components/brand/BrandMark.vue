<script setup lang="ts">
/**
 * RecipBot logo mark: the head of Bit, the chef robot mascot.
 * The tile follows the `primary` token (basil in light, light basil in dark);
 * the face keeps fixed brand colors. Ears are dropped below 24px.
 * Decorative by default; pass `label` when the mark stands alone.
 */
withDefaults(defineProps<{ size?: number; label?: string }>(), { size: 36, label: undefined })
</script>

<template>
  <svg
    :width="size"
    :height="size"
    viewBox="0 0 48 48"
    :role="label ? 'img' : undefined"
    :aria-label="label"
    :aria-hidden="label ? undefined : 'true'"
  >
    <rect width="48" height="48" rx="12" class="fill-primary" />
    <g fill="#FBFAF7">
      <circle cx="17" cy="13.5" r="5.5" />
      <circle cx="24" cy="10.5" r="6.5" />
      <circle cx="31" cy="13.5" r="5.5" />
      <rect x="15" y="13" width="18" height="6" rx="1.5" />
      <template v-if="size >= 24">
        <rect x="8.5" y="27" width="3" height="7" rx="1.5" />
        <rect x="36.5" y="27" width="3" height="7" rx="1.5" />
      </template>
      <rect x="11" y="21" width="26" height="19" rx="6" />
    </g>
    <rect x="14.5" y="24.5" width="19" height="11" rx="4" fill="#1C1B19" />
    <circle cx="20" cy="29.5" r="2.1" fill="#7DBB84" />
    <circle cx="28" cy="29.5" r="2.1" fill="#7DBB84" />
  </svg>
</template>
