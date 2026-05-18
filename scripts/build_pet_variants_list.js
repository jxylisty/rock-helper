const fs = require('fs');
const path = require('path');

const petsFile = path.resolve(__dirname, '../data/pets.js');
const variantDetailsFile = path.resolve(__dirname, '../data/pet_variant_details.js');
const outputFile = path.resolve(__dirname, '../data/pet_variants_list.js');

const petsContent = fs.readFileSync(petsFile, 'utf8');
const variantContent = fs.readFileSync(variantDetailsFile, 'utf8');

const petsMatch = petsContent.match(/export const pets = ([\s\S]*?);?$/);
const variantMatch = variantContent.replace(/export const petVariantDetails = /, '').trim();

if (!petsMatch) {
  console.error('无法解析 pets.js');
  process.exit(1);
}

const pets = eval('(' + petsMatch[1] + ')');
const variantDetails = JSON.parse(variantMatch);

const isBossVariant = (name) => {
  if (!name) return false;
  const bossKeywords = ['国王', '王子', '公主', '领主', '首领', '王者', '领袖', '王', '帝', '神'];
  return bossKeywords.some(kw => name.includes(kw));
};

const isValidVariant = (name) => {
  if (!name) return false;
  if (name === '默认') return false;
  if (isBossVariant(name)) return false;
  if (name.includes('的样子')) return false;
  if (name.includes('形态')) return false;
  if (name.includes('口味')) return false;
  if (name.includes('饰品')) return false;
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
    
    if (!isValidVariant(variantName)) return;
    
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
console.log('变体精灵数量:', variantPets.length);
console.log('输出文件:', outputFile);
