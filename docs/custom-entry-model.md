---
title: Custom Entry Model
---

# Custom Entry Model

Since v1.13, the Eloquent model Chronicle reads and verifies is resolvable from config. Point Chronicle at a subclass of `Chronicle\Entry\Entry` to add accessors, relationships, casts, or query scopes - without losing any integrity guarantee.

```php
// config/chronicle.php
'models' => [
    'entry' => \App\Models\AuditEntry::class,
],
```

```php
namespace App\Models;

use Chronicle\Entry\Entry;

class AuditEntry extends Entry
{
    public function tenant()
    {
        return $this->belongsTo(Tenant::class, 'subject_id');
    }
}
```

With no `models.entry` set, Chronicle uses `Chronicle\Entry\Entry` and behaves exactly as before.

## Honored end-to-end

The override is resolved through a single seam (`Chronicle::entryModel()` / `Chronicle::newEntryQuery()`) that is used everywhere the ledger is read - the query API, the ledger reader, and all three verifiers (`EntryVerifier`, `IntegrityVerifier`, `CheckpointChainVerifier`) - as well as the storage drivers and the entry-touching console commands. Verification of a custom model produces the same result as the base model.

## The override must extend `Entry`

The configured class **must** be a subclass of `Chronicle\Entry\Entry`. Chronicle validates this when resolving the model and throws `Chronicle\Exceptions\InvalidEntryModelException` otherwise, so immutability (mutations throw `ImmutabilityViolationException`) and the hash-chain contract are always preserved.

:::warning
Do not change the table, casts, or hashing behaviour in a subclass. The chain hash is computed over the canonical payload - altering how columns are cast or stored will make existing entries fail verification. Subclasses are for *additive* behaviour (relations, accessors, scopes), not for changing what is stored or how it is hashed.
:::

## See also

- [Data Model](./data-model.md) - the entry schema and immutability
- [Extending Chronicle](./extending-chronicle.md) - the package's extension points
- [Config Reference](./config-reference.md#modelsentry) - the `models.entry` key
