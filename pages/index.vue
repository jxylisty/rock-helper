<template>
  <view class="page">
    <SideDrawer :visible="drawerOpen" @close="drawerOpen = false" />
    <AppHeader
      theme="green"
      title="洛克王国助手"
      subtitle="本地离线 · 图鉴与阵容册"
      leftAction="menu"
      @menu="drawerOpen = true"
    >
      <template #right>
        <view class="header-capsule">
          <AppIcon name="book" :size="12" color="#FFFFFF" :stroke-width="2.4" />
          <text class="header-capsule-text">{{ savedTeams.length }} 套阵容</text>
        </view>
      </template>
    </AppHeader>

    <scroll-view scroll-y class="content" enhanced :show-scrollbar="false">
      <view class="welcome" hover-class="press-down" @click="goTeamEditor">
        <view class="welcome-crest">
          <AppIcon name="star" :size="22" color="#1E7A46" :stroke-width="2" />
        </view>
        <view class="welcome-text">
          <text class="welcome-title">欢迎回来，训练师</text>
          <text class="welcome-sub">图鉴、孵蛋、技能、属性、阵容和地图都在本地</text>
        </view>
        <view class="welcome-go">
          <text class="welcome-go-text">继续编辑</text>
          <AppIcon name="arrow-right" :size="12" color="#1E7A46" :stroke-width="2.4" />
        </view>
      </view>

      <view class="section">
        <view class="section-head">
          <view class="section-title-row">
            <view class="section-dot"></view>
            <text class="section-title">快捷入口</text>
          </view>
        </view>
        <view class="shortcut-grid">
          <view
            v-for="item in shortcuts"
            :key="item.title"
            class="shortcut-card"
            hover-class="press-down"
            @click="item.action"
          >
            <view class="shortcut-icon" :style="{ background: item.bg }">
              <AppIcon :name="item.icon" :size="17" :color="item.color" :stroke-width="2.2" />
            </view>
            <view class="shortcut-text">
              <text class="shortcut-title">{{ item.title }}</text>
              <text class="shortcut-sub">{{ item.sub }}</text>
            </view>
          </view>
        </view>
      </view>

      <view class="section">
        <view class="section-head">
          <view class="section-title-row">
            <view class="section-dot"></view>
            <text class="section-title">当前编辑</text>
          </view>
          <view class="section-link-btn" hover-class="press-down" @click="createNewTeamDraft">
            <AppIcon name="plus" :size="12" color="#1E7A46" :stroke-width="2.6" />
            <text class="section-link">新建阵容</text>
          </view>
        </view>

        <view v-if="hasDraftTeam" class="team-panel">
          <view class="team-panel-head">
            <view class="team-title-wrap">
              <view class="team-title-row">
                <text class="team-name">{{ draftTeamName || '未命名阵容' }}</text>
                <text class="team-badge-gold">当前编辑</text>
                <view class="rename-link" hover-class="press-down" @click.stop="openRename('draft', draftTeamName)">
                  <AppIcon name="edit" :size="11" color="#6B7A6E" :stroke-width="2.4" />
                  <text>改名</text>
                </view>
              </view>
              <text class="team-meta">{{ currentDraftSummary }}</text>
            </view>

            <view class="team-actions">
              <view class="team-action ghost" hover-class="press-down" @click="goTeamEditor">
                <AppIcon name="edit" :size="12" color="#6B7A6E" :stroke-width="2.4" />
                <text>编辑</text>
              </view>
              <view class="team-action primary" hover-class="press-down" @click="saveCurrentTeamAsPreset">
                <AppIcon name="copy" :size="12" color="#FFFFFF" :stroke-width="2.4" />
                <text>另存</text>
              </view>
              <view
                class="team-collapse-badge"
                :class="{ collapsed: !isTeamExpanded('draft') }"
                hover-class="press-down"
                @click.stop="toggleTeam('draft')"
              >
                <text class="team-collapse-text">{{ isTeamExpanded('draft') ? '收起' : '展开' }}</text>
                <view class="team-collapse-arrow" :class="{ open: isTeamExpanded('draft') }">
                  <AppIcon name="chevron-down" :size="13" color="#6B7A6E" :stroke-width="2.4" />
                </view>
              </view>
            </view>
          </view>

          <view v-if="isTeamExpanded('draft')" class="team-panel-body">
            <view class="team-card-list">
              <view
                v-for="(slot, slotIndex) in currentDraftSlots"
                :key="`draft-${slotIndex}`"
                class="roster-card"
                :class="{ empty: !slot }"
              >
                <view v-if="slot" class="card-main">
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
                            :key="`draft-${slotIndex}-${type}`"
                            :label="type"
                            :color="getTypeColor(type)"
                            compact
                          />
                        </view>
                      </view>
                      <view class="panel-btn" hover-class="press-down" @click.stop="openPanel(slot)">
                        <AppIcon name="zap" :size="11" color="#1E7A46" :stroke-width="2.4" />
                        <text>面板</text>
                      </view>
                    </view>

                    <view class="info-row">
                      <text class="info-label">性格</text>
                      <text class="info-value">{{ getNatureSummary(slot) }}</text>
                    </view>

                    <view class="info-row">
                      <text class="info-label">个体值</text>
                      <text class="info-value">{{ getIvSummary(slot) }}</text>
                    </view>

                    <view class="skill-row">
                      <view
                        v-for="(skill, skillIndex) in buildSkillItems(slot.skills)"
                        :key="`draft-${slotIndex}-skill-${skillIndex}`"
                        class="skill-slot"
                        :class="{ empty: !skill.name }"
                      >
                        <RemoteImage v-if="skill.icon" class="skill-icon" :src="resolvePetImage(skill.icon)" mode="aspectFit" />
                        <view v-else class="skill-fallback" :style="{ background: getSkillFallbackColor(skill) }">
                          <text class="skill-fallback-text">{{ getSkillShortName(skill.name) }}</text>
                        </view>
                        <view class="skill-name-bar">
                          <text class="skill-name">{{ skill.name || '+ 技能' }}</text>
                        </view>
                      </view>
                    </view>
                  </view>
                </view>

                <view v-else class="empty-inner" hover-class="press-down" @click="goTeamEditor">
                  <view class="empty-plus-ring">
                    <AppIcon name="plus" :size="18" color="#A3AE9F" :stroke-width="2.4" />
                  </view>
                  <text class="empty-title">添加精灵</text>
                  <text class="empty-subtitle">点击进入阵容编辑</text>
                </view>
              </view>
            </view>
          </view>
        </view>

        <view v-else class="empty">
          <view class="empty-plus-ring">
            <AppIcon name="plus" :size="20" color="#A3AE9F" :stroke-width="2.4" />
          </view>
          <text class="empty-card-title">无自定义阵容</text>
          <text class="empty-card-sub">先新建一个空阵容，再去阵容编辑页添加精灵。</text>
          <view class="empty-actions">
            <view class="empty-btn primary" hover-class="press-down" @click="createNewTeamDraft">
              <AppIcon name="plus" :size="13" color="#FFFFFF" :stroke-width="2.6" />
              <text>新建阵容</text>
            </view>
          </view>
        </view>
      </view>

      <view class="section">
        <view class="section-head">
          <view class="section-title-row">
            <view class="section-dot"></view>
            <text class="section-title">已保存阵容</text>
          </view>
          <text class="section-count">{{ savedTeams.length }} 套</text>
        </view>

        <view v-if="savedTeams.length" class="team-stack">
          <view v-for="team in savedTeams" :key="team.key" class="team-panel">
            <view class="team-panel-head">
              <view class="team-title-wrap">
                <view class="team-title-row">
                  <text class="team-name">{{ team.name }}</text>
                  <view class="rename-link" hover-class="press-down" @click.stop="openRename(team.key, team.name)">
                    <AppIcon name="edit" :size="11" color="#6B7A6E" :stroke-width="2.4" />
                    <text>改名</text>
                  </view>
                </view>
                <text class="team-meta">{{ team.summary }}</text>
              </view>

              <view class="team-actions">
                <view class="team-action ghost" hover-class="press-down" @click="editSavedTeam(team)">
                  <AppIcon name="edit" :size="12" color="#6B7A6E" :stroke-width="2.4" />
                  <text>编辑</text>
                </view>
                <view class="team-action primary" hover-class="press-down" @click="savePresetCopy(team)">
                  <AppIcon name="copy" :size="12" color="#FFFFFF" :stroke-width="2.4" />
                  <text>另存</text>
                </view>
                <view class="team-action danger" hover-class="press-down" @click="deleteSavedTeam(team)">
                  <AppIcon name="trash" :size="12" color="#C64B38" :stroke-width="2.4" />
                  <text>删除</text>
                </view>
                <view
                  class="team-collapse-badge"
                  :class="{ collapsed: !isTeamExpanded(team.key) }"
                  hover-class="press-down"
                  @click.stop="toggleTeam(team.key)"
                >
                  <text class="team-collapse-text">{{ isTeamExpanded(team.key) ? '收起' : '展开' }}</text>
                  <view class="team-collapse-arrow" :class="{ open: isTeamExpanded(team.key) }">
                    <AppIcon name="chevron-down" :size="13" color="#6B7A6E" :stroke-width="2.4" />
                  </view>
                </view>
              </view>
            </view>

            <view v-if="isTeamExpanded(team.key)" class="team-panel-body">
              <view class="team-card-list">
                <view
                  v-for="(slot, slotIndex) in team.slots"
                  :key="`${team.key}-${slotIndex}`"
                  class="roster-card"
                  :class="{ empty: !slot }"
                >
                  <view v-if="slot" class="card-main">
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
                              :key="`${team.key}-${slotIndex}-${type}`"
                              :label="type"
                              :color="getTypeColor(type)"
                              compact
                            />
                          </view>
                        </view>
                        <view class="panel-btn" hover-class="press-down" @click.stop="openPanel(slot, team.name)">
                          <AppIcon name="zap" :size="11" color="#1E7A46" :stroke-width="2.4" />
                          <text>面板</text>
                        </view>
                      </view>

                      <view class="info-row">
                        <text class="info-label">性格</text>
                        <text class="info-value">{{ getNatureSummary(slot) }}</text>
                      </view>

                      <view class="info-row">
                        <text class="info-label">个体值</text>
                        <text class="info-value">{{ getIvSummary(slot) }}</text>
                      </view>

                      <view class="skill-row">
                        <view
                          v-for="(skill, skillIndex) in buildSkillItems(slot.skills)"
                          :key="`${team.key}-${slotIndex}-skill-${skillIndex}`"
                          class="skill-slot"
                          :class="{ empty: !skill.name }"
                        >
                          <RemoteImage v-if="skill.icon" class="skill-icon" :src="resolvePetImage(skill.icon)" mode="aspectFit" />
                          <view v-else class="skill-fallback" :style="{ background: getSkillFallbackColor(skill) }">
                            <text class="skill-fallback-text">{{ getSkillShortName(skill.name) }}</text>
                          </view>
                          <view class="skill-name-bar">
                            <text class="skill-name">{{ skill.name || '+ 技能' }}</text>
                          </view>
                        </view>
                      </view>
                    </view>
                  </view>

                  <view v-else class="saved-empty-inner">
                    <view class="saved-empty-dot"></view>
                    <text class="saved-empty-text">空位</text>
                  </view>
                </view>
              </view>
            </view>
          </view>
        </view>

        <view v-else class="empty">
          <view class="empty-plus-ring">
            <AppIcon name="book" :size="20" color="#A3AE9F" :stroke-width="2.2" />
          </view>
          <text class="empty-card-title">还没有已保存阵容</text>
          <text class="empty-card-sub">点击“另存”后，会在这里新增一套阵容，不会覆盖当前编辑。</text>
        </view>
      </view>

      <view class="bottom-space"></view>
    </scroll-view>

    <view v-if="panelVisible" class="panel-mask" @click="closePanel">
      <view class="panel-dialog" @click.stop>
        <view class="dialog-grabber"></view>
        <view class="panel-dialog-head">
          <view class="panel-title-wrap">
            <text class="panel-title">{{ panelTitle || '面板属性' }}</text>
            <text class="panel-sub">根据等级、个体值和性格加成计算</text>
          </view>
          <view class="panel-close" hover-class="press-down" @click="closePanel">
            <AppIcon name="close" :size="14" color="#6B7A6E" :stroke-width="2.4" />
          </view>
        </view>
        <StatPanel v-if="panelSlot" :stats="buildPreviewStats(panelSlot)" :columns="2" />
      </view>
    </view>

    <view v-if="renameVisible" class="rename-mask" @click="closeRename">
      <view class="rename-panel" @click.stop>
        <view class="dialog-grabber"></view>
        <view class="rename-head">
          <view class="rename-crest">
            <AppIcon name="edit" :size="15" color="#1E7A46" :stroke-width="2.2" />
          </view>
          <text class="rename-title">编辑阵容名字</text>
        </view>
        <input
          class="rename-input"
          :value="renameValue"
          maxlength="16"
          placeholder="输入阵容名字"
          @input="onRenameInput"
        />
        <view class="rename-actions">
          <view class="rename-btn ghost" hover-class="press-down" @click="closeRename">
            <text>取消</text>
          </view>
          <view class="rename-btn primary" hover-class="press-down" @click="confirmRename">
            <AppIcon name="check" :size="12" color="#FFFFFF" :stroke-width="2.6" />
            <text>保存</text>
          </view>
        </view>
      </view>
    </view>

    <view v-if="floatGuideVisible" class="rename-mask" @click="closeFloatGuide">
      <view class="rename-panel" @click.stop>
        <view class="dialog-grabber"></view>
        <view class="rename-head">
          <view class="rename-crest gold">
            <AppIcon name="info" :size="15" color="#A97F35" :stroke-width="2.2" />
          </view>
          <text class="rename-title">实时伤害悬浮窗</text>
        </view>
        <view v-if="floatGuideStep === 'permission'" class="float-guide-body">
          <view class="float-guide-text">
            <text>需要"显示在其他应用上层"权限。</text>
            <text>点击下方按钮开启后，回到 App 再点一次"实时伤害悬浮窗"即可。</text>
            <text>若设置里找不到本应用或开关不可用，请先制作自定义调试基座（运行 → 运行到手机或模拟器 → 制作自定义调试基座），标准基座可能未包含悬浮窗权限。</text>
          </view>
          <view class="rename-actions">
            <view class="rename-btn ghost" hover-class="press-down" @click="closeFloatGuide">
              <text>取消</text>
            </view>
            <view class="rename-btn primary" hover-class="press-down" @click="goFloatPermissionSettings">
              <text>去开启权限</text>
            </view>
          </view>
        </view>
        <view v-else class="float-guide-body">
          <view class="float-guide-text">
            <text>悬浮窗为自研实现（无需插件），仅支持 Android App。</text>
            <text>若在真机上提示不可用，请先制作自定义调试基座后重试：</text>
            <text>菜单 运行 → 运行到手机或模拟器 → 制作自定义调试基座（免费，需勾选当前 manifest 权限）。</text>
          </view>
          <view class="rename-actions">
            <view class="rename-btn primary" hover-class="press-down" @click="closeFloatGuide">
              <text>知道了</text>
            </view>
          </view>
        </view>
      </view>
    </view>
  </view>
</template>

<script>
import SideDrawer from '@/components/SideDrawer/SideDrawer.vue'
import AppHeader from '@/components/AppHeader/AppHeader.vue'
import AppIcon from '@/components/AppIcon/AppIcon.vue'
import StatPanel from '@/components/StatPanel/StatPanel.vue'
import TypeBadge from '@/components/TypeBadge/TypeBadge.vue'
import { petTypes } from '@/data/pet/pet_detail.js'
import { readStorage, writeStorage } from '@/utils/nav.js'
import { resolveAssetPath } from '@/utils/asset-path.js'
import {
  isSystemOverlayAvailable,
  hasOverlayPermission,
  openOverlayPermissionSettings,
  openDamageFloatWindow
} from '@/utils/floatWindow.js'

const DRAFT_STORAGE_KEY = 'team_draft'
const PRESET_STORAGE_KEY = 'team_presets'
const DRAFT_NAME_STORAGE_KEY = 'team_draft_name'
const DRAFT_INIT_STORAGE_KEY = 'team_draft_initialized'

export default {
  components: {
    SideDrawer,
    AppHeader,
    AppIcon,
    StatPanel,
    TypeBadge
  },
  data() {
    return {
      drawerOpen: false,
      draftTeam: [],
      draftTeamName: '未命名阵容',
      draftInitialized: false,
      savedTeams: [],
      expandedTeamKeys: [],
      panelVisible: false,
      panelSlot: null,
      panelTitle: '',
      renameVisible: false,
      renameTeamKey: '',
      renameValue: '',
      floatGuideVisible: false,
      floatGuideStep: 'permission'
    }
  },
  computed: {
    shortcuts() {
      return [
        { title: '属性值计算', sub: '攻守双模式工具页', icon: 'wand', color: '#A97F35', bg: '#F6EEDB', action: this.goAttributeCalculator },
        { title: '实时伤害悬浮窗', sub: '对方满配实时算', icon: 'window', color: '#2C6FD1', bg: '#E7F1FE', action: this.goFloatWindow },
        { title: '技能查询', sub: '按技能查精灵', icon: 'zap', color: '#A97F35', bg: '#F6EEDB', action: this.goSkillSearch },
        { title: '速度排行', sub: '按速度种族值看', icon: 'wind', color: '#2C6FD1', bg: '#E7F1FE', action: this.goSpeedRank },
        { title: '属性克制', sub: '看倍率和例子', icon: 'shield', color: '#C64B38', bg: '#FBE9E4', action: this.goRestriction },
        { title: '孵蛋', sub: '预测可能精灵', icon: 'egg', color: '#A97F35', bg: '#F6EEDB', action: this.goEgg },
        { title: '图鉴', sub: '查看全部精灵', icon: 'book', color: '#1E7A46', bg: '#E4F2E8', action: this.goCatalog }
      ]
    },
    currentDraftSlots() {
      return this.toSixSlots(this.draftTeam)
    },
    hasDraftTeam() {
      return this.draftInitialized || this.draftTeam.length > 0
    },
    currentDraftSummary() {
      return `${this.draftTeam.filter(Boolean).length}/6 已配置`
    }
  },
  onShow() {
    this.loadTeams()
  },
  methods: {
    toSixSlots(slots = []) {
      const normalized = Array.isArray(slots) ? slots.slice(0, 6) : []
      while (normalized.length < 6) normalized.push(null)
      return normalized
    },
    normalizeSlots(slots = []) {
      return Array.isArray(slots) ? slots.filter((slot) => slot && slot.petId) : []
    },
    loadTeams() {
      this.draftTeam = this.normalizeSlots(readStorage(DRAFT_STORAGE_KEY, []))
      this.draftTeamName = readStorage(DRAFT_NAME_STORAGE_KEY, '未命名阵容') || '未命名阵容'
      this.draftInitialized = !!readStorage(DRAFT_INIT_STORAGE_KEY, false)
      const presets = readStorage(PRESET_STORAGE_KEY, [])
      this.savedTeams = Array.isArray(presets)
        ? presets
            .map((team, index) => ({
              id: team?.id || `saved-${index}`,
              key: team?.id || `saved-${index}`,
              name: team?.name || `阵容 ${index + 1}`,
              slots: this.toSixSlots(this.normalizeSlots(team?.slots || [])),
              summary: `${this.normalizeSlots(team?.slots || []).length}/6 已配置`
            }))
            .filter((team) => team.slots.some(Boolean))
        : []
      this.expandedTeamKeys = []
    },
    saveCurrentTeamAsPreset() {
      const validSlots = this.normalizeSlots(this.draftTeam)
      if (!validSlots.length) {
        uni.showToast({ title: '当前编辑为空', icon: 'none' })
        return
      }

      const presets = readStorage(PRESET_STORAGE_KEY, [])
      const next = Array.isArray(presets) ? [...presets] : []
      next.unshift({
        id: `team-${Date.now()}`,
        name: this.draftTeamName || `阵容 ${next.length + 1}`,
        slots: validSlots
      })
      writeStorage(PRESET_STORAGE_KEY, next)
      this.loadTeams()
      uni.showToast({ title: '已新增一套保存阵容', icon: 'success' })
    },
    editSavedTeam(team) {
      const slots = this.normalizeSlots(team?.slots || [])
      if (!slots.length) {
        uni.showToast({ title: '这套阵容还是空的', icon: 'none' })
        return
      }

      writeStorage(DRAFT_STORAGE_KEY, this.toSixSlots(slots))
      writeStorage(DRAFT_NAME_STORAGE_KEY, team.name || '未命名阵容')
      writeStorage(DRAFT_INIT_STORAGE_KEY, true)
      this.loadTeams()
      this.goTeamEditor()
    },
    savePresetCopy(team) {
      const slots = this.normalizeSlots(team?.slots || [])
      if (!slots.length) {
        uni.showToast({ title: '这套阵容还是空的', icon: 'none' })
        return
      }

      const presets = readStorage(PRESET_STORAGE_KEY, [])
      const next = Array.isArray(presets) ? [...presets] : []
      next.unshift({
        id: `team-${Date.now()}`,
        name: `${team.name || '阵容'} 副本`,
        slots
      })
      writeStorage(PRESET_STORAGE_KEY, next)
      this.loadTeams()
      uni.showToast({ title: '已新增一套阵容副本', icon: 'success' })
    },
    deleteSavedTeam(team) {
      uni.showModal({
        title: '删除阵容',
        content: `确定删除“${team?.name || '这套阵容'}”吗？`,
        success: ({ confirm }) => {
          if (!confirm) return
          const presets = readStorage(PRESET_STORAGE_KEY, [])
          const next = Array.isArray(presets)
            ? presets.filter((item, index) => (item?.id || `saved-${index}`) !== team.key)
            : []
          writeStorage(PRESET_STORAGE_KEY, next)
          this.loadTeams()
          uni.showToast({ title: '阵容已删除', icon: 'success' })
        }
      })
    },
    createNewTeamDraft() {
      const proceed = () => {
        writeStorage(DRAFT_STORAGE_KEY, Array.from({ length: 6 }, () => null))
        writeStorage(DRAFT_NAME_STORAGE_KEY, `未命名阵容${Date.now().toString().slice(-4)}`)
        writeStorage(DRAFT_INIT_STORAGE_KEY, true)
        this.loadTeams()
        this.goTeamEditor()
      }

      if (!this.hasDraftTeam || !this.draftTeam.length) {
        proceed()
        return
      }

      uni.showModal({
        title: '新建阵容',
        content: '会新建一个空的当前编辑阵容，已保存阵容不会受影响。是否继续？',
        success: ({ confirm }) => {
          if (confirm) proceed()
        }
      })
    },
    openRename(teamKey, currentName) {
      this.renameTeamKey = teamKey
      this.renameValue = currentName || ''
      this.renameVisible = true
    },
    onRenameInput(event) {
      this.renameValue = event.detail.value
    },
    closeRename() {
      this.renameVisible = false
      this.renameTeamKey = ''
      this.renameValue = ''
    },
    confirmRename() {
      const nextName = String(this.renameValue || '').trim()
      if (!nextName) {
        uni.showToast({ title: '请输入阵容名字', icon: 'none' })
        return
      }

      if (this.renameTeamKey === 'draft') {
        writeStorage(DRAFT_NAME_STORAGE_KEY, nextName)
        writeStorage(DRAFT_INIT_STORAGE_KEY, true)
      } else {
        const presets = readStorage(PRESET_STORAGE_KEY, [])
        const nextPresets = Array.isArray(presets)
          ? presets.map((team, index) => ({
              ...team,
              name: (team?.id || `saved-${index}`) === this.renameTeamKey ? nextName : team?.name
            }))
          : []
        writeStorage(PRESET_STORAGE_KEY, nextPresets)
      }

      this.closeRename()
      this.loadTeams()
      uni.showToast({ title: '阵容名字已更新', icon: 'success' })
    },
    isTeamExpanded(teamKey) {
      return this.expandedTeamKeys.includes(teamKey)
    },
    toggleTeam(teamKey) {
      if (this.expandedTeamKeys.includes(teamKey)) {
        this.expandedTeamKeys = this.expandedTeamKeys.filter((item) => item !== teamKey)
        return
      }
      this.expandedTeamKeys = [...this.expandedTeamKeys, teamKey]
    },
    openPanel(slot, teamName = '') {
      if (!slot) return
      this.panelSlot = slot
      this.panelTitle = teamName ? `${slot.petName} · ${teamName}` : `${slot.petName} 面板`
      this.panelVisible = true
    },
    closePanel() {
      this.panelVisible = false
      this.panelSlot = null
      this.panelTitle = ''
    },
    buildPreviewStats(slot) {
      const panel = slot?.panel || {}
      const ivs = slot?.ivs || {}
      return [
        this.makeStatItem('hp', '生命', panel.hp, ivs.hp),
        this.makeStatItem('attack', '物攻', panel.attack, ivs.attack),
        this.makeStatItem('mattack', '魔攻', panel.mattack, ivs.mattack),
        this.makeStatItem('defense', '物防', panel.defense, ivs.defense),
        this.makeStatItem('mdefense', '魔防', panel.mdefense, ivs.mdefense),
        this.makeStatItem('speed', '速度', panel.speed, ivs.speed)
      ]
    },
    makeStatItem(key, label, value, ivValue) {
      const iv = Number(ivValue) || 0
      return {
        key,
        label,
        value: value ?? '-',
        highlighted: iv > 0,
        hint: `个体+${iv}`
      }
    },
    getNatureSummary(slot) {
      const up = slot?.natureUpLabel && slot.natureUpLabel !== '无' ? `${slot.natureUpLabel}↑` : ''
      const down = slot?.natureDownLabel && slot.natureDownLabel !== '无' ? `${slot.natureDownLabel}↓` : ''
      const summary = [up, down].filter(Boolean).join(' / ')
      return summary || '无性格修正'
    },
    getIvSummary(slot) {
      const ivs = slot?.ivs || {}
      const labels = {
        hp: '生命',
        attack: '物攻',
        mattack: '魔攻',
        defense: '物防',
        mdefense: '魔防',
        speed: '速度'
      }
      const active = Object.keys(labels)
        .map((key) => ({ key, label: labels[key], value: Number(ivs[key]) || 0 }))
        .filter((item) => item.value > 0)
        .sort((a, b) => b.value - a.value)
        .slice(0, 3)
      return active.length ? active.map((item) => item.label).join(' / ') : '未分配'
    },
    buildSkillItems(skills = []) {
      const normalized = Array.isArray(skills) ? skills.slice(0, 4) : []
      while (normalized.length < 4) {
        normalized.push({ name: '', icon: '', attr: '' })
      }
      return normalized
    },
    getSkillShortName(name = '') {
      if (!name) return '+'
      return String(name).slice(0, 2)
    },
    getSkillFallbackColor(skill = {}) {
      const map = {
        普通: '#7f8ea3',
        火: '#f08030',
        水: '#4f9cff',
        草: '#55b96b',
        电: '#f6c445',
        冰: '#7ad3f7',
        武: '#c65b4b',
        毒: '#9b59b6',
        地: '#c89b53',
        翼: '#7b9fe8',
        萌: '#f49ac2',
        虫: '#8bc34a',
        幽: '#5c6bc0',
        龙: '#6d78d5',
        恶: '#5d4037',
        机械: '#78909c',
        光: '#ffd54f',
        幻: '#8e44ad'
      }
      return map[skill?.attr] || '#6b7a90'
    },
    getTypeColor(type) {
      return petTypes.find((item) => item.key === type)?.color || '#5b7cf5'
    },
    resolvePetImage(src) {
      return resolveAssetPath(src)
    },
    goTeamEditor() {
      uni.navigateTo({ url: '/pages/team-editor' })
    },
    goSkillSearch() {
      uni.navigateTo({ url: '/pages/skill-search' })
    },
    goAttributeCalculator() {
      uni.navigateTo({ url: '/pages/pvp-breakpoint' })
    },
    goSpeedRank() {
      uni.navigateTo({ url: '/pages/speed-rank' })
    },
    goRestriction() {
      uni.navigateTo({ url: '/pages/restriction' })
    },
    goEgg() {
      uni.navigateTo({ url: '/pages/egg' })
    },
    goCatalog() {
      uni.navigateTo({ url: '/pages/catalog' })
    },
    goFloatWindow() {
      // #ifdef APP-PLUS
      if (!isSystemOverlayAvailable()) {
        this.floatGuideStep = 'unsupported'
        this.floatGuideVisible = true
        return
      }
      if (!hasOverlayPermission()) {
        this.floatGuideStep = 'permission'
        this.floatGuideVisible = true
        return
      }
      const result = openDamageFloatWindow()
      if (!result.ok && result.reason !== 'unsupported') {
        uni.showToast({ title: '悬浮窗打开失败：' + (result.message || ''), icon: 'none' })
      } else if (!result.ok) {
        this.floatGuideStep = 'unsupported'
        this.floatGuideVisible = true
      }
      // #endif
      // #ifndef APP-PLUS
      uni.showToast({ title: '悬浮窗仅支持 Android App', icon: 'none' })
      // #endif
    },
    goFloatPermissionSettings() {
      openOverlayPermissionSettings()
      this.floatGuideVisible = false
    },
    closeFloatGuide() {
      this.floatGuideVisible = false
    }
  }
}
</script>

<style scoped>
.page {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  background: var(--paper-bg, #FAF6EC);
  background-image:
    radial-gradient(circle at 12% 6%, rgba(47, 158, 95, 0.06) 0, transparent 42%),
    radial-gradient(circle at 88% 24%, rgba(201, 161, 78, 0.07) 0, transparent 40%);
}

.content {
  flex: 1;
  min-height: 0;
}

/* ===== 头栏右侧胶囊 ===== */
.header-capsule {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  background: rgba(255, 255, 255, 0.18);
  border-radius: 999px;
  padding: 4px 11px 4px 8px;
}

.header-capsule-text {
  font-size: 11px;
  font-weight: 700;
  color: #FFFFFF;
  letter-spacing: 0.02em;
}

/* ===== 欢迎贴纸卡 ===== */
.welcome {
  margin: 14px 14px 0;
  padding: 14px 16px;
  display: flex;
  align-items: center;
  gap: 12px;
  background: var(--paper-card, #FFFDF7);
  border: 1.5px solid var(--paper-line, #E3DCC8);
  border-radius: 18px;
  box-shadow: var(--sticker-shadow, 0 3px 0 rgba(44, 58, 47, 0.10));
  transition: transform 0.12s ease;
  position: relative;
  overflow: hidden;
}

.welcome::before {
  content: '';
  position: absolute;
  right: -22px;
  top: -22px;
  width: 92px;
  height: 92px;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(201, 161, 78, 0.20), transparent 68%);
  pointer-events: none;
}

.welcome-crest {
  width: 44px;
  height: 44px;
  border-radius: 13px;
  background: var(--brand-green-mist, #E4F2E8);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.welcome-text {
  flex: 1;
  min-width: 0;
}

.welcome-title {
  display: block;
  font-size: 15px;
  font-weight: 700;
  color: var(--ink, #2C3A2F);
}

.welcome-sub {
  display: block;
  margin-top: 2px;
  font-size: 11.5px;
  color: var(--ink-soft, #6B7A6E);
}

.welcome-go {
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
  gap: 3px;
  padding: 6px 11px;
  border-radius: 999px;
  background: var(--brand-green-mist, #E4F2E8);
  border: 1.5px solid var(--brand-green, #2F9E5F);
  transition: transform 0.12s ease;
}

.welcome-go-text {
  font-size: 11px;
  font-weight: 700;
  color: var(--brand-green-deep, #1E7A46);
}

/* ===== 区块 ===== */
.section {
  margin: 22px 14px 0;
}

.section-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 11px;
  gap: 12px;
  flex-wrap: wrap;
}

.section-title-row {
  display: flex;
  align-items: center;
  gap: 7px;
}

.section-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--brand-gold, #C9A14E);
}

.section-title {
  font-size: 17px;
  font-weight: 700;
  letter-spacing: 0.04em;
  color: var(--ink, #2C3A2F);
}

.section-count {
  font-size: 13px;
  color: var(--ink-soft, #6B7A6E);
  font-family: Monaco, Consolas, 'Courier New', monospace;
  background: var(--paper-card, #FFFDF7);
  border: 1.5px solid var(--paper-line, #E3DCC8);
  border-radius: 999px;
  padding: 2px 12px;
}

.section-link-btn {
  min-height: 38px;
  padding: 0 13px;
  border-radius: 999px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  background: var(--brand-green-mist, #E4F2E8);
  border: 1.5px solid var(--brand-green, #2F9E5F);
  transition: transform 0.12s ease;
}

.section-link {
  font-size: 13px;
  color: var(--brand-green-deep, #1E7A46);
  font-weight: 700;
}

/* ===== 快捷入口 ===== */
.shortcut-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 11px;
}

.shortcut-card {
  padding: 13px 14px;
  border-radius: 16px;
  background: var(--paper-card, #FFFDF7);
  border: 1.5px solid var(--paper-line, #E3DCC8);
  box-shadow: var(--sticker-shadow, 0 3px 0 rgba(44, 58, 47, 0.10));
  display: flex;
  align-items: center;
  gap: 11px;
  transition: transform 0.12s ease;
}

.shortcut-icon {
  width: 36px;
  height: 36px;
  border-radius: 11px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.shortcut-text {
  flex: 1;
  min-width: 0;
}

.shortcut-title {
  display: block;
  font-size: 13.5px;
  font-weight: 700;
  color: var(--ink, #2C3A2F);
}

.shortcut-sub {
  display: block;
  margin-top: 2px;
  font-size: 11px;
  color: var(--ink-soft, #6B7A6E);
}

/* ===== 阵容贴纸卡 ===== */
.team-stack {
  display: flex;
  flex-direction: column;
  gap: 13px;
}

.team-panel {
  padding: 15px 16px;
  background: var(--paper-card, #FFFDF7);
  border: 1.5px solid var(--paper-line, #E3DCC8);
  border-radius: 18px;
  box-shadow: var(--sticker-shadow, 0 3px 0 rgba(44, 58, 47, 0.10));
}

.team-panel-head {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 12px;
  padding: 2px 2px 6px;
}

.team-title-wrap {
  min-width: 0;
  flex: 1;
}

.team-title-row {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.team-name {
  display: block;
  font-size: 16px;
  font-weight: 700;
  color: var(--ink, #2C3A2F);
}

.team-badge-gold {
  min-height: 22px;
  padding: 2px 10px;
  border-radius: 999px;
  background: var(--brand-gold-mist, #F6EEDB);
  border: 1px solid var(--brand-gold, #C9A14E);
  color: var(--brand-gold-deep, #A97F35);
  font-size: 11px;
  font-weight: 700;
}

.team-meta {
  display: block;
  margin-top: 4px;
  font-size: 12px;
  color: var(--ink-soft, #6B7A6E);
}

.rename-link {
  min-height: 24px;
  padding: 4px 10px;
  border-radius: 999px;
  background: var(--paper-deep, #F2EBDA);
  color: var(--ink-soft, #6B7A6E);
  font-size: 11.5px;
  font-weight: 600;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 3px;
  transition: transform 0.12s ease;
}

.team-actions {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 7px;
  flex-wrap: wrap;
  flex-shrink: 0;
}

.team-action {
  min-width: 58px;
  height: 32px;
  padding: 0 12px;
  border-radius: 11px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  font-size: 12px;
  font-weight: 700;
  transition: transform 0.12s ease;
}

.team-action.ghost {
  background: var(--paper-deep, #F2EBDA);
  border: 1px solid var(--paper-line, #E3DCC8);
  color: var(--ink-soft, #6B7A6E);
}

.team-action.primary {
  background: var(--brand-green, #2F9E5F);
  border: 1px solid var(--brand-green-deep, #1E7A46);
  color: #FFFFFF;
  box-shadow: 0 2px 0 var(--brand-green-deep, #1E7A46);
}

.team-action.danger {
  background: var(--brand-red-mist, #FBE9E4);
  border: 1px solid var(--brand-red, #E0604E);
  color: var(--brand-red-deep, #C64B38);
}

.team-collapse-badge {
  min-width: 58px;
  height: 32px;
  padding: 0 10px;
  border-radius: 11px;
  background: var(--paper-deep, #F2EBDA);
  border: 1px solid var(--paper-line, #E3DCC8);
  color: var(--ink-soft, #6B7A6E);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 3px;
  transition: transform 0.12s ease;
}

.team-collapse-badge.collapsed {
  color: var(--ink-faint, #A3AE9F);
}

.team-collapse-text {
  font-size: 12px;
  font-weight: 700;
  color: inherit;
}

.team-collapse-arrow {
  display: flex;
  align-items: center;
  justify-content: center;
  transform: rotate(-90deg);
  transition: transform 150ms ease-out;
}

.team-collapse-arrow.open {
  transform: rotate(0deg);
}

.team-panel-body {
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1.5px dashed var(--paper-line, #E3DCC8);
}

.team-card-list {
  display: flex;
  flex-direction: column;
  gap: 11px;
}

/* ===== 精灵卡 ===== */
.roster-card {
  border-radius: 14px;
  background: var(--paper-card, #FFFDF7);
  border: 1.5px solid var(--paper-line, #E3DCC8);
  box-shadow: 0 2px 0 rgba(44, 58, 47, 0.08);
  padding: 12px;
}

.roster-card.empty {
  border-style: dashed;
  border-color: #CFC7AE;
  background: var(--paper-deep, #F2EBDA);
  box-shadow: none;
}

.card-main {
  display: flex;
  gap: 14px;
  align-items: stretch;
}

.pet-art {
  position: relative;
  width: 30%;
  min-width: 100px;
  max-width: 120px;
  border-radius: 12px;
  background: var(--paper-deep, #F2EBDA);
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  flex-shrink: 0;
}

.pet-glow {
  position: absolute;
  width: 80px;
  height: 80px;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(47, 158, 95, 0.22) 0%, rgba(255, 255, 255, 0) 72%);
}

.pet-image {
  position: relative;
  z-index: 1;
  width: 80px;
  height: 80px;
}

.pet-side {
  min-width: 0;
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.title-row {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 12px;
}

.title-main {
  min-width: 0;
  flex: 1;
}

.pet-name {
  display: block;
  font-size: 16px;
  line-height: 1.25;
  font-weight: 700;
  color: var(--ink, #2C3A2F);
}

.type-row {
  margin-top: 5px;
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}

.panel-btn {
  flex-shrink: 0;
  min-width: 66px;
  height: 28px;
  padding: 0 11px;
  border-radius: 999px;
  background: var(--brand-green-mist, #E4F2E8);
  border: 1px solid var(--brand-green, #2F9E5F);
  color: var(--brand-green-deep, #1E7A46);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 3px;
  font-size: 11.5px;
  font-weight: 700;
  transition: transform 0.12s ease;
}

.info-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.info-label {
  flex-shrink: 0;
  min-width: 50px;
  height: 22px;
  padding: 0 9px;
  border-radius: 999px;
  background: var(--brand-green-mist, #E4F2E8);
  border: 1px solid #BFDCC8;
  color: var(--brand-green-deep, #1E7A46);
  font-size: 11.5px;
  font-weight: 700;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.info-value {
  min-width: 0;
  flex: 1;
  font-size: 13.5px;
  line-height: 1.3;
  color: var(--ink, #2C3A2F);
  font-weight: 600;
}

.skill-row {
  margin-top: auto;
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 7px;
}

.skill-slot {
  border-radius: 8px;
  overflow: hidden;
  background: var(--paper-deep, #F2EBDA);
  position: relative;
  height: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.skill-slot.empty {
  background: var(--paper-deep, #F2EBDA);
  border: 1.5px dashed #CFC7AE;
}

.skill-icon,
.skill-fallback {
  width: 100%;
  height: 100%;
}

.skill-icon {
  display: block;
}

.skill-fallback {
  display: flex;
  align-items: center;
  justify-content: center;
}

.skill-fallback-text {
  font-size: 12px;
  font-weight: 700;
  color: #FFFFFF;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.25);
}

.skill-name-bar {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  height: 18px;
  background: rgba(44, 58, 47, 0.82);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0 4px;
}

.skill-name {
  font-size: 10px;
  line-height: 1;
  color: #fff;
  font-weight: 600;
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* ===== 空态 ===== */
.empty-inner,
.saved-empty-inner {
  min-height: 100px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-direction: column;
  gap: 7px;
}

.empty-plus-ring {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  border: 2px dashed #CFC7AE;
  background: var(--paper-card, #FFFDF7);
  display: flex;
  align-items: center;
  justify-content: center;
}

.empty-title {
  font-size: 13.5px;
  font-weight: 700;
  color: var(--ink-soft, #6B7A6E);
}

.empty-subtitle {
  font-size: 11.5px;
  color: var(--ink-faint, #A3AE9F);
}

.saved-empty-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  border: 2px dashed #CFC7AE;
}

.saved-empty-text {
  font-size: 12.5px;
  color: var(--ink-faint, #A3AE9F);
}

.empty {
  padding: 26px 16px;
  text-align: center;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  background: var(--paper-card, #FFFDF7);
  border: 1.5px dashed #CFC7AE;
  border-radius: 18px;
}

.empty-card-title {
  display: block;
  margin-top: 6px;
  font-size: 15px;
  font-weight: 700;
  color: var(--ink, #2C3A2F);
}

.empty-card-sub {
  display: block;
  margin-top: 6px;
  font-size: 13px;
  line-height: 1.6;
  color: var(--ink-soft, #6B7A6E);
}

.empty-actions {
  margin-top: 14px;
  display: flex;
  justify-content: center;
}

.empty-btn {
  min-width: 120px;
  height: 40px;
  padding: 0 20px;
  border-radius: 13px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 5px;
  font-size: 14px;
  font-weight: 700;
  transition: transform 0.12s ease;
}

.empty-btn.primary {
  background: var(--brand-green, #2F9E5F);
  border: 1px solid var(--brand-green-deep, #1E7A46);
  color: #FFFFFF;
  box-shadow: 0 3px 0 var(--brand-green-deep, #1E7A46);
}

/* ===== 弹窗（贴纸化） ===== */
.panel-mask,
.rename-mask {
  position: fixed;
  inset: 0;
  background: rgba(44, 58, 47, 0.5);
  display: flex;
  align-items: flex-end;
  justify-content: center;
  padding: 14px;
  z-index: 30;
}

.panel-dialog,
.rename-panel {
  width: 100%;
  max-width: 680px;
  padding: 10px 20px 20px;
  border-radius: 24px 24px 16px 16px;
  background: var(--paper-card, #FFFDF7);
  border: 1.5px solid var(--paper-line, #E3DCC8);
  box-shadow: 0 -6px 28px rgba(44, 58, 47, 0.18);
}

.dialog-grabber {
  width: 40px;
  height: 4px;
  border-radius: 999px;
  background: #D8D0BA;
  margin: 6px auto 10px;
}

.panel-dialog-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 16px;
}

.panel-title-wrap {
  min-width: 0;
  flex: 1;
}

.panel-title {
  display: block;
  font-size: 17px;
  font-weight: 700;
  color: var(--ink, #2C3A2F);
}

.panel-sub {
  display: block;
  margin-top: 4px;
  font-size: 13px;
  color: var(--ink-soft, #6B7A6E);
}

.panel-close {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: var(--paper-deep, #F2EBDA);
  border: 1px solid var(--paper-line, #E3DCC8);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  transition: transform 0.12s ease;
}

.rename-head {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-top: 4px;
}

.rename-crest {
  width: 32px;
  height: 32px;
  border-radius: 10px;
  background: var(--brand-green-mist, #E4F2E8);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.rename-crest.gold {
  background: var(--brand-gold-mist, #F6EEDB);
}

.rename-title {
  display: block;
  font-size: 16px;
  font-weight: 700;
  color: var(--ink, #2C3A2F);
}

.rename-input {
  margin-top: 14px;
  height: 44px;
  border-radius: 12px;
  background: #FFFFFF;
  border: 1.5px solid var(--paper-line, #E3DCC8);
  padding: 0 14px;
  font-size: 14px;
  color: var(--ink, #2C3A2F);
}

.rename-actions {
  margin-top: 16px;
  display: flex;
  justify-content: flex-end;
  gap: 10px;
}

.rename-btn {
  min-width: 96px;
  height: 40px;
  padding: 0 18px;
  border-radius: 13px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 5px;
  font-size: 14px;
  font-weight: 700;
  transition: transform 0.12s ease;
}

.rename-btn.ghost {
  background: var(--paper-deep, #F2EBDA);
  border: 1px solid var(--paper-line, #E3DCC8);
  color: var(--ink-soft, #6B7A6E);
}

.rename-btn.primary {
  background: var(--brand-green, #2F9E5F);
  border: 1px solid var(--brand-green-deep, #1E7A46);
  color: #FFFFFF;
  box-shadow: 0 3px 0 var(--brand-green-deep, #1E7A46);
}

.float-guide-body {
  margin-top: 10px;
}

.float-guide-text {
  display: flex;
  flex-direction: column;
  gap: 6px;
  font-size: 13px;
  line-height: 1.6;
  color: var(--ink-soft, #6B7A6E);
  margin-bottom: 12px;
}

.bottom-space {
  height: calc(28rpx + env(safe-area-inset-bottom));
}

@media (min-width: 700px) {
  .team-card-list {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .shortcut-grid {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
}
</style>
