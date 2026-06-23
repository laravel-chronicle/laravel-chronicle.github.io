---
title: Produce a Compliance Report for an Auditor
---

# Produce a Compliance Report for an Auditor

Generate a signed, self-contained HTML report of the ledger that an auditor can receive and verify independently.

## 1. Create a checkpoint first (recommended)

Anchor the chain head before producing the report so the auditor has a verifiable reference point:

```bash
php artisan chronicle:checkpoint
```

## 2. Generate the report

```bash
# Full ledger report
php artisan chronicle:report /tmp/chronicle-report-q1.html

# Scoped to a date range
php artisan chronicle:report /tmp/chronicle-report-q1.html \
    --from=2025-01-01 \
    --to=2025-03-31
```

The command writes a single HTML file. On success, it prints:

```
Entries:    4 821
Chain head: a3f7c9...
Report hash: 8e12bd...
Written to: /tmp/chronicle-report-q1.html
```

## 3. Share the HTML file with the auditor

The file is self-contained: it embeds the entry count, chain head, reporting period, report hash, signature, algorithm, and key id. No database access is needed to read it.

## What the auditor can verify

The report includes a **signature block**. An auditor with the corresponding public key (`CHRONICLE_PUBLIC_KEY`) can verify that:

1. The report hash covers the canonical data (entry count, boundaries, chain head, period)
2. The signature was produced by the key identified by `key_id`

Example verification with OpenSSL (Ed25519):

```bash
# Extract from the report HTML: report_hash, signature, public_key
echo -n "<report_hash_hex>" | xxd -r -p > hash.bin
echo "<base64_signature>" | base64 -d > sig.bin
echo "<base64_public_key>" | base64 -d > pub.bin
openssl pkeyutl -verify -inkey pub.bin -keyform DER -sigfile sig.bin -in hash.bin -pubin
```

## Verify it worked

Open the HTML file in a browser - it renders a table with all report fields. Confirm the period, entry count, and chain head match what you expect from `chronicle:stats`.

```bash
php artisan chronicle:stats
```

## See also

- [Compliance Reports](./compliance-reports.md) - report fields, signing, and verification details
- [Checkpoints](./checkpoints.md) - why to checkpoint before reporting
- [Signing & Keys](./signing-and-keys.md) - public key management
