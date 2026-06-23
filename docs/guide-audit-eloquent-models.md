---
title: Audit Eloquent Models Automatically
---

# Audit Eloquent Models Automatically

Record `created`, `updated`, and `deleted` events for any Eloquent model without adding `Chronicle::record()` calls everywhere.

## 1. Add the trait

```php
use Chronicle\Eloquent\HasChronicle;

class Order extends Model
{
    use HasChronicle;
}
```

Chronicle now records `order.created`, `order.updated` (with diff), and `order.deleted` automatically. The actor defaults to `Auth::user() ?? 'system'`.

## 2. Restrict or customise (optional)

```php
class Order extends Model
{
    use HasChronicle;

    // Record only create and delete - skip update noise
    protected array $chronicleEvents = ['created', 'deleted'];

    // Exclude these fields from update diffs
    protected array $chronicleIgnore = ['last_synced_at'];

    // Override the action prefix (default: snake_case class name)
    protected function chronicleActionPrefix(): string
    {
        return 'shop.order';
    }

    // Override the actor
    protected function chronicleActor(): mixed
    {
        return $this->assignedAgent ?? Auth::user() ?? 'system';
    }
}
```

## 3. Audit a third-party model

For models you cannot modify, register an observer in a service provider:

```php
use Chronicle\Facades\Chronicle;

// Default observer - works for most cases
Chronicle::observe(Invoice::class);

// Custom observer for fine-grained control
Chronicle::observe(Invoice::class, InvoiceObserver::class);
```

## Verify it worked

```bash
php artisan tinker
>>> $order = Order::create(['status' => 'pending', ...]);
>>> \Chronicle\Entry\Entry::query()->action('order.created')->count();
// 1
```

Or in a test:

```php
$chronicle = Chronicle::fake();
Order::create(['status' => 'pending']);
$chronicle->assertRecorded(fn ($e) => $e['action'] === 'order.created');
```

## See also

- [Auditing Eloquent Models](./auditing-eloquent-models.md) - full trait and observer reference
- [Testing Helpers](./testing-helpers.md) - `Chronicle::fake()` and assertion methods
