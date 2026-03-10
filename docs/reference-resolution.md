---
title: Reference Resolution
---

# Reference Resolution

Chronicle stores actors and subjects as references rather than raw model objects.

This resolution is handled by `Chronicle\Contracts\ReferenceResolver`.

## Default behavior

The default resolver supports:

- Eloquent models
- scalar values
- objects with an `id` property

## Eloquent models

An Eloquent model resolves to:

- `type`: model class name
- `id`: model primary key as a string

## Scalars

A scalar resolves to:

- `type`: scalar type such as `string` or `integer`
- `id`: string-cast value

Example:

```php
Chronicle::record()
    ->actor('system')
    ->action('job.started')
    ->subject('ledger')
    ->commit();
```

## Objects with `id`

If an object is not an Eloquent model but has an `id` property, Chronicle uses:

- `type`: the object class name
- `id`: the `id` property

## Custom resolvers

If your domain uses non-standard identifiers or richer reference semantics, bind your own resolver implementation:

```php
use Chronicle\Contracts\ReferenceResolver;

$this->app->singleton(ReferenceResolver::class, App\Chronicle\DomainReferenceResolver::class);
```

Your resolver must return a `Chronicle\Reference`.

## When to customize

Consider a custom resolver when:

- domain objects do not expose a simple `id` property
- you need composite identifiers
- you want stable domain-level reference types instead of raw PHP class names

For many applications, the default resolver is enough and keeps the reference model simple.
