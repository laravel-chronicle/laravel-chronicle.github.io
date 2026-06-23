---
title: Signing and Keys
---

# Signing and Keys

Chronicle signs checkpoints and export packages with a configurable signing provider. Signatures make tampering detectable: any checkpoint or export produced under an untouched key can be independently re-verified, even years later.

## The key ring

Since v1.10, Chronicle manages signing through a **key ring**: a named collection of keys where one key is *active* (used to sign new artifacts) and any number of retired keys are retained for offline verification.

```php
// config/chronicle.php
'signing' => [
    'enforce_on_boot' => env('CHRONICLE_SIGNING_ENFORCE_ON_BOOT', false),
    'active'          => env('CHRONICLE_ACTIVE_KEY', 'chronicle-dev-key'),
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

| Config key                     | Env var                             | Description                                                                                             |
|--------------------------------|-------------------------------------|---------------------------------------------------------------------------------------------------------|
| `signing.active`               | `CHRONICLE_ACTIVE_KEY`              | ID of the key used to sign new checkpoints and exports. Must match a key in `signing.keys`.             |
| `signing.enforce_on_boot`      | `CHRONICLE_SIGNING_ENFORCE_ON_BOOT` | When `true`, Chronicle throws at boot if the active key is misconfigured. Retired keys are not checked. |
| `signing.keys[id].provider`    | -                                   | Class implementing `Chronicle\Contracts\SigningProvider`.                                               |
| `signing.keys[id].algorithm`   | -                                   | Stable identifier stored in artifacts (e.g. `'ed25519'`, `'ecdsa-p256'`).                               |
| `signing.keys[id].private_key` | -                                   | Base64-encoded private key. Omit or set to `null` to create a verify-only retired key.                  |
| `signing.keys[id].public_key`  | -                                   | Base64-encoded public key. Required for all keys including retired ones.                                |

## Generating a keypair

Use the built-in Artisan command to generate an Ed25519 keypair:

```bash
php artisan chronicle:key:generate --id=my-key
```

This prints the base64-encoded keys and a ready-to-paste `signing.keys` entry. The private key is never written to disk or any environment file - you copy it into your secret manager manually.

See [chronicle:key:generate](./artisan-commands.md) for the full command reference.

## Key format

With the default `Ed25519SigningProvider`:

| Key           | Required length after base64 decode            |
|---------------|------------------------------------------------|
| `private_key` | 64 bytes (`SODIUM_CRYPTO_SIGN_SECRETKEYBYTES`) |
| `public_key`  | 32 bytes (`SODIUM_CRYPTO_SIGN_PUBLICKEYBYTES`) |

With `EcdsaSigningProvider` (ECDSA P-256), `private_key` and `public_key` are PEM strings, not base64-encoded binary.

## Boot-time enforcement

When `enforce_on_boot` is `true`, Chronicle validates the active key during service provider boot and throws a `RuntimeException` if it is missing or misconfigured. Retired keys in the ring without a `private_key` do not trigger this check - only the active key is validated.

The check is silenced automatically in the `testing` environment.

## Key rotation

Key rotation replaces the active signing key for new artifacts without losing the ability to verify existing checkpoints and exports signed by the old key. The old key's `public_key` must remain in the ring indefinitely - it is the only material that can verify artifacts already signed with it.

### Step-by-step rotation workflow

**1. Generate the new keypair**

```bash
php artisan chronicle:key:generate --id=my-key-2026
```

Copy the printed `signing.keys` entry into `config/chronicle.php` alongside the existing key:

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
        'my-key-2026' => [
            'provider'    => \Chronicle\Signing\Ed25519SigningProvider::class,
            'algorithm'   => 'ed25519',
            'private_key' => env('CHRONICLE_NEW_PRIVATE_KEY'),
            'public_key'  => env('CHRONICLE_NEW_PUBLIC_KEY'),
        ],
    ],
],
```

Store the new private key in your secret manager and set `CHRONICLE_NEW_PRIVATE_KEY` and `CHRONICLE_NEW_PUBLIC_KEY` accordingly. Deploy this config change. The active key has not changed yet.

**2. Create the boundary checkpoint**

```bash
php artisan chronicle:key:rotate my-key-2026
```

This command validates that `my-key-2026` exists in the ring and has signing material, creates a signed checkpoint under the current active key (anchoring the ledger head as the boundary), then prints the next instruction:

```
CHRONICLE_ACTIVE_KEY=my-key-2026
```

**3. Activate the new key**

Set `CHRONICLE_ACTIVE_KEY=my-key-2026` in your secrets manager and deploy. New checkpoints and exports are signed with `my-key-2026` from this point forward.

**4. Verify**

```bash
php artisan chronicle:verify
php artisan chronicle:key:list
```

The full ledger - entries and checkpoints from both before and after the rotation - should verify cleanly.

### Retain old public keys forever

:::warning
**Never remove a retired key's `public_key` from `signing.keys`.**

Chronicle uses the public key to verify every artifact ever signed by that key. Removing it makes those artifacts permanently unverifiable.

To signal that a key has been retired (no new signing), remove only the `private_key` field from its config entry and keep the `public_key`.
:::

Example two-key ring after rotation:

```php
'signing' => [
    'active' => env('CHRONICLE_ACTIVE_KEY', 'my-key-2026'),
    'keys' => [
        // Retired - private key removed, public key retained for verification
        'chronicle-dev-key' => [
            'provider'   => \Chronicle\Signing\Ed25519SigningProvider::class,
            'algorithm'  => 'ed25519',
            'public_key' => env('CHRONICLE_OLD_PUBLIC_KEY'),
        ],
        // Active
        'my-key-2026' => [
            'provider'    => \Chronicle\Signing\Ed25519SigningProvider::class,
            'algorithm'   => 'ed25519',
            'private_key' => env('CHRONICLE_NEW_PRIVATE_KEY'),
            'public_key'  => env('CHRONICLE_NEW_PUBLIC_KEY'),
        ],
    ],
],
```

## Verify-only keys

A key without a `private_key` config entry is verify-only. Chronicle can use it to verify old artifacts but not to sign new ones. `chronicle:key:list` marks these keys as `verify-only`. `chronicle:key:rotate` refuses to rotate to a verify-only target with an actionable error.

## Inspecting the key ring

```bash
php artisan chronicle:key:list
```

Shows all keys with their ID, algorithm, provider, and active/verify-only status.

```bash
php artisan chronicle:key:list --with-counts
```

Adds a per-key checkpoint count column.

## See also

- [Artisan Commands](./artisan-commands.md) - `chronicle:key:generate`, `chronicle:key:list`, `chronicle:key:rotate` references
- [Custom Signing Providers](./custom-signing-providers.md) - implementing KMS, Vault, or other backends
- [Security Model](./security-model.md) - what rotation does and does not guarantee
- [Checkpoints](./checkpoints.md) - what gets signed at checkpoint time
