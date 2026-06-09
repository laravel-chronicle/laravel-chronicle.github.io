---
sidebar_position: 4
title: Config Reference
---

# Config Reference

Chronicle publishes its configuration to `config/chronicle.php`.

## `driver`

Selects the storage driver Chronicle uses to persist entries.

```php
'driver' => env('CHRONICLE_DRIVER', 'eloquent'),
```

Built-in drivers:

- `eloquent` / `database`: synchronous write via Laravel's database layer (default)
- `queued`: asynchronous write via a dedicated queue worker
- `array`: in-memory storage for tests
- `null`: discards entries, useful for tests or local development

See [Storage Drivers](./storage-drivers.md) for full details on each driver.

## `connection`

Controls which Laravel database connection Chronicle uses for its tables.

```php
'connection' => env('CHRONICLE_DB_CONNECTION'),
```

Set this when you want the audit ledger isolated from your main application database.

## `queue`

Used when `driver = 'queued'`. Chronicle chain hashes are order-sensitive, so this queue **must** be processed by a single worker:

```bash
php artisan queue:work --queue=chronicle --tries=1
```

Running multiple workers on this queue will produce chain forks.

```php
'queue' => [
    'connection' => env('CHRONICLE_QUEUE_CONNECTION'),
    'name'       => env('CHRONICLE_QUEUE', 'chronicle'),
],
```

| Key | Env var | Default | Description |
|-----|---------|---------|-------------|
| `connection` | `CHRONICLE_QUEUE_CONNECTION` | `null` (default queue connection) | Laravel queue connection to use |
| `name` | `CHRONICLE_QUEUE` | `chronicle` | Queue name for Chronicle jobs |

## `prune`

Used by `chronicle:prune`. Controls how old entries are retained.

```php
'prune' => [
    'default_retention_days' => env('CHRONICLE_RETENTION_DAYS'),
    'respect_checkpoints'    => true,
],
```

| Key | Default | Description |
|-----|---------|-------------|
| `default_retention_days` | `null` (disabled) | Entries older than this many days are eligible for pruning |
| `respect_checkpoints` | `true` | Entries anchored to a checkpoint are protected unless `--force` is passed |

Set `default_retention_days` to `null` to disable time-based pruning entirely.

## `tables.entries`

Overrides the table used by `Chronicle\Entry\Entry`.

```php
'tables' => [
    'entries' => env('CHRONICLE_TABLE_ENTRIES', 'chronicle_entries'),
    'checkpoints' => env('CHRONICLE_TABLE_CHECKPOINTS', 'chronicle_checkpoints'),
    'checkpoint_anchors' => env('CHRONICLE_TABLE_CHECKPOINT_ANCHORS', 'chronicle_checkpoint_anchors'),
    'verification_runs' => env('CHRONICLE_TABLE_VERIFICATION_RUNS', 'chronicle_verification_runs'),
],
```

Change this before running migrations if the default table name conflicts with your schema.

## `tables.checkpoints`

Overrides the table used for signed checkpoints.

This table stores the checkpoint chain head, entry count, signature metadata, and creation timestamp used to anchor the ledger state at a known moment in time.

## `signing.active`

The key ID used to sign new checkpoints and exports. Must match a key defined in `signing.keys`.

```php
'signing' => [
    'active' => env('CHRONICLE_ACTIVE_KEY', 'chronicle-dev-key'),
],
```

## `signing.enforce_on_boot`

When `true`, Chronicle throws a `RuntimeException` at boot if the active key is missing or misconfigured. Only the active key is validated — retired verify-only keys in the ring are not checked.

```php
'enforce_on_boot' => env('CHRONICLE_SIGNING_ENFORCE_ON_BOOT', false),
```

Silenced automatically in the `testing` environment.

## `signing.keys`

The full key ring. Each entry is a named key with its provider class, algorithm, and key material.

```php
'signing' => [
    'active' => env('CHRONICLE_ACTIVE_KEY', 'chronicle-dev-key'),
    'keys' => [
        'chronicle-dev-key' => [
            'provider'    => \Chronicle\Signing\Ed25519SigningProvider::class,
            'algorithm'   => 'ed25519',
            'private_key' => env('CHRONICLE_PRIVATE_KEY'),
            'public_key'  => env('CHRONICLE_PUBLIC_KEY'),
        ],
    ],
],
```

| Key entry field | Description |
|---|---|
| `provider` | Class implementing `Chronicle\Contracts\SigningProvider`. |
| `algorithm` | Stable identifier stored in artifacts (e.g. `'ed25519'`, `'ecdsa-p256'`). |
| `private_key` | Signing key material. Omit or set to `null` to create a verify-only retired key. |
| `public_key` | Verification key material. Required for all keys including retired ones. |

Retired keys (keys without `private_key`) must remain in `signing.keys` permanently so that historic checkpoints and exports can continue to be verified.

See [Signing & Keys](./signing-and-keys.md) for the full key ring documentation and rotation workflow.

## `anchoring`

External anchoring of checkpoints. Opt-in; off by default. See [External Anchoring](./anchoring.md).

```php
'anchoring' => [
    'enabled' => env('CHRONICLE_ANCHORING_ENABLED', false),
    'queue' => env('CHRONICLE_ANCHORING_QUEUE'),
    'providers' => [
        // 'rfc3161' => [
        //     'provider' => \Chronicle\Anchoring\Rfc3161TimestampAnchor::class,
        //     'tsa_url' => env('CHRONICLE_TSA_URL'),
        //     'tsa_certificate' => env('CHRONICLE_TSA_CERTIFICATE'),
        // ],
    ],
],
```

| Key | Env | Default | Meaning |
|---|---|---|---|
| `anchoring.enabled` | `CHRONICLE_ANCHORING_ENABLED` | `false` | Anchor each new checkpoint after commit |
| `anchoring.queue` | `CHRONICLE_ANCHORING_QUEUE` | `null` | Queue for the anchoring job (null = default) |
| `anchoring.providers` | — | `[]` | `name => ['provider' => class, ...config]` |

When `enabled`, each new checkpoint is anchored asynchronously with every configured provider after the checkpoint transaction commits. An anchor failure never rolls a checkpoint back.

## `validation`

Controls the configurable limits enforced by Chronicle's built-in validators.

```php
'validation' => [
    'action_max_length'         => env('CHRONICLE_ACTION_MAX_LENGTH', 255),
    'tag_max_length'            => env('CHRONICLE_TAG_MAX_LENGTH', 50),
    'tag_limit'                 => env('CHRONICLE_TAG_LIMIT', 10),
    'correlation_id_max_length' => env('CHRONICLE_CORRELATION_ID_MAX_LENGTH', 255),
    'max_payload_size'          => env('CHRONICLE_MAX_PAYLOAD_SIZE', 65536),
],
```

| Key | Default | Description |
|-----|---------|-------------|
| `action_max_length` | `255` | Maximum byte length of the `action` string |
| `tag_max_length` | `50` | Maximum UTF-8 character length of a single tag |
| `tag_limit` | `10` | Maximum number of tags per entry |
| `correlation_id_max_length` | `255` | Maximum UTF-8 character length of a `correlation_id` |
| `max_payload_size` | `65536` | Maximum byte size of the combined serialized `metadata`, `context`, and `diff` (64 KB) |

See [Validation](./validation) for a full description of each built-in validator.

## `extensions`

Registers entry extensions that run before Chronicle's built-in pipeline stages.

```php
'extensions' => [
    ActorPresenceValidator::class,
    SubjectValidator::class,
    ActionValidator::class,
    CorrelationValidator::class,
    TagLimitValidator::class,
    TagsValidator::class,
    DiffStructureValidator::class,
    PayloadSerializableValidator::class,
    PayloadSizeValidator::class,
],
```

The default set contains Chronicle's built-in validators. Each extension must implement `Chronicle\Contracts\EntryExtension`. Extensions are executed before canonicalization, payload hashing, chain hashing, and persistence.

Remove a built-in validator from this array to disable it. Add your own classes to extend or replace validation logic.

## `ui`

Chronicle ships an optional read-only Blade interface. It is disabled by default.

```php
'ui' => [
    'enabled'    => env('CHRONICLE_UI_ENABLED', false),
    'prefix'     => env('CHRONICLE_UI_PREFIX', 'chronicle'),
    'middleware' => ['web', 'auth', 'can:view-chronicle'],
    'per_page'   => env('CHRONICLE_UI_PER_PAGE', 25),
],
```

| Key | Env var | Default | Description |
|-----|---------|---------|-------------|
| `enabled` | `CHRONICLE_UI_ENABLED` | `false` | Set to `true` to activate the web interface |
| `prefix` | `CHRONICLE_UI_PREFIX` | `chronicle` | URL prefix for UI routes |
| `middleware` | *(PHP array, no env var)* | `['web','auth','can:view-chronicle']` | Middleware stack applied to all UI routes |
| `per_page` | `CHRONICLE_UI_PER_PAGE` | `25` | Entries shown per page on the index |

The `can:view-chronicle` gate must be defined in your `AuthServiceProvider`:

```php
Gate::define('view-chronicle', fn ($user) => $user->isAdmin());
```

To allow any authenticated user, set `middleware` to `['web', 'auth']`.

Note: `middleware` is a plain PHP array and cannot be driven by an environment variable — arbitrary middleware class names require code-level configuration.

## Example production-oriented config

```php
return [
    'driver'     => env('CHRONICLE_DRIVER', 'eloquent'),
    'connection' => env('CHRONICLE_DB_CONNECTION', 'audit'),
    'tables' => [
        'entries'            => 'chronicle_entries',
        'checkpoints'        => 'chronicle_checkpoints',
        'checkpoint_anchors' => 'chronicle_checkpoint_anchors',
        'verification_runs'  => 'chronicle_verification_runs',
    ],
    'signing' => [
        'enforce_on_boot' => env('CHRONICLE_SIGNING_ENFORCE_ON_BOOT', true),
        'active'          => env('CHRONICLE_ACTIVE_KEY', 'main'),
        'keys' => [
            'main' => [
                'provider'    => \Chronicle\Signing\Ed25519SigningProvider::class,
                'algorithm'   => 'ed25519',
                'private_key' => env('CHRONICLE_PRIVATE_KEY'),
                'public_key'  => env('CHRONICLE_PUBLIC_KEY'),
            ],
        ],
    ],
    'anchoring' => [
        'enabled'   => env('CHRONICLE_ANCHORING_ENABLED', false),
        'queue'     => env('CHRONICLE_ANCHORING_QUEUE'),
        'providers' => [
            // 'rfc3161' => [
            //     'provider'        => \Chronicle\Anchoring\Rfc3161TimestampAnchor::class,
            //     'tsa_url'         => env('CHRONICLE_TSA_URL'),
            //     'tsa_certificate' => env('CHRONICLE_TSA_CERTIFICATE'),
            // ],
        ],
    ],
    'validation' => [
        'action_max_length'         => env('CHRONICLE_ACTION_MAX_LENGTH', 255),
        'tag_max_length'            => env('CHRONICLE_TAG_MAX_LENGTH', 50),
        'tag_limit'                 => env('CHRONICLE_TAG_LIMIT', 10),
        'correlation_id_max_length' => env('CHRONICLE_CORRELATION_ID_MAX_LENGTH', 255),
        'max_payload_size'          => env('CHRONICLE_MAX_PAYLOAD_SIZE', 65536),
    ],
    'extensions' => [
        \Chronicle\Validation\ActorPresenceValidator::class,
        \Chronicle\Validation\SubjectValidator::class,
        \Chronicle\Validation\ActionValidator::class,
        \Chronicle\Validation\CorrelationValidator::class,
        \Chronicle\Validation\TagLimitValidator::class,
        \Chronicle\Validation\TagsValidator::class,
        \Chronicle\Validation\DiffStructureValidator::class,
        \Chronicle\Validation\PayloadSerializableValidator::class,
        \Chronicle\Validation\PayloadSizeValidator::class,
    ],
];
```
