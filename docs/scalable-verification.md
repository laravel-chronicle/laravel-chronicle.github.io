---
title: Scalable Verification
---

# Scalable Verification

Full verification re-hashes every entry from genesis - `O(entries)` in ledger size. On large ledgers that is expensive to run often. Chronicle v1.11 adds **range-aware checkpoints** and several verification modes, so you can verify *less* while keeping strong guarantees, and verify *more* (external anchors) when you need them.

These modes need checkpoints with the v1.11 range columns (`head_id`, `entry_count`, `previous_checkpoint_id`). On a ledger upgraded from 1.10, run `chronicle:checkpoints:backfill` first (see the [Upgrade Guide](./upgrade-guide.md#upgrading-to-111)); until then, the incremental modes fall back to a full verify with a warning.

## The modes

All modes are flags on `chronicle:verify`.

### Full verify (default)

```bash
php artisan chronicle:verify
```

Walks every entry from genesis, checking each `payload_hash` and `chain_hash` plus linked checkpoint signatures. **Cost:** `O(entries)`. **Use:** after a restore, during incident response, or as a periodic deep check.

### `--checkpoints-only`

```bash
php artisan chronicle:verify --checkpoints-only
```

Verifies only the checkpoint chain: each signature, its `previous_checkpoint_id` linkage, `entry_count` contiguity, and that its `chain_hash` matches its head entry. **Cost:** `O(checkpoints)` - reads no entries. **Use:** a fast attestation that the signed boundaries are intact and well-linked.

### `--since-last-checkpoint`

```bash
php artisan chronicle:verify --since-last-checkpoint
```

Trusts the latest checkpoint and verifies only the entries appended after it. **Cost:** `O(tail)`. **Use:** frequent, cheap checks that new writes are well-formed.

### `--from-checkpoint` / `--to-checkpoint`

```bash
php artisan chronicle:verify --from-checkpoint=<ULID> [--to-checkpoint=<ULID>]
```

Verifies a bounded segment between two checkpoints (to the current head if `--to-checkpoint` is omitted), seeded from the trusted starting checkpoint. **Cost:** `O(segment)`. **Use:** verify a single epoch - e.g. the window around a key rotation - without re-reading the whole ledger.

### Verify an entry range

```bash
php artisan chronicle:verify --from=<ULID> --to=<ULID>
```

Verifies a span bounded by two **entries** (by ULID), rather than two checkpoints. Chronicle resolves the signed checkpoints that enclose the requested entries, verifies their signatures, and recomputes the chain between them - so the requested rows are verified against signed anchors, never against a selected entry's own stored hash. It fails closed if the derived anchors don't enclose the range. A range past the last checkpoint is recomputed to the head with the same trust as `--since-last-checkpoint`. **Cost:** `O(enclosing segment)`. **Use:** verify an arbitrary window - e.g. the entries a bulk UI action selected - without knowing checkpoint boundaries. New in v1.13; also exposed programmatically as `IntegrityVerifier::verifyEntryRange()`.

### `--resume`

```bash
php artisan chronicle:verify --resume
```

Continues from the last recorded verification run, verifying only the new tail (full verify if there is no prior run). **Cost:** `O(new tail)`. **Use:** scheduled verification that picks up where the last run left off. Falls back to a full verify (with a warning) if the progress table is absent.

### `--anchors`

```bash
php artisan chronicle:verify --checkpoints-only --anchors
```

Adds an external-anchor pass over the checkpoints in scope: each must carry at least one valid anchor (see [External Anchoring](./anchoring.md)). Composes with `--checkpoints-only` and the incremental modes. **Cost:** `O(checkpoints in scope)` plus one provider verification each - offline for RFC 3161, one S3 read for the S3 adapter. **Use:** prove the ledger against tampering that re-signs internally but cannot forge the external anchor.

## Choosing a mode

| Goal                                | Mode                                    |
|-------------------------------------|-----------------------------------------|
| Deep periodic / post-restore        | full                                    |
| "Are the boundaries intact?" (fast) | `--checkpoints-only`                    |
| "Are recent writes valid?" (cheap)  | `--since-last-checkpoint`               |
| Verify one epoch / rotation window  | `--from-checkpoint` + `--to-checkpoint` |
| Scheduled, incremental              | `--resume`                              |
| Defeat a full internal compromise   | `--anchors`                             |

Every mode agrees with full verify on the entries it covers - they trade scope for cost, not rigor.

## New failure reasons

In addition to the entry-level reasons (`payload_hash_mismatch`, `chain_hash_mismatch`, `checkpoint_missing`, `checkpoint_signature_invalid`, `unknown_key`), the v1.11 modes can report:

| Reason                     | Meaning                                                                 |
|----------------------------|-------------------------------------------------------------------------|
| `checkpoint_chain_broken`  | A checkpoint's `previous_checkpoint_id` linkage is missing or wrong     |
| `checkpoint_head_mismatch` | A checkpoint's `chain_hash` does not match its head entry               |
| `segment_discontinuous`    | A verified segment does not join its starting checkpoint                |
| `anchor_invalid`           | A checkpoint in scope has no valid external anchor (missing or invalid) |

## Checkpoint cadence

Each incremental pass is bounded by checkpoint spacing - the closer your checkpoints, the smaller each `--since-last-checkpoint`, segment, or `--resume` pass. Create checkpoints on a cadence that matches write volume and recovery objectives (e.g. a scheduled checkpoint plus one every N entries). See [Schedule Checkpoints & Exports](./guide-schedule-checkpoints-exports.md) and [Performance & Indexing](./performance-and-indexing.md#checkpoint-cadence--verification-cost).

## Indexing for large ledgers

`checkpoint_id` is populated on covered entries when a checkpoint is created (v1.11), and the migration indexes it. See [Performance & Indexing](./performance-and-indexing.md#checkpoint_id-v111) for the `checkpoint_id` and checkpoint-chain indexes.

## See also

- [Integrity Verification](./integrity-verification.md) - what the verifier checks, line by line
- [Checkpoints](./checkpoints.md) - the range-aware anchors these modes rely on
- [External Anchoring](./anchoring.md) - the `--anchors` pass
