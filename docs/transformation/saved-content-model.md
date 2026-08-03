# Saved content model

> Section 33.1. **Not built.** `savedContent.exists: false`.

## Status

A grep across `src/` for `saved_item`, `savedItems`, `SavedItem` and `bookmark`
returns nothing. This document specifies the feature; it does not describe one.

## Target schema

Section 33.1 defines nine fields:

```yaml
saved_item:
  object_id:          # slug of the thing saved
  object_type:        # one of the 10 types below
  reason:             # why, from a fixed list — this is the useful field
  user_note:          # free text
  tags:
  saved_at:
  last_reviewed_at:
  review_priority:
```

Savable types: concepts, mental models, diagrams, architectures, code examples, sources,
questions, mistakes, labs, interview scenarios.

## The two rules that make it worth building

**Saving must not mark anything as learned.** A save is an intention, and conflating it
with mastery is how a reading list becomes a false progress bar.

**`reason` is a closed list, not free text.** Review later · Important for work ·
Interview preparation · I did not understand this · Useful architecture · Useful code ·
Research later.

The reason a closed list matters: "I did not understand this" is a signal the review
queue can act on, and free text is not. Section 33.2 ranks saved concepts as a queue
source, and that only works if the save carries a machine-readable motive.

## Fit with what exists

- `Progress` already holds 20 fields in one `localStorage` key; `savedItems: SavedItem[]` is additive and defaults to empty, so an old save loses nothing.
- `BackupPanel` already exports and clears the whole `Progress` object, so export and delete come free.
- No server needed — this is one of the few section 33 features that fits the static-export model completely.
- `review_priority` and `last_reviewed_at` line up with `ReviewState`, so a saved item can enter the existing 7-rung ladder rather than needing a second scheduler.

## Why it has not been built

Nothing structural. It is genuinely absent, and given that it needs no backend it is the
cheapest section 33 feature to close. Ranked below wiring confident-wrong into the queue
only because that reuses data already collected.
