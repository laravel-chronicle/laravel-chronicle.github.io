---
title: Custom Validators
---

# Custom Validators

Validators run at `ExtensionStage::VALIDATE` (priority 100) — the earliest point in the pipeline — and reject entries before any hashing or persistence occurs.

## The pattern

Implement `EntryExtension`, return `ExtensionStage::VALIDATE` from `stage()`, and throw a `ChronicleException` subclass to reject:

```php
use Chronicle\Contracts\EntryExtension;
use Chronicle\Contracts\PrioritizedEntryExtension;
use Chronicle\Entry\PendingEntry;
use Chronicle\Exceptions\ChronicleException;
use Chronicle\Pipeline\ExtensionStage;

class RequiresTenantContextValidator implements EntryExtension, PrioritizedEntryExtension
{
    public function stage(): ExtensionStage
    {
        return ExtensionStage::VALIDATE;
    }

    public function priority(): int
    {
        return 0; // runs after built-in validators (priority -100)
    }

    public function process(PendingEntry $entry): PendingEntry
    {
        $metadata = $entry->attribute('metadata', []);

        if (empty($metadata['tenant_id'])) {
            throw new MissingTenantException('Chronicle: tenant_id is required in metadata.');
        }

        return $entry;
    }
}
```

Defining a custom exception:

```php
use Chronicle\Exceptions\ChronicleException;

class MissingTenantException extends ChronicleException {}
```

## Priority relative to built-in validators

The built-in validators (e.g. `ActionValidator`) use `priority = -100`, which means they run first within the `VALIDATE` stage. Set your validator's priority to `0` or higher to run after them:

| Priority | Who |
|---|---|
| `-100` | Built-in validators (`ActionValidator`, etc.) |
| `0` (default) | Your validators (if `PrioritizedEntryExtension` not implemented) |
| positive | Runs later |

## Reading config values

When reading integer config values, use a `/** @var int */` annotation rather than a cast to satisfy PHPStan level 9 (the same pattern used by `ActionValidator`):

```php
protected function maxLength(): int
{
    /** @var int $length */
    $length = config('chronicle.validation.action_max_length', 255);

    return $length;
}
```

## Registration

Add to `config/chronicle.php`:

```php
'extensions' => [
    // built-in validators...
    RequiresTenantContextValidator::class,
],
```

Or at runtime:

```php
Chronicle::extendEntry(RequiresTenantContextValidator::class);
```

## What happens on rejection

When a validator throws, Chronicle:

1. Aborts the pipeline — the entry is never canonicalized, hashed, or persisted
2. Dispatches `EntryRejected($exception, $rawPayload)`
3. Re-throws the exception to the caller

## See also

- [Extension Architecture](./extending-chronicle.md) — stage ordering and `PendingEntry` API
- [Validation](./validation.md) — built-in validators and their config keys
- [Events Reference](./events.md) — `EntryRejected` payload
