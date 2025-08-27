/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import React from 'react';
import { MagicWandIcon } from './icons';

interface ErasePanelProps {
  onRemoveBackground: () => void;
  isLoading: boolean;
}

const ErasePanel: React.FC<ErasePanelProps> = ({ onRemoveBackground, isLoading }) => {
  return (
    <div className="w-full bg-gray-800/50 border border-gray-700 rounded-lg p-4 flex flex-col items-center gap-4 animate-fade-in backdrop-blur-sm">
      <h3 className="text-lg font-semibold text-gray-300">智能抠图</h3>
      <p className="text-sm text-gray-400 -mt-2">自动移除图片背景。非常适合创建透明的PNG图像。</p>
      
      <button
        onClick={onRemoveBackground}
        disabled={isLoading}
        className="w-full max-w-xs mt-2 bg-gradient-to-br from-green-600 to-green-500 text-white font-bold py-4 px-6 rounded-lg transition-all duration-300 ease-in-out shadow-lg shadow-green-500/20 hover:shadow-xl hover:shadow-green-500/40 hover:-translate-y-px active:scale-95 active:shadow-inner text-base disabled:from-green-800 disabled:to-green-700 disabled:shadow-none disabled:cursor-not-allowed disabled:transform-none flex items-center justify-center gap-3"
      >
        <MagicWandIcon className="w-6 h-6" />
        移除背景
      </button>
    </div>
  );
};

export default ErasePanel;
