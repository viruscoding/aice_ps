/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * FloatingConfigButton - Floating button to open API configuration panel
 */

import React, { useState, useEffect } from 'react';
import { getUserApiConfig } from './apiKeyManager';
import ApiConfigPanel from './ApiConfigPanel';

const FloatingConfigButton: React.FC = () => {
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const [hasUserConfig, setHasUserConfig] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  // Check for user configuration
  useEffect(() => {
    const checkConfig = () => {
      const config = getUserApiConfig();
      setHasUserConfig(Boolean(config.apiKey || config.baseUrl));
    };

    checkConfig();

    // Listen for configuration updates
    const handleConfigUpdate = () => {
      checkConfig();
    };

    // Listen for keyboard shortcut (Ctrl+Shift+K)
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.shiftKey && e.key === 'K') {
        e.preventDefault();
        setIsPanelOpen(true);
      }
    };

    window.addEventListener('apiConfigUpdated', handleConfigUpdate);
    window.addEventListener('keydown', handleKeyDown);
    
    return () => {
      window.removeEventListener('apiConfigUpdated', handleConfigUpdate);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  return (
    <>
      {/* Floating Button */}
      <div className="fixed bottom-6 right-6 z-40">
        <button
          onClick={() => setIsPanelOpen(true)}
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
          className={`
            group relative flex items-center justify-center w-14 h-14 rounded-full
            bg-gradient-to-br from-gray-700 to-gray-800 
            border-2 transition-all duration-300
            hover:scale-110 hover:shadow-xl active:scale-95
            ${hasUserConfig 
              ? 'border-blue-500 shadow-lg shadow-blue-500/30' 
              : 'border-gray-600 shadow-lg shadow-black/30'
            }
          `}
          aria-label="API 配置"
        >
          {/* Key Icon */}
          <svg 
            className={`w-6 h-6 transition-colors ${hasUserConfig ? 'text-blue-400' : 'text-gray-400'}`}
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            <path 
              strokeLinecap="round" 
              strokeLinejoin="round" 
              strokeWidth={2} 
              d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" 
            />
          </svg>

          {/* Status Indicator */}
          {hasUserConfig && (
            <span className="absolute top-0 right-0 flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-blue-500"></span>
            </span>
          )}

          {/* Tooltip */}
          {isHovered && (
            <div className="absolute bottom-full right-0 mb-2 pointer-events-none">
              <div className="bg-gray-900 text-white text-xs rounded-lg py-2 px-3 whitespace-nowrap border border-gray-700">
                <div className="font-semibold mb-1">API 配置</div>
                <div className="text-gray-400">
                  {hasUserConfig ? '使用自定义配置' : '使用默认配置'}
                </div>
                {/* Arrow */}
                <div className="absolute top-full right-4 transform -translate-y-1">
                  <div className="w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900"></div>
                </div>
              </div>
            </div>
          )}
        </button>

        {/* Keyboard Shortcut Hint */}
        <div className="absolute -top-8 right-0 text-xs text-gray-500 opacity-0 group-hover:opacity-100 transition-opacity">
          <kbd className="px-2 py-1 bg-gray-800 border border-gray-700 rounded">Ctrl+Shift+K</kbd>
        </div>
      </div>

      {/* Configuration Panel */}
      <ApiConfigPanel 
        isOpen={isPanelOpen} 
        onClose={() => setIsPanelOpen(false)} 
      />
    </>
  );
};

export default FloatingConfigButton;