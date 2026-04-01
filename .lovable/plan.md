

# Refactor: Narrative Engine, Scene Engine & AI Story Consultant

## Overview

The three core engines (Narrative, Scene, AI Consultant) were built incrementally, resulting in duplicated definitions, monolithic components, and inconsistent data flow. This refactor extracts shared concerns into a clean module structure while preserving every existing feature.

## What's wrong today

```text
NarrativeEngine.tsx (1694 lines)
├── Story field definitions (duplicated in 3 files)
├── Format/pacing math (duplicated in 3 edge functions)
├── AI streaming logic (inlined, 60+ lines)
├── Fix implementation logic (inlined, 80+ lines)
├── Print/export calls
├── Project CRUD
└── All UI rendering

SceneBuilder.tsx (1093 lines)
├── Scene generation API calls (inlined)
├── Copy/print/export logic (100+ lines)
├── Validation (getAllowedTiers — duplicated in 3 files)
├── Scene editing logic
└── All UI rendering

Edge Functions (3 files)
├── getAllowedTiers — different math than frontend
├── CORS headers — copy-pasted 6+ times
├── Scene slim/merge — only in implement-fixes
└── Pacing calculations — duplicated from frontend
```

## Target Architecture

```text
src/lib/narrative/
├── types.ts              — Scene, StoryField, StorySection, StoryProject, MediumConfig
├── fields.ts             — coreDnaFields, sections (SINGLE SOURCE OF TRUTH)
├── pacing.ts             — getAllowedTiers, format calculations, pacing summaries
├── api.ts                — streamAnalysis(), implementFixes(), generateScenes()
├── formatting.ts         — copyScenes(), printScenes(), printAnalysis()
└── validation.ts         — getSceneViolations(), getClosestAllowedTier()

src/pages/NarrativeEngine.tsx  — pure UI orchestration (~600 lines)
src/components/SceneBuilder.tsx — pure UI orchestration (~500 lines)
```

---

## Phase 1: Extract shared types and field definitions

### New file: `src/lib/narrative/types.ts`
- Move `Scene` interface from SceneBuilder.tsx
- Move `StoryField`, `StorySection`, `StoryProject` interfaces from NarrativeEngine.tsx
- Add `MediumConfig` type (currently `Record<string, string>`)
- Add `ParsedFix`, `SceneChange` types
- Export everything; all files import from here

### New file: `src/lib/narrative/fields.ts`
- Move `coreDnaFields` (with placeholder + multiline metadata) — replaces 3 copies
- Move `sections` array — replaces 3 copies
- Move `fieldGlossaryMap`, `sectionGlossaryMap`
- Export `allFieldKeys` computed constant
- `storyPdfExport.ts` and `storyPrintAll.ts` import from here instead of maintaining their own copies

---

## Phase 2: Extract pacing and validation logic

### New file: `src/lib/narrative/pacing.ts`
- Move `getAllowedTiers()` — SINGLE implementation replacing 3 divergent copies
- Move `getClosestAllowedTier()` from SeasonOverviewPanel
- Move `getSceneViolations()` from SeasonOverviewPanel
- Add `computePacingSummary(medium, config)` — extracts the inline pacing math currently duplicated in NarrativeEngine.tsx UI and analyze-story edge function
- SeasonOverviewPanel.tsx re-exports from here (backwards compatible imports)

### New file: `src/lib/narrative/validation.ts`
- `getSceneViolations()` moved here
- `fixAllViolations(scenes, totalEpisodes)` — extracted from SceneBuilder's `fixViolations` callback

**Edge function note:** The backend edge functions (`analyze-story`, `generate-scenes`) will continue to have their own `getAllowedTiers` copy since edge functions can't import from `src/`. However, the implementations will be aligned to use the same math (currently the frontend uses `episode / (total - 1)` fractions while the backend uses percentage thresholds — these will be unified to the percentage-based approach).

---

## Phase 3: Extract API client layer

### New file: `src/lib/narrative/api.ts`
Extracts all API interaction logic currently inlined in component event handlers:

- `streamAnalysis(storyData, scenes?, signal?)` → returns `AsyncGenerator<string>`
  - Replaces the 60-line inline streaming logic in `runAnalysis`
- `implementFixes(scenes, analysis, storyData, signal?)` → returns `{ correctedScenes, changesSummary }`
  - Replaces the 40-line inline fetch in "Implement All Fixes" handler
  - Replaces the 40-line inline fetch in per-fix "Apply This Fix" handler (same function, different analysis param)
- `generateScenes(storyData, medium, config, episode?, totalEps?)` → returns `Scene[]`
  - Replaces `generateScenesForEpisode` in SceneBuilder
- All functions handle 429/402 errors consistently, throw typed errors

---

## Phase 4: Extract formatting/export logic

### New file: `src/lib/narrative/formatting.ts`
- Move `copyScenes()` from SceneBuilder (30 lines)
- Move `printScenes()` from SceneBuilder (80 lines)
- Move analysis print logic from NarrativeEngine (20 lines)
- These become pure functions: `copyScenesText(scenes, medium, config)`, `printScenesHtml(scenes, medium, config)`, `printAnalysisHtml(analysis, title)`

### Update: `src/lib/storyPdfExport.ts`
- Replace local field definitions with imports from `fields.ts`
- Keep export logic as-is

### Update: `src/lib/storyPrintAll.ts`
- Replace local field definitions with imports from `fields.ts`
- Keep print logic as-is

---

## Phase 5: Slim down NarrativeEngine.tsx and SceneBuilder.tsx

### `src/pages/NarrativeEngine.tsx` (1694 → ~600 lines)
- Import types, fields, pacing from `src/lib/narrative/*`
- Replace inline `runAnalysis` with call to `api.streamAnalysis()`
- Replace inline "Implement Fixes" handlers with calls to `api.implementFixes()`
- Replace inline print/copy logic with calls to `formatting.*`
- Keep: state management, UI rendering, project CRUD (these are page-specific)

### `src/components/SceneBuilder.tsx` (1093 → ~500 lines)
- Import types from `src/lib/narrative/types`
- Replace `generateScenesForEpisode` with `api.generateScenes()`
- Replace `copyScenes`/`printScenes` with `formatting.*` calls
- Replace inline `fixViolations` with `validation.fixAllViolations()`
- Import `getAllowedTiers` etc. from `pacing.ts` instead of SeasonOverviewPanel
- Keep: useUndoableState, UI rendering, scene selection state

### `src/components/SeasonOverviewPanel.tsx`
- Remove `getAllowedTiers`, `getSceneViolations`, `getClosestAllowedTier` definitions
- Re-export from `src/lib/narrative/pacing` for backward compatibility

---

## Phase 6: Align edge function pacing math

### `supabase/functions/analyze-story/index.ts`
- Update `getAllowedTiers` to use the same percentage thresholds as the frontend (0.3/0.7/0.8 breakpoints instead of 0.25/0.6/0.8)
- Remove unused `getAllowedTiersComic` function

### `supabase/functions/generate-scenes/index.ts`
- Align inline tier thresholds to match (already at 0.3/0.7/0.8 — just verify)

---

## AI Improvements (2 points)

### 1. Context-aware re-analysis after fixes
Currently `runAnalysis` sends the full story data + scenes every time. After fixes are applied, the AI has no memory of what it previously flagged. Update the `analyze-story` edge function to accept an optional `previousAnalysis` string. When provided, the system prompt instructs the model to: "Here is your previous analysis. The user has applied some fixes. Identify what has been resolved and what remains. Do NOT repeat resolved issues — focus on remaining gaps and new observations."

### 2. Structured analysis output
Currently the AI Consultant returns free-form markdown, and `parseAnalysisIntoFixes` uses fragile regex to extract actionable items. Add a secondary tool-call pass (using the existing `implement-fixes` pattern) that converts the free-text analysis into structured JSON: `{ strengths: string[], gaps: { title, description, category, severity }[], sceneIssues: { sceneNumber, episode, issue, suggestedFix }[] }`. This enables richer UI (severity badges, filtering, progress tracking) and eliminates regex parsing failures.

---

## Files changed summary

| File | Action |
|------|--------|
| `src/lib/narrative/types.ts` | **New** — shared types |
| `src/lib/narrative/fields.ts` | **New** — field definitions (single source) |
| `src/lib/narrative/pacing.ts` | **New** — tier rules, pacing math |
| `src/lib/narrative/api.ts` | **New** — API client layer |
| `src/lib/narrative/formatting.ts` | **New** — copy/print/export helpers |
| `src/lib/narrative/validation.ts` | **New** — scene validation |
| `src/pages/NarrativeEngine.tsx` | **Refactor** — import from modules, remove inline logic |
| `src/components/SceneBuilder.tsx` | **Refactor** — import from modules, remove inline logic |
| `src/components/SeasonOverviewPanel.tsx` | **Refactor** — re-export from pacing.ts |
| `src/components/ActionableFixesPanel.tsx` | **Refactor** — import types from narrative/types |
| `src/components/SceneDiffDialog.tsx` | **Refactor** — import types from narrative/types |
| `src/lib/storyPdfExport.ts` | **Refactor** — import fields from narrative/fields |
| `src/lib/storyPrintAll.ts` | **Refactor** — import fields from narrative/fields |
| `supabase/functions/analyze-story/index.ts` | **Update** — align tier math, add previousAnalysis support |
| `supabase/functions/generate-scenes/index.ts` | **Verify** — ensure tier math alignment |
| `supabase/functions/implement-fixes/index.ts` | **No change** |

## What is NOT touched
- All other components, pages, and features outside the Narrative/Scene/Consultant system
- Database schema (no migrations)
- UI/UX appearance (pixel-identical output)
- Edge function structure (no new functions, no deletions)

