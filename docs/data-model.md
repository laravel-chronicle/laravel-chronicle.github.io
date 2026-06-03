---
title: Data Model
---

# Data Model

Chronicle stores append-only audit entries in the `chronicle_entries` table and signed ledger anchors in `chronicle_checkpoints`.

## Entry fields

Core entry columns:

- `id`: ULID primary key
- `actor_type`: actor reference type
- `actor_id`: actor reference id
- `action`: domain action string
- `subject_type`: subject reference type
- `subject_id`: subject reference id
- `payload`: canonical payload JSON
- `payload_hash`: SHA-256 of the canonical payload
- `chain_hash`: SHA-256 of the previous chain head plus payload hash
- `checkpoint_id`: optional checkpoint foreign key
- `metadata`: optional JSON metadata
- `context`: optional JSON execution context
- `tags`: optional JSON array of tags
- `diff`: optional JSON diff structure
- `correlation_id`: optional workflow/request correlation id
- `created_at`: UTC timestamp

## Example entry

```json
{
  "id": "01JNV8EJFKJVEWRS2R1W4GD5E6",
  "actor_type": "App\\Models\\User",
  "actor_id": "42",
  "action": "invoice.sent",
  "subject_type": "App\\Models\\Invoice",
  "subject_id": "91",
  "payload": {
    "email": "client@example.com"
  },
  "payload_hash": "d5d8...",
  "chain_hash": "6ac4...",
  "checkpoint_id": null,
  "metadata": {
    "email": "client@example.com"
  },
  "diff": null,
  "tags": ["billing", "email"],
  "correlation_id": null,
  "created_at": "2026-03-06T12:34:56.000000Z"
}
```

## Entry characteristics

Chronicle entries are intentionally immutable.

Once inserted:

- they cannot be updated
- they cannot be deleted
- they must be corrected by appending a new entry rather than rewriting history

## Checkpoint fields

The `chronicle_checkpoints` table stores:

- `id`
- `chain_hash`
- `signature`
- `algorithm`
- `key_id`
- `metadata`
- `created_at`

Checkpoints anchor the ledger at a specific chain head so later verification has a signed reference point.

## Integrity rules

Chronicle’s core integrity invariants are:

- `payload_hash = SHA256(canonical(payload))`
- `chain_hash = SHA256(previous_chain_hash + payload_hash)`
- the first entry uses `"0"` as the previous chain value

If any persisted entry changes, one or both of these checks fail.

## Access patterns

Chronicle’s built-in query surfaces are optimized around:

- actor and subject lookups
- action filtering
- correlation and workflow grouping
- time-range queries
- cursor pagination and streaming
- tag lookups through JSON containment

## Built-in indexes

Chronicle’s migrations add indexes for:

- `action`
- `(actor_type, actor_id)`
- `(subject_type, subject_id)`
- `correlation_id`
- `created_at`

For PostgreSQL-specific tag indexing, see [Performance & Indexing](./performance-and-indexing.md).
