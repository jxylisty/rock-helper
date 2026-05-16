import { calculateDamageFull, isDamageSkill } from './pvpDamageEngine.js'
import { generateAllBuilds, generateAttackerProfiles, generateDefenderProfiles } from './pvpBuildGenerator.js'

function scoreResult(result) {
  return Math.round(Number(result?.damage || 0))
}

export function analyzeOffensiveBreakpoints(pet = {}, target = {}, skill = null) {
  const builds = generateAllBuilds(pet)
  const profiles = generateDefenderProfiles(target)
  return builds.map((build) => {
    const profile = profiles[0] || { panel: {} }
    const result = calculateDamageFull({
      attackerPanel: build.panel,
      defenderPanel: profile.panel,
      skillPower: Number(skill?.power || 0),
      skillType: skill?.type,
      skillAttr: skill?.attr,
      attackerAttrs: pet?.attrs || [],
      defenderAttrs: target?.attrs || [],
      hits: skill?.baseHits || 1
    })
    return {
      build,
      profile,
      damage: scoreResult(result),
      score: scoreResult(result)
    }
  })
}

export function analyzeDefensiveBreakpoints(pet = {}, enemy = {}, skill = null) {
  const builds = generateAllBuilds(pet)
  const profiles = generateAttackerProfiles(enemy)
  return builds.map((build) => {
    const profile = profiles[0] || { panel: {} }
    const result = calculateDamageFull({
      attackerPanel: profile.panel,
      defenderPanel: build.panel,
      skillPower: Number(skill?.power || 0),
      skillType: skill?.type,
      skillAttr: skill?.attr,
      attackerAttrs: enemy?.attrs || [],
      defenderAttrs: pet?.attrs || [],
      hits: skill?.baseHits || 1
    })
    return {
      build,
      profile,
      damage: scoreResult(result),
      score: scoreResult(result)
    }
  })
}

export function analyzeSpeedBreakpoints(pet = {}) {
  return generateAllBuilds(pet).map((build) => ({
    build,
    speed: Number(build?.panel?.speed || 0)
  }))
}

export default {
  analyzeOffensiveBreakpoints,
  analyzeDefensiveBreakpoints,
  analyzeSpeedBreakpoints
}
