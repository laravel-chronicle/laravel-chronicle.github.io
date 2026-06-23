---
title: Read-Only Web UI
---

# Read-Only Web UI

Chronicle ships an optional Blade-based interface for browsing the audit ledger in a browser. It is **read-only** - no Chronicle data can be created, modified, or deleted through it.

## Enabling the UI

Set the environment variable:

```env
CHRONICLE_UI_ENABLED=true
```

Or set it directly in `config/chronicle.php`:

```php
'ui' => [
    'enabled' => true,
    ...
],
```

The interface is disabled by default. Until `enabled` is `true`, all UI routes return 404.

## Routes

| Route name                | URL (default prefix)          | Description                          |
|---------------------------|-------------------------------|--------------------------------------|
| `chronicle.entries.index` | `GET /chronicle`              | Paginated entry list with filters    |
| `chronicle.entries.show`  | `GET /chronicle/entries/{id}` | Single entry detail                  |
| `chronicle.stats`         | `GET /chronicle/stats`        | Ledger statistics and activity chart |

The prefix defaults to `chronicle` and is configurable via `CHRONICLE_UI_PREFIX`.

## Filtering on the index

The index view accepts these query parameters:

| Parameter      | Description                               |
|----------------|-------------------------------------------|
| `action`       | Filter by exact action string             |
| `actor_id`     | Filter by actor id                        |
| `subject_type` | Filter by subject type                    |
| `subject_id`   | Filter by subject id                      |
| `tag`          | Filter by a single tag (JSON containment) |
| `from`         | Start date (`Y-m-d`, UTC)                 |
| `to`           | End date (`Y-m-d`, UTC)                   |
| `sort`         | `asc` or `desc` (default `desc`)          |

## Access control

The UI middleware stack is configured in `config/chronicle.php`:

```php
'ui' => [
    'middleware' => ['web', 'auth', 'can:view-chronicle'],
],
```

The default stack requires an authenticated web session and the `view-chronicle` Gate ability. Define the gate in your `AuthServiceProvider`:

```php
use Illuminate\Support\Facades\Gate;

Gate::define('view-chronicle', fn ($user) => $user->isAdmin());
```

To allow any authenticated user, change the middleware to `['web', 'auth']`.

Note: `middleware` is a plain PHP array - it cannot be driven by an environment variable. Add middleware class names or aliases directly in the config file.

## Pagination

The number of entries per page is controlled by:

```php
'ui' => [
    'per_page' => env('CHRONICLE_UI_PER_PAGE', 25),
],
```

## Publishing views

To customise the Blade templates, publish the view files:

```bash
php artisan vendor:publish --provider="Chronicle\ChronicleServiceProvider" --tag=chronicle-views
```

Views are published to `resources/views/vendor/chronicle/`. Chronicle loads these automatically when they are present.

## Configuration reference

```php
'ui' => [
    'enabled'    => env('CHRONICLE_UI_ENABLED', false),
    'prefix'     => env('CHRONICLE_UI_PREFIX', 'chronicle'),
    'middleware' => ['web', 'auth', 'can:view-chronicle'],
    'per_page'   => env('CHRONICLE_UI_PER_PAGE', 25),
],
```

See [Config Reference](./config-reference.md#ui) for full key descriptions.
