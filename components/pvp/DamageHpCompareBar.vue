<template>
  <view class="compare-card">
    <text class="compare-title">{{ title }}</text>
    <text class="compare-summary">
      {{ damageLabel || '伤害' }} <text class="mono">{{ formatValue(damage) }}</text> / {{ hpLabel || '生命' }} <text class="mono">{{ formatValue(hp) }}</text>，<text class="mono">{{ percentText }}</text>，{{ diffText }}
    </text>

    <view class="bar-row">
      <text class="bar-label">{{ damageLabel || '伤害线' }}</text>
      <view class="bar-track">
        <view class="bar-fill damage-fill" :style="{ width: `${damageWidth}%` }"></view>
      </view>
      <text class="bar-value mono">{{ formatValue(damage) }}</text>
    </view>

    <view class="bar-row">
      <text class="bar-label">{{ hpLabel || '生命线' }}</text>
      <view class="bar-track">
        <view class="bar-fill hp-fill" :style="{ width: `${hpWidth}%` }"></view>
      </view>
      <text class="bar-value mono">{{ formatValue(hp) }}</text>
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
  margin-top: 11px;
  padding: 11px;
  border-radius: 13px;
  background: #F7F1E3;
  border: 1.5px solid #E3DCC8;
}

.compare-title {
  display: block;
  font-size: 11px;
  font-weight: 700;
  color: #6B7A6E;
}

.compare-summary {
  display: block;
  margin: 6px 0 10px;
  font-size: 11px;
  line-height: 1.5;
  color: #6B7A6E;
}

.compare-summary .mono {
  font-weight: 800;
  color: #2C3A2F;
}

.mono {
  font-family: Monaco, Consolas, 'Courier New', monospace;
}

.bar-row {
  display: grid;
  grid-template-columns: 48px 1fr 44px;
  align-items: center;
  gap: 7px;
  margin-bottom: 8px;
}

.bar-row:last-child {
  margin-bottom: 0;
}

.bar-label {
  font-size: 10px;
  font-weight: 700;
  color: #6B7A6E;
}

.bar-value {
  font-size: 11px;
  font-weight: 800;
  color: #2C3A2F;
  text-align: right;
  font-family: Monaco, Consolas, 'Courier New', monospace;
}

.bar-track {
  height: 11px;
  border-radius: 999px;
  overflow: hidden;
  background: #FFFDF7;
  border: 1px solid #E3DCC8;
  box-sizing: border-box;
}

.bar-fill {
  height: 100%;
  border-radius: inherit;
}

.damage-fill {
  background: linear-gradient(90deg, #C64B38 0%, #E0604E 100%);
  box-shadow: inset 0 1.5px 0 rgba(255, 245, 236, 0.35);
}

.hp-fill {
  background: linear-gradient(90deg, #2C6FD1 0%, #4F9CFF 100%);
  box-shadow: inset 0 1.5px 0 rgba(240, 247, 255, 0.35);
}
</style>
