/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import React, { useState, useEffect } from 'react';
import { setCustomApiKey, getCustomApiKey, clearCustomApiKey } from '../services/geminiService';
import { XMarkIcon } from './icons';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose }) => {
  const [apiKeyInput, setApiKeyInput] = useState('');
  const [saveStatus, setSaveStatus] = useState<'idle' | 'success' | 'cleared'>('idle');

  useEffect(() => {
    if (isOpen) {
      setApiKeyInput(getCustomApiKey());
      setSaveStatus('idle'); // Reset status when modal opens
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSave = () => {
    setCustomApiKey(apiKeyInput);
    setSaveStatus('success');
    setTimeout(() => onClose(), 1500); // Close after showing success message
  };

  const handleClear = () => {
    clearCustomApiKey();
    setApiKeyInput('');
    setSaveStatus('cleared');
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center animate-fade-in" onClick={onClose} aria-modal="true" role="dialog">
      <div className="bg-gray-800 border border-gray-700 rounded-2xl shadow-2xl shadow-blue-500/10 w-full max-w-lg m-4 p-6 text-gray-200 relative" onClick={e => e.stopPropagation()}>
        <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors" aria-label="关闭设置">
          <XMarkIcon className="w-6 h-6" />
        </button>

        <h2 className="text-2xl font-bold mb-2">API 密钥设置</h2>
        <p className="text-gray-400 mb-4">在此处提供您自己的 Google Gemini API 密钥以使用您的个人账户。如果留空，将使用应用的默认密钥。</p>
        <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:text-blue-300 transition-colors text-sm font-semibold">
          在此处获取您的 API 密钥 &rarr;
        </a>
        
        <div className="mt-6">
          <label htmlFor="api-key-input" className="block text-sm font-medium text-gray-300 mb-2">
            您的 Gemini API 密钥
          </label>
          <input
            id="api-key-input"
            type="password"
            value={apiKeyInput}
            onChange={e => setApiKeyInput(e.target.value)}
            placeholder="将您的密钥粘贴到此处"
            className="w-full bg-gray-900/50 border border-gray-600 rounded-lg p-3 focus:ring-2 focus:ring-blue-500 focus:outline-none transition"
          />
        </div>

        <div className="mt-6 flex flex-col sm:flex-row gap-4">
          <button
            onClick={handleSave}
            className="flex-1 bg-gradient-to-br from-blue-600 to-blue-500 text-white font-bold py-3 px-6 rounded-lg transition-all duration-300 ease-in-out shadow-lg shadow-blue-500/20 hover:shadow-xl hover:shadow-blue-500/40 hover:-translate-y-px active:scale-95 active:shadow-inner"
          >
            保存密钥
          </button>
          <button
            onClick={handleClear}
            disabled={!apiKeyInput}
            className="flex-1 bg-gray-700/50 hover:bg-gray-700 text-gray-300 font-bold py-3 px-6 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            清除并使用默认密钥
          </button>
        </div>

        {saveStatus === 'success' && (
          <p className="mt-4 text-center text-green-400 animate-fade-in">密钥已成功保存！</p>
        )}
        {saveStatus === 'cleared' && (
          <p className="mt-4 text-center text-yellow-400 animate-fade-in">自定义密钥已清除。应用将使用默认密钥。</p>
        )}
      </div>
    </div>
  );
};

export default SettingsModal;