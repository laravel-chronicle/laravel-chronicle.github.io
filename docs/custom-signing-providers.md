---
title: Custom Signing Providers
---

# Custom Signing Providers

Chronicle delegates all cryptographic signing to a `SigningProvider`. Implement the interface to integrate KMS-backed signing, an HSM, or any other signing infrastructure.

## The contract

```php
interface SigningProvider
{
    public function sign(string $payload): string;
    public function verify(string $payload, string $signature): bool;
    public function algorithm(): string;
    public function keyId(): ?string;
}
```

| Method | Description |
|---|---|
| `sign(string $payload)` | Sign the payload; return a base64-encoded signature consistent with `verify()` |
| `verify(string $payload, string $signature)` | Return `true` if the signature is valid for the payload |
| `algorithm()` | Stable identifier stored in every checkpoint and export artifact (e.g. `'ed25519'`, `'ecdsa-p256'`) |
| `keyId()` | Key identifier written into artifacts; Chronicle uses this together with `algorithm()` to route verification |

## Built-in providers

| Provider class | `algorithm()` | Key format | Notes |
|---|---|---|---|
| `Chronicle\Signing\Ed25519SigningProvider` | `'ed25519'` | Base64-encoded binary (64-byte private, 32-byte public) | Default. Requires `ext-sodium`. |
| `Chronicle\Signing\EcdsaSigningProvider` | `'ecdsa-p256'` | PEM strings | Built-in since v1.10. Requires `ext-openssl`. Verify-only if `private_key` is omitted. |

## Constructor convention: array config

Since v1.10, Chronicle constructs signing providers through the service container using `$container->makeWith($class, ['config' => $keyConfig])`. Every provider receives its ring config entry as a named `array $config` constructor parameter. Additional constructor dependencies (e.g. SDK clients) are resolved from the container automatically.

```php
use Chronicle\Contracts\SigningProvider;

class MyProvider implements SigningProvider
{
    public function __construct(
        private readonly array $config,       // injected by Chronicle with the key's config entry
        private readonly SomeClient $client,  // resolved from the container
    ) {}
}
```

Chronicle passes the full key config entry as `$config`, including `key_id`, `algorithm`, `provider`, and any custom keys you add (e.g. `key_arn`, `vault_path`).

## Remote-sign / local-verify with `LocalVerifyProvider`

For signing backends where the private key never leaves a remote service (AWS KMS, HashiCorp Vault, HSM), extend `LocalVerifyProvider` instead of implementing `SigningProvider` directly. It provides a `final verify()` that runs locally against a cached PEM public key, so verification never requires a network call.

```php
use Chronicle\Signing\LocalVerifyProvider;

class VaultSigningProvider extends LocalVerifyProvider
{
    public function __construct(
        private readonly array $config,
        private readonly VaultClient $vault,
    ) {}

    public function sign(string $payload): string
    {
        // Calls Vault to sign remotely; returns base64-encoded DER signature
        $result = $this->vault->sign(
            path: (string) ($this->config['vault_path'] ?? ''),
            payload: $payload,
        );

        return base64_encode($result->signature);
    }

    public function algorithm(): string
    {
        return 'ecdsa-p256';
    }

    public function keyId(): ?string
    {
        return isset($this->config['key_id']) ? (string) $this->config['key_id'] : null;
    }

    protected function cachedPublicKeyPem(): string
    {
        // PEM stored in config at deploy time — never fetched from Vault at runtime
        return (string) ($this->config['public_key'] ?? '');
    }
}
```

`LocalVerifyProvider::verify()` is `final` and dispatches on `algorithm()`. It currently supports `'ecdsa-p256'`.

## Registering a custom provider

Add the provider as a named entry under `signing.keys` in `config/chronicle.php`:

```php
'signing' => [
    'active' => env('CHRONICLE_ACTIVE_KEY', 'vault-key'),
    'keys' => [
        'vault-key' => [
            'provider'    => App\Signing\VaultSigningProvider::class,
            'algorithm'   => 'ecdsa-p256',
            'vault_path'  => env('CHRONICLE_VAULT_SIGNING_PATH'),
            'public_key'  => env('CHRONICLE_PUBLIC_KEY'),  // PEM string
        ],
    ],
],
```

If your provider's constructor needs a service from the container, bind it before Chronicle's provider boots. In `AppServiceProvider::register()`:

```php
$this->app->singleton(VaultClient::class, fn () => new VaultClient(
    address: config('vault.address'),
    token:   config('vault.token'),
));
```

`SigningProviderFactory` resolves it automatically alongside `$config`.

## AWS KMS adapter

The `laravel-chronicle/kms-aws` package provides `AwsKmsSigningProvider`, an ECDSA P-256 adapter that signs via the KMS `Sign` API (DIGEST mode) and verifies locally via `LocalVerifyProvider`.

Install it:

```bash
composer require laravel-chronicle/kms-aws
```

Register it in `config/chronicle.php`:

```php
use Chronicle\KmsAws\AwsKmsSigningProvider;

'signing' => [
    'active' => env('CHRONICLE_ACTIVE_KEY', 'kms-key'),
    'keys' => [
        'kms-key' => [
            'provider'   => AwsKmsSigningProvider::class,
            'algorithm'  => 'ecdsa-p256',
            'key_arn'    => env('CHRONICLE_KMS_KEY_ARN'),
            'public_key' => env('CHRONICLE_KMS_PUBLIC_KEY'),  // PEM from aws kms get-public-key
        ],
    ],
],
```

The private key never leaves AWS KMS. Verification is always offline — no AWS API call at verify time.

Required IAM actions on the KMS key: `kms:Sign`, `kms:DescribeKey`.

To retrieve the public key once and cache it:

```bash
aws kms get-public-key \
  --key-id arn:aws:kms:REGION:ACCOUNT:key/KEY_ID \
  --query 'PublicKey' --output text | base64 -d | \
  openssl pkey -pubin -inform DER -outform PEM
```

## Algorithm identifier conventions

Pick a stable, descriptive string. Chronicle writes it into every checkpoint and export artifact. The `KeyRing` uses `(algorithm, key_id)` to route verification to the correct provider — do not change an identifier once artifacts have been created under it.

| Identifier | Provider | Notes |
|---|---|---|
| `'ed25519'` | `Ed25519SigningProvider` | Default |
| `'ecdsa-p256'` | `EcdsaSigningProvider`, `AwsKmsSigningProvider` | NIST P-256 / secp256r1 |

## See also

- [Signing & Keys](./signing-and-keys.md) — key ring config, key generation, and rotation workflow
- [Security Model](./security-model.md) — what rotation does and does not guarantee
- [Checkpoints](./checkpoints.md) — what gets signed at checkpoint time
- [Export Format](./export-format.md) — `signature.json` structure
