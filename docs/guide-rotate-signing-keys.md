---
title: Rotate Signing Keys
---

# Rotate Signing Keys

Replace the active signing key without losing the ability to verify existing checkpoints and exports created under the old key.

## Before you start

Confirm the ledger is clean before rotating:

```bash
php artisan chronicle:verify
```

Fix any failures before continuing. Rotation on a broken chain will not repair it.

## 1. Generate the new keypair

```bash
php artisan chronicle:key:generate --id=my-key-2026
```

The command prints a base64-encoded private key, a public key, and a ready-to-paste `signing.keys` config entry. Store the private key in your secret manager immediately — it is not saved anywhere by the command.

## 2. Add the new key to `signing.keys` (without activating it)

Copy the printed entry into `config/chronicle.php`. Keep the old key exactly as-is — do not remove it yet:

```php
'signing' => [
    'active' => env('CHRONICLE_ACTIVE_KEY', 'chronicle-dev-key'),
    'keys' => [
        // Existing key stays unchanged
        'chronicle-dev-key' => [
            'provider'    => \Chronicle\Signing\Ed25519SigningProvider::class,
            'algorithm'   => 'ed25519',
            'private_key' => env('CHRONICLE_PRIVATE_KEY'),
            'public_key'  => env('CHRONICLE_PUBLIC_KEY'),
        ],
        // New key added — not yet active
        'my-key-2026' => [
            'provider'    => \Chronicle\Signing\Ed25519SigningProvider::class,
            'algorithm'   => 'ed25519',
            'private_key' => env('CHRONICLE_NEW_PRIVATE_KEY'),
            'public_key'  => env('CHRONICLE_NEW_PUBLIC_KEY'),
        ],
    ],
],
```

Set `CHRONICLE_NEW_PRIVATE_KEY` and `CHRONICLE_NEW_PUBLIC_KEY` in your secrets manager and deploy this config change. The active key has not changed — this deploy is safe.

## 3. Create the boundary checkpoint and get the activation instruction

```bash
php artisan chronicle:key:rotate my-key-2026
```

Output:

```
Creating boundary checkpoint before rotation...
✓ Boundary checkpoint created
  ID:        01JXX...
  Algorithm: ed25519
  Key:       chronicle-dev-key

Rotation ready. To activate my-key-2026, update your environment:

  CHRONICLE_ACTIVE_KEY=my-key-2026

After deploying the updated environment:
  php artisan chronicle:key:list
  php artisan chronicle:verify
```

The checkpoint anchors the current ledger head under the old key. All future checkpoints and exports will be signed by `my-key-2026`.

## 4. Activate the new key

Set `CHRONICLE_ACTIVE_KEY=my-key-2026` in your secrets manager and deploy.

## 5. Verify the full ledger

```bash
php artisan chronicle:verify
php artisan chronicle:key:list
```

The full ledger — including checkpoints created before rotation under `chronicle-dev-key` — should verify cleanly because the old public key is still in the ring.

## 6. Retire the old private key

Once you have confirmed integrity, remove `private_key` from the old key's config entry:

```php
// Retired — private key removed, public key retained for historic verification
'chronicle-dev-key' => [
    'provider'   => \Chronicle\Signing\Ed25519SigningProvider::class,
    'algorithm'  => 'ed25519',
    'public_key' => env('CHRONICLE_OLD_PUBLIC_KEY'),
    // no private_key
],
```

:::warning
**Keep `public_key` in the ring forever.** Removing it makes any artifact signed by that key permanently unverifiable.
:::

## See also

- [Signing & Keys](./signing-and-keys.md) — key ring config and verification behaviour
- [Artisan Commands](./artisan-commands.md) — full `chronicle:key:*` reference
- [Checkpoints](./checkpoints.md) — what the boundary checkpoint stores
- [Security Model](./security-model.md) — what rotation does and does not guarantee
