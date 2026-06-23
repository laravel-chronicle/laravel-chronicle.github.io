---
title: Custom Reference Resolvers
---

# Custom Reference Resolvers

Chronicle converts every `actor` and `subject` value into a `Reference` - a `(type, id)` pair - before storing it. The default resolver handles Eloquent models and objects with a public `$id` property. Replace it when your domain uses a different identity model.

## The contract

```php
interface ReferenceResolver
{
    public function resolve(mixed $value): Reference;
}
```

`resolve()` receives the raw value passed to `->actor()` or `->subject()` and must return a `Chronicle\Support\Reference`:

```php
use Chronicle\Support\Reference;

new Reference(string $type, string $id);
```

`$type` is typically a class name or a stable string identifier. `$id` must be a string. Both are stored as-is in the ledger.

## Default resolver behaviour

`DefaultReferenceResolver` supports:

| Input                             | Resolved as                           |
|-----------------------------------|---------------------------------------|
| Eloquent model with primary key   | `Reference(ClassName, (string) $key)` |
| Object with public `$id` property | `Reference(ClassName, (string) $id)`  |
| Scalar value                      | **throws** `InvalidArgumentException` |
| Unsupported object                | **throws** `InvalidArgumentException` |

Pass a persisted model - an unsaved model with `getKey() === null` throws.

## Writing a custom resolver

```php
use Chronicle\Contracts\ReferenceResolver;
use Chronicle\Support\Reference;

class DomainReferenceResolver implements ReferenceResolver
{
    public function resolve(mixed $value): Reference
    {
        // Eloquent models: delegate to standard behaviour
        if ($value instanceof \Illuminate\Database\Eloquent\Model) {
            return new Reference(
                $value::class,
                (string) $value->getKey(),
            );
        }

        // Value objects that expose a stable identity
        if ($value instanceof HasStableIdentity) {
            return new Reference(
                $value->typeName(),
                $value->stableId(),
            );
        }

        throw new \InvalidArgumentException(
            sprintf('Cannot resolve Chronicle reference for %s.', get_debug_type($value))
        );
    }
}
```

## Registering the resolver

Rebind `ReferenceResolver::class` in your application service provider. Chronicle's `ChronicleServiceProvider` binds it as a singleton - your binding in `AppServiceProvider::register()` will take precedence because application providers load after package providers:

```php
use Chronicle\Contracts\ReferenceResolver;

class AppServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        $this->app->singleton(
            ReferenceResolver::class,
            DomainReferenceResolver::class,
        );
    }
}
```

There is no config key for the resolver - it is always resolved through the service container.

## See also

- [Extension Architecture](./extending-chronicle.md) - the broader extension system
- [Recording Entries](./recording-entries.md) - how `actor()` and `subject()` use the resolver
- [Reference Resolution](./reference-resolution.md) - how references are stored in the ledger
