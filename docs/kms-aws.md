---
title: AWS KMS Adapter
---

# AWS KMS Adapter

`laravel-chronicle/kms-aws` integrates Chronicle with AWS KMS in two ways:

- **`Chronicle\KmsAws\AwsKmsSigningProvider`** - sign checkpoints and exports with an ECDSA P-256 KMS key. The private key never leaves KMS; verification is **offline** against a cached public key.
- **`Chronicle\KmsAws\KmsKeyEncryptionProvider`** - hold the crypto-shredding Key Encryption Key (KEK) in KMS, so wrapped per-subject DEKs are protected outside the application.

## Requirements

- PHP 8.2+, `ext-openssl`
- `laravel-chronicle/core` ^1.10
- `aws/aws-sdk-php` ^3.0

```bash
composer require laravel-chronicle/kms-aws
```

The package auto-discovers `KmsAwsServiceProvider`, which binds a default `Aws\Kms\KmsClient` from `AWS_DEFAULT_REGION` and standard AWS credentials. Its own config (`chronicle-kms.php`) holds only the region.

## Signing with KMS

### Create the KMS key

Create an **asymmetric** key with key spec **ECC_NIST_P256** and key usage **SIGN_VERIFY** - this matches the `ecdsa-p256` algorithm Chronicle records in every artifact.

### Retrieve and cache the public key

Fetch the public key once and store it (PEM) in config. It is used for offline verification and never fetched from KMS at runtime:

```bash
aws kms get-public-key \
  --key-id arn:aws:kms:REGION:ACCOUNT_ID:key/KEY_ID \
  --query 'PublicKey' --output text | base64 -d | \
  openssl pkey -pubin -inform DER -outform PEM
```

### Configure

Register it as a key in the [key ring](./signing-and-keys.md):

```php
use Chronicle\KmsAws\AwsKmsSigningProvider;

'signing' => [
    'active' => env('CHRONICLE_ACTIVE_KEY', 'kms-production'),
    'keys' => [
        'kms-production' => [
            'provider'   => AwsKmsSigningProvider::class,
            'algorithm'  => 'ecdsa-p256',
            'key_arn'    => env('CHRONICLE_KMS_KEY_ARN'),
            'public_key' => env('CHRONICLE_KMS_PUBLIC_KEY'),  // PEM string
        ],
    ],
],
```

Set `AWS_DEFAULT_REGION`, `CHRONICLE_KMS_KEY_ARN`, and `CHRONICLE_KMS_PUBLIC_KEY` (the PEM from the command above) in your environment.

### IAM for signing

```json
{
  "Effect": "Allow",
  "Action": ["kms:Sign", "kms:DescribeKey"],
  "Resource": "arn:aws:kms:REGION:ACCOUNT_ID:key/KEY_ID"
}
```

`kms:GetPublicKey` is **not** required at runtime - the public key is cached in config.

### How it works

| Operation   | Where it runs                                                  |
|-------------|----------------------------------------------------------------|
| `sign()`    | **Remote** - KMS `Sign` API with `MessageType: DIGEST`         |
| `verify()`  | **Local** - `openssl_verify` against the cached PEM public key |

### Rotation

KMS keys rotate through the standard [key-ring workflow](./signing-and-keys.md#key-rotation): add the new KMS key as `active` and create the boundary checkpoint with `chronicle:key:rotate`.

:::warning
`AwsKmsSigningProvider` requires `key_arn` and **cannot** be a verify-only key. To retire a KMS key, switch its ring entry to core's `Chronicle\Signing\EcdsaSigningProvider` with only `public_key` set - that handles local verify-only mode. Keep the retired public key forever so historical artifacts stay verifiable.
:::

## KEK encryption (crypto-shredding)

Chronicle v1.12 encrypts PII payload fields under a per-subject DEK and wraps those DEKs under a Key Encryption Key. This package can hold that KEK in KMS. Point `chronicle.encryption.kek` at the provider:

```php
use Chronicle\KmsAws\KmsKeyEncryptionProvider;

'encryption' => [
    'enabled' => true,
    'kek' => [
        'provider' => KmsKeyEncryptionProvider::class,
        'key' => env('CHRONICLE_KMS_KEK_ARN'),  // KMS key for Encrypt/Decrypt
        'id'  => env('CHRONICLE_KMS_KEK_ID'),    // kekId recorded per subject key
    ],
],
```

Required IAM actions on the KEK: `kms:Encrypt`, `kms:Decrypt`. The `KmsClient` is resolved from the container, so no extra wiring is needed beyond installing this package.

## See also

- [Custom Signing Providers](./custom-signing-providers.md) - the `SigningProvider` contract and `LocalVerifyProvider`
- [Signing & Keys](./signing-and-keys.md) - key ring, generation, and rotation
- [Crypto-Shredding](./crypto-shredding.md) - the KEK/DEK model the KEK provider plugs into
- [Security Model](./security-model.md) - what signing and rotation guarantee
