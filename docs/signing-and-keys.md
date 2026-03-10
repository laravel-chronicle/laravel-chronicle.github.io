---
title: Signing and Keys
---

# Signing and Keys

Chronicle uses a signing provider for:

- checkpoints
- export signatures
- verification of those signatures

## Default provider

The default implementation is:

```php
\Chronicle\Signing\Ed25519SigningProvider::class
```

It expects base64-encoded Ed25519 keys in the environment.

## Required config

```php
'signing' => [
    'provider' => \Chronicle\Signing\Ed25519SigningProvider::class,
    'key_id' => env('CHRONICLE_KEY_ID', 'chronicle-dev-key'),
    'private_key' => env('CHRONICLE_PRIVATE_KEY'),
    'public_key' => env('CHRONICLE_PUBLIC_KEY'),
    'enforce_on_boot' => env('CHRONICLE_SIGNING_ENFORCE_ON_BOOT', false),
],
```

## Key format

With the default provider:

- the private key must decode to 64 bytes
- the public key must decode to 32 bytes

Invalid or missing keys will cause provider construction to fail.

## Generating a keypair

```bash
php -r '$kp=sodium_crypto_sign_keypair(); echo "CHRONICLE_PRIVATE_KEY=".base64_encode(sodium_crypto_sign_secretkey($kp)).PHP_EOL; echo "CHRONICLE_PUBLIC_KEY=".base64_encode(sodium_crypto_sign_publickey($kp)).PHP_EOL;'
```

## Boot-time enforcement

If you set:

```env
CHRONICLE_SIGNING_ENFORCE_ON_BOOT=true
```

Chronicle will fail application boot when signing is misconfigured, except in the `testing` environment.

This is useful in production once key management is in place.

## Custom signing providers

You can replace the default provider by configuring a class that implements `Chronicle\Contracts\SigningProvider`.

The contract requires:

- `sign(string $payload): string`
- `verify(string $payload, string $signature): bool`
- `algorithm(): string`
- `keyId(): ?string`

This makes it possible to integrate:

- KMS-backed signing
- HSM-backed signing
- alternative asymmetric algorithms

## Operational guidance

- keep private keys out of source control
- use a stable `key_id` to support verification and rotation workflows
- make public keys available to any external verifier
- treat signing keys as part of your audit infrastructure, not app trivia
