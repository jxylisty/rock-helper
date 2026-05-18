const fs = require('fs');
const path = require('path');

const sourceFile = path.resolve(__dirname, '../data/pets_detail.js');
const outputFile = path.resolve(__dirname, '../data/pets_detail_light.js');

const sourceContent = fs.readFileSync(sourceFile, 'utf8');

const match = sourceContent.match(/export const petsDetail = ({[\s\S]*});?$/);
if (!match) {
  console.error('无法解析文件');
  process.exit(1);
}

const petsDetail = eval('(' + match[1] + ')');

const lightData = {};

Object.entries(petsDetail).forEach(([id, detail]) => {
  lightData[id] = {
    race: detail.race || null,
    trait: detail.trait || '',
    skills: (detail.skills || []).map(skill => ({
      name: skill.name,
      level: skill.level,
      skill_type: skill.skill_type
    })).filter(s => s.name && s.skill_type)
  };
});

const output = 'export const petsDetail = ' + JSON.stringify(lightData, null, 2) + '\n';

fs.writeFileSync(outputFile, output, 'utf8');

const originalSize = fs.statSync(sourceFile).size;
const lightSize = fs.statSync(outputFile).size;

console.log('完成!');
console.log('原始大小:', (originalSize / 1024 / 1024).toFixed(2), 'MB');
console.log('精简版大小:', (lightSize / 1024 / 1024).toFixed(2), 'MB');
console.log('压缩率:', ((1 - lightSize / originalSize) * 100).toFixed(1) + '%');
