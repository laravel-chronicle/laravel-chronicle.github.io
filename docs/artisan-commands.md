---
title: Artisan Commands
---

# Artisan Commands

Chronicle ships nine Artisan commands. All signatures below are verified against `src/Console/Commands/`.

## Quick reference

| Command | Description |
|---|---|
| `chronicle:install` | Publish config and migrations |
| `chronicle:checkpoint` | Create a signed checkpoint |
| `chronicle:export {path}` | Export ledger as verifiable dataset |
| `chronicle:verify` | Verify ledger integrity (or a single entry) |
| `chronicle:verify-export {path}` | Verify an exported dataset |
| `chronicle:stats` | Display ledger statistics |
| `chronicle:show {id}` | Display a single entry |
| `chronicle:prune` | Delete old entries by retention policy |
| `chronicle:report {path}` | Generate a signed compliance report |

---

## `chronicle:install`

```bash
php artisan chronicle:install [--force] [--migrate]
```

Publishes `config/chronicle.php` and the Chronicle migrations.

| Option | Description |
|---|---|
| `--force` | Overwrite any already-published files |
| `--migrate` | Run `php artisan migrate` immediately after publishing |

---

## `chronicle:checkpoint`

```bash
php artisan chronicle:checkpoint
```

Creates a signed checkpoint anchoring the current ledger chain head. Chronicle reuses an existing checkpoint if one already exists for the same chain hash.

Requires signing keys to be configured. Cannot be run against an empty ledger.

---

## `chronicle:export`

```bash
php artisan chronicle:export {path}
```

Exports the full ledger to the given directory as a verifiable dataset.

| Argument | Description |
|---|---|
| `path` | Directory where `entries.ndjson`, `manifest.json`, and `signature.json` will be written |

The directory is created if it does not exist. See [Exports](./exports.md) for output format details.

---

## `chronicle:verify`

```bash
php artisan chronicle:verify [--entry=<ULID>]
```

**Without `--entry`:** verifies the full ledger — payload hashes, chain hashes, and dataset boundaries.

**With `--entry=<ULID>`:** verifies a single entry's payload hash and chain hash in isolation.

| Option | Description |
|---|---|
| `--entry=` | ULID of a single entry to verify; omit to verify the full ledger |

---

## `chronicle:verify-export`

```bash
php artisan chronicle:verify-export {path}
```

Validates an exported dataset: file presence, manifest/signature structure, dataset hash, full chain integrity, and signature.

| Argument | Description |
|---|---|
| `path` | Path to the export directory produced by `chronicle:export` |

---

## `chronicle:stats`

```bash
php artisan chronicle:stats [--json]
```

Displays ledger statistics including total entry count, oldest/newest entry timestamps, checkpoint count, top actions, and 30-day activity.

| Option | Description |
|---|---|
| `--json` | Output stats as JSON instead of formatted text |

---

## `chronicle:show`

```bash
php artisan chronicle:show {id}
```

Displays the full detail of a single entry.

| Argument | Description |
|---|---|
| `id` | ULID of the entry to display |

---

## `chronicle:prune`

```bash
php artisan chronicle:prune [--older-than=N] [--before=Y-m-d] [--dry-run] [--force]
```

Deletes old entries by retention policy. Entries anchored to a checkpoint are protected by default.

| Option | Description |
|---|---|
| `--older-than=N` | Delete entries older than N days |
| `--before=Y-m-d` | Delete entries created before the given date (ISO 8601 accepted) |
| `--dry-run` | Preview what would be deleted without deleting |
| `--force` | Delete even checkpoint-anchored entries |

See [Pruning & Retention](./pruning.md) for full details.

---

## `chronicle:report`

```bash
php artisan chronicle:report {path} [--from=] [--to=]
```

Generates a signed HTML compliance report.

| Argument/Option | Description |
|---|---|
| `path` | File path where the HTML report will be written |
| `--from=` | Start of reporting period (Y-m-d or ISO 8601) |
| `--to=` | End of reporting period (Y-m-d or ISO 8601) |

See [Compliance Reports](./compliance-reports.md) for full details.
