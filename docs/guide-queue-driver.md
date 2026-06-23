---
title: Run Chronicle Writes on a Queue
---

# Run Chronicle Writes on a Queue

Move audit entry persistence off the HTTP request path using the `queued` driver.

## 1. Configure the driver

In `.env`:

```env
CHRONICLE_DRIVER=queued
CHRONICLE_QUEUE=chronicle
```

## 2. Start exactly one worker

Chronicle's chain hashes are order-sensitive. Running multiple workers on the same queue will produce chain forks - two workers can each read the same previous chain head and generate competing next hashes.

```bash
php artisan queue:work --queue=chronicle --tries=1
```

**One worker. No more.** Set `--tries=1` so a failed job is not retried and does not corrupt the chain.

In a Supervisor configuration:

```ini
[program:chronicle-worker]
command=php /var/www/artisan queue:work --queue=chronicle --tries=1
numprocs=1
autostart=true
autorestart=true
```

`numprocs=1` is the critical setting.

## 3. Call Chronicle normally

No application code changes are needed. `Chronicle::record()->...->commit()` dispatches `PersistChronicleEntryJob` instead of writing synchronously:

```php
Chronicle::record()
    ->actor($user)
    ->action('order.created')
    ->subject($order)
    ->commit();
// Returns immediately - persistence happens in the worker
```

## What changes with the queued driver

- **`EntryRecorded` does not fire** - the event is dispatched by the synchronous pipeline stage which the queued driver bypasses. See [Events Reference](./events.md).
- Entries appear in the ledger after the worker processes the job, not immediately.
- Chain hashing happens inside the job under a database transaction with row-level locking.

## Verify it worked

Run the worker once manually and check:

```bash
php artisan queue:work --queue=chronicle --tries=1 --once
php artisan chronicle:stats
```

Entry count should increase by the number of entries committed before the worker ran.

## See also

- [Storage Drivers](./storage-drivers.md) - full queued driver details
- [Config Reference](./config-reference.md) - `queue` config block
- [Events Reference](./events.md) - `EntryRecorded` timing with the queued driver
