# Piano: investor-ready roadmap (8 atomic SDD changes)

> **Master plan resumable.** Qualsiasi agente che apre questa cartella e legge questo file può continuare il lavoro da dove si è fermato — anche dopo token exhaustion / compactation / nuova sessione.

## 0. Project context

**Project**: `startup-validation-os` — AI-guided startup validation tool, 9 sequential phases (intake → market → competitor → strategy → premortem → positioning → execution → gtm → pitch).

**Stack**:
- Next.js 16.2.6 + React 19 + TS strict + Tailwind v4
- SQLite via better-sqlite3 (WAL mode)
- LLM via OpenRouter → DeepSeek v4 Pro (hardcoded in 3 routes — flagged in audit)
- Puppeteer 25 per PDF
- Vitest 4 + @testing-library/react 16 + jsdom 29 (Strict TDD attivo)

**Project rules (CRITICAL — from CLAUDE.md/AGENTS.md)**:
- Next.js 16 differs from training data. Consult `node_modules/next/dist/docs/` before route/middleware/config edits.
- TS strict. `@/*` → `src/*`. ES2017.
- Server-only code in `src/lib/`. Client components in `src/components/` con `"use client"`.
- Lint: `npm run lint`. Types: `npx tsc --noEmit`. Tests: `npx vitest run` o `npm run test:run`.
- **NEVER run `npm run build`** (regola utente).
- **Strict TDD ACTIVE** — red-green-refactor enforced.
- Italian UI strings. Rioplatense-Italian persona per le interazioni utente.

## 1. Persistence (Engram) — recovery path

Tutti gli artefatti SDD vivono in engram (project: `startup-validation-os`). Per recuperarli:

```
mem_search(query: "{topic_key}", project: "startup-validation-os")
mem_get_observation(id: <id>)
```

| Artifact | Topic key |
|----------|-----------|
| Project context | `sdd-init/startup-validation-os` |
| Testing capabilities | `sdd/startup-validation-os/testing-capabilities` |
| Skill registry | `skill-registry` |
| Audit (top-level) | `sdd/readiness-audit-investor-ready/explore` + `/proposal` |
| Per ogni change | `sdd/{change-name}/{explore,proposal,spec,design,tasks,apply-progress,verify-report,archive-report}` |

Se engram non risponde, il presente file (`piano.md`) è il backup minimale per continuare.

## 2. Status (aggiornato 2026-05-22)

| # | Change | Status | Topic key |
|---|--------|--------|-----------|
| 0 | Vitest setup + Strict TDD flip | ✅ done (smoke test green) | session — see `decision/test-stack` |
| 0' | Readiness audit | ✅ done | `sdd/readiness-audit-investor-ready/explore` + `/proposal` |
| 1 | `canonical-phase-registry` | ✅ **CLOSED** (10/10 tests, drift fixed) | `sdd/canonical-phase-registry/*` |
| 2 | `coverage-state-machine` | ✅ **CLOSED** (51/51 tests, core lib coverage green) | `sdd/coverage-state-machine/*` |
| 3 | `api-input-validation` | ✅ **CLOSED** (74/74 tests, tsc clean) | `sdd/api-input-validation/*` |
| 4 | `pdf-investor-grade-redesign` | ? **CLOSED** (branded PDF + settings) | `sdd/pdf-investor-grade-redesign/*` |
| 5 | `llm-quality-gate` | ? **CLOSED** (critic + 1 regen) | `sdd/llm-quality-gate/*` |
| 6 | `pitch-deck-slide-export` | ? **CLOSED** (HTML/PDF deck endpoint) | `sdd/pitch-deck-slide-export/*` |
| 7 | `data-room-export` | ? **CLOSED** (ZIP export) | `sdd/data-room-export/*` |
| 8 | `deployment-target-decision` | ? **CLOSED** (Railway Docker decision) | `DEPLOYMENT.md` |
| X1 | `fix-pdf-route-types` (atomic, S) | ✅ done inside #3 (tsc clean) | `src/app/api/phase/[id]/pdf/route.ts` |
| X2 | `lint-cleanup` (atomic, S-M) | ? done (eslint clean) | lint cleanup |

X1 and X2 are micro-changes surfaced during #1's verify. Run them opportunistically (e.g., before #8 deploy).

## 3. SDD cycle template (apply to every change)

```
/sdd-new {change-name}
  ↓
explore     → audit del codice affected, options, risks (engram artifact)
propose     → intent, scope, capabilities, affected areas, risks, rollback (engram)
spec        → requirements + scenarios (Given/When/Then, RFC 2119) (engram)
design      → architectural decisions, file changes, migration sequence (engram)
tasks       → atomic checklist, RED → GREEN → REFACTOR phases (engram)
apply       → Strict TDD: test first, run RED, implement, run GREEN, refactor consumers (code)
verify      → independent re-run of tests + tsc + lint, spec compliance matrix (engram)
archive     → close cycle, link all artifacts (engram)
```

Per ogni change la guida di sotto include almeno: intent, scope, file affected, test plan, gates. Quando il change apre il suo /sdd-new, le fasi sopra producono gli artefatti dettagliati.

---

## 4. Change-by-change implementation guide

### 🔵 Change #2: coverage-state-machine

**Intent**: build the test safety net for the core business logic before any further refactor. Strict TDD funziona solo se la rete di sicurezza c'è — adesso non c'è.

**Why next**: #4, #5, #6 toccano logica delicata (PDF rendering, LLM pipeline, slide export). Senza test su state machine + markdown parser + AI utils, ogni cambio è una scommessa. ROI altissimo: 1-2 settimane di test = settimane di refactor sicuri dopo.

**Scope IN**:
- Test suite Vitest a ~70% coverage sui 4 moduli critici
- File: `src/lib/state.test.ts`, `src/lib/db.test.ts`, `src/lib/markdown.test.ts`, `src/lib/ai-utils.test.ts`

**Scope OUT**:
- Test su API routes (separato — sarà parte di #3)
- Test su React components (separato — può essere parte di #4)
- Modifiche al codice production (solo se si scoprono bug → micro-fix inline OK)

**Modules to cover (priorità per blast radius)**:

1. **`src/lib/state.ts`** (state machine — bug qui = app rotta)
   - `unlockNextPhase`: idempotenza (chiamare 2 volte = stesso effetto), boundary (intake → market, pitch → no-op), unknown id → no-op
   - `updatePhase`: status transitions valide, errors on missing phase
   - `readState` / `writeState`: round-trip (write → read → equal)
   - `getPhase`: known + unknown id
   - `getPreviousPhases`: delegate test (già coperto da phases.test.ts ma ribadire via state.ts)

2. **`src/lib/markdown.ts`** (custom parser — bug qui = PDF rotti = blast diretto su investor angle)
   - Headings (h1/h2/h3, missing space, multiple #)
   - Lists (unordered + ordered, nested NOT supported — document esplicitamente)
   - Tables (header + separator + data, malformed input)
   - Code blocks (with/without language)
   - Inline: bold/italic/code/links/images
   - Blockquotes (single line + multi-line)
   - Edge cases: empty input, only whitespace, very long lines, HTML in markdown (sanitization)
   - **CRITICAL behavior to test**: il parser è usato sia in PDF che in chat con `dangerouslySetInnerHTML` → XSS surface. Test che HTML pericoloso negli input venga escapato

3. **`src/lib/ai-utils.ts`** (stream filter — bug qui = mojibake o `<think>` leak nell'UI)
   - `stripThinkTags`: basic, nested (not supported — document), multiple think blocks, malformed
   - `createStreamThinkFilter`: think tag split across chunks (es: chunk1 ends with "<thi", chunk2 starts with "nk>"), open without close, multiple opens
   - `sanitizeMojibake`: replacement chars removed, whitespace collapsed, non-string input
   - `formatContextSnapshot`: null, empty, mixed types, arrays

4. **`src/lib/db.ts`** (migration + seed — bug qui = data loss)
   - `getDb`: singleton (multiple calls = same instance)
   - `initSchema`: idempotent (run twice OK)
   - `seedInitial`: produces exactly 9 rows con `intake` unlocked e others locked
   - `migrateFromJson`: con state.json esistente, migra correttamente. Senza, seeda. Con migration fallita, fallback al seed.
   - **NOTE**: i test di db.ts richiedono un DB temporaneo o mock. Considerare `vitest-environment` per setup/teardown o usare `:memory:` SQLite.

**Test plan (Strict TDD per ogni modulo)**:

Per ogni modulo:
1. RED: scrivi `{module}.test.ts` con tutti i test che descrivono il comportamento corrente (approval testing — il refactor è già fatto, ora documentiamo)
2. Run → verifica quali falliscono (qualcuno potrebbe rivelare bug pre-esistenti)
3. Per ogni test failing: o è un bug (fix inline + nota in apply-progress), o l'aspettativa era sbagliata (correggi il test)
4. GREEN target: 100% test passing
5. REFACTOR: pulizia se serve (raro per test)

**Critical setup per db.test.ts**: prima di scrivere, verifica come isolare il DB.
- Option A: in-memory SQLite via `new Database(":memory:")` — più veloce, no FS
- Option B: temp dir via `os.tmpdir()` + cleanup
- Option C: mock `better-sqlite3` — sconsigliato (perdi tipo + comportamento reale)

**Gates per #2**:
- `npx vitest run` → tutti i test (vecchi + nuovi) green
- `npx vitest run --coverage` → report coverage. Target ~70% sui 4 moduli. NON sui consumer.
- `npm run lint` → no nuovi errori (pre-esistenti restano)
- `npx tsc --noEmit` → no nuovi errori

**Effort**: M (1-2 settimane reali). Il bottleneck sarà markdown.ts (parser custom = ~50 test cases minimum) e ai-utils.ts (stream filter = boundary logic complessa).

**Open questions**:
- Vuoi che il coverage report sia parte del CI in futuro? (out of scope per #2 stesso, ma decisione da prendere)
- Test su DB con `:memory:` o temp dir? (raccomando `:memory:` per velocità)

**Effetto su pitch**: zero visibilità diretta agli investitori. MA: dopo #2, ogni demo davanti ai mentor ha la garanzia "ho i test, posso refactorare in confidenza, niente regressioni silenziose". È solida professionale.

---

### Change #3: api-input-validation

**Intent**: API routes attualmente non validano gli input (zero zod, zero type guard). Un POST malformato può crashare il server o leakare info via `err.message`.

**Scope IN**:
- Install `zod` (peso accettabile, standard de-facto)
- Schemi zod per ogni POST endpoint:
  - `src/app/api/chat/route.ts` → `{ phaseId: string (enum di PHASE_IDS), message: string (max 4000 char) }`
  - `src/app/api/phase/[id]/complete/route.ts` → `{ document: string (max 50000 char) }`
  - `src/app/api/phase/[id]/document/route.ts` → no body but valid `id` param
  - `src/app/api/phase/[id]/pdf/route.ts` → `{ document?: string }`
- Error envelope cleanup: sostituire `err.message` esposto al client con messaggi safe (`"Errore interno"` per 500, dettagli solo nei log server)
- Auth middleware su `/document` (LLM-costly endpoint): minimum a shared-secret token header, oppure session-based se aggiungiamo auth

**Scope OUT**:
- Full auth system (signup/login) — separato change futuro
- Rate limiting persistente (oggi è in-memory Map, fragile su multi-instance) — flag per ora

**File affected**:
- `package.json` (deps)
- 4 file API route (refactor validation block)
- `src/lib/api-validation.ts` (new) — helper `safeParse + 400 response`

**Test plan**:
- Test unit su `api-validation.ts`: valid input → ok, invalid → 400 con shape stabile
- Test integration su ogni route: valid request → 200, missing field → 400, oversized → 400, invalid phaseId → 400

**Gates**:
- `npx vitest run` green
- Manual: POST `/api/chat` con body vuoto → 400 (era 500 prima)
- Manual: POST `/api/phase/intake/document` senza auth header → 401

**Effort**: S (3-5 giorni). Zod è meccanico.

**Effetto su pitch**: zero diretto. Indiretto: nessun crash imbarazzante durante demo live.

---

### Change #4: pdf-investor-grade-redesign

**Intent**: il PDF attuale è un markdown renderer generico. Per "PDF devastanti" servono template per fase + branding personalizzato + visualizzazioni + struttura investor.

**Scope IN**:

1. **Brand profile** (new): `src/lib/brand-profile.ts` + UI per inserire/editare:
   - Company name
   - Founder name(s)
   - Logo upload (stored as base64 in SQLite o file in `/data/uploads/`)
   - Primary color (hex)
   - Industry tagline

2. **Template per fase** (refactor `pdf-template.ts`):
   - Cover branded (logo + company + phase + date + founder + "Confidenziale")
   - Header su ogni pagina (logo piccolo + page numbers)
   - Sezioni structured per phase:
     - intake → Problem Statement + Founder Story
     - market → TAM/SAM/SOM (concentric circles SVG) + trend cards
     - competitor → 2x2 matrix SVG + battle cards
     - strategy → Lean Canvas grid
     - premortem → Risk matrix (impact × likelihood)
     - positioning → Statement box + alternatives table
     - execution → Roadmap timeline + PRD summary
     - gtm → Beachhead funnel + ICP card
     - pitch → Slide-style preview (links to #6 for full slide export)

3. **Charts server-side** via Chart.js node-canvas:
   - Install `chart.js` + `chartjs-node-canvas`
   - Helper `src/lib/charts.ts` che genera PNG inline per i template

4. **Executive summary auto-generated**: prima pagina dopo cover, 5 bullet sintetici per ogni fase completata

5. **TOC auto-generato** dalle headings

6. **Footer**: rimuovere "Startup Validation OS" (out con il "auto-generated" smell), mettere "© {company} - Confidential"

**Scope OUT**:
- Slide deck export (separato — #6)
- Data room zip export (separato — #7)
- Multi-language (it default, en futuro)
- Print quality color profile (ICC profile) — premium feature defer

**File affected**:
- `package.json` (chart.js, chartjs-node-canvas)
- `src/lib/brand-profile.ts` (new)
- `src/app/api/brand/route.ts` (new — GET/PUT brand)
- `src/lib/pdf-template.ts` (major rewrite)
- `src/lib/pdf-templates/` (new dir) → 9 template files
- `src/lib/charts.ts` (new)
- `src/components/BrandSettings.tsx` (new — UI per editare brand)
- `src/app/settings/page.tsx` (new — pagina settings)
- DB migration: nuova tabella `brand_profile`

**Test plan**:
- Unit su `charts.ts`: TAM/SAM/SOM SVG con valori validi → PNG buffer non vuoto
- Unit su ogni template (`pdf-templates/{phase}.test.ts`): given markdown+brand → HTML con required elements
- Integration: POST `/api/phase/pitch/pdf` con final_document + brand profile → PDF binary > 100KB

**Critical**: il markdown parser custom è XSS surface. Se #2 non ha già ratificato il behavior, c'è rischio. PRECONDITION: #2 done prima di #4 (per la rete di sicurezza).

**Gates**:
- `npx vitest run` green
- Manual: genera PDF per ogni fase, apri in viewer, confronta visual contro template di reference (YC, Sequoia)
- `npx tsc --noEmit` clean (con FIX di `pdf-route.ts` types — X1 sopra)

**Effort**: L (2-3 settimane). Bottleneck: visual design dei template (richiede iterazione).

**Effetto su pitch**: 🎯 **#1 vittoria visibile**. I PDF arrivano ai mentor di Startup Geeks con logo, colori, charts, struttura pro. Sparisce il "smell" da auto-generato.

---

### Change #5: llm-quality-gate

**Intent**: oggi qualsiasi cosa il LLM emette finisce nel PDF. Zero quality check, zero fact verification. Investitori che leggono numeri allucinati = trust distrutto.

**Scope IN**:
- Two-pass generation per la fase di document finale:
  - Pass 1: writer (current behavior)
  - Pass 2: critic con rubrica (ha citazioni? numeri plausibili? tono investor-appropriate?)
  - Se critic score < threshold → regenera Pass 1 con feedback critic
- Rubric structured (JSON output dal critic): `{ score: 0-100, issues: [{type, severity, suggestion}] }`
- Citation requirement nei prompt: "se citi numeri di mercato, indica fonte o premetti '[stima personale]'"
- Optional: model più forte per Pass 1 (Claude Sonnet 4.5 o GPT-4o via OpenRouter) — switch via env var
- Stronger fallback chain (se DeepSeek non risponde in 30s → switch a model B)

**Scope OUT**:
- Real fact-checking via web search (separato change futuro, costo $$)
- RAG su database di benchmark di mercato (separato)

**File affected**:
- `src/lib/openrouter.ts` (model env var, fallback chain)
- `src/lib/quality-gate.ts` (new — critic prompt + score parser)
- `src/app/api/phase/[id]/document/route.ts` (integra two-pass)
- `.env.local.example` (new vars: `OPENROUTER_MODEL_PRIMARY`, `OPENROUTER_MODEL_CRITIC`, `QUALITY_GATE_THRESHOLD`)
- Tests: `quality-gate.test.ts` (parse score, classify issues), integration

**Test plan**:
- Unit su `quality-gate.ts`: parse JSON valido / malformato, threshold logic
- Integration con LLM mockato: score < threshold → regen; score ≥ threshold → ship
- Manual: confronta output Pass-1-only vs Pass-1+Pass-2 su una idea reale

**Gates**:
- `npx vitest run` green
- Manual: genera 3 documenti finali, ognuno con un fatto plausibile + uno ovviamente sbagliato. Critic deve flaggare quello sbagliato.

**Effort**: M (1-2 settimane). Bottleneck: tuning del prompt critic (richiede iterazione su esempi reali).

**Effetto su pitch**: alto indiretto. I doc che finiscono nei PDF avranno citazioni o disclaimer espliciti → meno rischio di "investor catches a hallucination".

---

### Change #6: pitch-deck-slide-export

**Intent**: il fundamental output mismatch. Investitori leggono SLIDE, non documenti. La fase `pitch` deve produrre slide deck, non solo markdown.

**Scope IN**:
- Tecnologia: Marp (markdown to slides via puppeteer) OR React Slides (Reveal.js)
  - Raccomandato Marp: file `.md` con `---` separatori → render via `marp-cli` headless → PDF + HTML
  - Alternativa: custom React component con html2pdf

- Template slide per la fase `pitch`:
  - Slide 1: Title (company logo + tagline)
  - Slide 2: Problem (1 punchline + 3 supporting points)
  - Slide 3: Solution (1 punchline + product screenshot/diagram)
  - Slide 4: Market (TAM/SAM/SOM chart)
  - Slide 5: Business Model (revenue streams + pricing)
  - Slide 6: Traction (metrics se applicabile, "pre-launch" se no)
  - Slide 7: Competition (2x2 matrix)
  - Slide 8: Team (founder photos + bios brevi)
  - Slide 9: Financial projections (12-month + 24-month chart)
  - Slide 10: Ask (amount + valuation + use of funds)
- LLM prompt aggiornato per la fase pitch: deve emettere `.md` con headers che mappano agli slide
- Export: PDF (per email) + HTML standalone (per browser presentation con `marp -p`)

**Scope OUT**:
- Live presentation mode (laser pointer, presenter notes) — defer
- Animation / transitions — Marp default OK
- Multiple deck variants (10-min vs 5-min vs 2-min elevator) — defer (futuro change)

**File affected**:
- `package.json` (@marp-team/marp-cli o marp-core)
- `src/lib/pitch-deck.ts` (new — orchestrate Marp render)
- `src/app/api/phase/pitch/deck/route.ts` (new endpoint)
- `src/components/PhaseWorkspace.tsx` (button "Genera Slide Deck" visible only for pitch phase)
- LLM prompt update: aggiungi instruction "se siamo nella fase pitch, struttura il documento in 10 sezioni con i titoli esatti che mappano agli slide standard"
- Tests: render minimo + assertion su numero slide

**Test plan**:
- Unit: `pitch-deck.ts` parse markdown → slide count = 10
- Integration: POST `/api/phase/pitch/deck` → PDF binary + HTML standalone
- Manual: visiona deck rendered, confronto con YC standard

**Critical prerequisite**: #1 done (per branding), #4 done (per brand assets + charts shared).

**Gates**:
- `npx vitest run` green
- Manual: generato deck di una idea finta passa "smell test" investor-grade

**Effort**: XL (3-4 settimane). Bottleneck: visual design degli slide + LLM prompt che produce contenuto deck-ready.

**Effetto su pitch**: 🎯 **#1 angolo investor**. Da qui hai slide deck condivisibili, non più solo "PDF lunghi".

---

### Change #7: data-room-export

**Intent**: investitori vogliono UN link / UNA cartella, non 9 file separati. Bundle tutto in formato data-room-ready.

**Scope IN**:
- Endpoint `/api/data-room/export` → genera zip con:
  - `index.html` (cover page con company info + lista deliverable)
  - `pitch-deck.pdf` (da #6)
  - 8 `{phase}-document.pdf` per le altre fasi
  - `executive-summary.pdf` (auto-generated da tutte le fasi)
  - `00-README.md` con disclaimer + contatto
- UI: button "Esporta Data Room" sulla home (visible solo quando tutte 9 fasi completate)

**Scope OUT**:
- Hosted data room (link condivisibile con auth + analytics) — futuro
- Versioning del data room (v1, v2 history) — futuro

**File affected**:
- `package.json` (jszip o archiver)
- `src/lib/data-room.ts` (new)
- `src/app/api/data-room/export/route.ts` (new)
- `src/components/DataRoomButton.tsx` (new)
- `src/app/page.tsx` (mount button)

**Test plan**:
- Unit: data-room.ts genera ZIP con N file expected
- Integration: full flow su DB seeded con tutte 9 fasi completed

**Gates**:
- `npx vitest run` green
- Manual: scarica zip, estrai, apri in viewer

**Effort**: S (3-5 giorni). Dependency da #4 (PDF per fase) e #6 (deck).

**Effetto su pitch**: medio diretto. Un'unica URL/zip da mandare ai mentor.

---

### Change #8: deployment-target-decision

**Intent**: oggi non possiamo deployare. SQLite + Puppeteer + Vercel = incompatibile. Serve decidere strategia.

**Scope IN**:

**Step 1 — DECISION (con utente)**:
- Option A: Railway / Fly.io / VPS con Docker
  - Pro: SQLite + Puppeteer funzionano as-is. Costo $5-20/mese.
  - Con: meno integrato con il flusso Vercel/Next, devi gestire deploy + monitoring
- Option B: Vercel + Postgres (Neon/Supabase) + cloud Chrome service (Browserless / @sparticuz/chromium)
  - Pro: deploy un-click, scale automatic
  - Con: migrazione SQLite → Postgres (data + schema), Chrome service costa extra ($)

**Step 2 — IMPLEMENT (basato sulla decision)**:

Se A:
- `Dockerfile` con node:20 + Chrome
- `fly.toml` o `railway.json`
- Volume persistente per SQLite
- CI GitHub Actions per build + deploy

Se B:
- Migrazione schema da SQLite a Postgres (better-sqlite3 → drizzle-orm con postgres dialect)
- Refactor `src/lib/db.ts` per pool Postgres
- Migrazione data da `data/database.sqlite` a Postgres (script one-time)
- Install `@sparticuz/chromium` o switch a Browserless API
- `vercel.json` per env config

**Step 3 — FIX X1 (`fix-pdf-route-types`)**:
- Risolvi i 2 errori tsc in `pdf/route.ts` (cast `waitUntil` come accettato, gestisci Uint8Array → ArrayBuffer)

**Gates**:
- App deployata raggiungibile via URL pubblico
- Smoke test: completa fase intake → genera PDF → ricevi PDF valido
- `npx tsc --noEmit` clean (X1 risolto)
- `npm run lint` baseline (post X2 cleanup ideale, ma non gating)

**Effort**: M (1-2 settimane). Bottleneck: la decisione (step 1) + eventuale migrazione data (se B).

**Effetto su pitch**: critico. Senza deploy non puoi condividere link live con i mentor.

---

## 5. Cross-cutting rules per ogni change

### Strict TDD checklist (obbligatorio)
1. RED: scrivi il test PRIMA del codice production
2. Run `npx vitest run {test-file}` → DEVE fallire
3. GREEN: minimum code to pass
4. Run → DEVE passare
5. TRIANGULATE: aggiungi test con input diversi per forzare logica reale (no hardcoded)
6. REFACTOR: pulisci, tests stay green
7. Documenta TDD Cycle Evidence table in apply-progress

### Validation gates per change (obbligatorio in verify)
```bash
npx vitest run                # full suite green
npx tsc --noEmit              # only pre-existing errors documented
npm run lint                  # no new errors vs baseline
# NEVER: npm run build (user rule)
```

### Pre-existing issues policy
Errori che esistono prima del change → NON fixare nel change corrente. Documenta in `apply-progress` → flag in `verify-report` come WARNING. Apri micro-change separato (es X1, X2) se serve fixarli.

### Naming collision pattern
`getPhase` esiste in 2 file (`state.ts` DB lookup + `phases.ts` registry lookup). Quando importi entrambi nello stesso file, alias come `getPhaseMeta` per il registry. Future-cleanup possibile: rinominare `state.ts:getPhase` a `loadPhase` (out of scope per i change attuali).

### Engram artifact protocol per ogni change
1. orchestrator launches `/sdd-new {change-name}`
2. Each phase saves via `mem_save` con `topic_key sdd/{change-name}/{phase}` e `project startup-validation-os`
3. Sub-agent successivo legge prerequisite artifacts via `mem_search` + `mem_get_observation`
4. Su token exhaustion: nuova sessione legge questo `piano.md` + cerca `sdd-init/startup-validation-os` + cerca `sdd/{current-change}/*` per riprendere

## 6. How to resume after token exhaustion

```
1. Read this piano.md fully
2. Identify current change from §2 status table
3. mem_search per artifact attuale:
   - mem_search(query: "sdd-init/startup-validation-os", project: "startup-validation-os")
   - mem_search(query: "sdd/{current-change}/apply-progress", project: "startup-validation-os")
   - If apply-progress exists → continua da dove si è fermato (read it, list incomplete tasks, resume)
   - If no apply-progress yet → resume from last phase saved (verify-report? tasks? design? etc.)
4. Check git status — what files have been touched but not committed
5. Run `npx vitest run` per vedere lo stato dei test
6. Resume execution (con tasks list o todoWrite per tracking)

Critical: Strict TDD is ACTIVE. Never write production code without a failing test first.
```

## 7. Risk register (cross-roadmap)

| Risk | Mitigation |
|------|------------|
| User chooses #4 prima di #2 → refactor su codice senza test | Documented sopra; raccomando #2 first |
| LLM hallucination in #4 / #5 finisce nei PDF → investor catches | Mitigato da #5 quality gate. Pre-mitigazione: explicit disclaimers nei prompt |
| Deploy bloccato fino a #8 → mentor non vede live demo | Workaround: ngrok / localtunnel temporaneo durante il corso |
| Token exhaustion mid-change → contesto perso | Mitigato da questo piano.md + engram artifacts |
| User abbandona dopo 4-5 settimane | Atomic changes → partial value at each step |
| Pre-existing lint/tsc issues bloccano #8 deploy | X1 + X2 micro-changes opportunistic prima di #8 |

## 8. Glossary

- **SDD**: Spec-Driven Development — la pipeline explore → propose → spec → design → tasks → apply → verify → archive
- **Strict TDD**: red-green-refactor enforced. Test first. No exception.
- **Engram**: persistent memory backend (project: `startup-validation-os`). Topic keys for artifact storage.
- **Drift**: divergenza tra duplicate sources of truth (eliminato in #1 per le fasi).
- **Visible win**: change che ha impatto diretto sul deliverable visto dall'investitore (PDF, deck). #4 e #6 sono visible wins.

---

**Last updated**: 2026-05-22 dopo chiusura completa della roadmap #1-#8 + X1/X2.
**Next action**: review finale/manual smoke su UI e deploy Railway quando hai env/volume pronti.
