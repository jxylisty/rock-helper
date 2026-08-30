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
 * 展示模式（自动检测）：
 * - App 内悬浮（plus.webview 子窗口，inapp 模式）：窗口尺寸=球/面板，页面自管理——
 *               悬浮球拖动 / 单击展开 / 长按关闭，面板收起/关闭按钮直接改自身窗口样式；
 *               屏幕尺寸由 App 侧经 plus.storage 预写入，球位置持久化到 plus.storage
 * - ?mode=self  单窗口自适应（旧 Native.js 原生层模式，现仅保留协议兼容）：
 *               原生 → 页面：evaluateJavascript 调 window.__floatExpand()/__floatCollapse()
 *               页面 → 原生：window.__floatCmd = 'collapse' | 'close'（原生轮询读取）
 * - 默认        浏览器预览模式（小球+面板 CSS 切换，交互与 inapp 模式一致）
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
const SCREEN_KEY = 'roco_float_screen'
const POS_KEY = 'roco_float_ball_pos'
const NATURE_OPTIONS = ['无', '生命', '物攻', '魔攻', '物防', '魔防', '速度']
const IV_FIELDS = [['hp', '血'], ['attack', '攻'], ['mattack', '魔'], ['defense', '防'], ['mdefense', '魔防'], ['speed', '速']]
const IV_LABELS = { hp: '血', attack: '攻', mattack: '魔', defense: '防', mdefense: '魔防', speed: '速' }

const state = {
  pets: [],
  loadError: '',
  keyword: '',
  oppId: null,
  oppSkill: '',
  myId: null,
  myNatureUp: '无',
  myNatureDown: '无',
  // 对方配置：auto=满配（同计算页一键满配口径）；custom=用户自定（个体/性格）
  oppCfgMode: 'auto',
  oppIvs: null,
  oppNatureUp: '物攻',
  oppNatureDown: '魔攻'
}

function el(id) {
  return document.getElementById(id)
}

/** 存储抽象：App 内（plus 环境）优先 plus.storage，file:// 的 localStorage 不可靠 */
function storageGet(key) {
  try {
    if (typeof plus !== 'undefined' && plus.storage) return plus.storage.getItem(key)
  } catch (error) { /* 走 localStorage 兜底 */ }
  try {
    return localStorage.getItem(key)
  } catch (error) {
    return null
  }
}

function storageSet(key, value) {
  try {
    if (typeof plus !== 'undefined' && plus.storage) {
      plus.storage.setItem(key, value)
      return
    }
  } catch (error) { /* 走 localStorage 兜底 */ }
  try {
    localStorage.setItem(key, value)
  } catch (error) { /* 忽略存储异常 */ }
}

function saveState() {
  storageSet(STORAGE_KEY, JSON.stringify({
    oppId: state.oppId,
    oppSkill: state.oppSkill,
    myId: state.myId,
    myNatureUp: state.myNatureUp,
    myNatureDown: state.myNatureDown,
    oppCfgMode: state.oppCfgMode,
    oppIvs: state.oppIvs,
    oppNatureUp: state.oppNatureUp,
    oppNatureDown: state.oppNatureDown
  }))
}

function loadState() {
  try {
    const saved = JSON.parse(storageGet(STORAGE_KEY) || '{}')
    if (saved.oppId) state.oppId = saved.oppId
    if (saved.oppSkill) state.oppSkill = saved.oppSkill
    if (saved.myId) state.myId = saved.myId
    if (saved.myNatureUp) state.myNatureUp = saved.myNatureUp
    if (saved.myNatureDown) state.myNatureDown = saved.myNatureDown
    if (saved.oppCfgMode === 'custom' || saved.oppCfgMode === 'auto') state.oppCfgMode = saved.oppCfgMode
    if (saved.oppIvs && typeof saved.oppIvs === 'object') state.oppIvs = saved.oppIvs
    if (saved.oppNatureUp) state.oppNatureUp = saved.oppNatureUp
    if (saved.oppNatureDown) state.oppNatureDown = saved.oppNatureDown
  } catch (error) { /* 忽略解析异常 */ }
}

function findPet(id) {
  return state.pets.find((pet) => Number(pet.id) === Number(id)) || null
}

function currentSkill(pet) {
  if (!pet || !pet.skills || !pet.skills.length) return null
  const saved = pet.skills.find((skill) => skill.name === state.oppSkill)
  if (saved) return saved
  const ordered = orderedSkills(pet)
  return ordered[0] || null
}

/** 技能展示顺序：非血脉优先 → 克制我方优先 → 有效威力降序 */
function orderedSkills(pet) {
  if (!pet || !pet.skills) return []
  const mine = findPet(state.myId)
  const myTypes = (mine && mine.types ? mine.types : []).map((type) => normalizeAttr(type)).filter(Boolean)
  return pet.skills
    .map((skill) => {
      const mult = myTypes.length ? getAttrMultiplier(normalizeAttr(skill.attr), myTypes) : 1
      return { skill, mult }
    })
    .sort((a, b) => {
      const bloodA = a.skill.src === 1 ? 1 : 0
      const bloodB = b.skill.src === 1 ? 1 : 0
      if (bloodA !== bloodB) return bloodA - bloodB
      if (a.mult !== b.mult) return b.mult - a.mult
      return (b.skill.power * b.skill.baseHits) - (a.skill.power * a.skill.baseHits)
    })
    .map((item) => item.skill)
}

/** 数据已在构建期筛为"最终形态 + 多形态条目"，这里只做关键词过滤 */
function filteredPets() {
  const keyword = String(state.keyword || '').trim().toLowerCase()
  if (!keyword) return state.pets.slice(0, 40)
  return state.pets.filter((pet) => String(pet.name || '').toLowerCase().includes(keyword)).slice(0, 40)
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

  // 对方配置：auto=满配（与计算页"一键满配"同口径）；custom=用户自定（个体/性格）
  const oppConfig = state.oppCfgMode === 'custom' && state.oppIvs
    ? {
        level: 60,
        star: 5,
        ivs: state.oppIvs,
        natureUp: state.oppNatureUp,
        natureDown: state.oppNatureDown
      }
    : buildOpponentFullConfig(opp, { skillType: skill.type })
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

// ===== 渲染层（羊皮纸主题：结果卡置顶 + 精灵行内联展开） =====

// 属性徽章配色（与 App petTypes 一致的精简映射）
const TYPE_COLORS = {
  '火': '#F08030', '水': '#6890F0', '草': '#78C850', '电': '#F8D030',
  '冰': '#98D8D8', '虫': '#A8B820', '翼': '#A890F0', '地': '#E0C068',
  '萌': '#FF6699', '武': '#C03028', '毒': '#A040A0', '龙': '#7038F8',
  '幽': '#705898', '恶': '#705848', '光': '#F8D030', '普通': '#A8A878',
  '机械': '#A0A0A0', '幻': '#B8A0F0'
}

function typeColor(type) {
  return TYPE_COLORS[normalizeAttr(type)] || '#A8A878'
}

// 属性 → 本地图标（static/static-web/icons/{en}.webp，页面相对路径 ../static-web/icons/）
const TYPE_EN = {
  '火': 'fire', '水': 'water', '草': 'grass', '电': 'electric',
  '冰': 'ice', '虫': 'bug', '翼': 'flying', '地': 'ground',
  '萌': 'fairy', '武': 'fighting', '毒': 'poison', '龙': 'dragon',
  '幽': 'ghost', '恶': 'dark', '光': 'light', '普通': 'normal',
  '机械': 'steel', '幻': 'psychic'
}

function typeIconHtml(type, cls) {
  const key = normalizeAttr(type) || String(type || '')
  const en = TYPE_EN[key]
  if (!en) return `<span class="${cls}">${escapeHtml(key)}</span>`
  return `<span class="${cls}" style="background:${typeColor(key)}" title="${escapeHtml(key)}"><img src="../static-web/icons/${en}.webp" alt="" onerror="this.parentNode.textContent='${escapeHtml(key)}'"></span>`
}

function typeBadgeHtml(type) {
  return typeIconHtml(type, 'type-badge')
}

function renderTypes(boxId, types) {
  const list = Array.isArray(types) ? types : []
  el(boxId).innerHTML = list.map(typeBadgeHtml).join('')
}

function renderOppRow() {
  const pet = findPet(state.oppId)
  el('opp-name').textContent = pet ? pet.name : '未选择'
  renderTypes('opp-types', pet && pet.types)
  renderSkillChips(pet)
  renderOppCfg()
}

function renderSkillChips(pet) {
  const skills = orderedSkills(pet)
  const current = currentSkill(pet)
  el('opp-skills').innerHTML = skills.map((skill) => `
    <div class="skill-chip ${current && current.name === skill.name ? 'active' : ''}" data-skill="${escapeHtml(skill.name)}">
      ${typeIconHtml(skill.attr, 'sc-icon')}${escapeHtml(skill.name)}${skill.src === 1 ? '<i class="blood-tag">脉</i>' : ''}<span class="power mono">${skill.power}${skill.baseHits > 1 ? '×' + skill.baseHits : ''}</span>
    </div>
  `).join('')
}

/** 对方配置区：满配/自定切换 + 自定编辑器 + 口径提示 */
function renderOppCfg() {
  const auto = el('opp-cfg-auto')
  const custom = el('opp-cfg-custom')
  const edit = el('opp-cfg-edit')
  auto.classList.toggle('active', state.oppCfgMode !== 'custom')
  custom.classList.toggle('active', state.oppCfgMode === 'custom')
  edit.classList.toggle('open', state.oppCfgMode === 'custom')

  let hint = ''
  if (state.oppCfgMode !== 'custom') {
    const pet = findPet(state.oppId)
    if (pet) {
      const skill = currentSkill(pet)
      const cfg = buildOpponentFullConfig(pet, { skillType: skill ? skill.type : '' })
      hint = `满配 ${cfg.natureUp}+ ${cfg.natureDown}- · 60级5星`
    } else {
      hint = '满配 · 60级5星'
    }
  } else {
    const ivText = state.oppIvs
      ? Object.entries(state.oppIvs).filter(([, v]) => Number(v) > 0).map(([k]) => IV_LABELS[k] || k).join('/') || '无个体'
      : '无个体'
    hint = `自定 ${state.oppNatureUp}+ ${state.oppNatureDown}- · ${ivText}`
  }
  el('opp-cfg-hint').textContent = hint

  if (state.oppCfgMode === 'custom') {
    const ivs = state.oppIvs || {}
    el('opp-iv-toggles').innerHTML = IV_FIELDS.map(([key, label]) => `
      <div class="iv-toggle ${Number(ivs[key]) > 0 ? 'on' : ''}" data-iv="${key}">
        <span class="iv-label">${label}</span><span class="iv-value mono">${Number(ivs[key]) > 0 ? '+10' : '0'}</span>
      </div>
    `).join('')
  }
}

function renderMyRow() {
  const pet = findPet(state.myId)
  el('my-name').textContent = pet ? pet.name : '未选择'
  renderTypes('my-types', pet && pet.types)
}

function renderPickList(listId, activeId) {
  const box = el(listId)
  const pets = filteredPets()
  if (state.loadError) {
    box.innerHTML = `<div class="error-tip">${escapeHtml(state.loadError)}</div>`
    return
  }
  if (!pets.length) {
    box.innerHTML = '<div class="empty-tip">没有匹配的精灵</div>'
    return
  }
  box.innerHTML = pets.map((pet) => `
    <div class="pick-item ${Number(pet.id) === Number(activeId) ? 'active' : ''}" data-id="${pet.id}">
      <span class="pick-name">${escapeHtml(pet.name)}</span>
      <span class="type-badges">${(pet.types || []).slice(0, 2).map(typeBadgeHtml).join('')}</span>
      <span class="pick-speed mono">速${Number(pet.race && pet.race.speed) || 0}</span>
    </div>
  `).join('')
}

function renderResult() {
  const box = el('result')
  const data = computeResult()
  if (!data) {
    box.innerHTML = '<div class="empty-tip">选择对方与我方精灵后显示结果</div>'
    return
  }
  const chips = [
    `<span class="chip type" style="background:${typeColor(data.skill.attr)}">${escapeHtml(data.skill.attr)}</span>`,
    `<span class="chip">${escapeHtml(data.skill.type)} · 威力${data.skill.power}</span>`
  ]
  if (data.attrMultiplier !== 1) chips.push(`<span class="chip">克制 ${Number(data.attrMultiplier.toFixed(2))}x</span>`)
  if (data.sameTypeMultiplier !== 1) chips.push(`<span class="chip">本系 1.25x</span>`)
  const overflow = data.damage - data.hp
  const pct = Math.min(data.percent, 100)
  box.innerHTML = `
    <div class="result-skill-row">
      <span class="result-skill-name">${escapeHtml(data.skill.name)}</span>
      ${chips.join('')}
    </div>
    <div class="dmg-track">
      <div class="dmg-hp"></div>
      <div class="dmg-fill" style="width:${pct}%"></div>
    </div>
    <div class="dmg-nums">
      <span class="result-damage ${data.kill ? 'kill' : ''} mono">${data.damage}</span>
      <span class="result-hp mono">/ ${data.hp}</span>
      <span class="result-pct mono">${data.percent}%</span>
      <span class="verdict ${data.kill ? 'kill' : 'survive'}">${data.kill ? '可击杀' + (overflow > 0 ? ' 溢出' + overflow : '') : '存活'}</span>
    </div>
    <div class="result-note">对方${state.oppCfgMode === 'custom' ? '自定' : '满配'} ${escapeHtml(data.oppConfig.natureUp)}+ ${escapeHtml(data.oppConfig.natureDown)}- · 60级5星${data.hits > 1 ? ` · 单发 ${data.perHit}×${data.hits}连击` : ''}</div>
  `
}

function renderSides() {
  renderOppRow()
  renderMyRow()
}

function render() {
  renderSides()
  renderResult()
}

/** 攻守互换：双方精灵对调，技能切到新对方的推荐技能 */
function swapSides() {
  if (!state.oppId && !state.myId) return
  const prevOpp = state.oppId
  state.oppId = state.myId
  state.myId = prevOpp
  const opp = findPet(state.oppId)
  const ordered = orderedSkills(opp)
  state.oppSkill = ordered.length ? ordered[0].name : ''
  saveState()
  renderSides()
  renderResult()
}

/** 切换对方配置模式；转自定时用当前满配值预填 */
function setOppCfgMode(mode) {
  if (state.oppCfgMode === mode) return
  if (mode === 'custom') {
    const pet = findPet(state.oppId)
    const skill = currentSkill(pet)
    const cfg = buildOpponentFullConfig(pet || {}, { skillType: skill ? skill.type : '' })
    state.oppIvs = { ...cfg.ivs }
    state.oppNatureUp = cfg.natureUp
    state.oppNatureDown = cfg.natureDown
  }
  state.oppCfgMode = mode
  saveState()
  renderOppCfg()
  renderResult()
}

function toggleOppIv(key) {
  if (!state.oppIvs) {
    const pet = findPet(state.oppId)
    const skill = currentSkill(pet)
    const cfg = buildOpponentFullConfig(pet || {}, { skillType: skill ? skill.type : '' })
    state.oppIvs = { ...cfg.ivs }
  }
  state.oppIvs[key] = Number(state.oppIvs[key]) > 0 ? 0 : 10
  saveState()
  renderOppCfg()
  renderResult()
}

/** 静态 DOM 的事件绑定（选精灵内联展开 / 技能 chips / 性格），启动时执行一次 */
function bindStatic() {
  // ---- 自绘下拉（替代原生 select，样式与面板统一） ----
  const ddLayer = el('dd-layer')
  let openDropdown = null
  const closeDropdown = () => {
    if (openDropdown) {
      openDropdown.box.classList.remove('active')
      ddLayer.classList.remove('open')
      openDropdown = null
    }
  }
  const bindDropdown = (boxId, options, prefix, get, set) => {
    const box = el(boxId)
    const refresh = () => { box.textContent = prefix + get() }
    refresh()
    box.addEventListener('click', (event) => {
      event.stopPropagation()
      if (openDropdown && openDropdown.box === box) { closeDropdown(); return }
      closeDropdown()
      const rect = box.getBoundingClientRect()
      ddLayer.innerHTML = options.map((option) => `
        <div class="dd-item${option === get() ? ' active' : ''}" data-v="${escapeHtml(option)}">${prefix}${escapeHtml(option)}</div>
      `).join('')
      ddLayer.style.left = Math.max(4, rect.left) + 'px'
      ddLayer.style.top = (rect.bottom + 3) + 'px'
      ddLayer.style.minWidth = Math.max(rect.width, 84) + 'px'
      ddLayer.classList.add('open')
      openDropdown = { box, set }
    })
    return refresh
  }
  ddLayer.addEventListener('click', (event) => {
    event.stopPropagation()
    const item = event.target.closest('.dd-item')
    if (!item || !openDropdown) { closeDropdown(); return }
    const set = openDropdown.set
    closeDropdown()
    set(item.dataset.v)
  })
  el('panel').addEventListener('click', closeDropdown)
  el('panel').addEventListener('scroll', closeDropdown, true)
  const natureBox = (boxId, options, prefix, get, set) => {
    const refresh = bindDropdown(boxId, options, prefix, get, (value) => {
      set(value)
      refresh()
    })
  }

  const closePickers = (exceptId) => {
    ;['opp-picker', 'my-picker'].forEach((id) => {
      if (id !== exceptId) el(id).classList.remove('open')
    })
  }
  const togglePicker = (pickerId, listId, activeId, searchId) => {
    state.keyword = ''
    el(searchId).value = ''
    const picker = el(pickerId)
    const willOpen = !picker.classList.contains('open')
    closePickers(pickerId)
    picker.classList.toggle('open', willOpen)
    if (willOpen) {
      renderPickList(listId, activeId)
      el(searchId).focus()
    }
  }

  // 对方：换精灵（整行可点）/ 搜索 / 选中 / 技能
  el('btn-opp-change').addEventListener('click', () => togglePicker('opp-picker', 'opp-list', state.oppId, 'opp-search'))
  el('opp-row').addEventListener('click', (event) => {
    if (event.target.closest('.side-action')) return
    togglePicker('opp-picker', 'opp-list', state.oppId, 'opp-search')
  })
  el('opp-search').addEventListener('input', (event) => {
    state.keyword = event.target.value
    renderPickList('opp-list', state.oppId)
  })
  el('opp-list').addEventListener('click', (event) => {
    const item = event.target.closest('.pick-item')
    if (!item) return
    state.oppId = Number(item.dataset.id)
    const opp = findPet(state.oppId)
    const skill = currentSkill(opp)
    state.oppSkill = skill ? skill.name : ''
    saveState()
    el('opp-picker').classList.remove('open')
    renderSides()
    renderResult()
  })
  el('opp-skills').addEventListener('click', (event) => {
    const chip = event.target.closest('.skill-chip')
    if (!chip) return
    state.oppSkill = chip.dataset.skill
    saveState()
    renderSkillChips(findPet(state.oppId))
    renderResult()
  })

  // 我方：换精灵（整行可点）/ 搜索 / 选中 / 性格
  el('btn-my-change').addEventListener('click', () => togglePicker('my-picker', 'my-list', state.myId, 'my-search'))
  el('my-row').addEventListener('click', (event) => {
    if (event.target.closest('.side-action') || event.target.closest('.nature-select')) return
    togglePicker('my-picker', 'my-list', state.myId, 'my-search')
  })

  // 攻守互换
  el('btn-swap').addEventListener('click', swapSides)

  // 对方配置：满配 / 自定
  el('opp-cfg-auto').addEventListener('click', () => setOppCfgMode('auto'))
  el('opp-cfg-custom').addEventListener('click', () => setOppCfgMode('custom'))
  natureBox('opp-nature-up', NATURE_OPTIONS, '+', () => state.oppNatureUp, (v) => {
    state.oppNatureUp = v
    saveState()
    renderOppCfg()
    renderResult()
  })
  natureBox('opp-nature-down', NATURE_OPTIONS, '−', () => state.oppNatureDown, (v) => {
    state.oppNatureDown = v
    saveState()
    renderOppCfg()
    renderResult()
  })
  el('opp-iv-toggles').addEventListener('click', (event) => {
    const item = event.target.closest('.iv-toggle')
    if (!item) return
    toggleOppIv(item.dataset.iv)
  })
  el('my-search').addEventListener('input', (event) => {
    state.keyword = event.target.value
    renderPickList('my-list', state.myId)
  })
  el('my-list').addEventListener('click', (event) => {
    const item = event.target.closest('.pick-item')
    if (!item) return
    state.myId = Number(item.dataset.id)
    saveState()
    el('my-picker').classList.remove('open')
    renderSides()
    renderResult()
  })
  natureBox('my-nature-up', NATURE_OPTIONS, '+', () => state.myNatureUp, (v) => {
    state.myNatureUp = v
    saveState()
    renderResult()
  })
  natureBox('my-nature-down', NATURE_OPTIONS, '−', () => state.myNatureDown, (v) => {
    state.myNatureDown = v
    saveState()
    renderResult()
  })
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
      uiTag: raw[5] || '其他',
      // src: 0=精灵技能 1=血脉技能 2=可学技能石；展示顺序由 orderedSkills 按对方/克制动态决定
      skills: (raw[4] || []).map((skill) => ({
        name: skill[0],
        attr: skill[1],
        type: skill[2] === 1 ? '魔攻' : '物攻',
        power: Number(skill[3]) || 0,
        baseHits: Number(skill[4]) || 1,
        src: Number(skill[5] ?? 0) || 0
      }))
    }
  })
}

function loadData() {
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

function applyExpanded(expanded) {
  document.body.classList.toggle('expanded', !!expanded)
}

/** 原生 → 页面：展开面板（原生层已把窗口尺寸改为面板大小） */
function nativeExpand() {
  applyExpanded(true)
  render()
}

/** 原生 → 页面：收起为悬浮球（原生层已把窗口尺寸改回小球） */
function nativeCollapse() {
  applyExpanded(false)
}

/** 页面 → 原生：通知原生层收起/关闭（原生层轮询 window.__floatCmd） */
function postCommand(command) {
  try {
    window.__floatCmd = command
  } catch (error) { /* 忽略 */ }
}

/**
 * App 内悬浮模式（plus.webview 子窗口）：页面自管理窗口尺寸与位置。
 * - 球 56px：拖动移动（screenX/Y 增量，rAF 合帧）/ 单击展开 / 长按 600ms 关闭
 * - 面板最大 340×480，出现在球下方（空间不足改上方），边缘夹紧
 * - 关闭/拖动后把球位置写入 plus.storage，下次打开恢复
 */
function initInApp() {
  let wv = null
  try {
    wv = plus.webview.currentWebview()
  } catch (error) {
    wv = null
  }
  if (!wv || typeof wv.setStyle !== 'function') return
  // plus 晚注入时 main() 可能已按浏览器模式初始化，这里补上自管理样式
  document.body.classList.add('self-mode')

  const BALL = 44
  const GAP = 8
  let W = 360
  let H = 640
  // 屏幕尺寸：App 侧创建窗口前预写入；读不到时回退 plus.screen 分辨率估算
  try {
    const saved = JSON.parse(plus.storage.getItem(SCREEN_KEY) || 'null')
    if (saved && saved.w > 0 && saved.h > 0) {
      W = saved.w
      H = saved.h
    }
  } catch (error) { /* 走估算 */ }
  if (!plus.storage.getItem(SCREEN_KEY)) {
    try {
      const scale = plus.screen.scale || 1
      W = Math.round(plus.screen.resolutionWidth / scale)
      H = Math.round(plus.screen.resolutionHeight / scale)
    } catch (error) { /* 用默认值 */ }
  }

  const clamp = (v, min, max) => Math.max(min, Math.min(v, max))
  let ballX = clamp(W - BALL - GAP, 0, W - BALL)
  let ballY = clamp(Math.round(H * 0.4), 0, H - BALL)
  try {
    const pos = JSON.parse(plus.storage.getItem(POS_KEY) || 'null')
    if (pos && typeof pos.x === 'number') {
      ballX = clamp(pos.x, 0, W - BALL)
      ballY = clamp(pos.y, 0, H - BALL)
    }
  } catch (error) { /* 忽略 */ }

  let pendingFrame = null
  /** rAF 合帧更新自身窗口位置尺寸，避免拖动时 setStyle 调用过频 */
  function applyFrame(x, y, w, h) {
    if (pendingFrame) return
    pendingFrame = requestAnimationFrame(() => {
      pendingFrame = null
      try {
        wv.setStyle({
          left: Math.round(x) + 'px',
          top: Math.round(y) + 'px',
          width: Math.round(w) + 'px',
          height: Math.round(h) + 'px'
        })
      } catch (error) { /* 忽略单帧失败 */ }
    })
  }

  function savePos() {
    try {
      plus.storage.setItem(POS_KEY, JSON.stringify({ x: ballX, y: ballY }))
    } catch (error) { /* 忽略 */ }
  }

  let expanded = false
  function expand() {
    expanded = true
    const pw = Math.min(304, W - GAP * 2)
    const ph = Math.min(440, H - GAP * 2)
    let px = clamp(ballX + BALL / 2 - pw / 2, GAP, W - pw - GAP)
    let py = ballY + BALL + GAP
    if (py + ph > H - GAP) py = clamp(ballY - ph - GAP, GAP, H - ph - GAP)
    applyFrame(px, py, pw, ph)
    document.body.classList.add('expanded')
    render()
  }

  function collapse() {
    expanded = false
    document.body.classList.remove('expanded')
    applyFrame(ballX, ballY, BALL, BALL)
  }

  function closeSelf() {
    savePos()
    try {
      wv.close()
    } catch (error) { /* 忽略 */ }
  }

  // ---- 球触摸：拖动 / 单击展开 / 长按关闭 ----
  const ball = el('ball')
  let touch = null
  let pressTimer = null
  const clearPressTimer = () => {
    if (pressTimer) {
      clearTimeout(pressTimer)
      pressTimer = null
    }
  }
  ball.addEventListener('touchstart', (event) => {
    if (expanded) return
    const t = event.touches[0]
    touch = { sx: t.screenX, sy: t.screenY, bx: ballX, by: ballY, moved: false, long: false }
    clearPressTimer()
    pressTimer = setTimeout(() => {
      pressTimer = null
      if (touch && !touch.moved) {
        touch.long = true
        closeSelf()
      }
    }, 600)
    event.preventDefault()
  }, { passive: false })
  ball.addEventListener('touchmove', (event) => {
    if (!touch) return
    const t = event.touches[0]
    const dx = t.screenX - touch.sx
    const dy = t.screenY - touch.sy
    if (Math.abs(dx) > 8 || Math.abs(dy) > 8) touch.moved = true
    if (touch.moved) {
      clearPressTimer()
      ballX = clamp(touch.bx + dx, 0, W - BALL)
      ballY = clamp(touch.by + dy, 0, H - BALL)
      applyFrame(ballX, ballY, BALL, BALL)
    }
    event.preventDefault()
  }, { passive: false })
  ball.addEventListener('touchend', () => {
    clearPressTimer()
    if (touch && touch.moved) savePos()
    if (touch && !touch.moved && !touch.long) expand()
    touch = null
  })
  ball.addEventListener('touchcancel', () => {
    clearPressTimer()
    touch = null
  })

  // ---- 面板按钮 ----
  el('btn-collapse').addEventListener('click', collapse)
  el('btn-close').addEventListener('click', closeSelf)
}

/** inapp 模式入口：plus 可能晚于脚本注入，等 plusready */
function startInApp() {
  if (typeof plus !== 'undefined') {
    initInApp()
    return
  }
  document.addEventListener('plusready', initInApp, false)
}

function main() {
  // UTS 系统悬浮窗模式：球窗口与面板窗口由原生 WindowManager 分开承载，
  // 拖动/单击切换/长按关闭全部在原生触摸层处理，页面只负责渲染
  // 注：file:// 页面经原生 loadUrl 传入的模式标记在 #fragment 里（?query 在部分 WebView 会破坏文件解析）
  const modeText = location.search + ' ' + location.hash
  const utsPanel = /mode=uts-panel/.test(modeText)
  if (/mode=uts-ball/.test(modeText)) {
    document.body.classList.add('uts-ball')
    loadState()
    loadData()
    return
  }
  if (utsPanel) document.body.classList.add('uts-panel')

  // 模式检测：原生内联（旧 Native.js 标记）> App 内悬浮（plus 环境）> 浏览器预览
  const nativeMode = window.__FLOAT_NATIVE__ === 1
  let inApp = false
  try {
    inApp = !nativeMode && typeof plus !== 'undefined' && !!plus.webview
  } catch (error) {
    inApp = false
  }
  const selfMode = nativeMode || inApp || /[?&]mode=self/.test(location.search)
  if (selfMode) document.body.classList.add('self-mode')

  loadState()
  loadData()
  bindStatic()

  if (utsPanel) {
    // 面板窗口初始即展开；球/收起/关闭按钮已由 CSS 隐藏，交互全在原生层
    nativeExpand()
  } else if (nativeMode) {
    // 供原生层 evaluateJavascript 调用
    window.__floatExpand = nativeExpand
    window.__floatCollapse = nativeCollapse
    window.__floatCmd = ''

    el('ball').addEventListener('click', nativeExpand)
    el('btn-collapse').addEventListener('click', () => {
      nativeCollapse()
      postCommand('collapse')
    })
    el('btn-close').addEventListener('click', () => {
      applyExpanded(false)
      postCommand('close')
    })
  } else if (inApp) {
    // 事件绑定在 initInApp 内完成（可能延后到 plusready）
    startInApp()
  } else {
    // 浏览器预览：小球点击展开。
    // 若稍后 plus 才注入（App 内时序竞争），plusready 后自动叠加 inapp 自管理
    // （重复绑定无害：两边事件对同一目标状态的收敛结果一致）
    el('ball').addEventListener('click', nativeExpand)
    el('btn-collapse').addEventListener('click', () => {
      nativeCollapse()
      postCommand('collapse')
    })
    el('btn-close').addEventListener('click', () => {
      applyExpanded(false)
      postCommand('close')
    })
    document.addEventListener('plusready', initInApp, false)
  }

  render()
  notifyApp()
}

main()
