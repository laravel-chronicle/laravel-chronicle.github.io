---
title: Performance & Indexing
---

# Performance & Indexing

Chronicle is designed for high-volume append-only audit writes. This page covers recommended access patterns, large-ledger strategies, and database indexing.

## Recommended access patterns

- Use cursor pagination for browsing large ledgers — it avoids expensive offset scans
- Use streaming for exports, verification passes, and batch analysis
- Use `latestFirst()` for operational review screens
- Use `withTags()` with a JSON index on large PostgreSQL datasets (see below)

## Large-ledger patterns

### Cursor pagination

Chronicle includes two cursor-based pagination scopes:

```php
// Ledger order (oldest first)
$page = Entry::query()->cursorPaginateLedger(100);

// Reverse ledger order (newest first)
$page = Entry::query()->cursorPaginateLatest(100);
```

Cursor pagination is the right default for large audit datasets — it avoids the `OFFSET` scans that slow down traditional pagination.

### Streaming

For exports, verification helpers, and batch analysis:

```php
// Stream in ledger order
Entry::query()->action('export.ready')->stream()->each(function (Entry $entry) {
    // process entry
});

// Stream in reverse ledger order
$latest = Entry::query()->streamLatest()->take(50)->pluck('action');
```

### Chunk-based verification

`chronicle:verify` streams entries internally. For custom batch workflows, use `stream()` rather than loading all entries into memory.

## Checkpoint cadence & verification cost

Full verification is `O(entries)`. Chronicle v1.11's [scalable verification](./scalable-verification.md) modes — `--checkpoints-only`, `--since-last-checkpoint`, `--from-checkpoint`, and `--resume` — bound that cost by checkpoint spacing: the closer your checkpoints, the smaller each incremental pass. Pick a cadence that matches write volume and recovery objectives; a common pattern is a scheduled checkpoint plus one every N entries. See [Schedule Checkpoints & Exports](./guide-schedule-checkpoints-exports.md).

## Built-in indexes

Chronicle's migrations create these indexes automatically:

- `action`
- `(actor_type, actor_id)`
- `(subject_type, subject_id)`
- `correlation_id`
- `created_at`

These cover the most common Chronicle query patterns. No additional indexes are needed for most installations.

### checkpoint_id (v1.11)

Each entry carries a `checkpoint_id`, populated on the entries a checkpoint covers when that checkpoint is created. The v1.11 migration adds an index on `chronicle_entries.checkpoint_id` (a foreign key alone does not create one on every database), so checkpoint-scoped lookups and the incremental verification modes stay cheap on large ledgers.

The checkpoints table also gains `head_id` (indexed), `entry_count`, and `previous_checkpoint_id` (indexed) so the checkpoint chain is walkable without scanning entries — this is what powers `--checkpoints-only` and the segment modes.

## PostgreSQL JSON indexes

Chronicle stores several fields as JSON columns:

- `payload`, `metadata`, `context`, `tags`, `diff`

The built-in `withTag()` and `withTags()` scopes use `whereJsonContains()` for tag filtering. On large PostgreSQL ledgers, a GIN expression index on `tags` can make a material difference.

### Important constraint

Chronicle's migrations use Laravel's `json` column type, not `jsonb`. On PostgreSQL this means you cannot get the full benefit of GIN indexing directly on the column — the standard approach is an expression index that casts to `jsonb`.

### Recommended index for tags

```sql
CREATE INDEX chronicle_entries_tags_jsonb_gin
ON chronicle_entries
USING GIN ((tags::jsonb));
```

This is the most relevant JSON index for Chronicle's built-in query API.

### Optional indexes for custom queries

If your application issues custom PostgreSQL JSON predicates against other Chronicle columns:

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

Only add these if your application actually filters on those columns.

### Adding via migration

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

If you customised the Chronicle table name, update the SQL accordingly.

### When not to add JSON indexes

Skip them when:

- your ledger is still small
- tag-based queries are rare
- most reads already use `action`, actor, subject, correlation, or time-range filters

GIN indexes improve read performance at the cost of additional disk space and write overhead.

### Practical strategy

1. Start with the package's built-in indexes
2. Measure real query patterns under load
3. Add the `tags::jsonb` GIN index only if tag filters are on a hot path
4. Add payload or metadata JSON indexes only for explicit custom predicates

## See also

- [Scalable Verification](./scalable-verification.md) — the verification modes and their cost
- [Query API](./query-api.md) — scopes and reader methods that drive these access patterns
- [Config Reference](./config-reference.md) — dedicated connection and custom table names
