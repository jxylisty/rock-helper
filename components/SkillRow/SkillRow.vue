<template>
  <view
    class="skill-row"
    :class="[{ active, compact }, toneClass]"
    hover-class="press-down"
    @click="$emit('click')"
  >
    <view class="icon-frame" :style="iconBg">
      <RemoteImage v-if="iconSrc" class="icon" :src="iconSrc" mode="aspectFit" />
      <AppIcon v-else name="zap" :size="14" color="#A3AE9F" :stroke-width="2.2" />
    </view>

    <view class="main">
      <view class="name-row">
        <text class="name">{{ skill.name }}</text>
        <view class="type-chip" :style="typeStyle">
          <text class="type-chip-text">{{ skill.type }}</text>
        </view>
        <TypeBadge v-if="skill.attr && skill.attr !== '-'" :label="skill.attr" :color="attrColor" compact />
      </view>

      <view class="chip-row">
        <view v-if="powerText" class="stat-chip power">
          <AppIcon name="swords" :size="8" color="#C64B38" :stroke-width="2.6" />
          <text class="stat-chip-text mono">威力 {{ powerText }}</text>
        </view>
        <view class="stat-chip cost">
          <AppIcon name="zap" :size="8" color="#8A6A2C" :stroke-width="2.6" />
          <text class="stat-chip-text mono">{{ costText }}</text>
        </view>
        <view v-if="skill.skillTypeLabel && skill.skillTypeLabel !== '空槽'" class="stat-chip source">
          <text class="stat-chip-text">{{ skill.skillTypeLabel }}</text>
        </view>
      </view>

      <text v-if="!compact" class="desc">{{ skill.describe || '暂无描述' }}</text>
    </view>

    <view v-if="showDetail" class="detail-btn" hover-class="press-down" @click.stop="$emit('detail')">
      <AppIcon name="info" :size="12" color="#8A6A2C" :stroke-width="2.4" />
    </view>
  </view>
</template>

<script>
import AppIcon from '@/components/AppIcon/AppIcon.vue'
import TypeBadge from '@/components/TypeBadge/TypeBadge.vue'
import RemoteImage from '@/components/RemoteImage/RemoteImage.vue'
import { skillIcons } from '@/data/skill/skill_icons.js'
import { petTypes } from '@/data/pet/pet_detail.js'
import { resolveAssetPath } from '@/utils/asset-path.js'

const TYPE_COLOR_MAP = (petTypes || []).reduce((map, item) => {
  map[item.key] = item.color
  return map
}, {})

const SKILL_TYPE_TONES = {
  物攻: { chipBg: '#FBE9E4', chipBorder: '#E0604E', text: '#C64B38' },
  魔攻: { chipBg: '#EFE9F8', chipBorder: '#9C7BD6', text: '#6E4DA8' },
  状态: { chipBg: '#E4F2E8', chipBorder: '#2F9E5F', text: '#1E7A46' },
  防御: { chipBg: '#E9F0FA', chipBorder: '#7FA3D8', text: '#2C6FD1' }
}

export default {
  name: 'SkillRow',
  components: { AppIcon, TypeBadge, RemoteImage },
  props: {
    skill: { type: Object, required: true },
    active: { type: Boolean, default: false },
    compact: { type: Boolean, default: false },
    showDetail: { type: Boolean, default: false }
  },
  computed: {
    iconSrc() {
      return resolveAssetPath(skillIcons[this.skill.name] || this.skill.icon || '')
    },
    tone() {
      return SKILL_TYPE_TONES[this.skill.type] || null
    },
    toneClass() {
      return this.tone ? `tone-${this.skill.type}` : ''
    },
    typeStyle() {
      if (!this.tone) return null
      return {
        background: this.tone.chipBg,
        borderColor: this.tone.chipBorder,
        color: this.tone.text
      }
    },
    iconBg() {
      return this.tone ? { background: this.tone.chipBg } : null
    },
    attrColor() {
      return TYPE_COLOR_MAP[this.skill.attr] || '#6B7A6E'
    },
    powerText() {
      const p = this.skill.power
      if (p === undefined || p === null || p === '' || p === '-') return ''
      return String(p)
    },
    costText() {
      const c = this.skill.consume
      if (c === undefined || c === null || c === '' || c === '-') return '能耗 -'
      const n = Number(c)
      return Number.isFinite(n) && n === 0 ? '无能耗' : `能耗 ${c}`
    }
  }
}
</script>

<style scoped>
.skill-row {
  display: flex;
  align-items: flex-start;
  gap: 11px;
  padding: 12px 12px;
  border-radius: 15px;
  background: #FFFDF7;
  border: 1.5px solid #E3DCC8;
  box-shadow: 0 2px 0 rgba(44, 58, 47, 0.07);
  transition: transform 0.12s ease;
}

.skill-row.active {
  border-color: #C9A14E;
  background: #FBF3DD;
  box-shadow: 0 2px 0 rgba(138, 106, 44, 0.22);
}

.icon-frame {
  flex-shrink: 0;
  width: 48px;
  height: 48px;
  border-radius: 13px;
  background: #F2EBDA;
  border: 1px solid #E3DCC8;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
}

.icon {
  width: 100%;
  height: 100%;
}

.main {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.name-row {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 6px;
}

.name {
  font-size: 14px;
  font-weight: 700;
  color: #2C3A2F;
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.type-chip {
  flex-shrink: 0;
  height: 20px;
  padding: 0 9px;
  border-radius: 999px;
  border: 1px solid #E3DCC8;
  background: #F2EBDA;
  display: inline-flex;
  align-items: center;
}

.type-chip-text {
  font-size: 10.5px;
  font-weight: 700;
  color: #6B7A6E;
  line-height: 1;
}

.chip-row {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 6px;
}

.stat-chip {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  height: 22px;
  padding: 0 9px;
  border-radius: 999px;
  border: 1px solid #E3DCC8;
  background: #F2EBDA;
}

.stat-chip.power {
  background: #FBE9E4;
  border-color: rgba(224, 96, 78, 0.55);
}

.stat-chip.cost {
  background: #FBF3DD;
  border-color: #D9B96A;
}

.stat-chip.source {
  background: #E9F0FA;
  border-color: #7FA3D8;
}

.stat-chip-text {
  font-size: 11px;
  font-weight: 700;
  color: #6B7A6E;
  line-height: 1;
}

.stat-chip.power .stat-chip-text {
  color: #C64B38;
}

.stat-chip.cost .stat-chip-text {
  color: #8A6A2C;
}

.stat-chip.source .stat-chip-text {
  color: #2C6FD1;
}

.desc {
  font-size: 12px;
  line-height: 1.55;
  color: #6B7A6E;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

/* ===== 紧凑模式：弹层选择列表用 ===== */
.skill-row.compact {
  padding: 10px 10px;
  gap: 9px;
}

.skill-row.compact .icon-frame {
  width: 40px;
  height: 40px;
  border-radius: 11px;
}

.skill-row.compact .name {
  font-size: 13px;
}

.skill-row.compact .desc {
  display: none;
}

.press-down {
  transform: scale(0.97);
  opacity: 0.9;
}

.detail-btn {
  flex-shrink: 0;
  align-self: center;
  width: 30px;
  height: 30px;
  border-radius: 10px;
  background: #FBF3DD;
  border: 1px solid #D9B96A;
  display: flex;
  align-items: center;
  justify-content: center;
}
</style>
