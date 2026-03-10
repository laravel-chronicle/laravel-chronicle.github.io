---
sidebar_position: 1
title: Overview
slug: /overview
---

# Laravel Chronicle

Laravel Chronicle is a tamper-evident audit ledger for Laravel applications.

It records immutable audit entries, hashes each canonical payload, links entries together with a chain hash, and supports signed checkpoints and verifiable exports. The package is aimed at systems where a normal activity log is not enough because the audit trail itself must be inspectable and tamper-detectable.

## What Chronicle gives you

- An append-only ledger backed by immutable Eloquent models
- Deterministic payload hashing and chain hashing
- Actor, subject, action, tag, correlation, and time-based query patterns
- Cursor pagination and streaming for large ledgers
- Signed checkpoints for anchoring ledger state
- Verifiable exports for off-platform review

## Core flow

Chronicle records entries through a deterministic pipeline:

1. Your application builds an entry with `Chronicle::record()`
2. The payload is normalized into canonical JSON
3. The payload hash is computed
4. The next chain hash is derived from the previous chain head and payload hash
5. The entry is persisted through the configured storage driver

## A minimal entry

```php
use Chronicle\Facades\Chronicle;

Chronicle::record()
    ->actor($user)
    ->action('invoice.created')
    ->subject($invoice)
    ->metadata([
        'total' => 1000,
        'currency' => 'USD',
    ])
    ->tags(['billing', 'invoices'])
    ->commit();
```

## What to read next

- [Installation](./installation.md) to install the package and publish assets
- [Quick Start](./quick-start.md) to record entries, query the ledger, and verify integrity
- [Config Reference](./config-reference.md) to understand every `chronicle.php` option
