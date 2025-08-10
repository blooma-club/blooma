'use client'

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import type { CustomCardNodeData } from '@/types';

// Flat-style SVG placeholder
const ImagePlaceholderSVG = () => (
  <svg width="100%" height="100%" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" className="opacity-50">
    <rect x="0" y="0" width="100" height="100" fill="none" rx="10" />
    <path d="M 0 70 L 25 50 L 50 65 L 75 40 L 100 65 V 100 H 0 Z" fill="#D1D5DB" />
    <circle cx="75" cy="25" r="15" fill="#FDE047" />
  </svg>
);

interface EditModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: CustomCardNodeData) => void;
  nodeData: CustomCardNodeData;
}

const EditModal = ({ isOpen, onClose, onSave, nodeData }: EditModalProps) => {
  const [title, setTitle] = useState(nodeData.title);
  const [content, setContent] = useState(nodeData.content);
  const [imageUrl, setImageUrl] = useState(nodeData.imageUrl);
  const objectUrlRef = useRef<string | null>(null);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    return () => setIsMounted(false);
  }, []);

  useEffect(() => {
    if (isOpen) {
      setTitle(nodeData.title);
      setContent(nodeData.content);
      setImageUrl(nodeData.imageUrl);
    }
  }, [isOpen, nodeData]);

  useEffect(() => {
    return () => {
      if (objectUrlRef.current) {
        URL.revokeObjectURL(objectUrlRef.current);
      }
    };
  }, []);

  const handleImageUpload = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (objectUrlRef.current) {
        URL.revokeObjectURL(objectUrlRef.current);
      }
      const objectUrl = URL.createObjectURL(file);
      objectUrlRef.current = objectUrl;
      setImageUrl(objectUrl);
    }
  }, []);

  const handleSave = () => {
    onSave({ title, content, imageUrl });
    onClose();
  };

  if (!isOpen || !isMounted) return null;

  return createPortal(
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center">
      <div className="bg-white p-8 rounded-lg shadow-xl w-full max-w-md">
        <div className="flex justify-end">
          <button onClick={onClose} className="text-gray-500 hover:text-gray-800">
            <X size={24} />
          </button>
        </div>
        <div className="flex flex-col gap-4">
          <h3 className="text-xl font-bold">Edit Card</h3>
          
          {/* Title Input */}
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="text-2xl font-bold bg-gray-100 p-2 rounded-md outline-none w-full transition-colors duration-200"
            placeholder="Enter a title"
          />

          {/* Image Upload */}
          <div className={`relative w-full rounded-2xl overflow-hidden flex items-center justify-center group ${imageUrl ? 'border border-gray-900' : 'border-2 border-dashed border-gray-900'} mb-4`} style={{ minHeight: 120 }}>
            {imageUrl ? (
              <img
                src={imageUrl}
                alt="Storyboard image"
                className="w-full h-auto object-cover transition-opacity duration-300"
              />
            ) : (
              <div className="text-gray-400 flex flex-col items-center justify-center p-4 w-full">
                <div className="w-full max-w-sm mx-auto">
                  <ImagePlaceholderSVG />
                </div>
                <span>Upload an image</span>
              </div>
            )}
            <input
              type="file"
              accept="image/*"
              onChange={handleImageUpload}
              className="absolute inset-0 opacity-0 cursor-pointer"
            />
          </div>
          
          {/* Content Textarea */}
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            className="w-full min-h-[120px] p-4 border border-gray-300 rounded-xl bg-gray-100 focus:border-blue-500 outline-none resize-none transition-colors duration-200"
            placeholder="Enter storyboard content..."
          />

          {/* Action Buttons */}
          <div className="flex justify-end gap-2">
            <button onClick={onClose} className="px-4 py-2 rounded-md bg-gray-200 hover:bg-gray-300">Cancel</button>
            <button onClick={handleSave} className="px-4 py-2 rounded-md bg-blue-500 text-white hover:bg-blue-600">Save</button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default EditModal;