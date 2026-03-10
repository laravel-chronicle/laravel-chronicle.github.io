---
sidebar_position: 3
title: Quick Start
---

# Quick Start

This page walks through the shortest path from installation to a useful Chronicle ledger.

## 1. Record an entry

Chronicle entries require three fields: `actor`, `action`, and `subject`.

```php
use Chronicle\Facades\Chronicle;

Chronicle::record()
    ->actor($user)
    ->action('order.created')
    ->subject($order)
    ->metadata([
        'total' => 14900,
        'currency' => 'EUR',
    ])
    ->context([
        'request_id' => request()->header('X-Request-Id'),
        'ip_address' => request()->ip(),
    ])
    ->tags(['orders', 'checkout'])
    ->commit();
```

Chronicle will generate a ULID, resolve the actor and subject references, canonicalize the payload, calculate `payload_hash` and `chain_hash`, and persist the immutable entry inside a database transaction.

## 2. Capture model changes

If you are auditing updates to Eloquent models, you can derive a diff directly from dirty attributes:

```php
$order->status = 'paid';

Chronicle::record()
    ->actor($user)
    ->action('order.status_changed')
    ->subject($order)
    ->modelDiff($order)
    ->tags(['orders'])
    ->commit();
```

`modelDiff()` ignores `created_at` and `updated_at` automatically.

## 3. Group related events with correlations

Chronicle can group multiple entries into a workflow or request trace:

```php
Chronicle::transaction(function ($transaction) use ($user, $order) {
    Chronicle::record()
        ->actor($user)
        ->action('order.payment_started')
        ->subject($order)
        ->commit();

    Chronicle::record()
        ->actor($user)
        ->action('order.payment_captured')
        ->subject($order)
        ->commit();
});
```

Entries created inside the transaction share a generated correlation root so you can query them later.

## 4. Read from the ledger

Use the model scopes directly when you want Eloquent-level control:

```php
use Chronicle\Models\Entry;

$recentOrderEvents = Entry::query()
    ->forSubject($order)
    ->withTag('orders')
    ->latestFirst()
    ->get();
```

Or use the reader API resolved from the manager:

```php
$entries = Chronicle::reader()->action('order.created');
$stream = Chronicle::reader()->stream();
$page = Chronicle::reader()->paginate(100);
```

## 5. Verify integrity

Run a ledger verification pass after recording data:

```bash
php artisan chronicle:verify
```

Chronicle verifies payload hashes, chain hashes, and dataset boundaries. If verification fails, the command reports the failure type and the entry that broke the chain.

## 6. Export and verify externally

You can produce a verifiable export for auditors or downstream systems:

```bash
php artisan chronicle:export storage/app/chronicle-export
php artisan chronicle:verify-export storage/app/chronicle-export
```

The export dataset includes deterministic entry data, a manifest, and a signature.
