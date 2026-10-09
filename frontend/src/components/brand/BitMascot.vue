<script setup lang="ts">
import { computed } from 'vue'

/**
 * Bit, the RecipBot chef robot. One illustration, four poses:
 * - hello: welcome, login, sign-up
 * - cooking: loading and importing
 * - thinking: empty lists and searches without results
 * - oops: errors and not-found pages
 * Illustration colors are fixed brand values (docs/DESIGN-SYSTEM.md § Marca).
 */
export type BitPose = 'hello' | 'cooking' | 'thinking' | 'oops'

interface PoseShape {
  label: string
  happyEyes: boolean
  eyes: { lx: number; rx: number; y: number }
  mouth: string
  leftArm: string
  leftHand: [number, number]
  rightArm: string
  rightHand: [number, number]
  spoon: boolean
  sweat: boolean
}

const props = withDefaults(
  defineProps<{ pose?: BitPose; size?: number; decorative?: boolean; animated?: boolean }>(),
  {
    pose: 'hello',
    size: 160,
    decorative: true,
    animated: false,
  },
)

const RESTING_LEFT_ARM = 'M64 172 Q48 186 50 204'

const POSES: Record<BitPose, PoseShape> = {
  hello: {
    label: 'Bit, o robô chef, acenando',
    happyEyes: true,
    eyes: { lx: 86, rx: 114, y: 112 },
    mouth: 'M90 123 Q100 131 110 123',
    leftArm: RESTING_LEFT_ARM,
    leftHand: [50, 206],
    rightArm: 'M136 170 Q160 160 164 128',
    rightHand: [164, 124],
    spoon: false,
    sweat: false,
  },
  cooking: {
    label: 'Bit, o robô chef, mexendo uma colher de pau',
    happyEyes: false,
    eyes: { lx: 86, rx: 114, y: 112 },
    mouth: 'M92 124 Q100 129 108 124',
    leftArm: RESTING_LEFT_ARM,
    leftHand: [50, 206],
    rightArm: 'M136 174 Q154 180 160 196',
    rightHand: [160, 196],
    spoon: true,
    sweat: false,
  },
  thinking: {
    label: 'Bit, o robô chef, pensativo',
    happyEyes: false,
    eyes: { lx: 90, rx: 118, y: 106 },
    mouth: 'M94 125 H108',
    leftArm: 'M64 174 Q40 168 56 142',
    leftHand: [58, 140],
    rightArm: 'M136 172 Q152 186 150 204',
    rightHand: [150, 206],
    spoon: false,
    sweat: false,
  },
  oops: {
    label: 'Bit, o robô chef, preocupado',
    happyEyes: false,
    eyes: { lx: 86, rx: 114, y: 112 },
    mouth: 'M90 127 Q100 119 110 127',
    leftArm: 'M64 172 Q46 160 44 140',
    leftHand: [44, 136],
    rightArm: 'M136 172 Q154 160 156 140',
    rightHand: [156, 136],
    spoon: false,
    sweat: true,
  },
}

const shape = computed(() => POSES[props.pose])
</script>

<template>
  <svg
    :width="size"
    :height="(size * 240) / 200"
    viewBox="0 0 200 240"
    :role="decorative ? undefined : 'img'"
    :aria-label="decorative ? undefined : shape.label"
    :aria-hidden="decorative ? 'true' : undefined"
    :data-pose="pose"
    stroke-linecap="round"
    stroke-linejoin="round"
  >
    <ellipse cx="100" cy="230" rx="54" ry="6" fill="#1C1B19" opacity="0.12" />

    <!-- Arms: dark outline stroke under a lighter stroke -->
    <path :d="shape.leftArm" fill="none" stroke="#1C1B19" stroke-width="14" />
    <path :d="shape.leftArm" fill="none" stroke="#A9A291" stroke-width="8" />
    <circle
      :cx="shape.leftHand[0]"
      :cy="shape.leftHand[1]"
      r="10"
      fill="#E7E3D9"
      stroke="#1C1B19"
      stroke-width="3"
    />
    <path :d="shape.rightArm" fill="none" stroke="#1C1B19" stroke-width="14" />
    <path :d="shape.rightArm" fill="none" stroke="#A9A291" stroke-width="8" />
    <g v-if="shape.spoon" :class="{ 'bit-stir': animated }">
      <line x1="160" y1="196" x2="180" y2="146" stroke="#1C1B19" stroke-width="9" />
      <line x1="160" y1="196" x2="180" y2="146" stroke="#C9931E" stroke-width="4" />
      <ellipse
        cx="183"
        cy="137"
        rx="8"
        ry="11"
        fill="#C9931E"
        stroke="#1C1B19"
        stroke-width="3"
        transform="rotate(22 183 137)"
      />
    </g>
    <circle
      :cx="shape.rightHand[0]"
      :cy="shape.rightHand[1]"
      r="10"
      fill="#E7E3D9"
      stroke="#1C1B19"
      stroke-width="3"
    />

    <!-- Legs and body with apron and paprika kerchief -->
    <rect
      x="76"
      y="210"
      width="18"
      height="18"
      rx="6"
      fill="#423E35"
      stroke="#1C1B19"
      stroke-width="3"
    />
    <rect
      x="106"
      y="210"
      width="18"
      height="18"
      rx="6"
      fill="#423E35"
      stroke="#1C1B19"
      stroke-width="3"
    />
    <rect
      x="62"
      y="152"
      width="76"
      height="64"
      rx="20"
      fill="#E7E3D9"
      stroke="#1C1B19"
      stroke-width="3"
    />
    <path
      d="M76 166 H124 V200 Q124 208 116 208 H84 Q76 208 76 200 Z"
      fill="#2F6B3B"
      stroke="#1C1B19"
      stroke-width="3"
    />
    <rect x="89" y="184" width="22" height="12" rx="4" fill="#234F2C" />
    <path d="M84 152 L100 168 L116 152 Z" fill="#C2461E" stroke="#1C1B19" stroke-width="3" />

    <!-- Ears -->
    <rect
      x="42"
      y="98"
      width="14"
      height="28"
      rx="7"
      fill="#2F6B3B"
      stroke="#1C1B19"
      stroke-width="3"
    />
    <rect
      x="144"
      y="98"
      width="14"
      height="28"
      rx="7"
      fill="#2F6B3B"
      stroke="#1C1B19"
      stroke-width="3"
    />

    <!-- Chef hat: outlined circles, then unstroked fills to hide inner arcs -->
    <g stroke="#1C1B19" stroke-width="6" fill="#FFFFFF">
      <circle cx="72" cy="50" r="22" />
      <circle cx="100" cy="38" r="26" />
      <circle cx="128" cy="50" r="22" />
    </g>
    <g fill="#FFFFFF">
      <circle cx="72" cy="50" r="22" />
      <circle cx="100" cy="38" r="26" />
      <circle cx="128" cy="50" r="22" />
    </g>
    <rect
      x="68"
      y="52"
      width="64"
      height="24"
      rx="5"
      fill="#FFFFFF"
      stroke="#1C1B19"
      stroke-width="3"
    />

    <!-- Head and visor -->
    <rect
      x="52"
      y="76"
      width="96"
      height="74"
      rx="24"
      fill="#E7E3D9"
      stroke="#1C1B19"
      stroke-width="3"
    />
    <rect x="64" y="90" width="72" height="46" rx="15" fill="#1C1B19" />
    <path
      v-if="shape.happyEyes"
      d="M79 112 Q86 102 93 112 M107 112 Q114 102 121 112"
      fill="none"
      stroke="#7DBB84"
      stroke-width="4.5"
    />
    <g v-else fill="#7DBB84">
      <circle :cx="shape.eyes.lx" :cy="shape.eyes.y" r="6.5" />
      <circle :cx="shape.eyes.rx" :cy="shape.eyes.y" r="6.5" />
    </g>
    <path :d="shape.mouth" fill="none" stroke="#7DBB84" stroke-width="4" />
    <path
      v-if="shape.sweat"
      d="M156 78 Q162 88 156 92 Q150 88 156 78 Z"
      fill="#9CC7E8"
      stroke="#1C1B19"
      stroke-width="2"
    />
  </svg>
</template>

<style scoped>
/* Cooking pose: the spoon stirs around Bit's hand. Off for reduced motion. */
.bit-stir {
  transform-box: view-box;
  transform-origin: 160px 196px;
  animation: bit-stir 1.2s ease-in-out infinite alternate;
}

@keyframes bit-stir {
  from {
    transform: rotate(-12deg);
  }
  to {
    transform: rotate(10deg);
  }
}

@media (prefers-reduced-motion: reduce) {
  .bit-stir {
    animation: none;
  }
}
</style>
