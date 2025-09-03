/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import React, { useState, useEffect } from 'react';
import { UploadIcon, PaintBrushIcon } from './icons';
import { generateImageFromText } from '../services/geminiService';
import Spinner from './Spinner';

interface StartScreenProps {
  onFileSelect: (files: FileList | null) => void;
  onImageGenerated: (dataUrl: string) => void;
}

const StartScreen: React.FC<StartScreenProps> = ({ onFileSelect, onImageGenerated }) => {
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const [generationPrompt, setGenerationPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationError, setGenerationError] = useState<string|null>(null);
  const [aspectRatio, setAspectRatio] = useState<'1:1' | '16:9' | '9:16' | '4:3' | '3:4'>('1:1');

  useEffect(() => {
    const handlePaste = (event: ClipboardEvent) => {
      // Check if the event target is an input or textarea to avoid hijacking paste.
      const target = event.target as HTMLElement;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')) {
        return;
      }

      if (event.clipboardData && event.clipboardData.files.length > 0) {
        const file = event.clipboardData.files[0];
        if (file.type.startsWith('image/')) {
          onFileSelect(event.clipboardData.files);
        }
      }
    };

    window.addEventListener('paste', handlePaste);

    return () => {
      window.removeEventListener('paste', handlePaste);
    };
  }, [onFileSelect]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onFileSelect(e.target.files);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDraggingOver(false);
    onFileSelect(e.dataTransfer.files);
  };

  const handleGenerate = async () => {
    if (!generationPrompt.trim()) {
        setGenerationError("请输入描述内容。");
        return;
    }
    setIsGenerating(true);
    setGenerationError(null);
    try {
        const dataUrl = await generateImageFromText(generationPrompt, aspectRatio);
        onImageGenerated(dataUrl);
    } catch (e) {
        console.error(e);
        setGenerationError(e instanceof Error ? e.message : '生成图像时发生未知错误。');
    } finally {
        setIsGenerating(false);
    }
  };

  const aspectRatios: { name: string; value: typeof aspectRatio }[] = [
    { name: '方形', value: '1:1' },
    { name: '横向', value: '16:9' },
    { name: '纵向', value: '9:16' },
    { name: '风景', value: '4:3' },
    { name: '肖像', value: '3:4' },
  ];

  return (
    <div className="flex flex-col items-center gap-6 animate-fade-in w-full max-w-5xl mx-auto text-center p-4 sm:p-8">
      <h1 className="text-5xl font-extrabold tracking-tight text-gray-100 sm:text-6xl md:text-7xl">
        Nano Banana <span className="text-blue-400">化繁为简</span>
      </h1>
      <div className="max-w-2xl text-lg text-gray-400 md:text-xl flex flex-col gap-2">
        <h3 className="text-3xl font-extrabold tracking-tight text-gray-100 sm:text-4xl md:text-5xl">至强改图模型&超好用应用</h3>
        <p className="font-semibold text-yellow-300">用AiStudio后台API免费用,也可自行部署（Gemini API兼容）</p>
      </div>
      
      <div className="w-full max-w-4xl mt-8 grid grid-cols-1 md:grid-cols-2 gap-6 items-stretch">
        
        {/* Generation Column */}
        <div className="p-6 sm:p-8 bg-gray-800/30 border-2 border-gray-700/50 rounded-2xl backdrop-blur-sm flex flex-col text-left">
            <div className="flex flex-col gap-4 h-full">
                <h2 className="text-2xl font-bold text-gray-100 text-center">用 AI <span className="text-purple-400">创造图像</span></h2>
                <textarea
                    value={generationPrompt}
                    onChange={(e) => setGenerationPrompt(e.target.value)}
                    placeholder="例如，“一只戴着宇航员头盔的小狗漂浮在多彩的星云中，数字艺术”"
                    className="w-full bg-gray-800 border border-gray-600 text-gray-200 rounded-lg p-4 focus:ring-2 focus:ring-purple-500 focus:outline-none transition text-base h-28 resize-none disabled:opacity-60"
                    disabled={isGenerating}
                />
                <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-medium text-gray-400 mr-2">宽高比:</span>
                    {aspectRatios.map(({ name, value }) => (
                        <button
                            key={value}
                            onClick={() => setAspectRatio(value)}
                            disabled={isGenerating}
                            className={`px-3 py-1.5 rounded-md text-sm font-semibold transition-all duration-200 active:scale-95 disabled:opacity-50 ${
                                aspectRatio === value
                                ? 'bg-gradient-to-br from-purple-600 to-purple-500 text-white shadow-md shadow-purple-500/20' 
                                : 'bg-white/10 hover:bg-white/20 text-gray-200'
                            }`}
                        >
                            {name}
                        </button>
                    ))}
                </div>
                {generationError && (
                    <div className="bg-red-500/20 border border-red-500 text-red-300 px-4 py-2 rounded-lg text-center text-sm" role="alert">
                        {generationError}
                    </div>
                )}
                <div className="flex-grow"></div> {/* Spacer */}
                <button
                    onClick={handleGenerate}
                    disabled={isGenerating}
                    className="relative w-full inline-flex items-center justify-center px-8 py-4 text-lg font-bold text-white bg-purple-600 rounded-full cursor-pointer group hover:bg-purple-500 transition-colors disabled:bg-purple-800 disabled:cursor-not-allowed"
                >
                    {isGenerating ? (
                        <>
                            <Spinner className="w-6 h-6 mr-3" />
                            正在生成中...
                        </>
                    ) : (
                        <>
                            <PaintBrushIcon className="w-6 h-6 mr-3" />
                            生成图片
                        </>
                    )}
                </button>
            </div>
        </div>
        
        {/* Upload Column */}
        <div
          className={`group p-6 sm:p-8 bg-gray-800/30 border-2 rounded-2xl backdrop-blur-sm flex flex-col justify-center items-center cursor-pointer transition-all duration-300 ${isDraggingOver ? 'bg-blue-500/20 border-dashed border-blue-400' : 'border-gray-700/50 hover:border-blue-500/50'}`}
          onClick={() => document.getElementById('image-upload-start')?.click()}
          onDragOver={(e) => { e.preventDefault(); setIsDraggingOver(true); }}
          onDragLeave={() => setIsDraggingOver(false)}
          onDrop={handleDrop}
        >
          <div className="flex flex-col items-center gap-4 text-center">
            <div className="relative w-full inline-flex items-center justify-center px-10 py-4 text-lg font-bold text-white bg-blue-600 rounded-full cursor-pointer group-hover:bg-blue-500 transition-colors">
                <UploadIcon className="w-6 h-6 mr-3 transition-transform duration-500 ease-in-out group-hover:rotate-[360deg] group-hover:scale-110" />
                上传图片进行编辑
            </div>
            <p className="text-sm text-gray-500 mt-2">也可以直接拖放或粘贴文件到此区域</p>
            <input id="image-upload-start" type="file" className="hidden" accept="image/*" onChange={handleFileChange} />
          </div>
        </div>
      </div>
    </div>
  );
};

export default StartScreen;