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

- `eloquent`: writes to the database through Laravel's database layer
- `array`: in-memory storage for tests
- `null`: discards entries, useful for tests or local development

## `connection`

Controls which Laravel database connection Chronicle uses for its tables.

```php
'connection' => env('CHRONICLE_DB_CONNECTION'),
```

Set this when you want the audit ledger isolated from your main application database.

## `tables.entries`

Overrides the table used by `Chronicle\Models\Entry`.

```php
'tables' => [
    'entries' => env('CHRONICLE_TABLE_ENTRIES', 'chronicle_entries'),
    'checkpoints' => env('CHRONICLE_TABLE_CHECKPOINTS', 'chronicle_checkpoints'),
],
```

Change this before running migrations if the default table name conflicts with your schema.

## `tables.checkpoints`

Overrides the table used for signed checkpoints.

This table stores the checkpoint chain head, entry count, signature metadata, and creation timestamp used to anchor the ledger state at a known moment in time.

## `signing.provider`

Defines the signing provider class.

```php
'signing' => [
    'provider' => \Chronicle\Signing\Ed25519SigningProvider::class,
],
```

Custom providers must implement `Chronicle\Contracts\SigningProvider`.

## `signing.key_id`

An identifier written alongside checkpoint and export signatures.

```php
'key_id' => env('CHRONICLE_KEY_ID', 'chronicle-dev-key'),
```

Use a stable, descriptive value so external verifiers can map signatures to the correct public key.

## `signing.private_key`

The base64-encoded private key used to sign checkpoints and exports.

```php
'private_key' => env('CHRONICLE_PRIVATE_KEY'),
```

With the default Ed25519 provider this must decode to 64 bytes.

## `signing.public_key`

The base64-encoded public key used to verify signatures.

```php
'public_key' => env('CHRONICLE_PUBLIC_KEY'),
```

With the default Ed25519 provider this must decode to 32 bytes.

## `signing.enforce_on_boot`

Controls whether Chronicle should fail the application boot process if signing is misconfigured.

```php
'enforce_on_boot' => env('CHRONICLE_SIGNING_ENFORCE_ON_BOOT', false),
```

This is useful in production once your key management is in place. It is skipped automatically in the `testing` environment.

## `extensions`

Registers custom entry extensions that run before Chronicle's built-in pipeline stages.

```php
'extensions' => [],
```

Each extension must implement `Chronicle\Contracts\EntryExtension`. These are executed before canonicalization, payload hashing, chain hashing, and persistence, which makes them the right place for deterministic payload enrichment.

## Example production-oriented config

```php
return [
    'driver' => env('CHRONICLE_DRIVER', 'eloquent'),
    'connection' => env('CHRONICLE_DB_CONNECTION', 'audit'),
    'tables' => [
        'entries' => 'chronicle_entries',
        'checkpoints' => 'chronicle_checkpoints',
    ],
    'signing' => [
        'provider' => \Chronicle\Signing\Ed25519SigningProvider::class,
        'key_id' => env('CHRONICLE_KEY_ID', 'chronicle-main'),
        'private_key' => env('CHRONICLE_PRIVATE_KEY'),
        'public_key' => env('CHRONICLE_PUBLIC_KEY'),
        'enforce_on_boot' => env('CHRONICLE_SIGNING_ENFORCE_ON_BOOT', true),
    ],
    'extensions' => [],
];
```
