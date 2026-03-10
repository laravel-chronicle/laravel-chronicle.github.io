---
title: PostgreSQL JSON Index Documentation
---

# PostgreSQL JSON Index Documentation

Chronicle ships with general-purpose B-tree indexes for its most common lookup patterns:

- `action`
- `(actor_type, actor_id)`
- `(subject_type, subject_id)`
- `correlation_id`
- `created_at`

Those indexes are created by the package migrations automatically.

## Why add PostgreSQL JSON indexes

Chronicle stores several fields as JSON:

- `payload`
- `metadata`
- `context`
- `tags`
- `diff`

The built-in package API currently uses JSON containment queries for `tags` through `whereJsonContains()`. If your ledger grows large and tag-based filtering becomes hot, PostgreSQL-specific JSON indexes can make a material difference.

## Important constraint

Chronicle's migrations define these columns with Laravel's `json` type, not `jsonb`.

On PostgreSQL, that means:

- you cannot get the full benefit of GIN indexing directly on the plain column
- the usual approach is to create an expression index that casts the column to `jsonb`

## Recommended index for tags

If you use `Entry::withTag()` or `Entry::withTags()` heavily, add a GIN expression index on `tags`:

```sql
CREATE INDEX chronicle_entries_tags_jsonb_gin
ON chronicle_entries
USING GIN ((tags::jsonb));
```

This is the most relevant PostgreSQL JSON index for Chronicle's current built-in query API.

## Optional indexes for custom application queries

If your application issues custom PostgreSQL JSON predicates against other Chronicle columns, you can add similar indexes:

```sql
CREATE INDEX chronicle_entries_payload_jsonb_gin
ON chronicle_entries
USING GIN ((payload::jsonb));

CREATE INDEX chronicle_entries_metadata_jsonb_gin
ON chronicle_entries
USING GIN ((metadata::jsonb));

CREATE INDEX chronicle_entries_context_jsonb_gin
ON chronicle_entries
USING GIN ((context::jsonb));
```

These only help if your application actually filters on those columns.

## When not to add them

Do not add JSON indexes preemptively just because the columns exist.

Skip them when:

- your ledger is still small
- tag-based queries are rare
- most reads already use `action`, actor, subject, correlation, or time-range filters

GIN indexes improve read performance at the cost of additional disk space and write overhead.

## Migration example

Create a database-specific migration in your application:

```php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        DB::statement('
            CREATE INDEX chronicle_entries_tags_jsonb_gin
            ON chronicle_entries
            USING GIN ((tags::jsonb))
        ');
    }

    public function down(): void
    {
        DB::statement('DROP INDEX IF EXISTS chronicle_entries_tags_jsonb_gin');
    }
};
```

If you customized the Chronicle table name, update the SQL accordingly.

## Practical indexing strategy

For most Chronicle installations on PostgreSQL:

1. Start with the package's built-in indexes
2. Measure real query patterns
3. Add the `tags::jsonb` GIN index only if tag filters are on a hot path
4. Add payload or metadata JSON indexes only for explicit custom predicates

## Related reading

- [Query API Documentation](./query-api.md) for the scopes and reader methods that trigger these access patterns
- [Config Reference](./config-reference.md) if you use a dedicated Chronicle connection or custom table names
