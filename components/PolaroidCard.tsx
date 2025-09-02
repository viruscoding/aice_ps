/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import React, { useState, useEffect } from 'react';
import { motion, useAnimation } from 'framer-motion';
import { RefreshIcon } from './icons';
import Spinner from './Spinner';

type ImageStatus = 'pending' | 'done' | 'error';
type GeneratedImage = {
    status: ImageStatus;
    url?: string;
    error?: string;
};

interface PolaroidCardProps {
    decade: string;
    imageState: GeneratedImage;
    onRegenerate: () => void;
    targetAspectRatio: number;
    dragConstraints?: React.RefObject<HTMLDivElement>;
    initialPosition?: { top: string; left: string; rotate: number };
    isMobile?: boolean;
}

const PolaroidCard: React.FC<PolaroidCardProps> = ({
    decade,
    imageState,
    onRegenerate,
    targetAspectRatio,
    dragConstraints,
    initialPosition,
    isMobile = false
}) => {
    const controls = useAnimation();
    const [imageAspectRatio, setImageAspectRatio] = useState(targetAspectRatio);

    useEffect(() => {
        if (imageState?.status === 'done' && imageState.url) {
            const img = new Image();
            img.onload = () => {
                setImageAspectRatio(img.naturalWidth / img.naturalHeight);
            };
            img.src = imageState.url;
        } else {
            setImageAspectRatio(targetAspectRatio);
        }
    }, [imageState, targetAspectRatio]);

    const handleShake = () => {
        if (imageState.status === 'done') {
            controls.start({
                x: [0, -10, 10, -10, 10, 0],
                rotate: [0, -5, 5, -5, 5, 0],
                transition: { duration: 0.5 },
            });
        }
    };

    const cardContent = () => {
        switch (imageState?.status) {
            case 'pending':
                return (
                    <div className="w-full h-full flex flex-col items-center justify-center bg-gray-800">
                        <Spinner className="w-10 h-10 text-gray-400" />
                        <p className="text-gray-400 mt-2 text-sm">Generating...</p>
                    </div>
                );
            case 'error':
                return (
                    <div className="w-full h-full flex flex-col items-center justify-center bg-red-900/50 p-2 text-center">
                        <p className="text-red-300 text-xs font-bold mb-2">Generation Failed</p>
                        <button onClick={onRegenerate} className="flex items-center gap-1 text-white bg-red-600/80 px-2 py-1 rounded-full text-xs hover:bg-red-500">
                            <RefreshIcon className="w-3 h-3"/>
                            Retry
                        </button>
                    </div>
                );
            case 'done':
                return (
                    <motion.div className="relative w-full h-full">
                        <motion.img 
                            key={imageState.url} // Re-trigger animation on URL change
                            src={imageState.url} 
                            alt={`Generated image for ${decade}`} 
                            className="w-full h-full object-cover"
                            initial={{ filter: 'sepia(1) contrast(0.5) brightness(0.7)', opacity: 0.8 }}
                            animate={{ filter: 'sepia(0) contrast(1) brightness(1)', opacity: 1 }}
                            transition={{ duration: 1.5, ease: 'easeOut', delay: 0.5 }}
                        />
                        <div className="absolute inset-0 bg-black transition-opacity duration-1000" style={{ animation: 'developing 1.5s ease-out forwards' }}/>
                        <style>{`
                            @keyframes developing {
                                0% { opacity: 0.6; }
                                100% { opacity: 0; }
                            }
                        `}</style>
                    </motion.div>
                );
            default:
                return null;
        }
    };
    
    // Constrain the aspect ratio for aesthetics
    const getConstrainedAspectRatio = (ratio: number) => {
        const minRatio = 1 / 1.5; // Tallest (e.g., 2:3)
        const maxRatio = 1.5 / 1; // Widest (e.g., 3:2)
        return Math.max(minRatio, Math.min(maxRatio, ratio));
    }
    
    const constrainedAspectRatio = getConstrainedAspectRatio(imageAspectRatio);

    if (isMobile) {
        return (
            <div className="w-full bg-[#fdf5e6] p-3 rounded-lg shadow-lg font-['Permanent_Marker'] text-gray-800 flex flex-col gap-3">
                <div 
                    className="w-full bg-gray-300 shadow-inner overflow-hidden"
                    style={{ aspectRatio: constrainedAspectRatio }}
                >
                    {cardContent()}
                </div>
                <div className="flex justify-between items-center px-1">
                    <p className="text-2xl">{decade}</p>
                    {imageState?.status !== 'pending' && (
                        <button onClick={onRegenerate} className="p-2 bg-gray-200/50 rounded-full hover:bg-gray-300 active:scale-90 transition-transform">
                            <RefreshIcon className="w-5 h-5"/>
                        </button>
                    )}
                </div>
            </div>
        );
    }
    
    const cardWidth = 250;
    const padding = 12; // p-3
    const imageWidth = cardWidth - (padding * 2); // 226px
    const imageHeight = imageWidth / constrainedAspectRatio;
    const textAndPaddingHeight = 60; // Space for text and bottom padding
    const cardHeight = imageHeight + textAndPaddingHeight;

    return (
        <motion.div
            className="absolute cursor-grab active:cursor-grabbing group"
            style={{ 
                top: initialPosition?.top, 
                left: initialPosition?.left, 
                width: cardWidth, 
                height: cardHeight 
            }}
            initial={{ opacity: 0, scale: 0.5, y: 100, rotate: 0 }}
            animate={{ 
                opacity: 1, 
                scale: 1, 
                y: 0,
                rotate: initialPosition?.rotate || 0,
            }}
            transition={{ type: 'spring', stiffness: 100, damping: 20 }}
            drag
            dragConstraints={dragConstraints}
            dragElastic={0.1}
            whileHover={{ scale: 1.05, zIndex: 10 }}
            whileTap={{ scale: 0.95, zIndex: 10 }}
            onDoubleClick={onRegenerate}
            onHoverStart={handleShake}
        >
            <motion.div 
                className="w-full h-full bg-[#fdf5e6] p-3 rounded-lg shadow-lg font-['Permanent_Marker'] text-gray-800 flex flex-col"
                animate={controls}
            >
                <div 
                    className="w-full bg-gray-300 shadow-inner overflow-hidden"
                    style={{ height: `${imageHeight}px` }}
                >
                    {cardContent()}
                </div>
                <div className="flex-grow flex items-center justify-center pt-2">
                    <p className="text-2xl">{decade}</p>
                </div>
                 {imageState?.status !== 'pending' && (
                    <motion.div 
                        className="absolute -bottom-2 -right-2 text-xs text-white bg-gray-700/80 px-2 py-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                    >
                       Double-click to retry
                    </motion.div>
                )}
            </motion.div>
        </motion.div>
    );
};

export default PolaroidCard;