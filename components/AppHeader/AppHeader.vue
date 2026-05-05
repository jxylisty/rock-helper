<template>
  <view class="app-header" :style="{ paddingTop: `${topInset}rpx` }">
    <view class="left" hover-class="touch-active" @click="onLeftClick">
      <text class="icon">{{ leftIcon }}</text>
    </view>
    <view class="center">
      <text class="title">{{ title }}</text>
      <text v-if="subtitle" class="subtitle">{{ subtitle }}</text>
    </view>
    <view v-if="$slots.right" class="right has-slot">
      <slot name="right"></slot>
    </view>
    <view v-else class="right"></view>
  </view>
</template>

<script>
import { safeBack } from '@/utils/nav.js'

export default {
  name: 'AppHeader',
  props: {
    title: { type: String, default: '' },
    subtitle: { type: String, default: '' },
    leftIcon: { type: String, default: '←' },
    leftAction: { type: String, default: 'back' }
  },
  data() {
    return {
      topInset: 18
    }
  },
  created() {
    try {
      const info = uni.getSystemInfoSync()
      const statusBarHeight = Number(info?.statusBarHeight || 0)
      if (statusBarHeight > 0) {
        this.topInset = Math.round(statusBarHeight * 2) + 12
      }
    } catch (error) {
      this.topInset = 18
    }
  },
  methods: {
    onLeftClick() {
      if (this.leftAction === 'menu') {
        this.$emit('menu')
        return
      }
      this.$emit('back')
      safeBack()
    }
  }
}
</script>

<style scoped>
.app-header {
  display: flex;
  align-items: center;
  gap: 16rpx;
  min-height: 96rpx;
  padding: 18rpx 24rpx 18rpx;
  background: rgba(18, 26, 48, 0.96);
  color: #fff;
  backdrop-filter: blur(12px);
  position: relative;
  z-index: 20;
}

.left {
  width: 72rpx;
  min-height: 72rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  border-radius: 18rpx;
  background: rgba(255, 255, 255, 0.08);
}

.right {
  min-width: 72rpx;
  min-height: 72rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  border-radius: 18rpx;
}

.right.has-slot {
  width: auto;
  justify-content: flex-end;
  background: transparent;
}

.icon {
  font-size: 36rpx;
  line-height: 1;
}

.center {
  flex: 1;
  min-width: 0;
}

.title {
  display: block;
  font-size: 34rpx;
  font-weight: 800;
}

.subtitle {
  display: block;
  margin-top: 4rpx;
  font-size: 20rpx;
  color: rgba(255, 255, 255, 0.72);
}

.touch-active {
  opacity: 0.78;
}
</style>
