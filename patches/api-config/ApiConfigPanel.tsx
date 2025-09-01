/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * ApiConfigPanel - Configuration panel for API settings
 */

import React, { useState, useEffect } from 'react';
import { useApiConfig } from './useApiConfig';
import { XMarkIcon } from '../../components/icons';
import Spinner from '../../components/Spinner';

interface ApiConfigPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

const ApiConfigPanel: React.FC<ApiConfigPanelProps> = ({ isOpen, onClose }) => {
  const { config, updateConfig, clearConfig, testConnection, hasUserConfig, isTestingConnection } = useApiConfig();
  
  const [localConfig, setLocalConfig] = useState(config);
  const [showApiKey, setShowApiKey] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

  // Sync local state with hook state
  useEffect(() => {
    setLocalConfig(config);
  }, [config]);

  // Reset test result when panel opens
  useEffect(() => {
    if (isOpen) {
      setTestResult(null);
    }
  }, [isOpen]);

  const handleSave = () => {
    updateConfig(localConfig);
    onClose();
  };

  const handleClear = () => {
    setLocalConfig({ apiKey: '', baseUrl: '' });
    clearConfig();
    setTestResult(null);
  };

  const handleTest = async () => {
    // Save current config temporarily for testing
    updateConfig(localConfig);
    const result = await testConnection();
    setTestResult(result);
  };

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center animate-fade-in" 
      onClick={onClose}
      aria-modal="true" 
      role="dialog"
    >
      <div 
        className="bg-gray-800 border border-gray-700 rounded-2xl shadow-2xl shadow-blue-500/10 w-full max-w-2xl m-4 p-6 text-gray-200 relative max-h-[90vh] overflow-y-auto" 
        onClick={e => e.stopPropagation()}
      >
        <button 
          onClick={onClose} 
          className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors" 
          aria-label="关闭配置"
        >
          <XMarkIcon className="w-6 h-6" />
        </button>

        <h2 className="text-2xl font-bold mb-2">API 配置</h2>
        <p className="text-gray-400 mb-6">
          配置您的 Gemini API 密钥和自定义端点。留空将使用系统默认配置。
        </p>

        <div className="space-y-6">
          {/* API Key Input */}
          <div>
            <label className="block text-sm font-medium mb-2">
              API 密钥
              <span className="text-gray-500 ml-2 text-xs font-normal">
                (可选 - 留空使用默认密钥)
              </span>
            </label>
            <div className="relative">
              <input
                type={showApiKey ? "text" : "password"}
                value={localConfig.apiKey}
                onChange={(e) => setLocalConfig({ ...localConfig, apiKey: e.target.value })}
                placeholder="AIzaSy..."
                className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-blue-500 pr-20 font-mono text-sm"
              />
              <button
                type="button"
                onClick={() => setShowApiKey(!showApiKey)}
                className="absolute right-2 top-1/2 -translate-y-1/2 px-3 py-1 text-xs text-gray-400 hover:text-white transition-colors"
              >
                {showApiKey ? '隐藏' : '显示'}
              </button>
            </div>
            <p className="text-xs text-gray-500 mt-2">
              从 <a 
                href="https://aistudio.google.com/apikey" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-blue-400 hover:text-blue-300 underline"
              >
                Google AI Studio
              </a> 获取您的 API 密钥
            </p>
          </div>

          {/* Base URL Input */}
          <div>
            <label className="block text-sm font-medium mb-2">
              API 端点 URL
              <span className="text-gray-500 ml-2 text-xs font-normal">
                (可选 - 用于代理或自定义端点)
              </span>
            </label>
            <input
              type="text"
              value={localConfig.baseUrl}
              onChange={(e) => setLocalConfig({ ...localConfig, baseUrl: e.target.value })}
              placeholder="https://generativelanguage.googleapis.com"
              className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-blue-500 font-mono text-sm"
            />
            <p className="text-xs text-gray-500 mt-2">
              默认: https://generativelanguage.googleapis.com
            </p>
          </div>

          {/* Test Connection */}
          <div className="border-t border-gray-700 pt-6">
            <button
              onClick={handleTest}
              disabled={isTestingConnection || (!localConfig.apiKey && !localConfig.baseUrl)}
              className="w-full bg-gradient-to-br from-green-600 to-green-500 text-white font-bold py-3 px-6 rounded-lg transition-all duration-300 ease-in-out shadow-lg shadow-green-500/20 hover:shadow-xl hover:shadow-green-500/40 hover:-translate-y-px active:scale-95 active:shadow-inner disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isTestingConnection ? (
                <>
                  <Spinner className="w-5 h-5" />
                  <span>测试中...</span>
                </>
              ) : (
                <span>测试连接</span>
              )}
            </button>
            
            {testResult && (
              <div className={`mt-4 p-4 rounded-lg ${testResult.success ? 'bg-green-900/30 border border-green-700' : 'bg-red-900/30 border border-red-700'}`}>
                <p className={`text-sm ${testResult.success ? 'text-green-400' : 'text-red-400'}`}>
                  {testResult.success ? '✓' : '✗'} {testResult.message}
                </p>
              </div>
            )}
          </div>

          {/* Current Status */}
          <div className="border-t border-gray-700 pt-6">
            <h3 className="text-sm font-medium mb-3 text-gray-300">当前状态</h3>
            <div className="bg-gray-900/50 rounded-lg p-4 space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-400">配置来源:</span>
                <span className="text-white">
                  {hasUserConfig ? '用户自定义' : '系统默认'}
                </span>
              </div>
              {localConfig.apiKey && (
                <div className="flex justify-between">
                  <span className="text-gray-400">API 密钥:</span>
                  <span className="text-white font-mono">
                    {localConfig.apiKey.substring(0, 10)}...
                  </span>
                </div>
              )}
              {localConfig.baseUrl && (
                <div className="flex justify-between">
                  <span className="text-gray-400">端点:</span>
                  <span className="text-white text-xs truncate max-w-xs">
                    {localConfig.baseUrl}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Info Box */}
          <div className="bg-blue-900/20 border border-blue-700/50 rounded-lg p-4">
            <h4 className="text-sm font-semibold text-blue-400 mb-2">使用说明</h4>
            <ul className="text-xs text-gray-300 space-y-1 list-disc list-inside">
              <li>您的配置将保存在浏览器本地存储中</li>
              <li>配置不会上传到任何服务器</li>
              <li>清除配置后将恢复使用系统默认设置</li>
              <li>如需使用代理，请在 Base URL 中填入代理地址</li>
            </ul>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="mt-8 flex flex-col sm:flex-row gap-4">
          <button
            onClick={handleClear}
            className="flex-1 bg-gray-700 text-white font-bold py-3 px-6 rounded-lg hover:bg-gray-600 transition-colors"
          >
            清除配置
          </button>
          <button
            onClick={onClose}
            className="flex-1 bg-gray-700 text-white font-bold py-3 px-6 rounded-lg hover:bg-gray-600 transition-colors"
          >
            取消
          </button>
          <button
            onClick={handleSave}
            className="flex-1 bg-gradient-to-br from-blue-600 to-blue-500 text-white font-bold py-3 px-6 rounded-lg transition-all duration-300 ease-in-out shadow-lg shadow-blue-500/20 hover:shadow-xl hover:shadow-blue-500/40 hover:-translate-y-px active:scale-95 active:shadow-inner"
          >
            保存配置
          </button>
        </div>
      </div>
    </div>
  );
};

export default ApiConfigPanel;