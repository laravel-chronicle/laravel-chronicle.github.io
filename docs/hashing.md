---
title: Hashing
---

# Hashing

Chronicle’s integrity model depends on two hashes:

- payload hash
- chain hash

## Payload hash

Each entry generates an SHA-256 hash from its canonical payload:

```text
payload_hash = SHA256(canonical_payload)
```

The canonical payload is produced by Chronicle’s serializer, which recursively sorts associative keys and normalizes supported values before JSON encoding.

This means equivalent payloads produce equivalent hashes.

## Chain hash

Entries are linked together using:

```text
chain_hash = SHA256(previous_chain_hash + payload_hash)
```

For the first entry, Chronicle uses:

```text
previous_chain_hash = "0"
```

## Why canonicalization matters

Without canonicalization, payloads with the same meaning but different key ordering could hash differently.

Chronicle avoids that by canonicalizing before hashing, which makes the hash stable across verification runs.

## What tampering looks like

If a payload changes:

- its `payload_hash` no longer matches
- all downstream `chain_hash` values become invalid

If an entry is deleted or reordered:

- the chain breaks at the point of the change

## Where hashing is used

Chronicle uses hashing in:

- live ledger verification
- checkpoints
- export verification
- independent audit workflows

Hashing is not an implementation detail here. It is the package’s core integrity primitive.
