---
title: Philosophy
---

# Philosophy

Chronicle is built around a small set of strong design constraints.

## Append-only ledger

Entries are immutable once written.

Chronicle intentionally does not provide APIs to:

- update entries
- delete entries
- rewrite history

If a correction is needed, it should be recorded as a new entry.

## Explicit intent

Every entry must include:

- actor
- action
- subject

Chronicle avoids vague audit events. The package is optimized for deliberate, domain-specific logging such as `user.email_changed` rather than generic “something changed” records.

## Low magic

Chronicle intentionally avoids:

- automatic model observers
- hidden logging hooks
- implicit activity recording

Every Chronicle entry should be an explicit developer decision.

## Stable contracts

Chronicle treats its verification and export structures as durable contracts. Export manifests are versioned so downstream tooling has a clear compatibility boundary.

## Transport agnostic

Chronicle is designed to work equally well in:

- HTTP requests
- queue workers
- CLI commands
- background jobs

The logging model is not tied to a specific Laravel runtime path.

## Tamper detection over illusion

Chronicle does not pretend to make your database impossible to tamper with.

Instead it focuses on something more realistic and more useful:

making tampering detectable through deterministic hashing, append-only semantics, checkpoints, and exports.
