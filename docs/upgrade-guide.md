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

**`queue`** — required when using `driver = 'queued'`:

```php
'queue' => [
    'connection' => env('CHRONICLE_QUEUE_CONNECTION'),
    'name'       => env('CHRONICLE_QUEUE', 'chronicle'),
],
```

**`prune`** — used by `chronicle:prune`:

```php
'prune' => [
    'default_retention_days' => env('CHRONICLE_RETENTION_DAYS'),
    'respect_checkpoints'    => true,
],
```

**`ui`** — used by the read-only web interface:

```php
'ui' => [
    'enabled'    => env('CHRONICLE_UI_ENABLED', false),
    'prefix'     => env('CHRONICLE_UI_PREFIX', 'chronicle'),
    'middleware' => ['web', 'auth', 'can:view-chronicle'],
    'per_page'   => env('CHRONICLE_UI_PER_PAGE', 25),
],
```

If these keys are absent, Chronicle falls back to defaults — but you will not be able to configure them via environment variables without publishing the updated config.

---

## Deprecations

### `EntryBuilder::modelChanges()` → `modelDiff()`

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

---

## See also

- [Recording Entries](./recording-entries.md) — full `EntryBuilder` API
- [Config Reference](./config-reference.md) — all config keys with defaults
