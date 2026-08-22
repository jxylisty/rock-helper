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
  min-height: 220rpx;
  border-radius: 16rpx;
  background: #FFFFFF;
  box-shadow: 0 4rpx 12rpx rgba(61, 52, 43, 0.05);
  overflow: hidden;
  border: 1px solid #E2E8F0;
}

.slot-card.empty {
  border: 1px dashed #94A3B8;
  background: rgba(240, 235, 225, 0.6);
  box-shadow: none;
}

.slot-card.expanded {
  box-shadow: 0 4rpx 16rpx rgba(61, 52, 43, 0.08);
}

.empty-state {
  min-height: 220rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8rpx;
}

.empty-plus {
  font-size: 44rpx;
  line-height: 1;
  color: #94A3B8;
  font-weight: 600;
}

.empty-text {
  font-size: 22rpx;
  color: #64748B;
  font-weight: 600;
}

.filled-state {
  padding: 12rpx;
}

.pet-cover {
  width: 100%;
  height: 110rpx;
  border-radius: 8rpx;
  background: #F8FAFC;
  display: flex;
  align-items: center;
  justify-content: center;
}

.pet-image {
  width: 100rpx;
  height: 100rpx;
  display: block;
}

.pet-name {
  display: block;
  margin-top: 8rpx;
  font-size: 22rpx;
  font-weight: 700;
  color: #1E293B;
  line-height: 1.2;
  text-align: center;
}

.info-line {
  margin-top: 8rpx;
  display: grid;
  grid-template-columns: 70rpx 1fr;
  gap: 6rpx;
  align-items: start;
}

.line-label {
  min-height: 32rpx;
  border-radius: 8rpx;
  background: #22C55E;
  color: #FFFFFF;
  font-size: 16rpx;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
}

.line-value {
  min-height: 32rpx;
  padding: 0 8rpx;
  border-radius: 8rpx;
  background: #F8FAFC;
  color: #1E293B;
  font-size: 17rpx;
  font-weight: 600;
  display: flex;
  align-items: center;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  font-family: Monaco, Consolas, 'Courier New', monospace;
}

.line-value.multiline {
  white-space: normal;
  line-height: 1.3;
  padding-top: 4rpx;
  padding-bottom: 4rpx;
}

.action-row {
  margin-top: 10rpx;
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 6rpx;
}

.mini-btn {
  min-width: 0;
  height: 44rpx;
  border-radius: 8rpx;
  font-size: 16rpx;
  font-weight: 600;
  display: flex;
  align-items: center;
  justify-content: center;
  white-space: nowrap;
  background: #F8FAFC;
  color: #64748B;
}
</style>
