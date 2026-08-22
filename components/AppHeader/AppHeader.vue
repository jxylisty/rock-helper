<template>
  <view
    class="app-header"
    :class="[`theme-${theme}`, { 'theme-color': isColorTheme }]"
    :style="[{ paddingTop: `${topInset}rpx` }, headerStyle]"
  >
    <view class="bar-row">
      <view class="left" hover-class="touch-active" @click="onLeftClick">
        <AppIcon
          :name="leftAction === 'menu' ? 'menu' : 'chevron-left'"
          :size="19"
          :color="isColorTheme ? '#FFFFFF' : '#64748B'"
          :stroke-width="2.2"
        />
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
    <slot name="hero"></slot>
  </view>
</template>

<script>
import { safeBack } from '@/utils/nav.js'
import AppIcon from '@/components/AppIcon/AppIcon.vue'

const COLOR_THEMES = ['green', 'gold', 'blue', 'red']

export default {
  name: 'AppHeader',
  components: { AppIcon },
  props: {
    title: { type: String, default: '' },
    subtitle: { type: String, default: '' },
    leftAction: { type: String, default: 'back' },
    theme: { type: String, default: 'plain' },
    background: { type: String, default: '' }
  },
  data() {
    return {
      topInset: 18
    }
  },
  computed: {
    isColorTheme() {
      return COLOR_THEMES.includes(this.theme) || !!this.background
    },
    headerStyle() {
      return this.background ? { background: this.background } : null
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
  flex-direction: column;
  min-height: 80rpx;
  padding: 18rpx 16rpx 12rpx;
  background: #FFFFFF;
  border-bottom: 1px solid #E2E8F0;
  color: #1E293B;
  position: relative;
  z-index: 20;
}

.bar-row {
  display: flex;
  align-items: center;
  gap: 12rpx;
  width: 100%;
}

.left {
  width: 56rpx;
  min-height: 56rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  border-radius: 8rpx;
  background: #F8FAFC;
}

.right {
  min-width: 56rpx;
  min-height: 56rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  border-radius: 8rpx;
}

.right.has-slot {
  width: auto;
  justify-content: flex-end;
  background: transparent;
}

.center {
  flex: 1;
  min-width: 0;
}

.title {
  display: block;
  font-size: 28rpx;
  font-weight: 700;
  color: #1E293B;
}

.subtitle {
  display: block;
  margin-top: 2rpx;
  font-size: 18rpx;
  color: #64748B;
}

.touch-active {
  opacity: 0.78;
}

/* ===== 彩色渐变主题（贴纸绘本头栏） ===== */
.app-header.theme-color {
  border-bottom: none;
  border-radius: 0 0 28rpx 28rpx;
  color: #FFFFFF;
  overflow: hidden;
}

.app-header.theme-color::after {
  content: '';
  position: absolute;
  inset: 0;
  background-image: radial-gradient(rgba(255, 255, 255, 0.14) 1px, transparent 1.4px);
  background-size: 14px 14px;
  pointer-events: none;
}

.app-header.theme-color .left {
  background: rgba(255, 255, 255, 0.18);
}

.app-header.theme-color .title {
  color: #FFFFFF;
  letter-spacing: 0.04em;
}

.app-header.theme-color .subtitle {
  color: rgba(255, 255, 255, 0.82);
  letter-spacing: 0.06em;
}

.app-header.theme-color .center,
.app-header.theme-color .left,
.app-header.theme-color .right {
  position: relative;
  z-index: 1;
}

/* 翠绿 · 资料库 */
.app-header.theme-green {
  background: linear-gradient(120deg, #1E7A46 0%, #2F9E5F 68%, #46B274 100%);
}

/* 描金 · 培养工具 */
.app-header.theme-gold {
  background: linear-gradient(120deg, #A97F35 0%, #C9A14E 68%, #D9B96A 100%);
}

/* 天蓝 · 探索 */
.app-header.theme-blue {
  background: linear-gradient(120deg, #2C6FD1 0%, #4F9CFF 68%, #6FB2FF 100%);
}

/* 赤陶 · 战斗 */
.app-header.theme-red {
  background: linear-gradient(120deg, #C64B38 0%, #E0604E 68%, #EC8A72 100%);
}
</style>
