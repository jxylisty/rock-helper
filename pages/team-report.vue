<template>
  <view class="page">
    <AppHeader
      theme="green"
      title="阵容报告"
      subtitle="属性攻防 · 热门对位 · 结构诊断"
      leftAction="back"
      @back="goBack"
    />

    <scroll-view scroll-y class="content" enhanced :show-scrollbar="false">
      <!-- 空态 -->
      <view v-if="!snapshot" class="empty-wrap">
        <AppIcon name="book" :size="40" color="#C9A14E" :stroke-width="1.6" />
        <text class="empty-title">暂无阵容快照</text>
        <text class="empty-sub">先在「阵容编辑」页配置 6 员阵容，再点「生成阵容报告」</text>
        <view class="empty-btn" hover-class="press-down" @click="goTeamEditor">
          <text class="empty-btn-text">去配置阵容</text>
        </view>
      </view>

      <template v-else>
        <!-- 总览 -->
        <view class="hero">
          <view class="hero-title-row">
            <text class="hero-title">{{ snapshot.teamName || '我的阵容' }}</text>
            <text class="hero-time mono">{{ snapshot.savedAtLabel }}</text>
          </view>
          <view class="hero-metrics">
            <view class="hero-metric">
              <text class="hero-num mono">{{ snapshot.meta.readiness }}%</text>
              <text class="hero-label">天梯适配度</text>
            </view>
            <view class="hero-metric">
              <text class="hero-num mono">{{ snapshot.meta.readyCount }}/{{ snapshot.meta.total }}</text>
              <text class="hero-label">达标对位</text>
            </view>
            <view class="hero-metric">
              <text class="hero-num mono">{{ snapshot.meta.memberCount }}</text>
              <text class="hero-label">上阵成员</text>
            </view>
            <view class="hero-metric">
              <text class="hero-num mono">{{ snapshot.meta.avgSpeed }}</text>
              <text class="hero-label">速度均值</text>
            </view>
          </view>
        </view>

        <!-- 诊断结论（D3 人话化） -->
        <view class="section">
          <view class="section-head"><text class="section-title">诊断与建议</text></view>
          <view class="note-list">
            <view v-for="(note, i) in snapshot.actionableNotes" :key="'note-' + i" class="note-item">
              <view class="note-dot" :class="note.tone"></view>
              <text class="note-text">{{ note.text }}</text>
            </view>
            <text v-if="!snapshot.actionableNotes.length" class="empty-line">当前阵容无明显短板</text>
          </view>
        </view>

        <!-- 十八系攻防矩阵（A3） -->
        <view class="section">
          <view class="section-head"><text class="section-title">十八系攻防矩阵</text></view>
          <scroll-view scroll-x class="matrix-scroll" :show-scrollbar="false">
            <view class="matrix">
              <view class="matrix-row head">
                <view class="matrix-corner"><text class="matrix-corner-text">来袭＼成员</text></view>
                <view v-for="m in snapshot.matrix.members" :key="'mh-' + m.petId" class="matrix-col-head">
                  <text class="matrix-col-name">{{ m.name }}</text>
                </view>
              </view>
              <view v-for="row in snapshot.matrix.rows" :key="'mr-' + row.type" class="matrix-row">
                <view class="matrix-type-cell">
                  <TypeBadge :label="row.type" :color="getTypeColor(row.type)" compact />
                </view>
                <view
                  v-for="(cell, ci) in row.cells"
                  :key="'mc-' + row.type + '-' + ci"
                  class="matrix-cell"
                  :class="cell.level"
                >
                  <text class="matrix-cell-text mono">{{ cell.multiplier === 1 ? '·' : '×' + cell.multiplier }}</text>
                </view>
              </view>
            </view>
          </scroll-view>
          <view v-if="snapshot.matrix.dangerRows.length" class="danger-summary">
            <text class="danger-summary-title">重点关注</text>
            <text class="danger-summary-text">
              {{ snapshot.matrix.dangerRows.slice(0, 3).map((r) => r.type + '系（' + r.threatenedCount + ' 只被克，最高×' + r.maxMultiplier + '）').join('；') }}
            </text>
          </view>
        </view>

        <!-- 热门目标对位（C） -->
        <view class="section">
          <view class="section-head">
            <text class="section-title">热门目标对位</text>
            <text class="section-note">目标按 60级5星·三项10 满配估算</text>
          </view>
          <view class="meta-list">
            <view v-for="row in snapshot.meta.rows" :key="'meta-' + row.target.id" class="meta-card" hover-class="meta-card-press" @click="goBreakpoint(row)">
              <view class="meta-main-row">
                <text class="meta-name">{{ row.target.name }}</text>
                <text class="meta-first" :class="row.best && row.best.firstStrike === 'me' ? 'good' : (row.best && row.best.firstStrike === 'tie' ? 'mid' : 'bad')">
                  {{ row.best && row.best.firstStrike === 'me' ? '我方先手' : row.best && row.best.firstStrike === 'tie' ? '先手胶着' : '对方先手' }}
                </text>
                <view class="meta-ready" :class="{ ok: row.ready }">
                  <text class="meta-ready-text">{{ row.ready ? '达标' : '未达标' }}</text>
                </view>
              </view>
              <view v-if="row.best" class="meta-sub-row">
                <text class="meta-detail">
                  最优出手 {{ row.best.name }} · {{ row.best.bestSkillName || '无攻击技能' }}
                  <text class="mono gold">≈{{ row.best.myDamage }}</text>
                  <text v-if="row.targetHp" class="meta-hp">（目标HP {{ row.targetHp }}）</text>
                </text>
              </view>
              <view v-if="row.worst" class="meta-sub-row">
                <text class="meta-detail">承伤最大 {{ row.worst.name }} <text class="mono red">≈{{ row.worst.targetDamage }}</text></text>
              </view>
              <view class="meta-jump" hover-class="press-down" @click="goBreakpoint(row)">
                <text class="meta-jump-text">点卡片进计算器细算 →</text>
              </view>
            </view>
          </view>
        </view>

        <!-- 链分析（D2） -->
        <view class="section">
          <view class="section-head"><text class="section-title">功能链检测</text></view>
          <view class="chain-grid">
            <view class="chain-card" :class="{ ok: snapshot.chains.hasControl }">
              <text class="chain-title">控制链</text>
              <text class="chain-value">{{ snapshot.chains.controlChain.join('、') || '无' }}</text>
            </view>
            <view class="chain-card" :class="{ ok: snapshot.chains.hasEnergy }">
              <text class="chain-title">回能链</text>
              <text class="chain-value">{{ snapshot.chains.energyChain.join('、') || '无' }}</text>
            </view>
            <view class="chain-card" :class="{ ok: snapshot.chains.hasHeal }">
              <text class="chain-title">续航链</text>
              <text class="chain-value">{{ snapshot.chains.healChain.join('、') || '无' }}</text>
            </view>
            <view class="chain-card" :class="{ ok: snapshot.chains.dualCore }">
              <text class="chain-title">双核结构</text>
              <text class="chain-value">{{ snapshot.chains.dualCore ? '是（双核并列）' : '单核主导' }}</text>
            </view>
          </view>
        </view>

        <!-- 成员速览 -->
        <view class="section">
          <view class="section-head"><text class="section-title">成员速览</text></view>
          <view class="member-list">
            <view v-for="m in snapshot.members" :key="'mem-' + m.petId" class="member-row">
              <text class="member-name">{{ m.name }}</text>
              <text class="member-roles">{{ (m.roles || []).join('/') }}</text>
              <text class="member-speed mono">{{ m.speedMin }}~{{ m.speedMax }}</text>
            </view>
          </view>
        </view>
      </template>
    </scroll-view>
  </view>
</template>

<script>
import AppHeader from '@/components/AppHeader/AppHeader.vue'
import AppIcon from '@/components/AppIcon/AppIcon.vue'
import TypeBadge from '@/components/TypeBadge/TypeBadge.vue'
import { petTypes } from '@/data/pet/pet_detail.js'
import { readStorage } from '@/utils/nav.js'

const SNAPSHOT_KEY = 'team_report_snapshot_v1'

export default {
  components: { AppHeader, AppIcon, TypeBadge },
  data() {
    return {
      snapshot: null
    }
  },
  onShow() {
    this.snapshot = readStorage(SNAPSHOT_KEY, null)
  },
  computed: {
    typeColorMap() {
      const map = {}
      ;(petTypes || []).forEach((t) => { map[t.key] = t.color })
      return map
    }
  },
  methods: {
    getTypeColor(type) {
      return this.typeColorMap[type] || '#5b7cf5'
    },
    goBack() {
      uni.navigateBack({ fail: () => uni.reLaunch({ url: '/pages/index' }) })
    },
    goTeamEditor() {
      uni.navigateTo({ url: '/pages/team-editor' })
    },
    goBreakpoint(row) {
      if (!row.best || !row.best.petId) {
        uni.showToast({ title: '该目标暂无可对位成员', icon: 'none' })
        return
      }
      uni.navigateTo({ url: `/pages/pvp-breakpoint?attacker=${row.best.petId}&defender=${row.target.id}` })
    }
  }
}
</script>

<style scoped>
.page { height: 100vh; display: flex; flex-direction: column; background: linear-gradient(180deg, #F6F3E8 0%, #EFEAD8 100%); overflow: hidden; }
/* 沿用 catalog 页惯例：header 占实际高度（含状态栏），scroll 区 flex:1 自动填满剩余空间，避免 calc 固定值在不同机型状态栏高度下裁底 */
.content { flex: 1; min-height: 0; }
.mono { font-family: Menlo, Consolas, monospace; }
.gold { color: #C9A14E; }
.red { color: #C64B38; }

.empty-wrap { display: flex; flex-direction: column; align-items: center; padding: 120rpx 40rpx; }
.empty-title { margin-top: 20rpx; font-size: 30rpx; font-weight: 600; color: #2C3A2F; }
.empty-sub { margin-top: 12rpx; font-size: 24rpx; color: #8A9690; text-align: center; }
.empty-btn { margin-top: 40rpx; padding: 16rpx 48rpx; background: #1E7A46; border-radius: 40rpx; }
.empty-btn-text { color: #FFF5EC; font-size: 26rpx; font-weight: 600; }

.hero { margin: 24rpx 28rpx; padding: 28rpx; background: rgba(255, 252, 245, 0.9); border: 2rpx solid rgba(30, 122, 70, 0.14); border-radius: 22rpx; }
.hero-title-row { display: flex; align-items: baseline; justify-content: space-between; }
.hero-title { font-size: 34rpx; font-weight: 700; color: #2C3A2F; }
.hero-time { font-size: 20rpx; color: #A3AE9F; }
.hero-metrics { margin-top: 20rpx; display: flex; }
.hero-metric { flex: 1; display: flex; flex-direction: column; align-items: center; }
.hero-num { font-size: 34rpx; font-weight: 700; color: #1E7A46; }
.hero-label { margin-top: 4rpx; font-size: 22rpx; color: #8A9690; }

.section { margin: 0 28rpx 28rpx; padding: 24rpx; background: rgba(255, 252, 245, 0.9); border: 2rpx solid rgba(30, 122, 70, 0.12); border-radius: 22rpx; }
.section-head { display: flex; align-items: baseline; justify-content: space-between; margin-bottom: 16rpx; }
.section-title { font-size: 28rpx; font-weight: 700; color: #2C3A2F; }
.section-note { font-size: 20rpx; color: #A3AE9F; }

.note-list { display: block; }
.note-item { display: flex; align-items: flex-start; margin-bottom: 12rpx; }
.note-dot { flex-shrink: 0; width: 12rpx; height: 12rpx; border-radius: 50%; background: #C9A14E; margin-top: 12rpx; margin-right: 14rpx; }
.note-dot.warn { background: #C64B38; }
.note-dot.good { background: #1E7A46; }
.note-text { font-size: 24rpx; color: #4A5A55; line-height: 1.6; flex: 1; }
.empty-line { font-size: 24rpx; color: #A3AE9F; }

.matrix-scroll { width: 100%; }
.matrix { display: inline-block; min-width: 100%; }
.matrix-row { display: flex; align-items: stretch; }
.matrix-row.head { margin-bottom: 6rpx; }
.matrix-corner { width: 110rpx; flex-shrink: 0; display: flex; align-items: flex-end; }
.matrix-corner-text { font-size: 20rpx; color: #A3AE9F; }
.matrix-col-head { width: 112rpx; flex-shrink: 0; text-align: center; overflow: hidden; padding: 0 4rpx; }
.matrix-col-name { font-size: 22rpx; color: #4A5A55; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.matrix-type-cell { width: 110rpx; flex-shrink: 0; padding: 6rpx 4rpx; }
.matrix-cell { width: 112rpx; flex-shrink: 0; height: 56rpx; display: flex; align-items: center; justify-content: center; border-radius: 8rpx; margin: 3rpx 0; }
.matrix-cell.double { background: rgba(198, 75, 56, 0.55); }
.matrix-cell.strong { background: rgba(198, 75, 56, 0.28); }
.matrix-cell.resist { background: rgba(30, 122, 70, 0.22); }
.matrix-cell.neutral { background: rgba(163, 174, 159, 0.14); }
.matrix-cell-text { font-size: 20rpx; color: #2C3A2F; }

.danger-summary { margin-top: 16rpx; padding: 14rpx 18rpx; background: rgba(198, 75, 56, 0.08); border-radius: 14rpx; display: block; }
.danger-summary-title { display: block; font-size: 24rpx; font-weight: 700; color: #C64B38; }
.danger-summary-text { display: block; margin-top: 6rpx; font-size: 22rpx; color: #8A5A50; line-height: 1.6; }

.meta-list { display: block; }
.meta-card { padding: 16rpx 18rpx; margin-bottom: 12rpx; background: rgba(246, 243, 232, 0.75); border: 1rpx solid rgba(30, 122, 70, 0.12); border-radius: 16rpx; }
.meta-card-press { background: rgba(30, 122, 70, 0.08); border-color: rgba(30, 122, 70, 0.3); }
.meta-main-row { display: flex; align-items: center; }
.meta-name { font-size: 26rpx; font-weight: 700; color: #2C3A2F; flex: 1; }
.meta-first { font-size: 20rpx; padding: 2rpx 12rpx; border-radius: 12rpx; margin-right: 10rpx; }
.meta-first.good { background: rgba(30, 122, 70, 0.14); color: #1E7A46; }
.meta-first.mid { background: rgba(201, 161, 78, 0.16); color: #8A6A2C; }
.meta-first.bad { background: rgba(198, 75, 56, 0.12); color: #C64B38; }
.meta-ready { padding: 2rpx 12rpx; border-radius: 12rpx; background: rgba(163, 174, 159, 0.2); }
.meta-ready.ok { background: rgba(30, 122, 70, 0.16); }
.meta-ready-text { font-size: 22rpx; color: #4A5A55; }
.meta-ready.ok .meta-ready-text { color: #1E7A46; font-weight: 600; }
.meta-sub-row { margin-top: 6rpx; }
.meta-detail { font-size: 22rpx; color: #5C6B60; }
.meta-hp { font-size: 20rpx; color: #A3AE9F; }
.meta-jump { margin-top: 10rpx; display: inline-flex; align-items: center; padding: 14rpx 28rpx; background: rgba(30, 122, 70, 0.1); border-radius: 28rpx; min-height: 56rpx; }
.meta-jump-text { font-size: 24rpx; color: #1E7A46; font-weight: 600; }

.chain-grid { display: flex; flex-wrap: wrap; gap: 12rpx; }
.chain-card { width: 46%; padding: 16rpx 18rpx; background: rgba(163, 174, 159, 0.12); border-radius: 14rpx; display: flex; flex-direction: column; }
.chain-card.ok { background: rgba(30, 122, 70, 0.1); }
.chain-title { font-size: 22rpx; color: #8A9690; }
.chain-card.ok .chain-title { color: #1E7A46; font-weight: 600; }
.chain-value { margin-top: 6rpx; font-size: 24rpx; color: #2C3A2F; font-weight: 600; }

.member-list { display: block; }
.member-row { display: flex; align-items: center; padding: 10rpx 0; border-bottom: 1rpx solid rgba(30, 122, 70, 0.08); }
.member-name { width: 180rpx; font-size: 24rpx; font-weight: 600; color: #2C3A2F; }
.member-roles { flex: 1; font-size: 22rpx; color: #5C6B60; }
.member-speed { font-size: 22rpx; color: #8A6A2C; }
</style>
