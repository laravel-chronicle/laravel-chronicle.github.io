---
title: S3 Object Lock Adapter
---

# S3 Object Lock Adapter

`laravel-chronicle/anchor-s3` is an [external anchor](./anchoring.md) that writes each checkpoint's digest - `sha256(id . chain_hash . created_at)` - to a **locked, versioned** S3 object. Because the object is write-once (WORM), even an attacker who rewrites the ledger and re-signs every checkpoint with a valid key cannot alter the locked object, so `chronicle:verify --anchors` fails on the tampered checkpoint.

See [External Anchoring](./anchoring.md#the-anchored-value) for what the digest binds and why it cannot be replayed onto another checkpoint.

## Requirements

- PHP 8.2+
- `laravel-chronicle/core` ^1.11
- `aws/aws-sdk-php` ^3.0

```bash
composer require laravel-chronicle/anchor-s3
```

The package auto-registers `AnchorS3ServiceProvider`, which binds a default `Aws\S3\S3Client` from `AWS_DEFAULT_REGION` and standard AWS credentials. Its own config (`chronicle-anchor-s3.php`) holds only the region; bucket, mode, and retention come from the provider entry below.

## Bucket setup (one-time)

Object Lock can only be enabled **at bucket creation** and requires versioning:

```bash
aws s3api create-bucket \
  --bucket my-chronicle-anchors \
  --object-lock-enabled-for-bucket \
  --region eu-west-1 \
  --create-bucket-configuration LocationConstraint=eu-west-1

# Optional default retention; per-object retain-until still applies.
aws s3api put-object-lock-configuration \
  --bucket my-chronicle-anchors \
  --object-lock-configuration '{"ObjectLockEnabled":"Enabled","Rule":{"DefaultRetention":{"Mode":"COMPLIANCE","Days":3650}}}'
```

- **`COMPLIANCE`** (default) - no one, including the root account, can delete or shorten retention until it expires. Use for regulated / SOC 2 profiles.
- **`GOVERNANCE`** - principals with `s3:BypassGovernanceRetention` can override the lock.

## Registration

Enable anchoring and register the provider in `config/chronicle.php`:

```php
'anchoring' => [
    'enabled' => true,
    'providers' => [
        's3-object-lock' => [
            'provider'    => \Chronicle\AnchorS3\S3ObjectLockAnchor::class,
            'bucket'      => env('CHRONICLE_S3_ANCHOR_BUCKET'),
            'prefix'      => 'chronicle/anchors', // optional (default 'chronicle/anchors')
            'mode'        => 'COMPLIANCE',         // or 'GOVERNANCE'
            'retain_days' => 3650,                 // optional
        ],
    ],
],
```

New checkpoints are then anchored automatically on the queue, or on demand with `chronicle:checkpoint --anchor`. Retry outstanding anchors with `chronicle:anchor:retry`.

## Required IAM actions

On the anchor bucket (object ARN `arn:aws:s3:::my-chronicle-anchors/*` and the bucket ARN):

| Action                  | Used by    | Why                                    |
|-------------------------|------------|----------------------------------------|
| `s3:PutObject`          | `anchor()` | Write the digest object                |
| `s3:PutObjectRetention` | `anchor()` | Apply per-object Object Lock retention |
| `s3:GetObject`          | `verify()` | Re-read the object                     |
| `s3:GetObjectVersion`   | `verify()` | Read the exact `VersionId`             |
| `s3:GetObjectRetention` | `verify()` | Confirm lock metadata is present       |

Grant **no** `s3:DeleteObject*` - anchors are write-once by design.

## How it works

- `anchor()` -> `PutObject` of the digest with `ObjectLockMode` and `ObjectLockRetainUntilDate`. The receipt records `reference = "bucket/key@versionId"` and `proof = ETag`.
- `verify()` -> `GetObject` of that exact version; it passes only if the stored bytes equal the recomputed digest, the lock metadata is present, **and** the ETag matches.

Unlike the core RFC 3161 anchor, `verify()` makes **one S3 read** - it is *not* offline. That is the deliberate trade for an independent, account-isolated trust domain. A checkpoint whose object no longer attests its current digest is reported as `anchor_invalid`, never silently passed.

## Verifying

```bash
php artisan chronicle:verify --checkpoints-only --anchors
php artisan chronicle:anchor:verify
```

## See also

- [External Anchoring](./anchoring.md) - the anchoring pipeline, digest, and commands
- [Scalable Verification](./scalable-verification.md#--anchors) - the `--anchors` pass
- [Security Model](./security-model.md#external-anchoring-and-full-internal-compromise) - how anchoring defeats a full internal compromise
- [Checkpoints](./checkpoints.md) - the signed boundaries anchoring attests
