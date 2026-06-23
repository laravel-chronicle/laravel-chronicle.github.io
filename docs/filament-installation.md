---
title: Filament Plugin - Installation
---

# Filament Plugin

`laravel-chronicle/filament` is a **read-only** Filament v4/v5 panel for Chronicle. It lets you browse the tamper-evident audit ledger and cryptographically verify it - across the whole chain, a single entry, or a selected segment - directly from your admin panel. By design the panel can never rewrite history.

## Requirements

| Requirement              | Supported                   |
|--------------------------|-----------------------------|
| PHP                      | 8.2, 8.3, 8.4, 8.5          |
| Laravel                  | 12, 13                      |
| Filament                 | 4, 5                        |
| `laravel-chronicle/core` | 1.13+                       |
| PHP extensions           | `ext-sodium`, `ext-openssl` |

## Install

```bash
composer require laravel-chronicle/filament
php artisan migrate
```

`php artisan migrate` creates the plugin's verification result store table (`chronicle_filament_verification_records`). The migration is autoloaded - no publish step is required.

The config file is optional:

```bash
php artisan vendor:publish --tag=chronicle-filament-config
```

## Register on a panel

Add the plugin to your Filament panel provider:

```php
use Chronicle\Filament\ChronicleFilamentPlugin;

$panel->plugin(
    ChronicleFilamentPlugin::make()
        ->navigationGroup('Audit')
        ->verification(true)
        // Gate the verify actions independently of read access:
        ->authorize(fn (): bool => auth()->user()?->can('verify-chronicle') ?? false),
);
```

Read (view) access is governed by your panel's normal authorization. The `->authorize()` closure gates only the chain/entry/segment **verify** actions, not browsing.

## See also

- [Browsing & Verification](./filament-verification.md) - what the panel does
- [Configuration](./filament-configuration.md) - config keys and fluent methods
- [Integrity Verification](./integrity-verification.md) - the verifier the panel drives
