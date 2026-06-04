---
project: NPC Manager
version: 1
status: draft
created: 2026-06-04
updated: 2026-06-04
prd_version: 1
main_goal: speed
top_blocker: time
---

# Roadmap: NPC Manager

> Derived from `context/foundation/prd.md` (v1) + auto-researched codebase baseline.
> Edit-in-place; archive when superseded.
> Slices below are listed in dependency order. The "At a glance" table is the index.

## Vision recap

Game Masters running TTRPG campaigns manage dozens of NPCs across motivations, backstories, and relationships — but no tool models this domain natively. NPC Manager treats NPCs as first-class entities and generates in-character AI responses based on a character's known traits and relationships. The differentiating capability — the one trait that, if removed, makes NPC Manager indistinguishable from a blank-canvas note tool — is that each AI query is grounded in the GM's own structured NPC data and constrained by that character's known relational context.

## North star

**S-04: GM can submit a natural-language scenario and receive an in-character AI response** — this is the validation milestone (the slice that, when working, confirms the product's core bet is worth pursuing: that in-character AI reactions grounded in a GM's own NPC data are genuinely useful, and not something a generic note-taking tool can replicate).

> The "north star" used here means: the smallest end-to-end slice whose successful delivery would confirm the core product bet — placed as early as prerequisites allow because everything else only matters if this works.

## At a glance

| ID   | Change ID         | Outcome (user can …)                                                                                                    | Prerequisites | PRD refs                                                   | Status   |
|------|-------------------|-------------------------------------------------------------------------------------------------------------------------|---------------|------------------------------------------------------------|----------|
| F-01 | db-schema-rls     | (foundation) schema + RLS for campaigns, NPCs, relationships live; queries data-isolated per user                       | —             | FR-003, FR-004, FR-005, FR-006, FR-007, FR-008, FR-009, Access Control | ready    |
| S-01 | campaigns-crud    | create, view, edit, and delete own campaigns; existing auth flow verified end-to-end                                    | F-01          | FR-001, FR-002, FR-003, FR-004, FR-005                     | proposed |
| S-02 | npc-crud          | add, view, edit, and delete NPCs within a campaign                                                                      | F-01, S-01    | FR-006, FR-007                                             | proposed |
| S-03 | npc-relationships | create, view, and delete relationships between two NPCs                                                                 | S-02          | FR-008, FR-009                                             | proposed |
| S-04 | npc-ai-reaction   | submit a natural-language scenario and receive a streamed in-character AI response referencing NPC traits and relationships | S-03          | FR-010, US-01                                              | proposed |

## Baseline

What's already in place in the codebase as of `2026-06-04` (auto-researched + user-confirmed).
Foundations below assume these are present and do NOT re-scaffold them.

- **Frontend:** present — Astro 6 + React 19 + Tailwind, auth UI wbudowane (`src/components/auth/SignInForm.tsx`)
- **Backend / API:** partial — endpointy tylko auth (`src/pages/api/auth/`), brak endpointów produktowych
- **Data:** partial — klient Supabase skonfigurowany, brak migracji i plików schematu (`supabase/config.toml: schema_paths=[]`)
- **Auth:** present — Supabase Auth w pełni zintegrowany: middleware (`src/middleware.ts:12–22`), signin/signup/signout API
- **Deploy / infra:** present — Cloudflare Workers (`wrangler.jsonc`), GitHub Actions CI (`.github/workflows/ci.yml`)
- **Observability:** absent — brak logowania, error tracking, metrics

## Foundations

### F-01: Schemat bazy danych i polityki RLS

- **Outcome:** (foundation) tabele campaigns, npcs oraz relationships są gotowe w Supabase; polityki Row Level Security zapewniają pełną izolację danych per użytkownik — żadne zapytanie nie zwraca danych innego konta.
- **Change ID:** `db-schema-rls`
- **PRD refs:** FR-003, FR-004, FR-005, FR-006, FR-007, FR-008, FR-009, Access Control section
- **Unlocks:** S-01, S-02, S-03 (wszystkie wymagają tabel produktowych); eliminuje ryzyko wycieku cross-account zanim pojawi się jakakolwiek UI
- **Prerequisites:** —
- **Parallel with:** —
- **Blockers:** —
- **Unknowns:** —
- **Risk:** Musi być na miejscu przed pierwszym user-facing slice — błędy w RLS ujawniają się dopiero przy cross-account query; wychwycenie ich przed UI jest tańsze niż po.
- **Status:** ready

## Slices

### S-01: Kampanie — zarządzanie

- **Outcome:** user can create a campaign with name and description, view the list of their own campaigns, and edit or delete a campaign they own; the existing auth flow (registration, login, logout) is verified as working end-to-end against product routes.
- **Change ID:** `campaigns-crud`
- **PRD refs:** FR-001, FR-002, FR-003, FR-004, FR-005
- **Prerequisites:** F-01
- **Parallel with:** —
- **Blockers:** —
- **Unknowns:** —
- **Risk:** Auth jest present w baseline, ale nie był jeszcze testowany pod kątem session-gated product routes; pierwsza integracja kampanii to de facto pierwszy real test RLS — jeśli izolacja danych zawiedzie, widać to tu.
- **Status:** proposed

### S-02: NPC — zarządzanie

- **Outcome:** user can add an NPC to a campaign (name, role, traits), view NPC detail, edit the NPC's profile, and delete the NPC.
- **Change ID:** `npc-crud`
- **PRD refs:** FR-006, FR-007
- **Prerequisites:** F-01, S-01
- **Parallel with:** —
- **Blockers:** —
- **Unknowns:**
  - Jakie jest zachowanie cascade przy usunięciu NPC posiadającego relacje? — Owner: user. Block: no. (FR-007 notes this must be defined at implementation; nie blokuje planowania.)
- **Risk:** Profil NPC (name, role, traits) jest bezpośrednim wejściem do zapytania AI — jeśli model danych jest tu zbyt ograniczony, FR-010 będzie wymagał rework; bezpieczniej zwalidować kształt profilu przed podłączeniem warstwy AI.
- **Status:** proposed

### S-03: Relacje między postaciami

- **Outcome:** user can create a relationship between two NPCs (type and description), view all relationships for an NPC, and delete a relationship.
- **Change ID:** `npc-relationships`
- **PRD refs:** FR-008, FR-009
- **Prerequisites:** S-02
- **Parallel with:** —
- **Blockers:** —
- **Unknowns:** —
- **Risk:** Relacje są kontekstem relacyjnym przekazywanym do zapytania AI w S-04; niepełne lub źle ustrukturyzowane dane relacyjne obniżą jakość odpowiedzi AI — lepiej zwalidować kształt danych tu, zanim zostaną podłączone do warstwy AI.
- **Status:** proposed

### S-04: Reakcja NPC — zapytanie AI

- **Outcome:** user can submit a natural-language scenario query for a single NPC and receive a streamed, in-character AI response that references the NPC's role, traits, and known relationships; visible progress feedback appears within 2 seconds of submission.
- **Change ID:** `npc-ai-reaction`
- **PRD refs:** FR-010, US-01
- **Prerequisites:** S-03
- **Parallel with:** —
- **Blockers:** —
- **Unknowns:**
  - Klucz Anthropic API musi być dostępny w środowisku deploymentu. — Owner: user. Block: no. (Klucz potrzebny przy implementacji/deploy, nie przy planowaniu.)
- **Risk:** Integracja AI dodaje zewnętrzne opóźnienie i koszt; NFR 2 sekund widocznego feedbacku wymaga obsługi streaming response — to najwyższe ryzyko techniczne w roadmapie; celowo umieszczone jako ostatnie, żeby CRUD był zwalidowany przed podłączeniem warstwy AI.
- **Status:** proposed

## Backlog Handoff

| Roadmap ID | Change ID         | Suggested issue title                                      | Ready for `/10x-plan` | Notes                          |
|------------|-------------------|------------------------------------------------------------|------------------------|--------------------------------|
| F-01       | db-schema-rls     | Set up DB schema + RLS for campaigns, NPCs, relationships  | yes                    | Run `/10x-plan db-schema-rls`  |
| S-01       | campaigns-crud    | Campaigns CRUD — create, list, edit, delete                | no                     | Awaits F-01                    |
| S-02       | npc-crud          | NPC CRUD — add, view, edit, delete                         | no                     | Awaits S-01                    |
| S-03       | npc-relationships | NPC Relationships — create, view, delete                   | no                     | Awaits S-02                    |
| S-04       | npc-ai-reaction   | NPC AI reaction query with streaming response              | no                     | Awaits S-03; north star        |

## Open Roadmap Questions

Brak otwartych pytań — PRD w pełni wypełniony, zero open questions ("No open questions — all sections fully populated from shape-notes. Quality check from shaping session: accepted.").

## Parked

- **FR-011: Visual relationship graph** — Why parked: PRD §Non-Goals — nice-to-have; pominięte zgodnie z celem `speed`; skip if timeline is tight.
- **AI backstory generation** — Why parked: PRD §Non-Goals — deferred to v2, de-risks AI integration from critical path.
- **Campaign sharing between users** — Why parked: PRD §Non-Goals — no co-GM workspaces, no player-visible mode in MVP.
- **NPC search / filter** — Why parked: PRD §Non-Goals — browse-only in MVP; search deferred to v2.
- **Data export (PDF, Markdown)** — Why parked: PRD §Non-Goals — no download capability in MVP.
- **MCP Server / external API surface** — Why parked: PRD §Non-Goals — standalone web tool in MVP.

## Done

(Empty on first generation. `/10x-archive` appends an entry here when a change whose Change ID matches a roadmap item is archived.)
