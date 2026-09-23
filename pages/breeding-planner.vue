<template>
  <view class="planner-page">
    <AppHeader theme="gold" title="异色与炫彩繁育规划" leftAction="back">
      <template #right>
        <view class="head-help-btn" hover-class="press-down" @click="showCalcHelp = !showCalcHelp">
          <AppIcon name="info" :size="14" color="#FFF9EC" />
        </view>
      </template>
    </AppHeader>

    <!-- 顶部 Tab 切换 -->
    <view class="tab-bar">
      <view
        class="tab-item"
        :class="{ active: activeTab === 'solver' }"
        hover-class="press-down"
        @click="activeTab = 'solver'"
      >
        <AppIcon name="wand" :size="13" :color="activeTab === 'solver' ? '#1E7A46' : '#8A7B5C'" />
        <text>智能摆窝</text>
      </view>
      <view
        class="tab-item"
        :class="{ active: activeTab === 'rules' }"
        hover-class="press-down"
        @click="activeTab = 'rules'"
      >
        <AppIcon name="book" :size="13" :color="activeTab === 'rules' ? '#1E7A46' : '#8A7B5C'" />
        <text>官方概率</text>
      </view>
    </view>

    <!-- ============ Tab 1: 智能摆窝求解器 ============ -->
    <view v-if="activeTab === 'solver'" class="solver-wrap">
      <scroll-view scroll-y class="planner-scroll" :show-scrollbar="false">
        <!-- 参数控制台 -->
        <view class="section card">
          <view class="section-head">
            <view class="section-head-left">
              <view class="section-icon gold">
                <AppIcon name="ruler" :size="11" color="#FFF9EC" />
              </view>
              <text class="section-title">参数控制台</text>
            </view>
          </view>

          <!-- 小窝总数（游戏内最多 11 窝） -->
          <view class="param-row">
            <text class="param-label">小窝总数&#12288;{{ nestCount }} 窝</text>
            <view class="step-group">
              <view class="step-btn" hover-class="press-down" @click="setNestCount(-1)">
                <text class="step-btn-t">−</text>
              </view>
              <view class="step-btn" hover-class="press-down" @click="setNestCount(1)">
                <text class="step-btn-t">+</text>
              </view>
            </view>
          </view>

          <!-- 配比滑块 -->
          <view class="param-row col">
            <view class="row-between">
              <text class="param-label">雄性窝数&#12288;{{ maleCount }} &#12288;· 雌性窝数 {{ nestCount - maleCount }}</text>
              <text class="mute-hint">{{ nestSuggest }}</text>
            </view>
            <slider
              class="ratio-slider"
              :min="1"
              :max="nestCount - 1"
              :value="maleCount"
              :step="1"
              activeColor="#1E7A46"
              backgroundColor="#E3DCC8"
              block-color="#B08D3E"
              block-size="20"
              @changing="maleCount = $event.detail.value"
              @change="maleCount = $event.detail.value"
            />
          </view>

          <!-- 目标偏好 -->
          <view class="param-row col">
            <text class="param-label">目标偏好</text>
            <view class="seg-wrap">
              <view
                v-for="opt in modeOptions"
                :key="opt.value"
                class="seg-item"
                :class="{ active: mode === opt.value }"
                hover-class="press-down"
                @click="mode = opt.value"
              >
                <text>{{ opt.label }}</text>
              </view>
            </view>
          </view>

          <!-- 操作按钮 -->
          <view class="action-row">
            <view class="act-btn primary" hover-class="press-down" @click="runPlan">
              <AppIcon name="sparkles" :size="13" color="#FFF9EC" />
              <text>一键智能规划</text>
            </view>
            <view class="act-btn ghost" hover-class="press-down" @click="loadDemo">
              <AppIcon name="star" :size="13" color="#1E7A46" />
              <text>演示库存</text>
            </view>
            <view class="act-btn ghost" hover-class="press-down" @click="resetPlan">
              <AppIcon name="swap" :size="13" color="#C64B38" />
              <text>重置</text>
            </view>
          </view>
        </view>

        <!-- 求解中指示 -->
        <view v-if="solving" class="solving-banner">
          <view class="spinner"></view>
          <text>正在计算最优摆窝方案… {{ solveProgress }}%</text>
        </view>

        <!-- 摆法沙盘 -->
        <view v-if="currentPlan" class="section card">
          <view class="section-head">
            <view class="section-head-left">
              <view class="section-icon green">
                <AppIcon name="home" :size="11" color="#FFF9EC" />
              </view>
              <text class="section-title">摆法沙盘（{{ currentPlan.title || '方案' + (activePlanIndex + 1) }}）</text>
            </view>
            <view class="plan-switch" v-if="solutions.length > 1">
              <view
                v-for="(sol, i) in solutions"
                :key="i"
                class="plan-pill"
                :class="{ active: activePlanIndex === i }"
                hover-class="press-down"
                @click="activePlanIndex = i; activeNestId = null; activePairKey = ''"
              >
                <text>方案{{ i + 1 }}</text>
              </view>
            </view>
          </view>

          <view v-if="deepLinkTargetName" class="board-hint">
            <AppIcon name="crosshair" :size="10" color="#C64B38" />
            <text>来自孵蛋预测的目标:「{{ deepLinkTargetName }}」已标记为想生，沙盘中红虚线母窝即它的位置</text>
          </view>

          <view v-if="boardScrollable" class="board-hint">
            <AppIcon name="arrow-right" :size="10" color="#8A7B5C" />
            <text>左右滑动查看完整摆法 · 坐标即游戏内小窝对位</text>
          </view>

          <scroll-view scroll-x class="board-scroll" :show-scrollbar="false">
            <view class="board" :style="boardStyle">
              <!-- 配对连线层：金色连线 = 可孵化配对，画在窝格下方 -->
              <view
                v-for="line in pairLines"
                :key="'line-' + line.key"
                class="pair-line-el"
                :class="{ hot: line.hot, dim: line.dim }"
                :style="lineStyle(line)"
              ></view>
              <!-- 窝格层 -->
              <view
                v-for="nest in boardNests"
                :key="nest.id"
                class="nest"
                :class="[
                  'g-' + nest.gender,
                  {
                    empty: !nest.pet,
                    dead: !!nest.pet && nest.connectionCount === 0,
                    target: !!nest.pet && nest.gender === 'F' && nest.wishStatus === 'missing',
                    picked: activeNestIds.indexOf(nest.id) !== -1,
                  },
                ]"
                hover-class="press-down"
                :style="{ left: nest.px + 'px', top: nest.py + 'px', width: nest.pw + 'px', height: nest.ph + 'px' }"
                @click="onNestTap(nest)"
              >
                <template v-if="nest.pet">
                  <view class="nest-toprow">
                    <text class="nest-no">窝{{ nest.id + 1 }}</text>
                    <text class="nest-coord mono">({{ nest.x }},{{ nest.y }})</text>
                  </view>
                  <RemoteImage class="nest-avatar" :src="nest.pet.icon || ''" mode="aspectFit" compact />
                  <view class="nest-badges">
                    <text class="sex-badge" :class="nest.gender">{{ nest.gender === 'M' ? '♂' : '♀' }}</text>
                    <text v-if="nest.pet.isShiny && nest.pet.isRadiant" class="trait-badge full">满</text>
                    <text v-else-if="nest.pet.isShiny" class="trait-badge shiny">异</text>
                    <text v-else-if="nest.pet.isRadiant" class="trait-badge radiant">炫</text>
                  </view>
                  <view class="connect-hint" :class="{ on: nest.connectionCount > 0 }">
                    <text v-if="nest.connectionCount > 0">{{ nest.connectionCount }} 通道</text>
                    <text v-else>孤窝·无配对</text>
                  </view>
                </template>
                <view v-else class="nest-empty">
                  <AppIcon name="plus" :size="15" color="#B9AC8E" />
                </view>
              </view>
            </view>
          </scroll-view>

          <!-- 图例 -->
          <view class="board-legend">
            <view class="lg-item"><view class="lg-chip g-M"></view><text>公窝</text></view>
            <view class="lg-item"><view class="lg-chip g-F"></view><text>母窝</text></view>
            <view class="lg-item"><view class="lg-line"></view><text>可孵化配对</text></view>
            <view class="lg-item"><view class="lg-chip target"></view><text>想生目标</text></view>
            <view class="lg-item"><view class="lg-chip dead"></view><text>孤窝</text></view>
          </view>
        </view>

        <!-- 方案体检与结论看板 -->
        <view v-if="currentPlan" class="section card">
          <view class="section-head">
            <view class="section-head-left">
              <view class="section-icon green">
                <AppIcon name="check" :size="11" color="#FFF9EC" />
              </view>
              <text class="section-title">方案体检与结论</text>
            </view>
          </view>

          <!-- 战后体检 -->
          <view v-for="(item, i) in planHealth" :key="i" class="health-banner" :class="item.level">
            <AppIcon :name="healthIcon(item.level)" :size="12" :color="healthColor(item.level)" />
            <text class="health-text">{{ item.text }}</text>
          </view>

          <view class="stat-capsules">
            <view class="cap">
              <text class="cap-num">{{ currentPlan.summary.newShinySpecies }}</text>
              <text class="cap-label">想生异色种</text>
            </view>
            <view class="cap">
              <text class="cap-num">{{ (currentPlan.summary.avgShinyRate * 100).toFixed(2) }}%</text>
              <text class="cap-label">平均异色率</text>
            </view>
            <view class="cap">
              <text class="cap-num">{{ (currentPlan.summary.avgRadiantRate * 100).toFixed(2) }}%</text>
              <text class="cap-label">平均炫彩率</text>
            </view>
            <view class="cap">
              <text class="cap-num">{{ currentPlan.summary.validPairs }}</text>
              <text class="cap-label">有效配对通道</text>
            </view>
          </view>

          <!-- 异色概率构成 -->
          <view class="prob-comp" v-if="currentPlan.summary.validPairs > 0">
            <view class="pc-title"><text>异色概率构成（本批配对一次孵化）</text></view>
            <view class="pc-chips">
              <view v-if="currentPlan.summary.hiddenOnlyPairs" class="pc-chip">
                <text class="pc-k">仅隐性</text>
                <text class="pc-v mono">{{ currentPlan.summary.hiddenOnlyPairs }} 对 × 1.00%</text>
              </view>
              <view v-if="currentPlan.summary.singleShinyPairs" class="pc-chip">
                <text class="pc-k">单亲异色</text>
                <text class="pc-v mono">{{ currentPlan.summary.singleShinyPairs }} 对 × 1.72%</text>
              </view>
              <view v-if="currentPlan.summary.doubleShinyPairs" class="pc-chip">
                <text class="pc-k">双亲异色</text>
                <text class="pc-v mono">{{ currentPlan.summary.doubleShinyPairs }} 对 × 2.44%</text>
              </view>
              <view class="pc-chip cum">
                <text class="pc-k">累计至少出一只异色</text>
                <text class="pc-v mono">≈ {{ (currentPlan.summary.cumulativeShinyChance * 100).toFixed(1) }}%</text>
              </view>
            </view>
          </view>

          <!-- 配对明细折叠面板 -->
          <view class="pair-head" hover-class="press-down" @click="showPairs = !showPairs">
            <text class="pair-head-text">配对明细清单（{{ currentPlan.pairs.length }} 对通道 · 按距离排序）</text>
            <AppIcon :name="showPairs ? 'chevron-up' : 'chevron-down'" :size="13" color="#8A7B5C" />
          </view>

          <view v-if="showPairs" class="pair-list">
            <view
              v-for="(pair, i) in sortedPairs"
              :key="i"
              class="pair-item"
              :class="{ picked: activePairKey === pair.maleNestId + '-' + pair.femaleNestId }"
              hover-class="press-down"
              @click="onPairTap(pair)"
            >
              <view class="pair-line">
                <text class="pair-nest male">窝{{ pair.maleNestId + 1 }}♂</text>
                <text class="pair-name">{{ pair.malePet.name }}</text>
                <text class="pair-mult">×</text>
                <text class="pair-nest female">窝{{ pair.femaleNestId + 1 }}♀</text>
                <text class="pair-name">{{ pair.femalePet.name }}</text>
                <text class="pair-dist mono">距离{{ pair.distance }}</text>
              </view>
              <view class="pair-sub">
                <text class="pair-coord mono">({{ pair.maleCoord.x }},{{ pair.maleCoord.y }}) ↔ ({{ pair.femaleCoord.x }},{{ pair.femaleCoord.y }})</text>
              </view>
              <view class="pair-sub">
                <text class="egg-group">{{ (pair.sharedGroups || []).join('/') }}组</text>
                <text class="pair-arrow">➔</text>
                <text class="pair-child">产【{{ pair.targetChild ? pair.targetChild.name : pair.femalePet.name }}蛋】</text>
                <text class="trait-badge shiny" v-if="pair.isNewUnlock">想生</text>
              </view>
              <view class="pair-prob">
                <text class="prob-item">异色率 {{ (pair.shinyChance * 100).toFixed(2) }}%</text>
                <text class="prob-item radiant" v-if="pair.radiantChance > 0">
                  炫彩率 {{ (pair.radiantChance * 100).toFixed(2) }}%
                </text>
                <text class="prob-item dim" v-else>双非炫彩 0%</text>
              </view>
            </view>
          </view>
        </view>

        <!-- 摆法明细表（照着摆） -->
        <view v-if="currentPlan" class="section card">
          <view class="section-head" hover-class="press-down" @click="showNestTable = !showNestTable">
            <view class="section-head-left">
              <view class="section-icon blue">
                <AppIcon name="crosshair" :size="11" color="#FFF9EC" />
              </view>
              <text class="section-title">摆法明细表（照着摆）</text>
            </view>
            <view class="section-head-right">
              <text class="inv-toggle-text">{{ showNestTable ? '收起' : '展开' }}</text>
              <AppIcon :name="showNestTable ? 'chevron-up' : 'chevron-down'" :size="13" color="#8A7B5C" />
            </view>
          </view>

          <view v-if="showNestTable" class="nest-table">
            <view class="nt-row nt-head">
              <view class="nt-c nt-no"><text>窝号</text></view>
              <view class="nt-c nt-pet"><text>精灵</text></view>
              <view class="nt-c nt-groups"><text>蛋组</text></view>
              <view class="nt-c nt-coord"><text>坐标</text></view>
              <view class="nt-c nt-role"><text>用途</text></view>
            </view>
            <view
              v-for="nest in currentPlan.nests"
              :key="nest.id"
              class="nt-row"
              :class="{
                'is-dead': nest.pet && nest.connectionCount === 0,
                'is-target': nest.pet && nest.gender === 'F' && nest.wishStatus === 'missing',
                picked: activeNestIds.indexOf(nest.id) !== -1,
              }"
              @click="onNestTap(nest)"
            >
              <view class="nt-c nt-no">
                <text class="sex-badge" :class="nest.gender">{{ nest.gender === 'M' ? '♂' : '♀' }}</text>
                <text class="nt-no-t">{{ nest.id + 1 }}</text>
              </view>
              <view class="nt-c nt-pet">
                <text class="nt-name" v-if="nest.pet">{{ nest.pet.name }}</text>
                <text class="nt-name dim" v-else>空窝</text>
                <text v-if="nest.pet && nest.pet.isShiny && nest.pet.isRadiant" class="trait-badge full">满</text>
                <text v-else-if="nest.pet && nest.pet.isShiny" class="trait-badge shiny">异</text>
                <text v-else-if="nest.pet && nest.pet.isRadiant" class="trait-badge radiant">炫</text>
              </view>
              <view class="nt-c nt-groups">
                <text v-for="grp in nestPetGroups(nest)" :key="grp" class="nt-group">{{ grp }}</text>
              </view>
              <text class="nt-c nt-coord mono">({{ nest.x }},{{ nest.y }})</text>
              <text class="nt-c nt-role">{{ nestRole(nest) }}</text>
            </view>
          </view>
        </view>

        <!-- 异色/炫彩库存与意愿面板（核心收敛至 32 种） -->
        <view class="section card">
          <view class="section-head" @click="showInventory = !showInventory">
            <view class="section-head-left">
              <view class="section-icon blue">
                <AppIcon name="users" :size="11" color="#FFF9EC" />
              </view>
              <text class="section-title">异色/炫彩库存与意愿（32物种）</text>
            </view>
            <view class="section-head-right">
              <text class="inv-toggle-text">{{ showInventory ? '收起' : '展开' }}</text>
              <AppIcon :name="showInventory ? 'chevron-up' : 'chevron-down'" :size="13" color="#8A7B5C" />
            </view>
          </view>

          <view v-if="showInventory" class="inv-body">
            <!-- 快捷批量操作 -->
            <view class="inv-quick-row">
              <view class="quick-btn" hover-class="press-down" @click="setAllWish('missing')">
                <text>全部想生</text>
              </view>
              <view class="quick-btn" hover-class="press-down" @click="setAllWish('owned')">
                <text>全部种鸽</text>
              </view>
              <view class="quick-btn" hover-class="press-down" @click="clearAllStock">
                <text>清空库存</text>
              </view>
            </view>

            <!-- 搜索与蛋组过滤 -->
            <view class="inv-filter-bar">
              <input
                v-model="searchKeyword"
                class="inv-search-input"
                placeholder="搜索精灵名 / 别名 / 蛋组"
                placeholder-class="input-placeholder"
              />
              <view v-if="searchKeyword" class="search-clear-btn" @click="searchKeyword = ''">
                <AppIcon name="close" :size="9" color="#8A6A2C" :stroke-width="2.8" />
              </view>
            </view>

            <!-- 12 蛋组胶囊筛选 -->
            <scroll-view scroll-x class="egg-filter-scroll" :show-scrollbar="false">
              <view class="egg-filter-row">
                <view
                  class="egg-tag"
                  :class="{ active: selectedGroup === '' }"
                  hover-class="press-down"
                  @click="selectedGroup = ''"
                >
                  <text>全部蛋组</text>
                </view>
                <view
                  v-for="grp in groupOrder"
                  :key="grp"
                  class="egg-tag"
                  :class="{ active: selectedGroup === grp }"
                  hover-class="press-down"
                  @click="selectedGroup = grp"
                >
                  <text>{{ grp }}</text>
                </view>
              </view>
            </scroll-view>

            <!-- 提示说明 -->
            <view class="inv-tip">
              <AppIcon name="info" :size="11" color="#1E7A46" />
              <text>填写你已有的异色/炫彩数量；标记为「想生」的物种将在摆窝中优先安排母位出蛋。</text>
            </view>

            <!-- 32 种物种列表行 -->
            <view class="inv-list">
              <view v-for="row in filteredSpecies" :key="row.name" class="inv-row">
                <view class="inv-pet">
                  <RemoteImage class="inv-avatar" :src="avatarSrc(row)" mode="aspectFit" compact />
                  <view class="inv-pet-info">
                    <text class="inv-name">{{ row.name }}</text>
                    <text v-if="row.aliasName" class="inv-alias">（{{ row.aliasName }}）</text>
                    <view class="inv-groups">
                      <text v-for="g in row.groups" :key="g" class="inv-group">{{ g }}</text>
                    </view>
                  </view>
                </view>

                <!-- 库存计数 (异色♂/♀, 炫彩♂/♀) -->
                <view class="inv-counts-grid">
                  <view class="cnt-box">
                    <text class="cnt-tag shiny">异♂</text>
                    <text class="cnt-val mono">{{ row.stock.shinyM }}</text>
                    <view class="cnt-btn-group">
                      <view class="cnt-btn" hover-class="press-down" @click="bumpStock(row, 'shinyM', 1)">+</view>
                      <view class="cnt-btn" hover-class="press-down" @click="bumpStock(row, 'shinyM', -1)">−</view>
                    </view>
                  </view>
                  <view class="cnt-box">
                    <text class="cnt-tag shiny">异♀</text>
                    <text class="cnt-val mono">{{ row.stock.shinyF }}</text>
                    <view class="cnt-btn-group">
                      <view class="cnt-btn" hover-class="press-down" @click="bumpStock(row, 'shinyF', 1)">+</view>
                      <view class="cnt-btn" hover-class="press-down" @click="bumpStock(row, 'shinyF', -1)">−</view>
                    </view>
                  </view>
                  <view class="cnt-box">
                    <text class="cnt-tag radiant">炫♂</text>
                    <text class="cnt-val mono">{{ row.stock.radiantM }}</text>
                    <view class="cnt-btn-group">
                      <view class="cnt-btn" hover-class="press-down" @click="bumpStock(row, 'radiantM', 1)">+</view>
                      <view class="cnt-btn" hover-class="press-down" @click="bumpStock(row, 'radiantM', -1)">−</view>
                    </view>
                  </view>
                  <view class="cnt-box">
                    <text class="cnt-tag radiant">炫♀</text>
                    <text class="cnt-val mono">{{ row.stock.radiantF }}</text>
                    <view class="cnt-btn-group">
                      <view class="cnt-btn" hover-class="press-down" @click="bumpStock(row, 'radiantF', 1)">+</view>
                      <view class="cnt-btn" hover-class="press-down" @click="bumpStock(row, 'radiantF', -1)">−</view>
                    </view>
                  </view>
                </view>

                <!-- 意愿状态选择 -->
                <view class="wish-pills">
                  <view
                    v-for="w in wishOptions"
                    :key="w.val"
                    class="wish-pill"
                    :class="[w.val, { active: row.wish === w.val }]"
                    hover-class="press-down"
                    @click="setWish(row, w.val)"
                  >
                    <text>{{ w.label }}</text>
                  </view>
                </view>
              </view>
            </view>
          </view>
        </view>

        <!-- 算法说明浮层 -->
        <view v-if="showCalcHelp" class="calc-help card">
          <view class="calc-help-t" @click="showCalcHelp = false">
            <text>摆窝算法核心逻辑</text>
            <AppIcon name="close" :size="12" color="#64748B" />
          </view>
          <text class="calc-help-p">
            1. <b>最大割公母划分</b>：通过拓扑分析，将公母窝间隔交错放置，以获得最多的相邻配对通道；<br />
            2. <b>想生母本优先</b>：子代物种严格随母本。标记为「想生」的异色物种优先安排进母窝；<br />
            3. <b>种公最大蛋组覆盖</b>：在公窝中安排能与周围最多母窝共享蛋组的精灵，并优先调度异色（+0.72%）与炫彩（+0.36%）个体；<br />
            4. <b>本地即时解算</b>：所有计算完全在手机本地完成，无需联网；<br />
            5. <b>摆法图解读</b>：金色连线=可孵化配对，红色虚线格=「想生」目标母本，灰色格=孤窝（无任何通道）；点窝或点配对可互相高亮；格内右上角坐标与配对清单里的「距离」（曼哈顿距离）用于在游戏内照着对位。
          </text>
        </view>
      </scroll-view>
    </view>

    <!-- ============ Tab 2: 官方遗传概率全览 ============ -->
    <view v-else class="rules-wrap">
      <scroll-view scroll-y class="planner-scroll" :show-scrollbar="false">
        <!-- 异色通道 -->
        <view class="section card">
          <view class="section-head">
            <view class="section-head-left">
              <view class="section-icon gold">
                <AppIcon name="sparkles" :size="11" color="#FFF9EC" />
              </view>
              <text class="section-title">异色遗传通道（基础保底 + 外显加成）</text>
            </view>
          </view>
          <view class="rule-hero shiny">
            <text class="rule-hero-title">异色产出概率公式</text>
            <text class="rule-hero-formula mono">1.00% + 父系外显0.72% + 母系外显0.72%</text>
            <view class="rule-hero-cases">
              <view class="case-chip"><text>双非异色</text><text class="v mono">1.00%</text></view>
              <view class="case-chip"><text>单亲异色</text><text class="v mono">1.72%</text></view>
              <view class="case-chip"><text>双亲异色</text><text class="v mono">2.44%</text></view>
            </view>
            <view class="rule-notes">
              <view class="note">
                <AppIcon name="check" :size="10" color="#1E7A46" />
                <text>1.00% 为<b>隐性保底通道</b>：即使双亲均为普通个体，依旧有 1% 几率生出异色蛋；</text>
              </view>
              <view class="note">
                <AppIcon name="check" :size="10" color="#1E7A46" />
                <text>亲代每有一只外显异色，概率增加 <b>+0.72%</b>。</text>
              </view>
            </view>
          </view>
        </view>

        <!-- 炫彩通道 -->
        <view class="section card">
          <view class="section-head">
            <view class="section-head-left">
              <view class="section-icon blue">
                <AppIcon name="star" :size="11" color="#FFF9EC" />
              </view>
              <text class="section-title">炫彩遗传通道（警示：无隐性通道）</text>
            </view>
          </view>
          <view class="rule-hero radiant">
            <text class="rule-hero-title">炫彩产出概率公式</text>
            <text class="rule-hero-formula mono">0% + 父系外显0.36% + 母系外显0.36%</text>
            <view class="rule-hero-cases">
              <view class="case-chip"><text>双非炫彩</text><text class="v zero mono">0%</text></view>
              <view class="case-chip"><text>单亲炫彩</text><text class="v mono">0.36%</text></view>
              <view class="case-chip"><text>双亲炫彩</text><text class="v mono">0.72%</text></view>
            </view>
            <view class="warn-banner">
              <AppIcon name="info" :size="13" color="#C64B38" />
              <text><b>绝对 0% 警告：</b>炫彩没有隐性通道！如果双亲都没有炫彩，生出炫彩概率必定为 0%，亲代必须至少有一只炫彩个体。</text>
            </view>
          </view>
        </view>

        <!-- 双满蛋 -->
        <view class="section card">
          <view class="section-head">
            <view class="section-head-left">
              <view class="section-icon red">
                <AppIcon name="zap" :size="11" color="#FFF9EC" />
              </view>
              <text class="section-title">双满极品蛋（异色 + 炫彩同时命中）</text>
            </view>
          </view>
          <view class="gen-table">
            <view class="gen-row">
              <text class="gen-label">双亲单满（单异 + 单炫）</text>
              <text class="gen-val mono">约 0.0062% (1/16129)</text>
            </view>
            <view class="gen-row">
              <text class="gen-label">双亲双满（双亲皆异+炫）</text>
              <text class="gen-val mono text-gold font-bold">约 0.0176% (1/5681)</text>
            </view>
          </view>
        </view>

        <!-- 血脉/性格/资质继承 -->
        <view class="section card">
          <view class="section-head">
            <view class="section-head-left">
              <view class="section-icon gold">
                <AppIcon name="info" :size="11" color="#FFF9EC" />
              </view>
              <text class="section-title">血脉、性格与资质继承规律</text>
            </view>
          </view>

          <view class="rule-notes tight">
            <view class="note">
              <AppIcon name="check" :size="10" color="#1E7A46" />
              <text><b>血脉继承：</b>子代 70% 几率继承亲代极品血脉（若亲代拥有）；</text>
            </view>
            <view class="note">
              <AppIcon name="check" :size="10" color="#1E7A46" />
              <text><b>性格遗传：</b>30% 锁父性格 + 30% 锁母性格 + 40% 完全随机；</text>
            </view>
            <view class="note">
              <AppIcon name="check" :size="10" color="#1E7A46" />
              <text><b>资质继承：</b>90% 继承亲代资质（其中 30% 触发 ± 浮动），10% 重新随机。</text>
            </view>
          </view>
        </view>
      </scroll-view>
    </view>
  </view>
</template>

<script>
import AppHeader from '@/components/AppHeader/AppHeader.vue'
import AppIcon from '@/components/AppIcon/AppIcon.vue'
import RemoteImage from '@/components/RemoteImage/RemoteImage.vue'
import {
  BREEDING_PROB_RULES,
  SHINY_SPECIES,
  GROUP_ORDER,
  PRESET_DEMO,
  solveShinyBreedingPlanAsync,
  solveShinyBreedingPlan,
} from '@/utils/breedingPlanner.js'

const STORAGE_KEY = 'roco_shiny_planner_state_v2'

const MODE_OPTIONS = [
  { value: 'variety', label: '优先多补图鉴' },
  { value: 'wanted', label: '优先蛋总数' },
  { value: 'probability', label: '优先高概率' },
]

const WISH_OPTIONS = [
  { val: 'missing', label: '想生' },
  { val: 'owned', label: '种鸽' },
  { val: 'ignore', label: '忽略' },
]

export default {
  name: 'BreedingPlanner',
  components: { AppHeader, AppIcon, RemoteImage },
  data() {
    return {
      BREEDING_PROB_RULES,
      groupOrder: GROUP_ORDER,
      activeTab: 'solver',
      modeOptions: MODE_OPTIONS,
      wishOptions: WISH_OPTIONS,

      // 参数
      nestCount: 10,
      maleCount: 4,
      mode: 'variety',

      // 求解状态
      solving: false,
      solveProgress: 0,
      solutions: [],
      activePlanIndex: 0,
      showPairs: false,
      showCalcHelp: false,
      showInventory: true,
      showNestTable: false,

      // 沙盘联动高亮
      activeNestId: null,
      activePairKey: '',
      screenWidth: 375,
      deepLinkTargetName: '',

      // 32 种物种行数据
      speciesRows: [],
      searchKeyword: '',
      selectedGroup: '',
    }
  },
  computed: {
    currentPlan() {
      return this.solutions[this.activePlanIndex] || null
    },
    filteredSpecies() {
      const kw = (this.searchKeyword || '').trim().toLowerCase()
      const grp = this.selectedGroup
      return this.speciesRows.filter((sp) => {
        if (grp && (!sp.groups || !sp.groups.includes(grp))) return false
        if (!kw) return true
        const matchName = sp.name.toLowerCase().includes(kw)
        const matchAlias = (sp.aliases || []).some((a) => a.toLowerCase().includes(kw))
        const matchGroup = (sp.groups || []).some((g) => g.toLowerCase().includes(kw))
        return matchName || matchAlias || matchGroup
      })
    },
    activeNestIds() {
      if (this.activeNestId != null) return [this.activeNestId]
      if (this.activePairKey && this.currentPlan) {
        const p = (this.currentPlan.pairs || []).find(
          (x) => x.maleNestId + '-' + x.femaleNestId === this.activePairKey
        )
        if (p) return [p.maleNestId, p.femaleNestId]
      }
      return []
    },
    boardMetrics() {
      const nests = this.currentPlan ? this.currentPlan.nests || [] : []
      const maxX = nests.length ? Math.max.apply(null, nests.map((n) => n.x || 0)) : 0
      const maxY = nests.length ? Math.max.apply(null, nests.map((n) => n.y || 0)) : 0
      const cols = Math.floor(maxX / 2) + 1
      const rows = Math.floor(maxY / 2) + 1
      const cellW = 84
      const cellH = 90
      const gapX = 24
      const gapY = 20
      const pad = 16
      return {
        cols,
        rows,
        cellW,
        cellH,
        gapX,
        gapY,
        pad,
        pitchX: cellW + gapX,
        pitchY: cellH + gapY,
        w: pad * 2 + cols * cellW + (cols - 1) * gapX,
        h: pad * 2 + rows * cellH + (rows - 1) * gapY,
      }
    },
    boardNests() {
      if (!this.currentPlan) return []
      const m = this.boardMetrics
      return (this.currentPlan.nests || []).map((nest) => {
        const col = Math.floor((nest.x || 0) / 2)
        const row = Math.floor((nest.y || 0) / 2)
        const px = m.pad + col * m.pitchX
        const py = m.pad + row * m.pitchY
        return Object.assign({}, nest, {
          px,
          py,
          pw: m.cellW,
          ph: m.cellH,
          cx: px + m.cellW / 2,
          cy: py + m.cellH / 2,
        })
      })
    },
    boardStyle() {
      const m = this.boardMetrics
      return {
        width: m.w + 'px',
        height: m.h + 'px',
        backgroundImage:
          'linear-gradient(#E8E0CB 1px, transparent 1px), linear-gradient(90deg, #E8E0CB 1px, transparent 1px)',
        backgroundSize: m.pitchX + 'px ' + m.pitchY + 'px',
        backgroundPosition: m.pad + 'px ' + m.pad + 'px',
      }
    },
    boardScrollable() {
      return this.boardMetrics.w > this.screenWidth - 28
    },
    pairLines() {
      if (!this.currentPlan) return []
      const byId = {}
      this.boardNests.forEach((n) => {
        byId[n.id] = n
      })
      const activeSet = this.activeNestIds
      return (this.currentPlan.pairs || [])
        .map((p) => {
          const m = byId[p.maleNestId]
          const f = byId[p.femaleNestId]
          if (!m || !f) return null
          const dx = f.cx - m.cx
          const dy = f.cy - m.cy
          const len = Math.round(Math.sqrt(dx * dx + dy * dy) * 10) / 10
          const angle = Math.round(((Math.atan2(dy, dx) * 180) / Math.PI) * 100) / 100
          const key = p.maleNestId + '-' + p.femaleNestId
          const hot =
            this.activePairKey === key ||
            activeSet.indexOf(p.maleNestId) !== -1 ||
            activeSet.indexOf(p.femaleNestId) !== -1
          return {
            key,
            x: m.cx,
            y: m.cy,
            len,
            angle,
            hot,
            dim: !hot && (activeSet.length > 0 || !!this.activePairKey),
          }
        })
        .filter(Boolean)
    },
    planHealth() {
      if (!this.currentPlan) return []
      const plan = this.currentPlan
      const pairs = plan.pairs || []
      const items = []
      const deadNests = (plan.nests || []).filter((n) => n.pet && n.connectionCount === 0)
      const hasShinyParent = pairs.some(
        (p) => (p.malePet && p.malePet.isShiny) || (p.femalePet && p.femalePet.isShiny)
      )
      if (!pairs.length) {
        items.push({
          level: 'error',
          text: '没有形成任何可孵化配对（疑似「生殖隔离」）：请检查公母库存的蛋组是否有交集，或调整公母配比',
        })
      }
      if (deadNests.length) {
        items.push({
          level: 'warn',
          text:
            '孤窝警告：' +
            deadNests.map((n) => '窝' + (n.id + 1) + '（' + n.pet.name + '）').join('、') +
            ' 没有任何配对通道，建议调整公母配比或目标偏好',
        })
      }
      if (pairs.length && !hasShinyParent) {
        items.push({
          level: 'warn',
          text: '当前方案没有任何外显异色参与配对，异色率全部走 1% 基础隐性通道；建议先攒一只异色种公/种母再摆窝',
        })
      }
      if (pairs.length && (plan.summary.newShinySpecies || 0) === 0) {
        items.push({
          level: 'info',
          text: '本方案未覆盖「想生」物种：可切换方案、调整目标偏好，或在库存面板把目标标记为「想生」',
        })
      }
      if (!items.length) {
        items.push({
          level: 'ok',
          text:
            '排布健康：' +
            plan.summary.validPairs +
            ' 条配对通道，预计覆盖 ' +
            plan.summary.newShinySpecies +
            ' 种想生异色',
        })
      }
      return items
    },
    sortedPairs() {
      if (!this.currentPlan) return []
      return (this.currentPlan.pairs || [])
        .slice()
        .sort((a, b) => (a.distance || 0) - (b.distance || 0) || a.femaleNestId - b.femaleNestId)
    },
    nestSuggest() {
      const m = Math.floor(this.nestCount / 2)
      return '建议 ' + m + '公' + (this.nestCount - m) + '母'
    },
  },
  watch: {
    nestCount(nv) {
      if (this.maleCount >= nv) this.maleCount = Math.max(1, Math.floor(nv / 2))
      else if (this.maleCount < 1) this.maleCount = 1
    },
  },
  onLoad(options) {
    this.initSpeciesRows()
    try {
      const info = uni.getSystemInfoSync()
      this.screenWidth = info.windowWidth || 375
    } catch (e) {
      this.screenWidth = 375
    }
    this.loadState()
    // egg.vue「直通繁育规划」带来的目标物种：自动标记为想生
    const targetPetId = options && Number(options.targetPetId) > 0 ? Number(options.targetPetId) : 0
    if (targetPetId) {
      const row = this.speciesRows.find((r) => r.petId === targetPetId)
      if (row) {
        row.wish = 'missing'
        this.deepLinkTargetName = row.name
        uni.showToast({ title: '已把「' + row.name + '」标记为想生', icon: 'none' })
      }
    }
    // 首次进入自动计算一次方案
    this.runPlan()
  },
  methods: {
    initSpeciesRows() {
      this.speciesRows = SHINY_SPECIES.map((sp) => ({
        index: sp.index,
        petId: sp.petId,
        name: sp.name,
        aliases: sp.aliases || [],
        aliasName: sp.aliases && sp.aliases.length ? sp.aliases[0] : '',
        groups: sp.groups || [],
        icon: sp.icon || '',
        glassName: sp.glassName || (sp.name + '蛋'),
        stock: {
          shinyM: 0,
          shinyF: 0,
          radiantM: 0,
          radiantF: 0,
        },
        wish: 'missing',
      }))
    },
    avatarSrc(pet) {
      return (pet && pet.icon) || ''
    },
    lineStyle(line) {
      return {
        left: line.x + 'px',
        top: line.y - 2 + 'px',
        width: line.len + 'px',
        transform: 'rotate(' + line.angle + 'deg)',
      }
    },
    onNestTap(nest) {
      this.activePairKey = ''
      this.activeNestId = this.activeNestId === nest.id ? null : nest.id
    },
    onPairTap(pair) {
      const key = pair.maleNestId + '-' + pair.femaleNestId
      this.activeNestId = null
      this.activePairKey = this.activePairKey === key ? '' : key
    },
    nestPetGroups(nest) {
      if (!nest.pet) return []
      return nest.pet.eggGroups || nest.pet.groups || []
    },
    nestRole(nest) {
      if (!nest.pet) return '空窝'
      if (nest.connectionCount === 0) return '孤窝·需调整'
      const conn = nest.connectionCount + ' 通道'
      if (nest.gender === 'M') return '桥接开边 · ' + conn
      return (nest.wishStatus === 'missing' ? '目标母本 · ' : '补位母本 · ') + conn
    },
    healthIcon(level) {
      if (level === 'error') return 'close'
      if (level === 'ok') return 'check'
      return 'info'
    },
    healthColor(level) {
      if (level === 'error') return '#C64B38'
      if (level === 'warn') return '#A97F35'
      if (level === 'info') return '#2C6FD1'
      return '#1E7A46'
    },
    setNestCount(delta) {
      const next = this.nestCount + delta
      this.nestCount = Math.max(6, Math.min(11, next))
    },
    bumpStock(row, key, delta) {
      row.stock[key] = Math.max(0, (row.stock[key] || 0) + delta)
      const hasAny = row.stock.shinyM > 0 || row.stock.shinyF > 0 || row.stock.radiantM > 0 || row.stock.radiantF > 0
      if (hasAny && row.wish === 'missing') {
        row.wish = 'owned'
      }
      this.saveState()
    },
    setWish(row, val) {
      row.wish = val
      this.saveState()
    },
    setAllWish(wishVal) {
      this.speciesRows.forEach((r) => {
        r.wish = wishVal
      })
      this.saveState()
      uni.showToast({ title: `已全部标记为「${wishVal === 'missing' ? '想生' : '种鸽'}」`, icon: 'none' })
    },
    clearAllStock() {
      this.speciesRows.forEach((r) => {
        r.stock.shinyM = 0
        r.stock.shinyF = 0
        r.stock.radiantM = 0
        r.stock.radiantF = 0
        r.wish = 'missing'
      })
      this.saveState()
      uni.showToast({ title: '已清空库存并重置为想生', icon: 'none' })
    },
    loadDemo() {
      this.clearAllStock()
      PRESET_DEMO.forEach((demoItem) => {
        const row = this.speciesRows.find((r) => r.name === demoItem.name)
        if (row) {
          row.stock.shinyM = demoItem.shinyM || 0
          row.stock.shinyF = demoItem.shinyF || 0
          row.stock.radiantM = demoItem.radiantM || 0
          row.stock.radiantF = demoItem.radiantF || 0
          row.wish = demoItem.wish || 'owned'
        }
      })
      this.saveState()
      uni.showToast({ title: '已载入演示库存', icon: 'none' })
      this.runPlan()
    },
    resetPlan() {
      this.nestCount = 10
      this.maleCount = 4
      this.mode = 'variety'
      this.clearAllStock()
      this.runPlan()
    },
    saveState() {
      try {
        const payload = {
          nestCount: this.nestCount,
          maleCount: this.maleCount,
          mode: this.mode,
          species: this.speciesRows.map((r) => ({
            name: r.name,
            stock: r.stock,
            wish: r.wish,
          })),
        }
        uni.setStorageSync(STORAGE_KEY, JSON.stringify(payload))
      } catch (e) {
        // 忽略存储异常
      }
    },
    loadState() {
      try {
        const raw = uni.getStorageSync(STORAGE_KEY)
        if (!raw) return
        const saved = JSON.parse(raw)
        if (saved.nestCount) this.nestCount = Math.max(6, Math.min(11, Number(saved.nestCount) || 10))
        if (saved.maleCount) this.maleCount = Number(saved.maleCount)
        if (saved.mode) this.mode = saved.mode
        if (Array.isArray(saved.species)) {
          saved.species.forEach((s) => {
            const row = this.speciesRows.find((r) => r.name === s.name)
            if (row) {
              row.stock = s.stock || row.stock
              row.wish = s.wish || row.wish
            }
          })
        }
      } catch (e) {
        // 忽略异常
      }
    },
    async runPlan() {
      this.solving = true
      this.solveProgress = 20

      const inventory = {}
      const wishes = {}
      this.speciesRows.forEach((r) => {
        inventory[r.petId] = { ...r.stock }
        inventory[r.name] = { ...r.stock }
        wishes[r.petId] = r.wish
        wishes[r.name] = r.wish
      })

      try {
        const res = await solveShinyBreedingPlanAsync(
          {
            nestCount: this.nestCount,
            maleCount: this.maleCount,
            mode: this.mode,
            inventory,
            wishes,
          },
          (p) => {
            this.solveProgress = Math.round(p * 100)
          }
        )

        this.solutions = res.solutions || []
        this.activePlanIndex = 0
        this.activeNestId = null
        this.activePairKey = ''
        this.solving = false
        this.saveState()
      } catch (e) {
        this.solving = false
        uni.showToast({ title: '计算失败，请稍后重试', icon: 'none' })
      }
    },
  },
}
</script>

<style scoped>
.planner-page {
  display: flex;
  flex-direction: column;
  height: 100vh;
  background: #FAF6EC;
  color: #2C3A2F;
}

.head-help-btn {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.2);
  display: flex;
  align-items: center;
  justify-content: center;
}

/* Tab 栏 */
.tab-bar {
  display: flex;
  background: #F2ECDC;
  border-bottom: 1px solid #E3DCC8;
  padding: 4px 16px;
  gap: 12px;
}
.tab-item {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 8px 0;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 700;
  color: #8A7B5C;
  transition: all 0.15s;
}
.tab-item.active {
  background: #FFFDF7;
  color: #1E7A46;
  box-shadow: 0 2px 4px rgba(44, 58, 47, 0.08);
  font-weight: 800;
}

/* 滚动区域 */
.solver-wrap, .rules-wrap {
  flex: 1;
  overflow: hidden;
}
.planner-scroll {
  height: 100%;
  box-sizing: border-box;
  padding: 10px 14px 40px;
}

/* 卡片容器 */
.card {
  background: #FFFDF7;
  border: 1.5px solid #E3DCC8;
  border-radius: 12px;
  box-shadow: 0 2px 0 rgba(44, 58, 47, 0.06);
  padding: 12px 14px;
  margin-bottom: 12px;
}

.section-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px;
}
.section-head-left {
  display: flex;
  align-items: center;
  gap: 6px;
}
.section-head-right {
  display: flex;
  align-items: center;
  gap: 4px;
}
.section-icon {
  width: 20px;
  height: 20px;
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
}
.section-icon.gold { background: #A97F35; }
.section-icon.green { background: #1E7A46; }
.section-icon.blue { background: #2C6FD1; }
.section-icon.red { background: #C64B38; }
.section-title {
  font-size: 13.5px;
  font-weight: 800;
  color: #2C3A2F;
}

/* 参数行 */
.param-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 10px;
}
.param-row.col {
  flex-direction: column;
  align-items: stretch;
  gap: 6px;
}
.row-between {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
}
.param-label {
  font-size: 12px;
  font-weight: 800;
  color: #2C3A2F;
}
.mute-hint {
  font-size: 10.5px;
  color: #8A7B5C;
}

.step-group {
  display: flex;
  gap: 6px;
}
.step-btn {
  width: 28px;
  height: 26px;
  border-radius: 6px;
  background: #F7F1E3;
  border: 1px solid #E3DCC8;
  display: flex;
  align-items: center;
  justify-content: center;
}
.step-btn-t {
  font-size: 15px;
  font-weight: 800;
  color: #64748B;
  line-height: 1;
}

.ratio-slider {
  margin: 4px 0 2px;
}

/* 目标偏好分段器 */
.seg-wrap {
  display: flex;
  background: #F2ECDC;
  border-radius: 8px;
  padding: 3px;
  gap: 4px;
}
.seg-item {
  flex: 1;
  text-align: center;
  padding: 6px 0;
  font-size: 11.5px;
  font-weight: 700;
  color: #7A725D;
  border-radius: 6px;
}
.seg-item.active {
  background: #1E7A46;
  color: #FFF9EC;
  font-weight: 800;
}

/* 按钮行 */
.action-row {
  display: flex;
  gap: 8px;
  margin-top: 12px;
}
.act-btn {
  flex: 1;
  height: 36px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  font-size: 12px;
  font-weight: 800;
}
.act-btn.primary {
  flex: 1.6;
  background: linear-gradient(135deg, #1E7A46, #2F9E5F);
  color: #FFF9EC;
  box-shadow: 0 2px 6px rgba(30, 122, 70, 0.25);
}
.act-btn.ghost {
  background: #F7F1E3;
  border: 1.5px solid #E3DCC8;
  color: #6B7A6E;
}

/* 求解中 banner */
.solving-banner {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  background: #FFF6DE;
  border: 1px solid #C9A14E;
  border-radius: 8px;
  padding: 8px;
  margin-bottom: 12px;
  font-size: 12px;
  font-weight: 800;
  color: #A97F35;
}
.spinner {
  width: 14px;
  height: 14px;
  border: 2px solid #C9A14E;
  border-top-color: transparent;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}
@keyframes spin {
  to { transform: rotate(360deg); }
}

/* 沙盘 Board */
.plan-switch {
  display: flex;
  gap: 4px;
}
.plan-pill {
  padding: 3px 8px;
  border-radius: 999px;
  font-size: 10px;
  font-weight: 700;
  background: #F7F1E3;
  color: #6B7A6E;
  border: 1px solid #E3DCC8;
}
.plan-pill.active {
  background: #1E7A46;
  color: #FFF9EC;
  border-color: #166235;
  font-weight: 800;
}

.board-hint {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 9.5px;
  color: #8A7B5C;
  font-weight: 600;
}
.board-scroll {
  width: 100%;
  white-space: nowrap;
}
.board {
  position: relative;
  display: inline-block;
  margin: 6px 0 0;
  background-color: #F5EEDB;
  border: 1.5px dashed #D5CEBA;
  border-radius: 10px;
  overflow: hidden;
}
/* 配对连线层：金色圆头连线，画在窝格下方 */
.pair-line-el {
  position: absolute;
  height: 4px;
  border-radius: 2px;
  background: #C9A14E;
  transform-origin: 0 50%;
  opacity: 0.72;
  z-index: 1;
}
.pair-line-el.hot {
  background: #A97F35;
  opacity: 1;
}
.pair-line-el.dim {
  opacity: 0.16;
}
.nest {
  position: absolute;
  z-index: 2;
  border-radius: 10px;
  border: 1.5px solid #E3DCC8;
  background: #FFFDF7;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  box-sizing: border-box;
  padding: 3px 4px;
  gap: 1px;
  overflow: hidden;
  box-shadow: 0 1.5px 0 rgba(44, 58, 47, 0.08);
  transition: all 0.2s;
}
.nest.g-M {
  border-color: #2C6FD1;
  background: #F2F7FF;
}
.nest.g-F {
  border-color: #E0604E;
  background: #FFF6F5;
}
.nest.target {
  border: 1.5px dashed #C64B38;
  background: #FDF0EC;
}
.nest.dead {
  border-color: #C9C2AE;
  background: #EFEADB;
  opacity: 0.72;
}
.nest.picked {
  box-shadow: 0 0 0 2.5px rgba(169, 127, 53, 0.5);
}
.nest.empty {
  opacity: 0.5;
}
.nest-toprow {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.nest-no {
  font-size: 8px;
  font-weight: 800;
  color: #FFF9EC;
  background: #8A988D;
  border-radius: 3px;
  padding: 0 3px;
  line-height: 1.5;
}
.nest.g-M .nest-no {
  background: #2C6FD1;
}
.nest.g-F .nest-no {
  background: #E0604E;
}
.nest-coord {
  font-size: 7.5px;
  font-weight: 700;
  color: #A3AE9F;
}
.nest-avatar {
  width: 46px;
  height: 46px;
  border-radius: 8px;
}
.nest-badges {
  display: flex;
  gap: 2px;
}
.sex-badge {
  font-size: 7.5px;
  font-weight: 800;
  padding: 0 2px;
  border-radius: 2px;
  line-height: 1.1;
}
.sex-badge.M { background: #2C6FD1; color: #fff; }
.sex-badge.F { background: #E0604E; color: #fff; }
.trait-badge {
  font-size: 7.5px;
  font-weight: 800;
  padding: 0 2px;
  border-radius: 2px;
  line-height: 1.1;
}
.trait-badge.shiny { background: #FBE9E4; color: #C64B38; border: 0.5px solid #E8A99E; }
.trait-badge.radiant { background: #FFF6DE; color: #A97F35; border: 0.5px solid #C9A14E; }
.trait-badge.full { background: #E7DBFB; color: #7B3FC4; border: 0.5px solid #C9A7F5; }
.connect-hint {
  font-size: 7.5px;
  font-weight: 700;
  color: #A3AE9F;
}
.connect-hint.on {
  color: #1E7A46;
  font-weight: 800;
}

/* 图例 */
.board-legend {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 8px;
  padding-top: 8px;
  border-top: 1px solid #EAE3D2;
}
.lg-item {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 9.5px;
  font-weight: 700;
  color: #6B7A6E;
}
.lg-chip {
  width: 14px;
  height: 10px;
  border-radius: 3px;
  border: 1.5px solid #E3DCC8;
  background: #FFFDF7;
}
.lg-chip.g-M { border-color: #2C6FD1; background: #F2F7FF; }
.lg-chip.g-F { border-color: #E0604E; background: #FFF6F5; }
.lg-chip.target { border: 1.5px dashed #C64B38; background: #FDF0EC; }
.lg-chip.dead { border-color: #C9C2AE; background: #EFEADB; }
.lg-line {
  width: 16px;
  height: 3px;
  border-radius: 2px;
  background: #C9A14E;
}

/* 统计胶囊 */
.stat-capsules {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 6px;
  margin-bottom: 10px;
}
.cap {
  background: #F7F1E3;
  border: 1px solid #E3DCC8;
  border-radius: 8px;
  padding: 6px 4px;
  text-align: center;
}
.cap-num {
  display: block;
  font-size: 14px;
  font-weight: 900;
  color: #1E7A46;
  font-family: Monaco, Consolas, monospace;
}
.cap-label {
  font-size: 8.5px;
  font-weight: 700;
  color: #6B7A6E;
}

/* 配对明细 */
.pair-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 6px 4px;
  border-top: 1px solid #EAE3D2;
}
.pair-head-text {
  font-size: 11.5px;
  font-weight: 800;
  color: #8A7B5C;
}
.pair-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-top: 6px;
}
.pair-item {
  background: #F7F1E3;
  border: 1px solid #E3DCC8;
  border-radius: 6px;
  padding: 6px 8px;
}
.pair-line {
  display: flex;
  align-items: center;
  gap: 4px;
}
.pair-nest {
  font-size: 9px;
  font-weight: 800;
  padding: 1px 4px;
  border-radius: 3px;
}
.pair-nest.male { background: #2C6FD1; color: #fff; }
.pair-nest.female { background: #E0604E; color: #fff; }
.pair-name {
  font-size: 11px;
  font-weight: 800;
  color: #2C3A2F;
}
.pair-mult {
  color: #A3AE9F;
  font-size: 10px;
}
.pair-sub {
  display: flex;
  align-items: center;
  gap: 4px;
  margin-top: 3px;
  font-size: 10px;
}
.egg-group {
  color: #6B7A6E;
  font-weight: 700;
}
.pair-arrow {
  color: #A97F35;
}
.pair-child {
  color: #1E7A46;
  font-weight: 800;
}
.pair-prob {
  display: flex;
  gap: 8px;
  margin-top: 3px;
  font-size: 9.5px;
  font-family: Monaco, Consolas, monospace;
}
.prob-item {
  color: #C64B38;
  font-weight: 800;
}
.prob-item.radiant {
  color: #A97F35;
}
.prob-item.dim {
  color: #A3AE9F;
}

/* 库存抽屉 */
.inv-toggle-text {
  font-size: 11px;
  color: #8A7B5C;
  font-weight: 700;
}
.inv-quick-row {
  display: flex;
  gap: 6px;
  margin-bottom: 8px;
}
.quick-btn {
  padding: 4px 8px;
  border-radius: 6px;
  background: #F7F1E3;
  border: 1px solid #E3DCC8;
  font-size: 10px;
  font-weight: 700;
  color: #6B7A6E;
}

.inv-filter-bar {
  position: relative;
  margin-bottom: 6px;
}
.inv-search-input {
  width: 100%;
  height: 28px;
  border-radius: 7px;
  border: 1.5px solid #E3DCC8;
  background: #F7F1E3;
  padding: 0 24px 0 8px;
  font-size: 11px;
  box-sizing: border-box;
  color: #2C3A2F;
}
.search-clear-btn {
  position: absolute;
  right: 6px;
  top: 50%;
  transform: translateY(-50%);
  width: 16px;
  height: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.egg-filter-scroll {
  white-space: nowrap;
  margin-bottom: 8px;
}
.egg-filter-row {
  display: inline-flex;
  gap: 4px;
}
.egg-tag {
  padding: 3px 8px;
  border-radius: 999px;
  background: #F2ECDC;
  border: 1px solid #E3DCC8;
  font-size: 9.5px;
  font-weight: 700;
  color: #7A725D;
}
.egg-tag.active {
  background: #1E7A46;
  border-color: #166235;
  color: #FFF9EC;
  font-weight: 800;
}

.inv-tip {
  display: flex;
  align-items: center;
  gap: 4px;
  background: #EFF7EF;
  border: 1px solid #BFDCC6;
  border-radius: 6px;
  padding: 5px 8px;
  margin-bottom: 8px;
  font-size: 9.5px;
  color: #1E7A46;
  line-height: 1.35;
}

.inv-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.inv-row {
  background: #FDFBF5;
  border: 1.5px solid #E8E2CF;
  border-radius: 8px;
  padding: 8px 10px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.inv-pet {
  display: flex;
  align-items: center;
  gap: 8px;
}
.inv-avatar {
  width: 28px;
  height: 28px;
  border-radius: 6px;
  background: #F7F1E3;
  border: 1px solid #E3DCC8;
  flex-shrink: 0;
}
.inv-pet-info {
  flex: 1;
  display: flex;
  align-items: baseline;
  flex-wrap: wrap;
  gap: 4px;
}
.inv-name {
  font-size: 12px;
  font-weight: 800;
  color: #2C3A2F;
}
.inv-alias {
  font-size: 9.5px;
  color: #8A7B5C;
}
.inv-groups {
  display: inline-flex;
  gap: 3px;
  margin-left: auto;
}
.inv-group {
  font-size: 8px;
  font-weight: 700;
  color: #A97F35;
  background: #FFF6DE;
  border: 0.5px solid #C9A14E;
  border-radius: 3px;
  padding: 0 4px;
}

.inv-counts-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 4px;
}
.cnt-box {
  display: flex;
  align-items: center;
  background: #F7F1E3;
  border: 1px solid #E3DCC8;
  border-radius: 6px;
  padding: 2px 4px;
  gap: 2px;
}
.cnt-tag {
  font-size: 7.5px;
  font-weight: 800;
  padding: 0 2px;
  border-radius: 2px;
  flex-shrink: 0;
}
.cnt-tag.shiny { background: #FBE9E4; color: #C64B38; }
.cnt-tag.radiant { background: #FFF6DE; color: #A97F35; }
.cnt-val {
  font-size: 11px;
  font-weight: 800;
  color: #2C3A2F;
  flex: 1;
  text-align: center;
}
.cnt-btn-group {
  display: flex;
  flex-direction: column;
  gap: 1px;
}
.cnt-btn {
  width: 13px;
  height: 10px;
  background: #EAE3D2;
  border-radius: 2px;
  font-size: 8px;
  font-weight: 800;
  color: #6B7A6E;
  display: flex;
  align-items: center;
  justify-content: center;
  line-height: 1;
}

.wish-pills {
  display: flex;
  gap: 6px;
}
.wish-pill {
  flex: 1;
  text-align: center;
  padding: 4px 0;
  border-radius: 5px;
  background: #F7F1E3;
  border: 1px solid #E3DCC8;
  font-size: 10px;
  font-weight: 700;
  color: #8A7B5C;
}
.wish-pill.missing.active {
  background: #C64B38;
  border-color: #A93826;
  color: #FFF9EC;
  font-weight: 800;
}
.wish-pill.owned.active {
  background: #1E7A46;
  border-color: #166235;
  color: #FFF9EC;
  font-weight: 800;
}
.wish-pill.ignore.active {
  background: #8A988D;
  border-color: #6B7A6E;
  color: #FFF9EC;
  font-weight: 800;
}

/* 官方规则 Tab 2 */
.rule-hero {
  border-radius: 8px;
  padding: 10px 12px;
}
.rule-hero.shiny {
  background: #FFFDF7;
  border: 1.5px solid #D9B96A;
}
.rule-hero.radiant {
  background: #F0F6FF;
  border: 1.5px solid #A6C4EE;
}
.rule-hero-title {
  font-size: 13px;
  font-weight: 800;
  color: #2C3A2F;
}
.rule-hero-formula {
  display: block;
  font-size: 12px;
  font-weight: 800;
  color: #1E7A46;
  margin: 4px 0 8px;
}
.rule-hero-cases {
  display: flex;
  gap: 8px;
  margin-bottom: 8px;
}
.case-chip {
  flex: 1;
  background: #F7F1E3;
  border: 1px solid #E3DCC8;
  border-radius: 6px;
  padding: 4px;
  text-align: center;
  font-size: 10px;
  color: #6B7A6E;
}
.case-chip .v {
  display: block;
  font-size: 13px;
  font-weight: 900;
  color: #C64B38;
  margin-top: 2px;
}
.case-chip .v.zero {
  color: #8A988D;
}
.warn-banner {
  display: flex;
  gap: 6px;
  background: #FBE9E4;
  border: 1px solid #E8A99E;
  border-radius: 6px;
  padding: 6px 8px;
  font-size: 10.5px;
  color: #C64B38;
  line-height: 1.4;
}
.rule-notes {
  display: flex;
  flex-direction: column;
  gap: 4px;
  margin-top: 8px;
}
.rule-notes.tight {
  margin-top: 4px;
}
.note {
  display: flex;
  align-items: baseline;
  gap: 5px;
  font-size: 11px;
  color: #6B7A6E;
  line-height: 1.4;
}

.gen-table {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.gen-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: #F7F1E3;
  border: 1px solid #E3DCC8;
  border-radius: 6px;
  padding: 6px 8px;
}
.gen-label {
  font-size: 11px;
  font-weight: 700;
  color: #2C3A2F;
}
.gen-val {
  font-size: 11px;
  color: #6B7A6E;
}

.calc-help-t {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 12px;
  font-weight: 800;
  color: #A97F35;
  margin-bottom: 6px;
}
.calc-help-p {
  font-size: 11px;
  color: #6B7A6E;
  line-height: 1.5;
}

/* 方案体检 banner */
.health-banner {
  display: flex;
  align-items: flex-start;
  gap: 6px;
  border-radius: 8px;
  padding: 7px 9px;
  margin-bottom: 8px;
  font-size: 10.5px;
  line-height: 1.45;
  font-weight: 600;
}
.health-banner.error {
  background: #FBE9E4;
  border: 1px solid #E8A99E;
  color: #A93826;
}
.health-banner.warn {
  background: #FFF6DE;
  border: 1px solid #E3C98A;
  color: #8A6A2C;
}
.health-banner.info {
  background: #EDF4FD;
  border: 1px solid #A6C4EE;
  color: #2C5FA8;
}
.health-banner.ok {
  background: #EFF7EF;
  border: 1px solid #BFDCC6;
  color: #1E7A46;
}
.health-text {
  flex: 1;
}

/* 异色概率构成 */
.prob-comp {
  margin: 2px 0 10px;
}
.pc-title {
  font-size: 10px;
  font-weight: 800;
  color: #8A7B5C;
  margin-bottom: 5px;
}
.pc-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 5px;
}
.pc-chip {
  display: flex;
  align-items: center;
  gap: 4px;
  background: #F7F1E3;
  border: 1px solid #E3DCC8;
  border-radius: 999px;
  padding: 3px 8px;
  font-size: 9.5px;
}
.pc-chip .pc-k {
  font-weight: 800;
  color: #6B7A6E;
}
.pc-chip .pc-v {
  font-weight: 800;
  color: #C64B38;
}
.pc-chip.cum {
  background: #FFF6DE;
  border-color: #C9A14E;
}
.pc-chip.cum .pc-k {
  color: #A97F35;
}
.pc-chip.cum .pc-v {
  color: #A97F35;
}

/* 配对明细增强 */
.pair-line {
  flex-wrap: wrap;
}
.pair-coord {
  font-size: 9px;
  color: #8A7B5C;
  font-weight: 700;
}
.pair-dist {
  margin-left: auto;
  font-size: 9px;
  font-weight: 800;
  color: #A97F35;
  background: #FFF6DE;
  border: 0.5px solid #C9A14E;
  border-radius: 3px;
  padding: 0 5px;
}
.pair-item.picked {
  border-color: #C9A14E;
  background: #FFFBEE;
}

/* 摆法明细表 */
.nest-table {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.nt-row {
  display: flex;
  align-items: center;
  gap: 6px;
  background: #FDFBF5;
  border: 1px solid #E8E2CF;
  border-radius: 7px;
  padding: 5px 8px;
}
.nt-row.nt-head {
  background: #F2ECDC;
  border-color: #E3DCC8;
}
.nt-head .nt-c {
  font-size: 9px;
  font-weight: 800;
  color: #8A7B5C;
}
.nt-row.picked {
  border-color: #C9A14E;
  background: #FFFBEE;
}
.nt-row.is-target {
  border-color: #E8A99E;
  background: #FDF4F0;
}
.nt-row.is-dead {
  opacity: 0.62;
}
.nt-c.nt-no {
  width: 36px;
  display: flex;
  align-items: center;
  gap: 3px;
  flex-shrink: 0;
}
.nt-no-t {
  font-size: 10px;
  font-weight: 800;
  color: #2C3A2F;
}
.nt-c.nt-pet {
  flex: 1.3;
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 4px;
  min-width: 0;
}
.nt-name {
  font-size: 11px;
  font-weight: 800;
  color: #2C3A2F;
}
.nt-name.dim {
  color: #B9AC8E;
  font-weight: 700;
}
.nt-c.nt-groups {
  flex: 1.1;
  display: flex;
  flex-wrap: wrap;
  gap: 2px;
}
.nt-group {
  font-size: 8px;
  font-weight: 700;
  color: #A97F35;
  background: #FFF6DE;
  border: 0.5px solid #C9A14E;
  border-radius: 3px;
  padding: 0 3px;
}
.nt-c.nt-coord {
  width: 46px;
  font-size: 9.5px;
  color: #6B7A6E;
  text-align: center;
  flex-shrink: 0;
}
.nt-c.nt-role {
  width: 84px;
  font-size: 9px;
  font-weight: 700;
  color: #6B7A6E;
  text-align: right;
  flex-shrink: 0;
}

/* 等宽数字 */
.mono {
  font-family: Monaco, Consolas, monospace;
}
</style>