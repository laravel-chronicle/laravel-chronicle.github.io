---
sidebar_position: 2
title: Installation
---

# Installation

## Requirements

- PHP `^8.2`
- Laravel `^11.0` or `^12.0`
- The `ext-sodium` PHP extension
- A database connection for Chronicle's tables

## Install the package

```bash
composer require laravel-chronicle/core
```

Laravel package discovery will register `Chronicle\ChronicleServiceProvider` automatically.

## Publish config and migrations

Chronicle ships with an install command that publishes both the config file and the migration set:

```bash
php artisan chronicle:install
```

The command will:

- publish `config/chronicle.php`
- publish the Chronicle migrations
- prompt you to run migrations immediately

If you prefer to publish assets manually, use Laravel's standard publishing commands:

```bash
php artisan vendor:publish --provider="Chronicle\ChronicleServiceProvider" --tag=chronicle-config
php artisan vendor:publish --provider="Chronicle\ChronicleServiceProvider" --tag=chronicle-migrations
php artisan migrate
```

## Configure signing keys

The default signing provider is `Chronicle\Signing\Ed25519SigningProvider`. It expects base64-encoded Ed25519 keys in your environment:

```env
CHRONICLE_KEY_ID=chronicle-main
CHRONICLE_PRIVATE_KEY=
CHRONICLE_PUBLIC_KEY=
```

You can generate a compatible keypair with PHP and `ext-sodium`:

```bash
php -r '$kp=sodium_crypto_sign_keypair(); echo "CHRONICLE_PRIVATE_KEY=".base64_encode(sodium_crypto_sign_secretkey($kp)).PHP_EOL; echo "CHRONICLE_PUBLIC_KEY=".base64_encode(sodium_crypto_sign_publickey($kp)).PHP_EOL;'
```

The private key must decode to 64 bytes and the public key must decode to 32 bytes.

## Recommended production setup

- Use a dedicated database connection via `CHRONICLE_DB_CONNECTION`
- Keep signing keys outside source control
- Enable `CHRONICLE_SIGNING_ENFORCE_ON_BOOT=true` once keys are present so bad signing configuration fails fast

## After install

Continue to [Quick Start](./quick-start.md) to record your first entry and verify the ledger.
