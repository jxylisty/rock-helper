<template>
  <view class="pet-card" :class="{ compact }" @click="$emit('click')">
    <view class="img-wrap" :class="{ empty: !img }">
      <image v-if="img" class="img" :src="resolvedImg" mode="aspectFit" />
    </view>
    <view class="body">
      <text class="name">{{ name }}</text>
      <text class="sub">{{ subtitle }}</text>
      <view v-if="(tags && tags.length) || $slots.tags" class="tags">
        <slot name="tags">
          <view v-for="tag in tags" :key="tag.label" class="tag" :style="{ background: tag.color || '#6b7cff' }">
            <text>{{ tag.label }}</text>
          </view>
        </slot>
      </view>
    </view>
    <view v-if="$slots.extra" class="extra">
      <slot name="extra"></slot>
    </view>
  </view>
</template>

<script>
import { resolveAssetPath } from '@/utils/asset-path.js'

export default {
  name: 'PetCard',
  props: {
    img: { type: String, default: '' },
    name: { type: String, default: '' },
    subtitle: { type: String, default: '' },
    tags: { type: Array, default: () => [] },
    compact: { type: Boolean, default: false }
  },
  computed: {
    resolvedImg() {
      return resolveAssetPath(this.img)
    }
  }
}
</script>

<style scoped>
.pet-card {
  display: flex;
  gap: 14rpx;
  padding: 14rpx;
  border-radius: 20rpx;
  background: #fff;
  box-shadow: 0 10rpx 24rpx rgba(31, 47, 87, 0.08);
}

.pet-card.compact {
  flex-direction: column;
  gap: 8rpx;
  padding: 12rpx;
}

.img-wrap {
  width: 88rpx;
  height: 88rpx;
  border-radius: 18rpx;
  background: #f7f9fe;
  overflow: hidden;
  flex: 0 0 auto;
}

.img-wrap.empty {
  background: transparent;
  border: 1rpx dashed #d8dfec;
}

.img {
  width: 100%;
  height: 100%;
}

.pet-card.compact .img-wrap {
  width: 100%;
  height: 112rpx;
  border-radius: 16rpx;
}

.body {
  flex: 1;
  min-width: 0;
}

.pet-card.compact .body {
  flex: initial;
}

.name {
  display: block;
  font-size: 28rpx;
  font-weight: 800;
  color: #1c2748;
}

.sub {
  display: block;
  margin-top: 6rpx;
  font-size: 20rpx;
  color: #6b7590;
}

.pet-card.compact .sub {
  margin-top: 4rpx;
  font-size: 18rpx;
}

.pet-card.compact .name {
  font-size: 22rpx;
  line-height: 1.35;
}

.tags {
  margin-top: 8rpx;
  display: flex;
  flex-wrap: wrap;
  gap: 8rpx;
}

.pet-card.compact .tags {
  margin-top: 6rpx;
}

.tag {
  padding: 6rpx 10rpx;
  border-radius: 999rpx;
  font-size: 18rpx;
  color: #fff;
}

.extra {
  display: flex;
  align-items: center;
  justify-content: flex-end;
}

.pet-card.compact .extra {
  justify-content: flex-start;
}
</style>
