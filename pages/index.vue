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
      <!-- 顶部全图鉴快速搜索栏 -->
      <view class="quick-search-box" hover-class="press-down" @click="goCatalog">
        <view class="quick-search-left">
          <AppIcon name="search" :size="15" color="#8A6A2C" :stroke-width="2.4" />
          <text class="quick-search-placeholder">搜索精灵名称、系别、技能...</text>
        </view>
        <view class="quick-search-tag">
          <text class="quick-search-tag-text">全图鉴</text>
        </view>
      </view>

      <!-- 4x2 游戏快捷功能入口 (金刚区) -->
      <view class="core-grid-card">
        <view class="core-grid">
          <view
            v-for="item in shortcuts"
            :key="item.title"
            class="core-grid-item"
            hover-class="press-down"
            @click="item.action"
          >
            <view
              class="core-grid-icon-wrap"
              :style="{
                background: item.gradient || item.bg,
                borderColor: item.border || 'rgba(0, 0, 0, 0.06)',
                boxShadow: item.glow ? `0 4px 10px ${item.glow}, inset 0 1px 1px rgba(255, 255, 255, 0.85)` : '0 2px 0 rgba(44, 58, 47, 0.10)'
              }"
            >
              <image v-if="item.gameIcon" class="core-grid-game-icon" :src="item.gameIcon" mode="aspectFit" />
              <AppIcon v-else :name="item.icon" :size="23" :color="item.color" :stroke-width="2.3" />
            </view>
            <text class="core-grid-title">{{ item.title }}</text>
            <text v-if="item.sub" class="core-grid-sub">{{ item.sub }}</text>
          </view>
        </view>
      </view>

      <!-- 热门精灵速查 横向滑块 -->
      <view class="section">
        <view class="section-head">
          <view class="section-title-row">
            <view class="section-dot gold"></view>
            <text class="section-title">热门精灵速查</text>
          </view>
          <view class="section-link-btn" hover-class="press-down" @click="goCatalog">
            <text class="section-link">全部图鉴</text>
            <AppIcon name="arrow-right" :size="10" color="#1E7A46" :stroke-width="2.4" />
          </view>
        </view>

        <scroll-view scroll-x class="hot-pets-scroll" :show-scrollbar="false">
          <view class="hot-pets-row">
            <view
              v-for="pet in hotPets"
              :key="pet.id"
              class="hot-pet-card"
              hover-class="press-down"
              @click="goDetail(pet.id)"
            >
              <view class="hot-pet-art">
                <RemoteImage class="hot-pet-img" :src="resolvePetImage(pet.img)" mode="aspectFit" />
              </view>
              <text class="hot-pet-name">{{ pet.name }}</text>
              <view class="hot-pet-badges">
                <TypeBadge
                  v-for="type in pet.type"
                  :key="`${pet.id}-${type}`"
                  :label="type"
                  :color="getTypeColor(type)"
                  compact
                />
              </view>
            </view>
          </view>
        </scroll-view>
      </view>

      <view class="welcome" hover-class="press-down" @click="goTeamEditor">
        <view class="welcome-crest">
          <AppIcon name="star" :size="18" color="#C9A14E" :stroke-width="2.2" />
        </view>
        <view class="welcome-text">
          <text class="welcome-title">{{ draftTeamName || '我的阵容' }}</text>
          <text class="welcome-sub">六宠战队配置 · 实战面板推演与配招</text>
        </view>
        <view class="welcome-go">
          <text class="welcome-go-text">去调整</text>
          <AppIcon name="arrow-right" :size="12" color="#1E7A46" :stroke-width="2.4" />
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
            <AppIcon name="sparkles" :size="20" color="#C9A14E" :stroke-width="2.2" />
          </view>
          <text class="empty-card-title">暂未编排战斗队伍</text>
          <text class="empty-card-sub">挑选 6 只出战精灵，组建你的专属洛克战队吧！</text>
          <view class="empty-actions">
            <view class="empty-btn primary" hover-class="press-down" @click="createNewTeamDraft">
              <AppIcon name="plus" :size="13" color="#FFFFFF" :stroke-width="2.6" />
              <text>创建首套阵容</text>
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
            <AppIcon name="book" :size="20" color="#C9A14E" :stroke-width="2.2" />
          </view>
          <text class="empty-card-title">阵容收藏册尚无记录</text>
          <text class="empty-card-sub">在上方点击「另存」即可将战队保存到收藏册，方便随时切换推演。</text>
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

    <!-- #ifdef APP-PLUS -->
    <view v-if="floatGuideVisible" class="rename-mask" @click="closeFloatGuide">
      <view class="rename-panel" @click.stop>
        <view class="dialog-grabber"></view>
        <view class="rename-head">
          <view class="rename-crest gold">
            <AppIcon name="info" :size="15" color="#A97F35" :stroke-width="2.2" />
          </view>
          <text class="rename-title">实时伤害悬浮面板</text>
        </view>
        <view class="float-guide-body">
          <view v-if="floatGuideStep === 'permission'" class="float-guide-text">
            <text>首次使用需要开启「悬浮窗」权限。</text>
            <text>vivo 等部分机型设置里叫"悬浮窗"（非"显示在其他应用上层"），在权限页找到本应用并打开即可。</text>
            <text>点击下方按钮去开启，返回后再点一次"实时伤害悬浮窗"即可。</text>
            <text>已开启仍提示？点"我已开启，直接打开"试一次——系统级悬浮窗以真实结果为准，失败会有具体提示。</text>
            <text>若设置里找不到本应用，请先制作自定义调试基座（UTS 插件必须）。</text>
            <text v-if="floatDebugInfo" class="float-debug-info">检测详情：{{ floatDebugInfo }}</text>
          </view>
          <view v-else class="float-guide-text">
            <text>悬浮窗为系统级窗口（UTS 插件实现），可覆盖到游戏等其他应用之上，仅支持 Android App。</text>
            <text>悬浮球：单击展开/收起面板，拖动移动位置，长按关闭。</text>
            <text>若提示不可用：请制作自定义调试基座后运行（运行 → 运行到手机或模拟器 → 制作自定义调试基座）。</text>
            <text>当前基座不含 UTS 插件时会自动降级为应用内悬浮窗（仅覆盖本App页面，打开时有 toast 提示）。</text>
          </view>
          <view class="rename-actions">
            <view v-if="floatGuideStep === 'permission'" class="rename-btn ghost" hover-class="press-down" @click="closeFloatGuide">
              <text>取消</text>
            </view>
            <view v-if="floatGuideStep === 'permission'" class="rename-btn ghost" hover-class="press-down" @click="forceOpenFloatWindow">
              <text>我已开启，直接打开</text>
            </view>
            <view v-if="floatGuideStep === 'permission'" class="rename-btn primary" hover-class="press-down" @click="goFloatPermissionSettings">
              <text>去开启权限</text>
            </view>
            <view v-else class="rename-btn primary" hover-class="press-down" @click="closeFloatGuide">
              <text>知道了</text>
            </view>
          </view>
        </view>
      </view>
    </view>
    <!-- #endif -->
  </view>
</template>

<script>
import SideDrawer from '@/components/SideDrawer/SideDrawer.vue'
import AppHeader from '@/components/AppHeader/AppHeader.vue'
import AppIcon from '@/components/AppIcon/AppIcon.vue'
import StatPanel from '@/components/StatPanel/StatPanel.vue'
import TypeBadge from '@/components/TypeBadge/TypeBadge.vue'
import { petTypes, petDetail } from '@/data/pet/pet_detail.js'
import { readStorage, writeStorage } from '@/utils/nav.js'
import { petIndex } from '@/data/pet/pet_index.js'
import { resolveAssetPath } from '@/utils/asset-path.js'
import { openDamageFloatWindow, isSystemOverlayAvailable, hasOverlayPermission, openOverlayPermissionSettings, getOverlayDebugInfo } from '@/utils/floatWindow.js'

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
      floatGuideStep: 'info',
      floatDebugInfo: ''
    }
  },
  computed: {
    shortcuts() {
      return [
        {
          title: '全图鉴',
          sub: '1180+ 精灵',
          icon: 'book',
          gameIcon: '/static/game-icons/card.png',
          color: '#1E7A46',
          gradient: 'linear-gradient(145deg, #F0FAF4 0%, #D8F0E2 100%)',
          border: '#BFE4CF',
          glow: 'rgba(30, 122, 70, 0.16)',
          action: this.goCatalog
        },
        {
          title: '伤害推演',
          sub: '实战极值',
          icon: 'wand',
          gameIcon: '/static/game-icons/wish.png',
          color: '#8A45B8',
          gradient: 'linear-gradient(145deg, #F9F3FD 0%, #ECDCFA 100%)',
          border: '#DDC5F4',
          glow: 'rgba(138, 69, 184, 0.16)',
          action: this.goAttributeCalculator
        },
        {
          title: '技能速查',
          sub: '威力·PP',
          icon: 'zap',
          color: '#A97F35',
          gradient: 'linear-gradient(145deg, #FFF9EB 0%, #F5E6C6 100%)',
          border: '#EAD7B2',
          glow: 'rgba(169, 127, 53, 0.18)',
          action: this.goSkillSearch
        },
        {
          title: '速度天梯',
          sub: '先手时序',
          icon: 'wind',
          color: '#216AC8',
          gradient: 'linear-gradient(145deg, #F0F6FF 0%, #D8E8FC 100%)',
          border: '#C0D9FA',
          glow: 'rgba(33, 106, 200, 0.16)',
          action: this.goSpeedRank
        },
        {
          title: '属性克制',
          sub: '相克表',
          icon: 'shield',
          gameIcon: '/static/game-icons/stone-grass.png',
          color: '#C64B38',
          gradient: 'linear-gradient(145deg, #FFF3F0 0%, #FCDCD6 100%)',
          border: '#F4C4BA',
          glow: 'rgba(198, 75, 56, 0.16)',
          action: this.goRestriction
        },
        {
          title: '大块头',
          sub: '孵化体重',
          icon: 'egg',
          gameIcon: '/static/game-icons/egg-white.png',
          color: '#A97F35',
          gradient: 'linear-gradient(145deg, #FFF9EB 0%, #F5E6C6 100%)',
          border: '#EAD7B2',
          glow: 'rgba(169, 127, 53, 0.18)',
          action: this.goEgg
        },
        {
          title: '孵蛋摆窝',
          sub: '繁育求解',
          icon: 'home',
          gameIcon: '/static/game-icons/egg-green.png',
          color: '#1E7A46',
          gradient: 'linear-gradient(145deg, #F0FAF4 0%, #D8F0E2 100%)',
          border: '#BFE4CF',
          glow: 'rgba(30, 122, 70, 0.16)',
          action: this.goBreedingPlanner
        },
        {
          title: '阵容编辑',
          sub: '6只编队',
          icon: 'users',
          color: '#216AC8',
          gradient: 'linear-gradient(145deg, #F0F6FF 0%, #D8E8FC 100%)',
          border: '#C0D9FA',
          glow: 'rgba(33, 106, 200, 0.16)',
          action: this.goTeamEditor
        },
        // #ifdef APP-PLUS
        {
          title: '对局浮窗',
          sub: '悬浮辅助',
          icon: 'window',
          color: '#216AC8',
          gradient: 'linear-gradient(145deg, #F0F6FF 0%, #D8E8FC 100%)',
          border: '#C0D9FA',
          glow: 'rgba(33, 106, 200, 0.16)',
          action: this.goFloatWindow
        }
        // #endif
      ]
    },
    hotPets() {
      // 名称 → seq（官方编号曾整体偏移，禁止写死编号）
      const seqByName = {}
      for (const entry of Object.values(petIndex)) {
        if (entry.name && !seqByName[entry.name]) seqByName[entry.name] = entry.seq
      }
      const resolve = (seq) => {
        const first = (petDetail[String(seq)] || [])[0] || {}
        return {
          id: seq,
          name: first.page_title || '',
          img: first.img || '',
          type: first.type || []
        }
      }

      const cards = []
      const seen = new Set()
      const push = (seq) => {
        if (!seq || seen.has(seq)) return
        const card = resolve(seq)
        if (card.name) {
          seen.add(seq)
          cards.push(card)
        }
      }

      // 最近配置过的精灵排最前（对用户而言才是真"热门"，零维护）
      const configMap = readStorage('pet_config_cache_v1', {}) || {}
      Object.entries(configMap)
        .filter(([, cfg]) => cfg && cfg.cachedAt)
        .sort((a, b) => (b[1].cachedAt || 0) - (a[1].cachedAt || 0))
        .slice(0, 2)
        .forEach(([pid]) => push(Number(pid)))

      // 常青高人气名单
      const HOT_NAMES = ['迪莫', '火神', '白金独角兽', '罗隐', '魔力猫', '水灵', '暗影灵面']
      HOT_NAMES.forEach((name) => push(seqByName[name]))

      return cards.slice(0, 8)
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
    goBreedingPlanner() {
      uni.navigateTo({ url: '/pages/breeding-planner' })
    },
    goCatalog() {
      uni.navigateTo({ url: '/pages/catalog' })
    },
    goDetail(id) {
      uni.navigateTo({ url: '/pages/detail?id=' + id })
    },
    goFloatWindow() {
      // #ifdef APP-PLUS
      if (!isSystemOverlayAvailable()) {
        this.floatGuideStep = 'info'
        this.floatGuideVisible = true
        return
      }
      if (!hasOverlayPermission()) {
        this.floatGuideStep = 'permission'
        this.floatDebugInfo = getOverlayDebugInfo()
        this.floatGuideVisible = true
        return
      }
      const result = openDamageFloatWindow()
      if (result.ok && result.mode === 'inapp') {
        uni.showToast({ title: '应用内悬浮窗：仅覆盖本App。悬浮到游戏需自定义调试基座', icon: 'none', duration: 2500 })
      } else if (!result.ok && result.reason === 'error') {
        uni.showToast({ title: '悬浮窗打开失败：' + (result.message || ''), icon: 'none' })
      } else if (!result.ok) {
        this.floatGuideStep = 'info'
        this.floatGuideVisible = true
      }
      // #endif
      // #ifndef APP-PLUS
      this.floatGuideVisible = true
      // #endif
    },
    forceOpenFloatWindow() {
      // 跳过权限检测直接打开：厂商权限检测在 vivo 等机型不可靠，
      // 以 WindowManager.addView 的真实结果为准（失败会有 toast 提示）
      this.floatGuideVisible = false
      // #ifdef APP-PLUS
      const result = openDamageFloatWindow()
      if (!result.ok && result.reason === 'error') {
        uni.showToast({ title: '悬浮窗打开失败：' + (result.message || ''), icon: 'none' })
      } else if (!result.ok) {
        this.floatGuideStep = 'info'
        this.floatGuideVisible = true
      }
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

/* ===== 顶部快速搜索栏 ===== */
.quick-search-box {
  margin: 14px 14px 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 44px;
  padding: 0 14px;
  background: var(--paper-card, #FFFDF7);
  border: 1.5px solid var(--paper-line, #E3DCC8);
  border-radius: 999px;
  box-shadow: 0 2px 0 rgba(44, 58, 47, 0.10);
  transition: transform 0.12s ease;
}

.quick-search-left {
  display: flex;
  align-items: center;
  gap: 8px;
  flex: 1;
  min-width: 0;
}

.quick-search-placeholder {
  font-size: 13px;
  color: var(--ink-muted, #A3AE9F);
}

.quick-search-tag {
  flex-shrink: 0;
  height: 24px;
  padding: 0 10px;
  border-radius: 999px;
  background: var(--brand-green-mist, #E4F2E8);
  border: 1px solid var(--brand-green, #2F9E5F);
  display: flex;
  align-items: center;
}

.quick-search-tag-text {
  font-size: 11px;
  font-weight: 700;
  color: var(--brand-green-deep, #1E7A46);
}

/* ===== 核心功能金刚区 (4x2) ===== */
.core-grid-card {
  margin: 14px 14px 0;
  padding: 14px 6px 12px;
  border-radius: 20px;
  background: var(--paper-card, #FFFDF7);
  border: 1.5px solid var(--paper-line, #E3DCC8);
  box-shadow: var(--sticker-shadow, 0 3px 0 rgba(44, 58, 47, 0.10));
}

.core-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 12px 2px;
}

.core-grid-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 3px;
  transition: transform 0.12s ease;
}

.core-grid-icon-wrap {
  width: 48px;
  height: 48px;
  border-radius: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1.5px solid rgba(255, 255, 255, 0.85);
  transition: transform 0.12s ease, box-shadow 0.12s ease;
}

.core-grid-game-icon {
  width: 30px;
  height: 30px;
  border-radius: 8px;
  filter: drop-shadow(0 2px 3px rgba(44, 58, 47, 0.25));
}

.core-grid-title {
  font-size: 12px;
  font-weight: 800;
  color: var(--ink, #2C3A2F);
  text-align: center;
  white-space: nowrap;
  line-height: 1.25;
  margin-top: 2px;
}

.core-grid-sub {
  font-size: 9.5px;
  font-weight: 600;
  color: #8C998B;
  text-align: center;
  white-space: nowrap;
  line-height: 1.1;
  letter-spacing: -0.02em;
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
  margin: 14px 14px 0;
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

/* ===== 热门精灵速查横向滑块 ===== */
.hot-pets-scroll {
  width: 100%;
  white-space: nowrap;
}

.hot-pets-row {
  display: inline-flex;
  gap: 10px;
  padding: 2px 0 6px;
}

.hot-pet-card {
  display: inline-flex;
  flex-direction: column;
  align-items: center;
  width: 92px;
  padding: 10px 6px;
  border-radius: 15px;
  background: var(--paper-card, #FFFDF7);
  border: 1.5px solid var(--paper-line, #E3DCC8);
  box-shadow: 0 2px 0 rgba(44, 58, 47, 0.10);
  transition: transform 0.12s ease;
}

.hot-pet-art {
  width: 58px;
  height: 58px;
  border-radius: 12px;
  background: var(--paper-tint, #F6EEDB);
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 6px;
  overflow: hidden;
}

.hot-pet-img {
  width: 50px;
  height: 50px;
}

.hot-pet-name {
  font-size: 12px;
  font-weight: 700;
  color: var(--ink, #2C3A2F);
  max-width: 82px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  margin-bottom: 4px;
}

.hot-pet-badges {
  display: flex;
  gap: 3px;
  justify-content: center;
  flex-wrap: wrap;
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
  box-shadow: 0 2px 0 rgba(44, 58, 47, 0.10);
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

.float-debug-info {
  font-size: 10px;
  line-height: 1.5;
  color: #A3AE9F;
  word-break: break-all;
}

.bottom-space {
  height: calc(28rpx + env(safe-area-inset-bottom));
}

@media (min-width: 700px) {
  .team-card-list {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .core-grid {
    grid-template-columns: repeat(8, minmax(0, 1fr));
  }
}
</style>
