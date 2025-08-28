/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import React from 'react';
// FIX: Removed functionality for custom API key management to align with guidelines.
// The API key must be exclusively managed via the `process.env.API_KEY` environment variable.
import { XMarkIcon } from './icons';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center animate-fade-in" onClick={onClose} aria-modal="true" role="dialog">
      <div className="bg-gray-800 border border-gray-700 rounded-2xl shadow-2xl shadow-blue-500/10 w-full max-w-lg m-4 p-6 text-gray-200 relative" onClick={e => e.stopPropagation()}>
        <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors" aria-label="关闭设置">
          <XMarkIcon className="w-6 h-6" />
        </button>

        <h2 className="text-2xl font-bold mb-2">API 密钥设置</h2>
        <p className="text-gray-400 mb-4">此应用程序已配置为使用通过 <code>process.env.API_KEY</code> 环境变量提供的 API 密钥。无需用户配置。</p>
        
        <div className="mt-6 flex flex-col sm:flex-row gap-4">
          <button
            onClick={onClose}
            className="flex-1 bg-gradient-to-br from-blue-600 to-blue-500 text-white font-bold py-3 px-6 rounded-lg transition-all duration-300 ease-in-out shadow-lg shadow-blue-500/20 hover:shadow-xl hover:shadow-blue-500/40 hover:-translate-y-px active:scale-95 active:shadow-inner"
          >
            关闭
          </button>
        </div>
      </div>
    </div>
  );
};

export default SettingsModal;
