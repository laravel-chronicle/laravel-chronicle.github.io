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

## Reverse resolution

Resolution above is the **write** direction - turning a model into a stored `(type, id)`. Since v1.13 Chronicle can also resolve the other way: turning a stored reference back into a model or a display label, which is what audit UIs need.

```php
use Chronicle\Facades\Chronicle;

$ref = Chronicle::resolveReference($entry->subject_type, $entry->subject_id);
$ref->class;    // resolved FQCN, or null when the type is unknown
$ref->label;    // e.g. "Order #123" - a humanised basename + id
$ref->exists(); // whether the underlying record can be located
```

Two convenience methods sit on top of it:

```php
Chronicle::referenceLabel($entry->actor_type, $entry->actor_id);             // never queries
Chronicle::referenceModel($entry->subject_type, $entry->subject_id);         // ?Model (queries)
Chronicle::referenceLabel($entry->subject_type, $entry->subject_id, hydrate: true); // queries
```

Key points:

- It honors `Relation::morphMap()`, so morph aliases resolve to the mapped class and back.
- It **does not touch the database** unless you opt in. `referenceLabel()` is query-free by default; pass `hydrate: true` (or use `referenceModel()`) to load the record and read its label attribute.
- Hydration reads the attribute named by `chronicle.references.label_attribute` (default `name`).
- Unknown or missing classes fall back to a humanised class basename plus the id - never an error.

To fully customise resolution, bind your own `Chronicle\Contracts\ReferenceLookup` in the container. The storage (write) direction is unchanged.

## See also

- [Custom Reference Resolvers](./custom-reference-resolvers.md) - customizing the write direction
- [Config Reference](./config-reference.md) - `references.label_attribute`
