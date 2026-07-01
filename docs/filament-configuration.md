---
title: Filament Plugin - Configuration
---

# Configuration

The plugin reads `config/chronicle-filament.php`; every value can be overridden per panel with a fluent method on `ChronicleFilamentPlugin`.

## Config reference

| Key                                    | Default                  | Purpose                                                                                                                                                                |
|----------------------------------------|--------------------------|------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| `entry_model`                          | `\Chronicle\Entry\Entry` | The Eloquent model the resource reads. Point at a subclass to add accessors/relations; honored end-to-end when `chronicle.models.entry` matches (core 1.13+).          |
| `navigation.group`                     | `'Chronicle'`            | Navigation group label                                                                                                                                                 |
| `navigation.sort`                      | `null`                   | Navigation sort order                                                                                                                                                  |
| `slug`                                 | `'chronicle-entries'`    | Resource route slug                                                                                                                                                    |
| `verification.enabled`                 | `true`                   | Master toggle for badges, verify actions, and the health widget                                                                                                        |
| `verification.queue_threshold`         | `1000`                   | Chain/segment verifies covering more than this many entries are queued instead of run synchronously                                                                    |
| `verification.store.connection`        | `null`                   | Database connection for the verification result store (`null` = the app default)                                                                                       |
| `anchoring.enabled`                    | `null`                   | Master toggle for the anchor surfaces. `null` follows core's `chronicle.anchoring.enabled`; set `true`/`false` to force. Hidden everywhere when core anchoring is off. |
| `anchoring.verify_all_queue_threshold` | `1000`                   | "Verify all anchors" runs synchronously at or below this many in-scope checkpoints, and is queued above it.                                                            |
| `signing_keys.enabled`                 | `true`                   | Master toggle for the signing-key column, filter, detail badge, and key-ring widget.                                                                                   |
| `crypto_shredding.enabled`             | `null`                   | Toggle for the read-only erasure surfaces (column, filter, detail, proof preset, widget). `null` follows core's `chronicle.encryption.enabled`.                        |
| `erasure.enabled`                      | `false`                  | Master toggle for the irreversible Erase-subject action. Off by default.                                                                                               |
| `erasure.allow_hold_override`          | `false`                  | Whether a legal hold may be overridden during erasure (still gated per action).                                                                                        |

## Fluent plugin methods

Each overrides the matching config value for that panel:

```php
ChronicleFilamentPlugin::make()
    ->navigationGroup('Audit')
    ->navigationSort(99)
    ->slug('chronicle')
    ->cluster(AuditCluster::class)
    ->verification(true)
    ->anchoring(true)
    ->signingKeys(true)
    ->cryptoShredding(true)
    ->erasure(false) // the erase action is off by default
    ->eraseAuthorize(fn ($record): bool => auth()->user()?->can('erase-subject') ?? false)
    ->authorize(fn (): bool => auth()->user()?->can('verify-chronicle') ?? false)
    ->labelResolver(fn (string $type, string $id): ?string => null);
```

| Method                                                         | Effect                                                                                         |
|----------------------------------------------------------------|------------------------------------------------------------------------------------------------|
| `navigationGroup()`, `navigationSort()`, `slug()`, `cluster()` | Resource placement in the panel                                                                |
| `verification(bool)`                                           | Enable/disable verification UI                                                                 |
| `anchoring(bool)`                                              | Show/hide the anchor surfaces (defaults to following core)                                     |
| `signingKeys(bool)`                                            | Show/hide the signing-key surfaces (column, filter, detail badge, widget)                      |
| `cryptoShredding(bool)`                                        | Show/hide the read-only erasure surfaces (defaults to following core)                          |
| `erasure(bool)`                                                | Enable the Erase-subject action (default off)                                                  |
| `eraseAuthorize(Closure)`                                      | Authorize the erase action; **defaults to deny**, separate from the verify gate                |
| `eraseAllowHoldOverride(bool)`                                 | Permit overriding a legal hold during erasure (default off)                                    |
| `authorize(Closure)`                                           | Gate the verify actions independently of read access                                           |
| `labelResolver(Closure)`                                       | Override actor/subject display labels; return `null` to fall back to core's `resolveReference` |

## Custom entry model

Set `entry_model` to a subclass of `Chronicle\Entry\Entry`. With core 1.13+ and a matching `chronicle.models.entry`, the override is honored by core's reader and verifiers too, so the panel and verification operate on your model end-to-end. See [Custom Entry Model](./custom-entry-model.md).

## See also

- [Installation](./filament-installation.md)
- [Browsing & Verification](./filament-verification.md)
- [Reference Resolution](./reference-resolution.md) - how labels are resolved
