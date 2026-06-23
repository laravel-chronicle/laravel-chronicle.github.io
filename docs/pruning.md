---
title: Pruning & Retention
---

# Pruning & Retention

`chronicle:prune` deletes old audit entries to keep the ledger from growing unbounded. Pruning is entirely opt-in - Chronicle never deletes entries automatically.

## Basic usage

```bash
# Delete entries older than 90 days
php artisan chronicle:prune --older-than=90

# Delete entries created before a specific date
php artisan chronicle:prune --before=2025-01-01

# Preview what would be deleted without deleting anything
php artisan chronicle:prune --older-than=90 --dry-run
```

## Options

| Option           | Description                                                                    |
|------------------|--------------------------------------------------------------------------------|
| `--older-than=N` | Delete entries with `created_at` older than N days from now                    |
| `--before=Y-m-d` | Delete entries with `created_at` before the given date (ISO 8601 accepted too) |
| `--dry-run`      | Print a count of what would be deleted; do not delete                          |
| `--force`        | Delete entries even if they are anchored by a checkpoint                       |

`--older-than` and `--before` are mutually exclusive resolution paths. If neither is passed and no `default_retention_days` is configured, the command exits with an error.

## Checkpoint protection

By default, entries that are anchored to a checkpoint (`checkpoint_id IS NOT NULL`) are **protected from pruning**. If the prune range includes anchored entries and `--force` is not passed, the command reports the count and exits without deleting anything:

```
5 entries in the prune range are anchored by a checkpoint. Use --force to override.
```

Pass `--force` to override checkpoint protection:

```bash
php artisan chronicle:prune --older-than=90 --force
```

## Configuration

Set defaults in `config/chronicle.php`:

```php
'prune' => [
    'default_retention_days' => env('CHRONICLE_RETENTION_DAYS'),
    'respect_checkpoints'    => true,
],
```

| Key                      | Default  | Description                                                                         |
|--------------------------|----------|-------------------------------------------------------------------------------------|
| `default_retention_days` | `null`   | When set, `chronicle:prune` (with no options) will use this as the retention target |
| `respect_checkpoints`    | `true`   | Whether to protect checkpoint-anchored entries; `--force` overrides this at runtime |

With `default_retention_days` set, you can schedule pruning without options:

```bash
php artisan chronicle:prune
```

## Scheduling

Add to your console kernel to prune on a schedule:

```php
// routes/console.php
Schedule::command('chronicle:prune --older-than=365')->monthly();
```

## What pruning does not do

- Pruning does not re-hash the remaining chain. After pruning, the chain hash of the oldest surviving entry still references the deleted previous entry - full ledger verification will fail for the pruned region.
- Pruning is appropriate for retention policy compliance, not for ledger cleanup while preserving chain integrity.

## See also

- [Checkpoints](./checkpoints.md) - creating signed anchors before pruning
- [Config Reference](./config-reference.md) - `prune` config block
