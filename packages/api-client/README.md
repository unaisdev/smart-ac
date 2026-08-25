# `packages/api-client`

Cliente HTTP tipado. V1: listar aires y `setPower`. SSE opcional (compile-fix Expo).

Los componentes **no** hacen `fetch` directo.

```ts
import { SmartAcApiClient } from '@smart-ac/api-client';

const client = new SmartAcApiClient({
  baseUrl: 'http://127.0.0.1:3000',
  apiSecret: process.env.EXPO_PUBLIC_API_SECRET!,
});

await client.listAirConditioners();
await client.setPower('ac-salon', true);
```
