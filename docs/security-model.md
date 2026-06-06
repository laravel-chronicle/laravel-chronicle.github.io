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

## Tampering detection summary

| Attack | How it is detected |
|---|---|
| Entry modification | `payload_hash` mismatch |
| Entry deletion | chain hash break at gap |
| Entry insertion | chain hash break from that point |
| Entry reordering | chain hash break from that point |
| Dataset modification | `dataset_hash` mismatch |
| Dataset truncation | `entry_count` / boundary mismatch |
| Dataset forgery | signature verification failure |

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

## Key ring resolution

Since v1.10, Chronicle uses a `KeyRing` to resolve the correct verifier for each artifact. Every checkpoint and export artifact persists both `algorithm` and `key_id`. When verifying, Chronicle calls `KeyRing::resolve(algorithm, keyId)` to load the matching provider from the ring.

This means:

- Old checkpoints signed by a retired key are verified using that retired key's **public key** — no network call and no private key required.
- Only the active key needs a `private_key` configured.
- Retired keys must keep their `public_key` in the ring permanently.

## Boundary checkpoints and key rotation

Each rotation should be preceded by a checkpoint — a signed anchor created under the current key at the current ledger head. That checkpoint becomes the **epoch boundary**: all artifacts signed by the old key sit before it; all artifacts signed by the new key sit after.

```bash
php artisan chronicle:key:rotate <newKeyId>
```

`chronicle:key:rotate` always creates this boundary checkpoint automatically before printing the activation instruction.

## Rotation does not retroactively invalidate prior signatures

Rotating to a new key does not make prior signatures invalid or suspicious. Artifacts signed by a compromised key remain in the ledger and appear mathematically valid when verified — because they are.

The boundary checkpoint bounds the blast radius: it anchors the chain head at the moment of rotation with a timestamp and a signed ID. This is your reference point for "signed before rotation" vs "signed after rotation". A future Chronicle feature (planned for v1.11) will make epoch-scoped verification automatic.

:::warning
**Chronicle makes tampering detectable, not impossible.** If a private key is compromised and an attacker can produce valid signatures, Chronicle cannot distinguish those signatures from authentic ones. Key rotation prevents *further* compromise — it does not retroactively invalidate prior signatures.
:::

## `enforce_on_boot` under a key ring

`enforce_on_boot` validates the **active key only** — the entry referenced by `signing.active`. Retired verify-only keys in the ring (those without `private_key`) do not trigger the boot guard.

```env
CHRONICLE_SIGNING_ENFORCE_ON_BOOT=true
```

This check is silenced automatically in the `testing` environment.

## External signing services (KMS, Vault)

When using a remote signing service such as AWS KMS or HashiCorp Vault:

- `sign()` makes a network call per checkpoint or export. Plan for the added latency (~10–50 ms for KMS in the same region).
- `verify()` should run locally against a cached public key (see [`LocalVerifyProvider`](./custom-signing-providers.md) in Custom Signing Providers).
- Verification does not require connectivity to the signing service. Offline verification is always possible with the cached public key.
- A connectivity failure in `sign()` will cause `chronicle:checkpoint` and `chronicle:export` to fail. Plan for retries in your deployment pipeline.

## Security philosophy

Chronicle follows one core principle:

**Make tampering detectable.**

That is the same broad pattern used by append-only logs, certificate transparency systems, and other integrity-focused ledgers.
