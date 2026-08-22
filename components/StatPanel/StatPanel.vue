<template>
  <view class="panel" :style="panelStyle">
    <view v-for="item in stats" :key="item.key" class="stat" :class="{ highlighted: item.highlighted }">
      <view class="label-row">
        <text class="label">{{ item.label }}</text>
        <text v-if="item.highlighted" class="boost-arrow">↑</text>
      </view>
      <text class="value" :class="[item.key, { active: item.highlighted }]">{{ item.value ?? '-' }}</text>
      <text v-if="item.hint" class="hint" :class="{ active: item.highlighted }">{{ item.hint }}</text>
      <text v-if="showGrowth && item.growth !== undefined" class="growth">+{{ item.growth }}/级</text>
    </view>
  </view>
</template>

<script>
export default {
  name: 'StatPanel',
  props: {
    stats: { type: Array, default: () => [] },
    showGrowth: { type: Boolean, default: false },
    columns: { type: Number, default: 3 }
  },
  computed: {
    panelStyle() {
      const columns = Math.max(1, Number(this.columns) || 3)
      return {
        gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`
      }
    }
  }
}
</script>

<style scoped>
.panel {
  display: grid;
  gap: 8rpx;
}

.stat {
  padding: 12rpx 10rpx;
  border-radius: 8rpx;
  background: #F8FAFC;
  text-align: center;
}

.stat.highlighted {
  background: #FFFFFF;
  border: 1px solid #22C55E;
  box-shadow: 0 2rpx 8rpx rgba(246, 185, 59, 0.12);
}

.label-row {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 4rpx;
}

.label {
  display: block;
  font-size: 18rpx;
  color: #64748B;
}

.boost-arrow {
  font-size: 18rpx;
  font-weight: 700;
  color: #E55039;
}

.value {
  display: block;
  margin-top: 4rpx;
  font-size: 24rpx;
  font-weight: 700;
  color: #1E293B;
  font-family: Monaco, Consolas, 'Courier New', monospace;
}

.value.active {
  color: #E55039;
}

.hint {
  display: block;
  margin-top: 2rpx;
  font-size: 16rpx;
  color: #94A3B8;
}

.hint.active {
  color: #4A69BD;
  font-weight: 600;
}

.growth {
  display: block;
  margin-top: 2rpx;
  font-size: 16rpx;
  color: #4A69BD;
  font-family: Monaco, Consolas, 'Courier New', monospace;
}
</style>
