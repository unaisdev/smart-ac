import { SmartAcApiClient } from '@smart-ac/api-client';

import { apiConfig } from './api-config';

export const apiClient = new SmartAcApiClient({
  baseUrl: apiConfig.baseUrl,
  apiSecret: apiConfig.apiSecret,
});
