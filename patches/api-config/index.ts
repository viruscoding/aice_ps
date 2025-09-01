/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * API Config Addon - Unified exports
 * This addon provides user-configurable API key and base URL support
 */

// Export the proxy GoogleGenAI class and all types from @google/genai
export { GoogleGenAI } from './apiKeyManager';
export * from '@google/genai';

// Export the floating config button component (main UI entry point)
export { default as FloatingConfigButton } from './FloatingConfigButton';

// Export configuration utilities (if needed by other parts of the app)
export { 
  getUserApiConfig, 
  saveUserApiConfig, 
  clearUserApiConfig,
  testApiConnection 
} from './apiKeyManager';

// Export the hook (if needed by other parts of the app)
export { useApiConfig } from './useApiConfig';
export type { ApiConfig, UseApiConfigReturn } from './useApiConfig';