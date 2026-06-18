---
title: GDPR Erasure (Art. 17)
---

# GDPR Erasure (Art. 17)

Chronicle's crypto-shredding gives you a defensible answer to a GDPR Article 17
("right to erasure") request *without* deleting audit history: destroy the
subject's encryption key, and their PII becomes permanently unreadable while the
tamper-evident ledger stays intact and verifiable.

:::warning Not legal advice
This page explains how Chronicle's features *map to* common interpretations of
GDPR Article 17. It is **not legal advice**. Whether crypto-shredding satisfies a
specific erasure obligation - and whether you may retain a pseudonymized record
of the fact that an event occurred - is a determination for your own legal and
data-protection advisors.
:::

## How erasure maps to Art. 17

| Art. 17 expectation                      | Chronicle mechanism                                                                                 |
|------------------------------------------|-----------------------------------------------------------------------------------------------------|
| Personal data no longer accessible       | The subject's DEK is destroyed; encrypted `metadata`/`context`/`diff` become permanently unreadable |
| Erasure is demonstrable / auditable      | A PII-free `subject.erased` proof entry is recorded                                                 |
| Retain records required for legal claims | [Legal holds](#legal-holds) block erasure of held subjects                                          |
| Don't break other records                | Only the subject's fields are affected; the ledger still verifies                                   |

## Performing an erasure

```bash
php artisan chronicle:subject:erase "App\\Models\\User" 42 --reason="Art. 17 request #123"
```

or programmatically:

```php
use Chronicle\Facades\Chronicle;

Chronicle::eraseSubject('App\\Models\\User', '42', 'dpo@acme.test', 'Art. 17 request #123');
```

This destroys the subject's DEK (and purges the process-local cache), so every
encrypted field for that subject now reads a tombstone:

```php
$entry->decryptedMetadata();
// ['_erased' => true, 'erased_at' => '2026-06-18T10:00:00+00:00']
```

Erasure is idempotent: a second call returns `false` and records no second proof.

## The audited `subject.erased` proof

Erasure records a **cleartext, PII-free** proof entry so the erasure itself is
part of the audit trail:

- `action` = `subject.erased`
- `actor_type` = `system`, `actor_id` = the requester (or `system`)
- `subject_type` / `subject_id` - the erased subject's reference (preserved)
- `metadata` - `requester`, `reason`, and `legal_hold_override` only; **no PII**

Because the proof is recorded *after* the DEK is destroyed, it is never encrypted
and stays readable and verifiable forever.

## Retaining a pseudonymized fact

After erasure, the entry's cleartext columns remain: the **fact** that an action
occurred, when, and against which opaque subject reference - but not the personal
content. This "retain the pseudonymized fact, erase the personal data" pattern is
often how organizations reconcile audit-retention duties with the right to
erasure.

:::warning The subject reference is not erased
`subject_type`, `subject_id`, `action`, and `tags` stay **cleartext** after
erasure. If `subject_id` is a raw email or name, it survives the shred. Use an
opaque identifier (a surrogate key/ULID), not PII, as the subject reference. See
the cleartext-boundary warning in
[Crypto-Shredding & Encryption](./crypto-shredding.md).
:::

## Legal holds

A litigation or regulatory hold must override an erasure request. Place a hold to
block erasure (and pruning) of a subject:

```bash
php artisan chronicle:legal-hold place "App\\Models\\User" 42 --reason="case-9912" --by=legal@acme.test
php artisan chronicle:legal-hold release "App\\Models\\User" 42
```

While a hold is active:

- `chronicle:subject:erase` **refuses** the subject. The refusal can be overridden
  with `--force`, and the override is itself audited via a `legal_hold_override`
  flag in the `subject.erased` proof.
- `chronicle:prune` **excludes** the subject's entries (not overridable by
  `--force` - a litigation hold is absolute). See [Pruning & Retention](./pruning.md).

Legal holds are stored in the `chronicle_legal_holds` table - see
[Data Model](./data-model.md).

## Erasure completeness

Crypto-shredding erases the **live store**: no DEK remains and decryption is
impossible. It does not reach backups taken before the erasure - expire/rotate
backups within your erasure SLA and rotate the KEK after large erasure events.
See [Security Model](./security-model.md#erasure-completeness-live-store-vs-backups)
for the full discussion.

## Companion: Custodian

[`laravel-chronicle/custodian`](https://github.com/laravel-chronicle/custodian) is
a companion package for orchestrating data-subject requests (DSARs and erasure
workflows) on top of Chronicle's erasure primitives. Consult its repository for
current capabilities and status.
