---
title: Storage Drivers
---

# Storage Drivers

Chronicle persists entries through a configurable storage driver.

## Built-in drivers

## `eloquent` / `database`

`eloquent` is the default production driver. `database` is an alias — both resolve to the same synchronous implementation (`DatabaseDriver`).

Despite the name, this driver does **not** use Eloquent model events. It writes entries through Laravel’s raw DB query builder to avoid timestamp machinery and observer interference. It respects the configured `connection` and `tables` settings.

Use it for normal application audit logging.

## `queued`

The `queued` driver dispatches entry persistence to a background job (`PersistChronicleEntryJob`) instead of writing synchronously.

**Critical constraint:** Chronicle’s chain hashes are order-sensitive. You must run exactly **one** worker on the Chronicle queue:

```bash
php artisan queue:work --queue=chronicle --tries=1
```

Running multiple workers on this queue will produce chain forks — two workers can each read the same previous chain head and generate competing next hashes.

Configure the queue connection and name in `config/chronicle.php`:

```php
‘queue’ => [
    ‘connection’ => env(‘CHRONICLE_QUEUE_CONNECTION’),
    ‘name’       => env(‘CHRONICLE_QUEUE’, ‘chronicle’),
],
```

**What the job does:** the job receives the pre-validated, pre-hashed payload attributes. Inside a database transaction it acquires a row-level lock, computes the chain hash, and persists the entry via `DatabaseDriver`.

**Event timing:** `EntryRecorded` is dispatched by the synchronous `PersistEntry` pipeline stage. The `queued` driver bypasses that stage — `EntryRecorded` is **not** fired when this driver is active.

## `array`

This driver stores entries in memory.

It is useful for tests and non-persistent inspection scenarios. It does not write to the database.

Useful methods:

- `ArrayDriver::all()`
- `ArrayDriver::count()`
- `ArrayDriver::flush()`

## `null`

This driver discards entries silently and returns a hydrated unsaved `Entry` model.

Use it when:

- you want Chronicle calls to succeed without persistence
- you are disabling audit writes in a local environment
- tests do not care about recorded entries

## Configuration

Select the driver in `config/chronicle.php`:

```php
'driver' => env('CHRONICLE_DRIVER', 'eloquent'),
```

## Custom drivers

Chronicle supports custom storage drivers through `extendDriver()`:

```php
use Chronicle\Contracts\StorageDriver;
use Chronicle\Facades\Chronicle;

Chronicle::extendDriver('custom', function (): StorageDriver {
    return new App\Chronicle\CustomDriver();
});
```

Your custom driver must implement `Chronicle\Contracts\StorageDriver`.

## Important resolver rules

- reserved names cannot be overridden: `eloquent`, `array`, `null`
- a custom driver name can only be registered once
- the driver factory must resolve to a valid `StorageDriver`

## Choosing the right driver

- use `eloquent` in production
- use `array` when you want test-time inspection
- use `null` when you want Chronicle calls to no-op cleanly

For most applications, changing the driver is an environment concern rather than a code concern.
