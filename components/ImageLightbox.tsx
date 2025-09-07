/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { XMarkIcon } from './icons';

interface ImageLightboxProps {
  imageUrl: string | null;
  onClose: () => void;
}

const ImageLightbox: React.FC<ImageLightboxProps> = ({ imageUrl, onClose }) => {
  if (!imageUrl) return null;

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        aria-modal="true"
        role="dialog"
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-300 hover:text-white transition-colors z-10 bg-black/30 rounded-full p-2"
          aria-label="关闭大图"
        >
          <XMarkIcon className="w-8 h-8" />
        </button>
        <motion.div
          className="relative max-w-full max-h-full"
          onClick={e => e.stopPropagation()} // Prevent closing when clicking the image itself
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.8, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 200, damping: 25 }}
        >
          <img
            src={imageUrl}
            alt="放大后的图片"
            className="block max-w-[90vw] max-h-[90vh] w-auto h-auto rounded-lg shadow-2xl"
          />
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default ImageLightbox;
