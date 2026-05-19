---
project: "NPC Manager"
context_type: greenfield
product_type: web-app
target_scale:
  users: small
  qps: low
  data_volume: small
timeline_budget:
  mvp_weeks: 3
  hard_deadline: null
  after_hours_only: true
created: 2026-05-18
updated: 2026-05-18
checkpoint:
  current_phase: 8
  phases_completed: [1, 2, 3, 4, 5, 6, 7]
  gray_areas_resolved:
    - topic: "pain category"
      decision: "workflow friction — GM has the data in their head or notes; the app consolidates and makes it queryable"
    - topic: "persona scope"
      decision: "solo GM — one person managing their own campaigns; no collaboration in MVP"
    - topic: "product insight"
      decision: "existing tools (Obsidian, Notion, World Anvil) are too generic — they don't know what an NPC is; an NPC-native model beats a blank canvas for GMs"
  frs_drafted: 11
  quality_check_status: accepted
---

## Vision & Problem Statement

Game Masters running tabletop RPG campaigns routinely manage dozens of NPCs — each with motivations, backstories, and webs of relationships — but no tool models this domain natively. Today that means juggling it in their head or across scattered notes, which breaks under the load of a long campaign and costs prep time and in-session coherence.

Existing general-purpose tools (Obsidian, Notion, World Anvil) offer a blank canvas — they don't know what an NPC is. A product that treats an NPC as a first-class entity, and that can simulate in-character responses using the character's known traits and relationships, gives GMs something they cannot build themselves in a generic tool.

## User & Persona

**Primary persona**: Solo GM — one person (the Game Master) who writes, runs, and maintains a TTRPG campaign alone. They reach for this product during session prep when they need to create a new NPC or review an existing one, and mid-session when a player does something unexpected and they need to improvise a reaction consistent with the NPC's profile and relationships.

They are comfortable with web tools, but their primary focus during a session is the story — not the software. The tool must be fast to query and forgiving of sparse data.

## Access Control

Email + password login via a standard web form. Each registered user owns their own campaigns, NPCs, and relationships — no cross-account visibility. Flat role model: no admin panel, no team workspaces, no sharing in MVP.

An unauthenticated user who reaches any gated route is redirected to the login form. Registration is open (any email can sign up) unless constrained at deployment time.

## Success Criteria

### Primary
- A GM completes the end-to-end flow: creates an NPC with name, role, and traits; adds at least one relationship to another NPC; submits a natural-language query ("How would [NPC] react to X?"); and receives a coherent in-character AI response that references the NPC's traits and relationship context.

### Secondary
- The NPC relationship graph renders visually (vis.js integration) and is navigable — the GM can see all NPCs in a campaign and their connections at a glance.

### Guardrails
- Each user's campaign data is completely private: no cross-account data access, no query can return another user's NPCs or campaigns.

**Scope decision (Phase 3):** AI backstory generation (auto-generating NPC backstory from name + role) is cut from MVP and deferred to v2. The primary AI capability is the in-character reaction query. Estimated: ~3 weeks of after-hours work at 2h/evening.

## User Stories

### US-01: GM queries an NPC's in-character reaction

- **Given** a logged-in GM with at least one campaign containing an NPC with traits defined
- **When** they open the NPC's detail page and submit a natural-language scenario query ("How would [NPC] react to X?")
- **Then** they receive an in-character AI response that references the NPC's role, traits, and known relationships

#### Acceptance Criteria
- Response is visibly different for NPCs with different traits and relationships
- Query with no relationships defined still produces an in-character response (relationships enrich, not gate, the output)

## Functional Requirements

### Authentication

- FR-001: GM can register with email and password. Priority: must-have
  > Socrates: Counter-argument considered: "a single hardcoded user would prove the product for less code." Resolution: kept; the cert/demo requirement needs real auth with multiple test accounts, so open registration is the simpler path.

- FR-002: GM can log in and log out. Priority: must-have
  > Socrates: No counter-argument surfaced; login/logout is non-negotiable for any authenticated product.

### Campaigns

- FR-003: GM can create a campaign with a name and description. Priority: must-have
  > Socrates: No counter-argument; campaigns are the top-level container — without them the data model collapses.

- FR-004: GM can view a list of their campaigns. Priority: must-have
  > Socrates: No counter-argument; the list is the GM's only navigation back to their own work after login.

- FR-005: GM can edit and delete a campaign they own. Priority: must-have
  > Socrates: No counter-argument; CRUD on campaigns is baseline and must-have.

### NPCs

- FR-006: GM can add an NPC to a campaign (name, role, traits). Priority: must-have
  > Socrates: No counter-argument; NPC creation is the core product action.

- FR-007: GM can view, edit, and delete an NPC. Priority: must-have
  > Socrates: No counter-argument; NPCs change over a campaign — edit and delete are both must-haves. Cascade behavior on delete (orphaned relationships) must be defined at implementation.

### Relationships

- FR-008: GM can create a relationship between two NPCs (type + description). Priority: must-have
  > Socrates: No counter-argument; relationships are the core data model that makes AI reactions contextual — without them the AI sees only a solo NPC profile.

- FR-009: GM can view and delete relationships. Priority: must-have
  > Socrates: No counter-argument; view and delete on relationships is baseline.

### AI Reaction

- FR-010: GM can submit a natural-language scenario query for a single NPC and receive an in-character AI response that uses the NPC's profile and relationships as context. Priority: must-have
  > Socrates: Counter-argument considered: "AI integration adds external cost and latency — ship the core CRUD first to de-risk." Resolution: kept as must-have goal; the FR is the product's differentiating capability. Implementation note: build and validate NPC/relationship CRUD before wiring the AI layer; the sequencing is a build-order concern, not a scope concern.

### Graph

- FR-011: GM can view a visual graph of all NPCs and relationships in a campaign. Priority: nice-to-have (implement last; skip if time runs short)
  > Socrates: Counter-argument considered: "vis.js adds a dependency and integration complexity for secondary value — defer to v2." Resolution: kept as a de-prioritized nice-to-have; the relationship data model is in place regardless; the visual rendering is added last and dropped if the timeline is tight.

## Business Logic

Given a named NPC's profile (role, traits) and their known relationships to other NPCs, the application generates an in-character response to a user-supplied scenario — a response that is consistent with who that NPC is and what they know.

The inputs to the rule are user-supplied: the NPC's name, role, free-text traits, and zero or more labeled relationships to other NPCs (each with a type and short description). The user also supplies a natural-language scenario ("the king has just died — how does this NPC react?"). The output is a prose response written from the NPC's perspective, constrained by their profile and the relational context visible to them.

The rule applies once per query. The GM reads the response and decides whether it fits the story; they can re-query with a revised scenario if it doesn't. There is no automatic state update — the NPC's stored profile does not change as a result of a query.

## Non-Functional Requirements

- Campaign data is fully isolated per authenticated user: no query, API call, or page renders data belonging to a different account.
- The product is usable on the two most recent major versions of the four mainstream desktop browsers (Chrome, Firefox, Safari, Edge) without installing additional software.
- A GM submitting an AI reaction query sees continuous visible feedback within 2 seconds of submitting, even if the full response is not yet ready.

## Non-Goals

- No AI backstory generation in v1 — GMs write NPC backstory manually. Backstory generation is deferred to v2 to de-risk the AI integration from the critical path.
- No campaign sharing between users — each GM's campaigns are private; no co-GM workspaces, no player-visible mode.
- No NPC search or filter within a campaign — browse-only in MVP; search deferred to v2.
- No data export — no PDF, Markdown, or download capability in MVP.
- No MCP Server or external API surface — the product is a standalone web tool in MVP; programmatic access from other tools is a planned post-MVP extension.

## Forward: tech-stack

- AI client abstraction: the seed notes specify `AiClientInterface` with `OllamaClient` for local development and `AnthropicClient` for demo/production. Both must produce identical feature behavior; the only user-observable difference is latency. This is a design constraint for the tech-stack step, not a PRD NFR.




