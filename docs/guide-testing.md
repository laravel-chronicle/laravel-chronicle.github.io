---
title: Test Code That Records Audit Entries
---

# Test Code That Records Audit Entries

Use `Chronicle::fake()` to capture entries in memory and assert on them without touching the database.

## 1. Call `Chronicle::fake()` at the start of the test

```php
use Chronicle\Facades\Chronicle;

it('records an order created entry', function () {
    $chronicle = Chronicle::fake();

    // ... trigger your application code ...

    $chronicle->assertRecorded(fn ($e) => $e['action'] === 'order.created');
});
```

`fake()` flushes any entries from previous tests, swaps the driver to `ArrayDriver`, and returns a `ChronicleAssertions` helper. All validation and hashing still runs - only persistence is redirected to memory.

## 2. Assert what was recorded

```php
// At least one entry recorded (any)
$chronicle->assertRecorded();

// At least one entry matching a condition
$chronicle->assertRecorded(fn ($e) => $e['action'] === 'order.created');

// Exact count
$chronicle->assertRecordedCount(2);

// Exact count matching a condition
$chronicle->assertRecordedCount(1, fn ($e) => $e['action'] === 'order.created');

// Nothing recorded at all
$chronicle->assertNothingRecorded();

// No entry matching a condition
$chronicle->assertNotRecorded(fn ($e) => $e['action'] === 'order.deleted');
```

The filter callable receives the raw entry array: `id`, `action`, `actor_type`, `actor_id`, `subject_type`, `subject_id`, `metadata`, `context`, `diff`, `tags`, `correlation_id`.

## 3. Inspect entries for custom assertions

```php
$entries = $chronicle->entries(); // Collection of raw entry arrays

$first = $entries->first();
expect($first['metadata']['total'])->toBe(9900);
expect($first['tags'])->toContain('orders');
```

## 4. Restore the driver between tests (if needed)

In most Pest/PHPUnit setups the container is reset per test. If you observe entries leaking between tests, call `restore()` in `afterEach`:

```php
afterEach(fn () => $chronicle->restore());
```

## Testing `HasChronicle` models

```php
it('records order updated with diff', function () {
    $chronicle = Chronicle::fake();

    $order = Order::factory()->create(['status' => 'pending']);
    $order->update(['status' => 'paid']);

    $chronicle->assertRecorded(function ($e) {
        return $e['action'] === 'order.updated'
            && ($e['diff']['status']['new'] ?? null) === 'paid';
    });
});
```

## Verify it worked

Run your test suite - a failing `assertRecorded()` prints a clear message:

```
Failed asserting that a Chronicle entry matching the filter was recorded.
```

## See also

- [Testing Helpers](./testing-helpers.md) - full `ChronicleAssertions` API reference
- [Auditing Eloquent Models](./auditing-eloquent-models.md) - testing model-triggered entries
