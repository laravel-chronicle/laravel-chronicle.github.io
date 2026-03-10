---
title: Entry Extensions
---

# Entry Extensions

Chronicle supports custom entry extensions that run before the built-in pipeline stages.

This is the main package-level extension point when you need to enrich, validate, or apply policy to entries before Chronicle canonicalizes and hashes them.

## Registration

Register extensions in config:

```php
'extensions' => [
    App\Chronicle\ResolveTenantContext::class,
],
```

Or register them at runtime:

```php
use Chronicle\Facades\Chronicle;

Chronicle::extendEntry(App\Chronicle\ResolveTenantContext::class);
```

## Extension contract

An extension must implement `Chronicle\Contracts\EntryExtension`:

```php
use Chronicle\Contracts\EntryExtension;
use Chronicle\Entry\PendingEntry;
use Chronicle\Extensions\ExtensionStage;

final class ResolveTenantContext implements EntryExtension
{
    public function stage(): ExtensionStage
    {
        return ExtensionStage::RESOLVE_CONTEXT;
    }

    public function process(PendingEntry $entry): PendingEntry
    {
        $context = $entry->attribute('context', []);
        $context['tenant_id'] = tenant('id');

        $entry->setAttribute('context', $context);

        return $entry;
    }
}
```

## Available stages

Chronicle currently exposes these ordered stages:

- `VALIDATE`
- `RESOLVE_CONTEXT`
- `POLICY`
- `PROCESS`

All extensions run before Chronicle’s built-in canonicalization, payload hashing, chain hashing, and persistence processors.

## Priority ordering

If you need deterministic ordering within a stage, also implement `Chronicle\Contracts\PrioritizedEntryExtension`:

```php
use Chronicle\Contracts\PrioritizedEntryExtension;

public function priority(): int
{
    return -10;
}
```

Lower priority values execute first.

The registry sorts extensions by:

1. stage
2. priority
3. class name
4. registration order

## What extensions should do

Good use cases:

- inject deterministic context
- enforce domain-specific validation
- apply auditing policy
- attach metadata derived from request or tenant state

Avoid non-deterministic mutations that would make reproducibility harder, especially anything that depends on unstable ambient state without recording it into the entry itself.

## Working with `PendingEntry`

Extensions receive a `PendingEntry`, which gives access to the mutable pre-persistence attributes and payload.

Typical operations:

- `attribute()`
- `setAttribute()`
- `payload()`
- `setPayload()`

## When not to use extensions

Do not use extensions when a simple explicit call in application code is clearer. Chronicle favors explicit audit intent, so extensions should be reserved for cross-cutting concerns rather than routine domain logging.
