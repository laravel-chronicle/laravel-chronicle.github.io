---
title: Testing Helpers
---

# Testing Helpers

Chronicle provides a `fake()` helper that swaps the storage driver to an in-memory `ArrayDriver` and returns an assertion object. Entries are captured in memory for the duration of the test - nothing is written to the database.

## `Chronicle::fake()`

```php
use Chronicle\Facades\Chronicle;

$chronicle = Chronicle::fake();
```

Call this at the start of your test. It:

1. Flushes any entries from previous tests
2. Swaps the active driver to `ArrayDriver`
3. Rebuilds the `EntryPipeline` singleton so `PersistEntry` uses the new driver
4. Returns a `ChronicleAssertions` instance

All validation, canonicalization, and hashing still runs - only persistence is redirected to memory.

## Assertion methods

### `assertRecorded(?callable $filter = null)`

Asserts that at least one entry was recorded. Pass a filter to match specific entries:

```php
$chronicle->assertRecorded();

$chronicle->assertRecorded(
    fn ($e) => $e['action'] === 'order.created'
);
```

The filter receives a raw entry array as its argument. Returns `$this` for chaining.

### `assertRecordedCount(int $count, ?callable $filter = null)`

Asserts an exact number of entries were recorded:

```php
$chronicle->assertRecordedCount(3);

$chronicle->assertRecordedCount(1, fn ($e) => $e['action'] === 'order.created');
```

### `assertNothingRecorded()`

Asserts that no entries were recorded at all:

```php
$chronicle->assertNothingRecorded();
```

### `assertNotRecorded(callable $filter)`

Asserts that no entry matching the filter was recorded:

```php
$chronicle->assertNotRecorded(
    fn ($e) => $e['action'] === 'order.deleted'
);
```

### `entries()`

Returns all recorded entries as a `Collection` for custom assertions:

```php
$entries = $chronicle->entries();

$actions = $entries->pluck('action')->all();
// ['order.created', 'order.payment_captured']
```

Each item is the raw entry array including `id`, `action`, `actor_type`, `actor_id`, `subject_type`, `subject_id`, `metadata`, `context`, `diff`, `tags`, `correlation_id`.

### `restore()`

Restores the real storage driver. Use this in `afterEach()` when test ordering matters:

```php
afterEach(fn () => $chronicle->restore());
```

Without `restore()`, the `ArrayDriver` binding persists for the remainder of the test suite run. In most Pest/PHPUnit setups the container is reset per test, but call `restore()` explicitly if you observe leakage.

## Pest example

```php
use Chronicle\Facades\Chronicle;

it('records an order created entry', function () {
    $chronicle = Chronicle::fake();

    $user  = User::factory()->create();
    $order = Order::factory()->create();

    Chronicle::record()
        ->actor($user)
        ->action('order.created')
        ->subject($order)
        ->metadata(['total' => 9900])
        ->tags(['orders'])
        ->commit();

    $chronicle->assertRecordedCount(1);

    $chronicle->assertRecorded(function ($entry) use ($order) {
        return $entry['action'] === 'order.created'
            && $entry['subject_id'] === (string) $order->id;
    });
});
```

## PHPUnit example

```php
use Chronicle\Facades\Chronicle;
use PHPUnit\Framework\TestCase;

class OrderAuditTest extends TestCase
{
    public function test_records_order_created(): void
    {
        $chronicle = Chronicle::fake();

        // ... trigger code under test ...

        $chronicle->assertRecorded(
            fn ($e) => $e['action'] === 'order.created'
        );
    }
}
```

## Seeding a verifiable ledger (v1.13)

`Chronicle::fake()` is for asserting *what was recorded* - it uses the in-memory `ArrayDriver` and writes nothing to the database, so it can't back tests that read the ledger through Eloquent (Filament tables, query API, verification). For those, use `Chronicle\Testing\LedgerSeeder`, which drives the real write pipeline against the database and produces a **valid hash chain**.

```php
use Chronicle\Testing\LedgerSeeder;

$seeded = LedgerSeeder::make()
    ->count(1000)
    ->checkpointEvery(100)
    ->action(fn (int $i) => "order.$i")
    ->actor(fn (int $i) => User::factory()->create())
    ->subject(fn (int $i) => Order::factory()->create())
    ->seed();

$seeded->entries;          // 1000
$seeded->checkpoints;      // 10
$seeded->lastCheckpointId; // ?string
```

Because it runs the genuine hashing and signing path (inside a single transaction, with periodic signed checkpoints), the seeded ledger passes both `IntegrityVerifier::verify()` and `CheckpointChainVerifier::verify()` - so read-path and verification tests run against realistic, verifiable data. It ships under the `Testing` namespace with no effect on production code.

## See also

- [Recording Entries](./recording-entries.md) - the builder API
- [Auditing Eloquent Models](./auditing-eloquent-models.md) - testing model-triggered entries
- [Storage Drivers](./storage-drivers.md) - `array` and `null` drivers for other test scenarios
- [Integrity Verification](./integrity-verification.md) - verifying a seeded ledger
