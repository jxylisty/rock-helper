<template>
  <view class="badge" :class="{ compact }" :style="badgeStyle">
    <RemoteImage class="icon" :src="iconSrc" mode="aspectFit" />
    <text v-if="!compact && label" class="text">{{ label }}</text>
  </view>
</template>

<script>
import { normalizeAttr } from '@/data/config/game_math.js'
import { getAttrIconName } from '@/data/config/typeChart.js'
import { resolveAssetPath } from '@/utils/asset-path.js'

function tint(color, alpha) {
  const hex = String(color || '').replace('#', '')
  if (hex.length !== 6 && hex.length !== 3) return 'rgba(44, 58, 47, 0.04)'
  const full = hex.length === 3 ? hex.split('').map((c) => c + c).join('') : hex
  const r = parseInt(full.slice(0, 2), 16)
  const g = parseInt(full.slice(2, 4), 16)
  const b = parseInt(full.slice(4, 6), 16)
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}

export default {
  name: 'TypeBadge',
  props: {
    label: { type: String, default: '' },
    color: { type: String, default: '#6b7cff' },
    compact: { type: Boolean, default: false }
  },
  computed: {
    iconSrc() {
      const type = normalizeAttr(this.label) || this.label || '普通'
      return resolveAssetPath(`/static/icons/${getAttrIconName(type)}.webp`)
    },
    badgeStyle() {
      return {
        background: tint(this.color, 0.08),
        borderColor: this.color,
        boxShadow: `0 1.5px 0 ${tint(this.color, 0.28)}`
      }
    }
  }
}
</script>

<style scoped>
.badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6rpx;
  min-height: 38rpx;
  padding: 4rpx 10rpx;
  border-radius: 9rpx;
  background: #FFFDF7;
  color: #64748B;
  border: 1.5px solid #E3DCC8;
  box-sizing: border-box;
}

.badge.compact {
  min-width: 38rpx;
  padding: 4rpx;
}

.icon {
  width: 22rpx;
  height: 22rpx;
  flex-shrink: 0;
}

.badge.compact .icon {
  width: 24rpx;
  height: 24rpx;
}

.text {
  font-size: 18rpx;
  font-weight: 700;
  color: #2C3A2F;
}
</style>