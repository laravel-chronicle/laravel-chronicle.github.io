---
title: Use a Dedicated Audit Database
---

# Use a Dedicated Audit Database

Isolate the Chronicle ledger from your main application database so audit data cannot be accidentally wiped, migrated over, or affected by application schema changes.

## 1. Add the connection to `config/database.php`

```php
'connections' => [
    // your existing connections...

    'audit' => [
        'driver'   => 'mysql',
        'host'     => env('AUDIT_DB_HOST', '127.0.0.1'),
        'port'     => env('AUDIT_DB_PORT', '3306'),
        'database' => env('AUDIT_DB_DATABASE', 'chronicle_audit'),
        'username' => env('AUDIT_DB_USERNAME'),
        'password' => env('AUDIT_DB_PASSWORD'),
        'charset'  => 'utf8mb4',
        'collation'=> 'utf8mb4_unicode_ci',
    ],
],
```

## 2. Point Chronicle at the connection

In `.env`:

```env
CHRONICLE_DB_CONNECTION=audit
```

## 3. Run Chronicle migrations against the audit connection

```bash
php artisan migrate --database=audit --path=database/migrations/chronicle
```

Or, if you used `chronicle:install`:

```bash
php artisan migrate --database=audit
```

Chronicle reads `CHRONICLE_DB_CONNECTION` at runtime and directs all reads and writes to that connection.

## 4. Keep the connection out of your main migration history (optional)

If you prefer the audit migrations never appear in your default `migrations` table, run them with `--pretend` first to review, then execute against the audit connection as above.

## Verify it worked

```bash
php artisan chronicle:stats
```

The command uses the configured `connection` - if it shows `0 entries` after recording some, the connection is pointing at the wrong database.

You can also confirm directly:

```bash
php artisan tinker
>>> DB::connection('audit')->table('chronicle_entries')->count();
```

## See also

- [Config Reference](./config-reference.md) - `connection` config key
- [Storage Drivers](./storage-drivers.md) - how `DatabaseDriver` uses the connection
- [Installation](./installation.md) - recommended production setup
