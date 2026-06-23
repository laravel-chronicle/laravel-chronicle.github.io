---
title: Custom Storage Drivers
---

# Custom Storage Drivers

Chronicle resolves persistence through a configurable `StorageDriver`. You can register a custom backend - an external audit service, an object store, a secondary database - without changing any Chronicle internals.

## The contract

```php
interface StorageDriver
{
    public function store(array $entry): Entry;
}
```

`store()` receives the fully-built, validated, canonicalized, and chain-hashed entry attributes and must:

1. Persist them
2. Return a hydrated `Chronicle\Entry\Entry` model that reflects **exactly** what was stored - no field may be silently altered

## Implementation

```php
use Chronicle\Contracts\StorageDriver;
use Chronicle\Entry\Entry;

class AuditServiceDriver implements StorageDriver
{
    public function __construct(
        private readonly AuditServiceClient $client,
    ) {}

    public function store(array $entry): Entry
    {
        // Persist to external service
        $this->client->send($entry);

        // Return a hydrated Entry model
        $model = new Entry;
        $model->forceFill($entry);
        $model->exists = true;

        return $model;
    }
}
```

## Registering a custom driver

Register via `Chronicle::extendDriver()` in a service provider:

```php
use Chronicle\Facades\Chronicle;

class AppServiceProvider extends ServiceProvider
{
    public function boot(): void
    {
        Chronicle::extendDriver('audit-service', function (): AuditServiceDriver {
            return new AuditServiceDriver(
                app(AuditServiceClient::class)
            );
        });
    }
}
```

Then select it in your environment:

```env
CHRONICLE_DRIVER=audit-service
```

## Registration constraints

**Reserved names** - these driver names cannot be registered or overridden:

- `eloquent`
- `database`
- `queued`
- `array`
- `null`

Attempting to register a reserved name throws `InvalidArgumentException`.

**Single registration** - each custom driver name can only be registered once. Registering the same name a second time throws `InvalidArgumentException`.

## Statelessness requirement

Drivers must be stateless. Each `store()` call is independent - do not accumulate state between calls. Chronicle may construct or resolve the driver multiple times during a request lifetime, and in a queued setup the driver runs inside a separate job process.

## See also

- [Extension Architecture](./extending-chronicle.md) - the broader extension system
- [Storage Drivers](./storage-drivers.md) - built-in drivers and their constraints
- [Config Reference](./config-reference.md) - `driver` and `connection` config keys
