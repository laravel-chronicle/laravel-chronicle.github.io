---
title: Filament Plugin - Configuration
---

# Configuration

The plugin reads `config/chronicle-filament.php`; every value can be overridden per panel with a fluent method on `ChronicleFilamentPlugin`.

## Config reference

| Key                             | Default                  | Purpose                                                                                                                                                       |
|---------------------------------|--------------------------|---------------------------------------------------------------------------------------------------------------------------------------------------------------|
| `entry_model`                   | `\Chronicle\Entry\Entry` | The Eloquent model the resource reads. Point at a subclass to add accessors/relations; honored end-to-end when `chronicle.models.entry` matches (core 1.13+). |
| `navigation.group`              | `'Chronicle'`            | Navigation group label                                                                                                                                        |
| `navigation.sort`               | `null`                   | Navigation sort order                                                                                                                                         |
| `slug`                          | `'chronicle-entries'`    | Resource route slug                                                                                                                                           |
| `verification.enabled`          | `true`                   | Master toggle for badges, verify actions, and the health widget                                                                                               |
| `verification.queue_threshold`  | `1000`                   | Chain/segment verifies covering more than this many entries are queued instead of run synchronously                                                           |
| `verification.store.connection` | `null`                   | Database connection for the verification result store (`null` = the app default)                                                                              |

## Fluent plugin methods

Each overrides the matching config value for that panel:

```php
ChronicleFilamentPlugin::make()
    ->navigationGroup('Audit')
    ->navigationSort(99)
    ->slug('chronicle')
    ->cluster(AuditCluster::class)
    ->verification(true)
    ->authorize(fn (): bool => auth()->user()?->can('verify-chronicle') ?? false)
    ->labelResolver(fn (string $type, string $id): ?string => null);
```

| Method                                                         | Effect                                                                                         |
|----------------------------------------------------------------|------------------------------------------------------------------------------------------------|
| `navigationGroup()`, `navigationSort()`, `slug()`, `cluster()` | Resource placement in the panel                                                                |
| `verification(bool)`                                           | Enable/disable verification UI                                                                 |
| `authorize(Closure)`                                           | Gate the verify actions independently of read access                                           |
| `labelResolver(Closure)`                                       | Override actor/subject display labels; return `null` to fall back to core's `resolveReference` |

## Custom entry model

Set `entry_model` to a subclass of `Chronicle\Entry\Entry`. With core 1.13+ and a matching `chronicle.models.entry`, the override is honored by core's reader and verifiers too, so the panel and verification operate on your model end-to-end. See [Custom Entry Model](./custom-entry-model.md).

## See also

- [Installation](./filament-installation.md)
- [Browsing & Verification](./filament-verification.md)
- [Reference Resolution](./reference-resolution.md) - how labels are resolved
