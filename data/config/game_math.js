import finalFormMap from './final_form_map.json';
import { typeEffectChart, normalizeAttr, getAttrMultiplier } from './typeChart.js';

export { typeEffectChart, normalizeAttr, normalizeAttrList, getAttrMultiplier } from './typeChart.js';

export function getMatchupSummary(attackAttr, defenseAttrs = []) {
  const atkType = normalizeAttr(attackAttr);
  const chart = typeEffectChart[atkType];
  if (!chart) {
    return {
      attackerType: atkType,
      multiplier: 1,
      strongCount: 0,
      resistCount: 0,
      matchedStrong: [],
      matchedResist: []
    };
  }

  const matchedStrong = [];
  const matchedResist = [];

  defenseAttrs.forEach((defAttr) => {
    const defType = normalizeAttr(defAttr);
    if (!defType) return;
    if (chart.strong.includes(defType)) matchedStrong.push(defType);
    if (chart.resist.includes(defType)) matchedResist.push(defType);
  });

  return {
    attackerType: atkType,
    multiplier: getAttrMultiplier(atkType, defenseAttrs),
    strongCount: matchedStrong.length,
    resistCount: matchedResist.length,
    matchedStrong,
    matchedResist
  };
}

export function getTypeMultiplierLabel(value) {
  if (value === 3) return '3x';
  if (value === 2) return '2x';
  if (value === 0.5) return '0.5x';
  if (value === 1 / 4) return '0.25x';
  return `${value}x`;
}

export function getRelationText(value) {
  if (value === 3) return '3倍克制';
  if (value === 2) return '2倍克制';
  if (value === 0.5) return '2倍抵抗';
  if (value === 1 / 4) return '4倍抵抗';
  return '等倍';
}

export function getBestAttackMatchup(attackTypes = [], defenseTypes = []) {
  const normalizedAttackTypes = normalizeTypeList(attackTypes);
  const normalizedDefenseTypes = normalizeTypeList(defenseTypes);

  if (!normalizedAttackTypes.length || !normalizedDefenseTypes.length) {
    return {
      attackType: '',
      multiplier: 1,
      label: getTypeMultiplierLabel(1),
      relationText: getRelationText(1)
    };
  }

  const firstType = normalizedAttackTypes[0];
  const firstMultiplier = getAttrMultiplier(firstType, normalizedDefenseTypes);
  const initial = {
    attackType: firstType,
    multiplier: firstMultiplier,
    label: getTypeMultiplierLabel(firstMultiplier),
    relationText: getRelationText(firstMultiplier)
  };

  return normalizedAttackTypes.slice(1).reduce((best, attackType) => {
    const multiplier = getAttrMultiplier(attackType, normalizedDefenseTypes);
    if (multiplier > best.multiplier) {
      return {
        attackType,
        multiplier,
        label: getTypeMultiplierLabel(multiplier),
        relationText: getRelationText(multiplier)
      };
    }
    return best;
  }, initial);
}

export function getSingleTypeSummary(type) {
  const normalizedType = normalizeAttr(type);
  const chart = typeEffectChart[normalizedType];
  if (!chart) {
    return {
      type: normalizedType,
      strong: [],
      resist: [],
      defenseResist: [],
      weak: []
    };
  }
  return {
    type: normalizedType,
    strong: [...chart.strong],
    resist: [...chart.resist],
    defenseResist: [...(chart.defenseResist || [])],
    weak: [...(chart.weak || [])]
  };
}

export function getTypeList() {
  return Object.keys(typeEffectChart).map(normalizeAttr).filter(Boolean);
}

const ATTACK_SKILL_TYPES = new Set(['物攻', '魔攻']);

export function isAttackSkill(skill) {
  return !!skill && ATTACK_SKILL_TYPES.has(String(skill.type || '').trim());
}

export function getSkillBattleAttr(skill) {
  if (!isAttackSkill(skill)) return '';
  return normalizeAttr(skill.attr);
}

export function getTeamAttackAttrs(teamSlots = []) {
  return (teamSlots || []).map((slot) => {
    const skills = Array.isArray(slot?.skills) ? slot.skills : [];
    const attrs = [];
    const seen = new Set();

    skills.forEach((skill) => {
      const attr = getSkillBattleAttr(skill);
      if (!attr || seen.has(attr)) return;
      seen.add(attr);
      attrs.push(attr);
    });

    return {
      ...slot,
      attackAttrs: attrs,
      attackSkillCount: attrs.length
    };
  });
}

export function getTeamBloodlineSkill(teamSlots = []) {
  return (teamSlots || []).map((slot) => {
    const skills = Array.isArray(slot?.skills) ? slot.skills : [];
    const bloodlineSkill = skills.find((skill) => String(skill?.skillType || '').trim() === '血脉技能' && getSkillBattleAttr(skill));
    return {
      ...slot,
      bloodlineSkill: bloodlineSkill
        ? {
            name: bloodlineSkill.name || '',
            attr: getSkillBattleAttr(bloodlineSkill),
            type: String(bloodlineSkill.type || '').trim(),
            power: Number(bloodlineSkill.power) || 0
          }
        : null
    };
  });
}

export function analyzeTeamTypeCoverage(teamSlots = []) {
  const members = getTeamAttackAttrs(teamSlots)
    .filter((slot) => slot && slot.petId && Array.isArray(slot.types) && slot.types.length)
    .map((slot) => ({
      ...slot,
      normalizedTypes: normalizeTypeList(slot.types)
    }));

  const typeList = getTypeList();

  const missingCoverage = typeList
    .map((targetType) => {
      const bestMultiplier = members.reduce((best, member) => {
        const memberBest = getBestAttackMatchup(member.attackAttrs, [targetType]).multiplier;
        return Math.max(best, memberBest);
      }, 1);

      return {
        type: targetType,
        bestMultiplier,
        covered: bestMultiplier > 1
      };
    })
    .filter((item) => !item.covered);

  const threatTypes = typeList
    .map((attackType) => {
      const threatenedMembers = [];
      const resistedMembers = [];

      members.forEach((member) => {
        const multiplier = getAttrMultiplier(attackType, member.normalizedTypes);
        if (multiplier > 1) {
          threatenedMembers.push({
            petId: member.petId,
            name: member.petName,
            multiplier
          });
        } else if (multiplier < 1) {
          resistedMembers.push({
            petId: member.petId,
            name: member.petName,
            multiplier
          });
        }
      });

      return {
        type: attackType,
        threatenedCount: threatenedMembers.length,
        resistedCount: resistedMembers.length,
        threatenedMembers,
        resistedMembers,
        maxMultiplier: threatenedMembers.reduce((best, item) => Math.max(best, item.multiplier), 1)
      };
    })
    .filter((item) => item.threatenedCount > 0)
    .sort((a, b) => {
      if (b.threatenedCount !== a.threatenedCount) return b.threatenedCount - a.threatenedCount;
      return b.maxMultiplier - a.maxMultiplier;
    });

  const alertThreshold = members.length >= 4 ? Math.ceil(members.length * 0.5) : 2;
  const alerts = threatTypes.filter((item) => item.threatenedCount >= alertThreshold);

  return {
    memberCount: members.length,
    missingCoverage,
    threatTypes,
    alerts
  };
}

function scoreBloodlineOption(slot, bloodlineAttr, context) {
  const normalizedBloodlineAttr = normalizeAttr(bloodlineAttr);
  const chart = typeEffectChart[normalizedBloodlineAttr];
  if (!normalizedBloodlineAttr || !chart) {
    return null;
  }

  const threatTypes = Array.isArray(slot.threatTypes) ? slot.threatTypes : [];
  const teamGapTypes = Array.isArray(context.teamGapTypes) ? context.teamGapTypes : [];
  const offensiveAttrs = Array.isArray(slot.attackAttrs) ? slot.attackAttrs : [];
  const attackPanel = Number(slot.panel?.attack) || 0;
  const magicAttackPanel = Number(slot.panel?.mattack) || 0;
  const bestAttackPanel = Math.max(attackPanel, magicAttackPanel, 1);
  const attackMode = attackPanel >= magicAttackPanel ? '物理' : '魔法';
  const currentBloodlineAttr = normalizeAttr(slot.bloodlineSkill?.attr || '');
  const usedAttrs = context.usedAttrs || new Set();

  let threatScore = 0;
  let teamGapScore = 0;
  let coverageTypes = [];
  let counterTypes = [];

  threatTypes.forEach((type) => {
    const multiplier = getAttrMultiplier(normalizedBloodlineAttr, [type]);
    if (multiplier > 1) {
      threatScore += multiplier === 3 ? 4 : 2;
      coverageTypes.push(type);
    }
  });

  teamGapTypes.forEach((type) => {
    const multiplier = getAttrMultiplier(normalizedBloodlineAttr, [type]);
    if (multiplier > 1) {
      teamGapScore += multiplier === 3 ? 2 : 1;
      counterTypes.push(type);
    }
  });

  const offenseDiversityBonus = offensiveAttrs.includes(normalizedBloodlineAttr) ? 0 : 0.6;
  const statScore = bestAttackPanel / Math.max(context.teamBestAttackPanel || bestAttackPanel, 1);
  const currentBonus = currentBloodlineAttr === normalizedBloodlineAttr ? 0.9 : 0;
  const duplicatePenalty = usedAttrs.has(normalizedBloodlineAttr) && currentBloodlineAttr !== normalizedBloodlineAttr ? 2.6 : 0;

  const score =
    threatScore * 2.4 +
    teamGapScore * 1.5 +
    statScore * 2.2 +
    offenseDiversityBonus +
    currentBonus -
    duplicatePenalty;

  return {
    attr: normalizedBloodlineAttr,
    score,
    attackMode,
    threatScore,
    teamGapScore,
    statScore,
    coverageTypes: [...new Set(coverageTypes)],
    counterTypes: [...new Set(counterTypes)],
    currentBloodlineAttr
  };
}

export function recommendBloodlines(teamSlots = []) {
  const members = getTeamBloodlineSkill(getTeamAttackAttrs(teamSlots))
    .filter((slot) => slot && slot.petId && Array.isArray(slot.types) && slot.types.length)
    .map((slot) => {
      const normalizedTypes = normalizeTypeList(slot.types);
      const threatTypes = getTypeList().filter((type) => getAttrMultiplier(type, normalizedTypes) > 1);
      return {
        ...slot,
        normalizedTypes,
        threatTypes
      };
    });

  const teamAttackAttrs = members.flatMap((slot) => slot.attackAttrs || []);
  const missingCoverage = getTypeList().filter((targetType) => {
    return members.every((member) => getBestAttackMatchup(member.attackAttrs, [targetType]).multiplier <= 1);
  });

  const teamBestAttackPanel = members.reduce((best, slot) => {
    const slotBest = Math.max(Number(slot.panel?.attack) || 0, Number(slot.panel?.mattack) || 0);
    return Math.max(best, slotBest);
  }, 0);

  const sortedMembers = [...members].sort((a, b) => {
    const aWeakCount = a.threatTypes.length;
    const bWeakCount = b.threatTypes.length;
    if (bWeakCount !== aWeakCount) return bWeakCount - aWeakCount;
    const aBest = Math.max(Number(a.panel?.attack) || 0, Number(a.panel?.mattack) || 0);
    const bBest = Math.max(Number(b.panel?.attack) || 0, Number(b.panel?.mattack) || 0);
    return bBest - aBest;
  });

  const candidateAttrs = getTypeList();
  const beamWidth = 24;
  let states = [
    {
      score: 0,
      usedAttrs: new Set(),
      assignments: []
    }
  ];

  sortedMembers.forEach((slot) => {
    const scoredCandidates = candidateAttrs
      .map((attr) =>
        scoreBloodlineOption(slot, attr, {
          teamGapTypes: missingCoverage,
          usedAttrs: new Set(),
          teamBestAttackPanel
        })
      )
      .filter(Boolean)
      .sort((a, b) => b.score - a.score)
      .slice(0, 6);

    const nextStates = [];

    states.forEach((state) => {
      scoredCandidates.forEach((candidate) => {
        if (state.usedAttrs.has(candidate.attr)) return;
        const adjusted = scoreBloodlineOption(slot, candidate.attr, {
          teamGapTypes: missingCoverage,
          usedAttrs: state.usedAttrs,
          teamBestAttackPanel
        });
        if (!adjusted) return;

        const nextUsedAttrs = new Set(state.usedAttrs);
        nextUsedAttrs.add(candidate.attr);

        nextStates.push({
          score: state.score + adjusted.score,
          usedAttrs: nextUsedAttrs,
          assignments: [
            ...state.assignments,
            {
              petId: slot.petId,
              petName: slot.petName,
              attr: candidate.attr,
              score: adjusted.score,
              attackMode: adjusted.attackMode,
              threatTypes: adjusted.coverageTypes,
              counterTypes: adjusted.counterTypes,
              currentBloodlineAttr: adjusted.currentBloodlineAttr,
              bestAttackPanel: Math.max(Number(slot.panel?.attack) || 0, Number(slot.panel?.mattack) || 0)
            }
          ]
        });
      });
    });

    nextStates.sort((a, b) => b.score - a.score);
    states = nextStates.slice(0, beamWidth);
  });

  const bestState = states[0] || { assignments: [] };
  const assignedMap = new Map(bestState.assignments.map((item) => [String(item.petId), item]));

  const results = members.map((slot) => {
    const picked = assignedMap.get(String(slot.petId));
    const candidates = candidateAttrs
      .map((attr) =>
        scoreBloodlineOption(slot, attr, {
          teamGapTypes: missingCoverage,
          usedAttrs: new Set(),
          teamBestAttackPanel
        })
      )
      .filter(Boolean)
      .sort((a, b) => b.score - a.score)
      .slice(0, 3);

    return {
      petId: slot.petId,
      petName: slot.petName,
      currentBloodlineAttr: slot.bloodlineSkill?.attr || '',
      recommendedAttr: picked?.attr || candidates[0]?.attr || '',
      recommendedMode: picked?.attackMode || candidates[0]?.attackMode || '物理',
      bestAttackPanel: Math.max(Number(slot.panel?.attack) || 0, Number(slot.panel?.mattack) || 0),
      weakTypes: slot.threatTypes,
      candidates,
      counterTypes: picked?.counterTypes || [],
      score: picked?.score || candidates[0]?.score || 0
    };
  });

  const selectedAttrs = results.map((item) => item.recommendedAttr).filter(Boolean);
  const uniqueAttrCount = new Set(selectedAttrs).size;

  return {
    memberCount: members.length,
    assignedCount: results.filter((item) => item.recommendedAttr).length,
    uniqueAttrCount,
    duplicateCount: Math.max(0, selectedAttrs.length - uniqueAttrCount),
    teamGapTypes: missingCoverage,
    teamAttackAttrs,
    plan: results
  };
}

export const natureOptions = ['无', '生命', '物攻', '魔攻', '物防', '魔防', '速度'];

export const statAttrMap = {
  '生命': 'hp',
  '物攻': 'attack',
  '魔攻': 'mattack',
  '物防': 'defense',
  '魔防': 'mdefense',
  '速度': 'speed'
};

const natureAttrAliasMap = {
  none: '无',
  hp: '生命',
  attack: '物攻',
  magicAttack: '魔攻',
  mattack: '魔攻',
  defense: '物防',
  magicDefense: '魔防',
  mdefense: '魔防',
  speed: '速度',
  '无': '无',
  '生命': '生命',
  '物攻': '物攻',
  '魔攻': '魔攻',
  '物防': '物防',
  '魔防': '魔防',
  '速度': '速度'
};

function bankerRound(x) {
  const f = Math.floor(x);
  const r = x - f;
  if (r < 0.5) return f;
  if (r > 0.5) return f + 1;
  return f % 2 === 0 ? f : f + 1;
}

export function calculatePanelValue(raceValue, ivValue, level, star, attrKey, natureUp, natureDown) {
  const iv = Math.max(0, Math.min(10, Number(ivValue) || 0)) * (star + 1);
  const lv = Math.max(1, Number(level) || 1);
  const race = Number(raceValue) || 0;
  const base = race * 0.5 + iv * 0.25 + 10;
  const perLevelGrowth = (race + iv * 0.5) * (attrKey === 'hp' ? 0.02 : 0.01) + (attrKey === 'hp' ? 1 : 0);
  let panel = base + lv * perLevelGrowth;

  let natureMod = 1;
  const attrName = Object.keys(statAttrMap).find((key) => statAttrMap[key] === attrKey);
  if (natureUp === attrName) {
    natureMod = 1 + (star === 0 ? 0 : star === 1 ? 0.12 : star === 2 ? 0.14 : star === 3 ? 0.16 : star === 4 ? 0.18 : 0.2);
  } else if (natureDown === attrName) {
    natureMod = 0.9;
  }

  const starBonus = attrKey === 'hp' ? star * 20 : star * 10;
  let preNaturePanel = Math.floor(panel);
  let postNaturePanel = Math.round(preNaturePanel * natureMod + 0.0000001);
  let finalPanel = postNaturePanel + starBonus;

  return {
    value: finalPanel,
    growth: Math.round(perLevelGrowth * 100) / 100
  };
}

export function calculateAllPanels(race, level, star, ivs, natureUp, natureDown) {
  if (!race) return null;

  const hp = calculatePanelValue(race.hp, ivs.hp, level, star, 'hp', natureUp, natureDown);
  const attack = calculatePanelValue(race.attack, ivs.attack, level, star, 'attack', natureUp, natureDown);
  const mattack = calculatePanelValue(race.mattack, ivs.mattack, level, star, 'mattack', natureUp, natureDown);
  const defense = calculatePanelValue(race.defense, ivs.defense, level, star, 'defense', natureUp, natureDown);
  const mdefense = calculatePanelValue(race.mdefense, ivs.mdefense, level, star, 'mdefense', natureUp, natureDown);
  const speed = calculatePanelValue(race.speed, ivs.speed, level, star, 'speed', natureUp, natureDown);

  return {
    hp: hp.value,
    attack: attack.value,
    mattack: mattack.value,
    defense: defense.value,
    mdefense: mdefense.value,
    speed: speed.value,
    growth: {
      hp: hp.growth,
      attack: attack.growth,
      mattack: mattack.growth,
      defense: defense.growth,
      mdefense: mdefense.growth,
      speed: speed.growth
    }
  };
}

export function normalizeTypeList(types = []) {
  return types.map(normalizeAttr).filter(Boolean);
}

export function getNatureModifier(natureUp, natureDown, statName, star = 5) {
  const upBonus = star === 0 ? 0 : star === 1 ? 0.12 : star === 2 ? 0.14 : star === 3 ? 0.16 : star === 4 ? 0.18 : 0.2;
  if (natureUp === statName) return 1 + upBonus;
  if (natureDown === statName) return 0.9;
  return 1;
}

export function calculatePetPanel(pet, config = {}) {
  const race = pet?.race || {};
  const level = Number(config.level) || 1;
  const star = Number(config.star) || 0;
  const rawIvs = config.ivs || {};
  const ivs = {
    hp: Number(rawIvs.hp) || 0,
    attack: Number(rawIvs.attack) || 0,
    mattack: Number(rawIvs.mattack ?? rawIvs.magicAttack) || 0,
    defense: Number(rawIvs.defense) || 0,
    mdefense: Number(rawIvs.mdefense ?? rawIvs.magicDefense) || 0,
    speed: Number(rawIvs.speed) || 0
  };
  const natureUp = natureAttrAliasMap[config.natureUp] || config.natureUp || '无';
  const natureDown = natureAttrAliasMap[config.natureDown] || config.natureDown || '无';

  return calculateAllPanels(race, level, star, ivs, natureUp, natureDown);
}

export function createEmptyTeam() {
  return Array.from({ length: 6 }, () => ({
    petId: null,
    level: 60,
    star: 5,
    natureUpIndex: 0,
    natureDownIndex: 0,
    ivs: {
      hp: 0,
      attack: 0,
      mattack: 0,
      defense: 0,
      mdefense: 0,
      speed: 0
    }
  }));
}

export function getFinalForm(pet, allPets = [], allPetDetails = {}) {
  if (!pet) return null;
  const normalizeTrait = (value) => String(value || '').replace(/\s+/g, '').trim();
  const petDetail = allPetDetails[String(pet.id)] || {};
  const petTrait = normalizeTrait(petDetail.trait || pet.trait || '');

  const mappedId = finalFormMap[String(pet.id)];
  if (mappedId && petTrait) {
    const mappedPet = allPets.find((item) => item.id === mappedId);
    if (mappedPet) {
      const mappedDetail = allPetDetails[String(mappedPet.id)] || {};
      const mappedTrait = normalizeTrait(mappedDetail.trait || mappedPet.trait || '');
      if (mappedTrait && mappedTrait === petTrait) {
        return mappedPet;
      }
    }
  }

  if (!petTrait) {
    return pet;
  }

  const chain = allPets.filter((item) => {
    const detail = allPetDetails[String(item.id)] || {};
    const itemTrait = normalizeTrait(detail.trait || item.trait || '');
    return itemTrait && itemTrait === petTrait;
  });

  if (!chain.length) return pet;
  // 兼容老 WebView（不支持 ES2022 的 Array.prototype.at）
  const sorted = chain.sort((a, b) => a.id - b.id);
  return sorted[sorted.length - 1] || pet;
}

export function getHighestFormPets(allPets = [], allPetDetails = {}) {
  const finalMap = new Map();

  allPets.forEach((pet) => {
    const finalForm = getFinalForm(pet, allPets, allPetDetails) || pet;
    if (!finalForm || finalMap.has(finalForm.id)) return;
    finalMap.set(finalForm.id, finalForm);
  });

  return Array.from(finalMap.values()).sort((a, b) => a.id - b.id);
}

export function getSpeedRankEntries(allPets = [], petSpeedMap = {}, allPetVariants = {}, allVariantDetails = {}) {
  const highestPets = getHighestFormPets(allPets, {});
  const entries = [];

  highestPets.forEach((pet) => {
    const baseSpeed = Number(petSpeedMap[String(pet.id)] || 0);
    const variantImages = Array.isArray(allPetVariants[String(pet.id)]) ? allPetVariants[String(pet.id)] : [];
    const variantMap = allVariantDetails[String(pet.id)] || {};

    const variantEntries = variantImages
      .map((image) => {
        const detail = variantMap[image];
        const speed = Number(detail?.race?.speed);
        if (!detail || !speed) return null;
        return {
          id: pet.id,
          variantImage: image,
          variantName: detail.fullName || detail.name || pet.name,
          name: detail.fullName || detail.name || pet.name,
          img: detail.img || image || pet.img,
          type: pet.type,
          speed,
          isVariant: true
        };
      })
      .filter(Boolean);

    const hasDifferentVariantSpeed = variantEntries.some((item) => item.speed !== baseSpeed);

    if (hasDifferentVariantSpeed) {
      const seen = new Set();
      variantEntries.forEach((item) => {
        const key = `${item.name}|${item.img}|${item.speed}`;
        if (seen.has(key)) return;
        seen.add(key);
        entries.push(item);
      });
      return;
    }

    entries.push({
      ...pet,
      name: pet.name,
      img: pet.img,
      type: pet.type,
      speed: baseSpeed,
      isVariant: false
    });
  });

  return entries.sort((a, b) => {
    if (b.speed !== a.speed) return b.speed - a.speed;
    if (a.id !== b.id) return a.id - b.id;
    return String(a.name || '').localeCompare(String(b.name || ''));
  });
}

export function searchPetsBySkill(skillName, allPets = [], allPetDetails = {}) {
  if (!skillName) return [];
  const keyword = skillName.trim();
  const resultMap = new Map();

  allPets
    .filter((pet) => {
      const detail = allPetDetails[String(pet.id)];
      const skills = detail?.skills || [];
      return skills.some((skill) => skill.name === keyword);
    })
    .forEach((pet) => {
      const finalForm = getFinalForm(pet, allPets, allPetDetails);
      const key = String(finalForm?.id || pet.id);
      if (!resultMap.has(key)) {
        resultMap.set(key, {
          ...finalForm,
          basePet: pet,
          finalForm
        });
      }
    });

  return Array.from(resultMap.values()).sort((a, b) => a.id - b.id);
}
