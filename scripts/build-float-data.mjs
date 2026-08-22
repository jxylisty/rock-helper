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
const MAX_STONE_SKILLS = 8

const entries = Object.values(petIndex).sort((a, b) => Number(a.seq) - Number(b.seq))
for (const entry of entries) {
  const variants = petDetail[String(entry.seq)]
  if (!variants || !variants.length) continue
  const main = Array.isArray(variants) ? variants[0] : variants

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
    seen.add(item.name)
    // 紧凑格式: [技能名, 属性, 是否魔攻(0/1), 威力, 连击数(省略为1)]
    const compact = [
      normalized.name,
      normalized.attr,
      normalized.type === '魔攻' ? 1 : 0,
      normalized.power,
      ...(normalized.baseHits > 1 ? [normalized.baseHits] : [])
    ]
    if (item.skill_type === '可学技能石') stoneSkills.push(compact)
    else ownSkills.push(compact)
  }

  // 技能石数量多且实战使用少，只保留威力最高的若干个，控制悬浮窗数据体积
  const skillPower = (skill) => Number(skill[3] || 0) * (Number(skill[4] || 1))
  stoneSkills.sort((a, b) => skillPower(b) - skillPower(a))

  // 紧凑格式: [id, 名称, [属性...], [hp,attack,mattack,defense,mdefense,speed], [技能...]]
  const race = main.race || {}
  pets.push([
    Number(entry.seq),
    entry.name,
    main.type || [],
    [
      Number(race.hp) || 0,
      Number(race.attack) || 0,
      Number(race.mattack) || 0,
      Number(race.defense) || 0,
      Number(race.mdefense) || 0,
      Number(race.speed) || 0
    ],
    ownSkills.concat(stoneSkills.slice(0, MAX_STONE_SKILLS))
  ])
}

mkdirSync(join(root, 'static/float'), { recursive: true })
writeFileSync(outFile, JSON.stringify(pets), 'utf8')

const totalSkills = pets.reduce((sum, pet) => sum + ((pet[4] && pet[4].length) || 0), 0)
const sizeKb = Math.round(statSync(outFile).size / 1024)
console.log(`✅ 悬浮窗数据生成完成: static/float/float_data.json`)
console.log(`   精灵 ${pets.length} 只，伤害技能 ${totalSkills} 个，体积约 ${sizeKb}KB`)
if (skippedSkills) {
  console.log(`   ⚠️ ${skippedSkills} 条技能名未在技能库中找到（详情页无威力，已跳过）`)
}
