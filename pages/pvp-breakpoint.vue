<template>
  <view class="page">
    <AppHeader theme="red" title="伤害计算" subtitle="攻守对比 · 实时推演" leftAction="back">
      <template #right>
        <view class="header-actions">
          <!-- #ifdef APP-PLUS -->
          <view class="header-capsule float-capsule" hover-class="press-down" @click="openFloatWindow">
            <AppIcon name="window" :size="11" color="#FFFFFF" />
            <text class="header-capsule-text">悬浮窗</text>
          </view>
          <!-- #endif -->
          <view class="header-capsule" hover-class="press-down" @click="swapSides">
            <AppIcon name="swap" :size="11" color="#FFFFFF" />
            <text class="header-capsule-text">交换攻守</text>
          </view>
        </view>
      </template>
    </AppHeader>

    <scroll-view scroll-y class="content" :show-scrollbar="false">
      <!-- 对战卡：攻守两行 -->
      <view class="battle card">
        <view class="duel-row atk" hover-class="press-down" @click="openPetSelector('attack')">
          <view class="duel-seal atk"><text class="duel-seal-text">攻</text></view>
          <RemoteImage class="duel-art" :src="resolvePetImage(attackPet.img)" mode="aspectFit" />
          <view class="duel-info">
            <text class="duel-name">{{ attackPet.name || '未选择' }}</text>
            <view class="type-row">
              <TypeBadge v-for="type in attackTypes" :key="'atk-' + type" :label="type" :color="getTypeColor(type)" compact />
            </view>
          </view>
          <text class="duel-speed mono">{{ Math.round(Number(attackPanel.speed) || 0) }}</text>
          <view class="duel-btn" hover-class="press-down" @click.stop="openParamSetting('attack')"><text>配</text></view>
          <view class="duel-btn alt" hover-class="press-down" @click.stop="openPetSelector('attack')"><text>换</text></view>
        </view>
        <view class="duel-divider"><text class="duel-divider-text">VS</text></view>
        <view class="duel-result">
          <view class="hp-track">
            <view class="hp-base"></view>
            <view class="hp-fill" :style="{ width: stripPercent + '%' }"></view>
            <text class="hp-mark mono">伤害 {{ resultState.damage }} / 生命 {{ resultState.hp }} · 占比 {{ stripPercent }}%</text>
          </view>
          <view class="duel-result-row">
            <text class="duel-result-label">结果</text>
            <text class="duel-result-verdict" :class="resultState.damage >= resultState.hp ? 'kill' : 'live'">
              {{ resultState.damage >= resultState.hp ? '击杀' + (resultState.damage > resultState.hp ? '（溢出' + (resultState.damage - resultState.hp) + '）' : '') : '存活（差' + (resultState.hp - resultState.damage) + '）' }}
            </text>
            <text class="duel-result-note">{{ resultState.note }}</text>
          </view>
          <view v-if="resultState.starfall && resultState.starfall.triggered" class="sf-result-row">
            <text class="sf-result-label">星陨引爆</text>
            <text class="sf-result-value mono">+{{ resultState.starfall.damage }}（{{ resultState.starfall.stacks }}层 · 威力{{ resultState.starfall.power }} · 幻×{{ resultState.starfall.multLabel }}）</text>
          </view>
          <view v-else-if="resultState.starfall && resultState.starfall.blocked" class="sf-result-row dim">
            <text class="sf-result-label">星陨印记</text>
            <text class="sf-result-value">{{ resultState.starfall.note }}</text>
          </view>
          <view class="duel-order-row">
            <text class="duel-order-label">先后手</text>
            <text class="duel-order-value" :class="turnOrder.state">{{ turnOrder.text }}</text>
          </view>
        </view>
        <view class="duel-row def" hover-class="press-down" @click="openPetSelector('defense')">
          <view class="duel-seal def"><text class="duel-seal-text">守</text></view>
          <RemoteImage class="duel-art" :src="resolvePetImage(defensePet.img)" mode="aspectFit" />
          <view class="duel-info">
            <text class="duel-name">{{ defensePet.name || '未选择' }}</text>
            <view class="type-row">
              <TypeBadge v-for="type in defenseTypes" :key="'def-' + type" :label="type" :color="getTypeColor(type)" compact />
            </view>
          </view>
          <text class="duel-speed mono">{{ Math.round(Number(defensePanel.speed) || 0) }}</text>
          <view class="duel-btn" hover-class="press-down" @click.stop="openParamSetting('defense')"><text>配</text></view>
          <view class="duel-btn alt" hover-class="press-down" @click.stop="openPetSelector('defense')"><text>换</text></view>
        </view>
      </view>

      <!-- S4 环境速选：点击设为守方，再点换到攻方 -->
      <view v-if="s4MetaPets.length" class="meta-chips card">
        <view class="meta-chips-head">
          <text class="meta-chips-label">S4 环境速选</text>
          <text class="meta-chips-hint">点击设为守方 · 再点换到攻方</text>
        </view>
        <scroll-view scroll-x class="meta-chips-scroll" :show-scrollbar="false">
          <view class="meta-chips-row">
            <view v-for="m in s4MetaPets" :key="m.key" class="meta-chip" hover-class="press-down" @click="applyMetaPet(m)">
              <text class="meta-chip-name">{{ m.name }}</text>
              <text class="meta-chip-tag">{{ metaTagOf(m) }}</text>
            </view>
          </view>
        </scroll-view>
      </view>

      <!-- Tab 条 -->
      <view class="cond-tabs card">
        <view class="cond-tab" :class="{ active: condTab === 'skill' }" hover-class="press-down" @click="condTab = 'skill'">
          <text>技能</text>
        </view>
        <view class="cond-tab" :class="{ active: condTab === 'cond' }" hover-class="press-down" @click="condTab = 'cond'">
          <text>战场条件</text>
        </view>
      </view>

      <!-- 技能页 -->
      <view v-show="condTab === 'skill'" class="skill-block card">
        <view class="skill-info">
        <view class="skill-strip">
          <view v-if="quickSkillGroups.level.length" class="ss-group">
            <text class="ss-group-label">常用技能</text>
            <view class="ss-chip-row">
              <view
                v-for="skill in quickSkillGroups.level"
                :key="'l-' + skill.name"
                class="ss-chip"
                :class="{ active: selectedSkill.name === skill.name }"
                hover-class="press-down"
                @click="selectSkill(skill)"
              >
                <RemoteImage class="ss-icon" :src="resolvePetImage(skill.icon || getSkillIcon(skill.name))" mode="aspectFit" />
                <text class="ss-name">{{ skill.name }}</text>
                <text class="ss-power mono">{{ skill.autoCalculatedPower || skill.power || 0 }}</text>
              </view>
            </view>
          </view>
          <view v-if="quickSkillGroups.blood.length" class="ss-group">
            <text class="ss-group-label gold">血脉技能 · 限带1</text>
            <view class="ss-chip-row">
              <view
                v-for="skill in quickSkillGroups.blood"
                :key="'b-' + skill.name"
                class="ss-chip"
                :class="{ active: selectedSkill.name === skill.name }"
                hover-class="press-down"
                @click="selectSkill(skill)"
              >
                <RemoteImage class="ss-icon" :src="resolvePetImage(skill.icon || getSkillIcon(skill.name))" mode="aspectFit" />
                <text class="ss-name">{{ skill.name }}</text>
                <text class="ss-power mono">{{ skill.autoCalculatedPower || skill.power || 0 }}</text>
              </view>
            </view>
          </view>
          <view v-if="quickSkillGroups.stone.length" class="ss-group">
            <text class="ss-group-label">技能石</text>
            <view class="ss-chip-row">
              <view
                v-for="skill in quickSkillGroups.stone"
                :key="'s-' + skill.name"
                class="ss-chip"
                :class="{ active: selectedSkill.name === skill.name }"
                hover-class="press-down"
                @click="selectSkill(skill)"
              >
                <RemoteImage class="ss-icon" :src="resolvePetImage(skill.icon || getSkillIcon(skill.name))" mode="aspectFit" />
                <text class="ss-name">{{ skill.name }}</text>
                <text class="ss-power mono">{{ skill.autoCalculatedPower || skill.power || 0 }}</text>
              </view>
            </view>
          </view>
          <view class="ss-group">
            <text class="ss-group-label">更多</text>
            <view class="ss-chip-row">
              <view class="ss-chip ss-all" hover-class="press-down" @click="openSkillSelector">
                <AppIcon name="search" :size="11" color="#A97F35" />
                <text class="ss-name">技能库</text>
              </view>
            </view>
          </view>
        </view>
        <view class="skill-info">
          <view class="si-top">
            <RemoteImage class="si-icon" :src="selectedSkillIcon" mode="aspectFit" />
            <view class="si-main">
              <text class="si-name">{{ selectedSkill.name || '未选择技能' }}</text>
              <view class="si-badges">
                <text class="sl-chip">{{ selectedSkill.attr || '无' }}</text>
                <text class="sl-chip">{{ selectedSkill.displayType || selectedSkill.type || '-' }}</text>
                <text v-if="selectedSkill.baseHits > 1" class="sl-chip gold">{{ selectedSkill.baseHits }}连击</text>
              </view>
            </view>
            <view class="detail-btn" hover-class="press-down" @click="openSkillDetail(selectedSkill)">
              <AppIcon name="info" :size="9" color="#A97F35" />
              <text class="detail-btn-text">详情</text>
            </view>
          </view>
          <view class="si-bottom">
            <text class="si-power mono">威力{{ selectedSkill.power || 0 }}</text>
            <text class="si-power">能耗{{ selectedSkill.consume || 0 }}</text>
            <view class="power-row">
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
                <text class="auto-calc-text">面板重算</text>
              </view>
            </view>
          </view>
          <view v-if="dynamicPowerResolution" class="dyn-power">
            <view class="dyn-head">
              <text class="dyn-label">{{ dynamicPowerResolution.statLabel }}</text>
              <text class="dyn-diff mono">{{ dynamicPowerResolution.own }} − {{ dynamicPowerResolution.enemy }} = {{ dynamicPowerResolution.diff }}</text>
              <text class="dyn-tier">第{{ dynamicPowerResolution.tierIndex + 1 }}档 · 威力 {{ dynamicPowerResolution.power }}（基础{{ dynamicPowerResolution.rule.base }}+{{ dynamicPowerResolution.bonus }}）</text>
            </view>
            <view class="dyn-tiers">
              <view v-for="(tier, i) in dynamicPowerResolution.rule.tiers" :key="'dt-' + i" class="dyn-tier-cell" :class="{ active: i === dynamicPowerResolution.tierIndex }">
                <text class="dyn-tier-range">{{ tierRangeText(tier) }}</text>
                <text class="dyn-tier-power mono">{{ dynamicPowerResolution.rule.base + tier.bonus }}</text>
              </view>
            </view>
            <text class="dyn-note">已自动按双方面板差查档填入计算威力（含克制/本系，可手动覆盖）；对局内以含 buff 的实时面板判定档位。分档来源：BWIKI S4 · roco-cal。</text>
          </view>
        </view>
        <text v-if="selectedSkill.isDynamic && !dynamicPowerResolution" class="skill-warn">⚠ 该技能威力随战斗状态变化，请手动调整计算威力（初始值含：{{ selectedSkill.calculationNote || '无加成' }}）</text>
        <text v-else class="skill-note">计算威力已含：{{ selectedSkill.calculationNote || '无属性加成' }}；手动填写时直接填乘完克制与本系的最终威力</text>
      </view>
      </view>

      <view v-show="condTab === 'cond'" class="cond-block card">
        <view class="cond-grid">
          <view class="cond-item">
            <text class="cond-label">增伤</text>
            <input
              v-model="damageBuff"
              class="cond-input"
              type="number"
              @input="calculateDamage"
              @click.stop
              placeholder="0-990"
            />
            <text class="cond-unit">%</text>
          </view>
          <view class="cond-item">
            <text class="cond-label">减伤</text>
            <input
              v-model="damageMitigation"
              class="cond-input"
              type="number"
              @input="calculateDamage"
              @click.stop
              placeholder="0-100"
            />
            <text class="cond-unit">%</text>
          </view>
        </view>
        <!-- 星陨印记（S4）：守方层数 → 非幻系攻击引爆附加幻伤 -->
        <view class="starfall-card">
          <view class="sf-head">
            <text class="cond-label">星陨印记（守方）</text>
            <view class="sf-stepper">
              <view class="sf-btn" hover-class="press-down" @click="adjustStarfall(-1)"><text class="sf-btn-t">−</text></view>
              <input class="sf-input mono" type="number" :value="starfallStacks" @input="onStarfallInput" @click.stop />
              <view class="sf-btn" hover-class="press-down" @click="adjustStarfall(1)"><text class="sf-btn-t">+</text></view>
            </view>
          </view>
          <view class="sf-quick">
            <view
              v-for="n in starfallPresets"
              :key="'sfp-' + n.value"
              class="sf-quick-btn"
              :class="{ active: starfallStacks === n.value }"
              hover-class="press-down"
              @click="setStarfall(n.value)"
            >
              <text>{{ n.label }}</text>
            </view>
          </view>
          <text class="sf-note">非幻系技能攻击守方时引爆全部层数：附加威力 = 层数² + 24×层数 − 24，按幻系独立结算克制、不吃本系加成。层数参考：玳塔受击 +3/次、超维投射 +4、心灵洞悉翻倍；实战口径 10 层秒脆皮、15 层杀肉盾。公式：roco-cal 拟合 · 规则：BWIKI S4。</text>
        </view>
        <view v-if="wishBlock" class="wish-compact">
          <view class="wish-head-row">
            <text class="cond-label">愿力</text>
            <text class="wish-mini-note">威力80·应对后200·每场2次</text>
          </view>
          <view class="wish-icon-grid">
            <view
              v-for="opt in wishBlock.options"
              :key="opt.attr"
              class="wish-icon-cell"
              :class="{ active: wishAttr === opt.attr }"
              hover-class="press-down"
              @click="wishAttr = opt.attr"
            >
              <image class="wish-icon-img" :src="attrIconSrc(opt.attr)" mode="aspectFit" />
            </view>
          </view>
          <view class="wish-bottom-row">
            <view class="wish-respond" hover-class="touch-active" @click="wishRespond = !wishRespond">
              <text class="wish-respond-text">应对</text>
              <view class="wish-switch" :class="{ on: wishRespond }"><view class="wish-switch-dot"></view></view>
            </view>
            <text class="wish-damage-mini mono">{{ wishBlock.skillType }} · {{ wishBlock.power }}威力 · 伤害{{ wishBlock.damage }}（{{ wishBlock.percent }}% HP）</text>
          </view>
        </view>
      </view>

      <!-- S4 版本情报（2026-09-10 起的赛季环境，来源均 ≤2 个月内） -->
      <view class="s4-brief card">
        <view class="s4-brief-head" hover-class="press-down" @click="s4BriefOpen = !s4BriefOpen">
          <view class="s4-brief-left">
            <view class="s4-brief-icon"><AppIcon name="zap" :size="11" color="#FFF9EC" /></view>
            <text class="s4-brief-title">S4 版本情报（月涌狂想 · 09-10 起）</text>
          </view>
          <AppIcon :name="s4BriefOpen ? 'chevron-up' : 'chevron-down'" :size="13" color="#8A7B5C" />
        </view>
        <view v-if="s4BriefOpen" class="s4-brief-body">
          <view class="s4-item"><text class="s4-item-t">同速随机</text><text class="s4-item-d">09-10 版本起双方速度相同时改为随机顺序出手，旧「堆同速抢先手」打法失效。</text></view>
          <view class="s4-item"><text class="s4-item-t">09-10 平衡</text><text class="s4-item-d">削弱：音速犬 / 烈火守护 / 加油蟹 / 火羽 / 巨鼓象 / 教练；加强：布克棱岩 / 爵士鹿 / 独角兽 / 水蛇 / 缇塔 / 深蓝鲸 / 虫队。</text></view>
          <view class="s4-item"><text class="s4-item-t">主流体系</text><text class="s4-item-d">星陨队（玳塔核心，2 层印记≈斩杀线）、银月狼王（高幻抗高物攻，星陨/幻系克星）、布灵平衡队（榜一阵容）、抗幻队、虫队、雨天/雪天队、火队黑马流明坎德拉。</text></view>
          <view class="s4-item"><text class="s4-item-t">星陨博弈</text><text class="s4-item-d">印记无法被普通驱散，靠翅刃等技能驱散、拟寄生偷层；打星陨队优先高幻抗或带驱散位——「幻系越强，星陨越弱」。</text></view>
          <text class="s4-src">来源：BWIKI nrc 站 S4 数据（09-09 编辑）、B站赛季平衡解读与洛克时报 41.0/42.0（09-02 ~ 09-17）、官方 09-10 版本公告</text>
        </view>
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
            <text class="modal-title">{{ paramSideLabel }}配置</text>
          </view>
          <view class="modal-close" hover-class="press-down" @click="closeParamSetting">
            <AppIcon name="close" :size="9" color="#C64B38" :stroke-width="3" />
            <text class="modal-close-text">关闭</text>
          </view>
        </view>

        <scroll-view scroll-y class="modal-body-scroll">
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
          <text class="config-title">六维面板</text>
          <view class="stat-grid-config">
            <view v-for="item in paramStatBlocks" :key="'cfg-' + item.key" class="stat-item-compact stat-item-config" :class="item.theme">
              <view class="stat-meta-left">
                <text class="stat-label-mini">{{ item.label }}</text>
                <view v-if="item.mark" class="stat-mark-mini" :class="item.mark.class"></view>
              </view>
              <text class="stat-value-mini mono">{{ item.value }}</text>
            </view>
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
        </scroll-view>
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
            <view v-for="skill in filteredSkillOptions" :key="skill.name + '-' + skill.skill_type" class="skill-row-slot">
              <SkillRow
                :skill="skill"
                compact
                show-detail
                :active="selectedSkill.name === skill.name"
                @click="selectSkill(skill)"
                @detail="openSkillDetail(skill)"
              />
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
          <view v-if="detailSkill && Number(detailSkill.power) > 0" class="detail-row"><text class="detail-label">威力</text><text class="detail-value mono">{{ detailSkill.power }}</text></view>
          <view class="detail-row"><text class="detail-label">连击次数</text><text class="detail-value mono">{{ detailSkill.baseHits || 1 }}</text></view>
          <view class="detail-row"><text class="detail-label">技能来源</text><text class="detail-value">{{ detailSkillSource }}</text></view>
          <view class="detail-row detail-desc-row"><text class="detail-label">完整描述</text><text class="detail-value desc">{{ detailSkill.describe || '暂无描述' }}</text></view>
          <view class="detail-row detail-tags-row"><text class="detail-label">机制标签</text><view class="tag-wrap"><text v-for="tag in detailSkillTags" :key="tag" class="mini-tag">{{ tag }}</text></view></view>
          <view v-if="detailSkill.isDynamic" class="detail-dynamic-hint">
            <AppIcon name="block" :size="9" :color="dynRuleOf(detailSkill.name) ? '#1E7A46' : '#C64B38'" />
            <text class="detail-dynamic-text">{{ dynRuleHint(detailSkill.name) }}</text>
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
import { calculateDamageFull, calculateStarfallDamage, getDynamicPowerRule, resolveStatDiffTierPower, canActBeforeEnemy, getAttrMultiplier, normalizeAttr, normalizeBattleSkill, repairText } from '@/utils/pvpDamageEngine.js'
import metaTargetPetsRaw from '@/data/pvp/metaTargetPets.json'
import { resolveAssetPath } from '@/utils/asset-path.js'
import { buildSuggestedIvs } from '@/utils/buildSuggestedIvs.js'
import { buildOpponentFullConfig } from '@/utils/buildOpponentFullConfig.js'
import { analyzeWishOptions, estimateWishDamage } from '@/utils/wishPowerAdvisor.js'
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
      starfallStacks: 0,
      starfallPresets: [
        { value: 3, label: '3层' },
        { value: 6, label: '6层' },
        { value: 10, label: '10层' },
        { value: 15, label: '15层' },
        { value: 20, label: '20层' }
      ],
      s4BriefOpen: false,
      wishAttr: '',
      condTab: 'skill',
      stripOpen: false,
      wishRespond: false,
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
    paramStatBlocks() { return this.paramSide === 'attack' ? this.attackStatBlocks : this.defenseStatBlocks },
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
          // 标记技能类型，后续按物攻/魔攻高低过滤
          skill._isPhysical = (skill.displayType || skill.type) === '物攻'
          return {
            ...skill,
            autoCalculatedPower,
            calculationNote: noteParts.join(' × ')
          }
        })
        .filter((skill) => {
          // 物攻/魔攻面板差距过大时，隐藏不匹配类型的技能
          const atk = Math.round(Number(this.attackPanel?.attack) || 0)
          const matk = Math.round(Number(this.attackPanel?.mattack) || 0)
          if (!atk || !matk) return true
          if (atk === matk) return true // 双刀精灵全显示
          const isPhysical = (skill.displayType || skill.type) === '物攻'
          if (atk > matk && !isPhysical) return false // 物攻高，隐藏魔攻技能
          if (matk > atk && isPhysical) return false // 魔攻高，隐藏物攻技能
          return true
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
    // 技能分组：血脉限带1 / 常用等级技能 / 技能石；长尾走"技能库"弹窗
    quickSkillGroups() {
      const all = this.attackSkillOptions || []
      const attackTypes = this.attackTypes || []
      const isDragon = attackTypes.some((t) => t === '龙')
      // 所有来源统一过滤：威力 ≤ 60 的直接去掉（没人带）
      const usable = all.filter((skill) => (Number(skill.power) || 0) > 60)
      // 血脉：升龙咆哮仅龙系显示
      const blood = usable
        .filter((skill) => skill.sourceType === '血脉技能')
        .filter((skill) => {
          if (skill.name === '升龙咆哮' && !isDragon) return false
          return true
        })
        .sort((a, b) => (b.autoCalculatedPower || 0) - (a.autoCalculatedPower || 0))
      const bySource = (type) => usable
        .filter((skill) => skill.sourceType === type)
        .sort((a, b) => (b.autoCalculatedPower || 0) - (a.autoCalculatedPower || 0))
      return {
        // 技能石优先（不限数量且多为优质技能），展示更多
        stone: bySource('可学技能石').slice(0, 6),
        level: bySource('精灵技能').slice(0, 5),
        blood
      }
    },
    stripPercent() {
      const hp = Math.max(1, Math.round(Number(this.resultState.hp) || 0))
      const damage = Math.round(Number(this.resultState.damage) || 0)
      return Math.min(999, Math.round((damage / hp) * 100))
    },
    resultModeLabel() { return '伤害计算' },
    // 愿力冲击快捷计算：基于当前攻守双方，属性默认取推荐 Top1
    wishBlock() {
      const pet = this.attackPet
      if (!pet || !this.attackTypes.length) return null
      // 防守方面板必须有效（HP>0 且至少一项防御>0），否则跳过计算
      const defHp = Number(this.defensePanel?.hp) || 0
      const defDef = Math.max(Number(this.defensePanel?.defense) || 0, Number(this.defensePanel?.mdefense) || 0)
      if (defHp <= 0 || defDef <= 0) return null
      const options = analyzeWishOptions({ types: this.attackTypes }).slice(0, 6)
      if (!options.length) return null
      const attr = options.some((o) => o.attr === this.wishAttr) ? this.wishAttr : options[0].attr
      if (attr !== this.wishAttr) this.wishAttr = attr
      const estimate = estimateWishDamage({
        wishAttr: attr,
        respond: this.wishRespond,
        myPet: { types: this.attackTypes },
        myPanel: this.attackPanel,
        defender: { types: this.defenseTypes },
        defenderPanel: this.defensePanel
      })
      const hp = Math.max(1, Math.round(Number(this.defensePanel.hp) || 0))
      const damage = Math.max(1, Math.round(estimate.damage))
      return {
        options,
        damage,
        percent: Math.min(999, Math.round((damage / hp) * 100)),
        skillType: estimate.skillType,
        power: estimate.power,
        multLabel: estimate.attrMultiplier !== 1 ? Number(estimate.attrMultiplier.toFixed(2)) + 'x' : '1x'
      }
    },
    // 动态威力分档（鸣沙陷阱/闪击等）：按双方面板差自动查档（S4 现行分档表）
    dynamicPowerResolution() {
      const skill = this.selectedSkill
      if (!skill || !skill.name) return null
      const rule = getDynamicPowerRule(skill.name)
      if (!rule) return null
      const statKey = rule.stat
      const own = Math.round(Number(this.attackPanel[statKey]) || 0)
      const enemy = Math.round(Number(this.defensePanel[statKey]) || 0)
      const resolved = resolveStatDiffTierPower(rule, own - enemy)
      if (!resolved) return null
      const attrMultiplier = getAttrMultiplier(skill.attr, this.defenseTypes)
      const normalizedSkillAttr = normalizeAttr(skill.attr) || ''
      const sameTypeMultiplier = normalizedSkillAttr && this.attackTypes.includes(normalizedSkillAttr) ? 1.25 : 1.0
      return {
        rule,
        statKey,
        statLabel: rule.statLabel || '面板差',
        own,
        enemy,
        diff: resolved.diff,
        bonus: resolved.bonus,
        power: resolved.power,
        tierIndex: resolved.tierIndex,
        attrMultiplier,
        sameTypeMultiplier,
        effectivePower: Math.round(resolved.power * attrMultiplier * sameTypeMultiplier)
      }
    },
    // 先后手结论（S4：同速随机先后，2026-09-10 版本规则）
    turnOrder() {
      const res = canActBeforeEnemy({
        myPanel: this.attackPanel,
        enemyPanel: this.defensePanel,
        selectedSkill: this.selectedSkill || {},
        enemySelectedSkill: {}
      })
      if (res.result === true) return { text: '我方先手 · ' + res.reason, state: 'good' }
      if (res.result === false) return { text: '敌方先手 · ' + res.reason, state: 'bad' }
      return { text: res.reason, state: 'tie' }
    },
    // S4 环境热门（metaTargetPets 中带 S4 标签的宠物；S4热门优先，S4被削垫底）
    s4MetaPets() {
      const list = Array.isArray(metaTargetPetsRaw) ? metaTargetPetsRaw : []
      const rank = (entry) => {
        const tags = entry.targetTags.map(String)
        if (tags.some((tag) => tag.includes('S4热门'))) return 0
        if (tags.some((tag) => tag.includes('S4新宠'))) return 1
        if (tags.some((tag) => tag.includes('S4加强'))) return 2
        return 3
      }
      return list
        .filter((entry) => entry && entry.id && Array.isArray(entry.targetTags) && entry.targetTags.some((tag) => /S4/.test(String(tag))))
        .slice()
        .sort((a, b) => rank(a) - rank(b))
        .slice(0, 12)
    }
  },
  watch: {
    // 分档技能：面板/技能变化时自动重算威力填入（手动填的其他技能不受影响）
    dynamicPowerResolution(res) {
      if (res) {
        this.customSkillPower = res.effectivePower
        this.calculateDamage()
      }
    }
  },
  onLoad(options) {
    const routeId = Number(options && (options.id || options.petId) || 0)
    // 深链参数（2026-09-16）：报告页/热门目标卡跳转 ?attacker=seq&defender=seq 双预填
    const routeAttacker = Number(options && options.attacker || 0)
    const routeDefender = Number(options && options.defender || 0)
    const hasDeepLink = Boolean(routeAttacker || routeDefender)
    // 尝试恢复上次保存的状态
    const saved = loadPvpState()
    if (saved && !routeId && !hasDeepLink) {
      if (saved.attackPetId) this.attackSide.petId = saved.attackPetId
      if (saved.defensePetId) this.defenseSide.petId = saved.defensePetId
      if (saved.selectedSkillName) this.selectedSkillName = saved.selectedSkillName
      if (saved.damageBuff !== undefined) this.damageBuff = saved.damageBuff
      if (saved.damageMitigation !== undefined) this.damageMitigation = saved.damageMitigation
      if (saved.starfallStacks !== undefined) this.starfallStacks = Math.max(0, Math.min(99, Math.floor(Number(saved.starfallStacks)) || 0))
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
    if (hasDeepLink) {
      // 深链优先于 routeId 单参与本地恢复：显式指定攻守双方
      let atkMiss = false
      let defMiss = false
      if (routeAttacker) {
        const atk = this.petOptions.find((item) => Number(item.id) === routeAttacker)
        if (atk) this.attackSide.petId = atk.id
        else atkMiss = true
      }
      if (routeDefender) {
        const def = this.petOptions.find((item) => Number(item.id) === routeDefender)
        if (def) this.defenseSide.petId = def.id
        else defMiss = true
      }
      if (atkMiss || defMiss) {
        uni.showToast({ title: '链接里的精灵已下架，已用默认精灵代替', icon: 'none' })
      }
      if (routeAttacker && routeDefender && routeAttacker === routeDefender) {
        this.defenseSide.petId = this.petOptions.find((item) => item.id !== this.attackSide.petId)?.id || this.attackSide.petId
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
        damageMitigation: this.damageMitigation,
        starfallStacks: this.starfallStacks
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
        // 性格预设：无用户设置时，按种族值物攻/魔攻高低自动建议
        if (!side.natureUp || side.natureUp === '无') {
          const atk = Number(race.attack) || 0
          const matk = Number(race.mattack) || 0
          if (atk > matk) { side.natureUp = '物攻'; side.natureDown = '魔攻' }
          else if (matk > atk) { side.natureUp = '魔攻'; side.natureDown = '物攻' }
          else { side.natureUp = '物攻'; side.natureDown = '魔攻' } // 相等时默认物攻
        }
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
      // 分档技能直接用查档威力，避免先落基础值再闪变成档位值
      const res = this.dynamicPowerResolution
      this.customSkillPower = res ? res.effectivePower : Number(skill.autoCalculatedPower) || 0
      this.closeSkillSelector()
      this.calculateDamage()
      this.persistPvpState()
    },
    onCustomPowerInput(e) {
      const value = Number(e?.detail?.value || e?.target?.value || 0)
      this.customSkillPower = value
      this.calculateDamage()
    },
    adjustStarfall(delta) {
      this.starfallStacks = Math.max(0, Math.min(99, (Math.floor(Number(this.starfallStacks)) || 0) + delta))
      this.calculateDamage()
      this.persistPvpState()
    },
    onStarfallInput(e) {
      const value = Math.floor(Number(e && e.detail ? e.detail.value : 0) || 0)
      this.starfallStacks = Math.max(0, Math.min(99, Number.isFinite(value) ? value : 0))
      this.calculateDamage()
    },
    setStarfall(value) {
      this.starfallStacks = Math.max(0, Math.min(99, Math.floor(Number(value) || 0)))
      this.calculateDamage()
      this.persistPvpState()
    },
    tierRangeText(tier) {
      if (tier.min === null || tier.min === undefined) return '≤0'
      if (tier.max === null || tier.max === undefined) return '≥' + tier.min
      return tier.min + '~' + tier.max
    },
    dynRuleOf(name) { return getDynamicPowerRule(name) },
    dynRuleHint(name) {
      const rule = getDynamicPowerRule(name)
      if (!rule) return '该技能为动态威力技能，实际威力可能随战斗状态变化，请手动调整计算威力'
      const tiers = Array.isArray(rule.tiers) ? rule.tiers : []
      const maxBonus = tiers.length ? Number(tiers[tiers.length - 1].bonus) || 0 : 0
      return '该技能已支持 S4 分档自动计算：按' + rule.statLabel + '自动查档威力（' + rule.base + '~' + (Number(rule.base) + maxBonus) + '），选中后自动填入计算威力'
    },
    metaTagOf(entry) {
      const tags = Array.isArray(entry && entry.targetTags) ? entry.targetTags : []
      const s4Tag = tags.find((tag) => /S4/.test(String(tag)))
      return s4Tag || tags[0] || ''
    },
    applyMetaPet(entry) {
      const id = Number(entry && entry.id)
      if (!id) return
      const pet = this.petOptions.find((item) => Number(item.id) === id)
      if (!pet) {
        uni.showToast({ title: '图鉴中未找到该精灵', icon: 'none' })
        return
      }
      if (this.defenseSide.petId === pet.id) {
        this.attackSide.petId = pet.id
        this.applyPetConfig(this.attackSide)
        this.syncSelectedSkill()
        uni.showToast({ title: pet.name + ' 已设为攻方', icon: 'none' })
      } else {
        this.defenseSide.petId = pet.id
        this.applyPetConfig(this.defenseSide)
        uni.showToast({ title: pet.name + ' 已设为守方', icon: 'none' })
      }
      this.calculateDamage()
      this.persistPvpState()
    },
    autoCalcEffectivePower() {
      const skill = this.selectedSkill
      if (!skill) return
      const basePower = Number(skill.power) || 0
      if (!basePower) return
      // 分档技能（鸣沙陷阱/闪击）：面板重算 = 重新查档，而不是退回基础威力
      const res = this.dynamicPowerResolution
      if (res) {
        this.customSkillPower = res.effectivePower
      } else {
        const attrMultiplier = getAttrMultiplier(skill.attr, this.defenseTypes)
        const normalizedSkillAttr = normalizeAttr(skill.attr) || ''
        const sameTypeMultiplier = normalizedSkillAttr && this.attackTypes.includes(normalizedSkillAttr) ? 1.25 : 1.0
        this.customSkillPower = Math.round(basePower * attrMultiplier * sameTypeMultiplier)
      }
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

      // 星陨印记引爆（S4）：非幻系技能攻击持有者时，按层数附加独立结算的幻系伤害
      const starfall = calculateStarfallDamage({
        attackerPanel: this.attackPanel,
        defenderPanel: this.defensePanel,
        skillType: skill.type,
        skillAttr: skill.attr,
        stacks: this.starfallStacks,
        defenderAttrs: this.defenseTypes,
        powerBuff,
        defenseReduction: defenseReduction
      })
      const mainDamage = Math.max(1, Math.round(result.damage || 0))
      const starfallDamage = starfall.triggered ? Math.max(1, Math.round(starfall.damage || 0)) : 0
      const damage = mainDamage + starfallDamage
      const hp = Math.max(1, Math.round(Number(this.defensePanel.hp) || 0))
      const percent = Math.round((damage / hp) * 100)
      const diff = damage - hp
      const diffNote = diff >= 0 ? '溢出 ' + diff : '剩余 ' + Math.abs(diff)
      const hitsNote = hits > 1 ? `；单发 ${Math.max(1, Math.round(mainDamage / hits))} × ${hits} 连击` : ''
      const starfallState = {
        triggered: starfall.triggered,
        blocked: starfall.blocked,
        stacks: starfall.stacks,
        power: starfall.power,
        damage: starfallDamage,
        multLabel: Number((starfall.attrMultiplier || 1).toFixed(2)) + 'x',
        note: starfall.reason || ''
      }
      this.resultState = { value: damage + ' 伤害', subtitle: damage + ' / ' + hp + '，' + percent + '%', note: diffNote + hitsNote, damage, hp, starfall: starfallState }
    },
    syncSelectedSkill() {
      if (!this.attackSkillOptions.length) {
        this.selectedSkillName = ''
        this.customSkillPower = 0
        return
      }
      const matched = this.attackSkillOptions.find((skill) => skill.name === this.selectedSkillName)
      // 默认优先选择精灵技能（初始技能），避免自动选中血脉技能
      const chosen = matched || this.attackSkillOptions.find((s) => s.sourceType === '精灵技能') || this.attackSkillOptions[0]
      const skillChanged = !matched
      this.selectedSkillName = chosen.name
      if (skillChanged) {
        // 换了技能才重置威力：分档技能（鸣沙陷阱/闪击）用查档值，其余用「基础×克制×本系」
        const res = this.dynamicPowerResolution
        this.customSkillPower = res ? res.effectivePower : Number(chosen.autoCalculatedPower) || 0
      }
      // 同名技能保留用户手输威力（含切换守方场景），不再静默重置（提案 P1-4）
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
    attrIconSrc(attr) {
      const key = String(attr || '').replace('系', '')
      const map = {
        '火': 'fire', '水': 'water', '草': 'grass', '电': 'electric',
        '冰': 'ice', '虫': 'bug', '翼': 'flying', '地': 'ground',
        '萌': 'fairy', '武': 'fighting', '毒': 'poison', '龙': 'dragon',
        '幽': 'ghost', '恶': 'dark', '光': 'light', '普通': 'normal',
        '机械': 'steel', '幻': 'psychic'
      }
      const file = map[key]
      return file ? `/static/static-web/icons/${file}.webp` : ''
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

.header-actions {
  display: flex;
  align-items: center;
  gap: 6px;
}

.float-capsule {
  background: rgba(255, 255, 255, 0.18);
  border-color: rgba(255, 255, 255, 0.35);
}

/* ===== 攻守对战卡 ===== */
.battle {
  margin: 12px 14px 0;
  padding: 14px;
}

.battle.first-card {
  margin-top: 10px;
}

.battle-grid {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.side-card {
  min-width: 0;
  padding: 11px 12px;
  border-radius: 15px;
  display: flex;
  flex-direction: column;
  gap: 10px;
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
  gap: 5px;
  height: 28px;
  padding: 0 11px 0 9px;
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
  font-size: 11.5px;
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
  gap: 5px;
  height: 29px;
  padding: 0 11px 0 9px;
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
  font-size: 11px;
  font-weight: 700;
}

.attack-side .side-action-text {
  color: #1E7A46;
}

.defense-side .side-action-text {
  color: #2C6FD1;
}

.pet-name {
  font-size: 14px;
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
  gap: 6px;
}

.pet-art-row {
  display: flex;
  align-items: center;
  gap: 9px;
}

.pet-art {
  flex-shrink: 0;
  width: 70px;
  height: 70px;
  border-radius: 15px;
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
  width: 62px;
  height: 62px;
}

.side-params-link {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  height: 30px;
  padding: 0 12px;
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
  font-size: 12px;
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
  gap: 7px;
}

.stat-item-compact {
  min-height: 48px;
  padding: 7px 9px;
  border-radius: 12px;
  background: #FFFDF7;
  border: 1px solid;
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 4px;
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
  gap: 5px;
}

.stat-label-mini {
  font-size: 10.5px;
  font-weight: 700;
  color: #6B7A6E;
}

.stat-mark-mini {
  width: 7px;
  height: 7px;
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
  font-size: 15px;
  font-weight: 800;
  line-height: 1;
}

.vs-divider {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 0 8px;
}

.vs-line {
  flex: 1;
  height: 1.5px;
  background: #E3DCC8;
}

.vs-badge {
  flex-shrink: 0;
  padding: 5px 14px;
  border-radius: 999px;
  background: linear-gradient(135deg, #C64B38 0%, #E0604E 100%);
  border: 1.5px solid #9C3A2B;
  box-shadow: 0 2px 0 rgba(156, 58, 43, 0.4);
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
}

.vs-text {
  font-size: 13px;
  font-weight: 800;
  font-style: italic;
  color: #FFF5EC;
  letter-spacing: 0.04em;
}

.pet-row {
  margin-top: 2px;
  display: flex;
  align-items: center;
  gap: 11px;
}

.pet-row-info {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 9px;
}

.side-action,
.side-params-link {
  white-space: nowrap;
}

.pet-name {
  flex: 1;
  min-width: 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  text-align: left;
}

/* ===== 区块通用 ===== */
.skill-section,
.buff-section,
.result-section {
  margin: 12px 14px 0;
  padding: 14px;
}

.section-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}

.section-head-left {
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
}

.section-icon {
  flex-shrink: 0;
  width: 34px;
  height: 34px;
  border-radius: 11px;
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
  font-size: 15px;
  font-weight: 800;
  color: #2C3A2F;
}

.section-action {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  height: 30px;
  padding: 0 12px;
  border-radius: 999px;
  background: #FBF3DD;
  border: 1.5px solid #D9B96A;
  box-shadow: 0 2px 0 rgba(138, 106, 44, 0.25);
  transition: transform 0.12s ease;
}

.section-action-text {
  font-size: 12px;
  font-weight: 700;
  color: #8A6A2C;
}

/* ===== 技能卡 ===== */
.skill-card {
  margin-top: 11px;
  padding: 13px;
  border-radius: 16px;
  background: #FBF3DD;
  border: 1.5px solid #E6D5A8;
  display: flex;
  gap: 12px;
}

.skill-icon-frame {
  flex-shrink: 0;
  width: 58px;
  height: 58px;
  border-radius: 14px;
  background: #FFFDF7;
  border: 1.5px solid #D9B96A;
  box-shadow: 0 2px 0 rgba(138, 106, 44, 0.2);
  display: flex;
  align-items: center;
  justify-content: center;
}

.skill-icon {
  width: 48px;
  height: 48px;
}

.skill-main {
  flex: 1;
  min-width: 0;
}

.skill-main-head {
  display: flex;
  align-items: center;
  gap: 10px;
}

.skill-name {
  font-size: 15px;
  font-weight: 800;
  color: #2C3A2F;
}

.skill-chip-row {
  margin-top: 9px;
  display: flex;
  flex-wrap: wrap;
  gap: 7px;
}

.skill-chip {
  height: 24px;
  padding: 0 10px;
  border-radius: 999px;
  background: #FFFDF7;
  border: 1px solid #E3DCC8;
  display: inline-flex;
  align-items: center;
}

.skill-chip-text {
  font-size: 11px;
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
  margin-top: 11px;
  display: flex;
  align-items: center;
  gap: 10px;
}

.power-label {
  flex-shrink: 0;
  font-size: 12px;
  font-weight: 700;
  color: #6B7A6E;
}

.power-input {
  flex: 1;
  min-width: 0;
  height: 38px;
  padding: 0 12px;
  border-radius: 11px;
  background: #FFFDF7;
  border: 1.5px solid #D9B96A;
  font-size: 14px;
  font-weight: 800;
  color: #2C3A2F;
  font-family: Monaco, Consolas, 'Courier New', monospace;
}

.auto-calc-btn {
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
  gap: 5px;
  height: 38px;
  padding: 0 13px;
  border-radius: 11px;
  background: linear-gradient(135deg, #A97F35 0%, #C9A14E 100%);
  border: 1.5px solid #8A6A2C;
  box-shadow: 0 2px 0 rgba(138, 106, 44, 0.4);
  transition: transform 0.12s ease;
}

.auto-calc-text {
  font-size: 11.5px;
  font-weight: 700;
  color: #FFF9EC;
}

.power-note-box {
  margin-top: 11px;
  padding: 10px 12px;
  border-radius: 11px;
  background: #FFFDF7;
  border: 1px dashed #D9B96A;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.note-line {
  display: flex;
  align-items: flex-start;
  gap: 6px;
}

.note-text {
  flex: 1;
  font-size: 11px;
  color: #6B7A6E;
  line-height: 1.6;
}

.note-text.warn {
  color: #C64B38;
}

.dynamic-hint {
  margin-top: 9px;
  padding: 9px 11px;
  border-radius: 11px;
  background: #FBE9E4;
  border: 1px solid #E8A99E;
  display: flex;
  align-items: flex-start;
  gap: 6px;
}

.dynamic-hint-text {
  flex: 1;
  font-size: 11px;
  font-weight: 700;
  color: #C64B38;
  line-height: 1.6;
}

.skill-detail-row {
  margin-top: 11px;
  display: flex;
  align-items: flex-start;
  gap: 10px;
}

.skill-desc {
  flex: 1;
  min-width: 0;
  font-size: 11.5px;
  color: #6B7A6E;
  line-height: 1.6;
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
  overflow: hidden;
}

.detail-btn {
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
  gap: 4px;
  height: 26px;
  padding: 0 10px;
  border-radius: 999px;
  background: #FFFDF7;
  border: 1px solid #D9B96A;
  transition: transform 0.12s ease;
}

.detail-btn-text {
  font-size: 11px;
  font-weight: 700;
  color: #A97F35;
}

/* ===== 伤害修饰符 ===== */
.buff-grid {
  margin-top: 11px;
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
}

.buff-item {
  padding: 12px 13px;
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
  gap: 7px;
}

.buff-label {
  font-size: 12.5px;
  font-weight: 800;
  color: #2C3A2F;
}

.buff-input-wrap {
  margin-top: 9px;
  display: flex;
  align-items: center;
  gap: 8px;
}

.buff-input {
  flex: 1;
  min-width: 0;
  height: 40px;
  padding: 0 12px;
  border-radius: 10px;
  background: #F7F1E3;
  border: 1.5px solid #E3DCC8;
  font-size: 15px;
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
  font-size: 13px;
  font-weight: 800;
  color: #6B7A6E;
}

.buff-note {
  display: block;
  margin-top: 7px;
  font-size: 10.5px;
  color: #A3AE9F;
}

/* ===== 计算结果 ===== */
.result-mode {
  flex-shrink: 0;
  height: 24px;
  padding: 0 10px;
  border-radius: 999px;
  background: #FBE9E4;
  border: 1px solid #E8A99E;
  display: inline-flex;
  align-items: center;
  font-size: 11px;
  font-weight: 700;
  color: #C64B38;
}

.result-bar {
  margin-top: 11px;
  display: flex;
  align-items: baseline;
  gap: 10px;
  flex-wrap: wrap;
}

.result-value {
  font-size: 22px;
  font-weight: 800;
  color: #C64B38;
}

.result-subtitle {
  font-size: 13px;
  font-weight: 700;
  color: #2C6FD1;
}

.result-note {
  display: block;
  margin-top: 7px;
  font-size: 11.5px;
  color: #6B7A6E;
  line-height: 1.6;
}

/* ===== 模态框 ===== */
.modal-mask {
  position: fixed;
  left: 0;
  right: 0;
  top: 0;
  bottom: 0;
  z-index: 999;
  display: flex;
  align-items: flex-end;
  justify-content: center;
  overflow: hidden;
  background: rgba(44, 58, 47, 0.45);
  display: flex;
  align-items: flex-end;
  justify-content: center;
}

.modal-sheet {
  width: calc(100% - 8px);
  max-width: 632px;
  max-height: 86vh;
  background: #FAF6EC;
  border: 1.5px solid #E3DCC8;
  border-bottom: none;
  border-radius: 22px 22px 0 0;
  box-shadow: 0 -4px 0 rgba(44, 58, 47, 0.08);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  box-sizing: border-box;
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
  box-sizing: border-box;
  width: 100%;
  overflow-x: hidden;
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

/* 技能选择列表：SkillRow 通用组件单列 */
.skill-grid {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding-bottom: 12px;
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

.stat-grid-config {
  margin-top: 9px;
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 8px;
}

.stat-item-compact.stat-item-config {
  min-height: 52px;
  padding: 8px 10px;
  border-radius: 12px;
  gap: 5px;
}

.stat-item-config .stat-label-mini {
  font-size: 11px;
}

.stat-item-config .stat-value-mini {
  font-size: 16px;
}

/* ===== 愿力冲击快捷计算 ===== */
.wish-section {
  margin-top: 12px;
}

.wish-sub {
  font-size: 9.5px;
  color: #A3AE9F;
  font-weight: 700;
}

.wish-attr-row {
  margin-top: 10px;
  display: flex;
  gap: 5px;
  overflow-x: auto;
  padding-bottom: 2px;
}

.wish-attr-row::-webkit-scrollbar {
  display: none;
}

.wish-attr-chip {
  flex-shrink: 0;
  height: 24px;
  padding: 0 11px;
  border-radius: 999px;
  display: flex;
  align-items: center;
  font-size: 11px;
  font-weight: 700;
  color: #6B7A6E;
  background: #F7F1E3;
  border: 1.5px solid #E3DCC8;
}

.wish-attr-chip.active {
  color: #FFF9EC;
}

.wish-respond-row {
  margin-top: 9px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.wish-respond-label {
  font-size: 10.5px;
  color: #6B7A6E;
  font-weight: 700;
}

.wish-switch {
  flex-shrink: 0;
  width: 34px;
  height: 19px;
  border-radius: 999px;
  background: #E3DCC8;
  padding: 2px;
  box-sizing: border-box;
  transition: background 0.15s ease;
}

.wish-switch-dot {
  width: 15px;
  height: 15px;
  border-radius: 50%;
  background: #FFFDF7;
  box-shadow: 0 1px 2px rgba(44, 58, 47, 0.25);
  transition: transform 0.15s ease;
}

.wish-switch.on {
  background: #C64B38;
}

.wish-switch.on .wish-switch-dot {
  transform: translateX(15px);
}

.wish-result-row {
  margin-top: 10px;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 9px 11px;
  border-radius: 12px;
  background: #F7F1E3;
  border: 1px solid #E3DCC8;
}

.wish-damage {
  font-size: 22px;
  font-weight: 800;
  color: #C64B38;
}

.wish-meta {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.wish-meta-line {
  font-size: 10px;
  color: #6B7A6E;
  font-weight: 700;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
/* ===== 战况条 ===== */
.battle-strip {
  margin: 8px 14px 0;
  padding: 9px 11px;
  display: flex;
  align-items: center;
  gap: 10px;
}

.strip-pets {
  display: flex;
  align-items: center;
  gap: 6px;
  min-width: 0;
}

.strip-side {
  display: flex;
  align-items: center;
  gap: 5px;
  min-width: 0;
}

.strip-avatar {
  width: 30px;
  height: 30px;
  border-radius: 9px;
  background: #FFFDF7;
  border: 1px solid #E3DCC8;
  flex-shrink: 0;
}

.strip-name {
  font-size: 11px;
  font-weight: 800;
  color: #2C3A2F;
  max-width: 56px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.strip-swords {
  font-size: 12px;
  color: #C64B38;
  flex-shrink: 0;
}

.strip-result {
  margin-left: auto;
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
}

.strip-damage {
  font-size: 24px;
  font-weight: 800;
  color: #C64B38;
  line-height: 1;
}

.strip-meta {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 2px;
}

.strip-pct {
  font-size: 10px;
  font-weight: 800;
  color: #2C6FD1;
}

.strip-verdict {
  font-size: 9px;
  font-weight: 800;
  padding: 1px 6px;
  border-radius: 999px;
}

.strip-verdict.live {
  background: #E4F3EA;
  color: #1E7A46;
}

.strip-verdict.kill {
  background: #FBE3DC;
  color: #A02B1B;
}

.strip-detail {
  margin: 8px 14px 0;
  padding: 10px 11px;
}

.strip-detail-row {
  display: flex;
  gap: 10px;
  margin-top: 8px;
}

.strip-detail-text {
  font-size: 12px;
  font-weight: 700;
  color: #2C3A2F;
}

.strip-detail-note {
  display: block;
  margin-top: 5px;
  font-size: 10px;
  color: #A3AE9F;
}

/* ===== 对战卡（两行式） ===== */
.battle {
  margin: 8px 14px 0;
  padding: 9px 10px;
}

.duel-row {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 8px;
  border-radius: 12px;
}

.duel-row.atk {
  background: #EFF7EF;
  border: 1.5px solid #BFDCC6;
}

.duel-row.def {
  background: #EDF3FC;
  border: 1.5px solid #C4D8F2;
}

.duel-seal {
  flex-shrink: 0;
  width: 26px;
  height: 26px;
  border-radius: 9px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.duel-seal.atk {
  background: linear-gradient(135deg, #1E7A46, #2F9E5F);
}

.duel-seal.def {
  background: linear-gradient(135deg, #2C6FD1, #4F9CFF);
}

.duel-seal-text {
  font-size: 11px;
  font-weight: 800;
  color: #FFF9EC;
}

.duel-art {
  width: 40px;
  height: 40px;
  flex-shrink: 0;
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.6);
}

.duel-info {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.duel-name {
  font-size: 13px;
  font-weight: 800;
  color: #2C3A2F;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.duel-speed {
  flex-shrink: 0;
  font-size: 12px;
  font-weight: 800;
  color: #2C6FD1;
}

.duel-btn {
  flex-shrink: 0;
  width: 28px;
  height: 28px;
  border-radius: 9px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 10.5px;
  font-weight: 800;
  color: #6B7A6E;
  background: #FFFDF7;
  border: 1.5px solid #E3DCC8;
}

.duel-btn.alt {
  color: #FFF9EC;
  background: #1E7A46;
  border-color: #166235;
}

.duel-row.def .duel-btn.alt {
  background: #2C6FD1;
  border-color: #1E56A8;
}

.duel-divider {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 4px 0;
}

.duel-divider-text {
  font-size: 10px;
  font-weight: 800;
  font-style: italic;
  color: #C64B38;
  letter-spacing: 0.1em;
}

/* ===== Tab 条 ===== */
.cond-tabs {
  margin: 8px 14px 0;
  padding: 4px;
  display: flex;
  gap: 4px;
}

.cond-tab {
  flex: 1;
  height: 30px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  font-weight: 700;
  color: #6B7A6E;
  background: transparent;
}

.cond-tab.active {
  color: #FFF9EC;
  background: linear-gradient(135deg, #C64B38, #E0604E);
  box-shadow: 0 2px 0 rgba(156, 58, 43, 0.35);
}

/* ===== 技能页 ===== */
.skill-block {
  margin: 8px 14px 0;
  padding: 10px;
}

.skill-strip-x {
  white-space: nowrap;
  -webkit-overflow-scrolling: touch;
}

.ss-chip {
  display: inline-block;
  vertical-align: top;
  width: 54px;
  margin-right: 6px;
  padding: 5px 4px;
  border-radius: 11px;
  text-align: center;
  background: #F7F1E3;
  border: 1.5px solid #E3DCC8;
  box-sizing: border-box;
}

.ss-chip.active {
  background: #FFF6DE;
  border-color: #C9A14E;
  box-shadow: 0 2px 0 rgba(169, 127, 53, 0.3);
}

.ss-icon {
  width: 26px;
  height: 26px;
  border-radius: 7px;
}

.ss-name {
  max-width: 46px;
  font-size: 9px;
  font-weight: 700;
  color: #2C3A2F;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.skill-line {
  margin-top: 9px;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 9px;
  border-radius: 11px;
  background: #F7F1E3;
  border: 1px solid #E3DCC8;
}

.skill-line-icon {
  width: 30px;
  height: 30px;
  flex-shrink: 0;
  border-radius: 8px;
  background: #FFFDF7;
}

.skill-line-name {
  flex-shrink: 0;
  font-size: 12.5px;
  font-weight: 800;
  color: #2C3A2F;
  max-width: 88px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.skill-line-chips {
  flex: 1;
  min-width: 0;
  display: flex;
  gap: 4px;
  flex-wrap: wrap;
}

.sl-chip {
  height: 16px;
  padding: 0 6px;
  border-radius: 5px;
  display: inline-flex;
  align-items: center;
  font-size: 9px;
  font-weight: 700;
  color: #6B7A6E;
  background: #FFFDF7;
  border: 1px solid #E3DCC8;
  white-space: nowrap;
}

.sl-chip.gold {
  color: #8A6A2C;
  border-color: #D9B96A;
  background: #FBF3DD;
}

.power-row {
  margin-top: 9px;
  display: flex;
  align-items: center;
  gap: 7px;
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
  background: #F7F1E3;
  border: 1.5px solid #D9B96A;
  box-sizing: border-box;
  font-size: 13px;
  font-weight: 800;
  color: #2C3A2F;
}

.auto-calc-btn {
  flex-shrink: 0;
  height: 32px;
  padding: 0 12px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  background: linear-gradient(135deg, #A97F35, #C9A14E);
  border: 1.5px solid #8A6A2C;
}

.auto-calc-text {
  font-size: 11px;
  font-weight: 800;
  color: #FFF9EC;
}

.skill-note {
  display: block;
  margin-top: 7px;
  font-size: 9.5px;
  line-height: 1.5;
  color: #A3AE9F;
}

.skill-warn {
  display: block;
  margin-top: 7px;
  font-size: 9.5px;
  line-height: 1.5;
  color: #C64B38;
  font-weight: 700;
}

/* ===== 战场条件页 ===== */
.cond-block {
  margin: 8px 14px 0;
  padding: 11px;
}

.cond-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;
}

.cond-item {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 7px 9px;
  border-radius: 11px;
  background: #F7F1E3;
  border: 1px solid #E3DCC8;
}

.cond-label {
  flex-shrink: 0;
  font-size: 11px;
  font-weight: 700;
  color: #6B7A6E;
}

.cond-input {
  flex: 1;
  min-width: 0;
  width: 100%;
  height: 26px;
  border: none;
  background: transparent;
  font-size: 13px;
  font-weight: 800;
  color: #2C3A2F;
  outline: none;
}

.cond-unit {
  flex-shrink: 0;
  font-size: 10px;
  color: #A3AE9F;
  font-weight: 700;
}

.wish-compact {
  margin-top: 10px;
  padding-top: 9px;
  border-top: 1px dashed #E3DCC8;
}

.wish-head-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.wish-mini-note {
  font-size: 9px;
  color: #A3AE9F;
  font-weight: 600;
}

.wish-chips-x {
  margin-top: 7px;
  display: flex;
  gap: 5px;
}

.wish-attr-chip {
  flex-shrink: 0;
  height: 24px;
  padding: 0 11px;
  border-radius: 999px;
  display: flex;
  align-items: center;
  font-size: 11px;
  font-weight: 700;
  color: #6B7A6E;
  background: #F7F1E3;
  border: 1.5px solid #E3DCC8;
}

.wish-bottom-row {
  margin-top: 8px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.wish-respond {
  display: flex;
  align-items: center;
  gap: 5px;
}

.wish-respond-text {
  font-size: 10.5px;
  font-weight: 700;
  color: #6B7A6E;
}

.wish-switch {
  width: 32px;
  height: 18px;
  border-radius: 999px;
  background: #E3DCC8;
  padding: 2px;
  box-sizing: border-box;
  transition: background 0.15s ease;
}

.wish-switch-dot {
  width: 14px;
  height: 14px;
  border-radius: 50%;
  background: #FFFDF7;
  transition: transform 0.15s ease;
}

.wish-switch.on {
  background: #C64B38;
}

.wish-switch.on .wish-switch-dot {
  transform: translateX(14px);
}

.wish-damage-mini {
  font-size: 11px;
  font-weight: 800;
  color: #C64B38;
}

.ss-group {
  display: inline-block;
  vertical-align: top;
  margin-right: 14px;
}

.ss-group-label {
  display: block;
  margin-bottom: 4px;
  font-size: 9px;
  font-weight: 800;
  color: #A3AE9F;
  white-space: normal;
}

.ss-group-label.gold {
  color: #A97F35;
}

.ss-group-row {
  font-size: 0;
}

.ss-all {
  width: auto;
  min-width: 58px;
  height: 44px;
  justify-content: center;
  flex-direction: row;
  gap: 4px;
}

.skill-info {
  margin-top: 9px;
  padding: 9px 10px;
  border-radius: 11px;
  background: #F7F1E3;
  border: 1px solid #E3DCC8;
}

.si-top {
  display: flex;
  align-items: center;
  gap: 8px;
}

.si-icon {
  width: 34px;
  height: 34px;
  flex-shrink: 0;
  border-radius: 9px;
  background: #FFFDF7;
}

.si-main {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.si-name {
  font-size: 13px;
  font-weight: 800;
  color: #2C3A2F;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.si-badges {
  display: flex;
  gap: 4px;
  flex-wrap: wrap;
}

.si-bottom {
  margin-top: 8px;
  display: flex;
  align-items: center;
  gap: 9px;
  flex-wrap: wrap;
}

.si-power {
  font-size: 11px;
  font-weight: 800;
  color: #2C3A2F;
  background: #FFFDF7;
  border: 1px solid #E3DCC8;
  border-radius: 7px;
  padding: 3px 8px;
}

/* ===== 战况条补全 ===== */
.strip-top {
  display: flex;
  align-items: center;
  gap: 6px;
  min-width: 0;
}

.strip-right {
  margin-left: auto;
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
}

.hp-track {
  position: relative;
  margin-top: 8px;
  height: 18px;
  border-radius: 999px;
  overflow: hidden;
  border: 1px solid #D8E2EC;
}

.hp-base {
  position: absolute;
  inset: 0;
  background: linear-gradient(90deg, #4A90D9, #7FB0E0);
}

.hp-fill {
  position: absolute;
  top: 0;
  bottom: 0;
  left: 0;
  background: linear-gradient(90deg, #E0604E, #C64B38);
  border-radius: 999px;
  transition: width 0.2s ease;
}

.hp-mark {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 10px;
  font-weight: 800;
  color: #FFFFFF;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.35);
}

.strip-wish-row {
  margin-top: 7px;
  display: flex;
  align-items: center;
  gap: 6px;
}

.wish-icon-img {
  width: 16px;
  height: 16px;
  flex-shrink: 0;
}

.strip-wish-label {
  font-size: 10px;
  font-weight: 700;
  color: #6B7A6E;
}

.strip-wish-damage {
  font-size: 12px;
  font-weight: 800;
  color: #A97F35;
}

.strip-wish-pct {
  font-size: 10px;
  font-weight: 700;
  color: #A3AE9F;
  margin-left: auto;
}

/* ===== 技能区 ===== */
.skill-strip-x {
  white-space: nowrap;
  -webkit-overflow-scrolling: touch;
}

.ss-group {
  display: inline-block;
  vertical-align: top;
  margin-right: 14px;
}

.ss-group-label {
  display: block;
  margin-bottom: 4px;
  font-size: 9px;
  font-weight: 800;
  color: #A3AE9F;
  white-space: normal;
}

.ss-group-label.gold {
  color: #A97F35;
}

.ss-chip-row {
  font-size: 0;
}

.ss-chip {
  display: inline-block;
  vertical-align: top;
  width: 54px;
  margin-right: 6px;
  padding: 5px 4px;
  border-radius: 11px;
  text-align: center;
  background: #F7F1E3;
  border: 1.5px solid #E3DCC8;
  box-sizing: border-box;
}

.ss-chip.active {
  background: #FFF6DE;
  border-color: #C9A14E;
  box-shadow: 0 2px 0 rgba(169, 127, 53, 0.3);
}

.ss-icon {
  width: 26px;
  height: 26px;
  border-radius: 7px;
}

.ss-name {
  display: block;
  max-width: 46px;
  margin: 0 auto;
  font-size: 9px;
  font-weight: 700;
  color: #2C3A2F;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.ss-power {
  display: block;
  font-size: 8.5px;
  font-weight: 800;
  color: #A97F35;
}

.ss-all {
  width: auto;
  min-width: 58px;
  height: 44px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-direction: row;
  gap: 4px;
}

/* ===== Tab 条 ===== */
.cond-tabs {
  margin: 8px 14px 0;
  padding: 4px;
  display: flex;
  gap: 4px;
}

.cond-tab {
  flex: 1;
  height: 30px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  font-weight: 700;
  color: #6B7A6E;
}

.cond-tab.active {
  color: #FFF9EC;
  background: linear-gradient(135deg, #C64B38, #E0604E);
  box-shadow: 0 2px 0 rgba(156, 58, 43, 0.35);
}

/* ===== 条件页 ===== */
.cond-block {
  margin: 8px 14px 0;
  padding: 11px;
}

.cond-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;
}

.cond-item {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 7px 9px;
  border-radius: 11px;
  background: #F7F1E3;
  border: 1px solid #E3DCC8;
}

.cond-label {
  flex-shrink: 0;
  font-size: 11px;
  font-weight: 700;
  color: #6B7A6E;
}

.cond-input {
  flex: 1;
  min-width: 0;
  width: 100%;
  height: 26px;
  border: none;
  background: transparent;
  font-size: 13px;
  font-weight: 800;
  color: #2C3A2F;
  outline: none;
}

.cond-unit {
  flex-shrink: 0;
  font-size: 10px;
  color: #A3AE9F;
  font-weight: 700;
}

.wish-compact {
  margin-top: 10px;
  padding-top: 9px;
  border-top: 1px dashed #E3DCC8;
}

.wish-head-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.wish-mini-note {
  font-size: 9px;
  color: #A3AE9F;
  font-weight: 600;
}

.wish-chips-x {
  margin-top: 7px;
  white-space: nowrap;
  -webkit-overflow-scrolling: touch;
}

.wish-bottom-row {
  margin-top: 8px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.wish-respond {
  display: flex;
  align-items: center;
  gap: 5px;
}

.wish-respond-text {
  font-size: 10.5px;
  font-weight: 700;
  color: #6B7A6E;
}

.wish-switch {
  width: 32px;
  height: 18px;
  border-radius: 999px;
  background: #E3DCC8;
  padding: 2px;
  box-sizing: border-box;
  transition: background 0.15s ease;
}

.wish-switch-dot {
  width: 14px;
  height: 14px;
  border-radius: 50%;
  background: #FFFDF7;
  transition: transform 0.15s ease;
}

.wish-switch.on {
  background: #C64B38;
}

.wish-switch.on .wish-switch-dot {
  transform: translateX(14px);
}

.wish-damage-mini {
  font-size: 11px;
  font-weight: 800;
  color: #C64B38;
}

/* ===== 对战卡 ===== */
.battle {
  margin: 8px 14px 0;
  padding: 9px 10px;
}

.duel-row {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 8px;
  border-radius: 12px;
}

.duel-row.atk {
  background: #EFF7EF;
  border: 1.5px solid #BFDCC6;
}

.duel-row.def {
  background: #EDF3FC;
  border: 1.5px solid #C4D8F2;
}

.duel-seal {
  flex-shrink: 0;
  width: 26px;
  height: 26px;
  border-radius: 9px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.duel-seal.atk {
  background: linear-gradient(135deg, #1E7A46, #2F9E5F);
}

.duel-seal.def {
  background: linear-gradient(135deg, #2C6FD1, #4F9CFF);
}

.duel-seal-text {
  font-size: 11px;
  font-weight: 800;
  color: #FFF9EC;
}

.duel-art {
  width: 40px;
  height: 40px;
  flex-shrink: 0;
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.6);
}

.duel-info {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.duel-name {
  font-size: 13px;
  font-weight: 800;
  color: #2C3A2F;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.duel-speed {
  flex-shrink: 0;
  font-size: 12px;
  font-weight: 800;
  color: #2C6FD1;
}

.duel-btn {
  flex-shrink: 0;
  width: 28px;
  height: 28px;
  border-radius: 9px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 10.5px;
  font-weight: 800;
  color: #6B7A6E;
  background: #FFFDF7;
  border: 1.5px solid #E3DCC8;
}

.duel-btn.alt {
  color: #FFF9EC;
  background: #1E7A46;
  border-color: #166235;
}

.duel-row.def .duel-btn.alt {
  background: #2C6FD1;
  border-color: #1E56A8;
}

.duel-divider {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 4px 0;
}

.duel-divider-text {
  font-size: 10px;
  font-weight: 800;
  font-style: italic;
  color: #C64B38;
  letter-spacing: 0.1em;
}

/* ===== skill-info ===== */
.skill-info {
  margin-top: 9px;
  padding: 9px 10px;
  border-radius: 11px;
  background: #F7F1E3;
  border: 1px solid #E3DCC8;
}

.si-top {
  display: flex;
  align-items: center;
  gap: 8px;
}

.si-icon {
  width: 34px;
  height: 34px;
  flex-shrink: 0;
  border-radius: 9px;
  background: #FFFDF7;
}

.si-main {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.si-name {
  font-size: 13px;
  font-weight: 800;
  color: #2C3A2F;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.si-badges {
  display: flex;
  gap: 4px;
  flex-wrap: wrap;
}

.si-bottom {
  margin-top: 8px;
  display: flex;
  align-items: center;
  gap: 9px;
  flex-wrap: wrap;
}

.si-power {
  font-size: 11px;
  font-weight: 800;
  color: #2C3A2F;
  background: #FFFDF7;
  border: 1px solid #E3DCC8;
  border-radius: 7px;
  padding: 3px 8px;
}


/* ===== 对战卡内血条+结果 ===== */
.duel-result {
  padding: 8px 8px 4px;
}

.hp-track {
  position: relative;
  height: 20px;
  border-radius: 999px;
  overflow: hidden;
  border: 1px solid #D8E2EC;
}

.hp-base {
  position: absolute;
  inset: 0;
  background: linear-gradient(90deg, #4A90D9, #7FB0E0);
}

.hp-fill {
  position: absolute;
  top: 0;
  bottom: 0;
  left: 0;
  background: linear-gradient(90deg, #E0604E, #C64B38);
  border-radius: 999px;
  transition: width 0.25s ease;
}

.hp-mark {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 10.5px;
  font-weight: 800;
  color: #FFFFFF;
  text-shadow: 0 1px 3px rgba(0, 0, 0, 0.4);
}

.duel-result-row {
  margin-top: 7px;
  display: flex;
  align-items: center;
  gap: 8px;
}

.duel-result-label {
  flex-shrink: 0;
  font-size: 10px;
  font-weight: 700;
  color: #A3AE9F;
}

.duel-result-verdict {
  font-size: 12px;
  font-weight: 800;
}

.duel-result-verdict.live {
  color: #1E7A46;
}

.duel-result-verdict.kill {
  color: #C64B38;
}

.duel-result-note {
  flex: 1;
  min-width: 0;
  font-size: 10px;
  color: #A3AE9F;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* ===== 愿力 icon 网格 ===== */
.wish-icon-grid {
  margin-top: 7px;
  display: flex;
  flex-wrap: wrap;
  gap: 5px;
}

.wish-icon-cell {
  width: 36px;
  height: 36px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #F7F1E3;
  border: 1.5px solid #E3DCC8;
  cursor: pointer;
}

.wish-icon-cell.active {
  border-color: #1E7A46;
  background: #E4F3EA;
  box-shadow: 0 2px 0 rgba(30, 122, 70, 0.25);
}

.wish-icon-img {
  width: 22px;
  height: 22px;
}

.modal-body-scroll {
  max-height: 60vh;
  padding: 0 14px 12px;
}

/* ============ S4 改造：先后手 / 星陨 / 分档 / 速选 / 情报 ============ */

/* 先后手结论行 */
.duel-order-row {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-top: 4px;
}
.duel-order-label {
  font-size: 9.5px;
  font-weight: 800;
  color: #8A7B5C;
  flex-shrink: 0;
}
.duel-order-value {
  font-size: 10px;
  font-weight: 800;
}
.duel-order-value.good { color: #1E7A46; }
.duel-order-value.bad { color: #C64B38; }
.duel-order-value.tie { color: #A97F35; }

/* 星陨引爆结果行 */
.sf-result-row {
  display: flex;
  align-items: center;
  gap: 5px;
  margin-top: 4px;
  padding: 3px 8px;
  background: #F3EEFB;
  border: 1px solid #C9A7F5;
  border-radius: 6px;
}
.sf-result-row.dim {
  background: #F2ECDC;
  border-color: #E3DCC8;
  opacity: 0.85;
}
.sf-result-label {
  font-size: 9.5px;
  font-weight: 800;
  color: #7B3FC4;
  flex-shrink: 0;
}
.sf-result-value {
  font-size: 9.5px;
  font-weight: 700;
  color: #7B3FC4;
}
.sf-result-row.dim .sf-result-label,
.sf-result-row.dim .sf-result-value {
  color: #8A7B5C;
}

/* S4 环境速选 chips */
.meta-chips {
  padding: 8px 10px;
}
.meta-chips-head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  margin-bottom: 6px;
}
.meta-chips-label {
  font-size: 11.5px;
  font-weight: 800;
  color: #2C3A2F;
}
.meta-chips-hint {
  font-size: 9px;
  color: #A3AE9F;
}
.meta-chips-scroll {
  white-space: nowrap;
}
.meta-chips-row {
  display: inline-flex;
  gap: 6px;
}
.meta-chip {
  display: inline-flex;
  flex-direction: column;
  align-items: center;
  gap: 1px;
  padding: 4px 10px;
  background: #FFF6DE;
  border: 1px solid #C9A14E;
  border-radius: 999px;
}
.meta-chip-name {
  font-size: 10.5px;
  font-weight: 800;
  color: #8A6A2C;
}
.meta-chip-tag {
  font-size: 8px;
  font-weight: 700;
  color: #A97F35;
}

/* 动态威力分档展示 */
.dyn-power {
  margin-top: 6px;
  background: #F7F1E3;
  border: 1px solid #E3DCC8;
  border-radius: 8px;
  padding: 6px 8px;
}
.dyn-head {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 4px;
  margin-bottom: 5px;
}
.dyn-label {
  font-size: 10px;
  font-weight: 800;
  color: #2C3A2F;
}
.dyn-diff {
  font-size: 10px;
  font-weight: 800;
  color: #2C6FD1;
}
.dyn-tier {
  font-size: 9.5px;
  font-weight: 800;
  color: #1E7A46;
}
.dyn-tiers {
  display: flex;
  flex-wrap: wrap;
  gap: 3px;
}
.dyn-tier-cell {
  display: flex;
  flex-direction: column;
  align-items: center;
  min-width: 40px;
  padding: 2px 4px;
  background: #FFFDF7;
  border: 1px solid #E3DCC8;
  border-radius: 5px;
}
.dyn-tier-cell.active {
  background: #1E7A46;
  border-color: #166235;
}
.dyn-tier-cell.active .dyn-tier-range,
.dyn-tier-cell.active .dyn-tier-power {
  color: #FFF9EC;
}
.dyn-tier-range {
  font-size: 7.5px;
  font-weight: 700;
  color: #A3AE9F;
}
.dyn-tier-power {
  font-size: 9.5px;
  font-weight: 800;
  color: #2C3A2F;
}
.dyn-note {
  display: block;
  margin-top: 5px;
  font-size: 8.5px;
  color: #8A7B5C;
  line-height: 1.4;
}

/* 星陨印记输入卡 */
.starfall-card {
  margin-top: 10px;
  padding-top: 10px;
  border-top: 1px solid #EAE3D2;
}
.sf-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 6px;
}
.sf-stepper {
  display: flex;
  align-items: center;
  gap: 5px;
}
.sf-btn {
  width: 26px;
  height: 24px;
  border-radius: 6px;
  background: #F7F1E3;
  border: 1px solid #E3DCC8;
  display: flex;
  align-items: center;
  justify-content: center;
}
.sf-btn-t {
  font-size: 14px;
  font-weight: 800;
  color: #64748B;
  line-height: 1;
}
.sf-input {
  width: 44px;
  height: 24px;
  border-radius: 6px;
  border: 1.5px solid #E3DCC8;
  background: #FFFDF7;
  text-align: center;
  font-size: 12px;
  font-weight: 800;
  color: #7B3FC4;
}
.sf-quick {
  display: flex;
  flex-wrap: wrap;
  gap: 5px;
  margin-bottom: 6px;
}
.sf-quick-btn {
  padding: 3px 9px;
  border-radius: 999px;
  background: #F7F1E3;
  border: 1px solid #E3DCC8;
  font-size: 9.5px;
  font-weight: 700;
  color: #6B7A6E;
}
.sf-quick-btn.active {
  background: #7B3FC4;
  border-color: #5F2F99;
}
.sf-quick-btn.active text {
  color: #FFF9EC;
  font-weight: 800;
}
.sf-note {
  display: block;
  font-size: 8.5px;
  color: #8A7B5C;
  line-height: 1.5;
}

/* S4 版本情报卡 */
.s4-brief {
  padding: 10px 12px;
}
.s4-brief-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.s4-brief-left {
  display: flex;
  align-items: center;
  gap: 6px;
}
.s4-brief-icon {
  width: 20px;
  height: 20px;
  border-radius: 6px;
  background: #C64B38;
  display: flex;
  align-items: center;
  justify-content: center;
}
.s4-brief-title {
  font-size: 12px;
  font-weight: 800;
  color: #2C3A2F;
}
.s4-brief-body {
  margin-top: 8px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.s4-item {
  display: flex;
  gap: 6px;
}
.s4-item-t {
  flex-shrink: 0;
  font-size: 10px;
  font-weight: 800;
  color: #C64B38;
}
.s4-item-d {
  flex: 1;
  font-size: 10px;
  color: #6B7A6E;
  line-height: 1.5;
}
.s4-src {
  display: block;
  font-size: 8.5px;
  color: #A3AE9F;
  line-height: 1.4;
  border-top: 1px solid #EAE3D2;
  padding-top: 6px;
}
</style>
