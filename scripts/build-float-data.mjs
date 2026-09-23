/**
 * 悬浮窗数据生成：从 data/pet + data/skill 生成 static/float/float_data.json
 * 运行: npm run build:float-data（数据更新后需重跑）
 */
import { writeFileSync, mkdirSync, statSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { petIndex } from '../data/pet/pet_index.js'
import { petDetail } from '../data/pet/pet_detail.js'
import { petSkills } from '../data/pet/pet_skills.js'
import { skillsData } from '../data/skill/skills.js'
import { normalizeBattleSkill } from '../utils/pvpDamageEngine.js'

import { readdirSync, readFileSync } from 'node:fs'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const outFile = join(root, 'static/float/float_data.json')
const famDir = join(root, 'crawler_official_api/output/cache/family')

// 从官方族谱建立低级形态集合与首领化集合
const evolutionNextNames = new Set()
const officialLeaderNames = new Set()

try {
  const famFiles = readdirSync(famDir)
  for (const file of famFiles) {
    if (!file.endsWith('.json')) continue
    try {
      const famData = JSON.parse(readFileSync(join(famDir, file), 'utf8'))
      const forms = famData.forms || (famData.members ? [{ members: famData.members }] : [])
      for (const f of forms) {
        const members = f.members || []
        members.forEach((m, idx) => {
          const isLeader = m.condition_summary === '首领化' || (m.condition_texts && m.condition_texts.includes('首领化'))
          const nextMember = members[idx + 1]
          const hasNext = !!nextMember && !isLeader && nextMember.condition_summary !== '首领化'
          if (hasNext && m.name) evolutionNextNames.add(m.name)
          if (isLeader && m.name) officialLeaderNames.add(m.name)
        })
      }
    } catch (e) {}
  }
} catch (e) {
  console.warn('⚠️ 族谱缓存读取异常，将回退常规过滤:', e)
}

const pets = []
let skippedSkills = 0
let filteredSkills = 0
let keptPetEntries = 0
const MAX_STONE_SKILLS = 8

const SKILL_SRC = { '精灵技能': 0, '血脉技能': 1, '可学技能石': 2 }

/** 纯"造成X伤"类描述的字数（去标点空白后）——用于过滤无机制的低威力技能 */
const strippedLength = (text) => String(text || '').replace(/[\s，。、；：！？?!,.\-—…·（）()「」]/g, '').length

const entries = Object.values(petIndex).sort((a, b) => Number(a.seq) - Number(b.seq))
for (const entry of entries) {
  const variants = petDetail[String(entry.seq)]
  if (!variants || !variants.length) continue

  // 严格过滤低级阶段：
  // 1. 图鉴中明确标记为 I阶 或 II阶 的绝对是低级阶段，过滤
  if (entry.uiTag === 'I阶' || entry.uiTag === 'II阶') continue
  // 2. 在官方族谱中拥有后续进化阶段的，绝对是低级阶段，过滤（如雪绒鸟、冬羽雀、板板壳、咔咔壳等）
  if (evolutionNextNames.has(entry.name)) continue

  const ownSkills = []
  const stoneSkills = []
  const seen = new Set()
  const skillNames = (petSkills[String(entry.seq)] && petSkills[String(entry.seq)].skills) || []
  for (const item of skillNames) {
    if (seen.has(item.name)) continue
    const full = skillsData[item.name]
    if (!full || !full.name) {
      if (item.name) skippedSkills += 1
      continue
    }
    const normalized = normalizeBattleSkill({ ...full, name: item.name, skill_type: item.skill_type })
    if (!normalized.isDamageSkill) continue
    const hits = normalized.baseHits || 1
    // 过滤：威力<=60、单体、且描述只是"造成X伤"级别的短文本（无任何机制）
    if (normalized.power <= 60 && hits === 1 && strippedLength(normalized.describe) <= 16) {
      filteredSkills += 1
      continue
    }
    seen.add(item.name)
    // 紧凑格式（固定六位）: [技能名, 属性, 是否魔攻(0/1), 威力, 连击数, 来源(0精灵/1血脉/2技能石)]
    const compact = [
      normalized.name,
      normalized.attr,
      normalized.type === '魔攻' ? 1 : 0,
      normalized.power,
      hits,
      SKILL_SRC[item.skill_type] ?? 0
    ]
    if (item.skill_type === '可学技能石') stoneSkills.push(compact)
    else ownSkills.push(compact)
  }

  // 技能石数量多且实战使用少，只保留威力最高的若干个，控制悬浮窗数据体积
  const skillPower = (skill) => Number(skill[3] || 0) * (Number(skill[4] || 1))
  stoneSkills.sort((a, b) => skillPower(b) - skillPower(a))
  const skillPool = ownSkills.concat(stoneSkills.slice(0, MAX_STONE_SKILLS))

  // 紧凑格式: [id, 名称, [属性...], [六维], [技能...], 形态标记, 是否首领(0/1), 头像URL]
  // 每个形态单独成条，标明是否为首领化形态
  variants.forEach((variant, index) => {
    const race = variant.race || {}
    const title = variant.page_title || entry.name
    const isLeader = officialLeaderNames.has(title) || (entry.name !== '迪莫' && officialLeaderNames.has(entry.name)) || title.includes('首领')

    pets.push([
      Number(entry.seq) * 100 + index,
      title,
      variant.type || [],
      [
        Number(race.hp) || 0,
        Number(race.attack) || 0,
        Number(race.mattack) || 0,
        Number(race.defense) || 0,
        Number(race.mdefense) || 0,
        Number(race.speed) || 0
      ],
      skillPool,
      entry.uiTag || '最终形态',
      isLeader ? 1 : 0,
      variant.img || ''
    ])
    keptPetEntries += 1
  })
}

// 排序：常规最终形态在前（按 seq 升序），首领化形态排在最后（按 seq 升序）
pets.sort((a, b) => {
  const leaderA = Number(a[6]) || 0
  const leaderB = Number(b[6]) || 0
  if (leaderA !== leaderB) return leaderA - leaderB
  return Number(a[0]) - Number(b[0])
})

mkdirSync(join(root, 'static/float'), { recursive: true })
writeFileSync(outFile, JSON.stringify(pets), 'utf8')

const totalSkills = pets.reduce((sum, pet) => sum + ((pet[4] && pet[4].length) || 0), 0)
const sizeKb = Math.round(statSync(outFile).size / 1024)
console.log(`✅ 悬浮窗数据生成完成: static/float/float_data.json`)
console.log(`   最终形态+多形态条目 ${pets.length} 条，伤害技能 ${totalSkills} 个（已滤除 ${filteredSkills} 个无机制低威力技能），体积约 ${sizeKb}KB`)
if (skippedSkills) {
  console.log(`   ⚠️ ${skippedSkills} 条技能名未在技能库中找到（详情页无威力，已跳过）`)
}
