---
title: Context Resolvers
---

# Context Resolvers

Context resolvers automatically attach namespaced runtime information to every Chronicle audit entry — things like the current environment, HTTP request details, server hostname, process ID, or queue job metadata.

They are opt-in entry extensions that run in the `RESOLVE_CONTEXT` stage, before Chronicle canonicalizes and hashes the entry.

## How it works

A context resolver implements two methods:

- `contextKey()` — the key under which its data is nested inside the entry's `context` attribute.
- `resolve()` — returns an array of data to attach, or `null` to skip silently.

The `AbstractContextResolver` base class handles the rest: it calls `resolve()`, skips if `null` is returned, and merges the result into `context` under the resolver's key — without overwriting any existing application-set keys.

```text
entry.context before: { "tenant_id": 42 }

EnvironmentContextResolver runs →  context.environment = { name, debug }
RequestContextResolver runs    →  context.request     = { ip_address, url, ... }
HostContextResolver runs       →  context.host        = { hostname }

entry.context after: {
  "tenant_id": 42,
  "environment": { "name": "production", "debug": false },
  "request": { "ip_address": "...", "url": "...", ... },
  "host": { "hostname": "app-server-01" }
}
```

All context data is written before hashing. Once an entry is persisted, the context is tamper-evident and part of the integrity chain.

## Built-in resolvers

Chronicle ships five opt-in resolvers. None are enabled by default.

| Resolver | Context key | What it attaches |
|----------|-------------|------------------|
| `EnvironmentContextResolver` | `environment` | `name` (app env), `debug` (bool) |
| `RequestContextResolver` | `request` | `ip_address`, `user_agent`, `url`, `method`, `request_id` |
| `HostContextResolver` | `host` | `hostname` |
| `ProcessContextResolver` | `process` | `id` (PID), `runtime`, `version` (PHP version) |
| `QueueContextResolver` | `queue` | `job_id`, `connection`, `queue` |

### EnvironmentContextResolver

Attaches the Laravel application environment to every entry.

```json
"environment": {
  "name": "production",
  "debug": false
}
```

`name` falls back to `"unknown"` if `app.env` is not configured. `debug` is always cast to `bool`.

### RequestContextResolver

Attaches HTTP request metadata. Skips silently when running in a console or queue worker.

```json
"request": {
  "ip_address": "203.0.113.10",
  "user_agent": "Mozilla/5.0 ...",
  "url": "https://example.com/orders/checkout",
  "method": "POST",
  "request_id": "01J2Q5M2M8M0P0X2A9BTD3M7D1"
}
```

`request_id` is taken from the `X-Request-ID` header when present. When absent, a UUID is generated on first use and stored in request attributes — so every Chronicle entry created within the same HTTP request shares the same generated ID.

### HostContextResolver

Attaches the server hostname. Records an empty string if `gethostname()` fails.

```json
"host": {
  "hostname": "app-server-01"
}
```

### ProcessContextResolver

Attaches the current PHP process identity.

```json
"process": {
  "id": 12345,
  "runtime": "php",
  "version": "8.3.4"
}
```

### QueueContextResolver

Attaches queue job metadata. Skips silently when no queue job is active (i.e. in HTTP or CLI contexts).

```json
"queue": {
  "job_id": "job-abc-123",
  "connection": "redis",
  "queue": "default"
}
```

`QueueJobContext` is a singleton bound by `ChronicleServiceProvider`. It is populated automatically via `JobProcessing`, `JobProcessed`, `JobFailed`, and `JobExceptionOccurred` event listeners — no changes to your application jobs are required.

## Enabling resolvers

All built-in resolvers are commented out in `config/chronicle.php`. Uncomment any you want to activate:

```php
'extensions' => [
    // built-in validators...
    ActorPresenceValidator::class,
    SubjectValidator::class,
    // ...

    // Optional context resolvers — uncomment to enable:
    \Chronicle\Context\EnvironmentContextResolver::class,
    \Chronicle\Context\RequestContextResolver::class,
    \Chronicle\Context\HostContextResolver::class,
    \Chronicle\Context\ProcessContextResolver::class,
    \Chronicle\Context\QueueContextResolver::class,
],
```

You can also register them at runtime:

```php
use Chronicle\Facades\Chronicle;

Chronicle::extendEntry(\Chronicle\Context\EnvironmentContextResolver::class);
```

## Custom context resolvers

Extend `AbstractContextResolver` and implement `contextKey()` and `resolve()`. The base class handles everything else.

### Example: attaching tenant context

```php
<?php

namespace App\Chronicle;

use Chronicle\Context\AbstractContextResolver;
use Chronicle\Entry\PendingEntry;

final class TenantContextResolver extends AbstractContextResolver
{
    public function __construct(private readonly TenantManager $tenants) {}

    public function contextKey(): string
    {
        return 'tenant';
    }

    public function resolve(PendingEntry $entry): ?array
    {
        $tenant = $this->tenants->current();

        if ($tenant === null) {
            return null; // skips silently — nothing added to context
        }

        return [
            'id'   => $tenant->id,
            'slug' => $tenant->slug,
            'plan' => $tenant->plan,
        ];
    }
}
```

Register it in `config/chronicle.php`:

```php
'extensions' => [
    // built-in validators...

    \App\Chronicle\TenantContextResolver::class,
],
```

Or at runtime:

```php
Chronicle::extendEntry(\App\Chronicle\TenantContextResolver::class);
```

When `resolve()` returns an array, the entry's `context` attribute is updated:

```json
"context": {
  "tenant": {
    "id": 7,
    "slug": "acme",
    "plan": "enterprise"
  }
}
```

When `resolve()` returns `null`, the entry passes through unmodified. Use this for resolvers that are context-conditional — for example, a resolver that only applies during queue processing, or only when a tenant is active.

### Resolver contract

```php
use Chronicle\Context\AbstractContextResolver;
use Chronicle\Entry\PendingEntry;

abstract class AbstractContextResolver implements EntryExtension, ContextResolver
{
    // Always runs in the RESOLVE_CONTEXT stage.
    public function stage(): ExtensionStage
    {
        return ExtensionStage::RESOLVE_CONTEXT;
    }

    // Merges resolved data into context[contextKey()], or skips if resolve() returns null.
    public function process(PendingEntry $entry): PendingEntry { ... }

    // You implement these two:
    abstract public function contextKey(): string;
    abstract public function resolve(PendingEntry $entry): ?array;
}
```

### Overwriting an existing key

If your resolver's `contextKey()` matches an existing key in the entry's `context`, the resolver's data replaces it. Resolvers do not merge recursively into existing keys — the entire key is replaced.

This means application code can still set `context` values before the extension pipeline runs. If a resolver uses the same key, it wins. Design your key names to avoid collisions (`tenant`, `environment`, `request`, etc. are good choices).

### Ordering

Context resolvers run in the `RESOLVE_CONTEXT` stage, after `VALIDATE` and before `POLICY` and `PROCESS`. Within the stage, ordering follows the standard extension rules:

1. Priority (implement `PrioritizedEntryExtension` for explicit control)
2. Class name
3. Registration order

For most applications, ordering between context resolvers does not matter since each resolver writes to its own isolated key.

## Interaction with payload size validation

`PayloadSizeValidator` measures the combined JSON size of `metadata`, `context`, and `diff`. Because it runs in the `VALIDATE` stage — before context resolvers execute — it measures the `context` as it was when the entry was created, not after resolvers have enriched it.

If your resolvers attach large amounts of context data and you want to guard against the total size, consider implementing a custom `PayloadSizeValidator`-style extension in the `PROCESS` stage, after your resolvers have run.

## When not to use context resolvers

Context resolvers are designed for **cross-cutting ambient state** — information that is true about the runtime environment, not about the domain event being logged.

Avoid using them for:

- Data that varies per entry and is better set explicitly via `metadata`.
- Domain-specific data that belongs in the event payload rather than runtime context.
- Expensive operations (database queries, HTTP calls) that run on every single entry.

For data that only applies to specific entries, set it directly:

```php
Chronicle::record()
    ->actor($user)
    ->action('order.placed')
    ->on($order)
    ->metadata(['payment_method' => 'stripe', 'amount' => 4999])
    ->commit();
```
