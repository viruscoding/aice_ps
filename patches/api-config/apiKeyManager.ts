/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * API Key Manager - Proxy layer for GoogleGenAI
 * Provides user-configurable API key and base URL support
 */

import { GoogleGenAI as OriginalGoogleGenAI } from "@google/genai";

// Storage keys
const STORAGE_KEYS = {
  API_KEY: 'gemini_api_key',
  BASE_URL: 'gemini_base_url'
};

// Default base URL for Gemini API
const DEFAULT_BASE_URL = 'https://generativelanguage.googleapis.com';

// Get user configuration from localStorage
export const getUserApiConfig = () => {
  return {
    apiKey: localStorage.getItem(STORAGE_KEYS.API_KEY),
    baseUrl: localStorage.getItem(STORAGE_KEYS.BASE_URL)
  };
};

// Save user configuration to localStorage
export const saveUserApiConfig = (config: { apiKey?: string; baseUrl?: string }) => {
  if (config.apiKey !== undefined) {
    if (config.apiKey) {
      localStorage.setItem(STORAGE_KEYS.API_KEY, config.apiKey);
    } else {
      localStorage.removeItem(STORAGE_KEYS.API_KEY);
    }
  }
  
  if (config.baseUrl !== undefined) {
    if (config.baseUrl) {
      localStorage.setItem(STORAGE_KEYS.BASE_URL, config.baseUrl);
    } else {
      localStorage.removeItem(STORAGE_KEYS.BASE_URL);
    }
  }
  
  // Dispatch event to notify configuration change
  window.dispatchEvent(new Event('apiConfigUpdated'));
};

// Clear all user configuration
export const clearUserApiConfig = () => {
  localStorage.removeItem(STORAGE_KEYS.API_KEY);
  localStorage.removeItem(STORAGE_KEYS.BASE_URL);
  window.dispatchEvent(new Event('apiConfigUpdated'));
};

// Cached instance to avoid recreation
let cachedInstance: OriginalGoogleGenAI | null = null;
let lastConfig: { apiKey: string; baseUrl?: string } | null = null;

// Proxy class that extends the original GoogleGenAI
export class GoogleGenAI extends OriginalGoogleGenAI {
  constructor(config: { apiKey?: string; httpOptions?: any }) {
    const userConfig = getUserApiConfig();
    
    // Use user's API key if available, otherwise fall back to system key
    const finalApiKey = userConfig.apiKey || config.apiKey || '';
    
    // Prepare final configuration with proper type
    // Pass the API key as-is, let the original SDK handle validation
    const finalConfig: any = { 
      apiKey: finalApiKey || config.apiKey  // Preserve original behavior when no user config
    };
    
    // Apply custom base URL if provided
    if (userConfig.baseUrl) {
      // Use httpOptions.baseUrl as per SDK documentation
      finalConfig.httpOptions = {
        ...(config.httpOptions || {}),
        baseUrl: userConfig.baseUrl
      };
    } else if (config.httpOptions) {
      // Preserve any existing httpOptions
      finalConfig.httpOptions = config.httpOptions;
    }
    
    // Check if we can reuse cached instance
    const configKey = JSON.stringify({ 
      apiKey: finalApiKey, 
      baseUrl: userConfig.baseUrl || config.httpOptions?.baseUrl 
    });
    
    if (cachedInstance && lastConfig && JSON.stringify(lastConfig) === configKey) {
      return cachedInstance as any;
    }
    
    // Create new instance
    super(finalConfig);
    
    // Cache the instance
    cachedInstance = this;
    lastConfig = { 
      apiKey: finalApiKey, 
      baseUrl: userConfig.baseUrl || config.httpOptions?.baseUrl 
    };
  }
}

// Listen for configuration updates to clear cache
if (typeof window !== 'undefined') {
  window.addEventListener('apiConfigUpdated', () => {
    cachedInstance = null;
    lastConfig = null;
  });
}

// Re-export everything from the original module
export * from "@google/genai";

// Test connection function
export const testApiConnection = async (apiKey?: string, baseUrl?: string): Promise<{ success: boolean; message: string }> => {
  try {
    const testApiKey = apiKey || getUserApiConfig().apiKey || process.env.API_KEY || '';
    
    if (!testApiKey) {
      return { success: false, message: '未提供 API 密钥' };
    }
    
    // Prepare configuration with httpOptions for base URL
    const testConfig: any = {
      apiKey: testApiKey
    };
    
    // Apply base URL if provided
    if (baseUrl) {
      testConfig.httpOptions = {
        baseUrl: baseUrl
      };
    }
    
    const ai = new OriginalGoogleGenAI(testConfig);
    
    // Use the models API to generate content
    const result = await ai.models.generateContent({
      model: 'gemini-2.0-flash-exp',
      contents: { 
        parts: [{ text: 'Hi, please respond with "OK" if you can read this.' }]
      }
    });
    
    // Check if we got a valid response
    if (result && result.text) {
      return { success: true, message: '连接成功' };
    } else {
      return { success: false, message: '连接失败：无响应' };
    }
  } catch (error: any) {
    let message = '连接失败：';
    if (error.message?.includes('API key not valid')) {
      message += 'API 密钥无效';
    } else if (error.message?.includes('network')) {
      message += '网络错误';
    } else if (error.message?.includes('404')) {
      message += '模型不可用';
    } else if (error.message?.includes('fetch')) {
      message += '无法访问指定的 URL';
    } else {
      message += error.message || '未知错误';
    }
    return { success: false, message };
  }
};