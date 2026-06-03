---
title: Auditing Eloquent Models
---

# Auditing Eloquent Models

Chronicle provides two opt-in mechanisms for automatically recording audit entries when Eloquent models change: the `HasChronicle` trait (for your own models) and `ChronicleModelObserver` (for third-party models you cannot modify).

Both are **explicit opt-in** — Chronicle never attaches global observers automatically.

## `HasChronicle` trait

Add the trait to any Eloquent model you want to audit:

```php
use Chronicle\Eloquent\HasChronicle;

class Order extends Model
{
    use HasChronicle;
}
```

Chronicle will record entries on `created`, `updated`, and `deleted` model events. For `updated`, it skips entries when the only changes are timestamp fields.

### Default behaviour

| Event | Action recorded |
|---|---|
| `created` | `order.created` |
| `updated` | `order.updated` (with diff, if changes exist) |
| `deleted` | `order.deleted` |

The action prefix defaults to `snake_case` of the model's base class name (e.g. `OrderItem` → `order_item`).

The actor defaults to `Auth::user() ?? 'system'`.

### Customising recorded events

Override `$chronicleEvents` to limit which lifecycle events are audited:

```php
class Order extends Model
{
    use HasChronicle;

    protected array $chronicleEvents = ['created', 'deleted']; // skip 'updated'
}
```

### Ignoring specific fields in diffs

Override `$chronicleIgnore` to exclude fields from the `updated` diff:

```php
class Order extends Model
{
    use HasChronicle;

    protected array $chronicleIgnore = ['last_synced_at', 'cache_key'];
}
```

`created_at` and `updated_at` are always excluded by default.

### Overridable methods

Override these protected methods in your model for finer control:

```php
class Order extends Model
{
    use HasChronicle;

    // Change the actor resolution
    protected function chronicleActor(): mixed
    {
        return $this->assignedUser ?? Auth::user() ?? 'system';
    }

    // Change the action prefix
    protected function chronicleActionPrefix(): string
    {
        return 'shop.order'; // produces: shop.order.created, etc.
    }

    // Change which fields are ignored in diffs (merged with defaults)
    protected function chronicleIgnoredFields(): array
    {
        return array_merge(parent::chronicleIgnoredFields(), ['search_vector']);
    }
}
```

## `Chronicle::observe()` for third-party models

When you cannot add `HasChronicle` to a model directly (e.g. a package model), register a `ChronicleModelObserver`:

```php
// Register in a ServiceProvider
use Chronicle\Facades\Chronicle;

// Use the default observer
Chronicle::observe(Invoice::class);

// Use a custom observer subclass
Chronicle::observe(Invoice::class, InvoiceObserver::class);
```

### Writing a custom observer

Extend `ChronicleModelObserver` and override any protected method:

```php
use Chronicle\Eloquent\ChronicleModelObserver;
use Illuminate\Database\Eloquent\Model;

class InvoiceObserver extends ChronicleModelObserver
{
    // Restrict to specific events
    protected function recordedEvents(): array
    {
        return ['created', 'updated'];
    }

    // Custom actor resolution
    protected function resolveActor(Model $model): Model|string
    {
        return Auth::user() ?? 'billing-system';
    }

    // Custom action prefix
    protected function actionPrefix(Model $model): string
    {
        return 'billing.invoice';
    }

    // Extra fields to exclude from diffs (merged with timestamps)
    protected array $ignoredFields = ['stripe_metadata', 'pdf_cache'];
}
```

The base `ChronicleModelObserver` records `created`, `updated`, and `deleted` by default, derives the action prefix from `snake_case` of the model class name, and uses `Auth::user() ?? 'system'` as the actor.

## Low magic

Chronicle's Eloquent integration is deliberately explicit. You must opt each model in individually. There are no global hooks, no automatic activity recording, and no framework-level interception. Every audit entry that Chronicle records is the result of a deliberate developer decision — either a direct `Chronicle::record()` call or an explicit observer registration.

## See also

- [Recording Entries](./recording-entries.md) — the `EntryBuilder` API used under the hood
- [Diff Engine](./diff-engine.md) — how diffs are structured
- [Testing Helpers](./testing-helpers.md) — asserting model-triggered entries in tests
