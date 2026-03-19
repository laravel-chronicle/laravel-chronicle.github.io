---
title: Policies
---

# Policies

Policies govern which audit entries are allowed to be recorded. They run after validation and context resolution, before Chronicle canonicalizes and hashes the entry — so a rejected entry never touches the ledger.

Six built-in policies cover the most common enforcement needs. All are opt-in.

## How it works

A policy implements a single `enforce(PendingEntry $entry): void` method. It either returns silently (entry is allowed) or throws a `PolicyViolationException` (entry is rejected). Policies never mutate the entry.

The `AbstractPolicy` base class wires policies into the `POLICY` extension stage (priority 300), after `VALIDATE` and `RESOLVE_CONTEXT`:

```text
VALIDATE stage
↓  validators...
↓
RESOLVE_CONTEXT stage
↓  context resolvers...
↓
POLICY stage
↓  your policies...     ← runs here
↓
PROCESS stage
↓  your extensions...
↓
CanonicalizePayload → HashPayload → ChainHashEntry → PersistEntry
```

If any policy throws, the entry is rejected and nothing is written to the ledger.

## Exception hierarchy

All policy rejections extend `PolicyViolationException`, which itself extends `ChronicleException`. This means callers who already catch `ChronicleException` receive policy rejections without any changes. Subclasses allow fine-grained handling:

```
ChronicleException
└── PolicyViolationException
    ├── UnauthenticatedActorException
    ├── ActionNotAllowedException
    ├── ActionForbiddenException
    ├── RateLimitExceededException
    ├── OutsideTimeWindowException
    └── RequiredContextMissingException
```

## Built-in policies

All six policies live in `Chronicle\Policy\` and are commented out in `config/chronicle.php` by default.

| Policy | What it enforces | Throws |
|--------|-----------------|--------|
| `OnlyAuthenticatedUsersPolicy` | Actor must be authenticated | `UnauthenticatedActorException` |
| `AllowedActionsPolicy` | Action must match a configured allowlist | `ActionNotAllowedException` |
| `ForbiddenActionsPolicy` | Action must not match a configured denylist | `ActionForbiddenException` |
| `RateLimitPolicy` | Actor must not exceed a configured rate cap | `RateLimitExceededException` |
| `TimeWindowPolicy` | Current time must fall within a configured window | `OutsideTimeWindowException` |
| `ContextPolicy` | Entry context must contain all required keys | `RequiredContextMissingException` |

### OnlyAuthenticatedUsersPolicy

Rejects entries when no authenticated user session is active (`Auth::check()` returns false).

Skips automatically when running in a console or queue worker context — `app()->runningInConsole()` returns true for both Artisan commands and queue workers, so jobs dispatched to the queue are never blocked by this policy.

No configuration keys.

```php
// config/chronicle.php
'extensions' => [
    \Chronicle\Policy\OnlyAuthenticatedUsersPolicy::class,
],
```

### AllowedActionsPolicy

Rejects any action **not** present in the configured allowlist. Supports `Str::is()` wildcard patterns.

**An empty allowlist rejects every action.** If you register this policy, you must explicitly configure what is allowed. Forgetting to populate the list surfaces as immediate rejections, not silent pass-through.

```php
'policy' => [
    'allowed_actions' => ['user.*', 'order.placed', 'payment.*'],
],
```

```text
user.created   → matches user.*      → passes
order.placed   → exact match         → passes
payment.refunded → matches payment.* → passes
debug.dump     → no match            → ActionNotAllowedException
```

### ForbiddenActionsPolicy

Rejects any action **matching** the configured denylist. Same `Str::is()` wildcard syntax.

**An empty denylist forbids nothing** — the policy is a no-op when unconfigured.

```php
'policy' => [
    'forbidden_actions' => ['debug.*', 'internal.*'],
],
```

When both `AllowedActionsPolicy` and `ForbiddenActionsPolicy` are enabled simultaneously, an action must satisfy both: it must appear in the allowlist **and** not appear in the denylist. Both policies check independently — the caller sees the exception from whichever policy rejects first.

### RateLimitPolicy

Caps how many entries a single actor can record per time window. Uses Laravel's `RateLimiter` facade with a per-actor cache key.

```php
'policy' => [
    'rate_limit' => [
        'max_entries'   => 60,
        'decay_seconds' => 60,
    ],
],
```

The cache key is `chronicle:rate:{hash}` where `{hash}` is `sha1("{actor_type}/{actor_id}")`. Hashing produces a fixed-length, safe key regardless of backslashes in fully-qualified class names or other special characters.

:::note
Requires a non-`array` cache driver to enforce limits correctly across requests. The `array` driver resets on each request, making rate limiting ineffective.
:::

When the limit is exceeded, `RateLimitExceededException` is thrown with the retry-after seconds included in the message.

### TimeWindowPolicy

Rejects entries recorded outside the configured hours and days of the week. Uses Carbon for timezone-aware comparison.

```php
'policy' => [
    'time_window' => [
        'start'    => '09:00',
        'end'      => '17:00',
        'days'     => ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
        'timezone' => null, // falls back to app.timezone
    ],
],
```

- `days` is case-insensitive. An empty `days` array applies the time restriction every day.
- `timezone` falls back to `config('app.timezone')` when `null`.
- Bounds are **inclusive** — exactly `09:00:00` and `17:00:00` are allowed.
- Default `end` is `'23:59:59'` to avoid a 60-second blind spot at end of day.

**Midnight-spanning windows are not supported.** If `start >= end`, the policy throws `\InvalidArgumentException` at construction time — this is a misconfiguration error, not an entry rejection.

```php
// Invalid — throws \InvalidArgumentException immediately
'time_window' => ['start' => '22:00', 'end' => '06:00', ...],
```

### ContextPolicy

Rejects entries whose `context` attribute is missing any required top-level key. Checks key **existence** only — not value type or content.

```php
'policy' => [
    'required_context_keys' => ['tenant_id', 'environment'],
],
```

```json
// passes
"context": { "tenant_id": 42, "environment": "production" }

// throws RequiredContextMissingException: required context key [tenant_id] is missing
"context": { "environment": "production" }
```

- An empty `required_context_keys` list is a no-op.
- If `context` is `null` or not an array, it is treated as an empty array — all required keys are reported missing.
- Pairs naturally with context resolvers: use `ContextPolicy` to enforce that enrichment actually happened before persistence.

## Enabling policies

All built-in policies are commented out in `config/chronicle.php`. Uncomment any you want to activate:

```php
'extensions' => [
    // built-in validators...
    ActorPresenceValidator::class,
    // ...

    // Optional context resolvers — uncomment to enable:
    // \Chronicle\Context\EnvironmentContextResolver::class,
    // \Chronicle\Context\RequestContextResolver::class,

    // Optional policies — uncomment to enable:
    \Chronicle\Policy\OnlyAuthenticatedUsersPolicy::class,
    \Chronicle\Policy\AllowedActionsPolicy::class,
    \Chronicle\Policy\ForbiddenActionsPolicy::class,
    \Chronicle\Policy\RateLimitPolicy::class,
    \Chronicle\Policy\TimeWindowPolicy::class,
    \Chronicle\Policy\ContextPolicy::class,
],
```

You can also register policies at runtime:

```php
use Chronicle\Facades\Chronicle;

Chronicle::extendEntry(\Chronicle\Policy\AllowedActionsPolicy::class);
```

## Custom policies

Extend `AbstractPolicy` and implement `enforce()`. Throw a `PolicyViolationException` subclass to reject, return silently to allow.

```php
<?php

namespace App\Chronicle;

use Chronicle\Entry\PendingEntry;
use Chronicle\Exceptions\PolicyViolationException;
use Chronicle\Policy\AbstractPolicy;

final class TenantQuotaPolicy extends AbstractPolicy
{
    public function __construct(private readonly TenantQuotaService $quotas) {}

    public function enforce(PendingEntry $entry): void
    {
        /** @var string $tenantId */
        $tenantId = data_get($entry->attribute('context'), 'tenant.id');

        if ($this->quotas->isExceeded($tenantId)) {
            throw new PolicyViolationException(
                "Chronicle entry rejected: tenant [{$tenantId}] has exceeded its audit quota."
            );
        }
    }
}
```

Register it in `config/chronicle.php` or at runtime:

```php
'extensions' => [
    \App\Chronicle\TenantQuotaPolicy::class,
],
```

### Policy contract

```php
use Chronicle\Policy\AbstractPolicy;
use Chronicle\Entry\PendingEntry;

abstract class AbstractPolicy implements EntryExtension, EntryPolicy
{
    // Always runs in the POLICY stage (priority 300).
    final public function stage(): ExtensionStage { ... }

    // Calls enforce(), returns entry unmodified.
    final public function process(PendingEntry $entry): PendingEntry { ... }

    // You implement this:
    abstract public function enforce(PendingEntry $entry): void;
}
```

`stage()` and `process()` are sealed — concrete policies only implement `enforce()`. This prevents accidentally running in the wrong stage or bypassing the enforcement contract.

Services required by a policy (cache, config, external APIs) are injected via the constructor.

### Ordering

Within the `POLICY` stage, ordering follows the standard extension rules:

1. Priority (implement `PrioritizedEntryExtension` for explicit control)
2. Class name (alphabetical)
3. Registration order

For most applications, ordering between policies matters only when both `AllowedActionsPolicy` and `ForbiddenActionsPolicy` are active — but since both throw on rejection, order affects only which exception the caller sees first, not whether the entry is rejected.
