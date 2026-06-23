---
title: Extension Architecture
---

# Extension Architecture

Chronicle's extension system lets you inject behaviour into the entry pipeline before Chronicle canonicalizes, hashes, and persists an entry. All built-in validators, context resolvers, and policies are implemented as extensions using exactly the same API available to application code.

## Pipeline order

```text
Chronicle::record()->...->commit()
        ↓
RunExtensions          ← your extensions run here
        ↓
CanonicalizePayload
        ↓
HashPayload
        ↓
ChainHashEntry
        ↓
PersistEntry           ← EntryRecorded fires here (sync path only)
```

Extensions run **before** canonicalization. They can read and mutate the raw entry attributes. Once `CanonicalizePayload` runs, the payload is frozen into a deterministic JSON structure and hashed - mutations after that point have no effect.

## Extension stages

Extensions declare which stage they belong to via `stage(): ExtensionStage`. Chronicle runs all extensions in stage order, then by priority within a stage, then by class name, then by registration order.

```php
enum ExtensionStage: int
{
    case VALIDATE        = 100;
    case RESOLVE_CONTEXT = 200;
    case POLICY          = 300;
    case PROCESS         = 400;
}
```

| Stage             | Value  | Purpose                                          |
|-------------------|--------|--------------------------------------------------|
| `VALIDATE`        | 100    | Reject invalid entries early - throw to abort    |
| `RESOLVE_CONTEXT` | 200    | Enrich the `context` attribute with runtime data |
| `POLICY`          | 300    | Enforce business rules - throw to reject         |
| `PROCESS`         | 400    | General processing / enrichment                  |

## The `EntryExtension` contract

```php
interface EntryExtension
{
    public function stage(): ExtensionStage;
    public function process(PendingEntry $entry): PendingEntry;
}
```

`process()` receives the mutable `PendingEntry` and must return it (modified or unchanged). Throw any exception to abort the entry - a `ChronicleException` subclass is conventional for validation/policy rejections, which also triggers `EntryRejected`.

## Ordering within a stage: `PrioritizedEntryExtension`

For deterministic ordering within a stage, implement the optional `PrioritizedEntryExtension` contract:

```php
interface PrioritizedEntryExtension
{
    public function priority(): int; // lower values execute first
}
```

Extensions that do not implement this interface are treated as priority `0`. Ties within the same priority are resolved by class name (alphabetical), then registration order.

## Working with `PendingEntry`

`PendingEntry` holds the raw entry attributes while they pass through the pipeline:

```php
// Read an attribute
$action = $entry->attribute('action');           // returns mixed
$meta   = $entry->attribute('metadata', []);     // with default

// Write an attribute
$entry->setAttribute('metadata', array_merge(
    $entry->attribute('metadata', []),
    ['tenant_id' => $tenantId],
));
```

Available at extension time (before canonicalization):

- `id`, `actor_type`, `actor_id`, `action`, `subject_type`, `subject_id`
- `metadata`, `context`, `diff`, `tags`, `correlation_id`, `created_at`

`payload`, `payload_hash`, `chain_hash`, and `checkpoint_id` are set by later pipeline stages and are not available to extensions.

## Registration

### Via config (recommended)

Add the class name to `config/chronicle.php`:

```php
'extensions' => [
    // built-in validators...
    App\Chronicle\ResolveTenantContext::class,
    App\Chronicle\EnforceTenantPolicy::class,
],
```

Extensions are resolved through the service container, so constructor injection works normally.

### Via `Chronicle::extendEntry()`

Register at runtime from a service provider:

```php
use Chronicle\Facades\Chronicle;

Chronicle::extendEntry(new App\Chronicle\ResolveTenantContext);
Chronicle::extendEntry(App\Chronicle\EnforceTenantPolicy::class);
```

Both a class name string and a pre-built instance are accepted.

## Extension types

| What you want                   | How to implement                                              |
|---------------------------------|---------------------------------------------------------------|
| Reject invalid entries          | [Custom Validators](./custom-validators.md)                   |
| Attach runtime data             | [Custom Context Resolvers](./custom-context-resolvers.md)     |
| Enforce business rules          | [Custom Policies](./custom-policies.md)                       |
| Custom storage backend          | [Custom Storage Drivers](./custom-storage-drivers.md)         |
| Custom signing/crypto           | [Custom Signing Providers](./custom-signing-providers.md)     |
| Custom actor/subject resolution | [Custom Reference Resolvers](./custom-reference-resolvers.md) |
| React after persistence         | [Listening to Events](./listening-to-events.md)               |

## See also

- [Entry Extensions](./entry-extensions.md) - built-in extension registration details
- [Validation](./validation.md) - built-in validators
- [Policies](./policies.md) - built-in policies
- [Context Resolvers](./context-resolvers.md) - built-in context resolvers
