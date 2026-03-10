---
title: Export Format
---

# Export Format

Chronicle exports a deterministic dataset that can be verified outside the source application.

## Directory layout

```text
chronicle-export/
├─ entries.ndjson
├─ manifest.json
└─ signature.json
```

## `entries.ndjson`

Each line is one exported entry.

Entries are written in export order:

1. `created_at`
2. `id`

Example:

```json
{"id":"01HVWJZX4E2R8P1C7W4H4S2C3J","actor_type":"App\\Models\\User","actor_id":"42","action":"order.created","subject_type":"App\\Models\\Order","subject_id":"981","payload":{"amount":5000},"payload_hash":"6a3c8a...","chain_hash":"7bc9c4...","checkpoint_id":null,"tags":["orders"],"diff":null,"correlation_id":"01HVWFH1QY7X8R9D4G3","created_at":"2026-03-06T11:32:14.000000Z"}
```

Each exported line contains the core ledger data required for independent verification.

## `manifest.json`

The manifest stores export-level metadata:

```json
{
  "version": "1.0",
  "generated_at": "2026-03-06T11:40:00Z",
  "entry_count": 1523,
  "first_entry_id": "01HVWJZX4E2R8P1C7W4H4S2C3J",
  "last_entry_id": "01HVWJZX4E2R8P1C7W4H4S2C4F",
  "chain_head": "9fa2b3c4...",
  "dataset_hash": "a93f47b8...",
  "algorithm": "ed25519"
}
```

Important fields:

- `entry_count`
- `first_entry_id`
- `last_entry_id`
- `chain_head`
- `dataset_hash`

Together these protect against truncation, reordering, and content tampering.

## `signature.json`

The signature file stores the detached signature for the dataset hash:

```json
{
  "signature": "base64-encoded-signature",
  "algorithm": "ed25519",
  "key_id": "your-key-id"
}
```

Chronicle signs the dataset hash, not the raw entries file directly.

## Versioning expectations

The export format is versioned through the manifest. That allows downstream verifiers to reject incompatible changes instead of silently interpreting a new structure as if it were the old one.

## Verification summary

Independent verification should:

1. Ensure all three files exist
2. Validate `manifest.json` and `signature.json`
3. Parse `entries.ndjson` line by line
4. Recompute the chain hash across all entries
5. Recompute the dataset hash for the NDJSON file
6. Compare computed values with the manifest
7. Verify the detached signature

For the operational workflow, see [Export Verification Guide](./export-verification.md).
