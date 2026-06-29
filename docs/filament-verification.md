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

## External anchoring

Since the plugin's v1.1, the panel surfaces core's [external checkpoint anchoring](./anchoring.md). Like verification, anchor checks are **deliberate and read-only** - nothing contacts an anchor provider on a render path. All anchor surfaces are hidden unless core anchoring is enabled (they follow `chronicle.anchoring.enabled`; override with `->anchoring(true|false)`).

The entry detail view gains a read-only **External anchoring** section listing the entry's checkpoint's anchors - per anchor the provider, a status badge, `anchored_at`, `reference`, and a copyable `proof`. It reads stored anchor status only, and degrades to *Unanchored*, *No anchors*, or *Anchoring not configured*.

Verification is exposed two ways, both gated by the same `->authorize()` closure as the chain/entry/segment actions:

| Action             | Where               | Scope                                                                           |
|--------------------|---------------------|---------------------------------------------------------------------------------|
| Verify anchor      | Row + detail header | One entry's checkpoint, via core's `AnchorVerifier::checkpointHasValidAnchor()` |
| Verify all anchors | List-page header    | Every in-scope checkpoint, via `AnchorVerifier::verify()`                       |

"Verify all anchors" runs synchronously at or below `anchoring.verify_all_queue_threshold` (default 1000 checkpoints) and on the queue above it, notifying you on completion.

An **Anchor** badge column and matching filter read the checkpoint's stored anchor status (no provider call, no per-row query), and an `AnchorCoverageWidget` summarises coverage from cheap aggregates - checkpoints anchored vs total, plus pending/failed counts and the latest `anchored_at`.

To populate any of this, core anchoring must be configured - RFC 3161 TSA or the [S3 Object Lock adapter](./anchor-s3.md). With none configured, every entry shows as *Unanchored* and the surfaces stay hidden.

## Signing-key visibility

Since the plugin's v1.2, the panel surfaces signing-key rotation - which key signed each entry, drawn from its [checkpoint](./checkpoints.md). This is **display-only**: signature verification already happens inside chain/entry verification (the verifiers resolve each checkpoint's key through core's `KeyRing`), so these surfaces read key metadata only and never sign or verify. Toggle them with `->signingKeys(true|false)` (default on).

The entry table gains a **Signing key** column - the entry's `checkpoint.key_id` as a state-coloured badge with the algorithm, and an *Unsigned* placeholder when the entry has no checkpoint. A matching filter lists the configured keys (labelled `algorithm:keyId`, the active one marked `(active)`) and narrows by key. The column reads the already eager-loaded checkpoint, so there's no per-row query.

Each key reads as one of three states:

| State    | Meaning                                                                        |
|----------|--------------------------------------------------------------------------------|
| Active   | Signed by the key core is currently signing new checkpoints with               |
| Retired  | Signed by an earlier key - still kept in the ring to verify historical entries |
| Unsigned | The entry has no checkpoint yet                                                |

The entry detail view badges the same Active/Retired state beside the key id (with a note that retired keys still verify historical artifacts), and a `SigningKeyRingWidget` on the list page summarises the ring: the active key, its size, the number of retired keys, and the active key's checkpoint coverage. See core's [Signing & Keys](./signing-and-keys.md) and [key rotation](./signing-and-keys.md#key-rotation) for how the ring is configured and rotated.

## Theming

The panel uses Filament's native CSS variables and utility classes only - no npm, no asset compilation, no required custom theme. It adopts your panel's primary color and dark mode automatically.

## See also

- [Installation](./filament-installation.md)
- [Configuration](./filament-configuration.md)
- [Scalable Verification](./scalable-verification.md) - the verification modes the actions map to
- [External Anchoring](./anchoring.md) - the anchors the panel surfaces
- [S3 Object Lock Adapter](./anchor-s3.md) - one way to produce anchors
- [Signing & Keys](./signing-and-keys.md) - the key ring the panel surfaces, and key rotation
