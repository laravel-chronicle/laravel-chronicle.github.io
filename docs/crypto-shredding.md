---
title: Crypto-Shredding & Encryption
---

# Crypto-Shredding & Encryption

Chronicle v1.12 can encrypt the PII-bearing fields of each audit entry under a
per-subject key, then make a subject's data **permanently unreadable** by
destroying that one key - *crypto-shredding*. Because the ciphertext is what gets
hashed, the ledger still verifies after a subject is erased.

Encryption is **opt-in**. With it disabled, Chronicle behaves exactly as it did
before 1.12.

:::warning Cleartext columns are NOT erased
Crypto-shredding only protects the encrypted fields (`metadata`, `context`,
`diff` by default). The **`subject_type`, `subject_id`, `action`, `tags`,
`correlation_id`, timestamps, and the cipher envelope itself stay cleartext** so
the ledger remains queryable and verifiable. **Never put PII in `subject_id`,
`action`, or `tags`** - those values survive erasure.
:::

## The DEK / KEK envelope model

Chronicle uses two layers of keys:

- **DEK (Data Encryption Key)** - one per subject (`subject_type` + `subject_id`).
  The DEK encrypts that subject's payload fields. Erasing a subject destroys its
  DEK.
- **KEK (Key Encryption Key)** - wraps (encrypts) the DEKs at rest. The DEKs are
  stored only in wrapped form, in the `chronicle_subject_keys` table. The KEK
  itself lives outside that table - in a local secret by default, or in a KMS.

```text
payload field  --(encrypt with DEK)-->  ciphertext envelope  --> stored + hashed
DEK            --(wrap with KEK)------>  wrapped_dek          --> chronicle_subject_keys
```

Encryption uses libsodium **XChaCha20-Poly1305-IETF** with a fresh 192-bit nonce
per entry. The cleartext entry envelope `(action, id, subject_id, subject_type)`
is bound in as Associated Data (AAD), so a ciphertext cannot be transplanted to a
different entry. See [Security Model](./security-model.md) for the full threat
model.

### The on-disk envelope

Each encrypted field is replaced by a self-describing envelope:

```json
{
  "_chronicle_enc": "v1",
  "nonce": "<base64, 24 bytes>",
  "ciphertext": "<base64>"
}
```

This envelope is written to **both** the hashed `payload` JSON and the
denormalized column, so the integrity checks see a consistent value.

## The shred boundary (what is encrypted)

By default, Chronicle encrypts three fields:

```php
'fields' => ['metadata', 'context', 'diff'],
```

Everything else - actor, action, subject reference, tags, correlation id,
timestamps, hashes - stays cleartext. This is a deliberate trade-off: those
columns power Chronicle's query, verification, and reporting surfaces, and must
remain readable even after a subject is erased.

## Enabling encryption

1. Generate a dedicated 32-byte key (base64). **This is NOT your `APP_KEY`.**

   ```bash
   php -r "echo base64_encode(random_bytes(32)).PHP_EOL;"
   ```

2. Set the environment variables:

   ```dotenv
   CHRONICLE_ENCRYPTION_ENABLED=true
   CHRONICLE_ENCRYPTION_KEY=<the base64 key from step 1>
   CHRONICLE_ENCRYPTION_KEK_ID=local
   ```

3. The relevant config block (`config/chronicle.php`):

   ```php
   'encryption' => [
       'enabled' => env('CHRONICLE_ENCRYPTION_ENABLED', false),
       'fields' => ['metadata', 'context', 'diff'],
       'kek' => [
           'provider' => \Chronicle\Encryption\LocalKeyEncryptionProvider::class,
           'key' => env('CHRONICLE_ENCRYPTION_KEY'),
           'id' => env('CHRONICLE_ENCRYPTION_KEK_ID', 'local'),
       ],
   ],
   ```

:::danger Protect the encryption key
`CHRONICLE_ENCRYPTION_KEY` is the KEK. Anyone with it can unwrap every DEK and
read all encrypted payloads. Store it outside source control, separate from the
database, and rotate it with `chronicle:encryption:rotate-kek`.
:::

New entries recorded while encryption is enabled are encrypted automatically.
Entries recorded *before* you enabled it stay cleartext until you run
[`chronicle:encrypt-backfill`](#backfilling-existing-entries).

## Reading encrypted entries

Encrypted fields decrypt transparently on read through dedicated accessors:

```php
$entry->decryptedMetadata();   // plaintext array, or the raw value if never encrypted
$entry->decryptedContext();
$entry->decryptedDiff();

$entry->erased();              // true once the subject's DEK has been destroyed
```

The raw attribute (`$entry->metadata`) returns the stored envelope, never the
plaintext - verification reads the raw envelope and never decrypts.

## Erasing a subject

Destroying a subject's DEK renders all of that subject's encrypted payloads
permanently unreadable. Chronicle records a PII-free `subject.erased` proof entry
so the erasure itself is audited.

```bash
php artisan chronicle:subject:erase "App\\Models\\User" 42 --reason="GDPR request"
```

Programmatically:

```php
use Chronicle\Facades\Chronicle;

Chronicle::eraseSubject('App\\Models\\User', '42', 'dpo@acme.test', 'GDPR request');
```

`eraseSubject()` is idempotent - a second call returns `false` and records no
second proof. After erasure, reading an encrypted field returns a **tombstone**
instead of throwing:

```php
$entry->decryptedMetadata();
// ['_erased' => true, 'erased_at' => '2026-06-18T10:00:00+00:00']
```

The full erasure workflow, the audited proof, and legal holds are covered in
[GDPR Erasure](./gdpr-erasure.md).

## Inspecting subject keys

List each subject's key state (active/erased) and entry counts - key material is
never printed:

```bash
php artisan chronicle:subject:keys
php artisan chronicle:subject:keys --status=erased --json
php artisan chronicle:subject:keys --subject=42
```

## KMS opt-in

To keep the KEK outside the application, swap the provider for the KMS-backed one
in the [`laravel-chronicle/kms-aws`](https://github.com/laravel-chronicle/kms-aws)
package:

```php
'kek' => [
    'provider' => \Chronicle\KmsAws\KmsKeyEncryptionProvider::class,
    'key' => env('CHRONICLE_KMS_KEK_ARN'),   // KMS key ARN/id for Encrypt/Decrypt
    'id'  => env('CHRONICLE_KMS_KEK_ID'),     // kekId recorded per subject key
],
```

With KMS, wrapped DEKs are protected outside the app and the raw KEK never lives
in your environment. Required IAM actions on the KEK: `kms:Encrypt`,
`kms:Decrypt`.

## Rotating the KEK

Rotating the KEK re-wraps every active DEK under a new key. It never touches
entry ciphertext, `payload_hash`, or `chain_hash`, so the ledger is unaffected:

```bash
php artisan chronicle:encryption:rotate-kek --old-key=<previous base64 KEK> --old-kek-id=local
```

The **new** KEK is the one in your current config; `--old-key` is the previous
base64 KEK. Rotation is chunked and idempotent (rows already on the new `kek_id`
are skipped; erased subjects are skipped).

## Backfilling existing entries

Enabling encryption is forward-only. To encrypt the PII fields of *historical*
entries, run the one-off re-baselining migration:

```bash
# Preview scope - writes nothing
php artisan chronicle:encrypt-backfill --dry-run

# Perform the re-baseline (take a backup first)
php artisan chronicle:encrypt-backfill --force
```

:::warning encrypt-backfill rewrites ledger history
`chronicle:encrypt-backfill` encrypts historical fields, which **recomputes
`payload_hash` and re-links `chain_hash`** from the first rewritten entry to the
head, then writes a fresh signed checkpoint at the new head. It is a deliberate,
one-off migration - **take a full database backup first**. It refuses to run in
production without `--force`, respects legal holds, and skips already-encrypted
entries (a re-run is a no-op). After it completes, verify the ledger from the new
checkpoint; see [Pruning & Retention](./pruning.md) and
[Integrity Verification](./integrity-verification.md) for verification scope.
:::

| Option        | Description                                                 |
|---------------|-------------------------------------------------------------|
| `--from=<id>` | Start the re-baseline at this entry ULID (default: genesis) |
| `--chunk=500` | Entries loaded per batch                                    |
| `--dry-run`   | Report scope without writing                                |
| `--force`     | Skip the confirmation; required to run in production        |
