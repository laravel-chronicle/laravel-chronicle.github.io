---
title: Checkpoints
---

# Checkpoints

Checkpoints anchor the current state of the Chronicle ledger with a signature.

## What a checkpoint stores

Each checkpoint records:

- `id`
- `chain_hash`
- `signature`
- `algorithm`
- `key_id`
- `metadata`
- `created_at`

## Why checkpoints exist

The hash chain protects entry-to-entry integrity, but a checkpoint gives you a signed anchor for the current chain head.

That matters because without external anchors, an attacker with enough control could theoretically rewrite the entire ledger and produce a fresh internal chain. A checkpoint provides a signed state you can compare against later.

## Creating a checkpoint

Use the built-in Artisan command:

```bash
php artisan chronicle:checkpoint
```

Chronicle will:

1. read the current ledger head
2. reuse an existing checkpoint if one already exists for that chain hash
3. sign the chain hash
4. persist the checkpoint record

## Important behavior

- you cannot create a checkpoint for an empty ledger
- the default payload being signed is the current `chain_hash`
- checkpoint creation runs inside the configured Chronicle database connection

## Verifying checkpoints

Live ledger verification is performed through:

```bash
php artisan chronicle:verify
```

This checks the chain and entry integrity, and checkpoint signatures are part of the intended trust model.

## Operational advice

- create checkpoints on a regular schedule
- record checkpoint ids or chain heads in external systems when possible
- treat the signing key used for checkpoints as security-sensitive infrastructure

Checkpoints are most useful when they become part of a wider operational evidence trail instead of remaining only inside the same database they protect.
