/**
 * 实时伤害悬浮窗（对方满配口径）
 *
 * 计算核心复用项目共享模块（esbuild 打包）：
 * - utils/pvpDamageEngine.js（面板 / 伤害 / 克制）
 * - utils/buildOpponentFullConfig.js（对方满配：60级5星+三项10+主攻性格）
 *
 * 数据在构建时由 esbuild 直接内联（import JSON），悬浮窗 WebView 无需网络/文件请求，
 * 规避 Android 11+ 对 file:// 加载的限制。
 *
 * 两种展示模式（由 URL 参数区分，供 Native.js 双窗口使用）：
 * - ?mode=ball  只渲染悬浮球（原生层负责拖动与点击切换面板）
 * - 默认        完整计算面板
 */
import {
  calculateAllPanels,
  calculateDamageFull,
  getAttrMultiplier,
  normalizeAttr
} from '../../utils/pvpDamageEngine.js'
import { buildOpponentFullConfig } from '../../utils/buildOpponentFullConfig.js'
import { buildSuggestedIvs } from '../../utils/buildSuggestedIvs.js'
import floatRaw from '../../static/float/float_data.json'

const STORAGE_KEY = 'roco_float_state_v1'
const NATURE_OPTIONS = ['无', '生命', '物攻', '魔攻', '物防', '魔防', '速度']

const state = {
  pets: [],
  loadError: '',
  tab: 'opponent',
  keyword: '',
  oppId: null,
  oppSkill: '',
  myId: null,
  myNatureUp: '无',
  myNatureDown: '无'
}

function el(id) {
  return document.getElementById(id)
}

function saveState() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      oppId: state.oppId,
      oppSkill: state.oppSkill,
      myId: state.myId,
      myNatureUp: state.myNatureUp,
      myNatureDown: state.myNatureDown
    }))
  } catch (error) { /* 忽略存储异常 */ }
}

function loadState() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}')
    if (saved.oppId) state.oppId = saved.oppId
    if (saved.oppSkill) state.oppSkill = saved.oppSkill
    if (saved.myId) state.myId = saved.myId
    if (saved.myNatureUp) state.myNatureUp = saved.myNatureUp
    if (saved.myNatureDown) state.myNatureDown = saved.myNatureDown
  } catch (error) { /* 忽略解析异常 */ }
}

function findPet(id) {
  return state.pets.find((pet) => Number(pet.id) === Number(id)) || null
}

function currentSkill(pet) {
  if (!pet || !pet.skills || !pet.skills.length) return null
  return pet.skills.find((skill) => skill.name === state.oppSkill) || pet.skills[0]
}

function filteredPets() {
  const keyword = String(state.keyword || '').trim().toLowerCase()
  const base = state.pets
  if (!keyword) return base.slice(0, 40)
  return base.filter((pet) => String(pet.name || '').toLowerCase().includes(keyword)).slice(0, 40)
}

function escapeHtml(text) {
  return String(text == null ? '' : text)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;')
}

/** 伤害计算：镜像 pages/pvp-breakpoint.vue 的口径 */
function computeResult() {
  const opp = findPet(state.oppId)
  const mine = findPet(state.myId)
  if (!opp || !mine) return null
  const skill = currentSkill(opp)
  if (!skill) return null

  // 对方默认满配（主攻性格 + 三项个体 10 + 60 级 5 星）
  const oppConfig = buildOpponentFullConfig(opp, { skillType: skill.type })
  const oppPanel = calculateAllPanels({
    race: opp.race,
    ivs: oppConfig.ivs,
    level: oppConfig.level,
    star: oppConfig.star,
    natureUp: oppConfig.natureUp,
    natureDown: oppConfig.natureDown
  })

  // 我方：记住的性格 + 推荐个体
  const myIvs = buildSuggestedIvs(mine.race, state.myNatureUp, state.myNatureDown)
  const myPanel = calculateAllPanels({
    race: mine.race,
    ivs: myIvs,
    level: 60,
    star: 5,
    natureUp: state.myNatureUp,
    natureDown: state.myNatureDown
  })

  const skillAttr = normalizeAttr(skill.attr) || ''
  const myTypes = (mine.types || []).map((type) => normalizeAttr(type)).filter(Boolean)
  const oppTypes = (opp.types || []).map((type) => normalizeAttr(type)).filter(Boolean)
  const attrMultiplier = getAttrMultiplier(skillAttr, myTypes)
  const sameTypeMultiplier = skillAttr && oppTypes.includes(skillAttr) ? 1.25 : 1
  // 威力口径：单发有效威力 = 基础威力 × 克制 × 本系；连击由引擎乘
  const power = Math.round(Number(skill.power || 0) * attrMultiplier * sameTypeMultiplier)
  const hits = Math.max(1, Number(skill.baseHits) || 1)

  const result = calculateDamageFull({
    attackerPanel: oppPanel,
    defenderPanel: myPanel,
    skillPower: power,
    skillType: skill.type,
    skillAttr: '普通',
    attackerAttrs: ['普通'],
    defenderAttrs: ['普通'],
    hits,
    skipAttrAndStab: true
  })

  const damage = Math.max(1, Math.round(result.damage || 0))
  const hp = Math.max(1, Math.round(Number(myPanel.hp) || 0))
  return {
    skill,
    attrMultiplier,
    sameTypeMultiplier,
    power,
    hits,
    damage,
    perHit: Math.max(1, Math.round(damage / hits)),
    hp,
    percent: Math.round((damage / hp) * 100),
    kill: damage >= hp,
    oppPanel,
    myPanel,
    oppConfig
  }
}

function renderResult() {
  const box = el('result')
  const data = computeResult()
  if (!data) {
    box.innerHTML = '<div class="empty-tip">选择对方与我方精灵后显示结果</div>'
    return
  }
  const multLabel = data.attrMultiplier !== 1 ? ` 克制${Number(data.attrMultiplier.toFixed(2))}x` : ''
  const stabLabel = data.sameTypeMultiplier !== 1 ? ' 本系1.25x' : ''
  const hitsLabel = data.hits > 1 ? `；单发 ${data.perHit} × ${data.hits} 连击` : ''
  const killLabel = data.kill ? '<b style="color:#ef4444">可击杀</b>' : '<b style="color:#22c55e">存活</b>'
  box.innerHTML = `
    <div class="result-top">
      <div class="result-skill-name">${escapeHtml(data.skill.name)} · ${escapeHtml(data.skill.attr)} · ${escapeHtml(data.skill.type)}${multLabel}${stabLabel}</div>
      <div class="result-damage ${data.kill ? 'kill' : ''}">${data.damage}</div>
    </div>
    <div class="result-rows">
      <span>占我方HP <b>${data.percent}%</b></span>
      <span>我方HP <b>${data.hp}</b></span>
      <span>${killLabel}</span>
    </div>
    <div class="result-note">对方满配：${escapeHtml(data.oppConfig.natureUp)}+${escapeHtml(data.oppConfig.natureDown)}- 60级5星${hitsLabel}</div>
  `
}

function renderTab() {
  const box = el('tab-content')
  el('tab-opponent').classList.toggle('active', state.tab === 'opponent')
  el('tab-mine').classList.toggle('active', state.tab === 'mine')

  if (state.tab === 'opponent') {
    const pet = findPet(state.oppId)
    const skillChips = pet && pet.skills && pet.skills.length
      ? pet.skills.map((skill) =>
          `<div class="skill-chip ${currentSkill(pet) && currentSkill(pet).name === skill.name ? 'active' : ''}" data-skill="${escapeHtml(skill.name)}">${escapeHtml(skill.name)}</div>`
        ).join('')
      : ''
    box.innerHTML = `
      <input class="search-input" id="opp-search" placeholder="搜索对方精灵" value="${escapeHtml(state.keyword)}" />
      <div class="pet-list" id="opp-list">${renderPetList(state.oppId)}</div>
      ${skillChips ? `<div class="skill-strip" id="opp-skills">${skillChips}</div>` : ''}
    `
    const search = el('opp-search')
    search.addEventListener('input', (event) => {
      state.keyword = event.target.value
      el('opp-list').innerHTML = renderPetList(state.oppId)
    })
    box.querySelector('.pet-list').addEventListener('click', (event) => {
      const item = event.target.closest('.pet-item')
      if (!item) return
      state.oppId = Number(item.dataset.id)
      state.keyword = ''
      const opp = findPet(state.oppId)
      const skill = currentSkill(opp)
      state.oppSkill = skill ? skill.name : ''
      saveState()
      renderTab()
      renderResult()
    })
    const strip = el('opp-skills')
    if (strip) {
      strip.addEventListener('click', (event) => {
        const chip = event.target.closest('.skill-chip')
        if (!chip) return
        state.oppSkill = chip.dataset.skill
        saveState()
        renderTab()
        renderResult()
      })
    }
  } else {
    box.innerHTML = `
      <div class="nature-row">
        <span class="nature-label">我方性格</span>
        <select class="nature-select" id="my-nature-up">
          ${NATURE_OPTIONS.map((option) =>
            `<option value="${option}" ${state.myNatureUp === option ? 'selected' : ''}>+${option}</option>`).join('')}
        </select>
        <select class="nature-select" id="my-nature-down">
          ${NATURE_OPTIONS.map((option) =>
            `<option value="${option}" ${state.myNatureDown === option ? 'selected' : ''}>-${option}</option>`).join('')}
        </select>
      </div>
      <input class="search-input" id="my-search" placeholder="搜索我方精灵" value="${escapeHtml(state.keyword)}" />
      <div class="pet-list" id="my-list">${renderPetList(state.myId)}</div>
    `
    const search = el('my-search')
    search.addEventListener('input', (event) => {
      state.keyword = event.target.value
      el('my-list').innerHTML = renderPetList(state.myId)
    })
    el('my-nature-up').addEventListener('change', (event) => {
      state.myNatureUp = event.target.value
      saveState()
      renderResult()
    })
    el('my-nature-down').addEventListener('change', (event) => {
      state.myNatureDown = event.target.value
      saveState()
      renderResult()
    })
    box.querySelector('.pet-list').addEventListener('click', (event) => {
      const item = event.target.closest('.pet-item')
      if (!item) return
      state.myId = Number(item.dataset.id)
      state.keyword = ''
      saveState()
      renderTab()
      renderResult()
    })
  }
}

function renderPetList(activeId) {
  const pets = filteredPets()
  if (state.loadError) {
    return `<div class="error-tip">${escapeHtml(state.loadError)}</div>`
  }
  if (!pets.length) return '<div class="empty-tip">没有匹配的精灵</div>'
  return pets.map((pet) => `
    <div class="pet-item ${Number(pet.id) === Number(activeId) ? 'active' : ''}" data-id="${pet.id}">
      <span class="pet-name">${escapeHtml(pet.name)}</span>
      <span class="pet-types">${escapeHtml((pet.types || []).join('/'))}</span>
      <span class="pet-speed">速${Number(pet.race && pet.race.speed) || 0}</span>
    </div>
  `).join('')
}

function render() {
  renderTab()
  renderResult()
}

/** 把紧凑数组数据展开为对象（见 scripts/build-float-data.mjs 的格式说明） */
function expandPets(rawList) {
  const raceKeys = ['hp', 'attack', 'mattack', 'defense', 'mdefense', 'speed']
  return rawList.map((raw) => {
    const raceValues = raw[3] || []
    const race = {}
    raceKeys.forEach((key, index) => {
      race[key] = Number(raceValues[index]) || 0
    })
    return {
      id: Number(raw[0]),
      name: raw[1],
      types: raw[2] || [],
      race,
      skills: (raw[4] || []).map((skill) => ({
        name: skill[0],
        attr: skill[1],
        type: skill[2] === 1 ? '魔攻' : '物攻',
        power: Number(skill[3]) || 0,
        baseHits: Number(skill[4]) || 1
      }))
    }
  })
}

async function loadData() {
  try {
    const raw = floatRaw
    if (!Array.isArray(raw) || !raw.length) throw new Error('数据为空')
    state.pets = expandPets(raw)
    if (!findPet(state.oppId)) state.oppId = state.pets[0] && state.pets[0].id
    if (!findPet(state.myId)) {
      const second = state.pets[1] || state.pets[0]
      state.myId = second && second.id
    }
    const opp = findPet(state.oppId)
    const skill = currentSkill(opp)
    if (opp && skill && !opp.skills.some((item) => item.name === state.oppSkill)) {
      state.oppSkill = skill.name
    }
  } catch (error) {
    state.loadError = `数据加载失败：${error.message}`
  }
}

function notifyApp() {
  // 若宿主为 hans-pip 悬浮窗，可向 App 侧同步状态（当前 App 侧未消费，仅预留）
  try {
    if (window.HansPipBridge && typeof window.HansPipBridge.postMessage === 'function') {
      window.HansPipBridge.postMessage(JSON.stringify({ type: 'float-ready' }))
    }
  } catch (error) { /* 桥不可用时忽略 */ }
}

async function main() {
  // 小球窗口模式：只渲染悬浮球外观，拖动/点击由原生层（Native.js）处理
  if (/[?&]mode=ball/.test(location.search)) {
    document.body.classList.add('ball-mode')
    el('ball').addEventListener('click', () => {
      // 浏览器预览时的兜底交互；真机由原生层切换面板窗口
      document.body.classList.add('expanded')
    })
    return
  }

  loadState()
  await loadData()

  el('ball').addEventListener('click', () => {
    document.body.classList.add('expanded')
    render()
  })
  el('btn-collapse').addEventListener('click', () => {
    document.body.classList.remove('expanded')
  })
  el('tab-opponent').addEventListener('click', () => {
    state.tab = 'opponent'
    state.keyword = ''
    renderTab()
  })
  el('tab-mine').addEventListener('click', () => {
    state.tab = 'mine'
    state.keyword = ''
    renderTab()
  })

  render()
  notifyApp()
}

main()
