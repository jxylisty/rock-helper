import { skillsData } from '../data/skills.js';
import { auditSkillMechanics } from '../src/utils/skillParseAudit.js';

const report = auditSkillMechanics(skillsData);

console.log(JSON.stringify(report, null, 2));
