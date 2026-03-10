---
title: Export Verification Guide
---

# Export Verification Guide

Chronicle exports a deterministic dataset that can be verified independently of the source application.

## Export layout

Every export directory contains three files:

```text
chronicle-export/
├─ entries.ndjson
├─ manifest.json
└─ signature.json
```

Generate an export with:

```bash
php artisan chronicle:export storage/app/chronicle-export
```

Verify it with:

```bash
php artisan chronicle:verify-export storage/app/chronicle-export
```

## What gets verified

Chronicle verifies the export in layers:

1. Required files exist
2. `manifest.json` can be read and decoded
3. `signature.json` can be read and decoded
4. `entries.ndjson` is readable and valid line-delimited JSON
5. Each entry's chain hash matches the previous chain state
6. Entry count and first/last entry boundaries match the manifest
7. The computed dataset hash matches `manifest.json`
8. The signature validates against the dataset hash

## File roles

## `entries.ndjson`

This is the exported ledger stream. Each line contains one entry in export order.

Chronicle exports entries ordered by:

1. `created_at`
2. `id`

The verifier recomputes the dataset hash from the raw NDJSON bytes and also walks the chain hash across the exported entries.

## `manifest.json`

The manifest records export-level metadata:

- `version`
- `generated_at`
- `entry_count`
- `first_entry_id`
- `last_entry_id`
- `chain_head`
- `dataset_hash`
- `algorithm`

For empty datasets, `first_entry_id`, `last_entry_id`, and `chain_head` must be `null`.

## `signature.json`

The signature file stores the detached signature and related metadata:

- `signature`
- `algorithm`
- `key_id`

Chronicle signs the manifest's `dataset_hash`, not the entire manifest blob.

## Failure modes

The verifier returns specific machine-readable failure reasons. Common ones include:

- `entries_missing`
- `entries_unreadable`
- `entries_invalid_json`
- `entries_invalid_format`
- `manifest_missing`
- `manifest_unreadable`
- `manifest_invalid_json`
- `manifest_invalid`
- `signature_missing`
- `signature_unreadable`
- `signature_invalid_json`
- `signature_invalid_format`
- `chain_invalid`
- `entry_count_mismatch`
- `first_entry_mismatch`
- `last_entry_mismatch`
- `chain_head_mismatch`
- `dataset_hash_mismatch`
- `signature_invalid`

These failure codes are useful if you want to wrap Chronicle verification inside CI, operational checks, or downstream audit tooling.

## Manual verification flow

If you are building an external verifier, the expected flow is:

1. Read `manifest.json` and `signature.json`
2. Validate their structure
3. Read `entries.ndjson` line by line
4. Recompute the chain from an initial previous chain value of `"0"`
5. Track the first entry id, last entry id, and entry count
6. Recompute the SHA-256 hash of the raw `entries.ndjson` file
7. Compare all computed values with the manifest
8. Verify the detached signature against `dataset_hash`

Chronicle's default signing provider uses Ed25519.

## Operational guidance

- Store exports in write-once or tightly controlled storage
- Keep public keys available to the systems performing verification
- Treat `dataset_hash` and `chain_head` as auditable artifacts worth recording in external systems
- Re-run verification after transport, backup restore, or handoff to third parties

## Example workflow

```bash
php artisan chronicle:export storage/app/chronicle-export
php artisan chronicle:verify-export storage/app/chronicle-export
sha256sum storage/app/chronicle-export/entries.ndjson
```

The first command produces the dataset, the second validates Chronicle's invariants, and the last command lets you compare the raw file hash with `manifest.json`.
