---
title: Storage Drivers
---

# Storage Drivers

Chronicle persists entries through a configurable storage driver.

## Built-in drivers

## `eloquent`

This is the default production driver.

It inserts entries directly through Laravel’s database layer and writes to the configured Chronicle connection/table names.

Use it for normal application audit logging.

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
