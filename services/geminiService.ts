/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import { GoogleGenAI, GenerateContentResponse, Modality, Type } from "@google/genai";

const CUSTOM_API_KEY_STORAGE_KEY = 'gemini-custom-api-key';
let aiInstance: GoogleGenAI | null = null;

// Function to get the current API key, prioritizing custom key
const getApiKey = (): string | null => {
    const customKey = localStorage.getItem(CUSTOM_API_KEY_STORAGE_KEY);
    return customKey || process.env.API_KEY || null;
}

// Public functions to manage the custom API key
export const setCustomApiKey = (key: string): void => {
    if (key.trim()) {
        localStorage.setItem(CUSTOM_API_KEY_STORAGE_KEY, key.trim());
    } else {
        localStorage.removeItem(CUSTOM_API_KEY_STORAGE_KEY);
    }
    aiInstance = null; // Invalidate the current instance to force re-initialization
};

export const getCustomApiKey = (): string => {
    return localStorage.getItem(CUSTOM_API_KEY_STORAGE_KEY) || '';
};

export const clearCustomApiKey = (): void => {
    localStorage.removeItem(CUSTOM_API_KEY_STORAGE_KEY);
    aiInstance = null; // Invalidate
};


// Centralized function to get the GoogleGenAI instance
const getGoogleAI = (): GoogleGenAI => {
    if (aiInstance) {
        return aiInstance;
    }

    const apiKey = getApiKey();
    if (!apiKey) {
        throw new Error("找不到 API 密钥。请在设置中添加您的 Gemini API 密钥，或者确保已在环境中正确设置。");
    }
    
    try {
      aiInstance = new GoogleGenAI({ apiKey });
      return aiInstance;
    } catch(e) {
      console.error("Failed to initialize GoogleGenAI", e);
      // Invalidate on failure so we can retry
      aiInstance = null;
      throw new Error(`初始化 AI 服务失败: ${e instanceof Error ? e.message : String(e)}`);
    }
};

const handleApiError = (error: any, action: string): Error => {
    console.error(`API call for "${action}" failed:`, error);
    // Attempt to parse a meaningful message from the error object or string
    let message = `在“${action}”期间发生错误: ${error.message || '未知通信错误'}`;
    try {
      // Errors from the backend might be JSON strings
      const errorObj = JSON.parse(error.message);
      if (errorObj?.error?.message) {
         // Use the specific message from the API if available
         message = `在“${action}”期间发生错误: ${errorObj.error.message}`;
      }
    } catch(e) {
      // It's not a JSON string, use the original message
      if (String(error.message).includes('API key not valid')) {
          message = '您的 API 密钥无效。请在设置中检查并更正。';
      } else if (String(error.message).includes('xhr error')) {
           message = `与 AI 服务的通信失败。这通常是由无效的 API 密钥或网络问题引起的。请在设置中检查您的密钥并重试。`;
      }
    }

    return new Error(message);
}


// Helper to resize and convert image if necessary
const resizeImageForApi = async (file: File): Promise<{ file: File, mimeType: string }> => {
    const SUPPORTED_MIME_TYPES = ['image/jpeg', 'image/png'];
    const MAX_DIMENSION = 2048;

    const needsConversion = !SUPPORTED_MIME_TYPES.includes(file.type);

    return new Promise((resolve, reject) => {
        const image = new Image();
        const reader = new FileReader();

        reader.onload = (e) => {
            if (typeof e.target?.result !== 'string') {
                return reject(new Error('Failed to read file for processing.'));
            }
            image.src = e.target.result;
        };
        reader.onerror = () => reject(new Error('Failed to read file.'));

        image.onload = () => {
            const { naturalWidth: width, naturalHeight: height } = image;
            const needsResize = width > MAX_DIMENSION || height > MAX_DIMENSION;

            // If no resize and no conversion is needed, we're good.
            if (!needsResize && !needsConversion) {
                return resolve({ file, mimeType: file.type });
            }

            // Otherwise, we need to draw to canvas.
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            if (!ctx) {
                return reject(new Error('Could not create canvas context.'));
            }

            let newWidth = width;
            let newHeight = height;

            if (needsResize) {
                if (width > height) {
                    newWidth = MAX_DIMENSION;
                    newHeight = Math.round((height * MAX_DIMENSION) / width);
                } else {
                    newHeight = MAX_DIMENSION;
                    newWidth = Math.round((width * MAX_DIMENSION) / height);
                }
            }

            canvas.width = newWidth;
            canvas.height = newHeight;
            ctx.drawImage(image, 0, 0, newWidth, newHeight);

            // Always convert to PNG when using canvas for simplicity and to handle transparency.
            canvas.toBlob(
                (blob) => {
                    if (!blob) {
                        return reject(new Error('Failed to create blob from canvas.'));
                    }
                    const newFileName = (file.name.split('.').slice(0, -1).join('.') || 'image') + '.png';
                    const newFile = new File([blob], newFileName, { type: 'image/png' });
                    resolve({ file: newFile, mimeType: 'image/png' });
                },
                'image/png',
                0.95
            );
        };

        image.onerror = (err) => {
            reject(new Error(`Failed to load image for processing: ${err}`));
        };

        reader.readAsDataURL(file);
    });
};

// Helper to convert a File to a base64 string
const fileToGenerativePart = async (file: File) => {
    const { file: processedFile, mimeType } = await resizeImageForApi(file);
    const base64data = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve((reader.result as string).split(',')[1]);
        reader.onerror = reject;
        reader.readAsDataURL(processedFile);
    });
    return {
        inlineData: {
            mimeType: mimeType,
            data: base64data,
        },
    };
};

const callImageEditingModel = async (parts: any[], action: string): Promise<string> => {
    try {
        const ai = getGoogleAI();
        const response: GenerateContentResponse = await ai.models.generateContent({
            model: 'gemini-2.5-flash-image-preview',
            contents: { parts: parts },
            config: {
                responseModalities: [Modality.IMAGE, Modality.TEXT],
            },
        });

        for (const part of response.candidates[0].content.parts) {
            if (part.inlineData) {
                return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
            }
        }
        throw new Error('AI 未能返回预期的图片结果。');
    } catch (e) {
        throw handleApiError(e, action);
    }
}

export const generateImageFromText = async (prompt: string, aspectRatio: string): Promise<string> => {
    try {
        const ai = getGoogleAI();
        const response = await ai.models.generateImages({
            model: 'imagen-4.0-generate-001',
            prompt,
            config: {
                numberOfImages: 1,
                outputMimeType: 'image/png',
                aspectRatio: aspectRatio as "1:1" | "16:9" | "9:16" | "4:3" | "3:4",
            },
        });

        if (response.generatedImages && response.generatedImages.length > 0) {
            const base64ImageBytes: string = response.generatedImages[0].image.imageBytes;
            return `data:image/png;base64,${base64ImageBytes}`;
        }
        throw new Error('AI 未能生成图片。');
    } catch (e) {
        throw handleApiError(e, '生成图片');
    }
};

export const generateEditedImage = async (imageFile: File, prompt: string, hotspot: { x: number; y: number }): Promise<string> => {
    const imagePart = await fileToGenerativePart(imageFile);
    const textPart = { text: `Apply this edit at hotspot (${hotspot.x}, ${hotspot.y}): ${prompt}` };
    return callImageEditingModel([imagePart, textPart], '修饰');
};

export const generateFilteredImage = async (imageFile: File, prompt: string): Promise<string> => {
    const imagePart = await fileToGenerativePart(imageFile);
    const textPart = { text: `Apply this filter: ${prompt}` };
    return callImageEditingModel([imagePart, textPart], '滤镜');
};

export const generateAdjustedImage = async (imageFile: File, prompt: string): Promise<string> => {
    const imagePart = await fileToGenerativePart(imageFile);
    const textPart = { text: `Apply this adjustment: ${prompt}` };
    return callImageEditingModel([imagePart, textPart], '调整');
};

export const generateTexturedImage = async (imageFile: File, prompt: string): Promise<string> => {
    const imagePart = await fileToGenerativePart(imageFile);
    const textPart = { text: `Apply this texture: ${prompt}` };
    return callImageEditingModel([imagePart, textPart], '纹理');
};

export const removeBackgroundImage = async (imageFile: File): Promise<string> => {
    const imagePart = await fileToGenerativePart(imageFile);
    const textPart = { text: 'Remove the background of this image, leaving only the main subject with a transparent background.' };
    return callImageEditingModel([imagePart, textPart], '抠图');
};

export const generateFusedImage = async (mainImage: File, sourceImages: File[], prompt: string): Promise<string> => {
    try {
        const mainImagePart = await fileToGenerativePart(mainImage);
        
        const sourceImageParts = await Promise.all(
            sourceImages.map((file, index) => fileToGenerativePart(file).then(part => ({ ...part, index: index + 1 })))
        );

        let fullPrompt = `Fuse the images. The main image is the one I'm editing. `;

        sourceImageParts.forEach(part => {
            fullPrompt += `Source image ${part.index} is provided. `;
        });
        
        fullPrompt += `Instructions: ${prompt}`;
        
        const textPart = { text: fullPrompt };
        const allParts = [mainImagePart, ...sourceImageParts.map(p => ({ inlineData: p.inlineData })), textPart];
        
        return await callImageEditingModel(allParts, '合成');

    } catch (e) {
       throw handleApiError(e, '合成');
    }
};

export const generateCreativeSuggestions = async (imageFile: File, type: 'filter' | 'adjustment' | 'texture'): Promise<{ name: string, prompt: string }[]> => {
    try {
        const ai = getGoogleAI();
        const imagePart = await fileToGenerativePart(imageFile);
        const textPrompt = `Analyze this image. Suggest 4 creative and interesting image ${type}s that would look good on it. Provide a very short, catchy name (2-4 words, in Chinese) and the corresponding detailed English prompt for each suggestion.`;
        const textPart = { text: textPrompt };

        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: { parts: [ imagePart, textPart ]},
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        suggestions: {
                            type: Type.ARRAY,
                            items: {
                                type: Type.OBJECT,
                                properties: {
                                    name: { type: Type.STRING, description: "A very short, catchy name for the effect in Chinese." },
                                    prompt: { type: Type.STRING, description: "The detailed English prompt to achieve the effect." }
                                }
                            }
                        }
                    }
                }
            }
        });

        const jsonString = response.text.trim();
        const result = JSON.parse(jsonString);
        return result.suggestions;
    } catch (e) {
        throw handleApiError(e, '获取灵感');
    }
};
