---
title: Diff Engine
---

# Diff Engine

Chronicle can attach structured change diffs to an entry.

This is useful when you want audit events to describe not just that something changed, but exactly what changed.

## Diff structure

A diff is stored as JSON with field names as keys:

```json
{
  "amount": {
    "old": 1000,
    "new": 500
  }
}
```

## Manual diffs

You can supply a full diff directly:

```php
Chronicle::record()
    ->actor($user)
    ->action('order.updated')
    ->subject($order)
    ->diff([
        'amount' => [
            'old' => 1000,
            'new' => 500,
        ],
    ])
    ->commit();
```

Chronicle normalizes the diff keys and ensures each change node has `old` and `new` values.

## Single-field changes

For simple cases, use `change()`:

```php
Chronicle::record()
    ->actor($user)
    ->action('order.status_changed')
    ->subject($order)
    ->change('status', 'pending', 'paid')
    ->commit();
```

## Eloquent model diffs

Chronicle can derive diffs from a model’s dirty attributes:

```php
$order->status = 'paid';

Chronicle::record()
    ->actor($user)
    ->action('order.updated')
    ->subject($order)
    ->modelDiff($order)
    ->commit();
```

Alias:

```php
->modelChanges($order)
```

## Ignored fields

The builder ignores these fields by default when generating model diffs:

- `created_at`
- `updated_at`

That keeps routine timestamp churn out of the audit payload.

## When to use diffs

Diffs are a good fit for:

- status transitions
- mutable business records
- approval flows
- administrative changes

They are less useful when the important event is the action itself rather than a before/after comparison.
