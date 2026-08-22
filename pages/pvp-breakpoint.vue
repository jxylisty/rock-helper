<template>
  <view class="page">
    <AppHeader theme="red" title="伤害计算" subtitle="攻守对比 · 实时推演" leftAction="back">
      <template #right>
        <view class="header-capsule" hover-class="press-down" @click="swapSides">
          <AppIcon name="swap" :size="11" color="#FFFFFF" />
          <text class="header-capsule-text">交换攻守</text>
        </view>
      </template>
    </AppHeader>

    <scroll-view scroll-y class="content" :show-scrollbar="false">
      <view class="hero card">
        <view class="hero-main">
          <view class="hero-icon">
            <AppIcon name="swords" :size="16" color="#C64B38" />
          </view>
          <view class="hero-text">
            <text class="hero-title">攻守断点推演</text>
            <text class="hero-sub">选择双方精灵与技能，实时对比伤害与生存。</text>
          </view>
        </view>
        <view class="hero-action" hover-class="press-down" @click="openFloatWindow">
          <AppIcon name="window" :size="10" color="#A97F35" />
          <text class="hero-action-text">悬浮窗</text>
        </view>
      </view>

      <view class="battle card">
        <view class="battle-grid">
          <view class="side-card attack-side" hover-class="press-down" @click="openPetSelector('attack')">
            <view class="side-head">
              <view class="side-seal attack">
                <AppIcon name="zap" :size="9" color="#FFF5EC" />
                <text class="side-seal-text">攻方</text>
              </view>
              <view class="side-action" hover-class="press-down" @click.stop="openPetSelector('attack')">
                <AppIcon name="search" :size="9" color="#1E7A46" />
                <text class="side-action-text">更换</text>
              </view>
            </view>
            <text class="pet-name">{{ attackPet.name || '未选择精灵' }}</text>
            <view class="type-row">
              <TypeBadge v-for="type in attackTypes" :key="'attack-' + type" :label="type" :color="getTypeColor(type)" compact />
            </view>
            <view class="pet-art-row">
              <view class="pet-art attack-art">
                <RemoteImage class="pet-image" :src="resolvePetImage(attackPet.img)" mode="aspectFit" />
              </view>
              <view class="side-params-link" hover-class="press-down" @click.stop="openParamSetting('attack')">
                <AppIcon name="edit" :size="9" color="#1E7A46" />
                <text class="side-params-text">参数设置</text>
              </view>
            </view>
            <view class="stat-grid-compact">
              <view v-for="item in attackStatBlocks" :key="'attack-' + item.key" class="stat-item-compact" :class="item.theme">
                <view class="stat-meta-left">
                  <text class="stat-label-mini">{{ item.label }}</text>
                  <view v-if="item.mark" class="stat-mark-mini" :class="item.mark.class"></view>
                </view>
                <text class="stat-value-mini mono">{{ item.value }}</text>
              </view>
            </view>
          </view>

          <view class="vs-badge">
            <AppIcon name="swords" :size="13" color="#FFF5EC" />
            <text class="vs-text">VS</text>
          </view>

          <view class="side-card defense-side" hover-class="press-down" @click="openPetSelector('defense')">
            <view class="side-head">
              <view class="side-seal defense">
                <AppIcon name="shield" :size="9" color="#F0F7FF" />
                <text class="side-seal-text">防守</text>
              </view>
              <view class="side-action" hover-class="press-down" @click.stop="openPetSelector('defense')">
                <AppIcon name="search" :size="9" color="#2C6FD1" />
                <text class="side-action-text">更换</text>
              </view>
            </view>
            <text class="pet-name">{{ defensePet.name || '未选择精灵' }}</text>
            <view class="type-row">
              <TypeBadge v-for="type in defenseTypes" :key="'defense-' + type" :label="type" :color="getTypeColor(type)" compact />
            </view>
            <view class="pet-art-row">
              <view class="pet-art defense-art">
                <RemoteImage class="pet-image" :src="resolvePetImage(defensePet.img)" mode="aspectFit" />
              </view>
              <view class="side-params-link" hover-class="press-down" @click.stop="openParamSetting('defense')">
                <AppIcon name="edit" :size="9" color="#2C6FD1" />
                <text class="side-params-text">参数设置</text>
              </view>
            </view>
            <view class="stat-grid-compact">
              <view v-for="item in defenseStatBlocks" :key="'defense-' + item.key" class="stat-item-compact" :class="item.theme">
                <view class="stat-meta-left">
                  <text class="stat-label-mini">{{ item.label }}</text>
                  <view v-if="item.mark" class="stat-mark-mini" :class="item.mark.class"></view>
                </view>
                <text class="stat-value-mini mono">{{ item.value }}</text>
              </view>
            </view>
          </view>
        </view>
      </view>

      <view class="skill-section card">
        <view class="section-head">
          <view class="section-head-left">
            <view class="section-icon gold">
              <AppIcon name="sparkles" :size="11" color="#FFF9EC" />
            </view>
            <text class="section-title">攻击技能</text>
          </view>
          <view class="section-action" hover-class="press-down" @click="openSkillSelector">
            <AppIcon name="search" :size="9" color="#A97F35" />
            <text class="section-action-text">更换</text>
          </view>
        </view>
        <view class="skill-card" hover-class="press-down" @click="openSkillSelector">
          <view class="skill-icon-frame">
            <RemoteImage class="skill-icon" :src="selectedSkillIcon" mode="aspectFit" />
          </view>
          <view class="skill-main">
            <view class="skill-main-head">
              <text class="skill-name">{{ selectedSkill.name || '未选择技能' }}</text>
            </view>
            <view class="skill-chip-row">
              <view class="skill-chip"><text class="skill-chip-text">{{ selectedSkill.attr || '无属性' }}</text></view>
              <view class="skill-chip"><text class="skill-chip-text">{{ selectedSkill.displayType || selectedSkill.type || '-' }}</text></view>
              <view class="skill-chip"><text class="skill-chip-text">能量 {{ selectedSkill.consume || 0 }}</text></view>
              <view class="skill-chip tone-gold"><text class="skill-chip-text tone-gold-text">威力 {{ selectedSkill.power || 0 }}</text></view>
            </view>
            <view class="power-input-row">
              <text class="power-label">计算威力</text>
              <input
                class="power-input"
                type="number"
                :value="customSkillPower"
                @input="onCustomPowerInput"
                @click.stop
                placeholder="0"
              />
              <view class="auto-calc-btn" hover-class="press-down" @click.stop="autoCalcEffectivePower">
                <AppIcon name="wand" :size="9" color="#FFF9EC" />
                <text class="auto-calc-text">面板重算</text>
              </view>
            </view>
            <view class="power-note-box">
              <view class="note-line">
                <AppIcon name="info" :size="9" color="#A97F35" />
                <text class="note-text">初始值已包含：{{ selectedSkill.calculationNote || '无属性加成' }}</text>
              </view>
              <view class="note-line">
                <AppIcon name="block" :size="9" color="#C64B38" />
                <text class="note-text warn">手动填写时，请直接填【乘完克制与本系 1.25x 后】的最终威力，下方公式将不再重复叠算。</text>
              </view>
            </view>
            <view v-if="selectedSkill.isDynamic" class="dynamic-hint">
              <AppIcon name="block" :size="9" color="#C64B38" />
              <text class="dynamic-hint-text">该技能实际威力可能随战斗状态变化，请手动调整计算威力</text>
            </view>
            <view class="skill-detail-row">
              <text class="skill-desc">{{ skillShortDesc }}</text>
              <view class="detail-btn" hover-class="press-down" @click.stop="openSkillDetail(selectedSkill)">
                <AppIcon name="info" :size="9" color="#A97F35" />
                <text class="detail-btn-text">详情</text>
              </view>
            </view>
          </view>
        </view>
      </view>

      <view class="buff-section card">
        <view class="section-head">
          <view class="section-head-left">
            <view class="section-icon danger">
              <AppIcon name="zap" :size="11" color="#FFF5EC" />
            </view>
            <text class="section-title">伤害修饰符</text>
          </view>
        </view>
        <view class="buff-grid">
          <view class="buff-item tone-up">
            <view class="buff-head">
              <AppIcon name="zap" :size="10" color="#C64B38" />
              <text class="buff-label">增伤加成</text>
            </view>
            <view class="buff-input-wrap">
              <input
                v-model="damageBuff"
                class="buff-input"
                type="number"
                @input="calculateDamage"
                @click.stop
                placeholder="0-990"
                min="0"
                max="990"
              />
              <text class="buff-unit">%</text>
            </view>
            <text class="buff-note">范围 0 - 990%</text>
          </view>
          <view class="buff-item tone-down">
            <view class="buff-head">
              <AppIcon name="shield" :size="10" color="#2C6FD1" />
              <text class="buff-label">减伤护盾</text>
            </view>
            <view class="buff-input-wrap">
              <input
                v-model="damageMitigation"
                class="buff-input"
                type="number"
                @input="calculateDamage"
                @click.stop
                placeholder="0-100"
                min="0"
                max="100"
              />
              <text class="buff-unit">%</text>
            </view>
            <text class="buff-note">范围 0 - 100%</text>
          </view>
        </view>
      </view>

      <view class="result-section card">
        <view class="section-head">
          <view class="section-head-left">
            <view class="section-icon red">
              <AppIcon name="star" :size="11" color="#FFF5EC" />
            </view>
            <text class="section-title">计算结果</text>
          </view>
          <view class="result-mode">{{ resultModeLabel }}</view>
        </view>
        <DamageHpCompareBar :damage="resultState.damage" :hp="resultState.hp" title="伤害对比" damage-label="伤害" hp-label="生命" :reverse-diff="true" />
        <view class="result-bar">
          <text class="result-value mono">{{ resultState.value }}</text>
          <text class="result-subtitle">{{ resultState.subtitle }}</text>
        </view>
        <text class="result-note">{{ resultState.note }}</text>
      </view>

      <view class="bottom-space"></view>
    </scroll-view>

        <PetSelector
          :visible="petSelectorVisible"
          :title="selectorSideLabel + '选择精灵'"
          :pets="petOptions"
          :active-id="getActivePetId()"
          @close="petSelectorVisible = false"
          @select="onPetSelected"
        />

        <view v-if="paramSettingVisible" class="modal-mask" @click="closeParamSetting">
      <view class="modal-sheet" @click.stop>
        <view class="modal-head">
          <view class="modal-head-left">
            <view class="modal-head-icon">
              <AppIcon name="edit" :size="12" color="#FFF5EC" />
            </view>
            <text class="modal-title">{{ paramSideLabel }}参数设置</text>
          </view>
          <view class="modal-close" hover-class="press-down" @click="closeParamSetting">
            <AppIcon name="close" :size="9" color="#C64B38" :stroke-width="3" />
            <text class="modal-close-text">关闭</text>
          </view>
        </view>

        <view class="selected-card">
          <view class="selected-image-frame">
            <RemoteImage class="selected-image" :src="resolvePetImage(paramPet.img)" mode="aspectFit" />
          </view>
          <view class="selected-info">
            <text class="selected-name">{{ paramPet.fullName || paramPet.name || '未选择精灵' }}</text>
            <text class="selected-type">{{ formatTypes(getPetTypes(paramPet)) }}</text>
            <text class="selected-note">沿用阵容编辑页的个体 / 性格配置，仅保留本页所需部分。</text>
          </view>
        </view>

        <view class="config-card">
          <text class="config-title">性格增益 / 减益</text>
          <view class="picker-stack">
            <picker :range="natureLabels" :value="getNatureIndex(paramDraft.natureUp)" @change="onNatureUpChange">
              <view class="picker-box">增益：{{ paramDraft.natureUp }}</view>
            </picker>
            <picker :range="natureLabels" :value="getNatureIndex(paramDraft.natureDown)" @change="onNatureDownChange">
              <view class="picker-box">减益：{{ paramDraft.natureDown }}</view>
            </picker>
          </view>
        </view>

        <view class="config-card">
          <text class="config-title">个体值</text>
          <view class="iv-summary">
            <text class="iv-summary-label">当前提升</text>
            <view v-if="filledIvItems.length" class="iv-summary-tags">
              <text v-for="item in filledIvItems" :key="item.key" class="iv-summary-tag">
                {{ item.label }} +{{ item.value }}
              </text>
            </view>
            <text v-else class="iv-summary-empty">默认全为 0，未增加任何个体值</text>
          </view>
          <text class="iv-rule-tip">规则：每项只填 1-10，最多只能提升 3 项，其余保持 0。</text>
          <view class="iv-grid">
            <view
              v-for="item in ivFields"
              :key="item.key"
              class="iv-item"
              :class="{ active: Number(paramDraft.ivs[item.key]) > 0 }"
            >
              <text class="iv-label">{{ item.label }}</text>
              <input
                class="iv-input"
                type="number"
                :value="paramDraft.ivs[item.key]"
                @input="onParamIvInput(item.key, $event)"
              />
            </view>
          </view>
        </view>

        <view class="modal-actions">
          <view class="modal-btn ghost" hover-class="press-down" @click="applyRecommendedIvs">默认推荐</view>
          <view class="modal-btn ghost" hover-class="press-down" @click="applyFullConfig">一键满配</view>
          <view class="modal-btn ghost" hover-class="press-down" @click="closeParamSetting">取消</view>
          <view class="modal-btn primary" hover-class="press-down" @click="confirmParamSetting">
            <AppIcon name="check" :size="10" color="#FFF5EC" :stroke-width="3" />
            <text class="modal-btn-text">确定</text>
          </view>
        </view>
      </view>
    </view>

    <view v-if="skillSelectorVisible" class="modal-mask" @click="closeSkillSelector">
      <view class="modal-sheet" @click.stop>
        <view class="modal-head">
          <view class="modal-head-left">
            <view class="modal-head-icon gold">
              <AppIcon name="sparkles" :size="12" color="#FFF9EC" />
            </view>
            <text class="modal-title">选择技能</text>
          </view>
          <view class="modal-close" hover-class="press-down" @click="closeSkillSelector">
            <AppIcon name="close" :size="9" color="#C64B38" :stroke-width="3" />
            <text class="modal-close-text">关闭</text>
          </view>
        </view>
        <view class="search-row">
          <view class="search-box">
            <AppIcon name="search" :size="11" color="#A3AE9F" />
            <input v-model.trim="skillKeyword" class="search-input" placeholder="搜索技能名称" placeholder-class="search-placeholder" />
          </view>
        </view>
        <view class="skill-filter-row">
          <view v-for="opt in skillFilterOptions" :key="opt.value" class="filter-chip" :class="{ active: skillFilter === opt.value }" hover-class="press-down" @click="skillFilter = opt.value">
            <text class="filter-chip-text">{{ opt.label }}</text>
          </view>
        </view>
        <scroll-view scroll-y class="modal-scroll skill-scroll" :style="{ height: '54vh' }">
          <view class="skill-grid">
            <view v-for="skill in filteredSkillOptions" :key="skill.name + '-' + skill.skill_type" class="skill-option-card" :class="{ active: selectedSkill.name === skill.name }" hover-class="press-down" @click="selectSkill(skill)">
              <view class="skill-option-icon-wrap" hover-class="press-down" @click.stop="openSkillDetail(skill)">
                <RemoteImage class="skill-option-icon" :src="skill.icon || getSkillIcon(skill.name)" mode="aspectFit" />
              </view>
              <view class="skill-option-info">
                <text class="skill-option-name">{{ skill.name }}</text>
                <text class="skill-option-power">威力 {{ skill.power || 0 }}</text>
              </view>
            </view>
          </view>
          <view v-if="!filteredSkillOptions.length" class="empty-tip">没有找到符合条件的技能</view>
        </scroll-view>
      </view>
    </view>

    <view v-if="skillDetailVisible" class="modal-mask" @click="closeSkillDetail">
      <view class="modal-sheet skill-detail-sheet" @click.stop>
        <view class="modal-head">
          <view class="modal-head-left">
            <view class="modal-head-icon gold">
              <AppIcon name="wand" :size="12" color="#FFF9EC" />
            </view>
            <text class="modal-title">技能详情</text>
          </view>
          <view class="modal-close" hover-class="press-down" @click="closeSkillDetail">
            <AppIcon name="close" :size="9" color="#C64B38" :stroke-width="3" />
            <text class="modal-close-text">关闭</text>
          </view>
        </view>
        <view class="skill-detail-top">
          <view class="skill-detail-icon-frame">
            <RemoteImage class="skill-detail-icon" :src="detailSkill.icon || detailSkillIcon" mode="aspectFit" />
          </view>
          <view class="skill-detail-main">
            <text class="skill-detail-name">{{ detailSkill.name || '未选择技能' }}</text>
            <view class="skill-detail-tags">
              <text class="detail-tag">{{ detailSkill.attr || '无属性' }}</text>
              <text class="detail-tag">{{ detailSkill.displayType || detailSkill.type || '-' }}</text>
              <text class="detail-tag">能量 {{ detailSkill.consume || 0 }}</text>
            </view>
          </view>
        </view>
        <view class="detail-list">
          <view class="detail-row"><text class="detail-label">威力</text><text class="detail-value mono">{{ detailSkill.power || 0 }}</text></view>
          <view class="detail-row"><text class="detail-label">连击次数</text><text class="detail-value mono">{{ detailSkill.baseHits || 1 }}</text></view>
          <view class="detail-row"><text class="detail-label">技能来源</text><text class="detail-value">{{ detailSkillSource }}</text></view>
          <view class="detail-row detail-desc-row"><text class="detail-label">完整描述</text><text class="detail-value desc">{{ detailSkill.describe || '暂无描述' }}</text></view>
          <view class="detail-row detail-tags-row"><text class="detail-label">机制标签</text><view class="tag-wrap"><text v-for="tag in detailSkillTags" :key="tag" class="mini-tag">{{ tag }}</text></view></view>
          <view v-if="detailSkill.isDynamic" class="detail-dynamic-hint">
            <AppIcon name="block" :size="9" color="#C64B38" />
            <text class="detail-dynamic-text">该技能为动态威力技能，实际威力可能随战斗状态变化，请手动调整计算威力</text>
          </view>
        </view>
      </view>
    </view>
  </view>
</template>
<script>
import AppHeader from '@/components/AppHeader/AppHeader.vue'
import AppIcon from '@/components/AppIcon/AppIcon.vue'
import TypeBadge from '@/components/TypeBadge/TypeBadge.vue'
import DamageHpCompareBar from '@/components/pvp/DamageHpCompareBar.vue'
import PetSelector from '@/components/PetSelector/PetSelector.vue'
import { petTypes, petDetail } from '@/data/pet/pet_detail.js'
import { petIndex } from '@/data/pet/pet_index.js'
import { petSkills } from '@/data/pet/pet_skills.js'
import { skillsData } from '@/data/skill/skills.js'
import { skillIcons } from '@/data/skill/skill_icons.js'
import commonSkillPresets from '@/data/pvp/commonSkillPresets.json'
import { calculatePetPanel } from '@/data/config/game_math.js'
import { calculateDamageFull, getAttrMultiplier, normalizeAttr, normalizeBattleSkill, repairText } from '@/utils/pvpDamageEngine.js'
import { resolveAssetPath } from '@/utils/asset-path.js'
import { buildSuggestedIvs } from '@/utils/buildSuggestedIvs.js'
import { buildOpponentFullConfig } from '@/utils/buildOpponentFullConfig.js'
import { openDamageFloatWindow, isSystemOverlayAvailable, hasOverlayPermission } from '@/utils/floatWindow.js'
import { savePetConfig, loadPetConfig } from '@/utils/petConfigCache.js'
import { buildBasePetList, getPetVariants, getPetVariantDetails, getPetSkillNames } from '@/utils/petListBuilder.js'

const STAT_FIELDS = [
  { key: 'hp', label: '生命', theme: 'pink' },
  { key: 'attack', label: '物攻', theme: 'yellow' },
  { key: 'mattack', label: '魔攻', theme: 'purple' },
  { key: 'defense', label: '物防', theme: 'green' },
  { key: 'mdefense', label: '魔防', theme: 'blue' },
  { key: 'speed', label: '速度', theme: 'cyan' }
]

const NATURE_OPTIONS = ['无', '生命', '物攻', '魔攻', '物防', '魔防', '速度']

function toNumber(value, fallback = 0) {
  const number = Number(value)
  return Number.isFinite(number) ? number : fallback
}

function cloneIvs(ivs = {}) {
  return {
    hp: toNumber(ivs.hp),
    attack: toNumber(ivs.attack),
    mattack: toNumber(ivs.mattack),
    defense: toNumber(ivs.defense),
    mdefense: toNumber(ivs.mdefense),
    speed: toNumber(ivs.speed)
  }
}

function createDefaultSide() {
  return {
    petId: null,
    level: 60,
    star: 5,
    natureUp: '无',
    natureDown: '无',
    ivs: cloneIvs()
  }
}

function truncateText(text = '', length = 36) {
  const value = repairText(text || '').trim()
  if (!value) return '暂无描述'
  return value.length > length ? value.slice(0, length) + '...' : value
}

function resolveNatureIndex(value) {
  const index = NATURE_OPTIONS.indexOf(value)
  return index >= 0 ? index : 0
}

function pickFirstText() {
  for (let i = 0; i < arguments.length; i += 1) {
    const value = repairText(arguments[i] || '').trim()
    if (value) return value
  }
  return ''
}

function getDisplayType(type = '') {
  const value = repairText(type).trim()
  return value || '未知'
}

function getSkillSource(skill = {}) {
  const source = repairText(skill.skill_type || skill.skillType || '').trim()
  if (/技能石|可学/.test(source)) return '可学技能石'
  if (/血脉/.test(source)) return '血脉技能'
  if (/特性/.test(source)) return '特性技能'
  return '精灵技能'
}

function collectPetSkills(detail = {}, variantDetail = {}, petSeq = null) {
  const groups = []
  if (Array.isArray(detail.skills)) groups.push(detail.skills)
  if (Array.isArray(variantDetail.skills)) groups.push(variantDetail.skills)
  const skillTypes = detail.skill_types || variantDetail.skill_types || {}
  Object.values(skillTypes || {}).forEach((list) => { if (Array.isArray(list)) groups.push(list) })
  // 从 petSkills 按编号获取技能名列表，再映射到完整技能对象
  if (petSeq) {
    const skillEntry = petSkills[String(petSeq)]
    if (skillEntry && Array.isArray(skillEntry.skills)) {
      const mapped = skillEntry.skills
        .map((s) => {
          const name = repairText(s.name).trim()
          if (!name) return null
          const fullSkill = skillsData[name] || {}
          return { ...fullSkill, name, level: s.level, skill_type: s.skill_type }
        })
        .filter(Boolean)
      if (mapped.length) groups.push(mapped)
    }
  }
  const seen = new Set()
  const merged = []
  groups.flat().forEach((skill) => {
    const name = repairText(skill && skill.name ? skill.name : '').trim()
    if (!name || seen.has(name)) return
    seen.add(name)
    merged.push(skill)
  })
  return merged
}

function normalizePet(rawPet = {}, detail = {}, variantDetail = {}) {
  const rawId = rawPet.id ?? detail.id ?? variantDetail.id ?? null
  const id = Number(rawId)
  const baseName = pickFirstText(rawPet.name, detail.name, variantDetail.name)
  const fullName = pickFirstText(detail.fullName, variantDetail.fullName, variantDetail.variantName, rawPet.fullName, rawPet.variantName, baseName)
  const variantName = pickFirstText(detail.variantName, variantDetail.variantName)
  const displayName = fullName || baseName
  const types = []
  ;[].concat(Array.isArray(rawPet.type) ? rawPet.type : [], Array.isArray(rawPet.types) ? rawPet.types : [], Array.isArray(detail.type) ? detail.type : [], Array.isArray(detail.types) ? detail.types : [], Array.isArray(variantDetail.type) ? variantDetail.type : []).forEach((item) => {
    const value = repairText(item).trim()
    if (value) types.push(value)
  })
  const uniqueTypes = Array.from(new Set(types))
  const race = detail.race || variantDetail.race || rawPet.race || {}
  const panel = calculatePetPanel({ race: race || {} }, { level: 60, star: 5, ivs: cloneIvs(), natureUp: '无', natureDown: '无' }) || {}
  const skills = collectPetSkills(detail, variantDetail, id)
  const searchText = [displayName, baseName, variantName, uniqueTypes.join(' '), String(id)].filter(Boolean).join(' ').toLowerCase()
  const panelPreviewText = panel && typeof panel === 'object'
    ? '60级5星预览 ' + Math.round(panel.hp || 0) + '/' + Math.round(panel.attack || 0) + '/' + Math.round(panel.mattack || 0) + '/' + Math.round(panel.defense || 0) + '/' + Math.round(panel.mdefense || 0) + '/' + Math.round(panel.speed || 0)
    : ''
  return {
    key: variantDetail.key || ('pet:' + id + (variantName ? ':' + variantName : '')),
    id,
    name: displayName,
    fullName: displayName,
    baseName: baseName || displayName,
    variantName,
    types: uniqueTypes,
    img: variantDetail.img || detail.img || rawPet.img || '',
    uiTag: rawPet.uiTag || '其他',
    race,
    skills,
    detail: { ...rawPet, ...detail, ...variantDetail, race, skills },
    panelPreviewText,
    searchText
  }
}

function getPetImage(pet = {}) { return resolveAssetPath(pet && (pet.img || (pet.detail && pet.detail.img)) || '') }
function getPetTypes(pet = {}) { return Array.isArray(pet && pet.types) ? pet.types : [] }
function getPetSkills(pet = {}) { return Array.isArray(pet && pet.skills) ? pet.skills : [] }
function getSkillIcon(skill = {}) { const name = repairText(skill && (skill.name || skill) || '').trim(); return resolveAssetPath(skillIcons[name] || '') }

// 兼容：从新数据构建旧格式
function buildPetsArray() {
  return buildBasePetList()
}

const _pets = buildPetsArray()

function buildPetList() {
  return _pets.map((pet) => {
    const seq = String(pet.id)
    const variants = getPetVariantDetails(seq)
    const mainDetail = variants?.[0] || {}
    return normalizePet(pet, mainDetail, {}, seq)
  })
}

function buildSkillLibrary() {
  const entries = Object.values(skillsData || {})
  const seen = new Set()
  return entries
    .map((skill) => normalizeBattleSkill(skill))
    .map((skill) => ({
      ...skill,
      displayType: getDisplayType(skill.type),
      sourceType: getSkillSource(skill),
      icon: getSkillIcon(skill),
      shortDesc: truncateText(skill.describe, 34),
      searchText: [skill.name, skill.attr, skill.type, skill.skillType, skill.describe].filter(Boolean).join(' ').toLowerCase()
    }))
    .filter((skill) => {
      if (!skill.name || seen.has(skill.name)) return false
      seen.add(skill.name)
      return true
    })
}

const FULL_SKILL_LIBRARY = buildSkillLibrary()

function buildSkillList(skills = [], attackTypes = [], petNames = []) {
  const presets = commonSkillPresets || {}
  const petNameList = Array.isArray(petNames) ? petNames : [petNames]
  const override = petNameList.map((name) => (presets.petOverrides || {})[name]).find(Boolean) || {}
  const preferredSkills = Array.isArray(override.preferredSkills) ? override.preferredSkills : []
  const sourceSkills = Array.isArray(skills) && skills.length ? skills : []
  return sourceSkills
    .map((skill) => {
      const merged = { ...(skillsData[skill && skill.name ? skill.name : ''] || {}), ...skill }
      const normalized = normalizeBattleSkill(merged)
      return {
        ...normalized,
        displayType: getDisplayType(normalized.type),
        sourceType: getSkillSource(merged),
        icon: getSkillIcon(merged),
        stab: attackTypes.includes(normalized.attr),
        shortDesc: truncateText(normalized.describe, 34),
        searchText: [normalized.name, normalized.attr, normalized.type, normalized.skillType, normalized.describe].filter(Boolean).join(' ').toLowerCase()
      }
    })
    .sort((a, b) => {
      const aPreferred = preferredSkills.indexOf(a.name)
      const bPreferred = preferredSkills.indexOf(b.name)
      const aPreferredRank = aPreferred === -1 ? 999 : aPreferred
      const bPreferredRank = bPreferred === -1 ? 999 : bPreferred
      if (aPreferredRank !== bPreferredRank) return aPreferredRank - bPreferredRank
      if ((b.power || 0) !== (a.power || 0)) return (b.power || 0) - (a.power || 0)
      if (a.stab !== b.stab) return a.stab ? -1 : 1
      return (a.consume || 0) - (b.consume || 0)
    })
}

const PVP_STATE_KEY = 'pvp_breakpoint_state_v1'

function loadPvpState() {
  try {
    const raw = uni.getStorageSync(PVP_STATE_KEY)
    if (!raw) return null
    return JSON.parse(raw)
  } catch (e) {
    return null
  }
}

function savePvpState(state) {
  if (!state) return
  try {
    uni.setStorageSync(PVP_STATE_KEY, JSON.stringify({ ...state, savedAt: Date.now() }))
  } catch (e) {
    console.warn('savePvpState failed', e)
  }
}

export default {
  name: 'PvpBreakpointPage',
  components: { AppHeader, AppIcon, TypeBadge, DamageHpCompareBar, PetSelector },
  data() {
    const petList = buildPetList()
    const firstPet = petList[0] || null
    const secondPet = petList.find((item) => item.id !== firstPet?.id) || firstPet
    return {
      petList,
      attackSide: { ...createDefaultSide(), petId: firstPet?.id || null },
      defenseSide: { ...createDefaultSide(), petId: secondPet?.id || firstPet?.id || null },
      petSelectorVisible: false,
      petSelectorSide: 'attack',
      skillKeyword: '',
      paramSettingVisible: false,
      paramSide: 'attack',
      paramDraft: createDefaultSide(),
      skillSelectorVisible: false,
      skillDetailVisible: false,
      detailSkill: {},
      selectedSkillName: '',
      skillFilter: 'all',
      customSkillPower: 0,
      damageBuff: 0,
      damageMitigation: 0,
      resultState: { value: '0 伤害', subtitle: '', note: '' }
    }
  },
  computed: {
    natureOptions() { return NATURE_OPTIONS },
    natureLabels() { return NATURE_OPTIONS },
    statFields() { return STAT_FIELDS },
    ivFields() { return STAT_FIELDS },
    petTypeOptions() { return (petTypes || []).map((item) => ({ key: item.key, label: item.label || item.key, color: item.color || '#5b7cf5' })) },
    selectorSideLabel() { return this.petSelectorSide === 'attack' ? '攻方' : '防守方' },
    paramSideLabel() { return this.paramSide === 'attack' ? '攻方' : '防守方' },
    paramPet() { return this.getPetById(this.paramSide === 'defense' ? this.defenseSide.petId : this.attackSide.petId) },
    filledIvItems() {
      return STAT_FIELDS.map((item) => ({ key: item.key, label: item.label, value: Number(this.paramDraft.ivs?.[item.key]) || 0 })).filter((item) => item.value > 0)
    },
    attackPet() { return this.getPetById(this.attackSide.petId) },
    defensePet() { return this.getPetById(this.defenseSide.petId) },
    attackTypes() { return this._extractTypes(this.attackPet) },
    defenseTypes() { return this._extractTypes(this.defensePet) },
    attackPanel() { return this.calculatePanel(this.attackSide, this.attackPet) },
    defensePanel() { return this.calculatePanel(this.defenseSide, this.defensePet) },
    attackStatBlocks() { return this.buildStatBlocks(this.attackPanel, this.attackSide) },
    defenseStatBlocks() { return this.buildStatBlocks(this.defensePanel, this.defenseSide) },
    petOptions() { return this.petList },
    attackSkillOptions() {
      const pet = this.attackPet
      const skillList = getPetSkills(pet)
      const petNames = [pet.name, pet.baseName, pet.fullName].filter(Boolean)
      return buildSkillList(skillList, this.attackTypes, petNames)
        .filter((skill) => skill.isDamageSkill)
        .map((skill) => {
          const basePower = Number(skill.power) || 0
          const attrMultiplier = getAttrMultiplier(skill.attr, this.defenseTypes)
          const normalizedSkillAttr = normalizeAttr(skill.attr) || ''
          const sameTypeMultiplier = normalizedSkillAttr && this.attackTypes.includes(normalizedSkillAttr) ? 1.25 : 1.0
          const autoCalculatedPower = Math.round(basePower * attrMultiplier * sameTypeMultiplier)
          const noteParts = [`基础 ${Math.round(basePower)}`]
          if (attrMultiplier !== 1) noteParts.push(`克制 ${Number(attrMultiplier.toFixed(2))}倍`)
          if (sameTypeMultiplier !== 1) noteParts.push(`本系 ${sameTypeMultiplier.toFixed(1)}倍`)
          if (Number(skill.baseHits) > 1) noteParts.push(`${Math.round(skill.baseHits)}连击`)
          return {
            ...skill,
            autoCalculatedPower,
            calculationNote: noteParts.join(' × ')
          }
        })
    },
    skillFilterOptions() {
      return [
        { value: 'all', label: '全部' },
        { value: '精灵技能', label: '初始技能' },
        { value: '血脉技能', label: '血脉技能' },
        { value: '可学技能石', label: '技能石' }
      ]
    },
    filteredSkillOptions() {
      const keyword = String(this.skillKeyword || '').trim().toLowerCase()
      const filter = this.skillFilter
      let list = this.attackSkillOptions
      if (filter && filter !== 'all') {
        list = list.filter((skill) => skill.sourceType === filter)
      }
      if (!keyword) return list
      return list.filter((skill) => String(skill.searchText || '').includes(keyword))
    },
    selectedSkill() {
      if (!this.attackSkillOptions.length) return this.normalizeSkill({})
      return this.attackSkillOptions.find((skill) => skill.name === this.selectedSkillName) || this.attackSkillOptions[0]
    },
    selectedSkillIcon() { return this.selectedSkill.icon || this.getSkillIcon(this.selectedSkill.name) },
    skillShortDesc() { return this.selectedSkill.shortDesc || this.shortText(this.selectedSkill.describe, 42) },
    detailSkillIcon() { return this.getSkillIcon(this.detailSkill.name) },
    detailSkillSource() { return this.detailSkill.sourceType || getSkillSource(this.detailSkill) },
    detailSkillTags() {
      const tags = Array.isArray(this.detailSkill.mechanicTags) ? this.detailSkill.mechanicTags : []
      if (tags.length) return Array.from(new Set(tags))
      return this.detailSkill.sourceType ? [this.detailSkill.sourceType] : ['暂无识别']
    },
    resultModeLabel() { return '伤害计算' }
  },
  onLoad(options) {
    const routeId = Number(options && (options.id || options.petId) || 0)
    // 尝试恢复上次保存的状态
    const saved = loadPvpState()
    if (saved && !routeId) {
      if (saved.attackPetId) this.attackSide.petId = saved.attackPetId
      if (saved.defensePetId) this.defenseSide.petId = saved.defensePetId
      if (saved.selectedSkillName) this.selectedSkillName = saved.selectedSkillName
      if (saved.damageBuff !== undefined) this.damageBuff = saved.damageBuff
      if (saved.damageMitigation !== undefined) this.damageMitigation = saved.damageMitigation
      // 验证恢复的 petId 是否有效
      if (!this.petOptions.find((p) => p.id === this.attackSide.petId)) {
        this.attackSide.petId = this.petList[0]?.id || null
      }
      if (!this.petOptions.find((p) => p.id === this.defenseSide.petId)) {
        this.defenseSide.petId = this.petList.find((p) => p.id !== this.attackSide.petId)?.id || this.attackSide.petId
      }
    } else if (routeId) {
      const matched = this.petOptions.find((item) => Number(item.id) === routeId)
      if (matched) {
        this.attackSide.petId = matched.id
        this.defenseSide.petId = this.petOptions.find((item) => item.id !== matched.id)?.id || matched.id
      }
    }
    this.applyPetConfig(this.attackSide)
    this.applyPetConfig(this.defenseSide)
    this.syncSelectedSkill()
    this.calculateDamage()
  },
  methods: {
    persistPvpState() {
      savePvpState({
        attackPetId: this.attackSide.petId,
        defensePetId: this.defenseSide.petId,
        selectedSkillName: this.selectedSkillName,
        damageBuff: this.damageBuff,
        damageMitigation: this.damageMitigation
      })
    },
    swapSides() {
      const nextAttack = { ...this.defenseSide, ivs: cloneIvs(this.defenseSide.ivs) }
      const nextDefense = { ...this.attackSide, ivs: cloneIvs(this.attackSide.ivs) }
      this.attackSide = nextAttack
      this.defenseSide = nextDefense
      this.syncSelectedSkill()
      this.calculateDamage()
      this.persistPvpState()
    },
    openFloatWindow() {
      // #ifdef APP-PLUS
      if (!isSystemOverlayAvailable()) {
        uni.showToast({ title: '悬浮窗不可用，请先用首页入口开启（需自定义调试基座）', icon: 'none' })
        return
      }
      if (!hasOverlayPermission()) {
        uni.showToast({ title: '请先授予悬浮窗权限（首页入口有引导）', icon: 'none' })
        return
      }
      const result = openDamageFloatWindow()
      if (!result.ok) {
        uni.showToast({ title: '悬浮窗打开失败：' + (result.message || ''), icon: 'none' })
      }
      // #endif
      // #ifndef APP-PLUS
      uni.showToast({ title: '悬浮窗仅支持 Android App', icon: 'none' })
      // #endif
    },
    openPetSelector(side) {
      this.petSelectorSide = side === 'defense' ? 'defense' : 'attack'
      this.petSelectorVisible = true
    },
    getActivePetId() {
      return this.petSelectorSide === 'defense' ? this.defenseSide.petId : this.attackSide.petId
    },
    onPetSelected(pet) {
      if (!pet) return
      const side = this.petSelectorSide === 'defense' ? this.defenseSide : this.attackSide
      side.petId = pet.id
      this.applyPetConfig(side)
      this.petSelectorVisible = false
      this.syncSelectedSkill()
      this.calculateDamage()
      this.persistPvpState()
    },
    applyPetConfig(side) {
      if (!side || !side.petId) return
      const pet = this.petOptions.find((p) => p.id === side.petId)
      if (!pet) return
      const cached = loadPetConfig(pet.id)
      if (cached && cached.ivs) {
        side.ivs = { ...cached.ivs }
        if (cached.natureUp) side.natureUp = cached.natureUp
        if (cached.natureDown) side.natureDown = cached.natureDown
        if (cached.star !== undefined) side.star = cached.star
        if (cached.level !== undefined) side.level = cached.level
      } else {
        const race = pet.detail?.race || pet.race || {}
        side.ivs = buildSuggestedIvs(race, side.natureUp, side.natureDown)
      }
    },
    openParamSetting(side) {
      this.paramSide = side === 'defense' ? 'defense' : 'attack'
      const source = this.paramSide === 'defense' ? this.defenseSide : this.attackSide
      this.paramDraft = { ...source, ivs: cloneIvs(source.ivs) }
      this.paramSettingVisible = true
    },
    closeParamSetting() { this.paramSettingVisible = false },
    formatTypes(types = []) { return Array.isArray(types) && types.length ? types.join(' / ') : '无属性' },
    onParamIvInput(key, event) {
      let value = Number(event?.detail?.value || 0)
      if (!Number.isFinite(value) || value <= 0) value = 0
      else value = Math.min(10, Math.max(7, Math.round(value)))
      this.paramDraft.ivs = { ...this.paramDraft.ivs, [key]: value }
      this.saveParamConfig()
    },
    applyFullConfig() {
      const config = buildOpponentFullConfig(this.paramPet, {
        skillType: this.paramSide === 'attack' ? this.selectedSkill.type : ''
      })
      this.paramDraft.ivs = { ...config.ivs }
      this.paramDraft.natureUp = config.natureUp
      this.paramDraft.natureDown = config.natureDown
      this.paramDraft.level = config.level
      this.paramDraft.star = config.star
      this.saveParamConfig()
    },
    applyRecommendedIvs() {
      this.paramDraft.ivs = buildSuggestedIvs(this.paramPet?.detail?.race || this.paramPet?.race || {}, this.paramDraft.natureUp, this.paramDraft.natureDown)
      this.saveParamConfig()
    },
    onNatureUpChange(event) {
      this.paramDraft.natureUp = NATURE_OPTIONS[Number(event && event.detail ? event.detail.value : 0)] || NATURE_OPTIONS[0]
      this.saveParamConfig()
    },
    onNatureDownChange(event) {
      this.paramDraft.natureDown = NATURE_OPTIONS[Number(event && event.detail ? event.detail.value : 0)] || NATURE_OPTIONS[0]
      this.saveParamConfig()
    },
    saveParamConfig() {
      const petId = this.paramSide === 'defense' ? this.defenseSide.petId : this.attackSide.petId
      if (!petId) return
      savePetConfig(petId, {
        ivs: this.paramDraft.ivs,
        natureUp: this.paramDraft.natureUp,
        natureDown: this.paramDraft.natureDown,
        star: this.paramDraft.star,
        level: this.paramDraft.level
      })
    },
    confirmParamSetting() {
      const next = {
        level: toNumber(this.paramDraft.level, 60),
        star: toNumber(this.paramDraft.star, 5),
        natureUp: this.paramDraft.natureUp || '无',
        natureDown: this.paramDraft.natureDown || '无',
        ivs: cloneIvs(this.paramDraft.ivs)
      }
      const petId = this.paramSide === 'defense' ? this.defenseSide.petId : this.attackSide.petId
      if (petId) {
        savePetConfig(petId, {
          ivs: next.ivs,
          natureUp: next.natureUp,
          natureDown: next.natureDown,
          star: next.star,
          level: next.level
        })
      }
      if (this.paramSide === 'defense') this.defenseSide = { ...this.defenseSide, ...next }
      else this.attackSide = { ...this.attackSide, ...next }
      this.paramSettingVisible = false
      this.calculateDamage()
    },
    getNatureIndex(value) { return resolveNatureIndex(value) },
    openSkillSelector() { this.skillKeyword = ''; this.skillSelectorVisible = true },
    closeSkillSelector() { this.skillSelectorVisible = false },
    selectSkill(skill) {
      if (!skill) return
      this.selectedSkillName = skill.name
      this.customSkillPower = Number(skill.autoCalculatedPower) || 0
      this.closeSkillSelector()
      this.calculateDamage()
      this.persistPvpState()
    },
    onCustomPowerInput(e) {
      const value = Number(e?.detail?.value || e?.target?.value || 0)
      this.customSkillPower = value
      this.calculateDamage()
    },
    autoCalcEffectivePower() {
      const skill = this.selectedSkill
      if (!skill) return
      const basePower = Number(skill.power) || 0
      if (!basePower) return
      const attrMultiplier = getAttrMultiplier(skill.attr, this.defenseTypes)
      const normalizedSkillAttr = normalizeAttr(skill.attr) || ''
      const sameTypeMultiplier = normalizedSkillAttr && this.attackTypes.includes(normalizedSkillAttr) ? 1.25 : 1.0
      this.customSkillPower = Math.round(basePower * attrMultiplier * sameTypeMultiplier)
      this.calculateDamage()
    },
    openSkillDetail(skill) { if (!skill) return; this.detailSkill = this.normalizeSkill(skill); this.skillDetailVisible = true },
    closeSkillDetail() { this.skillDetailVisible = false },
    calculateDamage() {
      const skill = this.selectedSkill
      if (!skill || !skill.name) {
        this.resultState = { value: '请选择输出技能', subtitle: '', note: '当前还没有可用于伤害计算的技能。', damage: 0, hp: Math.max(1, Math.round(Number(this.defensePanel.hp) || 0)) }
        return
      }
      if (!skill.isDamageSkill || Number(skill.power) <= 0) {
        this.resultState = { value: '该技能不造成直接伤害', subtitle: '', note: '该技能属于变化类或威力为 0，当前只展示其效果信息。', damage: 0, hp: Math.max(1, Math.round(Number(this.defensePanel.hp) || 0)) }
        return
      }
      const hasCustomPower = this.customSkillPower !== '' && !Number.isNaN(Number(this.customSkillPower))
      const basePower = Number(skill.power) || 0
      const attrMultiplier = getAttrMultiplier(skill.attr, this.defenseTypes)
      const normalizedSkillAttr = normalizeAttr(skill.attr) || ''
      const sameTypeMultiplier = normalizedSkillAttr && this.attackTypes.includes(normalizedSkillAttr) ? 1.25 : 1.0
      // 威力口径：单发有效威力 = 基础威力 × 克制 × 本系（连击数由引擎乘，避免双算）
      const expectedPower = Math.round(basePower * attrMultiplier * sameTypeMultiplier)
      // 用户手动填了值就直接用，否则用公式重算确保包含克制+本系
      const customPower = hasCustomPower ? Number(this.customSkillPower) : expectedPower
      const hits = Math.max(1, Math.round(Number(skill.baseHits) || 1))

      // 计算增伤倍率 (0-990%)
      const buffPercent = Math.min(990, Math.max(0, Number(this.damageBuff || 0)))
      const powerBuff = 1 + buffPercent / 100

      // 计算减伤倍率 (0-100%)
      const mitigationPercent = Math.min(100, Math.max(0, Number(this.damageMitigation || 0)))
      const defenseReduction = mitigationPercent / 100
      // customPower 已包含克制与本系加成，传普通属性避免重复计算
      const result = calculateDamageFull({
        attackerPanel: this.attackPanel,
        defenderPanel: this.defensePanel,
        skillPower: customPower,
        skillType: skill.type,
        skillAttr: '普通',
        attackerAttrs: ['普通'],
        defenderAttrs: ['普通'],
        powerBuff,
        defenseReduction: defenseReduction,
        hits,
        skipAttrAndStab: true
      })

      const damage = Math.max(1, Math.round(result.damage || 0))
      const hp = Math.max(1, Math.round(Number(this.defensePanel.hp) || 0))
      const percent = Math.round((damage / hp) * 100)
      const diff = damage - hp
      const diffNote = diff >= 0 ? '溢出 ' + diff : '剩余 ' + Math.abs(diff)
      const hitsNote = hits > 1 ? `；单发 ${Math.max(1, Math.round(damage / hits))} × ${hits} 连击` : ''
      this.resultState = { value: damage + ' 伤害', subtitle: damage + ' / ' + hp + '，' + percent + '%', note: diffNote + hitsNote, damage, hp }
    },
    syncSelectedSkill() {
      if (!this.attackSkillOptions.length) {
        this.selectedSkillName = ''
        this.customSkillPower = 0
        return
      }
      const matched = this.attackSkillOptions.find((skill) => skill.name === this.selectedSkillName)
      if (matched) {
        this.selectedSkillName = matched.name
        this.customSkillPower = Number(matched.autoCalculatedPower) || 0
        return
      }
      // 默认优先选择精灵技能（初始技能），避免自动选中血脉技能
      const defaultSkill = this.attackSkillOptions.find((s) => s.sourceType === '精灵技能') || this.attackSkillOptions[0]
      this.selectedSkillName = defaultSkill.name
      this.customSkillPower = Number(defaultSkill.autoCalculatedPower) || 0
    },
    normalizeSkill(skill = {}) {
      const base = skillsData[skill && skill.name ? skill.name : ''] || {}
      const merged = { ...base, ...skill }
      const normalized = normalizeBattleSkill(merged)
      return { ...normalized, displayType: getDisplayType(normalized.type), sourceType: getSkillSource(merged), icon: getSkillIcon(merged), shortDesc: truncateText(normalized.describe, 34), searchText: [normalized.name, normalized.attr, normalized.type, normalized.skillType, normalized.describe].filter(Boolean).join(' ').toLowerCase() }
    },
    _extractTypes(pet) {
      if (!pet) return []
      const sources = [pet.types, pet.type, pet.detail?.types, pet.detail?.type].filter(Array.isArray)
      const merged = sources.flat().map((t) => normalizeAttr(t || '')).filter(Boolean)
      return Array.from(new Set(merged))
    },
    getPetById(id) {
      const petId = Number(id)
      return this.petOptions.find((item) => Number(item.id) === petId) || this.petOptions[0] || { id: null, name: '', types: [], img: '', race: {}, skills: [], detail: {} }
    },
    calculatePanel(side, pet) {
      return calculatePetPanel(pet, { level: toNumber(side.level, 60), star: toNumber(side.star, 5), ivs: side.ivs, natureUp: side.natureUp, natureDown: side.natureDown }) || { hp: 0, attack: 0, mattack: 0, defense: 0, mdefense: 0, speed: 0 }
    },
    buildStatBlocks(panel, side) {
      return STAT_FIELDS.map((item) => ({ ...item, value: Math.round(Number(panel[item.key]) || 0), mark: this.getNatureMark(item.label, side.natureUp, side.natureDown) }))
    },
    getNatureMark(label, up, down) {
      if (up === label) return { text: '↑', class: 'up' }
      if (down === label) return { text: '↓', class: 'down' }
      return null
    },
    getPanelTotal(panel = {}) {
      return ['hp', 'attack', 'mattack', 'defense', 'mdefense', 'speed'].reduce((total, key) => total + Math.round(Number(panel[key]) || 0), 0)
    },
    getTypeColor(type) { return petTypes.find((item) => item.key === type)?.color || '#5b7cff' },
    resolvePetImage(src) { return resolveAssetPath(src || '') },
    getPetImage(pet = {}) { return this.resolvePetImage(pet?.img || pet?.detail?.img || '') },
    getPetTypes(pet = {}) { return Array.isArray(pet?.types) ? pet.types : [] },
    getSkillIcon(name = '') { return resolveAssetPath(skillIcons[name] || '') },
    shortText(text = '', length = 42) { return truncateText(text, length) },
    raceSummary(petDetail = {}) { const race = petDetail && petDetail.race ? petDetail.race : {}; const total = toNumber(race.total, 0); return total ? '种族值总和 ' + total : '暂无种族值数据' }
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
    radial-gradient(circle at 12% 6%, rgba(198, 75, 56, 0.08) 0, transparent 42%),
    radial-gradient(circle at 88% 22%, rgba(201, 161, 78, 0.06) 0, transparent 40%);
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

.hero-main {
  flex: 1;
  min-width: 0;
  display: flex;
  align-items: center;
  gap: 10px;
}

.hero-icon {
  flex-shrink: 0;
  width: 38px;
  height: 38px;
  border-radius: 12px;
  background: #FBE9E4;
  border: 1.5px solid #E0604E;
  box-shadow: 0 2px 0 rgba(198, 75, 56, 0.25);
  display: flex;
  align-items: center;
  justify-content: center;
}

.hero-text {
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

.hero-action {
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
  gap: 5px;
  height: 32px;
  padding: 0 12px;
  border-radius: 999px;
  background: #FBF3DD;
  border: 1.5px solid #D9B96A;
  box-shadow: 0 2px 0 rgba(138, 106, 44, 0.25);
  transition: transform 0.12s ease;
}

.hero-action-text {
  font-size: 11px;
  font-weight: 700;
  color: #8A6A2C;
}

/* ===== 攻守对战卡 ===== */
.battle {
  margin: 12px 14px 0;
  padding: 13px;
}

.battle-grid {
  display: flex;
  align-items: stretch;
  gap: 8px;
}

.side-card {
  flex: 1;
  min-width: 0;
  padding: 11px;
  border-radius: 14px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  transition: transform 0.12s ease;
}

.side-card.attack-side {
  background: #EFF7EF;
  border: 1.5px solid #BFDCC6;
  box-shadow: 0 2.5px 0 rgba(22, 98, 53, 0.18);
}

.side-card.defense-side {
  background: #EDF3FC;
  border: 1.5px solid #C4D8F2;
  box-shadow: 0 2.5px 0 rgba(35, 80, 143, 0.18);
}

.side-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 6px;
}

.side-seal {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  height: 25px;
  padding: 0 10px 0 8px;
  border-radius: 999px;
  border: 1.5px solid;
}

.side-seal.attack {
  background: linear-gradient(135deg, #1E7A46 0%, #2F9E5F 100%);
  border-color: #166235;
  box-shadow: 0 2px 0 rgba(22, 98, 53, 0.4);
}

.side-seal.defense {
  background: linear-gradient(135deg, #2C6FD1 0%, #4F9CFF 100%);
  border-color: #23508F;
  box-shadow: 0 2px 0 rgba(35, 80, 143, 0.4);
}

.side-seal-text {
  font-size: 10.5px;
  font-weight: 800;
  letter-spacing: 0.02em;
}

.side-seal.attack .side-seal-text {
  color: #FFF5EC;
}

.side-seal.defense .side-seal-text {
  color: #F0F7FF;
}

.side-action {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  height: 25px;
  padding: 0 9px;
  border-radius: 999px;
  background: #FFFDF7;
  border: 1px solid;
  transition: transform 0.12s ease;
}

.attack-side .side-action {
  border-color: #BFDCC6;
}

.defense-side .side-action {
  border-color: #C4D8F2;
}

.side-action-text {
  font-size: 10px;
  font-weight: 700;
}

.attack-side .side-action-text {
  color: #1E7A46;
}

.defense-side .side-action-text {
  color: #2C6FD1;
}

.pet-name {
  font-size: 13px;
  font-weight: 800;
  color: #2C3A2F;
  line-height: 1.3;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.type-row {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}

.pet-art-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.pet-art {
  flex-shrink: 0;
  width: 62px;
  height: 62px;
  border-radius: 14px;
  background: #FFFDF7;
  border: 1.5px solid;
  display: flex;
  align-items: center;
  justify-content: center;
}

.pet-art.attack-art {
  border-color: #BFDCC6;
  box-shadow: 0 2px 0 rgba(22, 98, 53, 0.15);
}

.pet-art.defense-art {
  border-color: #C4D8F2;
  box-shadow: 0 2px 0 rgba(35, 80, 143, 0.15);
}

.pet-image {
  width: 54px;
  height: 54px;
}

.side-params-link {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  height: 26px;
  padding: 0 10px;
  border-radius: 999px;
  background: #FFFDF7;
  border: 1.5px dashed;
  transition: transform 0.12s ease;
}

.attack-side .side-params-link {
  border-color: #7FBF95;
}

.defense-side .side-params-link {
  border-color: #8FB4E8;
}

.side-params-text {
  font-size: 10.5px;
  font-weight: 700;
}

.attack-side .side-params-text {
  color: #1E7A46;
}

.defense-side .side-params-text {
  color: #2C6FD1;
}

.stat-grid-compact {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 5px;
}

.stat-item-compact {
  min-height: 42px;
  padding: 5px 7px;
  border-radius: 10px;
  background: #FFFDF7;
  border: 1px solid;
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 3px;
  box-sizing: border-box;
}

.stat-item-compact.pink {
  border-color: #F2C7BF;
}

.stat-item-compact.pink .stat-value-mini {
  color: #C64B38;
}

.stat-item-compact.yellow {
  border-color: #F2D4B8;
}

.stat-item-compact.yellow .stat-value-mini {
  color: #D06E1E;
}

.stat-item-compact.purple {
  border-color: #EAD7A8;
}

.stat-item-compact.purple .stat-value-mini {
  color: #A97F35;
}

.stat-item-compact.green {
  border-color: #C4D8F2;
}

.stat-item-compact.green .stat-value-mini {
  color: #2C6FD1;
}

.stat-item-compact.blue {
  border-color: #DCD2F0;
}

.stat-item-compact.blue .stat-value-mini {
  color: #7457C4;
}

.stat-item-compact.cyan {
  border-color: #BFDCC6;
}

.stat-item-compact.cyan .stat-value-mini {
  color: #1E7A46;
}

.stat-meta-left {
  display: flex;
  align-items: center;
  gap: 4px;
}

.stat-label-mini {
  font-size: 9px;
  font-weight: 700;
  color: #6B7A6E;
}

.stat-mark-mini {
  width: 6px;
  height: 6px;
  border-radius: 999px;
}

.stat-mark-mini.up {
  background: #C64B38;
  box-shadow: 0 1px 0 rgba(198, 75, 56, 0.4);
}

.stat-mark-mini.down {
  background: #2C6FD1;
  box-shadow: 0 1px 0 rgba(44, 111, 209, 0.4);
}

.stat-value-mini {
  font-size: 13px;
  font-weight: 800;
  line-height: 1;
}

.vs-badge {
  flex-shrink: 0;
  align-self: center;
  width: 42px;
  padding: 9px 0;
  border-radius: 999px;
  background: linear-gradient(135deg, #C64B38 0%, #E0604E 100%);
  border: 1.5px solid #9C3A2B;
  box-shadow: 0 2.5px 0 rgba(156, 58, 43, 0.4);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 2px;
}

.vs-text {
  font-size: 12px;
  font-weight: 800;
  font-style: italic;
  color: #FFF5EC;
  letter-spacing: 0.04em;
}

/* ===== 区块通用 ===== */
.skill-section,
.buff-section,
.result-section {
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

.section-icon.danger,
.section-icon.red {
  background: linear-gradient(135deg, #C64B38 0%, #E0604E 100%);
  border-color: #9C3A2B;
  box-shadow: 0 2px 0 rgba(156, 58, 43, 0.4);
}

.section-title {
  font-size: 14px;
  font-weight: 800;
  color: #2C3A2F;
}

.section-action {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  height: 26px;
  padding: 0 10px;
  border-radius: 999px;
  background: #FBF3DD;
  border: 1.5px solid #D9B96A;
  box-shadow: 0 2px 0 rgba(138, 106, 44, 0.25);
  transition: transform 0.12s ease;
}

.section-action-text {
  font-size: 10.5px;
  font-weight: 700;
  color: #8A6A2C;
}

/* ===== 技能卡 ===== */
.skill-card {
  margin-top: 11px;
  padding: 11px;
  border-radius: 14px;
  background: #FBF3DD;
  border: 1.5px solid #E6D5A8;
  display: flex;
  gap: 10px;
}

.skill-icon-frame {
  flex-shrink: 0;
  width: 52px;
  height: 52px;
  border-radius: 13px;
  background: #FFFDF7;
  border: 1.5px solid #D9B96A;
  box-shadow: 0 2px 0 rgba(138, 106, 44, 0.2);
  display: flex;
  align-items: center;
  justify-content: center;
}

.skill-icon {
  width: 42px;
  height: 42px;
}

.skill-main {
  flex: 1;
  min-width: 0;
}

.skill-main-head {
  display: flex;
  align-items: center;
  gap: 8px;
}

.skill-name {
  font-size: 13.5px;
  font-weight: 800;
  color: #2C3A2F;
}

.skill-chip-row {
  margin-top: 7px;
  display: flex;
  flex-wrap: wrap;
  gap: 5px;
}

.skill-chip {
  height: 22px;
  padding: 0 9px;
  border-radius: 999px;
  background: #FFFDF7;
  border: 1px solid #E3DCC8;
  display: inline-flex;
  align-items: center;
}

.skill-chip-text {
  font-size: 10px;
  font-weight: 700;
  color: #6B7A6E;
}

.skill-chip.tone-gold {
  background: linear-gradient(135deg, #A97F35 0%, #C9A14E 100%);
  border-color: #8A6A2C;
  box-shadow: 0 1.5px 0 rgba(138, 106, 44, 0.35);
}

.skill-chip-text.tone-gold-text {
  color: #FFF9EC;
}

.power-input-row {
  margin-top: 9px;
  display: flex;
  align-items: center;
  gap: 8px;
}

.power-label {
  flex-shrink: 0;
  font-size: 11px;
  font-weight: 700;
  color: #6B7A6E;
}

.power-input {
  flex: 1;
  min-width: 0;
  height: 32px;
  padding: 0 10px;
  border-radius: 10px;
  background: #FFFDF7;
  border: 1.5px solid #D9B96A;
  font-size: 13px;
  font-weight: 800;
  color: #2C3A2F;
  font-family: Monaco, Consolas, 'Courier New', monospace;
}

.auto-calc-btn {
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
  gap: 4px;
  height: 32px;
  padding: 0 11px;
  border-radius: 10px;
  background: linear-gradient(135deg, #A97F35 0%, #C9A14E 100%);
  border: 1.5px solid #8A6A2C;
  box-shadow: 0 2px 0 rgba(138, 106, 44, 0.4);
  transition: transform 0.12s ease;
}

.auto-calc-text {
  font-size: 10.5px;
  font-weight: 700;
  color: #FFF9EC;
}

.power-note-box {
  margin-top: 9px;
  padding: 8px 10px;
  border-radius: 10px;
  background: #FFFDF7;
  border: 1px dashed #D9B96A;
  display: flex;
  flex-direction: column;
  gap: 5px;
}

.note-line {
  display: flex;
  align-items: flex-start;
  gap: 5px;
}

.note-text {
  flex: 1;
  font-size: 10px;
  color: #6B7A6E;
  line-height: 1.5;
}

.note-text.warn {
  color: #C64B38;
}

.dynamic-hint {
  margin-top: 8px;
  padding: 7px 9px;
  border-radius: 10px;
  background: #FBE9E4;
  border: 1px solid #E8A99E;
  display: flex;
  align-items: flex-start;
  gap: 5px;
}

.dynamic-hint-text {
  flex: 1;
  font-size: 10px;
  font-weight: 700;
  color: #C64B38;
  line-height: 1.5;
}

.skill-detail-row {
  margin-top: 9px;
  display: flex;
  align-items: flex-start;
  gap: 8px;
}

.skill-desc {
  flex: 1;
  min-width: 0;
  font-size: 10.5px;
  color: #6B7A6E;
  line-height: 1.55;
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
  overflow: hidden;
}

.detail-btn {
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
  gap: 3px;
  height: 24px;
  padding: 0 9px;
  border-radius: 999px;
  background: #FFFDF7;
  border: 1px solid #D9B96A;
  transition: transform 0.12s ease;
}

.detail-btn-text {
  font-size: 10px;
  font-weight: 700;
  color: #A97F35;
}

/* ===== 伤害修饰符 ===== */
.buff-grid {
  margin-top: 11px;
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;
}

.buff-item {
  padding: 10px 11px;
  border-radius: 13px;
  background: #FFFDF7;
  border: 1.5px solid;
}

.buff-item.tone-up {
  border-color: #E8A99E;
  box-shadow: 0 2px 0 rgba(198, 75, 56, 0.18);
}

.buff-item.tone-down {
  border-color: #A9C4EC;
  box-shadow: 0 2px 0 rgba(44, 111, 209, 0.18);
}

.buff-head {
  display: flex;
  align-items: center;
  gap: 5px;
}

.buff-label {
  font-size: 11.5px;
  font-weight: 800;
  color: #2C3A2F;
}

.buff-input-wrap {
  margin-top: 8px;
  display: flex;
  align-items: center;
  gap: 6px;
}

.buff-input {
  flex: 1;
  min-width: 0;
  height: 34px;
  padding: 0 10px;
  border-radius: 10px;
  background: #F7F1E3;
  border: 1.5px solid #E3DCC8;
  font-size: 14px;
  font-weight: 800;
  color: #2C3A2F;
  font-family: Monaco, Consolas, 'Courier New', monospace;
}

.tone-up .buff-input {
  border-color: #E8A99E;
  color: #C64B38;
}

.tone-down .buff-input {
  border-color: #A9C4EC;
  color: #2C6FD1;
}

.buff-unit {
  font-size: 12px;
  font-weight: 800;
  color: #6B7A6E;
}

.buff-note {
  display: block;
  margin-top: 6px;
  font-size: 9.5px;
  color: #A3AE9F;
}

/* ===== 计算结果 ===== */
.result-mode {
  flex-shrink: 0;
  height: 22px;
  padding: 0 9px;
  border-radius: 999px;
  background: #FBE9E4;
  border: 1px solid #E8A99E;
  display: inline-flex;
  align-items: center;
  font-size: 10px;
  font-weight: 700;
  color: #C64B38;
}

.result-bar {
  margin-top: 11px;
  display: flex;
  align-items: baseline;
  gap: 8px;
  flex-wrap: wrap;
}

.result-value {
  font-size: 20px;
  font-weight: 800;
  color: #C64B38;
}

.result-subtitle {
  font-size: 12px;
  font-weight: 700;
  color: #2C6FD1;
}

.result-note {
  display: block;
  margin-top: 5px;
  font-size: 10.5px;
  color: #6B7A6E;
  line-height: 1.5;
}

/* ===== 模态框 ===== */
.modal-mask {
  position: fixed;
  left: 0;
  right: 0;
  top: 0;
  bottom: 0;
  z-index: 999;
  background: rgba(44, 58, 47, 0.45);
  display: flex;
  align-items: flex-end;
  justify-content: center;
}

.modal-sheet {
  width: 100%;
  max-width: 640px;
  max-height: 86vh;
  background: #FAF6EC;
  border: 1.5px solid #E3DCC8;
  border-bottom: none;
  border-radius: 22px 22px 0 0;
  box-shadow: 0 -4px 0 rgba(44, 58, 47, 0.08);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  padding-bottom: calc(10px + env(safe-area-inset-bottom));
}

.modal-head {
  flex-shrink: 0;
  padding: 13px 14px 11px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  background: #FFFDF7;
  border-bottom: 1.5px solid #E3DCC8;
}

.modal-head-left {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
}

.modal-head-icon {
  flex-shrink: 0;
  width: 32px;
  height: 32px;
  border-radius: 11px;
  background: linear-gradient(135deg, #C64B38 0%, #E0604E 100%);
  border: 1.5px solid #9C3A2B;
  box-shadow: 0 2px 0 rgba(156, 58, 43, 0.4);
  display: flex;
  align-items: center;
  justify-content: center;
}

.modal-head-icon.gold {
  background: linear-gradient(135deg, #A97F35 0%, #C9A14E 100%);
  border-color: #8A6A2C;
  box-shadow: 0 2px 0 rgba(138, 106, 44, 0.4);
}

.modal-title {
  font-size: 15px;
  font-weight: 800;
  color: #2C3A2F;
}

.modal-close {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  height: 26px;
  padding: 0 10px;
  border-radius: 999px;
  background: #FBE9E4;
  border: 1.5px solid #E8A99E;
  transition: transform 0.12s ease;
}

.modal-close-text {
  font-size: 10.5px;
  font-weight: 700;
  color: #C64B38;
}

.modal-scroll {
  flex: 1;
  min-height: 0;
  padding: 0 14px;
}

/* 参数设置弹层 */
.selected-card {
  margin: 12px 14px 0;
  padding: 11px;
  border-radius: 14px;
  background: #FFFDF7;
  border: 1.5px solid #E3DCC8;
  box-shadow: 0 2px 0 rgba(44, 58, 47, 0.08);
  display: flex;
  align-items: center;
  gap: 10px;
}

.selected-image-frame {
  flex-shrink: 0;
  width: 56px;
  height: 56px;
  border-radius: 13px;
  background: #F7F1E3;
  border: 1.5px dashed #CFC7AE;
  display: flex;
  align-items: center;
  justify-content: center;
}

.selected-image {
  width: 48px;
  height: 48px;
}

.selected-info {
  flex: 1;
  min-width: 0;
}

.selected-name {
  display: block;
  font-size: 13.5px;
  font-weight: 800;
  color: #2C3A2F;
}

.selected-type {
  display: block;
  margin-top: 3px;
  font-size: 10.5px;
  color: #6B7A6E;
}

.selected-note {
  display: block;
  margin-top: 4px;
  font-size: 9.5px;
  color: #A3AE9F;
  line-height: 1.5;
}

.config-card {
  margin: 10px 14px 0;
  padding: 11px;
  border-radius: 14px;
  background: #FFFDF7;
  border: 1.5px solid #E3DCC8;
}

.config-title {
  display: block;
  font-size: 12px;
  font-weight: 800;
  color: #2C3A2F;
}

.picker-stack {
  margin-top: 9px;
  display: flex;
  gap: 8px;
}

.picker-box {
  flex: 1;
  height: 34px;
  padding: 0 10px;
  border-radius: 10px;
  background: #F7F1E3;
  border: 1.5px solid #E3DCC8;
  display: flex;
  align-items: center;
  font-size: 11.5px;
  font-weight: 700;
  color: #2C3A2F;
}

.iv-summary {
  margin-top: 9px;
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.iv-summary-label {
  font-size: 10.5px;
  font-weight: 700;
  color: #6B7A6E;
}

.iv-summary-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 5px;
}

.iv-summary-tag {
  height: 20px;
  padding: 0 8px;
  border-radius: 999px;
  background: #FBF3DD;
  border: 1px solid #D9B96A;
  display: inline-flex;
  align-items: center;
  font-size: 9.5px;
  font-weight: 700;
  color: #8A6A2C;
}

.iv-summary-empty {
  font-size: 10px;
  color: #A3AE9F;
}

.iv-rule-tip {
  display: block;
  margin-top: 7px;
  font-size: 9.5px;
  color: #A3AE9F;
  line-height: 1.5;
}

.iv-grid {
  margin-top: 9px;
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 7px;
}

.iv-item {
  padding: 7px 8px;
  border-radius: 11px;
  background: #F7F1E3;
  border: 1.5px dashed #CFC7AE;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 6px;
}

.iv-item.active {
  border-style: solid;
  border-color: #D9B96A;
  background: #FBF3DD;
  box-shadow: 0 2px 0 rgba(138, 106, 44, 0.18);
}

.iv-label {
  font-size: 10.5px;
  font-weight: 700;
  color: #6B7A6E;
}

.iv-input {
  width: 52px;
  height: 28px;
  padding: 0 8px;
  border-radius: 9px;
  background: #FFFDF7;
  border: 1px solid #E3DCC8;
  font-size: 12.5px;
  font-weight: 800;
  color: #2C3A2F;
  text-align: center;
  font-family: Monaco, Consolas, 'Courier New', monospace;
}

.modal-actions {
  margin: 12px 14px 0;
  display: flex;
  gap: 8px;
}

.modal-btn {
  flex: 1;
  height: 38px;
  border-radius: 13px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 5px;
  transition: transform 0.12s ease;
}

.modal-btn.ghost {
  background: #F7F1E3;
  border: 1.5px solid #CFC7AE;
  box-shadow: 0 2.5px 0 rgba(44, 58, 47, 0.12);
  font-size: 12px;
  font-weight: 700;
  color: #6B7A6E;
}

.modal-btn.primary {
  background: linear-gradient(135deg, #C64B38 0%, #E0604E 100%);
  border: 1.5px solid #9C3A2B;
  box-shadow: 0 2.5px 0 rgba(156, 58, 43, 0.4);
}

.modal-btn-text {
  font-size: 12px;
  font-weight: 700;
  color: #FFF5EC;
}

/* 技能选择弹层 */
.search-row {
  padding: 12px 14px 0;
}

.search-box {
  height: 38px;
  padding: 0 12px;
  border-radius: 12px;
  background: #FFFDF7;
  border: 1.5px solid #E3DCC8;
  box-shadow: 0 2px 0 rgba(44, 58, 47, 0.08);
  display: flex;
  align-items: center;
  gap: 8px;
}

.search-input {
  flex: 1;
  min-width: 0;
  height: 100%;
  font-size: 12.5px;
  font-weight: 700;
  color: #2C3A2F;
}

.search-placeholder {
  color: #A3AE9F;
  font-size: 12px;
  font-weight: 400;
}

.skill-filter-row {
  padding: 10px 14px 0;
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.filter-chip {
  height: 28px;
  padding: 0 12px;
  border-radius: 999px;
  background: #FFFDF7;
  border: 1.5px dashed #CFC7AE;
  display: inline-flex;
  align-items: center;
  transition: transform 0.12s ease;
}

.filter-chip.active {
  border-style: solid;
  background: linear-gradient(135deg, #A97F35 0%, #C9A14E 100%);
  border-color: #8A6A2C;
  box-shadow: 0 2px 0 rgba(138, 106, 44, 0.35);
}

.filter-chip-text {
  font-size: 11px;
  font-weight: 700;
  color: #6B7A6E;
}

.filter-chip.active .filter-chip-text {
  color: #FFF9EC;
}

.skill-scroll {
  padding: 10px 14px 0;
}

.skill-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;
  padding-bottom: 12px;
}

@media screen and (min-width: 640px) {
  .skill-grid {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
}

.skill-option-card {
  padding: 9px;
  border-radius: 12px;
  background: #FFFDF7;
  border: 1.5px solid #E3DCC8;
  display: flex;
  align-items: center;
  gap: 8px;
  transition: transform 0.12s ease;
}

.skill-option-card.active {
  border-color: #A97F35;
  background: #FBF3DD;
  box-shadow: 0 2px 0 rgba(138, 106, 44, 0.25);
}

.skill-option-icon-wrap {
  flex-shrink: 0;
  width: 40px;
  height: 40px;
  border-radius: 11px;
  background: #F7F1E3;
  border: 1px solid #E3DCC8;
  display: flex;
  align-items: center;
  justify-content: center;
}

.skill-option-icon {
  width: 32px;
  height: 32px;
}

.skill-option-info {
  flex: 1;
  min-width: 0;
}

.skill-option-name {
  display: block;
  font-size: 11.5px;
  font-weight: 800;
  color: #2C3A2F;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.skill-option-power {
  display: block;
  margin-top: 3px;
  font-size: 9.5px;
  color: #A3AE9F;
}

.empty-tip {
  padding: 24px 0;
  text-align: center;
  font-size: 11.5px;
  color: #A3AE9F;
}

/* 技能详情弹层 */
.skill-detail-sheet {
  max-height: 80vh;
}

.skill-detail-top {
  margin: 12px 14px 0;
  padding: 11px;
  border-radius: 14px;
  background: #FBF3DD;
  border: 1.5px solid #E6D5A8;
  display: flex;
  align-items: center;
  gap: 10px;
}

.skill-detail-icon-frame {
  flex-shrink: 0;
  width: 54px;
  height: 54px;
  border-radius: 13px;
  background: #FFFDF7;
  border: 1.5px solid #D9B96A;
  display: flex;
  align-items: center;
  justify-content: center;
}

.skill-detail-icon {
  width: 44px;
  height: 44px;
}

.skill-detail-main {
  flex: 1;
  min-width: 0;
}

.skill-detail-name {
  display: block;
  font-size: 14px;
  font-weight: 800;
  color: #2C3A2F;
}

.skill-detail-tags {
  margin-top: 6px;
  display: flex;
  flex-wrap: wrap;
  gap: 5px;
}

.detail-tag {
  height: 20px;
  padding: 0 8px;
  border-radius: 999px;
  background: #FFFDF7;
  border: 1px solid #D9B96A;
  display: inline-flex;
  align-items: center;
  font-size: 9.5px;
  font-weight: 700;
  color: #8A6A2C;
}

.detail-list {
  margin: 10px 14px 0;
  padding: 2px 12px;
  border-radius: 14px;
  background: #FFFDF7;
  border: 1.5px solid #E3DCC8;
}

.detail-row {
  padding: 10px 0;
  border-bottom: 1px dashed #E3DCC8;
  display: flex;
  gap: 10px;
}

.detail-row:last-child {
  border-bottom: none;
}

.detail-row.detail-desc-row,
.detail-row.detail-tags-row {
  align-items: flex-start;
}

.detail-label {
  flex-shrink: 0;
  width: 64px;
  font-size: 11px;
  font-weight: 700;
  color: #6B7A6E;
}

.detail-value {
  flex: 1;
  min-width: 0;
  font-size: 11.5px;
  font-weight: 700;
  color: #2C3A2F;
}

.detail-value.desc {
  font-weight: 400;
  color: #6B7A6E;
  line-height: 1.6;
}

.tag-wrap {
  display: flex;
  flex-wrap: wrap;
  gap: 5px;
}

.mini-tag {
  height: 19px;
  padding: 0 7px;
  border-radius: 999px;
  background: #F2EBDA;
  border: 1px solid #E3DCC8;
  display: inline-flex;
  align-items: center;
  font-size: 9px;
  font-weight: 700;
  color: #6B7A6E;
}

.detail-dynamic-hint {
  margin: 10px 0;
  padding: 8px 10px;
  border-radius: 10px;
  background: #FBE9E4;
  border: 1px solid #E8A99E;
  display: flex;
  align-items: flex-start;
  gap: 5px;
}

.detail-dynamic-text {
  flex: 1;
  font-size: 10px;
  font-weight: 700;
  color: #C64B38;
  line-height: 1.5;
}

.bottom-space {
  height: calc(28px + env(safe-area-inset-bottom));
}
</style>
