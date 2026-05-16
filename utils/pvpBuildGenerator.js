import { calculateAllPanels, isDamageSkill, repairText } from './pvpDamageEngine.js'

function makeBuild(key, label, race = {}, ivs = {}, natureUp = null, natureDown = null, buffs = {}) {
  return {
    key,
    label,
    ivs,
    natureUp,
    natureDown,
    panel: calculateAllPanels({ race, ivs, natureUp, natureDown, buffs })
  }
}

export function generateAllBuilds(pet = {}) {
  const race = pet?.race || {}
  return [
    makeBuild('speed', '极速', race, { speed: 10, attack: 10, hp: 10 }, 'speed', 'mattack'),
    makeBuild('attack', '物攻', race, { attack: 10, speed: 10, hp: 10 }, 'attack', 'mattack'),
    makeBuild('mattack', '魔攻', race, { mattack: 10, speed: 10, hp: 10 }, 'mattack', 'attack'),
    makeBuild('defense', '物耐', race, { hp: 10, defense: 10, speed: 10 }, 'defense', 'mattack'),
    makeBuild('mdefense', '魔耐', race, { hp: 10, mdefense: 10, speed: 10 }, 'mdefense', 'attack')
  ]
}

export function generateAttackerProfiles(pet = {}) {
  return [
    { key: 'standard', label: '常规输出', panel: calculateAllPanels({ race: pet?.race || {}, ivs: {}, buffs: {} }) },
    { key: 'speed', label: '极速输出', panel: calculateAllPanels({ race: pet?.race || {}, ivs: { speed: 10 }, buffs: {} }) },
    { key: 'attack', label: '极限物攻', panel: calculateAllPanels({ race: pet?.race || {}, ivs: { attack: 10 }, buffs: {} }) },
    { key: 'mattack', label: '极限魔攻', panel: calculateAllPanels({ race: pet?.race || {}, ivs: { mattack: 10 }, buffs: {} }) }
  ]
}

export function generateDefenderProfiles(pet = {}) {
  return [
    { key: 'standard', label: '常规配置', panel: calculateAllPanels({ race: pet?.race || {}, ivs: {}, buffs: {} }) },
    { key: 'defense', label: '极限物防', panel: calculateAllPanels({ race: pet?.race || {}, ivs: { defense: 10 }, buffs: {} }) },
    { key: 'mdefense', label: '极限魔防', panel: calculateAllPanels({ race: pet?.race || {}, ivs: { mdefense: 10 }, buffs: {} }) }
  ]
}

export { isDamageSkill, repairText }

export default {
  generateAllBuilds,
  generateAttackerProfiles,
  generateDefenderProfiles
}
