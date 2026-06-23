---
title: Filament Plugin - Browsing & Verification
---

# Browsing & Verification

The plugin is the only Filament audit plugin built around cryptographic verification rather than a mutable activity feed.

## Read-only by construction

The audit log resource is browse-and-view only. There are no Create or Edit pages, every mutation ability (`canCreate`/`canEdit`/`canDelete`/`canDeleteAny`/`canReplicate`) is hard-denied, and an `EntryPolicy` denies `create`/`update`/`delete`/`restore`/`forceDelete`/`replicate` for any caller - defence in depth behind core's own immutable entries.

## Browsing

The **Audit Log** resource lists entries newest-first with columns for sequence #, recorded time, action, actor, subject, and verification status. Filters cover action, actor type, subject type, recorded date range, and verification state.

Actor and subject labels come from core's `Chronicle::resolveReference()` (honouring morph maps, no extra query - see [Reference Resolution](./reference-resolution.md#reverse-resolution)). Override per panel with `->labelResolver()`.

The detail view is a read-only infolist: Identity, Integrity (current/previous/payload hashes), Signature (algorithm, key id, signature read from the entry's [checkpoint](./checkpoints.md), shown as *Unanchored* when none), Payload, and a Decrypted section rendered through core's `decrypted*()` accessors with an erased-subject indicator (see [Crypto-Shredding](./crypto-shredding.md)).

## Verification

Verification is always **deliberate** - nothing verifies on a read or render path.

| Action         | Where         | Scope                        |
|----------------|---------------|------------------------------|
| Verify chain   | Header action | The full ledger from genesis |
| Verify entry   | Row action    | A single entry               |
| Verify segment | Bulk action   | The selected span            |

The **Verify segment** bulk action reduces the selected rows to a `[min, max]` sequence span and calls core's `verifyEntryRange`, which anchors on the enclosing **signed checkpoints** - never on a selected row's stored hash. See [Scalable Verification](./scalable-verification.md#verify-an-entry-range).

Chain and segment verifies covering more than `verification.queue_threshold` entries (default 1000) are dispatched to the queue and notify you on completion.

## Status badges and the health widget

Results are written to a plugin-owned, DB-backed store and surfaced as badges - `Verified` / `Failed` / `Unverified` / `Stale` (stale once newer entries are appended) - with a tooltip showing the last-verified time and decoded failure. Badge rendering is primed in a single query, so it stays N+1-free at volume.

The `VerificationHealthWidget` summarises the last-verified time, pass/fail, and a cheap checkpoint spine check (`O(checkpoints)`).

## Theming

The panel uses Filament's native CSS variables and utility classes only - no npm, no asset compilation, no required custom theme. It adopts your panel's primary color and dark mode automatically.

## See also

- [Installation](./filament-installation.md)
- [Configuration](./filament-configuration.md)
- [Scalable Verification](./scalable-verification.md) - the verification modes the actions map to
