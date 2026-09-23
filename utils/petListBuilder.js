/**
 * 精灵列表构建工具
 * 统一从 petIndex + petDetail 构建前端所需的精灵列表
 * 所有页面应优先使用此模块，不要各自重复构建
 */

import { petIndex } from '@/data/pet/pet_index.js'
import { petDetail } from '@/data/pet/pet_detail.js'
import { petSkills } from '@/data/pet/pet_skills.js'
import { getData } from '@/utils/dataHotUpdate.js'

// 数据热更新覆盖层（2026-09-16）：热更版数据存在时优先使用，否则回退打包内置数据。
// 热更机制见 utils/dataHotUpdate.js——仅更新数据，不改功能逻辑。
const _hotPetIndex = getData('petIndex', null)
const _hotPetDetail = getData('petDetail', null)
const _hotPetSkills = getData('petSkills', null)
const _petIndex = _hotPetIndex || petIndex
const _petDetail = _hotPetDetail || petDetail
const _petSkills = _hotPetSkills || petSkills

/**
 * 构建基础精灵列表（每个 wikiId 只保留主形态）
 * 返回格式: [{ id, name, type, img, seq, wikiId }]
 */
export function buildBasePetList() {
  const seen = new Set()
  const result = []
  for (const [k, v] of Object.entries(_petIndex)) {
    if (!seen.has(v.wikiId)) {
      seen.add(v.wikiId)
      const detail = _petDetail[String(v.seq)]?.[0]
      result.push({
        id: v.seq,
        name: v.name,
        type: detail?.type || [],
        img: detail?.img || '',
        seq: v.seq,
        wikiId: v.wikiId,
        uiTag: v.uiTag || '其他'
      })
    }
  }
  return result.sort((a, b) => a.id - b.id)
}

/**
 * 获取指定精灵的变体图片列表（含本体）
 * @param {number|string} seq - 精灵序号
 * @returns {string[]} 图片路径数组
 */
export function getPetVariants(seq) {
  const variants = _petDetail[String(seq)]
  if (!Array.isArray(variants)) return []
  return variants.map((v) => v.img).filter(Boolean)
}

/**
 * 获取指定精灵的变体详情列表
 * @param {number|string} seq - 精灵序号
 * @returns {Array} 变体详情数组
 */
export function getPetVariantDetails(seq) {
  return _petDetail[String(seq)] || []
}

/**
 * 获取指定精灵的技能名列表
 * @param {number|string} seq - 精灵序号
 * @returns {Array<{name, level, skill_type}>}
 */
export function getPetSkillNames(seq) {
  const entry = _petSkills[String(seq)]
  if (!entry || !Array.isArray(entry.skills)) return []
  return entry.skills
}

/**
 * 判断精灵是否有多个形态（变体）
 * @param {number|string} seq - 精灵序号
 * @returns {boolean}
 */
export function hasMultipleForms(seq) {
  const variants = _petDetail[String(seq)]
  return Array.isArray(variants) && variants.length > 1
}

/** 缓存实例，避免重复计算 */
let _cachedBaseList = null

/**
 * 获取缓存的基础精灵列表（首次调用时构建）
 * @returns {Array}
 */
export function getBasePetList() {
  if (!_cachedBaseList) {
    _cachedBaseList = buildBasePetList()
  }
  return _cachedBaseList
}
