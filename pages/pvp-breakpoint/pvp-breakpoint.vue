<template>
  <view class="page">
    <scroll-view scroll-y class="page-scroll" enhanced show-scrollbar="false">
      <view class="hero card">
        <text class="page-title">伤害计算</text>
        <text class="page-subtitle">攻击方和防守方的伤害对比</text>
        <view class="tab-row">
          <view class="tab-item active">伤害计算</view>
        </view>
        <view class="swap-wrap">
          <view class="swap-btn" hover-class="touch-active" @click="swapSides">交换攻守</view>
        </view>
      </view>

      <view class="battle card">
        <view class="battle-grid">
          <view class="side-card" @click="openPetSelector('attack')">
            <view class="side-head">
              <view class="side-meta">
                <view class="side-tag attack">攻方</view>
                <text class="pet-name">{{ attackPet.name || '未选择精灵' }}</text>
                <view class="type-row">
                  <TypeBadge v-for="type in attackTypes" :key="'attack-' + type" :label="type" :color="getTypeColor(type)" compact />
                </view>
              </view>
              <view class="side-action" hover-class="touch-active" @click.stop="openPetSelector('attack')">更换</view>
            </view>
            <view class="pet-art-row">
              <view class="pet-art">
                <RemoteImage class="pet-image" :src="resolvePetImage(attackPet.img)" mode="aspectFit" />
              </view>
              <view class="pet-meta-line">
                <view class="side-params-link" hover-class="touch-active" @click.stop="openParamSetting('attack')">参数设置</view>
              </view>
            </view>
            <view class="stat-grid">
              <view v-for="item in attackStatBlocks" :key="'attack-' + item.key" class="stat-item" :class="item.theme">
                <text class="stat-label">{{ item.label }}</text>
                <view class="stat-value-row">
                  <text class="stat-value">{{ item.value }}</text>
                  <text v-if="item.mark" class="stat-mark" :class="item.mark.class">{{ item.mark.text }}</text>
                </view>
              </view>
            </view>
          </view>

          <view class="vs-badge">VS</view>

          <view class="side-card" @click="openPetSelector('defense')">
            <view class="side-head">
              <view class="side-meta">
                <view class="side-tag defense">防守</view>
                <text class="pet-name">{{ defensePet.name || '未选择精灵' }}</text>
                <view class="type-row">
                  <TypeBadge v-for="type in defenseTypes" :key="'defense-' + type" :label="type" :color="getTypeColor(type)" compact />
                </view>
              </view>
              <view class="side-action" hover-class="touch-active" @click.stop="openPetSelector('defense')">更换</view>
            </view>
            <view class="pet-art-row">
              <view class="pet-art defense-art">
                <RemoteImage class="pet-image" :src="resolvePetImage(defensePet.img)" mode="aspectFit" />
              </view>
              <view class="pet-meta-line">
                <view class="side-params-link" hover-class="touch-active" @click.stop="openParamSetting('defense')">参数设置</view>
              </view>
            </view>
            <view class="stat-grid">
              <view v-for="item in defenseStatBlocks" :key="'defense-' + item.key" class="stat-item" :class="item.theme">
                <text class="stat-label">{{ item.label }}</text>
                <view class="stat-value-row">
                  <text class="stat-value">{{ item.value }}</text>
                  <text v-if="item.mark" class="stat-mark" :class="item.mark.class">{{ item.mark.text }}</text>
                </view>
              </view>
            </view>
          </view>
        </view>
      </view>

      <view class="skill-section card">
        <view class="section-head">
          <text class="section-title">攻击技能</text>
          <view class="section-action" hover-class="touch-active" @click="openSkillSelector">更换</view>
        </view>
        <view class="skill-card" @click="openSkillSelector">
          <RemoteImage class="skill-icon" :src="selectedSkillIcon" mode="aspectFit" />
          <view class="skill-main">
            <view class="skill-main-head">
              <text class="skill-name">{{ selectedSkill.name || '未选择技能' }}</text>
              <view class="detail-btn" hover-class="touch-active" @click.stop="openSkillDetail(selectedSkill)">详情</view>
            </view>
            <view class="skill-meta-row">
              <text class="skill-meta">{{ selectedSkill.attr || '无属性' }}</text>
              <text class="skill-dot">｜</text>
              <text class="skill-meta">{{ selectedSkill.displayType || selectedSkill.type || '-' }}</text>
              <text class="skill-dot">｜</text>
              <text class="skill-meta">能量 {{ selectedSkill.consume || 0 }}</text>
            </view>
            <view class="skill-meta-row">
              <text class="skill-meta">基础威力 {{ selectedSkill.power || 0 }}</text>
              <text class="skill-dot">｜</text>
              <view class="power-input-row">
                <text class="skill-meta">当前计算威力：</text>
                <input
                  class="power-input"
                  type="number"
                  :value="customSkillPower"
                  @input="onCustomPowerInput"
                  @click.stop
                  placeholder="0"
                />
              </view>
            </view>
            <view v-if="selectedSkill.isDynamic" class="dynamic-hint">
              <text class="dynamic-hint-text">⚠️ 该技能实际威力可能随战斗状态变化，请手动调整计算威力</text>
            </view>
            <text class="skill-desc">{{ skillShortDesc }}</text>
          </view>
        </view>
      </view>

      <view class="result-section card">
        <view class="section-head">
          <text class="section-title">计算结果</text>
          <text class="result-mode">{{ resultModeLabel }}</text>
        </view>
        <DamageHpCompareBar :damage="resultState.damage" :hp="resultState.hp" title="伤害对比" damage-label="伤害" hp-label="生命" :reverse-diff="true" />
        <view class="result-bar damage">
          <text class="result-value">{{ resultState.value }}</text>
          <text class="result-subtitle">{{ resultState.subtitle }}</text>
        </view>
        <text class="result-note">{{ resultState.note }}</text>
      </view>

      <view class="bottom-space"></view>
    </scroll-view>

        <view v-if="petSelectorVisible" class="modal-mask" @click="closePetSelector">
      <view class="modal-sheet" @click.stop>
        <view class="modal-head">
          <text class="modal-title">{{ selectorSideLabel }}选择精灵</text>
          <view class="modal-close" hover-class="touch-active" @click="closePetSelector">关闭</view>
        </view>

        <view class="selector-card">
          <text class="section-title">搜索精灵</text>
          <view class="search-row">
            <input
              v-model.trim="petKeyword"
              class="search-input"
              placeholder="搜索最高形态精灵"
              placeholder-class="search-placeholder"
            />
            <view v-if="petKeyword" class="search-clear" @click="petKeyword = ''">清空</view>
          </view>

          <view class="filter-head">
            <text class="section-title">属性筛选</text>
            <view class="filter-actions">
              <view class="mini-btn" :class="{ active: selectedPetTypes.length === 0 }" @click="clearPetTypeFilters">全部</view>
              <view class="mini-btn" :class="{ active: onlyFinalForms }" @click="onlyFinalForms = true">只看最高形态</view>
            </view>
          </view>

          <view class="selected-row">
            <text class="selected-label">已选属性</text>
            <view v-if="selectedPetTypes.length" class="selected-types">
              <TypeBadge
                v-for="type in selectedPetTypes"
                :key="type"
                :label="type"
                :color="getTypeColor(type)"
                compact
              />
            </view>
            <text v-else class="selected-empty">未选择</text>
          </view>

          <view class="type-grid">
            <view
              v-for="type in petTypeOptions"
              :key="type.key"
              class="type-chip"
              :class="{ active: selectedPetTypes.includes(type.key) }"
              :style="selectedPetTypes.includes(type.key) ? { borderColor: type.color } : null"
              @click="togglePetType(type.key)"
            >
              <TypeBadge :label="type.key" :color="type.color" compact />
              <text class="chip-text">{{ type.label }}</text>
            </view>
          </view>

          <text class="result-tip">当前显示 {{ filteredPetOptions.length }} 只精灵</text>
        </view>

        <scroll-view scroll-y class="modal-scroll pet-scroll" :style="{ height: '58vh' }">
          <view class="pet-grid">
            <view
              v-for="pet in filteredPetOptions"
              :key="pet.key"
              class="pet-card"
              :class="{ active: getActivePetId() === pet.id }"
              @click="selectPet(pet)"
            >
              <RemoteImage class="pet-card-image" :src="getPetImage(pet)" mode="aspectFit" />
              <text class="pet-card-name">{{ pet.fullName || pet.name }}</text>
              <view class="pet-card-types">
                <TypeBadge
                  v-for="type in getPetTypes(pet)"
                  :key="type"
                  :label="type"
                  :color="getTypeColor(type)"
                  compact
                />
              </view>
            </view>
          </view>
          <view v-if="!filteredPetOptions.length" class="empty-tip">没有找到符合条件的精灵</view>
        </scroll-view>
      </view>
    </view>

        <view v-if="paramSettingVisible" class="modal-mask" @click="closeParamSetting">
      <view class="modal-sheet" @click.stop>
        <view class="modal-head">
          <text class="modal-title">{{ paramSideLabel }}参数设置</text>
          <view class="modal-close" hover-class="touch-active" @click="closeParamSetting">关闭</view>
        </view>

        <view class="selected-card">
          <RemoteImage class="selected-image" :src="resolvePetImage(paramPet.img)" mode="aspectFit" />
          <view class="selected-info">
            <text class="selected-name">{{ paramPet.fullName || paramPet.name || '未选择精灵' }}</text>
            <text class="selected-type">{{ formatTypes(getPetTypes(paramPet)) }}</text>
            <text class="selected-note">这里直接沿用阵容编辑页的个体 / 性格小窗逻辑，只保留这页需要的部分。</text>
          </view>
        </view>

        <view class="config-card">
          <text class="section-title">性格增益 / 减益</text>
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
          <text class="section-title">个体值</text>
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
          <view class="modal-btn ghost" hover-class="touch-active" @click="applyRecommendedIvs">默认推荐个体</view>
          <view class="modal-btn ghost" hover-class="touch-active" @click="closeParamSetting">取消</view>
          <view class="modal-btn primary" hover-class="touch-active" @click="confirmParamSetting">确定</view>
        </view>
      </view>
    </view>

    <view v-if="skillSelectorVisible" class="modal-mask" @click="closeSkillSelector">
      <view class="modal-sheet" @click.stop>
        <view class="modal-head"><text class="modal-title">选择技能</text><view class="modal-close" hover-class="touch-active" @click="closeSkillSelector">关闭</view></view>
        <view class="search-row"><input v-model.trim="skillKeyword" class="search-input" placeholder="搜索技能名称" placeholder-class="search-placeholder" /></view>
        <view class="skill-filter-row">
          <view v-for="opt in skillFilterOptions" :key="opt.value" class="filter-chip" :class="{ active: skillFilter === opt.value }" hover-class="touch-active" @click="skillFilter = opt.value">{{ opt.label }}</view>
        </view>
        <scroll-view scroll-y class="modal-scroll skill-scroll" :style="{ height: '54vh' }">
          <view class="skill-grid">
            <view v-for="skill in filteredSkillOptions" :key="skill.name + '-' + skill.skill_type" class="skill-card" :class="{ active: selectedSkill.name === skill.name }" hover-class="touch-active" @click="selectSkill(skill)">
              <view class="skill-card-icon-wrap" hover-class="touch-active" @click.stop="openSkillDetail(skill)">
                <RemoteImage class="skill-card-icon" :src="skill.icon || getSkillIcon(skill.name)" mode="aspectFit" />
              </view>
              <view class="skill-card-info">
                <text class="skill-card-name">{{ skill.name }}</text>
                <text class="skill-card-power">威力 {{ skill.power || 0 }}</text>
              </view>
            </view>
          </view>
          <view v-if="!filteredSkillOptions.length" class="empty-tip">没有找到符合条件的技能</view>
        </scroll-view>
      </view>
    </view>

    <view v-if="skillDetailVisible" class="modal-mask" @click="closeSkillDetail">
      <view class="modal-sheet skill-detail-sheet" @click.stop>
        <view class="modal-head"><text class="modal-title">技能详情</text><view class="modal-close" hover-class="touch-active" @click="closeSkillDetail">关闭</view></view>
        <view class="skill-detail-top">
          <RemoteImage class="skill-detail-icon" :src="detailSkill.icon || detailSkillIcon" mode="aspectFit" />
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
          <view class="detail-row"><text class="detail-label">威力</text><text class="detail-value">{{ detailSkill.power || 0 }}</text></view>
          <view class="detail-row"><text class="detail-label">连击次数</text><text class="detail-value">{{ detailSkill.baseHits || 1 }}</text></view>
          <view class="detail-row"><text class="detail-label">技能来源</text><text class="detail-value">{{ detailSkillSource }}</text></view>
          <view class="detail-row detail-desc-row"><text class="detail-label">完整描述</text><text class="detail-value desc">{{ detailSkill.describe || '暂无描述' }}</text></view>
          <view class="detail-row detail-tags-row"><text class="detail-label">机制标签</text><view class="tag-wrap"><text v-for="tag in detailSkillTags" :key="tag" class="mini-tag">{{ tag }}</text></view></view>
          <view v-if="detailSkill.isDynamic" class="detail-dynamic-hint">
            <text class="detail-dynamic-text">⚠️ 该技能为动态威力技能，实际威力可能随战斗状态变化，请手动调整计算威力</text>
          </view>
        </view>
      </view>
    </view>
  </view>
</template>
<script>
import TypeBadge from '@/components/TypeBadge/TypeBadge.vue'
import DamageHpCompareBar from '@/components/pvp/DamageHpCompareBar.vue'
import { petTypes, pets } from '@/data/pets.js'
import { petsDetail } from '@/data/pets_detail_light.js'
import { variantPets, variantPetMap } from '@/data/pet_variants_list.js'
import { skillsData } from '@/data/skills.js'
import { skillIcons } from '@/data/skill_icons.js'
import commonSkillPresets from '@/data/pvp/commonSkillPresets.json'
import { calculatePetPanel, getHighestFormPets } from '@/data/game_math.js'
import { calculateDamageFull, normalizeBattleSkill, repairText } from '@/utils/pvpDamageEngine.js'
import { resolveAssetPath } from '@/utils/asset-path.js'
import { buildSuggestedIvs } from '@/utils/buildSuggestedIvs.js'
import { savePetConfig, loadPetConfig } from '@/utils/petConfigCache.js'

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

function parseLooseNumber(value, fallback = 0) {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  const text = repairText(value || '').trim()
  if (!text) return fallback
  const match = text.match(/-?\d+(?:\.\d+)?/)
  if (match) {
    const number = Number(match[0])
    return Number.isFinite(number) ? number : fallback
  }
  const number = Number(text)
  return Number.isFinite(number) ? number : fallback
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

function collectPetSkills(detail = {}, variantDetail = {}) {
  const groups = []
  if (Array.isArray(detail.skills)) groups.push(detail.skills)
  if (Array.isArray(variantDetail.skills)) groups.push(variantDetail.skills)
  const skillTypes = detail.skill_types || variantDetail.skill_types || {}
  Object.values(skillTypes || {}).forEach((list) => { if (Array.isArray(list)) groups.push(list) })
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
  const skills = collectPetSkills(detail, variantDetail)
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

function buildPetList() {
  const detailMap = petsDetail || {}
  const basePets = getHighestFormPets(pets, petsDetail)
    .map((pet) => {
      const detail = detailMap[String(pet.id)] || {}
      return normalizePet(pet, detail)
    })
  
  const variantPetList = variantPets.map((vPet) => {
    return normalizePet(vPet, { race: vPet.race, skills: vPet.skills, trait: vPet.trait })
  })
  
  const allPets = [...basePets, ...variantPetList]
  
  return allPets
    .sort((a, b) => {
      if (a.id !== b.id) return String(a.id).localeCompare(String(b.id))
      return String(a.name || '').localeCompare(String(b.name || ''))
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
  const sourceSkills = Array.isArray(skills) && skills.length ? skills : FULL_SKILL_LIBRARY
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

export default {
  name: 'PvpBreakpointPage',
  components: { TypeBadge, DamageHpCompareBar },
  data() {
    const petList = buildPetList()
    const firstPet = petList[0] || null
    const secondPet = petList.find((item) => item.id !== firstPet?.id) || firstPet
    return {
      activeTab: 'damage',
      petList,
      attackSide: { ...createDefaultSide(), petId: firstPet?.id || null },
      defenseSide: { ...createDefaultSide(), petId: secondPet?.id || firstPet?.id || null },
      petSelectorVisible: false,
      petSelectorSide: 'attack',
      petKeyword: '',
      skillKeyword: '',
      paramSettingVisible: false,
      paramSide: 'attack',
      paramDraft: createDefaultSide(),
      selectedPetTypes: [],
      onlyFinalForms: true,
      skillSelectorVisible: false,
      skillDetailVisible: false,
      detailSkill: {},
      selectedSkillName: '',
      skillFilter: 'all',
      customSkillPower: 0,
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
    attackTypes() { return Array.isArray(this.attackPet.types) ? this.attackPet.types : [] },
    defenseTypes() { return Array.isArray(this.defensePet.types) ? this.defensePet.types : [] },
    attackPanel() { return this.calculatePanel(this.attackSide, this.attackPet) },
    defensePanel() { return this.calculatePanel(this.defenseSide, this.defensePet) },
    attackStatBlocks() { return this.buildStatBlocks(this.attackPanel, this.attackSide) },
    defenseStatBlocks() { return this.buildStatBlocks(this.defensePanel, this.defenseSide) },
    petOptions() { return this.petList },
    filteredPetOptions() {
      const keyword = String(this.petKeyword || '').trim().toLowerCase()
      const selectedTypes = Array.isArray(this.selectedPetTypes) ? this.selectedPetTypes : []
      return this.petOptions.filter((pet) => {
        const matchKeyword = !keyword || String(pet.searchText || '').includes(keyword) || String(pet.name || '').toLowerCase().includes(keyword)
        const matchTypes = !selectedTypes.length || selectedTypes.every((type) => (pet.types || []).includes(type))
        return matchKeyword && matchTypes
      })
    },
    attackSkillOptions() {
      const pet = this.attackPet
      const skillList = getPetSkills(pet)
      const petNames = [pet.name, pet.baseName, pet.fullName].filter(Boolean)
      return buildSkillList(skillList, this.attackTypes, petNames).filter((skill) => skill.isDamageSkill)
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
    resultModeLabel() { return '伤害计算' },
    resultValue() { return this.resultState.value },
    resultSubtitle() { return this.resultState.subtitle },
    resultNote() { return this.resultState.note }
  },
  onLoad(options) {
    const routeId = Number(options && (options.id || options.petId) || 0)
    if (routeId) {
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
    swapSides() {
      const nextAttack = { ...this.defenseSide, ivs: cloneIvs(this.defenseSide.ivs) }
      const nextDefense = { ...this.attackSide, ivs: cloneIvs(this.attackSide.ivs) }
      this.attackSide = nextAttack
      this.defenseSide = nextDefense
      this.syncSelectedSkill()
      this.calculateDamage()
    },
    openPetSelector(side) {
      this.petSelectorSide = side === 'defense' ? 'defense' : 'attack'
      this.petKeyword = ''
      this.selectedPetTypes = []
      this.petSelectorVisible = true
    },
    getActivePetId() {
      return this.petSelectorSide === 'defense' ? this.defenseSide.petId : this.attackSide.petId
    },
    closePetSelector() { this.petSelectorVisible = false },
    selectPet(pet) {
      if (!pet) return
      const side = this.petSelectorSide === 'defense' ? this.defenseSide : this.attackSide
      side.petId = pet.id
      this.applyPetConfig(side)
      this.petSelectorVisible = false
      this.syncSelectedSkill()
      this.calculateDamage()
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
    togglePetType(type) {
      if (!type) return
      const next = new Set(this.selectedPetTypes)
      if (next.has(type)) next.delete(type)
      else next.add(type)
      this.selectedPetTypes = Array.from(next)
    },
    clearPetTypeFilters() { this.selectedPetTypes = [] },
    openParamSetting(side) {
      this.paramSide = side === 'defense' ? 'defense' : 'attack'
      const source = this.paramSide === 'defense' ? this.defenseSide : this.attackSide
      this.paramDraft = { ...source, ivs: cloneIvs(source.ivs) }
      this.paramSettingVisible = true
    },
    closeParamSetting() { this.paramSettingVisible = false },
    formatTypes(types = []) { return Array.isArray(types) && types.length ? types.join(' / ') : '无属性' },
    onParamIvInput(key, event) {
      const value = Number(event?.detail?.value || 0)
      this.paramDraft.ivs = { ...this.paramDraft.ivs, [key]: Number.isFinite(value) ? value : 0 }
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
      this.customSkillPower = Number(skill.power) || 0
      this.closeSkillSelector()
      this.calculateDamage()
    },
    onCustomPowerInput(e) {
      const value = Number(e?.detail?.value || e?.target?.value || 0)
      this.customSkillPower = value
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
      const customPower = this.customSkillPower || skill.power
      const result = calculateDamageFull({ attackerPanel: this.attackPanel, defenderPanel: this.defensePanel, skillPower: customPower, skillType: skill.type, skillAttr: skill.attr, attackerAttrs: this.attackTypes, defenderAttrs: this.defenseTypes })
      const damage = Math.max(1, Math.round(result.damage || 0))
      const hp = Math.max(1, Math.round(Number(this.defensePanel.hp) || 0))
      const percent = Math.round((damage / hp) * 100)
      const diff = damage - hp
      this.resultState = { value: damage + ' 伤害', subtitle: damage + ' / ' + hp + '，' + percent + '%', note: diff >= 0 ? '溢出 ' + diff : '剩余 ' + Math.abs(diff), damage, hp }
    },
    syncSelectedSkill() {
      if (!this.attackSkillOptions.length) { this.selectedSkillName = ''; return }
      const matched = this.attackSkillOptions.find((skill) => skill.name === this.selectedSkillName)
      this.selectedSkillName = matched ? matched.name : this.attackSkillOptions[0].name
    },
    normalizeSkill(skill = {}) {
      const base = skillsData[skill && skill.name ? skill.name : ''] || {}
      const merged = { ...base, ...skill }
      const normalized = normalizeBattleSkill(merged)
      return { ...normalized, displayType: getDisplayType(normalized.type), sourceType: getSkillSource(merged), icon: getSkillIcon(merged), shortDesc: truncateText(normalized.describe, 34), searchText: [normalized.name, normalized.attr, normalized.type, normalized.skillType, normalized.describe].filter(Boolean).join(' ').toLowerCase() }
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
  min-height: 100vh;
  background: #f4efe6;
}

.page-scroll {
  height: 100vh;
  padding: 22rpx;
  box-sizing: border-box;
}

.card {
  background: #fff;
  border-radius: 28rpx;
  box-shadow: 0 16rpx 40rpx rgba(70, 60, 45, 0.08);
}

.hero {
  padding: 24rpx;
}

.page-title {
  display: block;
  font-size: 38rpx;
  font-weight: 900;
  color: #2d2a24;
}

.page-subtitle {
  display: block;
  margin-top: 6rpx;
  font-size: 22rpx;
  color: #7b7264;
}

.tab-row {
  margin-top: 18rpx;
  display: flex;
  gap: 12rpx;
}

.tab-item {
  flex: 1;
  min-height: 74rpx;
  border-radius: 22rpx;
  background: #f4f4f1;
  color: #6f675d;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 28rpx;
  font-weight: 800;
}

.tab-item.active {
  color: #fff;
  background: linear-gradient(135deg, #26c6c2 0%, #4aa3ff 100%);
  box-shadow: 0 12rpx 26rpx rgba(74, 163, 255, 0.22);
}

.swap-wrap {
  margin-top: 18rpx;
  display: flex;
  justify-content: center;
}

.swap-btn {
  min-width: 220rpx;
  min-height: 66rpx;
  padding: 0 24rpx;
  border-radius: 999rpx;
  background: #fff;
  border: 1rpx solid rgba(74, 163, 255, 0.16);
  color: #2d77e6;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24rpx;
  font-weight: 800;
}

.battle,
.skill-section,
.result-section {
  margin-top: 18rpx;
  padding: 18rpx;
}

.battle-grid {
  display: flex;
  align-items: stretch;
  gap: 12rpx;
}

.side-card {
  flex: 1;
  min-width: 0;
}

.side-head {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 12rpx;
}

.side-meta {
  min-width: 0;
  flex: 1;
}

.side-tag {
  display: inline-flex;
  min-height: 34rpx;
  padding: 0 14rpx;
  border-radius: 999rpx;
  align-items: center;
  justify-content: center;
  font-size: 18rpx;
  font-weight: 800;
}

.side-tag.attack {
  background: rgba(74, 163, 255, 0.12);
  color: #2563eb;
}

.side-tag.defense {
  background: rgba(255, 121, 103, 0.12);
  color: #e05245;
}

.pet-name {
  display: block;
  margin-top: 10rpx;
  font-size: 30rpx;
  font-weight: 900;
  color: #2d2a24;
  word-break: break-all;
}

.type-row {
  margin-top: 8rpx;
  display: flex;
  flex-wrap: wrap;
  gap: 8rpx;
}

.side-action {
  flex-shrink: 0;
  min-width: 104rpx;
  height: 54rpx;
  padding: 0 16rpx;
  border-radius: 999rpx;
  background: rgba(74, 163, 255, 0.08);
  color: #2d77e6;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20rpx;
  font-weight: 800;
}

.pet-art-row {
  margin-top: 14rpx;
  display: flex;
  gap: 12rpx;
  align-items: center;
}

.pet-art {
  width: 138rpx;
  height: 138rpx;
  border-radius: 24rpx;
  background: linear-gradient(180deg, #fff8e9 0%, #f0e8d8 100%);
  flex-shrink: 0;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
}

.pet-art.defense-art {
  background: linear-gradient(180deg, #fff5f3 0%, #f4e9e7 100%);
}

.pet-image {
  width: 118rpx;
  height: 118rpx;
}

.pet-meta-line {
  min-width: 0;
  flex: 1;
}

.race-text {
  display: block;
  font-size: 22rpx;
  line-height: 1.5;
  color: #7d7367;
}

.side-params-link {
  margin-top: 12rpx;
  min-width: 116rpx;
  height: 46rpx;
  padding: 0 14rpx;
  border-radius: 999rpx;
  background: linear-gradient(135deg, rgba(38, 198, 194, 0.12) 0%, rgba(74, 163, 255, 0.12) 100%);
  color: #2d77e6;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 18rpx;
  font-weight: 800;
}

.stat-grid {
  margin-top: 14rpx;
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 10rpx;
}

.stat-item {
  min-height: 92rpx;
  padding: 10rpx 10rpx 8rpx;
  border-radius: 18rpx;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
}

.stat-item.pink { background: #fff1f3; }
.stat-item.yellow { background: #fff7db; }
.stat-item.purple { background: #f2edff; }
.stat-item.green { background: #edf8ea; }
.stat-item.blue { background: #e8f3ff; }
.stat-item.cyan { background: #e7fbfb; }

.stat-label {
  font-size: 18rpx;
  font-weight: 700;
  color: #6f675d;
}

.stat-value-row {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 8rpx;
}

.stat-value {
  font-size: 30rpx;
  font-weight: 900;
  line-height: 1;
  color: #2d2a24;
}

.stat-mark {
  font-size: 22rpx;
  font-weight: 900;
  line-height: 1;
}

.stat-mark.up {
  color: #16a34a;
}

.stat-mark.down {
  color: #dc2626;
}

.vs-badge {
  width: 68rpx;
  flex-shrink: 0;
  align-self: center;
  padding: 16rpx 0;
  border-radius: 999rpx;
  text-align: center;
  color: #fff;
  background: linear-gradient(135deg, #ff6b6b 0%, #ff9151 100%);
  font-size: 24rpx;
  font-weight: 900;
  box-shadow: 0 12rpx 24rpx rgba(255, 111, 76, 0.22);
}

.section-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12rpx;
  margin-bottom: 14rpx;
}

.section-title {
  font-size: 30rpx;
  font-weight: 900;
  color: #2d2a24;
}

.section-action,
.result-mode {
  font-size: 20rpx;
  color: #2d77e6;
  font-weight: 800;
}

.skill-card {
  display: flex;
  align-items: flex-start;
  gap: 14rpx;
  padding: 16rpx;
  border-radius: 24rpx;
  background: linear-gradient(180deg, #fffdf8 0%, #f9f5ec 100%);
}

.skill-icon-box {
  width: 108rpx;
  height: 108rpx;
  flex-shrink: 0;
  border-radius: 22rpx;
  background: #fff;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: inset 0 0 0 1rpx rgba(45, 119, 230, 0.08);
}

.skill-icon {
  width: 92rpx;
  height: 92rpx;
}

.skill-main {
  min-width: 0;
  flex: 1;
}

.skill-main-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12rpx;
}

.skill-name {
  font-size: 28rpx;
  font-weight: 900;
  color: #2d2a24;
}

.detail-btn {
  min-width: 88rpx;
  height: 44rpx;
  padding: 0 14rpx;
  border-radius: 999rpx;
  background: rgba(74, 163, 255, 0.08);
  color: #2d77e6;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 18rpx;
  font-weight: 800;
  flex-shrink: 0;
}

.detail-btn.small {
  min-width: 72rpx;
  height: 38rpx;
  font-size: 17rpx;
}

.skill-meta-row {
  margin-top: 8rpx;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6rpx;
}

.skill-meta {
  font-size: 20rpx;
  color: #6f675d;
  font-weight: 700;
}

.skill-dot {
  font-size: 20rpx;
  color: #b0a795;
}

.skill-desc {
  display: block;
  margin-top: 8rpx;
  font-size: 20rpx;
  line-height: 1.5;
  color: #7c7262;
}

.power-input-row {
  display: flex;
  align-items: center;
  gap: 6rpx;
}

.power-input {
  width: 100rpx;
  height: 40rpx;
  padding: 4rpx 12rpx;
  border: 2rpx solid #d4c4a8;
  border-radius: 8rpx;
  background: #fff;
  font-size: 20rpx;
  text-align: center;
  color: #5a4a32;
}

.dynamic-hint {
  margin-top: 12rpx;
  padding: 12rpx 16rpx;
  background: #fff8e6;
  border-radius: 10rpx;
  border: 2rpx solid #f0d080;
}

.dynamic-hint-text {
  font-size: 20rpx;
  color: #a06820;
  line-height: 1.4;
}

.result-bar {
  padding: 30rpx 24rpx;
  border-radius: 28rpx;
  text-align: center;
  background: linear-gradient(135deg, #ffebea 0%, #ffd4cf 100%);
  border: 1rpx solid rgba(222, 76, 76, 0.12);
}

.result-bar.damage {
  background: linear-gradient(135deg, #ffe1df 0%, #ffc1bb 100%);
}

.result-value {
  display: block;
  font-size: 46rpx;
  line-height: 1.15;
  font-weight: 900;
  color: #b6202f;
}

.result-subtitle {
  display: block;
  margin-top: 8rpx;
  font-size: 22rpx;
  color: #8d3d46;
  font-weight: 700;
}

.result-note {
  display: block;
  margin-top: 10rpx;
  text-align: center;
  font-size: 20rpx;
  color: #7b6d5d;
}

.modal-mask {
  position: fixed;
  inset: 0;
  z-index: 999;
  background: rgba(18, 24, 36, 0.48);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24rpx;
  box-sizing: border-box;
}

.modal-sheet {
  width: min(100%, 780rpx);
  max-height: 86vh;
  overflow: hidden;
  border-radius: 30rpx;
  padding: 20rpx;
  background: #fff;
  box-shadow: 0 22rpx 56rpx rgba(0, 0, 0, 0.18);
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
}

.skill-detail-sheet {
  max-height: 82vh;
}

.modal-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12rpx;
  margin-bottom: 16rpx;
}

.modal-title {
  font-size: 30rpx;
  font-weight: 900;
  color: #2d2a24;
}

.modal-close {
  min-width: 88rpx;
  height: 46rpx;
  border-radius: 999rpx;
  background: #f2f4f8;
  color: #5f708a;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 18rpx;
  font-weight: 800;
  flex-shrink: 0;
}

.selector-card {
  padding: 14rpx;
  border-radius: 22rpx;
  background: #f8fafc;
}

.search-row {
  margin-top: 12rpx;
  display: flex;
  align-items: center;
  gap: 12rpx;
}

.search-input {
  flex: 1;
  height: 72rpx;
  border-radius: 18rpx;
  background: #f3f7fe;
  padding: 0 20rpx;
  font-size: 24rpx;
  color: #14213d;
}

.search-clear,
.filter-clear {
  font-size: 22rpx;
  font-weight: 700;
  color: #5b7cf5;
}

.filter-head,
.selected-row {
  margin-top: 18rpx;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12rpx;
}

.filter-actions,
.selected-types,
.type-grid,
.pet-card-types {
  display: flex;
  flex-wrap: wrap;
  gap: 8rpx;
}

.mini-btn,
.type-chip {
  min-height: 58rpx;
  padding: 8rpx 12rpx;
  border-radius: 18rpx;
  border: 1rpx solid rgba(148, 163, 184, 0.18);
  background: #f8fbff;
  display: inline-flex;
  align-items: center;
  gap: 8rpx;
}

.mini-btn.active,
.type-chip.active {
  background: rgba(91, 124, 245, 0.08);
  border-color: rgba(91, 124, 245, 0.28);
  color: #5b7cf5;
}

.chip-text {
  font-size: 20rpx;
  color: #334155;
}

.selected-label,
.selected-empty,
.result-tip {
  font-size: 20rpx;
  color: #64748b;
}

.result-tip {
  display: block;
  margin-top: 14rpx;
}

.modal-scroll {
  flex: 1;
  min-height: 0;
  max-height: 58vh;
}

.pet-option {
  display: flex;
  gap: 12rpx;
  align-items: center;
  padding: 14rpx;
  border-radius: 22rpx;
  background: #f8fafc;
  margin-bottom: 12rpx;
  border: 1rpx solid transparent;
}

.pet-option.active {
  border-color: rgba(74, 163, 255, 0.28);
  background: #f1f6ff;
}

.pet-option-image {
  width: 82rpx;
  height: 82rpx;
  border-radius: 18rpx;
  background: #fff;
  flex-shrink: 0;
}

.pet-option-main {
  min-width: 0;
  flex: 1;
}

.pet-option-name {
  display: block;
  font-size: 24rpx;
  font-weight: 800;
  color: #2d2a24;
}

.pet-option-types {
  margin-top: 6rpx;
  display: flex;
  flex-wrap: wrap;
  gap: 8rpx;
}

.pet-option-sub {
  display: block;
  margin-top: 6rpx;
  font-size: 18rpx;
  color: #7c7262;
}

.pet-card {
  padding: 12rpx;
  border-radius: 20rpx;
  background: #fff;
  box-shadow: 0 8rpx 18rpx rgba(31, 47, 87, 0.08);
  border: 2rpx solid transparent;
  text-align: center;
}

.pet-card.active {
  border-color: rgba(91, 124, 245, 0.5);
  box-shadow: 0 12rpx 22rpx rgba(91, 124, 245, 0.14);
}

.pet-card-image {
  width: 100%;
  height: 116rpx;
  border-radius: 16rpx;
  background: #fff;
}

.pet-card-name {
  display: block;
  margin-top: 8rpx;
  font-size: 22rpx;
  font-weight: 800;
  color: #14213d;
}

.pet-card-types {
  margin-top: 6rpx;
  display: flex;
  justify-content: center;
  flex-wrap: wrap;
  gap: 6rpx;
}

.pet-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12rpx;
  padding: 2rpx;
}

.selected-card {
  display: flex;
  gap: 14rpx;
  align-items: center;
  padding: 14rpx;
  border-radius: 22rpx;
  background: linear-gradient(180deg, #f9fbff 0%, #f4f8ff 100%);
}

.selected-image {
  width: 92rpx;
  height: 92rpx;
  border-radius: 18rpx;
  background: #fff;
  flex-shrink: 0;
}

.selected-info {
  min-width: 0;
  flex: 1;
}

.selected-name {
  display: block;
  font-size: 28rpx;
  font-weight: 900;
  color: #2d2a24;
}

.selected-type {
  display: block;
  margin-top: 6rpx;
  font-size: 20rpx;
  color: #65758e;
}

.selected-note {
  display: block;
  margin-top: 6rpx;
  font-size: 18rpx;
  line-height: 1.45;
  color: #7b7064;
}

.config-card {
  margin-top: 12rpx;
  padding: 14rpx;
  border-radius: 22rpx;
  background: #f8fafc;
}

.picker-stack {
  display: grid;
  grid-template-columns: 1fr;
  gap: 10rpx;
  margin-top: 10rpx;
}

.picker-box {
  min-height: 64rpx;
  padding: 0 16rpx;
  border-radius: 16rpx;
  background: #fff;
  display: flex;
  align-items: center;
  font-size: 24rpx;
  color: #2d2a24;
}

.iv-summary {
  margin-top: 10rpx;
}

.iv-summary-label {
  display: block;
  margin-bottom: 8rpx;
  font-size: 20rpx;
  color: #72685c;
  font-weight: 700;
}

.iv-summary-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 8rpx;
}

.iv-summary-tag {
  min-height: 34rpx;
  padding: 0 10rpx;
  border-radius: 999rpx;
  background: #fff;
  color: #51607a;
  font-size: 18rpx;
  font-weight: 700;
  display: inline-flex;
  align-items: center;
}

.iv-summary-empty {
  font-size: 18rpx;
  color: #8a7d6f;
}

.iv-rule-tip {
  display: block;
  margin-top: 10rpx;
  font-size: 18rpx;
  color: #8a7d6f;
  line-height: 1.5;
}

.param-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12rpx;
}

.param-item {
  padding: 12rpx;
  border-radius: 18rpx;
  background: #f8fafc;
}

.param-label,
.iv-label {
  display: block;
  margin-bottom: 8rpx;
  font-size: 20rpx;
  color: #72685c;
  font-weight: 700;
}

.param-input,
.param-picker,
.iv-input {
  height: 64rpx;
  line-height: 64rpx;
  border-radius: 16rpx;
  padding: 0 16rpx;
  background: #fff;
  font-size: 24rpx;
  color: #2d2a24;
  box-sizing: border-box;
}

.param-picker {
  display: flex;
  align-items: center;
}

.param-tip {
  display: block;
  margin-top: 12rpx;
  font-size: 18rpx;
  color: #8a7d6f;
  line-height: 1.5;
}

.iv-grid {
  margin-top: 14rpx;
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 10rpx;
}

.iv-item {
  padding: 12rpx;
  border-radius: 18rpx;
  background: #f8fafc;
}

.modal-actions {
  margin-top: 16rpx;
  display: flex;
  justify-content: flex-end;
  gap: 12rpx;
}

.modal-btn {
  min-width: 130rpx;
  height: 66rpx;
  padding: 0 18rpx;
  border-radius: 999rpx;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 22rpx;
  font-weight: 800;
}

.modal-btn.ghost {
  background: #eef2f8;
  color: #65758e;
}

.modal-btn.primary {
  background: linear-gradient(135deg, #26c6c2 0%, #4aa3ff 100%);
  color: #fff;
}

.skill-filter-row {
  display: flex;
  gap: 12rpx;
  padding: 0 16rpx 12rpx;
  flex-wrap: wrap;
}

.filter-chip {
  padding: 8rpx 20rpx;
  border-radius: 20rpx;
  background: #f1f5f9;
  font-size: 22rpx;
  color: #64748b;
  border: 1rpx solid transparent;
}

.filter-chip.active {
  background: #e0f2fe;
  color: #0284c7;
  border-color: #0284c7;
}

.skill-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 12rpx;
  padding: 0 8rpx;
}

.skill-card {
  width: calc(50% - 6rpx);
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 16rpx 10rpx;
  border-radius: 16rpx;
  background: #f8fafc;
  border: 1rpx solid transparent;
  box-sizing: border-box;
}

.skill-card.active {
  border-color: rgba(74, 163, 255, 0.4);
  background: #f1f6ff;
}

.skill-card-icon-wrap {
  width: 72rpx;
  height: 72rpx;
  border-radius: 14rpx;
  background: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 8rpx;
}

.skill-card-icon {
  width: 60rpx;
  height: 60rpx;
}

.skill-card-info {
  text-align: center;
  width: 100%;
}

.skill-card-name {
  display: block;
  font-size: 22rpx;
  font-weight: 700;
  color: #2d2a24;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.skill-card-power {
  display: block;
  font-size: 20rpx;
  color: #6f675d;
  margin-top: 4rpx;
}

.skill-detail-top {
  display: flex;
  gap: 14rpx;
  align-items: center;
  padding: 14rpx;
  border-radius: 22rpx;
  background: linear-gradient(180deg, #f9fbff 0%, #f4f8ff 100%);
}

.skill-detail-icon {
  width: 92rpx;
  height: 92rpx;
  border-radius: 18rpx;
  background: #fff;
  flex-shrink: 0;
}

.skill-detail-main {
  min-width: 0;
  flex: 1;
}

.skill-detail-name {
  display: block;
  font-size: 28rpx;
  font-weight: 900;
  color: #2d2a24;
}

.skill-detail-tags {
  margin-top: 8rpx;
  display: flex;
  flex-wrap: wrap;
  gap: 8rpx;
}

.detail-tag {
  min-height: 34rpx;
  padding: 0 12rpx;
  border-radius: 999rpx;
  background: #fff;
  color: #4b5b74;
  font-size: 18rpx;
  font-weight: 700;
  display: inline-flex;
  align-items: center;
}

.detail-list {
  margin-top: 12rpx;
}

.detail-row {
  display: flex;
  gap: 12rpx;
  padding: 12rpx 0;
  border-bottom: 1rpx solid #eef1f6;
}

.detail-label {
  min-width: 104rpx;
  font-size: 20rpx;
  color: #7b7064;
  font-weight: 700;
}

.detail-value {
  flex: 1;
  font-size: 20rpx;
  color: #2d2a24;
  line-height: 1.55;
}

.detail-value.desc {
  color: #564d3f;
}

.detail-desc-row,
.detail-tags-row {
  align-items: flex-start;
}

.tag-wrap {
  flex: 1;
  display: flex;
  flex-wrap: wrap;
  gap: 8rpx;
}

.mini-tag {
  min-height: 34rpx;
  padding: 0 10rpx;
  border-radius: 999rpx;
  background: #f4f7fb;
  color: #51607a;
  font-size: 17rpx;
  font-weight: 700;
  display: inline-flex;
  align-items: center;
}

.detail-dynamic-hint {
  margin-top: 16rpx;
  padding: 14rpx 18rpx;
  background: #fff8e6;
  border-radius: 12rpx;
  border: 2rpx solid #f0d080;
}

.detail-dynamic-text {
  font-size: 20rpx;
  color: #a06820;
  line-height: 1.5;
}

.bottom-space {
  height: calc(28rpx + env(safe-area-inset-bottom));
}

.touch-active {
  opacity: 0.78;
}

@media (max-width: 760px) {
  .battle-grid {
    gap: 10rpx;
  }

  .vs-badge {
    width: 56rpx;
  }

  .modal-mask {
    align-items: flex-end;
    padding: 18rpx;
  }

  .modal-sheet {
    width: 100%;
    max-height: 86vh;
  }

  .modal-scroll {
    max-height: 56vh;
  }
}
</style>
