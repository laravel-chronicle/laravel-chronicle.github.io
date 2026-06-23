---
title: Custom Context Resolvers
---

# Custom Context Resolvers

Context resolvers run at `ExtensionStage::RESOLVE_CONTEXT` (priority 200) and automatically attach namespaced runtime data to an entry's `context` attribute. Return `null` to skip silently - the resolver is simply not applied to that entry.

## The pattern

Extend `AbstractContextResolver` and implement `contextKey()` and `resolve()`:

```php
use Chronicle\Context\AbstractContextResolver;
use Chronicle\Entry\PendingEntry;

class TenantContextResolver extends AbstractContextResolver
{
    public function __construct(
        private readonly TenantManager $tenants,
    ) {}

    public function contextKey(): string
    {
        return 'tenant';
    }

    public function resolve(PendingEntry $entry): ?array
    {
        $tenant = $this->tenants->current();

        if ($tenant === null) {
            return null; // skip - no tenant in this context
        }

        return [
            'id'   => $tenant->id,
            'slug' => $tenant->slug,
        ];
    }
}
```

`AbstractContextResolver` handles the rest: it calls `resolve()`, skips if `null` is returned, and merges the result under `contextKey()` without overwriting any existing `context` keys set by the application.

The resulting `context` for the above example:

```json
{
  "tenant": {
    "id": 12,
    "slug": "acme"
  }
}
```

## Returning null to skip

Return `null` from `resolve()` to skip the resolver entirely for that entry. This is the correct pattern when the resolver is not applicable in the current runtime (e.g. a request resolver running inside a queue worker):

```php
public function resolve(PendingEntry $entry): ?array
{
    if (app()->runningInConsole()) {
        return null;
    }

    // ...
}
```

`AbstractContextResolver::process()` checks for `null` and skips the merge - it does not write an empty array or a `null` value under the key.

## Redacting sensitive values

When resolving data that may contain sensitive query parameters or headers, strip or redact them explicitly. Follow the pattern used by `RequestContextResolver`:

```php
private const SENSITIVE_PARAMS = ['password', 'token', 'secret', 'api_key'];

protected function sanitizeParams(array $params): array
{
    foreach (self::SENSITIVE_PARAMS as $key) {
        if (array_key_exists($key, $params)) {
            $params[$key] = '[redacted]';
        }
    }

    return $params;
}
```

## Registration

Add to `config/chronicle.php` (uncomment the optional resolver block):

```php
'extensions' => [
    // built-in validators...
    TenantContextResolver::class,
],
```

Or at runtime:

```php
Chronicle::extendEntry(TenantContextResolver::class);
```

## See also

- [Extension Architecture](./extending-chronicle.md) - stage ordering, `PendingEntry` API, registration
- [Context Resolvers](./context-resolvers.md) - built-in resolvers (request, environment, host, process, queue)
