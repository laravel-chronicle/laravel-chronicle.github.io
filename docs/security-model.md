---
title: Security Model
---

# Security Model

Chronicle is designed for tamper-detectable audit logging.

Its security story is based on:

- append-only ledger design
- canonical payload hashing
- chain hashing
- signed checkpoints
- signed, verifiable exports

## Threat model

Chronicle is meant to detect:

- malicious database modifications
- accidental data corruption
- unauthorized deletion of records
- unauthorized modification of records
- truncated or forged exports

Chronicle is not designed to prevent those actions directly. Its goal is to make them detectable.

## Security guarantees

## Entry integrity

Each entry stores:

```text
payload_hash = SHA256(canonical_payload)
```

If the payload changes after recording, payload verification fails.

## Ledger integrity

Entries are linked using:

```text
chain_hash = SHA256(previous_chain_hash + payload_hash)
```

That makes modification, deletion, insertion, and reordering detectable.

## Dataset integrity

Chronicle exports include:

```text
dataset_hash = SHA256(entries.ndjson)
```

If the export contents change, the hash changes too.

## Dataset authenticity

Chronicle signs the dataset hash using the configured signing provider. With the default provider this is Ed25519.

That lets external systems verify that the dataset originated from the expected key material.

## Boundary protection

Export manifests include:

- `entry_count`
- `first_entry_id`
- `last_entry_id`
- `chain_head`

These protect against partial or reordered exports.

## What Chronicle does not guarantee

Chronicle does not protect against:

- compromised application code
- dishonest event recording at the application layer
- stolen signing keys
- poor operational key management

If your application records false events, Chronicle can preserve them faithfully, but it cannot tell you they were false.

## Recommended operating model

- store signing keys outside source control
- verify the live ledger periodically
- export and verify datasets regularly
- store exports outside the primary application database
- restrict database access with normal operational controls

## Security philosophy

Chronicle follows one core principle:

**Make tampering detectable.**

That is the same broad pattern used by append-only logs, transparency systems, and other integrity-focused ledgers.
