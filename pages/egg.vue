<template>
  <view class="page">
    <AppHeader theme="gold" title="孵蛋预测" subtitle="蛋壳数据 · 命中推算" leftAction="back" />

    <scroll-view scroll-y class="content" :show-scrollbar="false">
      <view class="hero card">
        <view class="hero-icon">
          <AppIcon name="egg" :size="17" color="#A97F35" />
        </view>
        <view class="hero-text">
          <text class="hero-title">蛋壳数据预测</text>
          <text class="hero-sub">输入身高与重量，本地匹配可能孵出的精灵。</text>
        </view>
      </view>

      <view class="section card">
        <view class="section-head">
          <view class="section-icon gold">
            <AppIcon name="wand" :size="11" color="#FFF9EC" />
          </view>
          <text class="section-title">输入条件</text>
        </view>

        <view class="field-grid">
          <view class="field">
            <view class="field-head">
              <AppIcon name="ruler" :size="10" color="#A97F35" />
              <text class="field-label">身高 (m)</text>
            </view>
            <input
              class="field-input mono"
              v-model="height"
              placeholder="例如 0.65"
              placeholder-class="input-placeholder"
              type="digit"
            />
          </view>
          <view class="field">
            <view class="field-head">
              <AppIcon name="scale" :size="10" color="#A97F35" />
              <text class="field-label">重量 (kg)</text>
            </view>
            <input
              class="field-input mono"
              v-model="weight"
              placeholder="例如 5.5"
              placeholder-class="input-placeholder"
              type="digit"
            />
          </view>
        </view>

        <view class="action-row">
          <view class="btn-primary" hover-class="press-down" @click="predict">
            <AppIcon name="sparkles" :size="11" color="#FFF9EC" />
            <text class="btn-primary-text">开始预测</text>
          </view>
          <view class="btn-ghost" hover-class="press-down" @click="clearInput">
            <AppIcon name="close" :size="10" color="#8A6A2C" :stroke-width="2.8" />
            <text class="btn-ghost-text">清空</text>
          </view>
        </view>
      </view>

      <view v-if="predictions.length > 0" class="section card">
        <view class="section-head">
          <view class="section-head-left">
            <view class="section-icon green">
              <AppIcon name="egg" :size="11" color="#FFF5EC" />
            </view>
            <text class="section-title">预测结果</text>
          </view>
          <view class="results-count">
            <AppIcon name="star" :size="9" color="#A97F35" />
            <text class="results-count-num mono">{{ predictions.length }}</text>
            <text class="results-count-label">个结果</text>
          </view>
        </view>

        <view class="result-list">
          <view
            v-for="(pred, index) in predictions"
            :key="pred.petId"
            class="result-item"
            :class="podiumClass(index)"
            hover-class="press-down"
            @click="goToDetail(pred.petId)"
          >
            <view class="rank-seal" :class="rankClass(index)">
              <text class="rank-num mono">{{ index + 1 }}</text>
            </view>
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
              <text class="score-num mono">{{ pred.score }}%</text>
              <text class="match-type">{{ getMatchLabel(pred.matchType) }}</text>
            </view>
          </view>
        </view>
      </view>

      <view v-else-if="hasSearched" class="section card empty-state">
        <view class="empty-icon">
          <AppIcon name="search" :size="14" color="#A3AE9F" />
        </view>
        <text class="empty-title">没有找到匹配的精灵</text>
        <text class="empty-sub">可以换一个更接近的身高或重量再试一次。</text>
      </view>

      <view class="section card">
        <view class="section-head">
          <view class="section-icon plain">
            <AppIcon name="info" :size="11" color="#6B7A6E" />
          </view>
          <text class="section-title">使用说明</text>
        </view>
        <view class="tip-list">
          <view class="tip-line">
            <AppIcon name="check" :size="9" color="#1E7A46" :stroke-width="3" />
            <text class="tip-item">输入身高和重量后，点击开始预测。</text>
          </view>
          <view class="tip-line">
            <AppIcon name="check" :size="9" color="#1E7A46" :stroke-width="3" />
            <text class="tip-item">完全匹配表示两项都在目标范围内。</text>
          </view>
          <view class="tip-line">
            <AppIcon name="check" :size="9" color="#1E7A46" :stroke-width="3" />
            <text class="tip-item">点击结果卡片可以直接进入精灵详情页。</text>
          </view>
        </view>
      </view>

      <view class="bottom-space"></view>
    </scroll-view>
  </view>
</template>

<script>
import AppHeader from '@/components/AppHeader/AppHeader.vue'
import AppIcon from '@/components/AppIcon/AppIcon.vue'
import TypeBadge from '@/components/TypeBadge/TypeBadge.vue'
import { predictEgg } from '@/data/config/eggData.js'
import { petTypes } from '@/data/pet/pet_detail.js'

export default {
  components: {
    AppHeader,
    AppIcon,
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
    rankClass(index) {
      if (index === 0) return 'gold'
      if (index === 1) return 'silver'
      if (index === 2) return 'bronze'
      return 'plain'
    },
    podiumClass(index) {
      if (index === 0) return 'podium-top'
      if (index === 1) return 'podium-second'
      if (index === 2) return 'podium-third'
      return ''
    },
    goToDetail(id) {
      uni.navigateTo({ url: '/pages/detail?id=' + id })
    }
  }
}
</script>

<style scoped>
.page {
  height: 100vh;
  display: flex;
  flex-direction: column;
  background: #FAF6EC;
  background-image:
    radial-gradient(circle at 12% 6%, rgba(201, 161, 78, 0.10) 0, transparent 42%),
    radial-gradient(circle at 88% 22%, rgba(30, 122, 70, 0.05) 0, transparent 40%);
}

.content {
  flex: 1;
  min-height: 0;
}

.mono {
  font-family: Monaco, Consolas, 'Courier New', monospace;
}

.press-down {
  transform: scale(0.95);
  opacity: 0.85;
}

.card {
  background: #FFFDF7;
  border: 1.5px solid #E3DCC8;
  border-radius: 18px;
  box-shadow: 0 3px 0 rgba(44, 58, 47, 0.10);
}

/* ===== 顶部说明卡 ===== */
.hero {
  margin: 12px 14px 0;
  padding: 12px 13px;
  display: flex;
  align-items: center;
  gap: 10px;
}

.hero-icon {
  flex-shrink: 0;
  width: 38px;
  height: 38px;
  border-radius: 12px;
  background: #FBF3DD;
  border: 1.5px solid #D9B96A;
  box-shadow: 0 2px 0 rgba(138, 106, 44, 0.25);
  display: flex;
  align-items: center;
  justify-content: center;
}

.hero-text {
  flex: 1;
  min-width: 0;
}

.hero-title {
  display: block;
  font-size: 14.5px;
  font-weight: 800;
  color: #2C3A2F;
}

.hero-sub {
  display: block;
  margin-top: 3px;
  font-size: 11px;
  color: #6B7A6E;
  line-height: 1.5;
}

/* ===== 区块 ===== */
.section {
  margin: 12px 14px 0;
  padding: 13px;
}

.section-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.section-head-left {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
}

.section-icon {
  flex-shrink: 0;
  width: 30px;
  height: 30px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1.5px solid;
}

.section-icon.gold {
  background: linear-gradient(135deg, #A97F35 0%, #C9A14E 100%);
  border-color: #8A6A2C;
  box-shadow: 0 2px 0 rgba(138, 106, 44, 0.4);
}

.section-icon.green {
  background: linear-gradient(135deg, #1E7A46 0%, #2F9E5F 100%);
  border-color: #166235;
  box-shadow: 0 2px 0 rgba(22, 98, 53, 0.4);
}

.section-icon.plain {
  background: #F2EBDA;
  border-color: #E3DCC8;
}

.section-title {
  font-size: 14px;
  font-weight: 800;
  color: #2C3A2F;
}

/* ===== 输入区 ===== */
.field-grid {
  margin-top: 11px;
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;
}

.field {
  min-width: 0;
}

.field-head {
  display: flex;
  align-items: center;
  gap: 5px;
  margin-bottom: 6px;
}

.field-label {
  font-size: 10.5px;
  font-weight: 700;
  color: #6B7A6E;
}

.field-input {
  width: 100%;
  height: 40px;
  padding: 0 11px;
  border-radius: 12px;
  background: #F7F1E3;
  border: 1.5px solid #D9B96A;
  box-sizing: border-box;
  font-size: 14px;
  font-weight: 800;
  color: #2C3A2F;
}

.input-placeholder {
  color: #A3AE9F;
  font-size: 12px;
  font-weight: 400;
}

.action-row {
  display: flex;
  gap: 8px;
  margin-top: 11px;
}

.btn-primary,
.btn-ghost {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 5px;
  height: 38px;
  border-radius: 13px;
  transition: transform 0.12s ease;
}

.btn-primary {
  flex: 1.6;
  background: linear-gradient(135deg, #A97F35 0%, #C9A14E 100%);
  border: 1.5px solid #8A6A2C;
  box-shadow: 0 2.5px 0 rgba(138, 106, 44, 0.4);
}

.btn-primary-text {
  font-size: 12.5px;
  font-weight: 700;
  color: #FFF9EC;
}

.btn-ghost {
  flex: 1;
  background: #FBF3DD;
  border: 1.5px solid #D9B96A;
  box-shadow: 0 2.5px 0 rgba(138, 106, 44, 0.22);
}

.btn-ghost-text {
  font-size: 12px;
  font-weight: 700;
  color: #8A6A2C;
}

/* ===== 结果区 ===== */
.results-count {
  flex-shrink: 0;
  display: inline-flex;
  align-items: baseline;
  gap: 3px;
  height: 24px;
  padding: 0 10px;
  border-radius: 999px;
  background: #FBF3DD;
  border: 1px solid #D9B96A;
}

.results-count-num {
  font-size: 12px;
  font-weight: 800;
  color: #A97F35;
}

.results-count-label {
  font-size: 9.5px;
  font-weight: 700;
  color: #6B7A6E;
}

.result-list {
  margin-top: 11px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.result-item {
  position: relative;
  overflow: hidden;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 11px;
  border-radius: 13px;
  background: #F7F1E3;
  border: 1.5px solid #E3DCC8;
  transition: transform 0.12s ease;
}

.result-item::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 4px;
}

.result-item.podium-top {
  background: #FFFDF7;
  border-color: #D9B96A;
  box-shadow: 0 2.5px 0 rgba(138, 106, 44, 0.28);
  padding-top: 13px;
}

.result-item.podium-top::before {
  background: linear-gradient(90deg, #A97F35, #D9B96A);
}

.result-item.podium-second::before {
  background: linear-gradient(90deg, #8C97A8, #B9C2CE);
}

.result-item.podium-third::before {
  background: linear-gradient(90deg, #B0714E, #D19A76);
}

.rank-seal {
  flex-shrink: 0;
  width: 34px;
  height: 34px;
  border-radius: 999px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1.5px solid;
}

.rank-seal.gold {
  width: 38px;
  height: 38px;
  background: linear-gradient(135deg, #A97F35 0%, #D9B96A 100%);
  border-color: #8A6A2C;
  box-shadow: 0 2.5px 0 rgba(138, 106, 44, 0.45);
}

.rank-seal.silver {
  background: linear-gradient(135deg, #8C97A8 0%, #B9C2CE 100%);
  border-color: #6F7A8C;
  box-shadow: 0 2px 0 rgba(111, 122, 140, 0.4);
}

.rank-seal.bronze {
  background: linear-gradient(135deg, #B0714E 0%, #D19A76 100%);
  border-color: #8F5A3E;
  box-shadow: 0 2px 0 rgba(143, 90, 62, 0.4);
}

.rank-seal.plain {
  background: #FFFDF7;
  border-color: #E3DCC8;
}

.rank-num {
  font-size: 14px;
  font-weight: 800;
  color: #FFF9EC;
}

.rank-seal.plain .rank-num {
  color: #6B7A6E;
}

.pet-info {
  flex: 1;
  min-width: 0;
}

.pet-name {
  display: block;
  font-size: 13px;
  font-weight: 800;
  color: #2C3A2F;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.pet-types {
  margin-top: 5px;
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}

.score {
  flex-shrink: 0;
  text-align: right;
}

.score-num {
  display: block;
  font-size: 16px;
  font-weight: 800;
  color: #A97F35;
}

.result-item.podium-second .score-num {
  color: #6F7A8C;
}

.result-item.podium-third .score-num {
  color: #B0714E;
}

.match-type {
  display: block;
  margin-top: 2px;
  font-size: 9.5px;
  font-weight: 700;
  color: #6B7A6E;
}

/* ===== 空态 ===== */
.empty-state {
  padding: 22px 13px;
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
}

.empty-icon {
  width: 44px;
  height: 44px;
  border-radius: 14px;
  background: #F2EBDA;
  border: 1.5px dashed #CFC7AE;
  display: flex;
  align-items: center;
  justify-content: center;
}

.empty-title {
  display: block;
  margin-top: 10px;
  font-size: 13.5px;
  font-weight: 800;
  color: #2C3A2F;
}

.empty-sub {
  display: block;
  margin-top: 5px;
  font-size: 11px;
  line-height: 1.5;
  color: #6B7A6E;
}

/* ===== 说明 ===== */
.tip-list {
  margin-top: 11px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.tip-line {
  display: flex;
  align-items: flex-start;
  gap: 6px;
}

.tip-item {
  flex: 1;
  font-size: 11px;
  line-height: 1.55;
  color: #6B7A6E;
}

.bottom-space {
  height: calc(28px + env(safe-area-inset-bottom));
}
</style>
