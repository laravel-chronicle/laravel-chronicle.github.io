---
title: Integrity Verification
---

# Integrity Verification

Chronicle can verify the live ledger directly from the database.

Use:

```bash
php artisan chronicle:verify
```

## What the verifier checks

Chronicle walks the ledger in stable order:

1. `created_at`
2. `id`

For each entry it verifies:

- the canonical payload still hashes to `payload_hash`
- the expected chain hash still matches `chain_hash`
- any linked checkpoint exists
- any linked checkpoint signature verifies against the checkpoint chain hash

## Failure types

The current verifier can fail with:

- `payload_hash_mismatch`
- `chain_hash_mismatch`
- `checkpoint_missing`
- `checkpoint_signature_invalid`

The command also reports the entry id where corruption begins.

## Why this differs from export verification

`chronicle:verify` validates the live ledger in the source system.

`chronicle:verify-export` validates a portable export dataset.

You usually want both:

- live verification for operational integrity checks
- export verification for off-system auditability

## Operational use

Run live verification:

- on a schedule
- after database restore procedures
- before or after creating formal exports
- during incident response if tampering is suspected

## Interpreting a failure

When verification fails, the reported entry id is where Chronicle first detects broken integrity. The actual root cause may be that entry or an earlier out-of-band change that cascaded into later chain failures.

That means the failure location is a forensic starting point, not always the full story.
