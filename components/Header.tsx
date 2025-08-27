/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import React from 'react';
import { SparkleIcon, CogIcon } from './icons';

interface HeaderProps {
    onSettingsClick: () => void;
}

const Header: React.FC<HeaderProps> = ({ onSettingsClick }) => {
  return (
    <header className="w-full py-4 px-4 sm:px-8 border-b border-gray-700 bg-gray-800/30 backdrop-blur-sm sticky top-0 z-50">
      <div className="w-full max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
              <SparkleIcon className="w-6 h-6 text-blue-400" />
              <h1 className="text-xl font-bold tracking-tight text-gray-100">
                Aice PS
              </h1>
          </div>
          <button
            onClick={onSettingsClick}
            className="p-2 text-gray-400 rounded-full hover:bg-white/10 hover:text-white transition-colors"
            aria-label="设置"
            title="设置"
          >
            <CogIcon className="w-6 h-6" />
          </button>
      </div>
    </header>
  );
};

export default Header;