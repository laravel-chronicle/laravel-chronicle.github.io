---
title: Transactions
---

# Transactions

Chronicle transactions group related entries under a shared `correlation_id`.

This gives you workflow-level traceability across multiple audit entries.

## Closure API

```php
use Chronicle\Facades\Chronicle;

Chronicle::transaction(function () {
    Chronicle::record()
        ->actor('system')
        ->action('job.started')
        ->subject('ledger')
        ->commit();

    Chronicle::record()
        ->actor('system')
        ->action('job.finished')
        ->subject('ledger')
        ->commit();
});
```

Entries created inside the closure automatically share a generated correlation id.

## Transaction object API

```php
$tx = Chronicle::transaction();

$tx->entry()
    ->actor('system')
    ->action('sync.started')
    ->subject('ledger')
    ->commit();

$tx->entry()
    ->actor('system')
    ->action('sync.finished')
    ->subject('ledger')
    ->commit();

$correlationId = $tx->id();
```

The transaction object gives you explicit access to the correlation id and a builder that is pre-seeded with it.

## Manual correlations

You can also set the correlation id directly:

```php
Chronicle::record()
    ->actor('system')
    ->action('batch.started')
    ->subject('ledger')
    ->correlation('batch-2026-03-10')
    ->commit();
```

## Nested transactions

Chronicle supports nested transactions and generates hierarchical correlation ids.

If an outer transaction has id:

```text
abc
```

a nested transaction will look like:

```text
abc.def
```

That makes workflow tree queries possible through the `workflow()` scope.

## Querying correlated entries

Exact correlation:

```php
$entries = Entry::query()->correlation($tx->id())->get();
```

Workflow tree:

```php
$entries = Entry::query()->workflow($rootCorrelation)->get();
```

## Important distinction

Chronicle transactions are primarily a correlation feature.

The actual persistence of a single entry still happens inside Chronicle’s own database transaction during commit. Do not treat `Chronicle::transaction()` as a replacement for Laravel’s broader application transaction semantics.
