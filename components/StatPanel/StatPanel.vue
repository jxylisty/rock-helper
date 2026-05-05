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
  gap: 12rpx;
}

.stat {
  padding: 16rpx 12rpx;
  border-radius: 18rpx;
  background: #f7f9fe;
  text-align: center;
  border: 1rpx solid transparent;
}

.stat.highlighted {
  background: linear-gradient(180deg, #eef4ff 0%, #f8fbff 100%);
  border-color: rgba(91, 124, 245, 0.24);
  box-shadow: 0 8rpx 18rpx rgba(91, 124, 245, 0.08);
}

.label-row {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6rpx;
}

.label {
  display: block;
  font-size: 20rpx;
  color: #6b7590;
}

.boost-arrow {
  font-size: 20rpx;
  font-weight: 800;
  color: #f97316;
}

.value {
  display: block;
  margin-top: 6rpx;
  font-size: 28rpx;
  font-weight: 800;
  color: #1c2748;
}

.value.active {
  color: #ea580c;
}

.hint {
  display: block;
  margin-top: 4rpx;
  font-size: 18rpx;
  color: #94a3b8;
}

.hint.active {
  color: #4f6ed4;
  font-weight: 700;
}

.growth {
  display: block;
  margin-top: 4rpx;
  font-size: 18rpx;
  color: #33a06f;
}
</style>
