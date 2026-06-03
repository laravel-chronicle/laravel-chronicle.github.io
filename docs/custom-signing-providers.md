---
title: Custom Signing Providers
---

# Custom Signing Providers

Chronicle delegates all cryptographic signing to a `SigningProvider`. Replace the default Ed25519 implementation with a KMS-backed provider, an HSM, or any other signing infrastructure your security requirements demand.

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
| `sign(string $payload)` | Sign the payload and return the signature (base64 or raw, consistent with `verify`) |
| `verify(string $payload, string $signature)` | Return `true` if the signature is valid for the payload |
| `algorithm()` | Return a stable identifier (e.g. `'ed25519'`, `'rsa-pss-sha256'`, `'kms'`) |
| `keyId()` | Return the key identifier written into checkpoint/export artifacts, or `null` |

## KMS-style example

```php
use Chronicle\Contracts\SigningProvider;
use Aws\Kms\KmsClient;

class KmsSigningProvider implements SigningProvider
{
    public function __construct(
        private readonly KmsClient $kms,
        private readonly string $keyArn,
    ) {}

    public function sign(string $payload): string
    {
        $result = $this->kms->sign([
            'KeyId'            => $this->keyArn,
            'Message'          => $payload,
            'MessageType'      => 'RAW',
            'SigningAlgorithm' => 'ECDSA_SHA_256',
        ]);

        return base64_encode($result->get('Signature'));
    }

    public function verify(string $payload, string $signature): bool
    {
        try {
            $result = $this->kms->verify([
                'KeyId'            => $this->keyArn,
                'Message'          => $payload,
                'MessageType'      => 'RAW',
                'Signature'        => base64_decode($signature),
                'SigningAlgorithm' => 'ECDSA_SHA_256',
            ]);

            return (bool) $result->get('SignatureValid');
        } catch (\Throwable) {
            return false;
        }
    }

    public function algorithm(): string
    {
        return 'kms-ecdsa-sha256';
    }

    public function keyId(): ?string
    {
        return $this->keyArn;
    }
}
```

## Binding the provider

Set the class in `config/chronicle.php`:

```php
'signing' => [
    'provider' => App\Signing\KmsSigningProvider::class,
    // ...
],
```

Chronicle resolves the provider through the service container, so you can bind it with dependencies in a service provider:

```php
class AppServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        $this->app->bind(
            \Chronicle\Contracts\SigningProvider::class,
            fn () => new KmsSigningProvider(
                app(KmsClient::class),
                config('services.kms.chronicle_key_arn'),
            )
        );
    }
}
```

## Verification and key rotation caveat

Chronicle verification uses the **active** configured `SigningProvider` — it does not resolve historical providers by `key_id`. Checkpoint and export artifacts store `algorithm` and `key_id` metadata, but those values are informational: they tell a human which key was used, but Chronicle does not automatically load a matching provider for them.

**Consequence for key rotation:** before decommissioning a signing key, re-verify or re-sign any existing checkpoint and export artifacts that were created under it. Once the old provider is removed from config, those artifacts cannot be re-verified by `chronicle:verify` or `chronicle:verify-export`.

## See also

- [Signing & Keys](./signing-and-keys.md) — key generation, built-in Ed25519 provider, key rotation workflow
- [Checkpoints](./checkpoints.md) — what gets signed at checkpoint time
- [Export Format](./export-format.md) — `signature.json` structure
