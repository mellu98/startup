import { NextResponse } from "next/server";
import { z, type ZodError, type ZodType } from "zod";
import { PHASE_IDS, type PhaseId } from "./phases";

const PHASE_ID_VALUES = [
  PHASE_IDS[0],
  ...PHASE_IDS.slice(1),
] as [PhaseId, ...PhaseId[]];

export type ValidationIssue = {
  path: string;
  message: string;
};

export type ApiValidationResult<T> =
  | { success: true; data: T }
  | { success: false; response: NextResponse };

export const phaseIdSchema = z.enum(PHASE_ID_VALUES);

export const phaseParamsSchema = z.object({
  id: phaseIdSchema,
});

export const chatRequestSchema = z.object({
  phaseId: phaseIdSchema,
  message: z.string().min(1).max(4000),
});

export const completePhaseRequestSchema = z.object({
  document: z.string().max(50000).refine((value) => value.trim().length > 0, {
    message: "Il documento è obbligatorio",
  }),
});

export const pdfRequestSchema = z.object({
  document: z.string().max(50000).optional(),
});

function issuesFromZod(error: ZodError): ValidationIssue[] {
  return error.issues.map((issue) => ({
    path: issue.path.join(".") || "body",
    message: issue.message,
  }));
}

export function validationErrorResponse(error: ZodError): NextResponse {
  return NextResponse.json(
    {
      error: "Richiesta non valida",
      issues: issuesFromZod(error),
    },
    { status: 400 }
  );
}

export function invalidJsonResponse(): NextResponse {
  return NextResponse.json({ error: "JSON non valido" }, { status: 400 });
}

export function unauthorizedResponse(): NextResponse {
  return NextResponse.json({ error: "Non autorizzato" }, { status: 401 });
}

export function internalErrorResponse(message = "Errore interno"): NextResponse {
  return NextResponse.json({ error: message }, { status: 500 });
}

export function validateInput<T>(
  input: unknown,
  schema: ZodType<T>
): ApiValidationResult<T> {
  const parsed = schema.safeParse(input);
  if (!parsed.success) {
    return { success: false, response: validationErrorResponse(parsed.error) };
  }
  return { success: true, data: parsed.data };
}

export async function parseJsonRequest<T>(
  req: Request,
  schema: ZodType<T>
): Promise<ApiValidationResult<T>> {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return { success: false, response: invalidJsonResponse() };
  }
  return validateInput(body, schema);
}

export async function parseOptionalJsonRequest<T>(
  req: Request,
  schema: ZodType<T>
): Promise<ApiValidationResult<T>> {
  let text: string;
  try {
    text = await req.text();
  } catch {
    return { success: false, response: invalidJsonResponse() };
  }

  if (text.trim() === "") {
    return validateInput({}, schema);
  }

  try {
    return validateInput(JSON.parse(text) as unknown, schema);
  } catch {
    return { success: false, response: invalidJsonResponse() };
  }
}

export function validateParams<T>(
  params: unknown,
  schema: ZodType<T>
): ApiValidationResult<T> {
  return validateInput(params, schema);
}

export function requireDocumentGenerationToken(req: Request): NextResponse | null {
  const expected = process.env.DOCUMENT_GENERATION_TOKEN?.trim();
  if (!expected) return null;

  const explicitToken = req.headers.get("x-document-generation-token")?.trim();
  const authorization = req.headers.get("authorization")?.trim();
  const bearerToken = authorization?.match(/^Bearer\s+(.+)$/i)?.[1]?.trim();

  if (explicitToken === expected || bearerToken === expected) {
    return null;
  }

  return unauthorizedResponse();
}
