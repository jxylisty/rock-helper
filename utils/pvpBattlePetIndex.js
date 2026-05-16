import { pets } from '../data/pets.js';
import { normalizeAttrList, repairText } from './pvpDamageEngine.js';

function toObject(value) {
  return value && typeof value === 'object' ? value : {};
}

function getCatalogMap() {
  return (Array.isArray(pets) ? pets : []).reduce((map, pet) => {
    map.set(String(pet.id), pet);
    return map;
  }, new Map());
}

function normalizeSkillList(skills = []) {
  return (Array.isArray(skills) ? skills : []).map((skill) => ({
    ...skill,
    name: repairText(skill?.name || ''),
    type: repairText(skill?.type || ''),
    attr: repairText(skill?.attr || ''),
    describe: repairText(skill?.describe || '')
  }));
}

function normalizeSkillTypeMap(skillTypes = {}) {
  const source = toObject(skillTypes);
  return Object.fromEntries(Object.entries(source).map(([key, value]) => [repairText(key), normalizeSkillList(value)]));
}

function buildUnit(payload) {
  return {
    key: payload.key,
    id: String(payload.id),
    name: repairText(payload.name || payload.fullName || payload.key),
    fullName: repairText(payload.fullName || payload.name || payload.key),
    variantName: repairText(payload.variantName || ''),
    race: payload.race || {},
    attrs: normalizeAttrList(payload.attrs),
    trait: repairText(payload.trait || ''),
    skills: normalizeSkillList(payload.skills),
    skillTypes: normalizeSkillTypeMap(payload.skillTypes),
    img: payload.img || '',
    sourceType: payload.sourceType || 'default'
  };
}

export function buildBattlePetIndex(petsDetail = {}, petVariantDetails = {}) {
  const index = {};
  const catalogMap = getCatalogMap();

  Object.entries(toObject(petsDetail)).forEach(([id, detail]) => {
    const catalog = catalogMap.get(String(id)) || {};
    index[`pet:${id}`] = buildUnit({
      key: `pet:${id}`,
      id,
      name: detail?.name || catalog.name || `pet:${id}`,
      fullName: detail?.fullName || catalog.name || detail?.name || `pet:${id}`,
      race: detail?.race || {},
      attrs: detail?.attrs || detail?.type || catalog.type || [],
      trait: detail?.trait || '',
      skills: detail?.skills || [],
      skillTypes: detail?.skill_types || {},
      img: detail?.img || catalog.img || '',
      sourceType: 'default'
    });
  });

  Object.entries(toObject(petVariantDetails)).forEach(([id, variants]) => {
    const catalog = catalogMap.get(String(id)) || {};
    Object.entries(toObject(variants)).forEach(([variantPath, detail]) => {
      const img = detail?.img || variantPath;
      const fullName = detail?.fullName || repairText(catalog.name || `variant:${id}`);
      const variantName = detail?.variantName || repairText(img.split('/').pop()?.replace(/\.\w+$/, '') || '');
      index[`variant:${id}:${img}`] = buildUnit({
        key: `variant:${id}:${img}`,
        id,
        name: variantName || fullName,
        fullName,
        variantName,
        race: detail?.race || {},
        attrs: detail?.attrs || detail?.type || catalog.type || [],
        trait: detail?.trait || '',
        skills: detail?.skills || [],
        skillTypes: detail?.skill_types || {},
        img,
        sourceType: 'variant'
      });
    });
  });

  return index;
}

export default { buildBattlePetIndex };
