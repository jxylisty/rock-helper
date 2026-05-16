import { petsDetail } from '../data/pets_detail.js';
import { petVariantDetails } from '../data/pet_variant_details.js';
import { buildBattlePetIndex } from '../src/utils/pvpBattlePetIndex.js';
import {
  generateAllBuilds,
  generateAttackerProfiles,
  generateDefenderProfiles
} from '../src/utils/pvpBuildGenerator.js';
import {
  analyzeDefensiveBreakpoints,
  analyzeOffensiveBreakpoints
} from '../src/utils/pvpBreakpointAnalyzer.js';
import { buildAvailableScenarioPresets, resolveBattleScenario } from '../src/utils/pvpScenarioPresetBuilder.js';
import { compareBuildValue } from '../src/utils/pvpBuildValueAnalyzer.js';

function getUnits() {
  return Object.values(buildBattlePetIndex(petsDetail, petVariantDetails)).filter((unit) => unit?.race && unit?.skills?.length);
}

function chooseBy(units, selector, excluded = []) {
  return [...units]
    .filter((unit) => !excluded.includes(unit.key))
    .sort((a, b) => selector(b) - selector(a))[0];
}

function findBuild(builds, predicate) {
  return builds.find(predicate);
}

function pct(value) {
  return `${value.toFixed(1)}%`;
}

function fmt(value) {
  return Number(value || 0).toFixed(1);
}

const units = getUnits();
const physicalAttacker = chooseBy(units, (unit) => (unit.race.attack || 0) + (unit.race.speed || 0));
const magicAttacker = chooseBy(units, (unit) => (unit.race.mattack || 0) + (unit.race.speed || 0), [physicalAttacker.key]);
const defender = chooseBy(units, (unit) => (unit.race.hp || 0) + (unit.race.defense || 0) + (unit.race.mdefense || 0), [physicalAttacker.key, magicAttacker.key]);
const targets = units.filter((unit) => ![physicalAttacker.key, magicAttacker.key, defender.key].includes(unit.key)).slice(0, 3);

const attackerBuilds = generateAllBuilds(physicalAttacker);
const defenderBuilds = generateAllBuilds(defender);

const neutralBuild = findBuild(attackerBuilds, (build) => build.nature.natureUp === null && build.nature.natureDown === null && build.ivAllocation.highStats.includes('attack') && build.ivAllocation.highStats.includes('speed') && build.ivAllocation.highStats.includes('hp'));
const speedBuild = findBuild(attackerBuilds, (build) => build.nature.natureUp === 'speed' && build.nature.natureDown === 'mattack' && build.ivAllocation.highStats.includes('attack') && build.ivAllocation.highStats.includes('speed') && build.ivAllocation.highStats.includes('hp'));
const attackBuild = findBuild(attackerBuilds, (build) => build.nature.natureUp === 'attack' && build.nature.natureDown === 'mattack' && build.ivAllocation.highStats.includes('attack') && build.ivAllocation.highStats.includes('speed') && build.ivAllocation.highStats.includes('hp'));
const hpBuild = findBuild(attackerBuilds, (build) => build.nature.natureUp === 'hp' && build.nature.natureDown === 'mattack' && build.ivAllocation.highStats.includes('attack') && build.ivAllocation.highStats.includes('speed') && build.ivAllocation.highStats.includes('hp'));
const defenseIvBuild = findBuild(attackerBuilds, (build) => build.nature.natureUp === null && build.nature.natureDown === null && build.ivAllocation.highStats.includes('attack') && build.ivAllocation.highStats.includes('hp') && build.ivAllocation.highStats.includes('defense'));
const mdefenseIvBuild = findBuild(attackerBuilds, (build) => build.nature.natureUp === null && build.nature.natureDown === null && build.ivAllocation.highStats.includes('attack') && build.ivAllocation.highStats.includes('hp') && build.ivAllocation.highStats.includes('mdefense'));

console.log('\n=== 1. 面板公式测试 ===');
console.log({
  pet: physicalAttacker.fullName,
  neutral: neutralBuild?.panel,
  speedNature: speedBuild?.panel,
  attackNature: attackBuild?.panel,
  hpNature: hpBuild?.panel,
  defenseIvShift: defenseIvBuild?.panel,
  mdefenseIvShift: mdefenseIvBuild?.panel
});

const offenseSkill = (physicalAttacker.skills || []).find((skill) => skill.type === '物攻' && Number(skill.power || 0) > 0)
  || (physicalAttacker.skills || []).find((skill) => skill.type === '魔攻' && Number(skill.power || 0) > 0);
const defenderProfiles = Object.fromEntries(targets.map((target) => [target.key, generateDefenderProfiles(target)]));
const offenseResults = analyzeOffensiveBreakpoints({
  attacker: physicalAttacker,
  attackerBuilds: [attackBuild],
  defenders: targets,
  defenderProfiles,
  skills: offenseSkill ? [offenseSkill] : [],
  scenario: {}
});

console.log('\n=== 2. 伤害线测试 ===');
targets.forEach((target) => {
  const rows = offenseResults.filter((item) => item.targetKey === target.key).slice(0, 5);
  console.log(`\n攻击方：${physicalAttacker.fullName}｜技能：${offenseSkill?.name}`);
  rows.forEach((row) => {
    console.log(`${target.fullName}｜${row.defenderProfileName}：${fmt(row.damage)} / ${fmt(row.targetHp)}，${pct(row.percent)}，${row.diff >= 0 ? `溢出 ${fmt(row.diff)}` : `差 ${fmt(Math.abs(row.diff))}`}`);
  });
});

const attackerProfiles = Object.fromEntries([physicalAttacker, magicAttacker, ...targets.slice(0, 1)].map((pet) => [pet.key, generateAttackerProfiles(pet)]));
const defenseResults = analyzeDefensiveBreakpoints({
  defender,
  defenderBuilds: [
    generateDefenderProfiles(defender, { builds: defenderBuilds }).find((item) => item.profileKey === 'standardProfile')
  ].filter(Boolean),
  attackers: [physicalAttacker, magicAttacker, ...targets.slice(0, 1)],
  attackerProfiles,
  scenario: {}
});

console.log('\n=== 3. 生存线测试 ===');
defenseResults.slice(0, 9).forEach((row) => {
  console.log(`${defender.fullName} 承受 ${row.attackerName}｜${row.attackerProfileName}｜${row.skillName}：${fmt(row.incomingDamage)} / ${fmt(row.defenderHp)}，${pct(row.percent)}，${row.diff >= 0 ? `剩余 ${fmt(row.diff)}` : `溢出 ${fmt(Math.abs(row.diff))}`}`);
});

const presetPet = magicAttacker;
const presetSkill = (presetPet.skills || []).find((skill) => String(skill.type || '').trim() === '状态');
const presetAttackSkill = (presetPet.skills || []).find((skill) => Number(skill.power || 0) > 0 && (skill.type === '物攻' || skill.type === '魔攻'));
const presetCatalog = buildAvailableScenarioPresets(presetPet, presetPet.skills || []);
const allPresets = [...presetCatalog.skillPresets, ...presetCatalog.traitPresets, ...presetCatalog.conditionalPresets]
  .filter((preset, index, list) => list.findIndex((candidate) => candidate.id === preset.id) === index);
const candidatePreset = allPresets
  .find((preset) => Object.values(preset.effects || {}).some((value) => value !== null && value !== undefined && value !== 0));
const baseScenario = resolveBattleScenario({ enabledPresets: [], manualScenario: {} });
const enabledScenario = resolveBattleScenario({ enabledPresets: candidatePreset ? [candidatePreset] : [], manualScenario: {} });
const presetTarget = targets[0];
const baseDamage = analyzeOffensiveBreakpoints({
  attacker: presetPet,
  attackerBuilds: [generateAttackerProfiles(presetPet)[0]],
  defenders: [presetTarget],
  defenderProfiles: { [presetTarget.key]: generateDefenderProfiles(presetTarget) },
  skills: presetAttackSkill ? [presetAttackSkill] : [],
  scenario: baseScenario
})[0];
const buffedDamage = analyzeOffensiveBreakpoints({
  attacker: presetPet,
  attackerBuilds: [generateAttackerProfiles(presetPet)[0]],
  defenders: [presetTarget],
  defenderProfiles: { [presetTarget.key]: generateDefenderProfiles(presetTarget) },
  skills: presetAttackSkill ? [presetAttackSkill] : [],
  scenario: enabledScenario
})[0];

console.log('\n=== 4. 条件预设测试 ===');
console.log({
  pet: presetPet.fullName,
  selectedStatusSkill: presetSkill?.name || '',
  baseDamage: baseDamage ? `${fmt(baseDamage.damage)} / ${fmt(baseDamage.targetHp)}，${pct(baseDamage.percent)}` : '无可用结果',
  availablePresets: allPresets.map((preset) => ({
    name: preset.name,
    description: preset.description,
    conditionText: preset.conditionText
  })),
  enabledPreset: candidatePreset ? candidatePreset.name : '未找到可启用数值预设',
  buffedDamage: buffedDamage ? `${fmt(buffedDamage.damage)} / ${fmt(buffedDamage.targetHp)}，${pct(buffedDamage.percent)}` : '无可用结果',
  enabledSources: enabledScenario.enabledSources
});

const compareResult = compareBuildValue({
  pet: physicalAttacker,
  targetPets: [magicAttacker, defender, ...targets],
  candidateBuilds: attackerBuilds
});

console.log('\n=== 推荐配置示例 ===');
console.log(compareResult.rankedBuilds.slice(0, 5).map((item) => ({
  buildName: item.buildName,
  score: item.score,
  recommendationLevel: item.recommendationLevel,
  tradeoffSummary: item.tradeoffSummary
})));
