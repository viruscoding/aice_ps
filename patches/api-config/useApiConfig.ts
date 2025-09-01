/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * useApiConfig Hook - Manages API configuration state
 */

import { useState, useEffect, useCallback } from 'react';
import { getUserApiConfig, saveUserApiConfig, clearUserApiConfig, testApiConnection } from './apiKeyManager';

export interface ApiConfig {
  apiKey: string;
  baseUrl: string;
}

export interface UseApiConfigReturn {
  config: ApiConfig;
  updateConfig: (config: Partial<ApiConfig>) => void;
  clearConfig: () => void;
  testConnection: () => Promise<{ success: boolean; message: string }>;
  hasUserConfig: boolean;
  isTestingConnection: boolean;
}

export const useApiConfig = (): UseApiConfigReturn => {
  const [config, setConfig] = useState<ApiConfig>({
    apiKey: '',
    baseUrl: ''
  });
  
  const [isTestingConnection, setIsTestingConnection] = useState(false);

  // Load config from localStorage on mount
  useEffect(() => {
    const loadConfig = () => {
      const userConfig = getUserApiConfig();
      setConfig({
        apiKey: userConfig.apiKey || '',
        baseUrl: userConfig.baseUrl || ''
      });
    };

    loadConfig();

    // Listen for config updates from other components
    const handleConfigUpdate = () => {
      loadConfig();
    };

    window.addEventListener('apiConfigUpdated', handleConfigUpdate);
    return () => {
      window.removeEventListener('apiConfigUpdated', handleConfigUpdate);
    };
  }, []);

  // Update configuration
  const updateConfig = useCallback((updates: Partial<ApiConfig>) => {
    const newConfig = { ...config, ...updates };
    setConfig(newConfig);
    
    // Save to localStorage
    saveUserApiConfig({
      apiKey: newConfig.apiKey || undefined,
      baseUrl: newConfig.baseUrl || undefined
    });
  }, [config]);

  // Clear all configuration
  const clearConfig = useCallback(() => {
    setConfig({ apiKey: '', baseUrl: '' });
    clearUserApiConfig();
  }, []);

  // Test API connection
  const testConnection = useCallback(async () => {
    setIsTestingConnection(true);
    try {
      const result = await testApiConnection(config.apiKey, config.baseUrl);
      return result;
    } finally {
      setIsTestingConnection(false);
    }
  }, [config.apiKey, config.baseUrl]);

  // Check if user has custom configuration
  const hasUserConfig = Boolean(config.apiKey || config.baseUrl);

  return {
    config,
    updateConfig,
    clearConfig,
    testConnection,
    hasUserConfig,
    isTestingConnection
  };
};