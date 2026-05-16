<template>
  <view class="compare-card">
    <text class="compare-title">{{ title }}</text>
    <text class="compare-summary">
      {{ damageLabel || '伤害' }} {{ formatValue(damage) }} / {{ hpLabel || '生命' }} {{ formatValue(hp) }}，{{ percentText }}，{{ diffText }}
    </text>

    <view class="bar-row">
      <text class="bar-label">{{ damageLabel || '伤害线' }}</text>
      <view class="bar-track">
        <view class="bar-fill damage-fill" :style="{ width: `${damageWidth}%` }"></view>
      </view>
      <text class="bar-value">{{ formatValue(damage) }}</text>
    </view>

    <view class="bar-row">
      <text class="bar-label">{{ hpLabel || '生命线' }}</text>
      <view class="bar-track">
        <view class="bar-fill hp-fill" :style="{ width: `${hpWidth}%` }"></view>
      </view>
      <text class="bar-value">{{ formatValue(hp) }}</text>
    </view>
  </view>
</template>

<script>
export default {
  name: 'DamageHpCompareBar',
  props: {
    damage: Number,
    hp: Number,
    title: String,
    damageLabel: String,
    hpLabel: String,
    reverseDiff: {
      type: Boolean,
      default: false
    }
  },
  computed: {
    percent() {
      return this.hp ? (this.damage / this.hp) * 100 : 0
    },
    diff() {
      return (this.damage || 0) - (this.hp || 0)
    },
    maxValue() {
      return Math.max(this.damage || 0, this.hp || 0, 1) * 1.1
    },
    damageWidth() {
      return this.maxValue ? ((this.damage || 0) / this.maxValue) * 100 : 0
    },
    hpWidth() {
      return this.maxValue ? ((this.hp || 0) / this.maxValue) * 100 : 0
    },
    percentText() {
      return `${this.percent.toFixed(0)}%`
    },
    diffText() {
      if (this.reverseDiff) {
        const remaining = (this.hp || 0) - (this.damage || 0)
        return remaining >= 0 ? `剩余 ${Math.round(remaining)}` : `溢出 ${Math.round(Math.abs(remaining))}`
      }
      return this.diff >= 0 ? `溢出 ${Math.round(this.diff)}` : `差 ${Math.round(Math.abs(this.diff))}`
    }
  },
  methods: {
    formatValue(value) {
      return Number(value || 0).toFixed(0)
    }
  }
}
</script>

<style scoped>
.compare-card {
  padding: 24rpx;
  border-radius: 24rpx;
  background: #fffdf8;
  border: 1rpx solid #f0e4d1;
}

.compare-title {
  display: block;
  font-size: 28rpx;
  font-weight: 600;
  color: #2f2a23;
}

.compare-summary {
  display: block;
  margin: 12rpx 0 18rpx;
  font-size: 24rpx;
  line-height: 1.6;
  color: #665947;
}

.bar-row {
  display: grid;
  grid-template-columns: 112rpx 1fr 76rpx;
  align-items: center;
  gap: 12rpx;
  margin-bottom: 14rpx;
}

.bar-row:last-child {
  margin-bottom: 0;
}

.bar-label,
.bar-value {
  font-size: 22rpx;
  color: #796950;
}

.bar-value {
  text-align: right;
}

.bar-track {
  height: 20rpx;
  border-radius: 999rpx;
  overflow: hidden;
  background: #eee3d5;
}

.bar-fill {
  height: 100%;
  border-radius: inherit;
}

.damage-fill {
  background: linear-gradient(90deg, #f56a52 0%, #ffb161 100%);
}

.hp-fill {
  background: linear-gradient(90deg, #5ca8ff 0%, #87d7c4 100%);
}
</style>
