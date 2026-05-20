# Lessons Learned

> Append-only register of recurring rules and patterns. Re-read at start by /10x-frame, /10x-research, /10x-plan, /10x-plan-review, /10x-implement, /10x-impl-review.

## Assign a kill date to every feature flag

- **Context**: Any phase that introduces a feature flag
- **Problem**: Flags accumulate and are never removed, adding dead code paths and increasing test surface permanently.
- **Rule**: Always assign a kill date when introducing a feature flag. Add a TODO with the date and create a follow-up task to remove the flag.
- **Applies to**: all
