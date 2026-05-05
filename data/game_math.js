import finalFormMap from './final_form_map.json';

const rawTypeEffectChart = {
  '普通': { strong: [], resist: ['地', '幽', '机械'], defenseResist: ['幽'], weak: ['武'] },
  '火': { strong: ['草', '冰', '虫', '机械'], resist: ['水', '地', '龙'], defenseResist: ['草', '冰', '虫', '萌', '机械'], weak: ['水', '地'] },
  '水': { strong: ['火', '地', '机械'], resist: ['草', '冰', '龙'], defenseResist: ['火', '机械'], weak: ['草', '电'] },
  '电': { strong: ['水', '翼'], resist: ['草', '地', '龙', '电'], defenseResist: ['电', '翼', '机械'], weak: ['地'] },
  '草': { strong: ['水', '光', '地'], resist: ['火', '龙', '毒', '虫', '翼', '机械'], defenseResist: ['水', '地', '电', '光'], weak: ['火', '冰', '毒', '虫', '翼'] },
  '冰': { strong: ['草', '地', '龙', '翼'], resist: ['火', '冰', '机械'], defenseResist: ['水', '冰', '光'], weak: ['火', '地', '武', '机械'] },
  '武': { strong: ['普通', '地', '冰', '恶', '机械'], resist: ['毒', '虫', '翼', '萌', '幽', '幻'], defenseResist: ['地', '虫', '恶'], weak: ['翼', '萌', '幻'] },
  '毒': { strong: ['草', '萌'], resist: ['地', '毒', '幽', '机械'], defenseResist: ['草', '毒', '虫', '武', '萌'], weak: ['地', '恶', '幻'] },
  '地': { strong: ['火', '冰', '电', '毒'], resist: ['草', '武'], defenseResist: ['普通', '火', '电', '毒', '翼'], weak: ['草', '冰', '水', '武', '机械'] },
  '翼': { strong: ['草', '虫', '武'], resist: ['地', '龙', '电', '机械'], defenseResist: ['草', '虫', '武'], weak: ['冰', '电'] },
  '萌': { strong: ['龙', '武', '恶'], resist: ['火', '毒', '机械'], defenseResist: ['虫', '武'], weak: ['毒', '恶', '机械'] },
  '虫': { strong: ['草', '恶', '幻'], resist: ['火', '毒', '武', '翼', '萌', '幽', '机械'], defenseResist: ['草', '武'], weak: ['火', '翼'] },
  '幽': { strong: ['光', '幽', '幻'], resist: ['普通', '恶'], defenseResist: ['普通', '毒', '虫', '武'], weak: ['光', '幽', '恶'] },
  '龙': { strong: ['龙'], resist: ['机械'], defenseResist: ['草', '火', '水', '电', '翼'], weak: ['冰', '龙', '萌'] },
  '恶': { strong: ['毒', '萌', '幽'], resist: ['光', '武', '恶'], defenseResist: ['幽', '恶'], weak: ['光', '虫', '武', '萌'] },
  '机械': { strong: ['地', '冰', '萌'], resist: ['火', '水', '电', '机械'], defenseResist: ['普通', '草', '冰', '龙', '毒', '虫', '翼', '萌', '机械', '幻'], weak: ['火', '水', '武'] },
  '光': { strong: ['幽', '恶'], resist: ['草', '冰'], defenseResist: ['恶', '幻'], weak: ['草', '幽'] },
  '幻': { strong: ['毒', '武'], resist: ['光', '机械', '幻'], defenseResist: ['武', '幻'], weak: ['虫', '幽'] }
};

const attrAliasMap = {
  '普通系': '普通',
  '草系': '草',
  '火系': '火',
  '水系': '水',
  '光系': '光',
  '地系': '地',
  '冰系': '冰',
  '龙系': '龙',
  '电系': '电',
  '毒系': '毒',
  '虫系': '虫',
  '武系': '武',
  '翼系': '翼',
  '恶系': '恶',
  '恶系': '恶',
  '恶': '恶',
  '机械系': '机械',
  '萌系': '萌',
  '幻系': '幻',
  '普通': '普通',
  '草': '草',
  '火': '火',
  '水': '水',
  '光': '光',
  '地': '地',
  '冰': '冰',
  '龙': '龙',
  '电': '电',
  '毒': '毒',
  '虫': '虫',
  '武': '武',
  '翼': '翼',
  '恶': '恶',
  '机械': '机械',
  '萌': '萌',
  '幻': '幻'
};

export const typeEffectChart = rawTypeEffectChart;

export function normalizeAttr(attr) {
  if (!attr) return '';
  const normalized = attrAliasMap[attr] || String(attr).replace(/系$/, '');
  return normalized === '恶' ? '恶' : normalized;
}

export function getAttrMultiplier(attackAttr, defenseAttrs = []) {
  const atkType = normalizeAttr(attackAttr);
  const chart = typeEffectChart[atkType];
  if (!chart) return 1;

  let strongCount = 0;
  let resistCount = 0;

  defenseAttrs.forEach((defAttr) => {
    const defType = normalizeAttr(defAttr);
    if (!defType) return;
    if (chart.strong.includes(defType)) {
      strongCount += 1;
    } else if (chart.resist.includes(defType)) {
      resistCount += 1;
    }
  });

  if (strongCount >= 2) return 3;
  if (strongCount === 1 && resistCount === 0) return 2;
  if (resistCount >= 2 && strongCount === 0) return 1 / 3;
  if (resistCount === 1 && strongCount === 0) return 0.5;
  return 1;
}

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
  if (value === 1 / 3) return '0.33x';
  return `${value}x`;
}

export function getRelationText(value) {
  if (value === 3) return '3倍克制';
  if (value === 2) return '2倍克制';
  if (value === 0.5) return '2倍抵抗';
  if (value === 1 / 3) return '3倍抵抗';
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

export function analyzeTeamTypeCoverage(teamSlots = []) {
  const members = (teamSlots || [])
    .filter((slot) => slot && slot.petId && Array.isArray(slot.types) && slot.types.length)
    .map((slot) => ({
      ...slot,
      normalizedTypes: normalizeTypeList(slot.types)
    }));

  const typeList = Object.keys(typeEffectChart).map(normalizeAttr).filter(Boolean);

  const missingCoverage = typeList
    .map((targetType) => {
      const bestMultiplier = members.reduce((best, member) => {
        const memberBest = getBestAttackMatchup(member.normalizedTypes, [targetType]).multiplier;
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
  panel = panel * natureMod + starBonus;

  return {
    value: Math.round(panel),
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
  return chain.sort((a, b) => a.id - b.id).at(-1) || pet;
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
          type: Array.isArray(detail.type) && detail.type.length ? detail.type : pet.type,
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
