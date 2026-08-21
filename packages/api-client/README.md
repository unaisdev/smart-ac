# `packages/api-client`

Cliente HTTP tipado de la API Smart AC. Lo usa la app Expo (y tests). Los componentes **no** hacen `fetch` directo.

```ts
import { SmartAcApiClient } from '@smart-ac/api-client';

const client = new SmartAcApiClient({
  baseUrl: 'http://127.0.0.1:3000',
  apiSecret: process.env.EXPO_PUBLIC_API_SECRET!,
});

await client.listAirConditioners();
```
