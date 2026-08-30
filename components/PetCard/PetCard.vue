<template>
  <view class="pet-card" :class="{ compact, selected }" hover-class="card-press" @click="$emit('click')">
    <view v-if="accentStyle" class="accent-strip" :style="accentStyle"></view>
    <view v-if="badge" class="corner-badge" :class="`tone-${badgeTone}`">
      <text>{{ badge }}</text>
    </view>
    <view v-if="selected" class="check-seal">
      <AppIcon name="check" :size="10" color="#FFF5EC" :stroke-width="3" />
    </view>

    <template v-if="compact">
      <view class="img-wrap" :class="{ empty: !img }">
        <RemoteImage v-if="img" class="img" :src="resolvedImg" mode="aspectFit" />
      </view>
      <view class="body">
        <text class="name">{{ name }}</text>
        <text v-if="subtitle" class="sub">{{ subtitle }}</text>
        <view v-if="(tags && tags.length) || $slots.tags" class="tags">
          <slot name="tags">
            <view v-for="tag in tags" :key="tag.label" class="tag" :style="{ background: tag.color || '#6b7cff' }">
              <text>{{ tag.label }}</text>
            </view>
          </slot>
        </view>
        <text v-if="code" class="code">{{ code }}</text>
      </view>
    </template>

    <template v-else>
      <view class="img-wrap" :class="{ empty: !img }">
        <RemoteImage v-if="img" class="img" :src="resolvedImg" mode="aspectFit" />
      </view>
      <view class="body">
        <template v-if="inlineTags">
          <view class="name-row">
            <text class="name">{{ name }}</text>
            <view v-if="(tags && tags.length) || $slots.tags" class="tags">
              <slot name="tags">
                <view v-for="tag in tags" :key="tag.label" class="tag" :style="{ background: tag.color || '#6b7cff' }">
                  <text>{{ tag.label }}</text>
                </view>
              </slot>
            </view>
          </view>
          <text class="sub">{{ subtitle }}</text>
        </template>
        <template v-else>
          <text class="name">{{ name }}</text>
          <text class="sub">{{ subtitle }}</text>
          <view v-if="(tags && tags.length) || $slots.tags" class="tags">
            <slot name="tags">
              <view v-for="tag in tags" :key="tag.label" class="tag" :style="{ background: tag.color || '#6b7cff' }">
                <text>{{ tag.label }}</text>
              </view>
            </slot>
          </view>
        </template>
      </view>
    </template>

    <view v-if="$slots.extra" class="extra">
      <slot name="extra"></slot>
    </view>
  </view>
</template>

<script>
import { resolveAssetPath } from '@/utils/asset-path.js'
import AppIcon from '@/components/AppIcon/AppIcon.vue'

export default {
  name: 'PetCard',
  components: { AppIcon },
  props: {
    img: { type: String, default: '' },
    name: { type: String, default: '' },
    subtitle: { type: String, default: '' },
    tags: { type: Array, default: () => [] },
    compact: { type: Boolean, default: false },
    inlineTags: { type: Boolean, default: false },
    accentColors: { type: Array, default: () => [] },
    code: { type: String, default: '' },
    badge: { type: String, default: '' },
    badgeTone: { type: String, default: 'gold' },
    selected: { type: Boolean, default: false }
  },
  computed: {
    resolvedImg() {
      return resolveAssetPath(this.img)
    },
    accentStyle() {
      const colors = (this.accentColors || []).filter(Boolean).slice(0, 3)
      if (!colors.length) return null
      if (colors.length === 1) return { background: colors[0] }
      const stops = colors
        .map((color, index) => `${color} ${(index / colors.length) * 100}% ${((index + 1) / colors.length) * 100}%`)
        .join(', ')
      return { background: `linear-gradient(90deg, ${stops})` }
    }
  }
}
</script>

<style scoped>
.pet-card {
  position: relative;
  display: flex;
  gap: 12rpx;
  padding: 12rpx;
  border-radius: 24rpx;
  background: #FFFDF7;
  border: 1.5px solid #E3DCC8;
  box-shadow: 0 3rpx 0 rgba(44, 58, 47, 0.10);
  overflow: hidden;
  transition: transform 0.12s ease;
}

.card-press {
  transform: scale(0.97);
}

.pet-card.compact {
  flex-direction: column;
  gap: 8rpx;
  padding: 10rpx 10rpx 12rpx;
}

.accent-strip {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 6rpx;
}

.corner-badge {
  position: absolute;
  top: 12rpx;
  right: 10rpx;
  z-index: 2;
  padding: 2rpx 10rpx;
  border-radius: 999rpx;
  font-size: 16rpx;
  font-weight: 700;
  border: 1px solid #C9A14E;
  background: #F6EEDB;
  color: #A97F35;
}

.corner-badge.tone-gray {
  border-color: #D8D0BA;
  background: #F2EBDA;
  color: #6B7A6E;
}

.pet-card.selected {
  border-color: #2F9E5F;
  background: #F2FAF4;
  box-shadow: 0 3rpx 0 rgba(30, 122, 70, 0.25);
}

.check-seal {
  position: absolute;
  top: -6rpx;
  right: -6rpx;
  z-index: 3;
  width: 40rpx;
  height: 40rpx;
  border-radius: 50%;
  background: linear-gradient(135deg, #1E7A46 0%, #2F9E5F 100%);
  border: 3rpx solid #FFFDF7;
  box-shadow: 0 2rpx 0 rgba(22, 98, 53, 0.3);
  display: flex;
  align-items: center;
  justify-content: center;
}

.img-wrap {
  width: 80rpx;
  height: 80rpx;
  border-radius: 14rpx;
  background: #F2EBDA;
  overflow: hidden;
  flex: 0 0 auto;
  display: flex;
  align-items: center;
  justify-content: center;
}

.img-wrap.empty {
  background: transparent;
  border: 1.5px dashed #CFC7AE;
}

.img {
  width: 100%;
  height: 100%;
}

.pet-card.compact .img-wrap {
  width: 100%;
  height: 100rpx;
  border-radius: 14rpx;
}

.body {
  flex: 1;
  min-width: 0;
}

.pet-card.compact .body {
  flex: initial;
  width: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4rpx;
}

.name {
  display: block;
  font-size: 24rpx;
  font-weight: 700;
  color: #2C3A2F;
}

.name-row {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 6rpx;
}

.sub {
  display: block;
  margin-top: 4rpx;
  font-size: 18rpx;
  color: #6B7A6E;
}

.pet-card.compact .sub {
  margin-top: 2rpx;
  font-size: 16rpx;
}

.pet-card.compact .name {
  font-size: 21rpx;
  line-height: 1.3;
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  text-align: center;
}

.code {
  display: block;
  font-size: 17rpx;
  color: #A3AE9F;
  font-weight: 700;
  font-family: Monaco, Consolas, 'Courier New', monospace;
}

.tags {
  margin-top: 6rpx;
  display: flex;
  flex-wrap: wrap;
  gap: 6rpx;
}

.pet-card.compact .tags {
  margin-top: 2rpx;
  justify-content: center;
}

.tag {
  padding: 4rpx 8rpx;
  border-radius: 8rpx;
  font-size: 16rpx;
  background: #F2EBDA;
  color: #6B7A6E;
}

.extra {
  display: flex;
  align-items: center;
  justify-content: flex-end;
}

.pet-card.compact .extra {
  justify-content: flex-start;
  width: 100%;
}
</style>
