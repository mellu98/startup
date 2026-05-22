import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import {
  getBrandProfile,
  updateBrandProfile,
  type BrandProfileInput,
} from "@/lib/brand-profile";
import { internalErrorResponse, validateInput } from "@/lib/api-validation";

const brandProfileSchema = z.object({
  companyName: z.string().max(120).optional(),
  founderNames: z.string().max(240).optional(),
  logoDataUrl: z.string().max(500000).nullable().optional(),
  primaryColor: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
  industryTagline: z.string().max(240).optional(),
});

export async function GET() {
  try {
    return NextResponse.json(await getBrandProfile());
  } catch (err: unknown) {
    console.error("Brand profile GET error:", err);
    return internalErrorResponse("Errore server");
  }
}

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null);
    const parsed = validateInput(body, brandProfileSchema);
    if (!parsed.success) return parsed.response;

    const saved = await updateBrandProfile(parsed.data as BrandProfileInput);
    return NextResponse.json(saved);
  } catch (err: unknown) {
    console.error("Brand profile PUT error:", err);
    return internalErrorResponse("Errore server");
  }
}
