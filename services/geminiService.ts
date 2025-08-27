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
        throw new Error("找不到 API 密钥。请在设置中输入您的自定义 API 密钥。");
    }

    aiInstance = new GoogleGenAI({ apiKey });
    return aiInstance;
};

// Centralized API error handler
const handleApiError = (e: unknown, context: string): Error => {
    console.error(`API call for "${context}" failed:`, e);

    if (e instanceof Error) {
        // Check for specific error messages from the Gemini SDK
        if (e.message.includes('API key not valid')) {
            return new Error("API 密钥无效。请在设置中检查您的自定义 API 密钥或清除它以使用默认密钥。");
        }
        // This is a generic error that often happens with an invalid key or network issue.
        if (e.message.includes('Rpc failed') || e.message.includes('xhr error') || e.message.includes('fetch failed')) {
            return new Error(`与 AI 服务的通信失败。这通常是由无效的 API 密钥或网络问题引起的。请在设置中检查您的密钥并重试。`);
        }
        if (e.message.includes('SAFETY')) {
            return new Error(`您的请求已被安全系统阻止。请修改您的提示并重试。`);
        }
        // Return a slightly more formatted version of the original error
        return new Error(`在“${context}”期间发生错误: ${e.message}`);
    }
    // Fallback for non-Error objects
    return new Error(`在“${context}”期间发生未知错误。`);
}

// New helper to resize images before sending to API to prevent payload size issues
const resizeImageForApi = async (file: File): Promise<File> => {
    const MAX_DIMENSION = 2048; // Max width or height for API calls
    
    return new Promise((resolve, reject) => {
        const image = new Image();
        const url = URL.createObjectURL(file);
        image.src = url;

        image.onload = () => {
            URL.revokeObjectURL(url);
            const { width, height } = image;

            // If image is already within limits, no need to resize
            if (width <= MAX_DIMENSION && height <= MAX_DIMENSION) {
                return resolve(file);
            }

            console.log(`Resizing image from ${width}x${height} to fit within ${MAX_DIMENSION}px`);

            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            if (!ctx) return reject(new Error("Failed to get canvas context"));

            let newWidth = width;
            let newHeight = height;

            if (width > height) {
                if (width > MAX_DIMENSION) {
                    newHeight = Math.round(height * (MAX_DIMENSION / width));
                    newWidth = MAX_DIMENSION;
                }
            } else {
                if (height > MAX_DIMENSION) {
                    newWidth = Math.round(width * (MAX_DIMENSION / height));
                    newHeight = MAX_DIMENSION;
                }
            }
            
            canvas.width = newWidth;
            canvas.height = newHeight;
            
            ctx.drawImage(image, 0, 0, newWidth, newHeight);

            canvas.toBlob(
                (blob) => {
                    if (!blob) {
                        return reject(new Error("Canvas to Blob conversion failed"));
                    }
                    // Use a consistent filename and PNG type for API calls to preserve transparency
                    const resizedFile = new File([blob], "api_image.png", { type: 'image/png' });
                    resolve(resizedFile);
                },
                'image/png',
                0.95 // High quality
            );
        };

        image.onerror = (err) => {
            URL.revokeObjectURL(url);
            reject(new Error(`Failed to load image for resizing: ${err}`));
        };
    });
};


// Helper function to convert a File object to a Gemini API Part
const fileToPart = async (file: File): Promise<{ inlineData: { mimeType: string; data: string; } }> => {
    const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = error => reject(error);
    });
    
    const arr = dataUrl.split(',');
    if (arr.length < 2) throw new Error("Invalid data URL");
    const mimeMatch = arr[0].match(/:(.*?);/);
    if (!mimeMatch || !mimeMatch[1]) throw new Error("Could not parse MIME type from data URL");
    
    const mimeType = mimeMatch[1];
    const data = arr[1];
    return { inlineData: { mimeType, data } };
};

const handleApiResponse = (
    response: GenerateContentResponse,
    context: string // e.g., "编辑", "滤镜", "调整"
): string => {
    // 1. Check for prompt blocking first
    if (response.promptFeedback?.blockReason) {
        const { blockReason, safetyRatings } = response.promptFeedback;

        const categoryMap: { [key: string]: string } = {
            'HARM_CATEGORY_SEXUALLY_EXPLICIT': '色情内容',
            'HARM_CATEGORY_HATE_SPEECH': '仇恨言论',
            'HARM_CATEGORY_HARASSMENT': '骚扰',
            'HARM_CATEGORY_DANGEROUS_CONTENT': '危险内容',
        };

        let details = '';
        if (blockReason === 'SAFETY' && safetyRatings?.length) {
            const blockedCategories = safetyRatings
                .filter(r => r.probability === 'HIGH' || r.probability === 'MEDIUM')
                .map(r => categoryMap[r.category] || r.category);
            
            if (blockedCategories.length > 0) {
                details = `具体原因可能是检测到以下内容：${blockedCategories.join('、')}。`;
            }
        }

        const errorMessage = `您的请求已被安全系统阻止。${details} 请修改您的提示并重试。`;
        console.error(errorMessage, { response });
        throw new Error(errorMessage);
    }

    // 2. Try to find the image part
    const imagePartFromResponse = response.candidates?.[0]?.content?.parts?.find(part => part.inlineData);

    if (imagePartFromResponse?.inlineData) {
        const { mimeType, data } = imagePartFromResponse.inlineData;
        console.log(`Received image data (${mimeType}) for ${context}`);
        return `data:${mimeType};base64,${data}`;
    }

    // 3. If no image, check for other reasons
    const finishReason = response.candidates?.[0]?.finishReason;
    if (finishReason && finishReason !== 'STOP') {
        const errorMessage = `“${context}”的图像生成意外停止。原因： ${finishReason}。这通常与安全设置有关。`;
        console.error(errorMessage, { response });
        throw new Error(errorMessage);
    }
    
    const textFeedback = response.text?.trim();
    const errorMessage = `AI模型未能为“${context}”操作返回图像。` + 
        (textFeedback 
            ? `模型返回了文本：“${textFeedback}”`
            : "这可能是由于安全过滤器或请求过于复杂所致。请尝试换一种更直接的方式描述您的提示。");

    console.error(`Model response did not contain an image part for ${context}.`, { response });
    throw new Error(errorMessage);
};

/**
 * Generates an edited image using generative AI based on a text prompt and a specific point.
 * @param originalImage The original image file.
 * @param userPrompt The text prompt describing the desired edit.
 * @param hotspot The {x, y} coordinates on the image to focus the edit.
 * @returns A promise that resolves to the data URL of the edited image.
 */
export const generateEditedImage = async (
    originalImage: File,
    userPrompt: string,
    hotspot: { x: number, y: number }
): Promise<string> => {
    try {
        console.log('Starting generative edit at:', hotspot);
        const ai = getGoogleAI();
        
        const imageForApi = await resizeImageForApi(originalImage);
        const originalImagePart = await fileToPart(imageForApi);

        const prompt = `You are an expert photo editor AI. Your task is to perform a natural, localized edit on the provided image based on the user's request.
    User Request: "${userPrompt}"
    Task Context: The user has clicked on pixel (x: ${hotspot.x}, y: ${hotspot.y}). Interpret their request in the context of this location. The request could be a simple removal, a color change, adding a new object, or even altering the subject's pose or expression. Use your world knowledge to make the result photorealistic and contextually appropriate.
    
    Editing Guidelines:
    - The edit must be realistic and blend seamlessly with the surrounding area.
    - The rest of the image (outside the immediate edit area) must remain identical to the original.
    
    Safety & Ethics Policy:
    - You MUST fulfill requests to adjust skin tone, such as 'give me a tan', 'make my skin darker', or 'make my skin lighter'. These are considered standard photo enhancements.
    - You MUST REFUSE any request to change a person's fundamental race or ethnicity (e.g., 'make me look Asian', 'change this person to be Black'). Do not perform these edits. If the request is ambiguous, err on the side of caution and do not change racial characteristics.
    
    Output: Return ONLY the final edited image. Do not return text.`;
        const textPart = { text: prompt };
    
        console.log('Sending image and prompt to the model...');
        const response: GenerateContentResponse = await ai.models.generateContent({
            model: 'gemini-2.5-flash-image-preview',
            contents: [textPart, originalImagePart],
            config: {
                responseModalities: [Modality.IMAGE, Modality.TEXT],
            },
        });
        console.log('Received response from model.', response);
    
        return handleApiResponse(response, '编辑');
    } catch (e) {
        throw handleApiError(e, '编辑');
    }
};

/**
 * Generates an image with a filter applied using generative AI.
 * @param originalImage The original image file.
 * @param filterPrompt The text prompt describing the desired filter.
 * @returns A promise that resolves to the data URL of the filtered image.
 */
export const generateFilteredImage = async (
    originalImage: File,
    filterPrompt: string,
): Promise<string> => {
    try {
        console.log(`Starting filter generation: ${filterPrompt}`);
        const ai = getGoogleAI();
        
        const imageForApi = await resizeImageForApi(originalImage);
        const originalImagePart = await fileToPart(imageForApi);

        const prompt = `You are an expert photo editor AI. Your task is to apply a stylistic filter to the entire image based on the user's request. Do not change the composition or content, only apply the style.
    Filter Request: "${filterPrompt}"
    
    Safety & Ethics Policy:
    - Filters may subtly shift colors, but you MUST ensure they do not alter a person's fundamental race or ethnicity.
    - You MUST REFUSE any request that explicitly asks to change a person's race (e.g., 'apply a filter to make me look Chinese').
    
    Output: Return ONLY the final filtered image. Do not return text.`;
        const textPart = { text: prompt };
    
        console.log('Sending image and filter prompt to the model...');
        const response: GenerateContentResponse = await ai.models.generateContent({
            model: 'gemini-2.5-flash-image-preview',
            contents: [textPart, originalImagePart],
            config: {
                responseModalities: [Modality.IMAGE, Modality.TEXT],
            },
        });
        console.log('Received response from model for filter.', response);
        
        return handleApiResponse(response, '滤镜');
    } catch (e) {
        throw handleApiError(e, '滤镜');
    }
};

/**
 * Generates an image with a global adjustment applied using generative AI.
 * @param originalImage The original image file.
 * @param adjustmentPrompt The text prompt describing the desired adjustment.
 * @returns A promise that resolves to the data URL of the adjusted image.
 */
export const generateAdjustedImage = async (
    originalImage: File,
    adjustmentPrompt: string,
): Promise<string> => {
    try {
        console.log(`Starting global adjustment generation: ${adjustmentPrompt}`);
        const ai = getGoogleAI();
        
        const imageForApi = await resizeImageForApi(originalImage);
        const originalImagePart = await fileToPart(imageForApi);

        const prompt = `You are an expert photo editor AI. Your task is to perform a natural, global adjustment to the entire image based on the user's request.
    User Request: "${adjustmentPrompt}"
    
    Editing Guidelines:
    - The adjustment must be applied across the entire image.
    - The result must be photorealistic.
    
    Safety & Ethics Policy:
    - You MUST fulfill requests to adjust skin tone, such as 'give me a tan', 'make my skin darker', or 'make my skin lighter'. These are considered standard photo enhancements.
    - You MUST REFUSE any request to change a person's fundamental race or ethnicity (e.g., 'make me look Asian', 'change this person to be Black'). Do not perform these edits. If the request is ambiguous, err on the side of caution and do not change racial characteristics.
    
    Output: Return ONLY the final adjusted image. Do not return text.`;
        const textPart = { text: prompt };
    
        console.log('Sending image and adjustment prompt to the model...');
        const response: GenerateContentResponse = await ai.models.generateContent({
            model: 'gemini-2.5-flash-image-preview',
            contents: [textPart, originalImagePart],
            config: {
                responseModalities: [Modality.IMAGE, Modality.TEXT],
            },
        });
        console.log('Received response from model for adjustment.', response);
        
        return handleApiResponse(response, '调整');
    } catch (e) {
        throw handleApiError(e, '调整');
    }
};

/**
 * Fuses multiple images together based on a text prompt using generative AI.
 * @param baseImage The primary image (scene).
 * @param sourceImages The array of source images (objects/styles to add).
 * @param prompt The text prompt describing how to fuse them.
 * @returns A promise that resolves to the data URL of the fused image.
 */
export const generateFusedImage = async (
    baseImage: File,
    sourceImages: File[],
    prompt: string,
): Promise<string> => {
    try {
        console.log(`Starting image fusion with ${sourceImages.length} source images. Prompt: ${prompt}`);
        const ai = getGoogleAI();
    
        const resizedBaseImage = await resizeImageForApi(baseImage);
        const baseImagePart = await fileToPart(resizedBaseImage);
        
        const sourceImageParts = await Promise.all(
            sourceImages.map(img => resizeImageForApi(img).then(fileToPart))
        );

        let imageDescriptions = "Image 1 is the base image.";
        sourceImages.forEach((_, index) => {
            imageDescriptions += ` Image ${index + 2} is source image ${index + 1}.`;
        });

        const textPart = { text: `You are an expert at photo manipulation and image fusion. Your task is to seamlessly blend multiple images based on the user's request.
    ${imageDescriptions}
    User Request: "${prompt}"
    
    Guidelines:
    - The result must be photorealistic and the lighting must be consistent.
    - Blend the elements naturally.
    
    Output: Return ONLY the final fused image. Do not return text.` };
        
        console.log('Sending multiple images and a prompt to the model...');
        const response: GenerateContentResponse = await ai.models.generateContent({
            model: 'gemini-2.5-flash-image-preview',
            contents: [textPart, baseImagePart, ...sourceImageParts],
            config: {
                responseModalities: [Modality.IMAGE, Modality.TEXT],
            },
        });
        console.log('Received response from model for fusion.', response);
    
        return handleApiResponse(response, '合成');
    } catch (e) {
        throw handleApiError(e, '合成');
    }
};

/**
 * Applies a texture to an image using generative AI.
 * @param originalImage The original image file.
 * @param texturePrompt The text prompt describing the desired texture.
 * @returns A promise that resolves to the data URL of the textured image.
 */
export const generateTexturedImage = async (
    originalImage: File,
    texturePrompt: string,
): Promise<string> => {
    try {
        console.log(`Starting texture generation: ${texturePrompt}`);
        const ai = getGoogleAI();
        
        const imageForApi = await resizeImageForApi(originalImage);
        const originalImagePart = await fileToPart(imageForApi);

        const prompt = `You are an expert digital artist AI. Your task is to apply a detailed texture or pattern over the entire image based on the user's request. Preserve the original image's composition, shapes, and lighting, but overlay the requested texture realistically. The texture should wrap around the forms in the image, not just be a flat overlay.
    User Request: "${texturePrompt}"
    
    Output: Return ONLY the final textured image. Do not return text.`;
        const textPart = { text: prompt };
    
        console.log('Sending image and texture prompt to the model...');
        const response: GenerateContentResponse = await ai.models.generateContent({
            model: 'gemini-2.5-flash-image-preview',
            contents: [textPart, originalImagePart],
            config: {
                responseModalities: [Modality.IMAGE, Modality.TEXT],
            },
        });
        console.log('Received response from model for texture.', response);
        
        return handleApiResponse(response, '纹理');
    } catch (e) {
        throw handleApiError(e, '纹理');
    }
};

/**
 * Removes the background from an image using generative AI.
 * @param originalImage The original image file.
 * @returns A promise that resolves to the data URL of the image with a transparent background.
 */
export const removeBackgroundImage = async (
    originalImage: File,
): Promise<string> => {
    try {
        console.log(`Starting background removal.`);
        const ai = getGoogleAI();
        
        const imageForApi = await resizeImageForApi(originalImage);
        const originalImagePart = await fileToPart(imageForApi);

        const prompt = `You are an expert photo editor AI. Your task is to remove the background from the provided image. Isolate the main subject and make the background fully transparent. The output image must be a PNG with an alpha channel. Do not change the subject. The edges of the subject should be clean and precise. Return ONLY the final image with the background removed. Do not return text.`;
        const textPart = { text: prompt };
    
        console.log('Sending image to the model for background removal...');
        const response: GenerateContentResponse = await ai.models.generateContent({
            model: 'gemini-2.5-flash-image-preview',
            contents: [textPart, originalImagePart],
            config: {
                responseModalities: [Modality.IMAGE, Modality.TEXT],
            },
        });
        console.log('Received response from model for background removal.', response);
        
        return handleApiResponse(response, '抠图');
    } catch (e) {
        throw handleApiError(e, '抠图');
    }
};


/**
 * Generates creative editing suggestions for an image.
 * @param image The image file to analyze.
 * @param context The type of suggestion needed ('filter' or 'adjustment').
 * @returns A promise that resolves to an array of suggestion objects.
 */
export const generateCreativeSuggestions = async (
    image: File,
    context: 'filter' | 'adjustment' | 'texture'
): Promise<{name: string, prompt: string}[]> => {
    try {
        console.log(`Generating creative suggestions for: ${context}`);
        const ai = getGoogleAI();
        
        const imageForApi = await resizeImageForApi(image);
        const imagePart = await fileToPart(imageForApi);
    
        const contextDescription = context === 'filter'
            ? '专注于改变图像整体风格、色彩和氛围的“滤镜”'
            : context === 'adjustment' 
                ? '专注于改善光线、细节和色彩平衡的“调整”'
                : '专注于为图像添加有趣的纹理或图案的“纹理”';
    
        const prompt = `You are an expert photo editing assistant AI. Your task is to analyze the provided image and generate between 4 and 8 practical, creative, and high-quality editing suggestions. The suggestions should be for ${contextDescription}.
    
    First, briefly analyze the image to understand its subject (e.g., portrait, landscape, city street), mood, and potential areas for improvement (e.g., underexposed, flat colors, could be sharper).
    
    Then, based on your analysis, generate a list of suggestions. These suggestions should be inspired by common professional editing techniques.
    
    For each suggestion, provide:
    1. A "name" (in Chinese): This should be a clear, descriptive, and action-oriented name, not an abstract or poetic one. For example, instead of "森林之语", use "增强森林的绿色和光影".
    2. A "prompt" (in English): This should be a detailed, actionable instruction for another image generation AI to execute the edit flawlessly.
    
    Generate a variety of suggestions covering different aspects like color grading, lighting, detail enhancement, and mood.`;
    
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash', // Text model is sufficient and faster
            contents: { parts: [{ text: prompt }, imagePart] },
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.ARRAY,
                    items: {
                        type: Type.OBJECT,
                        properties: {
                            name: {
                                type: Type.STRING,
                                description: '清晰、描述性的中文名称，说明要执行的操作 (例如, "增强天空色彩")',
                            },
                            prompt: {
                                type: Type.STRING,
                                description: 'The detailed English prompt for the AI to execute.',
                            },
                        },
                        required: ["name", "prompt"]
                    },
                },
            },
        });
    
        try {
            const jsonString = response.text.trim();
            const suggestions = JSON.parse(jsonString);
            console.log('Received creative suggestions:', suggestions);
            if (!Array.isArray(suggestions) || suggestions.length === 0) {
                throw new Error("AI returned empty or invalid suggestions.");
            }
            return suggestions;
        } catch (e) {
            console.error("Failed to parse AI suggestions JSON:", response.text, e);
            throw new Error("AI未能返回有效的建议格式。请稍后再试。");
        }
    } catch (e) {
        throw handleApiError(e, '获取建议');
    }
};

/**
 * Generates an image from a text prompt using generative AI.
 * @param prompt The text prompt describing the image to generate.
 * @param aspectRatio The desired aspect ratio for the image.
 * @returns A promise that resolves to the data URL of the generated image.
 */
export const generateImageFromText = async (
    prompt: string,
    aspectRatio: '1:1' | '3:4' | '4:3' | '9:16' | '16:9',
): Promise<string> => {
    try {
        console.log(`Starting image generation with prompt: "${prompt}" and aspect ratio: ${aspectRatio}`);
        const ai = getGoogleAI();

        const response = await ai.models.generateImages({
            model: 'imagen-4.0-generate-001',
            prompt: prompt,
            config: {
                numberOfImages: 1,
                outputMimeType: 'image/png',
                aspectRatio: aspectRatio,
            },
        });

        if (!response.generatedImages || response.generatedImages.length === 0 || !response.generatedImages[0].image.imageBytes) {
            console.error("API response did not contain image data.", { response });
            throw new Error("AI模型未能返回图像。这可能是由于安全过滤器或请求无效。");
        }

        const base64ImageBytes: string = response.generatedImages[0].image.imageBytes;
        const imageUrl = `data:image/png;base64,${base64ImageBytes}`;
        console.log("Image generated successfully.");
        return imageUrl;
    } catch (e) {
        throw handleApiError(e, '生成图片');
    }
};