const fs = require('fs');
const path = require('path');

const petsFile = path.resolve(__dirname, '../data/pets.js');
const variantDetailsFile = path.resolve(__dirname, '../data/pet_variant_details.js');
const leaderFormsFile = path.resolve(__dirname, '../data/leader_forms.js');
const outputFile = path.resolve(__dirname, '../data/pet_variants_list.js');

const petsContent = fs.readFileSync(petsFile, 'utf8');
const variantContent = fs.readFileSync(variantDetailsFile, 'utf8');
const leaderFormsContent = fs.readFileSync(leaderFormsFile, 'utf8');

const petsMatch = petsContent.match(/export const pets = ([\s\S]*?);?$/);
const variantMatch = variantContent.replace(/export const petVariantDetails = /, '').trim();

const leaderIdsMatch = leaderFormsContent.match(/export const leaderFormPetIds = \[([\d,\s\n]*)\]/);

if (!petsMatch || !leaderIdsMatch) {
  console.error('无法解析文件');
  process.exit(1);
}

const pets = eval('(' + petsMatch[1] + ')');
const variantDetails = JSON.parse(variantMatch);

const leaderFormPetIds = leaderIdsMatch[1].split(',').map(s => parseInt(s.trim())).filter(n => !isNaN(n));
const leaderFormSet = new Set(leaderFormPetIds);

const BOSS_KEYWORDS = ['国王', '王子', '公主', '领主', '首领', '王者', '领袖', '王', '帝', '神', '后', '祭', '圣', '秘', '幻', '暗'];

const isBossVariant = (name) => {
  if (!name) return false;
  return BOSS_KEYWORDS.some(kw => name.includes(kw));
};

const isValidVariant = (baseId, variantName) => {
  if (!variantName) return false;
  if (variantName === '默认') return false;
  if (variantName === '本来的样子') return false;
  if (variantName.includes('的样子')) return false;
  if (variantName.includes('形态')) return false;
  if (variantName.includes('口味')) return false;
  if (variantName.includes('饰品')) return false;
  if (isBossVariant(variantName)) return false;
  return true;
};

const variantPets = [];
const variantPetMap = {};
const addedFullNames = new Set();
let variantIndex = 0;

Object.entries(variantDetails).forEach(([baseId, variants]) => {
  const basePet = pets.find(p => String(p.id) === String(baseId));
  
  Object.entries(variants).forEach(([variantPath, detail]) => {
    if (!detail.race) return;
    
    const variantName = detail.variantName || '';
    
    if (!isValidVariant(baseId, variantName)) return;
    
    const fileName = variantPath.split('/').pop() || '';
    const displayName = variantName || fileName.replace(/^\d+_/, '').replace(/\.png$/i, '');
    const fullName = basePet ? `${basePet.name}·${displayName}` : displayName;
    
    if (addedFullNames.has(fullName)) return;
    addedFullNames.add(fullName);
    
    variantIndex++;
    
    const variantId = `${baseId}_variant_${variantIndex}`;
    
    const variantPet = {
      id: variantId,
      baseId: parseInt(baseId),
      name: basePet ? basePet.name : '未知',
      variantName: displayName,
      fullName: fullName,
      type: basePet ? basePet.type : [],
      rarity: basePet ? basePet.rarity : '普通',
      img: variantPath,
      isVariant: true,
      race: detail.race,
      trait: detail.trait || '',
      skills: detail.skills || []
    };
    
    variantPets.push(variantPet);
    variantPetMap[variantId] = variantPet;
  });
});

const output = `export const variantPets = ${JSON.stringify(variantPets, null, 2)};
export const variantPetMap = ${JSON.stringify(variantPetMap, null, 2)};
`;

fs.writeFileSync(outputFile, output, 'utf8');

console.log('完成!');
console.log('首领精灵ID列表:', leaderFormPetIds);
console.log('过滤关键词:', BOSS_KEYWORDS);
console.log('变体精灵数量:', variantPets.length);
console.log('输出文件:', outputFile);
