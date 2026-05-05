<template>
  <view class="page">
    <AppHeader title="孵蛋预测" subtitle="输入身高和重量，预测可能孵化出的精灵" leftAction="back" />

    <scroll-view scroll-y class="content">
      <view class="hero card">
        <text class="hero-title">蛋壳数据预测</text>
        <text class="hero-sub">支持按身高、重量做本地匹配，结果会按命中程度排序。</text>
      </view>

      <view class="section card">
        <text class="section-title">输入条件</text>

        <view class="field">
          <text class="field-label">身高</text>
          <input
            class="field-input"
            v-model="height"
            placeholder="例如 0.65"
            type="digit"
          />
        </view>

        <view class="field">
          <text class="field-label">重量</text>
          <input
            class="field-input"
            v-model="weight"
            placeholder="例如 5.5"
            type="digit"
          />
        </view>

        <view class="action-row">
          <view class="btn-primary" @click="predict">开始预测</view>
          <view class="btn-secondary" @click="clearInput">清空</view>
        </view>
      </view>

      <view v-if="predictions.length > 0" class="section card">
        <view class="results-head">
          <text class="section-title">预测结果</text>
          <text class="results-count">{{ predictions.length }} 个结果</text>
        </view>

        <view
          v-for="(pred, index) in predictions"
          :key="pred.petId"
          class="result-item"
          :class="{ gold: index === 0 }"
          @click="goToDetail(pred.petId)"
        >
          <view class="rank">{{ index + 1 }}</view>
          <view class="pet-info">
            <text class="pet-name">{{ pred.name }}</text>
            <view class="pet-types">
              <TypeBadge
                v-for="t in pred.type"
                :key="t"
                :label="t"
                :color="getTypeColor(t)"
                compact
              />
            </view>
          </view>
          <view class="score">
            <text class="score-num">{{ pred.score }}%</text>
            <text class="match-type">{{ getMatchLabel(pred.matchType) }}</text>
          </view>
        </view>
      </view>

      <view v-else-if="hasSearched" class="section card empty-state">
        <text class="empty-title">没有找到匹配的精灵</text>
        <text class="empty-sub">可以换一个更接近的身高或重量再试一次。</text>
      </view>

      <view class="section card">
        <text class="section-title">说明</text>
        <view class="tip-list">
          <text class="tip-item">输入身高和重量后，点击开始预测。</text>
          <text class="tip-item">完全匹配表示两项都在目标范围内。</text>
          <text class="tip-item">点击结果卡片可以直接进入精灵详情页。</text>
        </view>
      </view>

      <view class="bottom-space"></view>
    </scroll-view>
  </view>
</template>

<script>
import AppHeader from '@/components/AppHeader/AppHeader.vue'
import TypeBadge from '@/components/TypeBadge/TypeBadge.vue'
import { predictEgg } from '@/data/eggData.js'
import { petTypes } from '@/data/pets.js'

export default {
  components: {
    AppHeader,
    TypeBadge
  },
  data() {
    return {
      height: '',
      weight: '',
      predictions: [],
      hasSearched: false
    }
  },
  methods: {
    predict() {
      const h = parseFloat(this.height)
      const w = parseFloat(this.weight)

      if (Number.isNaN(h) || Number.isNaN(w)) {
        uni.showToast({ title: '请输入有效数值', icon: 'none' })
        return
      }

      this.predictions = predictEgg(h, w)
      this.hasSearched = true
    },
    clearInput() {
      this.height = ''
      this.weight = ''
      this.predictions = []
      this.hasSearched = false
    },
    getTypeColor(type) {
      return petTypes.find((item) => item.key === type)?.color || '#5b7cf5'
    },
    getMatchLabel(type) {
      if (type === 'full') return '完全匹配'
      if (type === 'height') return '身高命中'
      if (type === 'weight') return '重量命中'
      return '部分匹配'
    },
    goToDetail(id) {
      uni.navigateTo({ url: '/pages/detail/detail?id=' + id })
    }
  }
}
</script>

<style scoped>
.page {
  min-height: 100vh;
  background: linear-gradient(180deg, #f6f8fc 0%, #edf3fb 100%);
}

.content {
  height: calc(100vh - 96rpx);
}

.card {
  background: #fff;
  border-radius: 24rpx;
  box-shadow: 0 16rpx 40rpx rgba(31, 47, 87, 0.08);
}

.hero {
  margin: 20rpx 24rpx 0;
  padding: 24rpx;
  background: linear-gradient(135deg, #1c2748 0%, #36508d 55%, #5b7cf5 100%);
  color: #fff;
}

.hero-title {
  display: block;
  font-size: 38rpx;
  font-weight: 800;
}

.hero-sub {
  display: block;
  margin-top: 8rpx;
  font-size: 22rpx;
  line-height: 1.5;
  color: rgba(255, 255, 255, 0.82);
}

.section {
  margin: 24rpx 24rpx 0;
  padding: 24rpx;
}

.section-title {
  display: block;
  font-size: 30rpx;
  font-weight: 800;
  color: #1c2748;
}

.field {
  margin-top: 18rpx;
}

.field-label {
  display: block;
  margin-bottom: 10rpx;
  font-size: 22rpx;
  font-weight: 700;
  color: #51607f;
}

.field-input {
  height: 82rpx;
  padding: 0 24rpx;
  border-radius: 18rpx;
  background: #f4f7fc;
  font-size: 28rpx;
  color: #1c2748;
}

.action-row {
  display: flex;
  gap: 12rpx;
  margin-top: 20rpx;
}

.btn-primary,
.btn-secondary {
  height: 76rpx;
  border-radius: 999rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 26rpx;
  font-weight: 700;
}

.btn-primary {
  flex: 1.5;
  background: linear-gradient(135deg, #5b7cf5 0%, #405ee9 100%);
  color: #fff;
}

.btn-secondary {
  flex: 1;
  background: #eef3fb;
  color: #445679;
}

.results-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12rpx;
}

.results-count {
  font-size: 20rpx;
  color: #6b7590;
}

.result-item {
  display: flex;
  align-items: center;
  gap: 16rpx;
  margin-top: 16rpx;
  padding: 18rpx;
  border-radius: 20rpx;
  background: linear-gradient(180deg, #f7f9fe 0%, #eef3fb 100%);
  border: 1rpx solid rgba(91, 124, 245, 0.08);
}

.result-item.gold {
  border-color: rgba(255, 184, 77, 0.5);
  box-shadow: 0 12rpx 28rpx rgba(255, 184, 77, 0.16);
}

.rank {
  width: 56rpx;
  height: 56rpx;
  border-radius: 50%;
  background: #6b7590;
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24rpx;
  font-weight: 800;
  flex-shrink: 0;
}

.result-item.gold .rank {
  background: linear-gradient(135deg, #f6c64f 0%, #f08b4a 100%);
}

.pet-info {
  flex: 1;
  min-width: 0;
}

.pet-name {
  display: block;
  font-size: 28rpx;
  font-weight: 800;
  color: #1c2748;
}

.pet-types {
  margin-top: 8rpx;
  display: flex;
  flex-wrap: wrap;
  gap: 8rpx;
}

.score {
  text-align: right;
  flex-shrink: 0;
}

.score-num {
  display: block;
  font-size: 30rpx;
  font-weight: 800;
  color: #24a148;
}

.match-type {
  display: block;
  margin-top: 4rpx;
  font-size: 20rpx;
  color: #6b7590;
}

.empty-state {
  text-align: center;
}

.empty-title {
  display: block;
  font-size: 28rpx;
  font-weight: 800;
  color: #1c2748;
}

.empty-sub {
  display: block;
  margin-top: 10rpx;
  font-size: 22rpx;
  line-height: 1.6;
  color: #6b7590;
}

.tip-list {
  margin-top: 16rpx;
  display: flex;
  flex-direction: column;
  gap: 10rpx;
}

.tip-item {
  font-size: 22rpx;
  line-height: 1.6;
  color: #5f6d8c;
}

.bottom-space {
  height: calc(40rpx + env(safe-area-inset-bottom));
}
</style>
