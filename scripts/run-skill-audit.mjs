import { skillsData } from '../data/skill/skills.js';
import { auditSkillMechanics } from '../utils/skillParseAudit.js';

const report = auditSkillMechanics(skillsData);

console.log(JSON.stringify(report, null, 2));
