---
title: Validation
---

# Validation

Chronicle ships with a built-in validation layer that runs before entries are hashed, chained, or persisted. All validators are implemented as entry extensions operating in the `VALIDATE` stage.

## How it works

Validation is not a separate pipeline. Validators are extensions registered at the `VALIDATE` stage — the first stage to run, before `RESOLVE_CONTEXT`, `POLICY`, and `PROCESS`. They use negative priorities so they execute before any other extensions you register.

```text
VALIDATE stage
↓  ActorPresenceValidator  (priority -200)
↓  SubjectValidator        (priority -150)
↓  ActionValidator         (priority -100)
↓  CorrelationValidator    (priority  -95)
↓  TagLimitValidator       (priority  -80)
↓  TagsValidator           (priority  -75)
↓  DiffStructureValidator  (priority  -60)
↓  PayloadSerializableValidator (priority -50)
↓  PayloadSizeValidator    (priority  -40)
↓
RESOLVE_CONTEXT stage
↓  your extensions...
↓
POLICY stage
↓  your extensions...
↓
PROCESS stage
↓  your extensions...
↓
CanonicalizePayload → HashPayload → ChainHashEntry → PersistEntry
```

If any validator throws, the entry is rejected and nothing is written to the ledger.

## Built-in validators

| Validator | What it checks | Throws |
|-----------|----------------|--------|
| `ActorPresenceValidator` | `actor_type` and `actor_id` are non-blank strings | `MissingActorException` |
| `SubjectValidator` | `subject_type` and `subject_id` are present (waived for `actor_type = 'system'`) | `MissingSubjectException` |
| `ActionValidator` | `action` is a string, uses dot notation, within max length | `InvalidActionException` |
| `CorrelationValidator` | `correlation_id`, when set, is a non-blank string within max length | `InvalidCorrelationIdException` |
| `TagLimitValidator` | Number of tags does not exceed the configured limit | `InvalidTagsException` |
| `TagsValidator` | Each tag is a non-empty, unique string within max length | `InvalidTagsException` |
| `DiffStructureValidator` | Diff has `{key: {old: X, new: Y}}` shape; values are serializable | `InvalidDiffException` |
| `PayloadSerializableValidator` | `metadata`, `context`, and `diff` contain no closures, resources, objects, or non-finite floats | `UnserializablePayloadException` |
| `PayloadSizeValidator` | Combined serialized byte size of `metadata`, `context`, and `diff` is within the limit | `InvalidPayloadSizeException` |

## Enabling and disabling validators

All built-in validators are registered in the `extensions` array inside `config/chronicle.php`. To disable a validator, remove it from the array.

```php
'extensions' => [
    ActorPresenceValidator::class,
    SubjectValidator::class,
    ActionValidator::class,
    CorrelationValidator::class,
    TagLimitValidator::class,
    TagsValidator::class,
    DiffStructureValidator::class,
    PayloadSerializableValidator::class,
    PayloadSizeValidator::class,
],
```

For example, to remove the payload size limit:

```php
'extensions' => [
    ActorPresenceValidator::class,
    SubjectValidator::class,
    ActionValidator::class,
    CorrelationValidator::class,
    TagLimitValidator::class,
    TagsValidator::class,
    DiffStructureValidator::class,
    PayloadSerializableValidator::class,
    // PayloadSizeValidator::class removed
],
```

:::caution
`ActorPresenceValidator` and `SubjectValidator` enforce the data model guarantees that the rest of the ledger relies on. Removing them is strongly discouraged in production.
:::

## Configuration

The `validation` block in `config/chronicle.php` controls the configurable limits:

```php
'validation' => [
    'action_max_length'        => env('CHRONICLE_ACTION_MAX_LENGTH', 255),
    'tag_max_length'           => env('CHRONICLE_TAG_MAX_LENGTH', 50),
    'tag_limit'                => env('CHRONICLE_TAG_LIMIT', 10),
    'correlation_id_max_length' => env('CHRONICLE_CORRELATION_ID_MAX_LENGTH', 255),
    'max_payload_size'         => env('CHRONICLE_MAX_PAYLOAD_SIZE', 65536),
],
```

| Key | Environment variable | Default | Description |
|-----|----------------------|---------|-------------|
| `action_max_length` | `CHRONICLE_ACTION_MAX_LENGTH` | `255` | Maximum byte length of the `action` string |
| `tag_max_length` | `CHRONICLE_TAG_MAX_LENGTH` | `50` | Maximum character length of a single tag (measured in UTF-8 characters) |
| `tag_limit` | `CHRONICLE_TAG_LIMIT` | `10` | Maximum number of tags per entry |
| `correlation_id_max_length` | `CHRONICLE_CORRELATION_ID_MAX_LENGTH` | `255` | Maximum character length of a `correlation_id` (measured in UTF-8 characters) |
| `max_payload_size` | `CHRONICLE_MAX_PAYLOAD_SIZE` | `65536` | Maximum byte size of the combined serialized `metadata`, `context`, and `diff` (64 KB) |

### Action format

`ActionValidator` enforces dot notation in addition to the length limit. A valid action contains exactly one dot and no whitespace:

```
user.created     ✓
order.item.added ✗  (two dots)
user created     ✗  (whitespace)
created          ✗  (no dot)
```

### Payload size measurement

`PayloadSizeValidator` measures `strlen(json_encode(['metadata' => ..., 'context' => ..., 'diff' => ...]))`. It runs after `PayloadSerializableValidator` so the payload is guaranteed to be encodable before size is checked.

## Custom validators

A custom validator is a standard entry extension set to the `VALIDATE` stage. Use negative priority values below -200 to run before the built-in validators, or above -40 to run after them.

### Example: enforcing a required metadata key

```php
<?php

namespace App\Chronicle;

use Chronicle\Contracts\EntryExtension;
use Chronicle\Contracts\PrioritizedEntryExtension;
use Chronicle\Entry\PendingEntry;
use Chronicle\Pipeline\ExtensionStage;

final class RequireRequestIdValidator implements EntryExtension, PrioritizedEntryExtension
{
    public function stage(): ExtensionStage
    {
        return ExtensionStage::VALIDATE;
    }

    public function priority(): int
    {
        // Runs after all built-in validators.
        return 0;
    }

    public function process(PendingEntry $entry): PendingEntry
    {
        $metadata = $entry->attribute('metadata');

        if (! is_array($metadata) || empty($metadata['request_id'])) {
            throw new \RuntimeException('Audit entries must include metadata.request_id.');
        }

        return $entry;
    }
}
```

Register it in `config/chronicle.php`:

```php
'extensions' => [
    // built-in validators...
    ActorPresenceValidator::class,
    SubjectValidator::class,
    ActionValidator::class,
    CorrelationValidator::class,
    TagLimitValidator::class,
    TagsValidator::class,
    DiffStructureValidator::class,
    PayloadSerializableValidator::class,
    PayloadSizeValidator::class,

    // your custom validator
    \App\Chronicle\RequireRequestIdValidator::class,
],
```

Or register at runtime:

```php
use Chronicle\Facades\Chronicle;

Chronicle::extendEntry(\App\Chronicle\RequireRequestIdValidator::class);
```

### Implementing `PrioritizedEntryExtension`

If ordering relative to other extensions in the `VALIDATE` stage matters, implement `Chronicle\Contracts\PrioritizedEntryExtension` and return a priority value from `priority()`. Lower values run earlier.

| Range | Meaning |
|-------|---------|
| below `-200` | Runs before all built-in validators |
| `-200` to `-40` | Interleaved with built-in validators |
| `0` and above | Runs after all built-in validators |

Without `PrioritizedEntryExtension`, the extension sorts after all prioritized ones within the same stage.

### Throwing the right exception

Chronicle's built-in validators each throw a dedicated exception class. For custom validators, any `Throwable` propagates up and aborts the commit — Chronicle does not catch or wrap it. Use a domain-specific exception class so callers can distinguish validation rejections from infrastructure failures.

## Relation to `EntryBuilder` validation

`EntryBuilder` performs a lightweight presence check on `actor`, `action`, and `subject` before the entry reaches the extension pipeline. The pipeline validators go further:

- `ActorPresenceValidator` checks that the resolved `actor_type` and `actor_id` strings are non-blank.
- `ActionValidator` enforces format and length after the builder has accepted the value.
- `SubjectValidator` re-checks the resolved subject fields with the `system` actor exemption.

Both layers are intentional. The builder gives early feedback during development; the validators enforce invariants regardless of how the entry was constructed.
