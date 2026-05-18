const fs = require('fs');
const path = require('path');

const sourceFile = path.resolve(__dirname, '../data/pet_variant_details.js');
const outputFile = path.resolve(__dirname, '../data/pet_variant_details_light.js');

const sourceContent = fs.readFileSync(sourceFile, 'utf8');

const jsonMatch = sourceContent.replace(/export const petVariantDetails = /, '').trim();
const petVariantDetails = JSON.parse(jsonMatch);

const lightData = {};

Object.entries(petVariantDetails).forEach(([petId, variants]) => {
  lightData[petId] = {};
  
  Object.entries(variants).forEach(([variantPath, detail]) => {
    lightData[petId][variantPath] = {
      race: detail.race || null,
      trait: detail.trait || '',
      variantName: detail.variantName || '',
      skills: (detail.skills || []).map(skill => ({
        name: skill.name,
        level: skill.level,
        skill_type: skill.skill_type
      })).filter(s => s.name && s.skill_type)
    };
  });
});

const output = 'export const petVariantDetails = ' + JSON.stringify(lightData, null, 2) + '\n';

fs.writeFileSync(outputFile, output, 'utf8');

const originalSize = fs.statSync(sourceFile).size;
const lightSize = fs.statSync(outputFile).size;

console.log('完成!');
console.log('原始大小:', (originalSize / 1024 / 1024).toFixed(2), 'MB');
console.log('精简版大小:', (lightSize / 1024 / 1024).toFixed(2), 'MB');
console.log('压缩率:', ((1 - lightSize / originalSize) * 100).toFixed(1) + '%');
