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

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const outFile = join(root, 'static/float/float_data.json')

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

  // 照搬图鉴"最终形态"标签（148 只）+ 含多形态的条目（地区形态种族值/技能池不同）
  const isFinal = entry.uiTag === '最终形态'
  const hasMultiForms = variants.length > 1
  if (!isFinal && !hasMultiForms) continue

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

  // 紧凑格式: [id, 名称, [属性...], [六维], [技能...], 形态标记]
  // 多形态条目：每个形态单独成条（种族值不同），名称带形态后缀，技能池共用图鉴 seq
  if (hasMultiForms) {
    variants.forEach((variant, index) => {
      const race = variant.race || {}
      pets.push([
        Number(entry.seq) * 100 + index,
        variant.page_title || entry.name,
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
        entry.uiTag || '其他'
      ])
      keptPetEntries += 1
    })
  } else {
    const race = variants[0].race || {}
    pets.push([
      Number(entry.seq),
      variants[0].page_title || entry.name,
      variants[0].type || [],
      [
        Number(race.hp) || 0,
        Number(race.attack) || 0,
        Number(race.mattack) || 0,
        Number(race.defense) || 0,
        Number(race.mdefense) || 0,
        Number(race.speed) || 0
      ],
      skillPool,
      entry.uiTag || '最终形态'
    ])
    keptPetEntries += 1
  }
}

mkdirSync(join(root, 'static/float'), { recursive: true })
writeFileSync(outFile, JSON.stringify(pets), 'utf8')

const totalSkills = pets.reduce((sum, pet) => sum + ((pet[4] && pet[4].length) || 0), 0)
const sizeKb = Math.round(statSync(outFile).size / 1024)
console.log(`✅ 悬浮窗数据生成完成: static/float/float_data.json`)
console.log(`   最终形态+多形态条目 ${pets.length} 条，伤害技能 ${totalSkills} 个（已滤除 ${filteredSkills} 个无机制低威力技能），体积约 ${sizeKb}KB`)
if (skippedSkills) {
  console.log(`   ⚠️ ${skippedSkills} 条技能名未在技能库中找到（详情页无威力，已跳过）`)
}
