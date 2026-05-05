import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

import { pets } from '../data/pets.js'
import { petsDetail } from '../data/pets_detail.js'
import { petVariants } from '../data/pet_variants.js'
import { petVariantDetails } from '../data/pet_variant_details.js'
import { petTraitImages } from '../data/pet_trait_images.js'
import { petYise } from '../data/pet_yise.js'
import { skillIcons } from '../data/skill_icons.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const root = path.resolve(__dirname, '..')
const staticRoot = path.join(root, 'staging', 'remote_static_backup')

function localAssetExists(assetPath) {
  if (!assetPath || typeof assetPath !== 'string') return false
  if (!assetPath.startsWith('/static/')) return true
  const rel = assetPath.replace(/^\/static\//, '').replace(/\//g, path.sep)
  return fs.existsSync(path.join(staticRoot, rel))
}

function hasCompleteRace(race) {
  if (!race || typeof race !== 'object') return false
  const keys = ['hp', 'attack', 'mattack', 'defense', 'mdefense', 'speed', 'total']
  return keys.every((key) => Number.isFinite(Number(race[key])))
}

function hasUsableSkills(skills) {
  return Array.isArray(skills) && skills.some((skill) => String(skill?.name || '').trim())
}

function hasUsableTypes(types) {
  return Array.isArray(types) && types.some((type) => String(type || '').trim())
}

const issues = []

for (const pet of pets) {
  const id = String(pet.id)
  const detail = petsDetail[id]

  if (!String(pet.name || '').trim()) {
    issues.push({ type: 'pet_name_blank', id })
  }
  if (!hasUsableTypes(pet.type)) {
    issues.push({ type: 'pet_type_blank', id, name: pet.name })
  }
  if (!String(pet.img || '').trim()) {
    issues.push({ type: 'pet_img_blank', id, name: pet.name })
  } else if (!localAssetExists(pet.img)) {
    issues.push({ type: 'pet_img_missing_file', id, name: pet.name, img: pet.img })
  }

  if (!detail) {
    issues.push({ type: 'pet_detail_missing', id, name: pet.name })
    continue
  }
  if (!hasCompleteRace(detail.race)) {
    issues.push({ type: 'pet_race_incomplete', id, name: pet.name })
  }
  if (!hasUsableSkills(detail.skills)) {
    issues.push({ type: 'pet_skills_empty', id, name: pet.name })
  }
  if (!String(detail.trait || '').trim()) {
    issues.push({ type: 'pet_trait_blank', id, name: pet.name })
  }

  const traitImg = petTraitImages[id]
  if (traitImg && !localAssetExists(traitImg)) {
    issues.push({ type: 'pet_trait_img_missing_file', id, name: pet.name, img: traitImg })
  }

  const yiseImg = petYise[id]?.img
  if (yiseImg && !localAssetExists(yiseImg)) {
    issues.push({ type: 'pet_yise_img_missing_file', id, name: pet.name, img: yiseImg })
  }
}

for (const [id, images] of Object.entries(petVariants)) {
  const variantMap = petVariantDetails[id] || {}

  if (!Array.isArray(images) || images.length === 0) {
    issues.push({ type: 'variant_list_empty', id })
    continue
  }

  for (const image of images) {
    if (!localAssetExists(image)) {
      issues.push({ type: 'variant_img_missing_file', id, img: image })
    }

    const info = variantMap[image]
    if (!info) {
      issues.push({ type: 'variant_detail_missing', id, img: image })
      continue
    }
    if (!hasUsableTypes(info.type)) {
      issues.push({ type: 'variant_type_blank', id, img: image })
    }
    if (!hasCompleteRace(info.race)) {
      issues.push({ type: 'variant_race_incomplete', id, img: image })
    }
    if (!hasUsableSkills(info.skills)) {
      issues.push({ type: 'variant_skills_empty', id, img: image })
    }
    if (!String(info.trait || '').trim()) {
      issues.push({ type: 'variant_trait_blank', id, img: image })
    }
    if (info.traitImage && !localAssetExists(info.traitImage)) {
      issues.push({ type: 'variant_trait_img_missing_file', id, img: image, traitImage: info.traitImage })
    }
  }

  for (const extraImage of Object.keys(variantMap)) {
    if (!images.includes(extraImage)) {
      issues.push({ type: 'variant_detail_orphan', id, img: extraImage })
    }
  }
}

for (const [skillName, iconPath] of Object.entries(skillIcons)) {
  if (!String(iconPath || '').trim()) {
    issues.push({ type: 'skill_icon_blank', skillName })
  } else if (!localAssetExists(iconPath)) {
    issues.push({ type: 'skill_icon_missing_file', skillName, img: iconPath })
  }
}

const grouped = issues.reduce((acc, issue) => {
  acc[issue.type] = acc[issue.type] || []
  acc[issue.type].push(issue)
  return acc
}, {})

const order = [
  'pet_detail_missing',
  'variant_detail_missing',
  'pet_img_missing_file',
  'variant_img_missing_file',
  'pet_race_incomplete',
  'variant_race_incomplete',
  'pet_skills_empty',
  'variant_skills_empty',
  'pet_trait_blank',
  'variant_trait_blank',
  'pet_trait_img_missing_file',
  'variant_trait_img_missing_file',
  'pet_yise_img_missing_file',
  'variant_detail_orphan',
  'skill_icon_missing_file',
  'pet_name_blank',
  'pet_type_blank',
  'variant_type_blank',
  'pet_img_blank',
  'skill_icon_blank',
  'variant_list_empty'
]

for (const key of order) {
  const items = grouped[key]
  if (!items?.length) continue
  console.log(`## ${key}: ${items.length}`)
  for (const item of items.slice(0, 20)) {
    console.log(JSON.stringify(item))
  }
}

console.log('TOTAL', issues.length)
