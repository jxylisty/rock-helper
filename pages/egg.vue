<template>
  <view class="page">
    <AppHeader theme="gold" :title="headerTitle" :subtitle="headerSubtitle" leftAction="back" />

    <!-- 顶部 Segmented Tabs -->
    <view class="tab-header-wrap">
      <view class="segmented-tabs">
        <view
          v-for="tab in tabs"
          :key="tab.key"
          class="tab-btn"
          :class="{ active: currentTab === tab.key }"
          hover-class="press-down"
          @click="currentTab = tab.key"
        >
          <AppIcon :name="tab.icon" :size="12" :color="currentTab === tab.key ? '#FFFDF7' : '#7A725D'" />
          <text class="tab-btn-text">{{ tab.label }}</text>
        </view>
      </view>
    </view>

    <scroll-view scroll-y class="content" :show-scrollbar="false">
      <!-- ===== TAB 1: 蛋壳数据预测 ===== -->
      <template v-if="currentTab === 'predict'">
        <view class="section card first-section">
          <view class="section-head">
            <view class="section-head-left">
              <view class="section-icon gold">
                <AppIcon name="egg" :size="13" color="#FFF9EC" />
              </view>
              <view class="section-head-title-wrap">
                <text class="section-title">蛋壳数据反查</text>
                <text class="section-head-sub">输入蛋的身高与重量，推算所属精灵及大块头极值</text>
              </view>
            </view>
          </view>

          <view class="field-grid">
            <view class="field">
              <view class="field-head">
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
              <view class="pet-avatar">
                <RemoteImage class="pet-avatar-img" :src="resolvePetImage(predImg(pred))" mode="aspectFit" />
              </view>
              <view class="pet-info">
                <view class="pet-name-row">
                  <text class="pet-name">{{ pred.name }}</text>
                  <view
                    v-if="getPetBadge(pred.petId)"
                    class="pet-badge"
                    :class="{ leader: isLeaderPet(pred.petId) }"
                  >
                    <text>{{ getPetBadge(pred.petId) }}</text>
                  </view>
                  <view v-if="predBulk(pred).isBulk" class="pet-badge bulk">
                    <text>大块头</text>
                  </view>
                </view>
                <view class="pet-types">
                  <TypeBadge
                    v-for="t in predTypes(pred)"
                    :key="t"
                    :label="t"
                    :color="getTypeColor(t)"
                    compact
                  />
                </view>
                <view v-if="predMeta(pred).length" class="pet-meta">
                  <view v-for="meta in predMeta(pred)" :key="meta" class="meta-chip">
                    <text class="meta-chip-text">{{ meta }}</text>
                  </view>
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

        <view v-if="bulkJudge" class="section card">
          <view class="section-head">
            <view class="section-head-left">
              <view class="section-icon bulk">
                <AppIcon name="scale" :size="11" color="#FFF9EC" />
              </view>
              <text class="section-title">大块头判定</text>
            </view>
            <view class="bulk-verdict" :class="{ pass: bulkJudge.isBulk }">
              <text class="bulk-verdict-text">{{ bulkJudge.isBulk ? '✓ 大块头' : '未达标' }}</text>
            </view>
          </view>
          <text class="bulk-target">按 {{ bulkJudge.name }} 蛋范围（{{ bulkJudge.rangeLabel }}）判定</text>
          <view class="bulk-rows">
            <view class="bulk-row">
              <text class="bulk-row-label">身高</text>
              <text class="bulk-row-value mono">{{ bulkJudge.height }}m</text>
              <text class="bulk-row-need mono">≥ {{ fmt(bulkJudge.heightThreshold) }}m</text>
              <text class="bulk-row-state" :class="bulkJudge.heightOk ? 'ok' : 'fail'">
                {{ bulkJudge.heightOk ? '达标' : '差 ' + fmt(bulkJudge.heightThreshold - bulkJudge.height) + 'm' }}
              </text>
            </view>
            <view class="bulk-row">
              <text class="bulk-row-label">重量</text>
              <text class="bulk-row-value mono">{{ bulkJudge.weight }}kg</text>
              <text class="bulk-row-need mono">≥ {{ fmt(bulkJudge.weightThreshold) }}kg</text>
              <text class="bulk-row-state" :class="bulkJudge.weightOk ? 'ok' : 'fail'">
                {{ bulkJudge.weightOk ? '达标' : '差 ' + fmt(bulkJudge.weightThreshold - bulkJudge.weight) + 'kg' }}
              </text>
            </view>
          </view>
          <text class="bulk-note">判定口径：身高与体重均达到该精灵蛋范围的 98%（双维度同时达标）。</text>
        </view>

        <view class="section card">
          <view class="section-head">
            <view class="section-head-left">
              <view class="section-icon plain">
                <AppIcon name="info" :size="11" color="#6B7A6E" />
              </view>
              <text class="section-title">使用要点</text>
            </view>
          </view>
          <view class="tip-list">
            <view class="tip-line">
              <AppIcon name="check" :size="9" color="#1E7A46" :stroke-width="3" />
              <text class="tip-item">身高和重量在游戏内蛋详情查看，保留两位小数即可精确命中。</text>
            </view>
            <view class="tip-line">
              <AppIcon name="check" :size="9" color="#1E7A46" :stroke-width="3" />
              <text class="tip-item">同一进化链共享同一套蛋尺寸（如阿米亚特 / 阿米樱 / 罗隐结果一致），具体孵出哪阶由游戏决定。</text>
            </view>
            <view class="tip-line">
              <AppIcon name="check" :size="9" color="#1E7A46" :stroke-width="3" />
              <text class="tip-item">结果按接近度排序：完全匹配 &gt; 单维命中 &gt; 接近；身高体重差距过大不会硬凑结果。</text>
            </view>
            <view class="tip-line">
              <AppIcon name="check" :size="9" color="#1E7A46" :stroke-width="3" />
              <text class="tip-item">身高与体重同时达到该精灵范围的 98% 即为大块头蛋，命中的结果会带红色徽章。</text>
            </view>
            <view class="tip-line">
              <AppIcon name="check" :size="9" color="#1E7A46" :stroke-width="3" />
              <text class="tip-item">点击结果卡可直达精灵详情，查看种族值与技能池。</text>
            </view>
          </view>
        </view>

      </template>

      <!-- ===== TAB 2: 大块头专属图鉴 ===== -->
      <template v-else-if="currentTab === 'bulkLookup'">
        <!-- 精灵选择与搜索卡片 -->
        <view class="section card first-section">
          <view class="section-head">
            <view class="section-head-left">
              <view class="section-icon gold">
                <AppIcon name="scale" :size="13" color="#FFF9EC" />
              </view>
              <view class="section-head-title-wrap">
                <text class="section-title">大块头精准反查</text>
                <text class="section-head-sub">指定特定精灵，速查蛋尺寸与各阶进化大块头达标线</text>
              </view>
            </view>
          </view>

          <!-- 搜索输入框 -->
          <view class="bulk-search-bar">
            <AppIcon name="search" :size="12" color="#A3AE9F" />
            <input
              v-model="bulkSearchKeyword"
              class="bulk-search-input"
              placeholder="输入精灵名称或编号 (如 罗隐 / 107)"
              placeholder-class="input-placeholder"
            />
            <view v-if="bulkSearchKeyword" class="search-clear" @click="bulkSearchKeyword = ''">
              <AppIcon name="close" :size="9" color="#8A6A2C" :stroke-width="2.8" />
            </view>
          </view>

          <!-- 快捷热门标签 -->
          <view class="pop-tags-row">
            <text class="pop-tags-label">推荐：</text>
            <view class="pop-tags-list">
              <view
                v-for="pop in popularPets"
                :key="pop.id"
                class="pop-tag"
                :class="{ active: selectedBulkPetId === pop.id }"
                hover-class="press-down"
                @click="selectBulkPet(pop.id)"
              >
                <text class="pop-tag-text">{{ pop.name }}</text>
              </view>
            </view>
          </view>

          <!-- 下拉匹配列表 -->
          <view v-if="filteredBulkPets.length > 0" class="bulk-dropdown">
            <view
              v-for="cand in filteredBulkPets"
              :key="cand.petId"
              class="dropdown-item"
              hover-class="press-down"
              @click="selectBulkPet(cand.petId)"
            >
              <image class="dropdown-avatar" :src="resolvePetImage(cand.stages?.[0]?.icon || '')" mode="aspectFit" />
              <view class="dropdown-info">
                <text class="dropdown-name">{{ cand.name }}</text>
                <text class="dropdown-groups">{{ (cand.eggGroups || []).join(' / ') }}</text>
              </view>
            </view>
          </view>
        </view>

        <!-- 当前选中精灵详情 -->
        <view v-if="currentBulkPet" class="bulk-detail-section">
          <!-- 蛋与精灵基本信息卡片 -->
          <view class="section card profile-card">
            <view class="profile-head">
              <view class="profile-avatar-wrap">
                <RemoteImage
                  class="profile-avatar"
                  :src="resolvePetImage(currentBulkPet.stages?.[0]?.icon || '')"
                  mode="aspectFit"
                />
              </view>
              <view class="profile-meta">
                <view class="profile-title-row">
                  <text class="profile-name">{{ currentBulkPet.name }}</text>
                  <view class="egg-type-pill"><text>{{ currentBulkPet.eggType }}蛋</text></view>
                </view>
                <view class="profile-chips">
                  <view v-if="currentBulkPet.hatchLabel" class="chip"><text>孵化 {{ currentBulkPet.hatchLabel }}</text></view>
                  <view v-if="currentBulkPet.eggGroups.length" class="chip egg-group-chip">
                    <text class="group-lead">想生蛋组：</text>
                    <text class="group-names">{{ currentBulkPet.eggGroups.join(' / ') }}</text>
                  </view>
                  <view class="chip"><text>雄性率 {{ currentBulkPet.malePercent }}%</text></view>
                </view>
              </view>
            </view>

            <!-- 大块头实战孵化提示 -->
            <view class="bulk-breed-guide">
              <view class="guide-head">
                <AppIcon name="sparkles" :size="11" color="#A97F35" />
                <text class="guide-title">大块头孵化诀窍</text>
                <text class="guide-sub">同种 10 窝直出</text>
              </view>
              <text class="guide-text">
                大块头无需跨种族复杂规划！一般直接用 10 只同种精灵（5 公 5 母）放满 10 窝，即可保证 100% 产出该精灵蛋，专注冲刺 98% 极限体型。
              </text>
            </view>

            <!-- 产出蛋种与炫彩概率 (用户需求 5) -->
            <view v-if="currentBulkPet.glassPiece || currentBulkPet.shinyMiraclePercent" class="glass-banner">
              <view class="glass-left">
                <image
                  v-if="currentBulkPet.glassPiece && currentBulkPet.glassPiece.icon"
                  class="glass-icon-lg"
                  :src="currentBulkPet.glassPiece.icon"
                  mode="aspectFit"
                />
                <view class="glass-names">
                  <text class="glass-label">产出蛋种</text>
                  <text class="glass-title">{{ currentBulkPet.glassPiece ? currentBulkPet.glassPiece.name : currentBulkPet.name + '蛋' }}</text>
                </view>
              </view>
              <view class="glass-probs">
                <view class="prob-tag">
                  <text class="prob-label">炫彩概率</text>
                  <text class="prob-val mono text-gold">{{ currentBulkPet.shinyMiraclePercent || 0 }}%</text>
                </view>
              </view>
            </view>

            <!-- 蛋大块头门槛 (98% 双指标) -->
            <view class="egg-specs-block">
              <view class="block-title-row">
                <text class="block-title">🥚 蛋壳尺寸与 98% 大块头标准线</text>
                <text class="block-sub">双指标同时满足即为大块头蛋</text>
              </view>

              <view class="size-specs-grid">
                <!-- 身高 -->
                <view class="spec-card">
                  <view class="spec-head">
                    <AppIcon name="ruler" :size="10" color="#A97F35" />
                    <text class="spec-title">蛋壳身高</text>
                  </view>
                  <text class="spec-range mono">{{ currentBulkPet.minHeight }} ~ {{ currentBulkPet.maxHeight }} m</text>
                  <view class="bulk-target-tag">
                    <text class="target-lbl">大块头需</text>
                    <text class="target-val mono">≥ {{ currentBulkPet.eggBulkH }} m</text>
                  </view>
                  <view class="gauge-wrap">
                    <view class="gauge-bar">
                      <view class="gauge-fill" style="width: 98%"></view>
                      <view class="gauge-pin" style="left: 98%"></view>
                    </view>
                    <view class="gauge-labels">
                      <text class="mono">{{ currentBulkPet.minHeight }}m</text>
                      <text class="mono text-gold font-bold">98%线 ({{ currentBulkPet.eggBulkH }}m)</text>
                      <text class="mono">{{ currentBulkPet.maxHeight }}m</text>
                    </view>
                  </view>
                </view>

                <!-- 体重 -->
                <view class="spec-card">
                  <view class="spec-head">
                    <AppIcon name="scale" :size="10" color="#A97F35" />
                    <text class="spec-title">蛋壳重量</text>
                  </view>
                  <text class="spec-range mono">{{ currentBulkPet.minWeight }} ~ {{ currentBulkPet.maxWeight }} kg</text>
                  <view class="bulk-target-tag">
                    <text class="target-lbl">大块头需</text>
                    <text class="target-val mono">≥ {{ currentBulkPet.eggBulkW }} kg</text>
                  </view>
                  <view class="gauge-wrap">
                    <view class="gauge-bar">
                      <view class="gauge-fill" style="width: 98%"></view>
                      <view class="gauge-pin" style="left: 98%"></view>
                    </view>
                    <view class="gauge-labels">
                      <text class="mono">{{ currentBulkPet.minWeight }}kg</text>
                      <text class="mono text-gold font-bold">98%线 ({{ currentBulkPet.eggBulkW }}kg)</text>
                      <text class="mono">{{ currentBulkPet.maxWeight }}kg</text>
                    </view>
                  </view>
                </view>
              </view>
            </view>
          </view>

          <!-- 全进化形态大块头对比图谱 -->
          <view class="section card">
            <view class="section-head">
              <view class="section-icon gold">
                <AppIcon name="sparkles" :size="11" color="#FFF9EC" />
              </view>
              <text class="section-title">全进化形态大块头标准线</text>
            </view>

            <view v-if="currentBulkPet.stages && currentBulkPet.stages.length > 0" class="stages-timeline">
              <view
                v-for="st in currentBulkPet.stages"
                :key="st.id"
                class="stage-card"
                hover-class="press-down"
                @click="goToDetail(st.id)"
              >
                <view class="stage-head">
                  <view class="stage-badge" :class="{ leader: st.condition === '首领化' }">
                    <text>{{ st.condition === '首领化' ? '首领化形态' : (st.stage === 1 ? '初阶形态' : (st.stage === 2 ? '二阶形态' : '终阶形态')) }}</text>
                  </view>
                  <text v-if="st.condition && st.condition !== '初始形态'" class="stage-cond">{{ st.condition }}</text>
                  <view class="stage-detail-link">
                    <text>详情</text>
                    <AppIcon name="chevron-right" :size="9" color="#8C836E" />
                  </view>
                </view>

                <view class="stage-body">
                  <image class="stage-avatar" :src="resolvePetImage(st.icon)" mode="aspectFit" />
                  <view class="stage-info">
                    <view class="stage-name-row">
                      <text class="stage-name">{{ st.name }}</text>
                      <view class="stage-types">
                        <TypeBadge
                          v-for="t in st.types"
                          :key="t"
                          :label="t"
                          :color="getTypeColor(t)"
                          compact
                        />
                      </view>
                    </view>

                    <view class="stage-standards">
                      <view class="std-row">
                        <text class="std-label">身高标准：</text>
                        <text class="std-range mono">{{ st.minH }}~{{ st.maxH }}m</text>
                        <text class="std-bulk mono text-gold font-bold">大块头需 ≥ {{ st.bulkH }}m</text>
                      </view>
                      <view class="std-row">
                        <text class="std-label">体重标准：</text>
                        <text class="std-range mono">{{ st.minW }}~{{ st.maxW }}kg</text>
                        <text class="std-bulk mono text-gold font-bold">大块头需 ≥ {{ st.bulkW }}kg</text>
                      </view>
                    </view>
                  </view>
                </view>
              </view>
            </view>

            <!-- 底部直通繁育规划按钮 -->
            <view class="planner-jump-wrap">
              <view class="btn-primary" hover-class="press-down" @click="goToPlannerWithPet(currentBulkPet.petId)">
                <AppIcon name="sparkles" :size="12" color="#FFF9EC" />
                <text class="btn-primary-text">以 {{ currentBulkPet.name }} 为母本去摆窝规划</text>
              </view>
            </view>
          </view>
        </view>
      </template>

      <view class="bottom-space"></view>
    </scroll-view>
  </view>
</template>

<script>
import AppHeader from '@/components/AppHeader/AppHeader.vue'
import AppIcon from '@/components/AppIcon/AppIcon.vue'
import TypeBadge from '@/components/TypeBadge/TypeBadge.vue'
import RemoteImage from '@/components/RemoteImage/RemoteImage.vue'
import { predictEgg, judgeBulkEgg } from '@/data/config/eggData.js'
import { petEvolutionSizes } from '@/data/config/petEvolutionSizes.js'
import { petTypes, petDetail } from '@/data/pet/pet_detail.js'
import { petIndex } from '@/data/pet/pet_index.js'
import { hasLeaderFormPetId } from '@/data/pet/leader_forms.js'
import { resolveAssetPath } from '@/utils/asset-path.js'
import { goDetailPage } from '@/utils/nav.js'

export default {
  components: {
    AppHeader,
    AppIcon,
    TypeBadge,
    RemoteImage
  },
  data() {
    return {
      currentTab: 'predict',
      tabs: [
        { key: 'predict', label: '蛋壳预测', icon: 'egg' },
        { key: 'bulkLookup', label: '大块头图鉴', icon: 'scale' }
      ],
      height: '',
      weight: '',
      queryHeight: 0,
      queryWeight: 0,
      predictions: [],
      hasSearched: false,
      bulkSearchKeyword: '',
      selectedBulkPetId: 107,
      targetPetIdForPlanner: null,
      popularPetNames: [
        '罗隐', '阿米亚特', '喵喵', '水蓝蓝', '火花', '音速犬', '雪娃娃', '白金独角兽'
      ]
    }
  },
  onLoad(options) {
    if (options && options.tab) {
      if (options.tab === 'bulk' || options.tab === 'bulkLookup') {
        this.currentTab = 'bulkLookup'
      } else if (options.tab === 'planner') {
        uni.redirectTo({
          url: `/pages/breeding-planner${options.petId || options.targetPetId ? '?targetPetId=' + (options.petId || options.targetPetId) : ''}`
        })
        return
      }
    }
    if (options && options.petId) {
      const pid = Number(options.petId)
      this.selectedBulkPetId = pid
      this.targetPetIdForPlanner = pid
    }
  },
  computed: {
    headerTitle() {
      if (this.currentTab === 'bulkLookup') return '大块头图鉴'
      if (this.currentTab === 'planner') return '孵蛋摆窝攻略'
      return '孵蛋预测'
    },
    headerSubtitle() {
      if (this.currentTab === 'bulkLookup') return '专属反查 · 全进化形态门槛'
      if (this.currentTab === 'planner') return '按蛋组选母本 · 摆窝方案'
      return '蛋壳数据 · 命中推算'
    },
    // 推荐标签按名字解析 seq（官方编号曾整体偏移，禁止写死 id）
    popularPets() {
      const seqByName = {}
      for (const entry of Object.values(petIndex)) {
        if (entry.name && !seqByName[entry.name]) seqByName[entry.name] = entry.seq
      }
      return this.popularPetNames
        .map((name) => ({ name, id: seqByName[name] }))
        .filter((item) => item.id)
    },
    currentBulkPet() {
      return petEvolutionSizes[String(this.selectedBulkPetId)] || petEvolutionSizes['107'] || null
    },
    allBulkPetsList() {
      return Object.values(petEvolutionSizes)
    },
    filteredBulkPets() {
      const kw = (this.bulkSearchKeyword || '').trim().toLowerCase()
      if (!kw) return []
      return this.allBulkPetsList.filter(p => {
        return p.name.toLowerCase().includes(kw) || String(p.petId).includes(kw)
      }).slice(0, 15)
    },
    // 大块头判定面板：优先展示已达大块头的候选，否则取"完全匹配"得分最高者
    // 大块头判定面板：跟随预测列表第一名（与展示一致，达标者在列表里另有徽章标记）
    bulkJudge() {
      const pred = this.predictions[0]
      if (!pred) return null
      const judge = judgeBulkEgg(pred, this.queryHeight, this.queryWeight)
      const rangeLabel = `${this.fmt(pred.minHeight)}~${this.fmt(pred.maxHeight)}m / ${this.fmt(pred.minWeight)}~${this.fmt(pred.maxWeight)}kg`
      return {
        ...judge,
        name: pred.name,
        height: this.queryHeight,
        weight: this.queryWeight,
        rangeLabel
      }
    }
  },
  methods: {
    fmt(value) {
      const num = Number(value) || 0
      return String(Math.round(num * 1000) / 1000)
    },
    predBulk(pred) {
      return judgeBulkEgg(pred, this.queryHeight, this.queryWeight)
    },
    predict() {
      const h = parseFloat(this.height)
      const w = parseFloat(this.weight)

      if (Number.isNaN(h) || Number.isNaN(w)) {
        uni.showToast({ title: '请输入有效数值', icon: 'none' })
        return
      }

      this.queryHeight = h
      this.queryWeight = w
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
    resolvePetImage(src) {
      return resolveAssetPath(src)
    },
    predImg(pred) {
      return petDetail[String(pred.petId)]?.[0]?.img || ''
    },
    predTypes(pred) {
      const types = petDetail[String(pred.petId)]?.[0]?.type
      return Array.isArray(types) && types.length ? types : pred.type
    },
    predMeta(pred) {
      const metas = []
      if (pred.hatchLabel) metas.push(`孵化 ${pred.hatchLabel}`)
      if (Array.isArray(pred.eggGroups) && pred.eggGroups.length) {
        metas.push(pred.eggGroups.join('/'))
      }
      if (pred.eggType && pred.eggType !== '普通') metas.push(pred.eggType)
      return metas.slice(0, 3)
    },
    isLeaderPet(petId) {
      return hasLeaderFormPetId(petId)
    },
    getPetBadge(petId) {
      if (this.isLeaderPet(petId)) return '首领化'
      const variants = petDetail[String(petId)]
      if (Array.isArray(variants) && variants.length > 1) return '多形态'
      return ''
    },
    getMatchLabel(type) {
      if (type === 'full') return '完全匹配'
      if (type === 'height') return '身高命中'
      if (type === 'weight') return '重量命中'
      if (type === 'near') return '接近'
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
      goDetailPage(id)
    },
    selectBulkPet(petId) {
      this.selectedBulkPetId = Number(petId)
      this.bulkSearchKeyword = ''
    },
    handleViewPetBulk(petId) {
      this.selectedBulkPetId = Number(petId)
      this.currentTab = 'bulkLookup'
    },
    goToPlannerWithPet(petId) {
      uni.navigateTo({
        url: `/pages/breeding-planner?targetPetId=${petId}`
      })
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

.first-section {
  margin-top: 10px;
}

.section-head-title-wrap {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.section-title {
  font-size: 14px;
  font-weight: 800;
  color: #2C3A2F;
}

.section-head-sub {
  font-size: 11px;
  color: #6B7A6E;
  line-height: 1.3;
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

.pet-avatar {
  flex-shrink: 0;
  width: 46px;
  height: 46px;
  border-radius: 12px;
  background:
    radial-gradient(circle at 50% 62%, rgba(201, 161, 78, 0.10) 0, transparent 62%),
    #FFFFFF;
  border: 1px solid rgba(227, 220, 200, 0.8);
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
}

.pet-avatar-img {
  width: 100%;
  height: 100%;
}

.pet-info {
  flex: 1;
  min-width: 0;
}

.pet-name-row {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
}

.pet-name {
  font-size: 13px;
  font-weight: 800;
  color: #2C3A2F;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 100%;
}

.pet-code {
  flex-shrink: 0;
  font-size: 10.5px;
  font-weight: 700;
  color: #A3AE9F;
}

.pet-badge {
  flex-shrink: 0;
  height: 18px;
  padding: 0 7px;
  border-radius: 999px;
  background: #F2EBDA;
  border: 1px solid #D8D0BA;
  display: inline-flex;
  align-items: center;
}

.pet-badge text {
  font-size: 9.5px;
  font-weight: 700;
  color: #6B7A6E;
  white-space: nowrap;
}

.pet-badge.leader {
  background: #FBF3DD;
  border-color: #D9B96A;
}

.pet-badge.leader text {
  color: #A97F35;
}

.pet-badge.bulk {
  background: linear-gradient(135deg, #B05A2E 0%, #D98A4A 100%);
  border-color: #8F4A24;
}

.pet-badge.bulk text {
  color: #FFF9EC;
}

/* ===== 大块头判定 ===== */
.section-icon.bulk {
  background: linear-gradient(135deg, #B05A2E 0%, #D98A4A 100%);
  border-color: #8F4A24;
  box-shadow: 0 2px 0 rgba(143, 74, 36, 0.4);
}

.bulk-verdict {
  flex-shrink: 0;
  height: 22px;
  padding: 0 10px;
  border-radius: 999px;
  background: #F2EBDA;
  border: 1px solid #D8D0BA;
  display: inline-flex;
  align-items: center;
}

.bulk-verdict-text {
  font-size: 10.5px;
  font-weight: 800;
  color: #6B7A6E;
}

.bulk-verdict.pass {
  background: linear-gradient(135deg, #B05A2E 0%, #D98A4A 100%);
  border-color: #8F4A24;
  box-shadow: 0 2px 0 rgba(143, 74, 36, 0.35);
}

.bulk-verdict.pass .bulk-verdict-text {
  color: #FFF9EC;
}

.bulk-target {
  display: block;
  margin-top: 8px;
  font-size: 10.5px;
  color: #6B7A6E;
}

.bulk-rows {
  margin-top: 9px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.bulk-row {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 10px;
  border-radius: 11px;
  background: #F7F1E3;
  border: 1px solid #E3DCC8;
}

.bulk-row-label {
  flex-shrink: 0;
  width: 30px;
  font-size: 11px;
  font-weight: 700;
  color: #6B7A6E;
}

.bulk-row-value {
  flex: 1;
  font-size: 12.5px;
  font-weight: 800;
  color: #2C3A2F;
}

.bulk-row-need {
  flex-shrink: 0;
  font-size: 10.5px;
  font-weight: 700;
  color: #8A6A2C;
}

.bulk-row-state {
  flex-shrink: 0;
  min-width: 52px;
  text-align: right;
  font-size: 10.5px;
  font-weight: 800;
}

.bulk-row-state.ok {
  color: #1E7A46;
}

.bulk-row-state.fail {
  color: #B05A2E;
}

.bulk-note {
  display: block;
  margin-top: 9px;
  font-size: 10px;
  line-height: 1.5;
  color: #A3AE9F;
}

.pet-types {
  margin-top: 5px;
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}

.pet-meta {
  margin-top: 5px;
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}

.meta-chip {
  height: 16px;
  padding: 0 6px;
  border-radius: 999px;
  background: #FBF3DD;
  border: 1px solid #E3DCC8;
  display: inline-flex;
  align-items: center;
}

.meta-chip-text {
  font-size: 9px;
  font-weight: 700;
  color: #8A6A2C;
  white-space: nowrap;
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

/* ===== 顶部 Segmented Tabs ===== */
.tab-header-wrap {
  padding: 8px 14px 4px;
}

.segmented-tabs {
  display: flex;
  background: #EFE8D6;
  padding: 3px;
  border-radius: 14px;
  border: 1px solid #D8CEB6;
}

.tab-btn {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 5px;
  padding: 6px 0;
  border-radius: 11px;
  transition: all 0.2s ease;
}

.tab-btn.active {
  background: #1E7A46;
  box-shadow: 0 2px 4px rgba(30, 122, 70, 0.25);
}

.tab-btn-text {
  font-size: 12px;
  color: #6C6451;
  font-weight: 600;
}

.tab-btn.active .tab-btn-text {
  color: #FFFDF7;
  font-weight: bold;
}

/* ===== 大块头图鉴面板样式 ===== */
.bulk-search-bar {
  display: flex;
  align-items: center;
  gap: 8px;
  background: #FAF6ED;
  border: 1.5px solid #E2D9C4;
  border-radius: 12px;
  padding: 7px 10px;
  margin-top: 4px;
}

.bulk-search-input {
  flex: 1;
  font-size: 12.5px;
  color: #2C3A2F;
}

.search-clear {
  padding: 2px 4px;
}

.pop-tags-row {
  display: flex;
  align-items: center;
  margin-top: 8px;
  gap: 4px;
}

.pop-tags-label {
  font-size: 10.5px;
  color: #8C836E;
  flex-shrink: 0;
}

.pop-tags-list {
  display: flex;
  flex-wrap: wrap;
  gap: 5px;
}

.pop-tag {
  padding: 3px 8px;
  background: #F4EFE2;
  border: 1px solid #D9CFB8;
  border-radius: 10px;
}

.pop-tag.active {
  background: #C9A14E;
  border-color: #A97F35;
}

.pop-tag-text {
  font-size: 10.5px;
  color: #5D5643;
}

.pop-tag.active .pop-tag-text {
  color: #FFFFFF;
  font-weight: bold;
}

/* 搜索候选下拉 */
.bulk-dropdown {
  margin-top: 6px;
  max-height: 180px;
  overflow-y: auto;
  border-top: 1px dashed #E2D9C4;
  padding-top: 4px;
}

.dropdown-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 8px;
  border-radius: 8px;
}

.dropdown-avatar {
  width: 24px;
  height: 24px;
}

.dropdown-info {
  flex: 1;
  display: flex;
  flex-direction: column;
}

.dropdown-name {
  font-size: 12px;
  font-weight: 600;
  color: #2C3A2F;
}

.dropdown-groups {
  font-size: 9.5px;
  color: #8C836E;
}

.dropdown-code {
  font-size: 10.5px;
  color: #A97F35;
}

/* 精灵基本档案卡 */
.profile-card {
  padding: 12px 14px;
}

.profile-head {
  display: flex;
  align-items: center;
  gap: 12px;
}

.profile-avatar-wrap {
  width: 52px;
  height: 52px;
  border-radius: 26px;
  background: #F4ECE0;
  border: 1.5px solid #E6D8BE;
  display: flex;
  align-items: center;
  justify-content: center;
}

.profile-avatar {
  width: 44px;
  height: 44px;
}

.profile-meta {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.profile-title-row {
  display: flex;
  align-items: center;
  gap: 6px;
}

.profile-name {
  font-size: 16px;
  font-weight: 800;
  color: #2C3A2F;
}

.profile-code {
  font-size: 12px;
  color: #A97F35;
  font-weight: bold;
}

.egg-type-pill {
  background: #F4E7CC;
  border: 1px solid #D9B96A;
  color: #8A6A2C;
  font-size: 9.5px;
  padding: 1px 6px;
  border-radius: 8px;
  font-weight: bold;
}

.profile-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}

.chip {
  background: #F2ECDC;
  border-radius: 6px;
  padding: 2px 6px;
  font-size: 10px;
  color: #6C6452;
}

.chip.egg-group-chip {
  background: #FFF6DE;
  border: 1px solid #C9A14E;
  color: #2C3A2F;
}
.group-lead {
  color: #A97F35;
  font-weight: 800;
}
.group-names {
  font-weight: 800;
  color: #1E7A46;
}

/* 大块头实战诀窍卡片 */
.bulk-breed-guide {
  margin-top: 10px;
  padding: 8px 10px;
  background: #EFF7EF;
  border: 1px solid #BFDCC6;
  border-radius: 10px;
}
.guide-head {
  display: flex;
  align-items: center;
  gap: 5px;
  margin-bottom: 4px;
}
.guide-title {
  font-size: 11px;
  font-weight: 800;
  color: #1E7A46;
}
.guide-sub {
  font-size: 9.5px;
  color: #6B7A6E;
  margin-left: auto;
}
.guide-text {
  font-size: 10.5px;
  color: #2C3A2F;
  line-height: 1.45;
}

/* 官方炫彩横幅 */
.glass-banner {
  margin-top: 10px;
  padding: 8px 10px;
  background: linear-gradient(135deg, #FFF7E6 0%, #FFFDF8 100%);
  border: 1px solid #E8D3A3;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.glass-left {
  display: flex;
  align-items: center;
  gap: 8px;
}

.glass-icon-lg {
  width: 32px;
  height: 32px;
}

.glass-names {
  display: flex;
  flex-direction: column;
}

.glass-label {
  font-size: 9px;
  color: #A97F35;
  font-weight: 600;
}

.glass-title {
  font-size: 12.5px;
  font-weight: 800;
  color: #8A6A2C;
}

.glass-probs {
  display: flex;
  gap: 8px;
}

.prob-tag {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
}

.prob-label {
  font-size: 9px;
  color: #8C836E;
}

.prob-val {
  font-size: 12px;
  font-weight: bold;
}

/* 蛋大块头尺寸卡片 */
.egg-specs-block {
  margin-top: 12px;
  padding-top: 10px;
  border-top: 1px dashed #E2D8BF;
}

.block-title-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
}

.block-title {
  font-size: 12.5px;
  font-weight: bold;
  color: #2C3A2F;
}

.block-sub {
  font-size: 10px;
  color: #8C836E;
}

.size-specs-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
}

.spec-card {
  background: #FAF6ED;
  border: 1px solid #E4DCBF;
  border-radius: 12px;
  padding: 8px 10px;
}

.spec-head {
  display: flex;
  align-items: center;
  gap: 4px;
}

.spec-title {
  font-size: 11px;
  color: #7D7563;
  font-weight: 600;
}

.spec-range {
  font-size: 11.5px;
  color: #2C3A2F;
  font-weight: bold;
  margin-top: 2px;
  display: block;
}

.bulk-target-tag {
  display: flex;
  align-items: center;
  gap: 4px;
  margin-top: 4px;
  background: #FFF0CC;
  border: 1px solid #E5C37A;
  padding: 2px 6px;
  border-radius: 6px;
}

.target-lbl {
  font-size: 9px;
  color: #8A6A2C;
  font-weight: bold;
}

.target-val {
  font-size: 11px;
  color: #A97F35;
  font-weight: 800;
}

.gauge-wrap {
  margin-top: 6px;
}

.gauge-bar {
  height: 6px;
  background: #E5DECD;
  border-radius: 3px;
  position: relative;
}

.gauge-fill {
  height: 100%;
  background: linear-gradient(90deg, #A7D8B5 0%, #C9A14E 100%);
  border-radius: 3px;
}

.gauge-pin {
  position: absolute;
  top: -3px;
  width: 4px;
  height: 12px;
  background: #C9A14E;
  border-radius: 2px;
  box-shadow: 0 0 4px rgba(201, 161, 78, 0.8);
}

.gauge-labels {
  display: flex;
  justify-content: space-between;
  margin-top: 3px;
  font-size: 8px;
  color: #8C836E;
}

/* 全进化形态大块头对比图谱 */
.stages-timeline {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-top: 8px;
}

.stage-card {
  background: #FAF6ED;
  border: 1px solid #E2D9C4;
  border-radius: 12px;
  padding: 8px 10px;
}

.stage-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 6px;
}

.stage-badge {
  background: #EAE3CF;
  padding: 1px 6px;
  border-radius: 6px;
  font-size: 9.5px;
  font-weight: bold;
  color: #5D5643;
}

.stage-badge.leader {
  background: #FEE2E2;
  border: 1px solid #F87171;
  color: #DC2626;
}

.stage-cond {
  font-size: 10px;
  color: #8C836E;
}

.stage-detail-link {
  display: flex;
  align-items: center;
  gap: 2px;
  font-size: 10px;
  color: #8C836E;
}

.stage-body {
  display: flex;
  align-items: center;
  gap: 10px;
}

.stage-avatar {
  width: 38px;
  height: 38px;
  border-radius: 19px;
  background: #FFFDF8;
  border: 1px solid #E3D9C4;
}

.stage-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.stage-name-row {
  display: flex;
  align-items: center;
  gap: 6px;
}

.stage-name {
  font-size: 13px;
  font-weight: bold;
  color: #2C3A2F;
}

.stage-standards {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.std-row {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 10px;
}

.std-label {
  color: #7D7563;
  width: 52px;
}

.std-range {
  color: #2C3A2F;
}

.std-bulk {
  margin-left: auto;
}

.empty-stages {
  padding: 16px;
  text-align: center;
  font-size: 11.5px;
  color: #8C836E;
}

.planner-jump-wrap {
  margin-top: 12px;
}

.planner-tab-container {
  margin: 12px 14px 0;
}
</style>
