---
title: Custom Policies
---

# Custom Policies

Policies enforce business rules at `ExtensionStage::POLICY` (priority 300) - after validation and context resolution, before canonicalization. They either allow an entry to proceed (return normally) or reject it (throw `PolicyViolationException`).

## The pattern

Extend `AbstractPolicy` and implement `enforce()`:

```php
use Chronicle\Entry\PendingEntry;
use Chronicle\Exceptions\PolicyViolationException;
use Chronicle\Policy\AbstractPolicy;

class RequiresBusinessHoursPolicy extends AbstractPolicy
{
    public function enforce(PendingEntry $entry): void
    {
        $hour = now()->hour;

        if ($hour < 8 || $hour >= 18) {
            throw new PolicyViolationException(
                'Chronicle entries are only permitted during business hours (08:00–18:00).'
            );
        }
    }
}
```

`AbstractPolicy` fixes `stage()` to `ExtensionStage::POLICY` and wires `process()` to call `enforce()` - both methods are `final` so you cannot accidentally change the stage or break the pipeline contract.

## Accessing entry data

Read any entry attribute via `PendingEntry::attribute()`:

```php
public function enforce(PendingEntry $entry): void
{
    $action = $entry->attribute('action');

    if (str_starts_with((string) $action, 'admin.')) {
        if (! Auth::user()?->isAdmin()) {
            throw new PolicyViolationException(
                "Action [$action] requires admin privileges."
            );
        }
    }
}
```

## Custom exception subclasses

`PolicyViolationException` extends `ChronicleException`. Subclass it for specific rejection types so callers can catch selectively:

```php
use Chronicle\Exceptions\PolicyViolationException;

class BusinessHoursViolationException extends PolicyViolationException {}
```

## Registration

Add to `config/chronicle.php`:

```php
'extensions' => [
    // built-in validators...
    RequiresBusinessHoursPolicy::class,
],
```

Or at runtime from a service provider:

```php
Chronicle::extendEntry(RequiresBusinessHoursPolicy::class);
```

## Priority within the POLICY stage

Policies run at stage value 300. If you register multiple policies and need a specific order, implement `PrioritizedEntryExtension`:

```php
use Chronicle\Contracts\PrioritizedEntryExtension;

class RequiresBusinessHoursPolicy extends AbstractPolicy implements PrioritizedEntryExtension
{
    public function priority(): int
    {
        return -10; // runs before other policies at default priority 0
    }

    public function enforce(PendingEntry $entry): void { ... }
}
```

## See also

- [Extension Architecture](./extending-chronicle.md) - stage ordering and registration
- [Policies](./policies.md) - built-in policies and their config keys
- [Events Reference](./events.md) - `EntryRejected` fires when a policy rejects
