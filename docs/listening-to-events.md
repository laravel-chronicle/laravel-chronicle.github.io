---
title: Listening to Events
---

# Listening to Events

Chronicle dispatches two Laravel events you can listen to: `EntryRecorded` (after a successful persist) and `EntryRejected` (when a validator or policy blocks an entry).

## Registering listeners

### In `EventServiceProvider`

```php
use Chronicle\Events\EntryRecorded;
use Chronicle\Events\EntryRejected;

protected $listen = [
    EntryRecorded::class => [
        App\Listeners\ForwardToAuditWebhook::class,
        App\Listeners\InvalidateAuditCache::class,
    ],
    EntryRejected::class => [
        App\Listeners\LogRejectedEntry::class,
    ],
];
```

### Via `Event::listen()`

```php
use Chronicle\Events\EntryRecorded;
use Chronicle\Events\EntryRejected;
use Illuminate\Support\Facades\Event;

Event::listen(EntryRecorded::class, function (EntryRecorded $event) {
    // $event->entry is the persisted Entry model
    cache()->forget('audit:latest');
});

Event::listen(EntryRejected::class, function (EntryRejected $event) {
    // $event->reason  - the exception that caused the rejection
    // $event->payload - raw entry attributes at rejection time
    logger()->warning('Chronicle entry rejected', [
        'reason' => $event->reason->getMessage(),
        'action' => $event->payload['action'] ?? null,
    ]);
});
```

## Important: queued driver timing

`EntryRecorded` is dispatched by the synchronous `PersistEntry` pipeline stage. When `driver = 'queued'`, that stage is bypassed - `EntryRecorded` is **not fired**. See [Events Reference](./events.md) for the full explanation.

## Full event documentation

For payload details, property types, and more examples see the [Events Reference](./events.md).

## See also

- [Events Reference](./events.md) - `EntryRecorded` and `EntryRejected` payload docs
- [Storage Drivers](./storage-drivers.md) - queued driver and its effect on event timing
- [Extension Architecture](./extending-chronicle.md) - using extensions as an alternative hook point
