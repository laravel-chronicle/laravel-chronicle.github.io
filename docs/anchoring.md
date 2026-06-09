---
title: External Anchoring
---

# External Anchoring

A [checkpoint](./checkpoints.md) proves the ledger's chain head was signed at a point in time — but it lives in the same database it protects. An attacker who fully compromises that database could rewrite every entry **and** re-sign every checkpoint with a valid key. **Anchoring** closes that gap by copying a small, checkpoint-binding digest into an independent trust domain the application cannot rewrite.

Anchoring is **opt-in** and new in v1.11. With it disabled, Chronicle behaves exactly as it did in 1.10.

## The anchored value

Anchoring never copies entries or payloads. It anchors a single per-checkpoint **digest**:

```text
digest = SHA256(checkpoint.id . checkpoint.chain_hash . checkpoint.created_at)
```

This binds a receipt to exactly one checkpoint (it cannot be replayed onto another) and changes if any covered byte — notably `chain_hash` — is rewritten. The integer Unix timestamp is used so the digest round-trips identically across databases.

## How anchoring fits the pipeline

When `anchoring.enabled` is true, each newly-created checkpoint dispatches a queued, retryable job **after the checkpoint transaction commits** — so an anchor failure can never roll a checkpoint back. The job writes a row to `chronicle_checkpoint_anchors` that moves `pending → anchored` (or `failed`, left retryable). [`chronicle:verify --anchors`](./scalable-verification.md#--anchors) later re-reads each anchor and confirms it still attests the checkpoint's current digest.

:::note
Anchoring is asynchronous by default, on the queue named in `anchoring.queue` (or the default queue). Use `chronicle:checkpoint --anchor` to anchor synchronously instead.
:::

## Providers

A provider implements `name()`, `anchor()`, and `verify()`, and is resolved from `anchoring.providers`. Two ship in core; a reference adapter ships separately.

### RFC 3161 timestamp anchor (core)

`Rfc3161TimestampAnchor` POSTs the digest to an RFC 3161 Time-Stamping Authority (TSA) and stores the returned token as proof. `verify()` validates that token **offline** (no network) with `openssl ts -verify` against the configured TSA certificate — applying the timestamping certificate purpose, CA trust, and the `messageImprint == digest` check in one step.

```php
'anchoring' => [
    'enabled' => env('CHRONICLE_ANCHORING_ENABLED', false),
    'providers' => [
        'rfc3161' => [
            'provider' => \Chronicle\Anchoring\Rfc3161TimestampAnchor::class,
            'tsa_url' => env('CHRONICLE_TSA_URL'),
            'tsa_certificate' => env('CHRONICLE_TSA_CERTIFICATE'), // path to the TSA CA PEM
        ],
    ],
],
```

Verifying a token needs the `openssl` CLI; creating one needs only HTTP access to the TSA.

### S3 Object Lock anchor (adapter)

The separate package `laravel-chronicle/anchor-s3` writes the digest to a versioned, **Object Lock (WORM)** S3 object. Because the object is write-once, even a full database rewrite cannot alter it, so `chronicle:verify --anchors` fails on the tampered checkpoint. Register it after installing:

```php
's3-object-lock' => [
    'provider' => \Chronicle\AnchorS3\S3ObjectLockAnchor::class,
    'bucket' => env('CHRONICLE_S3_ANCHOR_BUCKET'),
    'mode' => 'COMPLIANCE', // or 'GOVERNANCE'
    'retain_days' => 3650,
],
```

See the adapter's README for bucket Object Lock setup and the required IAM actions.

### NullAnchor (dev/test only)

`NullAnchor` records the digest as its own proof in the same database. It is a faithful stand-in for tests and local development but provides **no external trust** — never use it in production.

## Commands

| Command | Purpose |
|---|---|
| `chronicle:checkpoint --anchor` | Create a checkpoint and anchor it synchronously with every configured provider |
| `chronicle:anchor:retry [--status=failed]` | Re-attempt outstanding anchors (default retries `failed`; pass `--status=pending` for stuck-pending) |
| `chronicle:anchor:verify [--checkpoint=<ULID>]` | Verify stored anchors against their providers |
| `chronicle:verify --anchors` | Verify external anchors for the checkpoints in scope (composes with `--checkpoints-only` and the incremental modes) |

A checkpoint with no valid anchor is reported as `anchor_invalid` — never silently passed.

## See also

- [Checkpoints](./checkpoints.md) — the signed anchors that anchoring attests
- [Scalable Verification](./scalable-verification.md) — the verification modes, including `--anchors`
- [Security Model](./security-model.md#external-anchoring-and-full-internal-compromise) — how anchoring defeats a full internal compromise
- [Artisan Commands](./artisan-commands.md) — full command reference
