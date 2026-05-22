import { getDb } from "./db";

export type BrandProfile = {
  companyName: string;
  founderNames: string;
  logoDataUrl: string | null;
  primaryColor: string;
  industryTagline: string;
};

export type BrandProfileInput = Partial<BrandProfile>;

export const DEFAULT_BRAND_PROFILE: BrandProfile = {
  companyName: "Startup Validation OS",
  founderNames: "",
  logoDataUrl: null,
  primaryColor: "#2563eb",
  industryTagline: "Investor-ready validation dossier",
};

type BrandProfileRow = {
  company_name: string;
  founder_names: string;
  logo_data_url: string | null;
  primary_color: string;
  industry_tagline: string;
};

function rowToBrandProfile(row: BrandProfileRow): BrandProfile {
  return {
    companyName: row.company_name,
    founderNames: row.founder_names,
    logoDataUrl: row.logo_data_url,
    primaryColor: row.primary_color,
    industryTagline: row.industry_tagline,
  };
}

function normalizeBrandProfile(input: BrandProfileInput): BrandProfile {
  const current = { ...DEFAULT_BRAND_PROFILE, ...input };
  const primaryColor = current.primaryColor.trim().toLowerCase();
  if (!/^#[0-9a-f]{6}$/.test(primaryColor)) {
    throw new Error("Invalid brand color");
  }

  return {
    companyName:
      current.companyName.trim() || DEFAULT_BRAND_PROFILE.companyName,
    founderNames: current.founderNames.trim(),
    logoDataUrl: current.logoDataUrl?.trim() || null,
    primaryColor,
    industryTagline:
      current.industryTagline.trim() ||
      DEFAULT_BRAND_PROFILE.industryTagline,
  };
}

export async function getBrandProfile(): Promise<BrandProfile> {
  const db = getDb();
  const row = db
    .prepare(
      `SELECT company_name, founder_names, logo_data_url, primary_color, industry_tagline
       FROM brand_profile WHERE id = 1`
    )
    .get() as BrandProfileRow | undefined;

  return row ? rowToBrandProfile(row) : DEFAULT_BRAND_PROFILE;
}

export async function updateBrandProfile(
  input: BrandProfileInput
): Promise<BrandProfile> {
  const existing = await getBrandProfile();
  const next = normalizeBrandProfile({ ...existing, ...input });
  const db = getDb();

  db.prepare(
    `INSERT INTO brand_profile (
      id, company_name, founder_names, logo_data_url, primary_color, industry_tagline, updated_at
    ) VALUES (1, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      company_name = excluded.company_name,
      founder_names = excluded.founder_names,
      logo_data_url = excluded.logo_data_url,
      primary_color = excluded.primary_color,
      industry_tagline = excluded.industry_tagline,
      updated_at = excluded.updated_at`
  ).run(
    next.companyName,
    next.founderNames,
    next.logoDataUrl,
    next.primaryColor,
    next.industryTagline,
    new Date().toISOString()
  );

  return next;
}
