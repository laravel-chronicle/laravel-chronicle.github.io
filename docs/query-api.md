---
title: Query API Documentation
---

# Query API Documentation

Chronicle exposes two read surfaces:

- model scopes on `Chronicle\Models\Entry`
- a reader service available through `Chronicle::reader()`

Use the model when you want full Eloquent composition. Use the reader when you want a small, package-level API for common ledger reads.

## Entry model scopes

Import the entry model:

```php
use Chronicle\Models\Entry;
```

## `forActor(Model $actor)`

Filters entries by actor reference.

```php
$entries = Entry::query()
    ->forActor($user)
    ->latestFirst()
    ->get();
```

Chronicle matches the actor by both class name and primary key.

## `forSubject(Model $subject)`

Filters entries by subject reference.

```php
$entries = Entry::query()
    ->forSubject($order)
    ->get();
```

## `action(string $action)`

Filters entries by action name.

```php
$entries = Entry::query()
    ->action('order.created')
    ->get();
```

## `correlation(string $id)`

Filters entries by an exact correlation id.

```php
$entries = Entry::query()
    ->correlation($correlationId)
    ->get();
```

This is useful when you want the exact set of entries produced within a single Chronicle transaction context.

## `workflow(string $rootCorrelation)`

Filters entries that belong to a correlation tree.

```php
$entries = Entry::query()
    ->workflow($rootCorrelation)
    ->latestFirst()
    ->get();
```

Use this when nested Chronicle transactions produce hierarchical correlation ids and you want the full workflow trace.

## `withTag(string $tag)`

Filters entries whose `tags` JSON array contains a single tag.

```php
$entries = Entry::query()
    ->withTag('orders')
    ->get();
```

## `withTags(array $tags)`

Filters entries that contain all requested tags.

```php
$entries = Entry::query()
    ->withTags(['orders', 'checkout'])
    ->get();
```

Chronicle applies one `whereJsonContains()` clause per tag.

## `between(CarbonInterface $start, CarbonInterface $end)`

Filters entries by time range.

```php
$entries = Entry::query()
    ->between(now()->subDay(), now())
    ->latestFirst()
    ->get();
```

## `latestFirst()`

Orders results by `created_at` descending.

```php
$entries = Entry::query()
    ->action('order.updated')
    ->latestFirst()
    ->get();
```

## Cursor pagination

Chronicle includes two cursor-based pagination scopes for large ledgers.

### `cursorPaginateLedger(int $perPage = 50, ?string $cursor = null)`

Returns entries in ledger order by `id`.

```php
$page = Entry::query()->cursorPaginateLedger(100);
```

### `cursorPaginateLatest(int $perPage = 50, ?string $cursor = null)`

Returns entries in reverse ledger order by `id`.

```php
$page = Entry::query()->cursorPaginateLatest(100);
```

Cursor pagination avoids expensive offset scans and is the right default for large audit datasets.

## Streaming

Chronicle includes lazy cursor-based streaming scopes for low-memory processing.

### `stream()`

Streams entries in ledger order.

```php
Entry::query()
    ->action('export.ready')
    ->stream()
    ->each(function (Entry $entry) {
        // process entry
    });
```

### `streamLatest()`

Streams entries in reverse ledger order.

```php
$latestActions = Entry::query()
    ->streamLatest()
    ->take(50)
    ->pluck('action');
```

## Reader API

The reader wraps several common queries behind a simpler interface:

```php
use Chronicle\Facades\Chronicle;

$reader = Chronicle::reader();
```

Available methods:

- `paginate(int $perPage = 50, ?string $cursor = null)`
- `stream()`
- `forActor(Model $actor)`
- `forSubject(Model $subject)`
- `action(string $action)`
- `correlation(string $id)`

Example:

```php
$page = Chronicle::reader()->paginate(100);
$entries = Chronicle::reader()->forSubject($order);
$auditTrail = Chronicle::reader()->correlation($correlationId);
```

## Recommended query patterns

- Use `latestFirst()` for operational review screens
- Use cursor pagination for browsing large ledgers
- Use streaming for exports, verification helpers, and batch analysis
- Use `withTags()` carefully on very large PostgreSQL datasets unless you add JSON-specific indexes

For PostgreSQL-specific indexing strategies, see [PostgreSQL JSON Index Documentation](./postgresql-json-indexes.md).
