<template>
  <view class="page">
    <AppHeader theme="gold" title="阵容编辑" subtitle="搭配你的出战小队" leftAction="back">
      <template #right>
        <view class="header-capsule" hover-class="press-down" @click="saveTeam">
          <AppIcon name="check" :size="11" color="#FFF9EC" :stroke-width="3.2" />
          <text class="header-capsule-text">保存</text>
        </view>
      </template>
    </AppHeader>

    <scroll-view scroll-y class="content" :show-scrollbar="false">
      <view class="hero-card">
        <view class="hero-left">
          <view class="hero-icon">
            <AppIcon name="users" :size="17" color="#A97F35" />
          </view>
          <view class="hero-text">
            <text class="hero-title">我的阵容</text>
            <text class="hero-subtitle">先选最高形态精灵，再配置技能、个体与性格</text>
          </view>
        </view>
        <view class="hero-clear" hover-class="press-down" @click="clearTeam">
          <AppIcon name="trash" :size="10" color="#C64B38" :stroke-width="2.2" />
          <text class="hero-clear-text">清空</text>
        </view>
      </view>

      <view class="mode-strip">
        <view class="mode-head">
          <view class="mode-dot"></view>
          <text class="mode-title">AI 阵容诊断模式</text>
        </view>
        <view class="mode-group">
          <view
            v-for="option in decisionModeOptions"
            :key="option.value"
            class="mode-btn"
            :class="{ active: decisionMode === option.value }"
            hover-class="press-down"
            @click="setDecisionMode(option.value)"
          >
            <text class="mode-btn-text">{{ option.label }}</text>
          </view>
        </view>
      </view>

      <view class="team-grid">
        <view v-for="(slot, index) in team" :key="`slot-${index}`" class="team-card-wrap">
          <view v-if="!slot" class="team-card empty-card" hover-class="press-down" @click="openAddSelector(index)">
            <view class="empty-ring">
              <AppIcon name="plus" :size="16" color="#C9A14E" :stroke-width="2.8" />
            </view>
            <text class="empty-title">添加精灵</text>
            <text class="empty-sub">点击选择最高形态精灵</text>
          </view>

          <view v-else class="team-card">
            <view class="card-accent" :style="getAccentStyle(slot)"></view>

            <view class="card-main">
              <view class="pet-art">
                <view class="pet-glow"></view>
                <RemoteImage class="pet-image" :src="resolvePetImage(slot.image)" mode="aspectFit" />
              </view>

              <view class="pet-side">
                <view class="title-row">
                  <view class="title-main">
                    <text class="pet-name">{{ slot.petName }}</text>
                    <view class="type-row">
                      <TypeBadge
                        v-for="type in slot.types"
                        :key="`${slot.petId}-${type}`"
                        :label="type"
                        :color="getTypeColor(type)"
                        compact
                      />
                    </view>
                  </view>
                  <view class="panel-btn" hover-class="press-down" @click="togglePanel(index)">
                    <text class="panel-btn-text">{{ panelExpandedIndexes.includes(index) ? '收起' : '面板' }}</text>
                    <AppIcon
                      name="chevron-down"
                      :size="10"
                      color="#A97F35"
                      :stroke-width="3"
                      :class="{ 'flip-up': panelExpandedIndexes.includes(index) }"
                    />
                  </view>
                </view>

                <view class="info-row">
                  <text class="info-label">性格</text>
                  <text class="info-value">{{ getNatureSummary(slot) }}</text>
                </view>

                <view class="info-row">
                  <text class="info-label">个体</text>
                  <text class="info-value">{{ getIvSummary(slot) }}</text>
                </view>

                <view class="skill-row">
                  <view
                    v-for="(skill, skillIndex) in buildSkillItems(slot.skills)"
                    :key="`${slot.petId}-skill-${skillIndex}`"
                    class="skill-slot"
                    :class="{ empty: !skill.name }"
                    hover-class="press-down"
                    @click="openConfigEditor(index)"
                  >
                    <RemoteImage v-if="skill.icon" class="skill-icon" :src="resolvePetImage(skill.icon)" mode="aspectFit" />
                    <view v-else class="skill-fallback" :style="skill.name ? { background: getSkillFallbackColor(skill) } : { background: '#EDE6D3' }">
                      <AppIcon v-if="!skill.name" name="plus" :size="13" color="#A3AE9F" :stroke-width="2.6" />
                      <text v-else class="skill-fallback-text">{{ getSkillShortName(skill.name) }}</text>
                    </view>
                    <view class="skill-name-bar">
                      <text class="skill-name">{{ skill.name || '添加' }}</text>
                    </view>
                  </view>
                </view>
              </view>
            </view>

            <view v-if="panelExpandedIndexes.includes(index)" class="panel-preview">
              <view class="panel-preview-head">
                <view class="mode-dot"></view>
                <text class="panel-preview-title">面板预览</text>
                <text class="panel-preview-subtitle">按等级 · 个体 · 性格计算</text>
              </view>
              <StatPanel :stats="buildStatItems(slot.panel, slot.ivs)" :columns="3" />
            </view>

            <view class="card-actions">
              <view class="action-btn primary" hover-class="press-down" @click="openConfigEditor(index)">
                <AppIcon name="edit" :size="11" color="#FFF9EC" />
                <text class="action-btn-text">编辑配置</text>
              </view>
              <view class="action-btn danger" hover-class="press-down" @click="confirmDelete(index)">
                <AppIcon name="trash" :size="10" color="#C64B38" :stroke-width="2.2" />
                <text class="action-btn-text">移除</text>
              </view>
            </view>
          </view>
        </view>
      </view>

      <view class="analysis-grid">
        <view class="analysis-card ai-card">
          <view class="ai-card-head">
            <view class="ai-head-left">
              <view class="ai-head-icon">
                <AppIcon name="wand" :size="14" color="#FFF9EC" />
              </view>
              <view class="ai-head-text">
                <text class="analysis-title">AI 阵容诊断</text>
                <text class="analysis-sub">只展示推荐结果，不自动修改阵容</text>
              </view>
            </view>
            <view v-if="activeTeamSlots.length" class="ai-score-seal">
              <AppIcon name="star" :size="9" color="#FFF6DE" />
              <text class="ai-score-num">{{ getDecisionScore(teamDecision) }}</text>
            </view>
          </view>

          <view v-if="!activeTeamSlots.length" class="ai-empty">
            <view class="empty-ring small">
              <AppIcon name="wand" :size="13" color="#C9A14E" />
            </view>
            <text class="analysis-empty center">选择至少 1 只精灵后生成阵容诊断</text>
          </view>

          <template v-else>
            <view class="ai-summary-grid">
              <view class="ai-summary-item">
                <text class="ai-summary-label">推荐模式</text>
                <text class="ai-summary-value">{{ getDecisionModeLabel(decisionMode) }}</text>
              </view>
              <view class="ai-summary-item">
                <text class="ai-summary-label">置信度</text>
                <text class="ai-summary-value mono">{{ formatPercent(teamDecision && teamDecision.confidence) }}</text>
              </view>
              <view class="ai-summary-item">
                <text class="ai-summary-label">阵容规模</text>
                <text class="ai-summary-value mono">{{ activeTeamSlots.length }}/6</text>
              </view>
            </view>

            <view class="ai-section">
              <text class="ai-section-title">阵容主要短板</text>
              <view class="ai-chip-row">
                <view
                  v-for="(item, chipIndex) in decisionShortboards"
                  :key="`short-${chipIndex}`"
                  class="ai-chip warn"
                >
                  <text class="ai-chip-text">{{ item }}</text>
                </view>
                <text v-if="!decisionShortboards.length" class="analysis-empty inline-empty">暂无明显短板</text>
              </view>
            </view>

            <view class="ai-section">
              <text class="ai-section-title">缺少打击面</text>
              <view class="analysis-tags">
                <view
                  v-for="item in decisionMissingCoverage"
                  :key="`missing-${item.type}`"
                  class="type-tag neutral"
                >
                  <TypeBadge :label="item.type" :color="getTypeColor(item.type)" compact />
                  <text class="tag-text">{{ item.type }}</text>
                </view>
                <text v-if="!decisionMissingCoverage.length" class="analysis-empty inline-empty">覆盖面较完整</text>
              </view>
            </view>

            <view class="ai-section">
              <text class="ai-section-title">危险属性</text>
              <view class="analysis-tags">
                <view
                  v-for="item in decisionDangerAlerts"
                  :key="`danger-${item.type}`"
                  class="type-tag warning"
                >
                  <TypeBadge :label="item.type" :color="getTypeColor(item.type)" compact />
                  <text class="tag-text">{{ item.type }}</text>
                  <text class="tag-note mono">{{ item.threatenedCount }}/{{ activeTeamSlots.length }}</text>
                </view>
                <text v-if="!decisionDangerAlerts.length" class="analysis-empty inline-empty">暂无明显危险属性</text>
              </view>
            </view>

            <view class="ai-section">
              <text class="ai-section-title">阵容结构提醒</text>
              <view class="ai-chip-row">
                <view
                  v-for="(item, noteIndex) in decisionStructureNotes"
                  :key="`structure-${noteIndex}`"
                  class="ai-chip note"
                >
                  <text class="ai-chip-text">{{ item }}</text>
                </view>
                <text v-if="!decisionStructureNotes.length" class="analysis-empty inline-empty">结构较均衡</text>
              </view>
            </view>

            <view v-if="getConfidenceHint(teamDecision)" class="ai-confidence-tip">
              {{ getConfidenceHint(teamDecision) }}
            </view>

            <view class="ai-recommendation-block">
              <view v-if="activeTeamSlots.length < 6">
                <view class="ai-section-head">
                  <text class="ai-section-title">推荐补位 Top 3</text>
                </view>
                <view v-if="complementRecommendations.length" class="ai-rec-list">
                  <view
                    v-for="(item, recIndex) in complementRecommendations"
                    :key="`comp-${item.petId}`"
                    class="ai-rec-card"
                  >
                    <view class="ai-rec-top">
                      <view class="ai-rec-rank" :class="`rank-${recIndex + 1}`">{{ recIndex + 1 }}</view>
                      <RemoteImage class="ai-rec-avatar" :src="resolvePetImage(item.image)" mode="aspectFit" />
                      <view class="ai-rec-main">
                        <text class="ai-rec-name">{{ item.petName || '未知精灵' }}</text>
                        <view class="ai-rec-type-row">
                          <TypeBadge
                            v-for="type in safeTypes(item.types)"
                            :key="`comp-type-${item.petId}-${type}`"
                            :label="type"
                            :color="getTypeColor(type)"
                            compact
                          />
                        </view>
                      </view>
                      <view class="ai-rec-score">
                        <text class="ai-rec-score-label">分</text>
                        <text class="ai-rec-score-value mono">{{ formatScore(item.score) }}</text>
                      </view>
                    </view>
                    <view class="ai-rec-meta">
                      <text class="ai-rec-meta-text mono">置信 {{ formatPercent(item.confidence) }}</text>
                      <text v-if="getConfidenceHint(item)" class="ai-rec-meta-note">仅供参考</text>
                    </view>
                    <view class="ai-rec-reasons">
                      <text
                        v-for="(reason, reasonIndex) in getReasonPreview(item.reasons)"
                        :key="`comp-reason-${item.petId}-${reasonIndex}`"
                        class="ai-rec-reason clamp-2"
                      >
                        {{ reason }}
                      </text>
                      <text v-if="!getReasonPreview(item.reasons).length" class="ai-rec-reason clamp-2">
                        基于阵容短板和属性覆盖综合推荐
                      </text>
                    </view>
                  </view>
                </view>
                <text v-else class="analysis-empty">暂时没有可用的补位建议。</text>
              </view>

              <view v-else>
                <view class="ai-section-head">
                  <text class="ai-section-title">替换建议 Top 3</text>
                </view>
                <view v-if="replacementRecommendations.length" class="ai-rec-list">
                  <view
                    v-for="(item, repIndex) in replacementRecommendations"
                    :key="`rep-${item.current.petId}-${item.petName}`"
                    class="ai-rec-card"
                  >
                    <view class="ai-swap-row">
                      <view class="ai-swap-box">
                        <text class="ai-swap-label">替换谁</text>
                        <text class="ai-swap-value">{{ item.current.petName || '未知精灵' }}</text>
                      </view>
                      <view class="ai-swap-arrow">
                        <AppIcon name="arrow-right" :size="13" color="#C9A14E" :stroke-width="2.6" />
                      </view>
                      <view class="ai-swap-box">
                        <text class="ai-swap-label">换成谁</text>
                        <text class="ai-swap-value">{{ item.petName || '未知精灵' }}</text>
                      </view>
                    </view>
                    <view class="ai-rec-meta">
                      <text class="ai-rec-meta-text mono">评分提升 +{{ formatScore(item.gain) }}</text>
                      <text class="ai-rec-meta-text mono">置信 {{ formatPercent(item.confidence) }}</text>
                      <text v-if="getConfidenceHint(item)" class="ai-rec-meta-note">仅供参考</text>
                    </view>
                    <view class="ai-rec-reasons">
                      <text
                        v-for="(reason, reasonIndex) in getReasonPreview(item.reasons)"
                        :key="`rep-reason-${item.current.petId}-${reasonIndex}`"
                        class="ai-rec-reason clamp-2"
                      >
                        {{ reason }}
                      </text>
                      <text v-if="!getReasonPreview(item.reasons).length" class="ai-rec-reason clamp-2">
                        基于阵容短板和属性覆盖综合推荐
                      </text>
                    </view>
                  </view>
                </view>
                <text v-else class="analysis-empty">当前队伍暂时没有明显替换目标。</text>
              </view>
            </view>
          </template>
        </view>

        <view class="analysis-card">
          <view class="mini-card-head">
            <view class="mini-icon blue">
              <AppIcon name="zap" :size="12" color="#FFFFFF" />
            </view>
            <view class="mini-head-text">
              <text class="analysis-title">技能打击面不足</text>
              <text class="analysis-sub">按携带的攻击技能属性计算缺口</text>
            </view>
          </view>
          <view v-if="coverageSummary.memberCount" class="analysis-tags">
            <view
              v-for="item in missingCoveragePreview"
              :key="'missing-' + item.type"
              class="type-tag neutral"
            >
              <TypeBadge :label="item.type" :color="getTypeColor(item.type)" compact />
              <text class="tag-text">{{ item.type }}</text>
            </view>
            <text v-if="!missingCoveragePreview.length" class="analysis-empty">当前阵容打击面比较完整</text>
          </view>
          <text v-else class="analysis-empty">先添加精灵，系统再帮你分析打击面。</text>
        </view>

        <view class="analysis-card">
          <view class="mini-card-head">
            <view class="mini-icon red">
              <AppIcon name="shield" :size="12" color="#FFFFFF" />
            </view>
            <view class="mini-head-text">
              <text class="analysis-title">队伍易被克制</text>
              <text class="analysis-sub">按精灵自身属性找出整体弱点</text>
            </view>
          </view>
          <view v-if="coverageSummary.memberCount" class="analysis-tags">
            <view
              v-for="item in alertThreatPreview"
              :key="'alert-' + item.type"
              class="type-tag warning"
            >
              <TypeBadge :label="item.type" :color="getTypeColor(item.type)" compact />
              <text class="tag-text">{{ item.type }}</text>
              <text class="tag-note mono">{{ item.threatenedCount }}/{{ coverageSummary.memberCount }}</text>
              <text v-if="item.maxMultiplier === 3" class="tag-alert">最高3倍克制</text>
            </view>
            <text v-if="!alertThreatPreview.length" class="analysis-empty">暂时没有特别集中的危险属性</text>
          </view>
          <text v-else class="analysis-empty">阵容为空时无法判断危险属性。</text>
        </view>

      </view>

      <view class="footer-space"></view>
    </scroll-view>

    <TeamEditSheet
      :visible="sheetVisible"
      :mode="sheetMode"
      :edit-data="currentEditData"
      :pets="petChoices"
      :skill-options="currentSkillOptions"
      @close="closeSheet"
      @save="handleSave"
      @autosave="handleAutoSave"
    />
  </view>
</template>

<script>
import AppHeader from '@/components/AppHeader/AppHeader.vue'
import AppIcon from '@/components/AppIcon/AppIcon.vue'
import StatPanel from '@/components/StatPanel/StatPanel.vue'
import TeamEditSheet from '@/components/TeamEditSheet/TeamEditSheet.vue'
import TypeBadge from '@/components/TypeBadge/TypeBadge.vue'
import { petTypes, petDetail } from '@/data/pet/pet_detail.js'
import { petIndex } from '@/data/pet/pet_index.js'
import { petSkills } from '@/data/pet/pet_skills.js'
import { skillsData } from '@/data/skill/skills.js'
import { skillIcons } from '@/data/skill/skill_icons.js'
import { analyzeTeamTypeCoverage, calculatePetPanel, getHighestFormPets } from '@/data/config/game_math.js'
import { analyzeTeamDecision, recommendTeamComplements, recommendTeamReplacements } from '@/data/config/decision_engine.js'
import { readStorage, writeStorage } from '@/utils/nav.js'
import { resolveAssetPath } from '@/utils/asset-path.js'
import { buildBasePetList } from '@/utils/petListBuilder.js'

const STORAGE_KEY = 'team_draft'
const DEFAULT_LEVEL = 60
const DEFAULT_STAR = 5

const NATURE_LABEL_MAP = {
  '无': '无',
  hp: '生命',
  attack: '物攻',
  mattack: '魔攻',
  defense: '物防',
  mdefense: '魔防',
  speed: '速度'
}

const IV_LABEL_MAP = {
  hp: '生命',
  attack: '物攻',
  mattack: '魔攻',
  defense: '物防',
  mdefense: '魔防',
  speed: '速度'
}

const TYPE_COLOR_MAP = petTypes.reduce((acc, item) => {
  if (item && item.key && !acc[item.key]) acc[item.key] = item.color
  return acc
}, {})

const DECISION_MODE_OPTIONS = [
  { value: 'general', label: '通用' },
  { value: 'pve', label: 'PVE' },
  { value: 'pvp', label: 'PVP' },
  { value: 'newbie', label: '新手' }
]

function createEmptyTeamSlots() {
  return Array.from({ length: 6 }, () => null)
}

function createDefaultEditorData() {
  return {
    petId: '',
    petName: '',
    image: '',
    types: [],
    skills: [],
    level: DEFAULT_LEVEL,
    star: DEFAULT_STAR,
    ivs: {
      hp: 0,
      attack: 0,
      mattack: 0,
      defense: 0,
      mdefense: 0,
      speed: 0
    },
    natureUp: '无',
    natureDown: '无'
  }
}

function normalizeSavedSlot(slot) {
  if (!slot || !slot.petId) return null
  return {
    ...createDefaultEditorData(),
    ...slot,
    level: Number(slot.level ?? DEFAULT_LEVEL),
    star: Number(slot.star ?? DEFAULT_STAR),
    types: Array.isArray(slot.types) ? [...slot.types] : [],
    skills: Array.isArray(slot.skills) ? slot.skills.slice(0, 4) : [],
    ivs: {
      ...createDefaultEditorData().ivs,
      ...(slot.ivs || {})
    },
    panel: slot.panel || null,
    natureUpLabel: slot.natureUpLabel || NATURE_LABEL_MAP[slot.natureUp] || '无',
    natureDownLabel: slot.natureDownLabel || NATURE_LABEL_MAP[slot.natureDown] || '无'
  }
}

function clampIv(value) {
  const number = Number(value)
  if (!Number.isFinite(number)) return 0
  return Math.max(0, Math.min(10, Math.round(number)))
}

const _pets = buildBasePetList()

function buildVariantPetsCompat() {
  const result = []
  for (const [seq, variants] of Object.entries(petDetail)) {
    if (!Array.isArray(variants) || variants.length <= 1) continue
    const indexEntry = Object.values(petIndex).find(v => v.seq === Number(seq))
    const baseName = indexEntry?.name || variants[0]?.page_title || ''
    for (let i = 1; i < variants.length; i++) {
      const v = variants[i]
      if (v.img) {
        result.push({
          id: `${seq}_v${i}`,
          fullName: v.page_title || baseName,
          img: v.img,
          type: v.type || [],
          race: v.race,
          baseId: Number(seq),
          variantName: v.page_title?.replace(baseName, '').trim() || `形态${i}`,
          skills: []
        })
      }
    }
  }
  return result
}

const _variantPets = buildVariantPetsCompat()
const _variantPetMap = (() => {
  const map = {}
  for (const vp of _variantPets) { map[String(vp.id)] = vp }
  return map
})()

export default {
  components: {
    AppHeader,
    AppIcon,
    StatPanel,
    TeamEditSheet,
    TypeBadge
  },
  data() {
    return {
      team: createEmptyTeamSlots(),
      panelExpandedIndexes: [],
      sheetVisible: false,
      sheetMode: 'add',
      editingIndex: -1,
      decisionMode: 'general',
      petChoices: [],
      petMap: {},
      detailMap: petDetail,
      decisionModeOptions: DECISION_MODE_OPTIONS
    }
  },
  computed: {
    activeTeamSlots() {
      return safeArray(this.team).filter((slot) => !!slot && !!slot.petId)
    },
    currentEditData() {
      if (this.editingIndex < 0) return null
      return this.team[this.editingIndex] || createDefaultEditorData()
    },
    currentSkillOptions() {
      const petId = this.currentEditData?.petId
      if (!petId) return []
      return this.buildSkillOptions(petId)
    },
    coverageSummary() {
      return analyzeTeamTypeCoverage(this.team)
    },
    missingCoveragePreview() {
      return this.coverageSummary.missingCoverage.slice(0, 8)
    },
    alertThreatPreview() {
      return this.coverageSummary.alerts.slice(0, 6)
    },
    teamDecision() {
      if (!this.activeTeamSlots.length) return null
      try {
        return analyzeTeamDecision(this.activeTeamSlots, _pets, petDetail, this.decisionMode)
      } catch (error) {
        return null
      }
    },
    complementRecommendations() {
      if (!this.activeTeamSlots.length || this.activeTeamSlots.length >= 6) return []
      try {
        const result = recommendTeamComplements(this.activeTeamSlots, _pets, petDetail, this.decisionMode)
        return safeArray(result?.items).slice(0, 3)
      } catch (error) {
        return []
      }
    },
    replacementRecommendations() {
      if (this.activeTeamSlots.length < 6) return []
      try {
        const result = recommendTeamReplacements(this.activeTeamSlots, _pets, petDetail, this.decisionMode)
        return safeArray(result?.items).slice(0, 3)
      } catch (error) {
        return []
      }
    },
    decisionShortboards() {
      return safeArray(this.teamDecision?.summary?.weaknesses).slice(0, 3)
    },
    decisionMissingCoverage() {
      return safeArray(this.teamDecision?.summary?.teamCoverage?.missingCoverage).slice(0, 4)
    },
    decisionDangerAlerts() {
      return safeArray(this.teamDecision?.summary?.teamCoverage?.alerts).slice(0, 4)
    },
    decisionStructureNotes() {
      const summary = this.teamDecision?.summary || {}
      const roleCounts = summary.roleCounts || {}
      const notes = []

      if (roleCounts.support === 0) notes.push('缺少辅助位')
      if (roleCounts.control === 0 && this.decisionMode === 'pvp') notes.push('PVP 建议补控制')
      if ((roleCounts.physical || 0) + (roleCounts.magic || 0) + (roleCounts.mixed || 0) <= 2) notes.push('输出点偏少')
      if (summary.memberAvgSpeed && summary.memberAvgSpeed < 90 && this.decisionMode === 'pvp') notes.push('平均速度偏慢')
      if (summary.memberAvgBulk && summary.memberAvgBulk < 260 && this.decisionMode !== 'pvp') notes.push('整体站场偏薄')

      return notes.slice(0, 3)
    }
  },
  onLoad() {
    this.preparePetChoices()
    this.loadTeam()
  },
  methods: {
    preparePetChoices() {
      const basePets = getHighestFormPets(_pets, petDetail).map((pet) => ({
        id: pet.id,
        name: pet.name,
        img: pet.img,
        types: Array.isArray(pet.type) ? [...pet.type] : [],
        race: this.detailMap[String(pet.id)]?.race || null,
        colors: (pet.type || []).map((type) => TYPE_COLOR_MAP[type] || '#5b7cf5'),
        isVariant: false
      }))

      const variantChoices = _variantPets.map((vPet) => ({
        id: vPet.id,
        name: vPet.fullName,
        img: vPet.img,
        types: Array.isArray(vPet.type) ? [...vPet.type] : [],
        race: vPet.race,
        colors: (vPet.type || []).map((type) => TYPE_COLOR_MAP[type] || '#5b7cf5'),
        isVariant: true,
        baseId: vPet.baseId,
        variantName: vPet.variantName
      }))

      this.petChoices = [...basePets, ...variantChoices]

      this.petMap = this.petChoices.reduce((acc, pet) => {
        acc[String(pet.id)] = pet
        return acc
      }, {})
    },
    loadTeam() {
      const draft = readStorage(STORAGE_KEY, null)
      if (!Array.isArray(draft)) {
        this.team = createEmptyTeamSlots()
        return
      }
      const normalized = draft.slice(0, 6).map((slot) => normalizeSavedSlot(slot))
      while (normalized.length < 6) normalized.push(null)
      this.team = normalized
    },
    saveTeam(showToast = true) {
      writeStorage(STORAGE_KEY, this.team)
      if (showToast) {
        uni.showToast({ title: '阵容已保存', icon: 'success' })
      }
    },
    clearTeam() {
      uni.showModal({
        title: '清空阵容',
        content: '确认清空全部阵容吗？',
        success: ({ confirm }) => {
          if (!confirm) return
          this.team = createEmptyTeamSlots()
          this.panelExpandedIndexes = []
          this.saveTeam()
        }
      })
    },
    openAddSelector(index) {
      this.sheetMode = 'add'
      this.editingIndex = index
      this.sheetVisible = true
    },
    openConfigEditor(index) {
      if (!this.team[index]) return
      this.sheetMode = 'edit'
      this.editingIndex = index
      this.sheetVisible = true
    },
    closeSheet() {
      this.sheetVisible = false
      this.editingIndex = -1
    },
    handleAutoSave(draft) {
      if (this.sheetMode !== 'edit') {
        this.closeSheet()
        return
      }
      if (this.editingIndex < 0 || !draft?.petId) {
        this.closeSheet()
        return
      }
      this.persistSlot(this.editingIndex, draft, false)
      this.closeSheet()
    },
    handleSave(draft) {
      if (this.editingIndex < 0) return
      if (this.sheetMode === 'add') {
        this.addPetToSlot(this.editingIndex, draft.petId)
      } else {
        this.persistSlot(this.editingIndex, draft, true)
      }
      this.closeSheet()
    },
    addPetToSlot(index, petId) {
      const pet = this.petMap[String(petId)]
      if (!pet) return

      const slotData = {
        ...createDefaultEditorData(),
        petId: pet.id,
        petName: pet.name,
        image: pet.img,
        types: [...(pet.types || [])],
        skills: []
      }

      slotData.panel = this.calculatePanel(slotData)
      slotData.natureUpLabel = '无'
      slotData.natureDownLabel = '无'
      this.$set(this.team, index, slotData)
      this.saveTeam()
    },
    calculatePanel(slotLike) {
      const pet = this.petMap[String(slotLike.petId)]
      if (!pet) return null

      let race = this.detailMap[String(pet.id)]?.race || {}
      if (pet.isVariant && pet.race) {
        race = pet.race
      }

      const ivs = {
        hp: clampIv(slotLike.ivs?.hp),
        attack: clampIv(slotLike.ivs?.attack),
        mattack: clampIv(slotLike.ivs?.mattack),
        defense: clampIv(slotLike.ivs?.defense),
        mdefense: clampIv(slotLike.ivs?.mdefense),
        speed: clampIv(slotLike.ivs?.speed)
      }

      return calculatePetPanel(
        { ...pet, race },
        {
          level: DEFAULT_LEVEL,
          star: DEFAULT_STAR,
          ivs,
          natureUp: slotLike.natureUp,
          natureDown: slotLike.natureDown
        }
      )
    },
    persistSlot(index, draft, showToast) {
      const pet = this.petMap[String(draft.petId)]
      if (!pet) return

      const slotData = {
        petId: pet.id,
        petName: pet.name,
        image: pet.img,
        types: [...(pet.types || [])],
        level: DEFAULT_LEVEL,
        star: DEFAULT_STAR,
        ivs: {
          hp: clampIv(draft.ivs?.hp),
          attack: clampIv(draft.ivs?.attack),
          mattack: clampIv(draft.ivs?.mattack),
          defense: clampIv(draft.ivs?.defense),
          mdefense: clampIv(draft.ivs?.mdefense),
          speed: clampIv(draft.ivs?.speed)
        },
        natureUp: draft.natureUp,
        natureDown: draft.natureDown,
        skills: Array.isArray(draft.skills) ? draft.skills.slice(0, 4) : []
      }

      slotData.panel = this.calculatePanel(slotData)
      slotData.natureUpLabel = NATURE_LABEL_MAP[draft.natureUp] || '无'
      slotData.natureDownLabel = NATURE_LABEL_MAP[draft.natureDown] || '无'

      this.$set(this.team, index, slotData)
      this.saveTeam(showToast)
    },
    confirmDelete(index) {
      uni.showModal({
        title: '删除精灵',
        content: '确认清空这个阵容位吗？',
        success: ({ confirm }) => {
          if (!confirm) return
          this.$set(this.team, index, null)
          this.panelExpandedIndexes = this.panelExpandedIndexes.filter((item) => item !== index)
          this.saveTeam()
        }
      })
    },
    togglePanel(index) {
      if (!this.team[index]) return
      if (this.panelExpandedIndexes.includes(index)) {
        this.panelExpandedIndexes = this.panelExpandedIndexes.filter((item) => item !== index)
        return
      }
      this.panelExpandedIndexes = [...this.panelExpandedIndexes, index]
    },
    getAccentStyle(slot) {
      const types = (slot && slot.types || []).filter(Boolean)
      if (!types.length) return null
      const first = this.getTypeColor(types[0])
      if (types[1]) {
        const second = this.getTypeColor(types[1])
        return { background: `linear-gradient(90deg, ${first} 0%, ${first} 50%, ${second} 50%, ${second} 100%)` }
      }
      return { background: first }
    },
    buildSkillOptions(petId) {
      const pet = this.petMap[String(petId)]
      let skills = []

      if (pet?.isVariant) {
        const variantPet = _variantPetMap[petId]
        skills = variantPet?.skills || []
      } else {
        skills = Array.isArray(this.detailMap[String(petId)]?.skills) ? this.detailMap[String(petId)].skills : []
      }

      const seen = new Set()
      return skills
        .map((skill) => {
          if (!skill?.name) return null
          const key = `${skill.name}|${skill.skill_type || '精灵技能'}`
          if (seen.has(key)) return null
          seen.add(key)
          const skillData = skillsData[skill.name] || {}
          const fullSkillList = petSkills[String(petId)]?.skills || []
          const fullSkill = fullSkillList.find(s => s.name === skill.name) || {}
          return {
            name: skill.name,
            type: skillData.type || fullSkill.type || '-',
            attr: skillData.attr || fullSkill.attr || '-',
            consume: skillData.consume ? `${Number(skillData.consume)}耗能` : (fullSkill.consume ? `${Number(fullSkill.consume)}耗能` : '-'),
            describe: skillData.describe || fullSkill.describe || '',
            icon: resolveAssetPath(skillIcons[skill.name] || ''),
            skillType: skill.skill_type || '精灵技能',
            skillTypeLabel: skill.skill_type || '精灵技能'
          }
        })
        .filter(Boolean)
    },
    buildSkillItems(skills = []) {
      const normalized = Array.isArray(skills) ? skills.slice(0, 4) : []
      return Array.from({ length: 4 }, (_, index) => normalized[index] || {
        name: '',
        type: '-',
        attr: '-',
        consume: '-',
        describe: '',
        icon: '',
        skillType: '空槽',
        skillTypeLabel: '空槽'
      })
    },
    buildStatItems(panel, ivs = {}) {
      const ivMap = {
        hp: Number(ivs.hp) || 0,
        attack: Number(ivs.attack) || 0,
        mattack: Number(ivs.magicAttack ?? ivs.mattack) || 0,
        defense: Number(ivs.defense) || 0,
        mdefense: Number(ivs.magicDefense ?? ivs.mdefense) || 0,
        speed: Number(ivs.speed) || 0
      }

      const makeItem = (key, label, value) => ({
        key,
        label,
        value,
        highlighted: ivMap[key] > 0,
        hint: `个体+${ivMap[key]}`
      })

      if (!panel) {
        return [
          makeItem('hp', '生命', '-'),
          makeItem('attack', '物攻', '-'),
          makeItem('mattack', '魔攻', '-'),
          makeItem('defense', '物防', '-'),
          makeItem('mdefense', '魔防', '-'),
          makeItem('speed', '速度', '-')
        ]
      }

      return [
        makeItem('hp', '生命', panel.hp),
        makeItem('attack', '物攻', panel.attack),
        makeItem('mattack', '魔攻', panel.mattack),
        makeItem('defense', '物防', panel.defense),
        makeItem('mdefense', '魔防', panel.mdefense),
        makeItem('speed', '速度', panel.speed)
      ]
    },
    getTypeColor(type) {
      return TYPE_COLOR_MAP[type] || '#5b7cf5'
    },
    setDecisionMode(mode) {
      const allowed = new Set(DECISION_MODE_OPTIONS.map((item) => item.value))
      if (!allowed.has(mode)) return
      this.decisionMode = mode
    },
    getDecisionModeLabel(mode) {
      return DECISION_MODE_OPTIONS.find((item) => item.value === mode)?.label || '通用'
    },
    getDecisionScore(teamDecision) {
      if (!teamDecision) return '--'
      const score = Number(teamDecision.score ?? Math.round((Number(teamDecision.confidence) || 0) * 100))
      if (!Number.isFinite(score)) return '--'
      return Math.max(0, Math.min(100, Math.round(score)))
    },
    formatScore(value) {
      const number = Number(value)
      if (!Number.isFinite(number)) return '0'
      return String(Math.max(0, Math.round(number)))
    },
    formatPercent(value) {
      const number = Number(value)
      if (!Number.isFinite(number)) return '--'
      const clamped = Math.max(0, Math.min(1, number))
      return `${Math.round(clamped * 100)}%`
    },
    getConfidenceHint(item) {
      const confidence = Number(item?.confidence)
      if (!Number.isFinite(confidence) || confidence < 0.55) return '仅供参考'
      return ''
    },
    getReasonPreview(reasons) {
      return safeArray(reasons).filter(Boolean).slice(0, 2)
    },
    safeTypes(types) {
      return safeArray(types).filter(Boolean)
    },
    resolvePetImage(src) {
      return resolveAssetPath(src)
    },
    getNatureSummary(slot) {
      const up = slot?.natureUpLabel && slot.natureUpLabel !== '无' ? slot.natureUpLabel : ''
      const down = slot?.natureDownLabel && slot.natureDownLabel !== '无' ? slot.natureDownLabel : ''
      if (!up && !down) return '无'
      if (up && down) return `${up} / ${down}`
      return up || down
    },
    getIvSummary(slot) {
      if (!slot?.ivs) return '无'
      const items = Object.keys(IV_LABEL_MAP)
        .filter((key) => Number(slot.ivs[key]) > 0)
        .map((key) => IV_LABEL_MAP[key])
      return items.length ? items.slice(0, 3).join(' / ') : '无'
    },
    getSkillShortName(name) {
      if (!name) return '+'
      return String(name).slice(0, 2)
    },
    getSkillFallbackColor(skill) {
      const colorMap = {
        火: '#EF4444',
        水: '#0EA5E9',
        草: '#22C55E',
        电: '#F59E0B',
        冰: '#0EA5E9',
        武: '#F59E0B',
        毒: '#8B5CF6',
        地: '#F59E0B',
        翼: '#3B82F6',
        萌: '#EC4899',
        虫: '#10B981',
        幽: '#8B5CF6',
        龙: '#3B82F6',
        恶: '#4B5563',
        机械: '#6B7280',
        光: '#FBBF24',
        幻: '#8B5CF6',
        普通: '#6B7280'
      }
      return colorMap[skill?.attr] || '#8B95A5'
    },
  }
}

function safeArray(value) {
  return Array.isArray(value) ? value : []
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
    radial-gradient(circle at 88% 22%, rgba(169, 127, 53, 0.06) 0, transparent 40%);
}

.content {
  flex: 1;
  min-height: 0;
}

.press-down {
  transform: scale(0.95);
  opacity: 0.85;
}

.header-capsule {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  background: rgba(255, 255, 255, 0.2);
  border: 1px solid rgba(255, 255, 255, 0.35);
  border-radius: 999px;
  padding: 4px 12px 4px 9px;
  transition: transform 0.12s ease;
}

.header-capsule-text {
  font-size: 11px;
  font-weight: 700;
  color: #FFFFFF;
  letter-spacing: 0.02em;
}

/* ===== 队伍档案卡 ===== */
.hero-card {
  margin: 12px 14px 0;
  padding: 12px 13px;
  background: #FFFDF7;
  border: 1.5px solid #E3DCC8;
  border-radius: 18px;
  box-shadow: 0 3px 0 rgba(44, 58, 47, 0.10);
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}

.hero-left {
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
}

.hero-icon {
  flex-shrink: 0;
  width: 40px;
  height: 40px;
  border-radius: 13px;
  background: #F6EEDB;
  border: 1.5px solid #D9B96A;
  box-shadow: 0 2px 0 rgba(138, 106, 44, 0.22);
  display: flex;
  align-items: center;
  justify-content: center;
}

.hero-text {
  min-width: 0;
}

.hero-title {
  display: block;
  font-size: 15px;
  font-weight: 800;
  color: #2C3A2F;
  line-height: 1.2;
}

.hero-subtitle {
  display: block;
  margin-top: 3px;
  font-size: 11px;
  line-height: 1.5;
  color: #6B7A6E;
}

.hero-clear {
  flex-shrink: 0;
  height: 30px;
  padding: 0 12px;
  border-radius: 999px;
  background: #FBE9E4;
  border: 1.5px solid #E0604E;
  box-shadow: 0 2px 0 rgba(198, 75, 56, 0.28);
  display: inline-flex;
  align-items: center;
  gap: 4px;
  transition: transform 0.12s ease;
}

.hero-clear-text {
  font-size: 11.5px;
  font-weight: 700;
  color: #C64B38;
}

/* ===== 诊断模式条 ===== */
.mode-strip {
  margin: 10px 14px 0;
  padding: 11px 12px;
  background: #FFFDF7;
  border: 1.5px solid #E3DCC8;
  border-radius: 16px;
  box-shadow: 0 3px 0 rgba(44, 58, 47, 0.10);
}

.mode-head {
  display: flex;
  align-items: center;
  gap: 6px;
}

.mode-dot {
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: #C9A14E;
}

.mode-title {
  font-size: 13px;
  font-weight: 700;
  color: #2C3A2F;
}

.mode-group {
  margin-top: 9px;
  display: flex;
  flex-wrap: wrap;
  gap: 7px;
}

.mode-btn {
  height: 30px;
  padding: 0 14px;
  border-radius: 999px;
  background: #F2EBDA;
  border: 1.5px solid #E3DCC8;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  transition: transform 0.12s ease;
}

.mode-btn.active {
  background: linear-gradient(135deg, #A97F35 0%, #C9A14E 100%);
  border-color: #8A6A2C;
  box-shadow: 0 2px 0 rgba(138, 106, 44, 0.35);
}

.mode-btn-text {
  font-size: 12px;
  font-weight: 700;
  color: #6B7A6E;
}

.mode-btn.active .mode-btn-text {
  color: #FFF9EC;
}

/* ===== 阵容卡 ===== */
.team-grid {
  padding: 12px 14px 0;
  display: grid;
  grid-template-columns: 1fr;
  gap: 10px;
}

@media screen and (min-width: 490px) {
  .team-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

.team-card-wrap {
  min-width: 0;
}

.team-card {
  position: relative;
  overflow: hidden;
  padding: 12px;
  border-radius: 18px;
  background: #FFFDF7;
  border: 1.5px solid #E3DCC8;
  box-shadow: 0 3px 0 rgba(44, 58, 47, 0.10);
}

.card-accent {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 5px;
}

.team-card.empty-card {
  min-height: 108px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 5px;
  border-style: dashed;
  background: rgba(255, 253, 247, 0.7);
}

.empty-ring {
  width: 38px;
  height: 38px;
  border-radius: 999px;
  background: #F6EEDB;
  border: 1.5px dashed #C9A14E;
  display: flex;
  align-items: center;
  justify-content: center;
}

.empty-ring.small {
  width: 32px;
  height: 32px;
}

.empty-title {
  font-size: 12.5px;
  font-weight: 700;
  color: #6B7A6E;
}

.empty-sub {
  font-size: 10.5px;
  color: #A3AE9F;
}

.card-main {
  display: grid;
  grid-template-columns: 36% 64%;
  gap: 10px;
  align-items: stretch;
}

.pet-art {
  min-height: 96px;
  border-radius: 14px;
  background: #F7F1E3;
  border: 1px solid #E3DCC8;
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
}

.pet-glow {
  position: absolute;
  width: 66px;
  height: 66px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.55);
  filter: blur(4px);
}

.pet-image {
  position: relative;
  width: 78px;
  height: 78px;
}

.pet-side {
  min-width: 0;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  gap: 6px;
}

.title-row {
  display: flex;
  align-items: flex-start;
  gap: 8px;
}

.title-main {
  min-width: 0;
  flex: 1;
}

.pet-name {
  display: block;
  font-size: 14.5px;
  font-weight: 800;
  color: #2C3A2F;
  line-height: 1.15;
  word-break: break-all;
}

.type-row {
  margin-top: 5px;
  display: flex;
  flex-wrap: wrap;
  gap: 5px;
}

.panel-btn {
  flex-shrink: 0;
  height: 26px;
  padding: 0 10px;
  border-radius: 999px;
  border: 1.5px solid #D9B96A;
  background: #F6EEDB;
  display: inline-flex;
  align-items: center;
  gap: 2px;
  transition: transform 0.12s ease;
}

.panel-btn-text {
  font-size: 11px;
  font-weight: 700;
  color: #A97F35;
  white-space: nowrap;
}

.flip-up {
  transform: rotate(180deg);
}

.info-row {
  display: grid;
  grid-template-columns: 44px 1fr;
  gap: 7px;
  align-items: center;
}

.info-label {
  height: 23px;
  border-radius: 7px;
  background: #F6EEDB;
  border: 1px solid #E0D3AE;
  color: #A97F35;
  font-size: 10.5px;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
}

.info-value {
  min-height: 23px;
  padding: 0 9px;
  border-radius: 7px;
  background: #FFFFFF;
  border: 1px solid #E3DCC8;
  color: #2C3A2F;
  font-size: 11px;
  font-weight: 700;
  display: flex;
  align-items: center;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.skill-row {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 6px;
}

.skill-slot {
  border-radius: 9px;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 46px;
  background: #F7F1E3;
  border: 1px solid #E3DCC8;
  position: relative;
  transition: transform 0.12s ease;
}

.skill-slot.empty {
  background: #EDE6D3;
  border-style: dashed;
}

.skill-fallback {
  width: 100%;
  height: 46px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.skill-icon {
  width: 100%;
  height: 46px;
}

.skill-fallback-text {
  font-size: 12px;
  font-weight: 800;
  color: #FFFFFF;
}

.skill-name-bar {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  height: 14px;
  background: rgba(44, 58, 47, 0.82);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0 3px;
}

.skill-name {
  font-size: 9px;
  line-height: 1;
  color: #FFFDF7;
  font-weight: 500;
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.panel-preview {
  margin-top: 10px;
  padding: 11px;
  border-radius: 13px;
  background: #F7F1E3;
  border: 1px dashed #CFC7AE;
}

.panel-preview-head {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 9px;
}

.panel-preview-title {
  font-size: 12px;
  font-weight: 800;
  color: #2C3A2F;
}

.panel-preview-subtitle {
  font-size: 10px;
  color: #A3AE9F;
}

.card-actions {
  margin-top: 10px;
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
}

.action-btn {
  height: 33px;
  border-radius: 11px;
  font-size: 12px;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 5px;
  transition: transform 0.12s ease;
}

.action-btn.primary {
  background: linear-gradient(135deg, #A97F35 0%, #C9A14E 100%);
  border: 1.5px solid #8A6A2C;
  box-shadow: 0 2.5px 0 rgba(138, 106, 44, 0.42);
}

.action-btn.primary .action-btn-text {
  color: #FFF9EC;
}

.action-btn.danger {
  background: #FBE9E4;
  border: 1.5px solid #E0604E;
  box-shadow: 0 2.5px 0 rgba(198, 75, 56, 0.28);
}

.action-btn.danger .action-btn-text {
  color: #C64B38;
}

/* ===== 分析卡 ===== */
.analysis-grid {
  padding: 12px 14px 0;
  display: grid;
  gap: 10px;
}

.analysis-card {
  padding: 13px;
  border-radius: 18px;
  background: #FFFDF7;
  border: 1.5px solid #E3DCC8;
  box-shadow: 0 3px 0 rgba(44, 58, 47, 0.10);
}

.analysis-title {
  display: block;
  font-size: 14px;
  font-weight: 800;
  color: #2C3A2F;
}

.analysis-sub {
  display: block;
  margin-top: 3px;
  font-size: 10.5px;
  line-height: 1.5;
  color: #6B7A6E;
}

.analysis-tags {
  margin-top: 10px;
  display: flex;
  flex-wrap: wrap;
  gap: 7px;
}

.type-tag {
  min-height: 30px;
  padding: 4px 9px;
  border-radius: 10px;
  display: inline-flex;
  align-items: center;
  gap: 5px;
  background: #F7F1E3;
  border: 1px solid #E3DCC8;
}

.type-tag.warning {
  background: #FBE9E4;
  border-color: rgba(224, 96, 78, 0.4);
}

.tag-text {
  font-size: 11.5px;
  font-weight: 800;
  color: #2C3A2F;
}

.tag-note {
  font-size: 10px;
  color: #6B7A6E;
}

.tag-alert {
  font-size: 10px;
  font-weight: 800;
  color: #C64B38;
}

.analysis-empty {
  display: block;
  margin-top: 10px;
  font-size: 11px;
  color: #A3AE9F;
}

.analysis-empty.inline-empty {
  display: inline-block;
  margin-top: 0;
}

.analysis-empty.center {
  margin-top: 8px;
  text-align: center;
}

.mono {
  font-family: Monaco, Consolas, 'Courier New', monospace;
}

/* ===== AI 诊断卡 ===== */
.ai-card-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 10px;
}

.ai-head-left {
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
}

.ai-head-icon {
  flex-shrink: 0;
  width: 36px;
  height: 36px;
  border-radius: 12px;
  background: linear-gradient(135deg, #A97F35 0%, #C9A14E 100%);
  border: 1.5px solid #8A6A2C;
  box-shadow: 0 2px 0 rgba(138, 106, 44, 0.4);
  display: flex;
  align-items: center;
  justify-content: center;
}

.ai-head-text {
  min-width: 0;
}

.ai-score-seal {
  flex-shrink: 0;
  min-width: 58px;
  padding: 7px 12px;
  border-radius: 999px;
  background: linear-gradient(135deg, #A97F35 0%, #D9B96A 100%);
  border: 1.5px solid #8A6A2C;
  box-shadow: 0 2px 0 rgba(138, 106, 44, 0.45);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
}

.ai-score-num {
  font-size: 15px;
  line-height: 1;
  font-weight: 800;
  color: #FFF6DE;
  font-family: Monaco, Consolas, 'Courier New', monospace;
}

.ai-empty {
  padding: 8px 0 4px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
}

.ai-summary-grid {
  margin-top: 11px;
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 7px;
}

.ai-summary-item {
  padding: 9px 8px;
  border-radius: 11px;
  background: #F7F1E3;
  border: 1px solid #E3DCC8;
  text-align: center;
}

.ai-summary-label {
  display: block;
  font-size: 10px;
  color: #6B7A6E;
  font-weight: 700;
}

.ai-summary-value {
  display: block;
  margin-top: 3px;
  font-size: 12.5px;
  color: #2C3A2F;
  font-weight: 800;
}

.ai-section {
  margin-top: 12px;
}

.ai-section-title {
  display: block;
  font-size: 12px;
  font-weight: 800;
  color: #2C3A2F;
}

.ai-chip-row {
  margin-top: 8px;
  display: flex;
  flex-wrap: wrap;
  gap: 7px;
}

.ai-chip {
  max-width: 100%;
  padding: 5px 10px;
  border-radius: 999px;
}

.ai-chip.warn {
  background: #FBE9E4;
  border: 1px dashed rgba(224, 96, 78, 0.45);
}

.ai-chip.warn .ai-chip-text {
  color: #B03A2A;
}

.ai-chip.note {
  background: rgba(201, 161, 78, 0.12);
  border: 1px solid rgba(201, 161, 78, 0.45);
}

.ai-chip.note .ai-chip-text {
  color: #A97F35;
}

.ai-chip-text {
  font-size: 11px;
  font-weight: 700;
}

.ai-confidence-tip {
  margin-top: 11px;
  padding: 8px 11px;
  border-radius: 10px;
  background: rgba(201, 161, 78, 0.12);
  border: 1px dashed #C9A14E;
  color: #A97F35;
  font-size: 11px;
  font-weight: 700;
}

.ai-recommendation-block {
  margin-top: 12px;
  padding-top: 11px;
  border-top: 1px dashed #CFC7AE;
}

.ai-section-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.ai-rec-list {
  margin-top: 9px;
  display: grid;
  gap: 9px;
}

.ai-rec-card {
  padding: 11px;
  border-radius: 13px;
  background: #F7F1E3;
  border: 1px solid #E3DCC8;
  border-left: 3px solid #C9A14E;
}

.ai-rec-top {
  display: flex;
  align-items: center;
  gap: 9px;
}

.ai-rec-rank {
  flex-shrink: 0;
  width: 22px;
  height: 22px;
  border-radius: 999px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 11.5px;
  font-weight: 800;
  color: #FFF9EC;
  font-family: Monaco, Consolas, 'Courier New', monospace;
  border: 1.5px solid;
}

.ai-rec-rank.rank-1 {
  background: linear-gradient(135deg, #A97F35 0%, #D9B96A 100%);
  border-color: #8A6A2C;
}

.ai-rec-rank.rank-2 {
  background: linear-gradient(135deg, #8C97A8 0%, #B9C2CE 100%);
  border-color: #6F7A8C;
}

.ai-rec-rank.rank-3 {
  background: linear-gradient(135deg, #B0714E 0%, #D19A76 100%);
  border-color: #8F5A3E;
}

.ai-rec-avatar {
  width: 40px;
  height: 40px;
  border-radius: 10px;
  overflow: hidden;
  background: #FFFDF7;
  border: 1px solid #E3DCC8;
  flex-shrink: 0;
}

.ai-rec-main {
  flex: 1;
  min-width: 0;
}

.ai-rec-name {
  display: block;
  font-size: 12.5px;
  font-weight: 800;
  color: #2C3A2F;
}

.ai-rec-type-row {
  margin-top: 4px;
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}

.ai-rec-score {
  flex-shrink: 0;
  min-width: 44px;
  padding: 5px 9px;
  border-radius: 999px;
  background: #F6EEDB;
  border: 1.5px solid #D9B96A;
  display: inline-flex;
  align-items: baseline;
  justify-content: center;
  gap: 3px;
}

.ai-rec-score-label {
  font-size: 9px;
  font-weight: 700;
  color: #A97F35;
}

.ai-rec-score-value {
  font-size: 12.5px;
  font-weight: 800;
  color: #A97F35;
  font-family: Monaco, Consolas, 'Courier New', monospace;
}

.ai-rec-meta {
  margin-top: 7px;
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: center;
}

.ai-rec-meta-text {
  font-size: 10px;
  color: #6B7A6E;
}

.ai-rec-meta-note {
  font-size: 10px;
  color: #B03A2A;
  font-weight: 700;
}

.ai-rec-reasons {
  margin-top: 6px;
  display: grid;
  gap: 3px;
}

.ai-rec-reason {
  font-size: 10.5px;
  line-height: 1.5;
  color: #6B7A6E;
}

.clamp-2 {
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
  overflow: hidden;
}

.ai-swap-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.ai-swap-box {
  flex: 1;
  min-width: 0;
  padding: 8px 10px;
  border-radius: 10px;
  background: #FFFDF7;
  border: 1px solid #E3DCC8;
}

.ai-swap-label {
  display: block;
  font-size: 10px;
  color: #6B7A6E;
  font-weight: 700;
}

.ai-swap-value {
  display: block;
  margin-top: 3px;
  font-size: 11.5px;
  font-weight: 800;
  color: #2C3A2F;
  word-break: break-all;
}

.ai-swap-arrow {
  flex-shrink: 0;
  display: flex;
  align-items: center;
}

/* ===== 迷你分析卡 ===== */
.mini-card-head {
  display: flex;
  align-items: center;
  gap: 9px;
}

.mini-icon {
  flex-shrink: 0;
  width: 32px;
  height: 32px;
  border-radius: 11px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1.5px solid;
  box-shadow: 0 2px 0 rgba(44, 58, 47, 0.18);
}

.mini-icon.blue {
  background: linear-gradient(135deg, #2C6FD1 0%, #4F9CFF 100%);
  border-color: #23508F;
  box-shadow: 0 2px 0 rgba(35, 80, 143, 0.4);
}

.mini-icon.red {
  background: linear-gradient(135deg, #C64B38 0%, #E0604E 100%);
  border-color: #9C3A2B;
  box-shadow: 0 2px 0 rgba(156, 58, 43, 0.4);
}

.mini-head-text {
  min-width: 0;
}

.footer-space {
  height: calc(28px + env(safe-area-inset-bottom));
}
</style>
