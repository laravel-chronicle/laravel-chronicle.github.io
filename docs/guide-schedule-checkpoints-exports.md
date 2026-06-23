---
title: Schedule Checkpoints & Exports
---

# Schedule Checkpoints & Exports

Create periodic signed checkpoints and export the ledger on a schedule, so you have an off-system audit trail without manual intervention.

## 1. Add to the scheduler

In `routes/console.php` (Laravel 11+):

```php
use Illuminate\Support\Facades\Schedule;

// Create a checkpoint every day at midnight
Schedule::command('chronicle:checkpoint')->daily();

// Export the ledger every Sunday at 02:00 and store it off-system
Schedule::command('chronicle:export', [storage_path('chronicle/exports/'.now()->format('Y-W'))])
    ->weekly()
    ->sundays()
    ->at('02:00');
```

Or in `app/Console/Kernel.php` (Laravel 10 and below):

```php
protected function schedule(Schedule $schedule): void
{
    $schedule->command('chronicle:checkpoint')->daily();

    $schedule->command('chronicle:export', [
        storage_path('chronicle/exports/'.now()->format('Y-W')),
    ])->weekly()->sundays()->at('02:00');
}
```

## 2. Ensure the export path exists

```php
Schedule::command('chronicle:export', [storage_path('chronicle/exports/'.now()->format('Y-W'))])
    ->weekly()
    ->before(function () {
        @mkdir(storage_path('chronicle/exports'), 0755, true);
    });
```

Or create the directory as part of your deployment process.

## 3. Move exports off-system

An export stored on the same server as the application provides limited integrity guarantees. After generation, copy it to an independent destination:

```php
Schedule::command('chronicle:export', [$localPath = storage_path('chronicle/exports/'.now()->format('Y-W'))])
    ->weekly()
    ->then(function () use ($localPath) {
        // Upload to S3, send to an audit service, etc.
        Storage::disk('s3-audit')->putDirectory('exports/'.basename($localPath), $localPath);
    });
```

## Verify it worked

After the scheduler has run:

```bash
php artisan chronicle:stats
# Checkpoint count should increment each day

php artisan chronicle:verify-export storage/chronicle/exports/<week-dir>
# Should print: verification passed
```

## See also

- [Checkpoints](./checkpoints.md) - what a checkpoint stores and why it matters
- [Exports](./exports.md) - export output format
- [Artisan Commands](./artisan-commands.md) - full command signatures
