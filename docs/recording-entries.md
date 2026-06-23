---
title: Recording Entries
---

# Recording Entries

Every Chronicle entry is an explicit developer decision. This page documents the full `EntryBuilder` API.

## Starting a record

```php
use Chronicle\Facades\Chronicle;

Chronicle::record()
    ->actor($user)
    ->action('order.created')
    ->subject($order)
    ->commit();
```

`Chronicle::record()` returns an `EntryBuilder`. Call `commit()` to validate, hash, and persist the entry.

## Required fields

Three fields are required. Missing any one throws an exception at `commit()` time:

| Method      | Exception thrown                               |
|-------------|------------------------------------------------|
| `actor()`   | `Chronicle\Exceptions\MissingActorException`   |
| `action()`  | `Chronicle\Exceptions\MissingActionException`  |
| `subject()` | `Chronicle\Exceptions\MissingSubjectException` |

## Full API reference

### `actor(mixed $actor)`

Sets the actor responsible for the action. Accepts an Eloquent model, any object resolvable by your `ReferenceResolver`, or a string.

The string `'system'` is a special case - it records as type `system` / id `system` without going through the resolver:

```php
->actor($user)          // Eloquent model
->actor('system')       // built-in system actor
->actor('cli-worker')   // arbitrary string (resolved as-is)
```

### `action(string $action)`

Sets the action name. Use dot-notation for domain clarity:

```php
->action('invoice.sent')
->action('user.email_changed')
->action('order.payment_captured')
```

The built-in `ActionValidator` enforces a maximum byte length (default 255, configurable via `CHRONICLE_ACTION_MAX_LENGTH`).

### `subject(mixed $subject)`

Sets the entity the action was performed on. Accepts the same types as `actor()`:

```php
->subject($order)
->subject($invoice)
```

### `metadata(array $metadata)`

Attaches domain-specific data to the entry. Anything you want to preserve as part of the audit event:

```php
->metadata([
    'total'    => 14900,
    'currency' => 'EUR',
    'items'    => 3,
])
```

### `context(array $context)`

Attaches execution context - environment or runtime data that describes *where* the action occurred rather than *what* it was:

```php
->context([
    'request_id' => request()->header('X-Request-Id'),
    'ip_address' => request()->ip(),
    'user_agent' => request()->userAgent(),
])
```

Context resolvers (configured under `extensions`) can populate this automatically.

### `diff(array $diff)`

Attaches a structured before/after diff. Each key must be a field name with `old` and `new` sub-keys:

```php
->diff([
    'status' => ['old' => 'pending', 'new' => 'paid'],
    'amount' => ['old' => 1000,      'new' => 950],
])
```

Keys are sorted alphabetically; each entry is normalised to `{old, new}`.

### `change(string $field, mixed $old, mixed $new)`

Adds or merges a single field into the diff:

```php
->change('status', 'pending', 'paid')
```

Can be chained multiple times. Keys are kept sorted.

### `tags(array $tags)`

Attaches searchable labels to the entry. Tags are normalised before storage:

- converted to lowercase
- trimmed of whitespace
- duplicates removed
- sorted alphabetically

```php
->tags(['Orders', ' Checkout ', 'orders'])
// stored as: ['checkout', 'orders']
```

The built-in `TagsValidator` enforces per-tag length (default 50 chars) and total tag count (default 10), both configurable.

### `correlation(string $correlationId)`

Manually assigns a correlation id. Usually you use `Chronicle::transaction()` instead, but this is available for cases where you already have an id:

```php
->correlation('batch-2026-06-03')
```

### `modelDiff(Model $model)`

Derives a diff from the model's dirty attributes. Ignores `created_at` and `updated_at` automatically:

```php
$order->status = 'paid';

Chronicle::record()
    ->actor($user)
    ->action('order.status_changed')
    ->subject($order)
    ->modelDiff($order)
    ->commit();
```

If the model has no dirty attributes, the diff is omitted.

### `modelChanges(Model $model)` *(deprecated)*

An alias for `modelDiff()`. Deprecated since 1.x; will be removed in 2.0. Use `modelDiff()` instead.

### `build()` vs `commit()`

| Method     | What it does                                                                                    |
|------------|-------------------------------------------------------------------------------------------------|
| `build()`  | Validates the builder state and returns the raw payload `array`. Does **not** persist.          |
| `commit()` | Calls `build()`, then passes the payload through the Chronicle pipeline (hash, chain, persist). |

Use `build()` when you need to inspect or transform the payload before committing. In the normal case, call `commit()` directly.

## Example: full entry

```php
Chronicle::record()
    ->actor($user)
    ->action('order.status_changed')
    ->subject($order)
    ->metadata(['new_status' => 'paid'])
    ->context(['ip_address' => request()->ip()])
    ->modelDiff($order)
    ->tags(['orders', 'payments'])
    ->commit();
```

## See also

- [Auditing Eloquent Models](./auditing-eloquent-models.md) - automatic recording with `HasChronicle`
- [Diff Engine](./diff-engine.md) - diff structure details
- [Transactions](./transactions.md) - grouping entries under a correlation id
- [Testing Helpers](./testing-helpers.md) - asserting entries in tests
