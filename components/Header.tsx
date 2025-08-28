/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import React from 'react';
import { SparkleIcon, GitHubIcon } from './icons';

const Header: React.FC = () => {
  return (
    <header className="w-full py-4 px-4 sm:px-8 border-b border-gray-700 bg-gray-800/30 backdrop-blur-sm sticky top-0 z-50">
      <div className="w-full max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
              <SparkleIcon className="w-6 h-6 text-blue-400" />
              <h1 className="text-xl font-bold tracking-tight text-gray-100">
                Aice PS
              </h1>
          </div>
          <div className="flex items-center gap-2">
            <a
              href="https://github.com/aigem/aice_ps"
              target="_blank"
              rel="noopener noreferrer"
              className="p-2 text-gray-400 rounded-full hover:bg-white/10 hover:text-white transition-colors"
              aria-label="GitHub Repository"
              title="GitHub Repository"
            >
              <GitHubIcon className="w-6 h-6" />
            </a>
          </div>
      </div>
    </header>
  );
};

export default Header;
