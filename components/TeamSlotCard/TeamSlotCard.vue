<template>
  <view class="slot-card" :class="{ empty: !slotData, expanded }">
    <view v-if="!slotData" class="empty-state" @click="$emit('add', index)">
      <text class="empty-plus">+</text>
      <text class="empty-text">添加精灵</text>
    </view>

    <view v-else class="filled-state">
      <view class="pet-cover">
        <RemoteImage class="pet-image" :src="resolvedImage" mode="aspectFit" />
      </view>

      <text class="pet-name">{{ slotData.petName }}</text>

      <view class="info-line">
        <text class="line-label">性格</text>
        <text class="line-value">{{ natureSummary }}</text>
      </view>

      <view class="info-line">
        <text class="line-label">个体值</text>
        <text class="line-value multiline">{{ ivSummary }}</text>
      </view>

      <view class="action-row">
        <view class="mini-btn ghost" @click.stop="$emit('toggleExpand', index)">
          {{ expanded ? '收起' : '技能' }}
        </view>
        <view class="mini-btn info" @click.stop="$emit('panel', index)">面板</view>
        <view class="mini-btn primary" @click.stop="$emit('edit', index)">编辑</view>
        <view class="mini-btn danger" @click.stop="$emit('delete', index)">删除</view>
      </view>

      <view class="accordion" :class="{ open: expanded }">
        <view class="accordion-inner">
          <slot name="details"></slot>
        </view>
      </view>
    </view>
  </view>
</template>

<script>
import { resolveAssetPath } from '@/utils/asset-path.js'

export default {
  name: 'TeamSlotCard',
  props: {
    slotData: {
      type: Object,
      default: null
    },
    index: {
      type: Number,
      default: 0
    },
    expanded: {
      type: Boolean,
      default: false
    }
  },
  computed: {
    resolvedImage() {
      return resolveAssetPath(this.slotData?.image || '')
    },
    natureSummary() {
      if (!this.slotData) return '无'
      const up = this.slotData.natureUpLabel && this.slotData.natureUpLabel !== '无' ? this.slotData.natureUpLabel : ''
      const down = this.slotData.natureDownLabel && this.slotData.natureDownLabel !== '无' ? this.slotData.natureDownLabel : ''
      if (!up && !down) return '无'
      if (up && down) return `${up} / ${down}`
      return up || down
    },
    ivSummary() {
      if (!this.slotData?.ivs) return '无'
      const labels = {
        hp: '生命',
        attack: '物攻',
        mattack: '魔攻',
        defense: '物防',
        mdefense: '魔防',
        speed: '速度'
      }
      const items = Object.keys(labels)
        .filter((key) => Number(this.slotData.ivs[key]) > 0)
        .map((key) => labels[key])
      return items.length ? items.join(' ') : '无'
    }
  }
}
</script>

<style scoped>
.slot-card {
  min-height: 250rpx;
  border-radius: 24rpx;
  background: rgba(255, 252, 244, 0.98);
  box-shadow: 0 14rpx 28rpx rgba(68, 56, 32, 0.08);
  overflow: hidden;
  border: 1rpx solid rgba(229, 220, 198, 0.8);
}

.slot-card.empty {
  border: 2rpx dashed rgba(186, 168, 130, 0.45);
  background: rgba(255, 250, 240, 0.88);
  box-shadow: none;
}

.slot-card.expanded {
  box-shadow: 0 18rpx 34rpx rgba(68, 56, 32, 0.12);
}

.empty-state {
  min-height: 250rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 10rpx;
}

.empty-plus {
  font-size: 52rpx;
  line-height: 1;
  color: #c58c2b;
  font-weight: 800;
}

.empty-text {
  font-size: 24rpx;
  color: #7f6b46;
  font-weight: 700;
}

.filled-state {
  padding: 14rpx;
}

.pet-cover {
  width: 100%;
  height: 132rpx;
  border-radius: 20rpx;
  background: linear-gradient(180deg, #efe6d6 0%, #f9f3ea 100%);
  display: flex;
  align-items: center;
  justify-content: center;
}

.pet-image {
  width: 118rpx;
  height: 118rpx;
  display: block;
}

.pet-name {
  display: block;
  margin-top: 10rpx;
  font-size: 26rpx;
  font-weight: 900;
  color: #1f1a12;
  line-height: 1.2;
  text-align: center;
  word-break: break-all;
}

.info-line {
  margin-top: 10rpx;
  display: grid;
  grid-template-columns: 82rpx 1fr;
  gap: 8rpx;
  align-items: start;
}

.line-label {
  min-height: 38rpx;
  border-radius: 10rpx;
  background: linear-gradient(180deg, #ffcb55 0%, #ffb300 100%);
  color: #1f1a12;
  font-size: 18rpx;
  font-weight: 800;
  display: flex;
  align-items: center;
  justify-content: center;
}

.line-value {
  min-height: 38rpx;
  padding: 0 10rpx;
  border-radius: 10rpx;
  background: rgba(255, 255, 255, 0.82);
  color: #1f1a12;
  font-size: 19rpx;
  font-weight: 700;
  display: flex;
  align-items: center;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.line-value.multiline {
  white-space: normal;
  line-height: 1.35;
  padding-top: 6rpx;
  padding-bottom: 6rpx;
}

.action-row {
  margin-top: 12rpx;
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 8rpx;
}

.mini-btn {
  min-width: 0;
  height: 50rpx;
  border-radius: 14rpx;
  font-size: 18rpx;
  font-weight: 800;
  display: flex;
  align-items: center;
  justify-content: center;
  white-space: nowrap;
}
</style>
