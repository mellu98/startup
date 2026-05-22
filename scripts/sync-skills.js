/* eslint-disable @typescript-eslint/no-require-imports */
const fs = require('fs');
const path = require('path');
const matter = require('gray-matter');

const STARTUP_DIR = 'C:/Users/franc/Desktop/STARTUP/startup';
const OUTPUT_DIR = path.resolve(__dirname, '../content/skills');
const DATA_DIR = path.resolve(__dirname, '../data');

if (!fs.existsSync(OUTPUT_DIR)) fs.mkdirSync(OUTPUT_DIR, { recursive: true });
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

const domains = fs.readdirSync(STARTUP_DIR)
  .filter(f => fs.statSync(path.join(STARTUP_DIR, f)).isDirectory());

const skillsIndex = [];

for (const domain of domains) {
  const domainPath = path.join(STARTUP_DIR, domain);

  // pm-skills style: skills/<name>/SKILL.md
  const skillsDir = path.join(domainPath, 'skills');
  if (fs.existsSync(skillsDir)) {
    const skillFolders = fs.readdirSync(skillsDir)
      .filter(f => fs.statSync(path.join(skillsDir, f)).isDirectory());
    for (const skillFolder of skillFolders) {
      const skillPath = path.join(skillsDir, skillFolder, 'SKILL.md');
      if (fs.existsSync(skillPath)) {
        const content = fs.readFileSync(skillPath, 'utf-8');
        const parsed = matter(content);
        skillsIndex.push({
          domain,
          id: skillFolder,
          name: parsed.data.name || skillFolder,
          description: parsed.data.description || '',
          sourcePath: skillPath,
        });
        const destDir = path.join(OUTPUT_DIR, domain, skillFolder);
        fs.mkdirSync(destDir, { recursive: true });
        fs.copyFileSync(skillPath, path.join(destDir, 'SKILL.md'));
      }
    }
  }

  // startup-skill style: <domain>/SKILL.md flat
  const flatSkillPath = path.join(domainPath, 'SKILL.md');
  if (fs.existsSync(flatSkillPath)) {
    const content = fs.readFileSync(flatSkillPath, 'utf-8');
    const parsed = matter(content);
    skillsIndex.push({
      domain,
      id: domain,
      name: parsed.data.name || domain,
      description: parsed.data.description || '',
      sourcePath: flatSkillPath,
    });
    const destDir = path.join(OUTPUT_DIR, domain);
    fs.mkdirSync(destDir, { recursive: true });
    fs.copyFileSync(flatSkillPath, path.join(destDir, 'SKILL.md'));

    // Copy references if present
    const refsDir = path.join(domainPath, 'references');
    if (fs.existsSync(refsDir)) {
      const destRefsDir = path.join(destDir, 'references');
      fs.mkdirSync(destRefsDir, { recursive: true });
      const refFiles = fs.readdirSync(refsDir);
      for (const refFile of refFiles) {
        fs.copyFileSync(path.join(refsDir, refFile), path.join(destRefsDir, refFile));
      }
    }
  }
}

fs.writeFileSync(
  path.join(DATA_DIR, 'skills-index.json'),
  JSON.stringify(skillsIndex, null, 2)
);

console.log(`Indexed ${skillsIndex.length} skills.`);
