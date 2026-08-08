---
change_id: npc-wfrp4e-stat-block
title: NPC WFRP4e stat block
status: implementing
created: 2026-08-08
updated: 2026-08-08
---

## Notes

First implementation slice of the WFRP4e NPC stats initiative (see `context/foundation/prd-v2.md`). Covers FR-012–FR-019 and FR-022–FR-023: creature-type selection from a Bestiary catalog, auto-fill with manual-edit protection, editable attributes with bounded validation, derived-stat auto-calc with override, creature traits (standard + individually added), skills & talents, and full non-regression for existing stat-less NPCs and the AI reaction flow.

Out of scope for this slice: FR-020 (Equipment) and FR-021 (AI reaction enrichment) — both nice-to-have, deferred to a follow-up change.

Branch: `npc-wfrp4e-stat-block`, cut from `npc-wfrp4e-stats` (the parent integration branch for this initiative — PRs from slice branches merge back into it, not directly into `master`).
