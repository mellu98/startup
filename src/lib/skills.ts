import fs from "fs";
import path from "path";
import matter from "gray-matter";

const SKILLS_DIR = path.join(process.cwd(), "content", "skills");

export type SkillMeta = {
  domain: string;
  id: string;
  name: string;
  description: string;
  sourcePath: string;
};

export type SkillContent = {
  meta: SkillMeta;
  frontmatter: Record<string, unknown>;
  content: string;
};

export function getSkills(): SkillMeta[] {
  const indexPath = path.join(process.cwd(), "data", "skills-index.json");
  const raw = fs.readFileSync(indexPath, "utf-8");
  return JSON.parse(raw) as SkillMeta[];
}

export function getSkillById(id: string): SkillMeta | undefined {
  return getSkills().find((s) => s.id === id);
}

export function getSkillContent(id: string): SkillContent | null {
  const meta = getSkillById(id);
  if (!meta) return null;

  const nestedPath = path.join(SKILLS_DIR, meta.domain, meta.id, "SKILL.md");
  const flatPath = path.join(SKILLS_DIR, meta.domain, "SKILL.md");

  let filePath = nestedPath;
  if (!fs.existsSync(filePath)) {
    filePath = flatPath;
  }
  if (!fs.existsSync(filePath)) return null;

  const raw = fs.readFileSync(filePath, "utf-8");
  const parsed = matter(raw);

  return {
    meta,
    frontmatter: parsed.data,
    content: parsed.content,
  };
}
