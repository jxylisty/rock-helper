import { generateAllBuilds, generateAttackerProfiles, generateDefenderProfiles } from './pvpBuildGenerator.js'
import { analyzeOffensiveBreakpoints, analyzeDefensiveBreakpoints, analyzeSpeedBreakpoints } from './pvpBreakpointAnalyzer.js'

export function analyzeBuildValues(pet = {}, target = {}) {
  return {
    builds: generateAllBuilds(pet),
    attackerProfiles: generateAttackerProfiles(target),
    defenderProfiles: generateDefenderProfiles(pet),
    offensiveBreakpoints: analyzeOffensiveBreakpoints(pet, target),
    defensiveBreakpoints: analyzeDefensiveBreakpoints(pet, target),
    speedBreakpoints: analyzeSpeedBreakpoints(pet)
  }
}

export default {
  analyzeBuildValues
}
