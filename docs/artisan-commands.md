---
title: Artisan Commands
---

# Artisan Commands

Chronicle ships twelve Artisan commands. All signatures below are verified against `src/Console/Commands/`.

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
| `chronicle:key:generate` | Generate an Ed25519 keypair |
| `chronicle:key:list` | List all keys in the signing key ring |
| `chronicle:key:rotate {newKeyId}` | Create a boundary checkpoint and print the activation instruction |

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

---

## `chronicle:key:generate`

```bash
php artisan chronicle:key:generate [--id=<keyId>]
```

Generates an Ed25519 keypair and prints the base64-encoded private and public keys alongside a ready-to-paste `signing.keys` config entry. The private key is never written to disk or any environment file.

| Option | Description |
|---|---|
| `--id=` | Key ID to use in the config snippet. Defaults to `chronicle-key-YYYYMMDD` if omitted. |

The command reminds you to store the private key in a secret manager (AWS Secrets Manager, HashiCorp Vault, 1Password, etc.).

---

## `chronicle:key:list`

```bash
php artisan chronicle:key:list [--with-counts]
```

Lists all keys configured in `signing.keys` with their ID, algorithm, provider, and status.

| Status | Meaning |
|---|---|
| `● ACTIVE` | This key is referenced by `signing.active` and used to sign new artifacts. |
| `verify-only` | No `private_key` configured. Can verify old artifacts; cannot sign new ones. |
| `inactive` | Has signing material but is not the active key. |

| Option | Description |
|---|---|
| `--with-counts` | Add a `Checkpoints` column showing the number of checkpoints signed by each key. |

---

## `chronicle:key:rotate`

```bash
php artisan chronicle:key:rotate {newKeyId}
```

Validates the target key, creates a mandatory boundary checkpoint signed by the current active key, then prints the `CHRONICLE_ACTIVE_KEY` instruction needed to complete the rotation.

| Argument | Description |
|---|---|
| `newKeyId` | ID of the key to rotate to. Must exist in `signing.keys` and have signing material. |

The command refuses with an actionable error if:
- `newKeyId` is not present in `signing.keys`
- `newKeyId` is already the active key
- `newKeyId` has no `private_key` or `key_arn` (verify-only)
- The ledger is empty (nothing to checkpoint)

See [Signing & Keys](./signing-and-keys.md) for the full rotation workflow.
