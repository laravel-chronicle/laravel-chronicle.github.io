---
title: Upgrade Guide
---

# Upgrade Guide

## Versioning policy

Chronicle's public API and export format are versioned and stable within a major version. Breaking changes are only made in major releases. Export manifests carry a `version` field so downstream verifiers can detect incompatible changes.

---

## Upgrading to 1.9

### New config keys

Three new top-level keys were added to `config/chronicle.php`. If you published the config before 1.9, add them manually:

**`queue`** - required when using `driver = 'queued'`:

```php
'queue' => [
    'connection' => env('CHRONICLE_QUEUE_CONNECTION'),
    'name'       => env('CHRONICLE_QUEUE', 'chronicle'),
],
```

**`prune`** - used by `chronicle:prune`:

```php
'prune' => [
    'default_retention_days' => env('CHRONICLE_RETENTION_DAYS'),
    'respect_checkpoints'    => true,
],
```

**`ui`** - used by the read-only web interface:

```php
'ui' => [
    'enabled'    => env('CHRONICLE_UI_ENABLED', false),
    'prefix'     => env('CHRONICLE_UI_PREFIX', 'chronicle'),
    'middleware' => ['web', 'auth', 'can:view-chronicle'],
    'per_page'   => env('CHRONICLE_UI_PER_PAGE', 25),
],
```

If these keys are absent, Chronicle falls back to defaults - but you will not be able to configure them via environment variables without publishing the updated config.

---

## Upgrading to 1.11

1.11 is additive. A 1.10 ledger with anchoring disabled and no incremental flags verifies **identically** to 1.10 - no artifact format change, and no re-export is needed.

### 1. Run the migration

1.11 adds range columns to the checkpoints table (`head_id`, `entry_count`, `previous_checkpoint_id`), an index on the existing `checkpoint_id` entries column (the foreign key does not create one on all database drivers), and two new tables (`chronicle_checkpoint_anchors`, `chronicle_verification_runs`):

```bash
php artisan chronicle:install --force   # re-publish config + migrations (only if you previously published them)
php artisan migrate
```

If you never published the migrations, they load from the package automatically - just run `php artisan migrate`.

### 2. Backfill historical checkpoints

New checkpoints populate the range columns and `checkpoint_id` automatically. Backfill checkpoints created under 1.10 once - it is chunked and idempotent:

```bash
php artisan chronicle:checkpoints:backfill --dry-run   # preview
php artisan chronicle:checkpoints:backfill
```

Until a ledger is backfilled, the incremental verification modes fall back to a full verify with a warning.

### 3. checkpoint_id is now populated on creation

1.10 left `checkpoint_id` unpopulated; 1.11 stamps it onto the entries a checkpoint covers at creation time (and the backfill does the same for history). **`checkpoint_id` is not part of any hashed payload** - populating it does not change any `payload_hash` or `chain_hash`, so existing signatures and exports remain valid.

### 4. Anchoring is opt-in

External anchoring is off unless you set `anchoring.enabled` (`CHRONICLE_ANCHORING_ENABLED=true`) and configure a provider. With it off, behaviour is unchanged. See [External Anchoring](./anchoring.md).

### New config keys

Add an `anchoring` block and the two new table keys to a previously-published `config/chronicle.php` (full details in the [Config Reference](./config-reference.md#anchoring)):

```php
'anchoring' => [
    'enabled' => env('CHRONICLE_ANCHORING_ENABLED', false),
    'queue' => env('CHRONICLE_ANCHORING_QUEUE'),
    'providers' => [
        // 'rfc3161' => [ /* see Config Reference */ ],
    ],
],
```

---

## Deprecations

### `EntryBuilder::modelChanges()` -> `modelDiff()`

`modelChanges()` is deprecated since 1.x and **will be removed in 2.0**.

Replace all calls:

```php
// Before (deprecated)
Chronicle::record()
    ->actor($user)
    ->action('order.updated')
    ->subject($order)
    ->modelChanges($order)   // ← deprecated
    ->commit();

// After
Chronicle::record()
    ->actor($user)
    ->action('order.updated')
    ->subject($order)
    ->modelDiff($order)      // ← use this
    ->commit();
```

The two methods are functionally identical. `modelChanges()` triggers an `E_USER_DEPRECATED` notice and delegates to `modelDiff()`.

## Upgrading to 1.13

1.13 is **additive and fully backward-compatible**. With the new config keys unset, behaviour is byte-for-byte identical to 1.12 - no migration, no artifact format change, no re-export.

What's new and entirely opt-in:

- **`models.entry`** - point Chronicle at a subclass of `Chronicle\Entry\Entry`. See [Custom Entry Model](./custom-entry-model.md).
- **`verifyEntryRange` / `chronicle:verify --from --to`** - verify an arbitrary entry span, anchored on the enclosing signed checkpoints. See [Scalable Verification](./scalable-verification.md#verify-an-entry-range).
- **Reverse reference resolution** - `Chronicle::resolveReference()` / `referenceLabel()` / `referenceModel()`, plus `references.label_attribute`. See [Reference Resolution](./reference-resolution.md#reverse-resolution).
- **`Chronicle\Testing\LedgerSeeder`** - seed a verifiable ledger in tests. See [Testing Helpers](./testing-helpers.md#seeding-a-verifiable-ledger-v113).

No action is required to adopt 1.13; reach for each feature when you need it.

---

## See also

- [Recording Entries](./recording-entries.md) - full `EntryBuilder` API
- [Config Reference](./config-reference.md) - all config keys with defaults
