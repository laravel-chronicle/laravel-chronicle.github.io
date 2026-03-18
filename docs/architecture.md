---
title: Architecture
---

# Architecture

Chronicle is built as a deterministic ledger pipeline for Laravel.

At a high level, entry creation moves through these stages:

```text
Developer API
↓
Entry Builder
↓
Extension Pipeline (VALIDATE → RESOLVE_CONTEXT → POLICY → PROCESS)
↓
Canonical Payload Serializer
↓
Payload Hasher
↓
Chain Hasher
↓
Storage Driver
↓
Checkpoint / Verification / Export Tooling
```

## Core flow

1. Application code starts an entry with `Chronicle::record()`
2. `EntryBuilder` validates the required fields and assembles the payload
3. The extension pipeline runs — built-in validators reject invalid entries before anything is written
4. The payload is canonicalized into deterministic JSON
5. Chronicle computes a payload hash
6. Chronicle computes the next chain hash from the previous chain head and the payload hash
7. The active storage driver persists the immutable entry

## Main components

## `ChronicleManager`

This is the package entry point behind the facade. It is responsible for:

- creating builders
- dispatching entries through the pipeline
- resolving storage drivers
- exposing the reader API
- managing correlation context for transactions

## `EntryBuilder`

The builder collects:

- actor
- action
- subject
- metadata
- context
- diff
- tags
- correlation id

It validates that actor, action, and subject are present before commit.

## `CanonicalPayloadSerializer`

This component recursively sorts associative keys and normalizes supported values so identical payloads always serialize to the same JSON representation.

That deterministic serialization underpins:

- payload hashing
- chain hashing
- export verification

## `EntryHasher`

Generates the SHA-256 hash of the canonical payload.

## `ChainHasher`

Generates:

```text
SHA256(previous_chain_hash + payload_hash)
```

This links the ledger together so modifications, deletions, or reorderings become detectable.

## Storage drivers

Chronicle resolves persistence through the configured storage driver.

Built-in drivers:

- `eloquent`
- `array`
- `null`

Most real installations use `eloquent`.

## Reader, verification, and export services

Chronicle separates write-path concerns from read and verification tooling:

- `LedgerReader` handles common ledger reads
- `IntegrityVerifier` checks the live ledger
- `CheckpointCreator` anchors the current chain head with a signature
- `ExportManager` writes a deterministic export dataset
- `ExportVerifier` validates exported datasets independently

## Transaction model

Chronicle transactions are correlation scopes, not replacements for database transactions.

When you use `Chronicle::transaction()`, Chronicle assigns a correlation id and reuses it across entries created in that context. The actual entry commit still runs inside a database transaction when persisted.

## Why this architecture matters

Chronicle is designed so the integrity story is composable:

- deterministic input representation
- deterministic hash derivation
- append-only persistence
- external verification through checkpoints and exports

That combination makes the ledger useful for audit trails that need to be inspectable rather than merely stored.
