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

Full verification can fail with:

- `payload_hash_mismatch`
- `chain_hash_mismatch`
- `checkpoint_missing`
- `checkpoint_signature_invalid`
- `unknown_key`

The command also reports the entry id where corruption begins.

Chronicle v1.11 adds cheaper, scoped verification modes (`--checkpoints-only`, `--since-last-checkpoint`, `--from-checkpoint`/`--to-checkpoint`, `--resume`) and an external-anchor pass (`--anchors`), each with its own failure reasons (`checkpoint_chain_broken`, `checkpoint_head_mismatch`, `segment_discontinuous`, `anchor_invalid`). See [Scalable Verification](./scalable-verification.md).

## Verifying an entry range (v1.13)

When you have two entries rather than two checkpoints, `verifyEntryRange` verifies the span between them without your having to work out checkpoint bounds:

```php
use Chronicle\Verification\IntegrityVerifier;

app(IntegrityVerifier::class)->verifyEntryRange($fromSequence, $toSequence);
```

```bash
php artisan chronicle:verify --from=<entry-ulid> --to=<entry-ulid>
```

Chronicle resolves the **signed** checkpoints that enclose the range and recomputes the chain between them, so verification of the requested entries rides on the signed anchors - never on a selected entry's own stored hash. It fails closed if the derived anchors don't actually enclose the range. A range extending past the last checkpoint is recomputed to the head, carrying the same trust as `--since-last-checkpoint`. See [Scalable Verification](./scalable-verification.md#verify-an-entry-range).

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
