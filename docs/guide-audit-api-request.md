---
title: Audit an Incoming API Request
---

# Audit an Incoming API Request

Record an audit entry for an API action and automatically attach request context (IP, URL, request id).

## 1. Record the entry in your controller

```php
use Chronicle\Facades\Chronicle;

class OrderController extends Controller
{
    public function store(StoreOrderRequest $request): JsonResponse
    {
        $order = Order::create($request->validated());

        Chronicle::record()
            ->actor($request->user())
            ->action('order.created')
            ->subject($order)
            ->metadata(['total' => $order->total, 'currency' => $order->currency])
            ->tags(['orders', 'api'])
            ->commit();

        return response()->json($order, 201);
    }
}
```

## 2. Enable automatic request context (optional)

Uncomment `RequestContextResolver` in `config/chronicle.php` to attach IP address, URL, method, and request id to every entry automatically:

```php
'extensions' => [
    // built-in validators...
    \Chronicle\Context\RequestContextResolver::class,
],
```

Every entry recorded during an HTTP request will then include:

```json
"context": {
  "request": {
    "ip_address": "203.0.113.42",
    "user_agent": "MyApp/1.0",
    "url": "https://app.example.com/api/orders",
    "method": "POST",
    "request_id": "01JNV8..."
  }
}
```

Sensitive query parameters (`password`, `token`, `secret`, etc.) are redacted automatically.

## 3. Pass a correlation id for multi-step flows (optional)

```php
Chronicle::transaction(function () use ($request, $order) {
    Chronicle::record()
        ->actor($request->user())
        ->action('order.created')
        ->subject($order)
        ->commit();

    Chronicle::record()
        ->actor($request->user())
        ->action('payment.initiated')
        ->subject($order)
        ->commit();
});
```

## Verify it worked

```bash
php artisan chronicle:show <ULID>
```

Or query directly:

```php
\Chronicle\Entry\Entry::query()
    ->action('order.created')
    ->latestFirst()
    ->first();
```

## See also

- [Recording Entries](./recording-entries.md) - full `EntryBuilder` API
- [Context Resolvers](./context-resolvers.md) - built-in context resolvers
- [Transactions](./transactions.md) - grouping entries under a correlation id
