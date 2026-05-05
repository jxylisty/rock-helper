<template>
  <view class="badge" :class="{ compact }" :style="badgeStyle">
    <RemoteImage class="icon" :src="iconSrc" mode="aspectFit" />
    <text v-if="!compact && label" class="text">{{ label }}</text>
  </view>
</template>

<script>
import { normalizeAttr } from '@/data/game_math.js'
import { resolveAssetPath } from '@/utils/asset-path.js'

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
      return resolveAssetPath(`/static/icons/${type}.png`)
    },
    badgeStyle() {
      return {
        background: this.compact ? 'rgba(255, 255, 255, 0.95)' : 'rgba(255, 255, 255, 0.9)',
        borderColor: this.color
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
  gap: 8rpx;
  min-height: 46rpx;
  padding: 6rpx 12rpx;
  border-radius: 999rpx;
  border: 1rpx solid rgba(91, 124, 245, 0.18);
  color: #1c2748;
}

.badge.compact {
  min-width: 46rpx;
  padding: 6rpx;
}

.icon {
  width: 26rpx;
  height: 26rpx;
  flex-shrink: 0;
}

.badge.compact .icon {
  width: 28rpx;
  height: 28rpx;
}

.text {
  font-size: 20rpx;
  font-weight: 700;
}
</style>
