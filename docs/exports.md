---
title: Exports
---

# Exports

Chronicle can export the ledger as a deterministic dataset for external review, archival, and independent verification.

## Exporting the ledger

Run:

```bash
php artisan chronicle:export /absolute/path/to/export-dir
```

Chronicle will:

1. create the target directory if needed
2. stream entries into `entries.ndjson`
3. compute the dataset hash
4. build and write `manifest.json`
5. sign the dataset hash and write `signature.json`

## Output files

An export directory contains:

- `entries.ndjson`
- `manifest.json`
- `signature.json`

## Export characteristics

Chronicle exports are designed to be:

- deterministic
- streamable
- verifiable outside the source system

Entries are exported in a stable order using `created_at` and `id`.

## Verifying an export

Use:

```bash
php artisan chronicle:verify-export /absolute/path/to/export-dir
```

Chronicle will validate file presence, manifest/signature structure, dataset hash, and the full chain across the exported entries.

## When to use exports

Exports are useful for:

- periodic off-system audits
- long-term storage
- handing ledger snapshots to third parties
- validating transport or backup integrity

For file-level details, see [Export Format](./export-format.md). For the full verification process, see [Export Verification Guide](./export-verification.md).
