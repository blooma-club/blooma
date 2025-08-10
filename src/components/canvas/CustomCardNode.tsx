'use client'

import React, { useState, useCallback } from 'react';
import { Handle, Position, NodeProps, useReactFlow } from '@xyflow/react';
import { Trash2, EyeOff, Edit } from 'lucide-react';
import type { CustomCardNodeData } from '@/types';
import EditModal from './EditModal';

// Flat-style SVG placeholder
// const ImagePlaceholderSVG = () => (
//   <svg width="100%" height="100%" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" className="opacity-50">
//     <rect x="0" y="0" width="100" height="100" fill="none" rx="10" />
//     <path d="M 0 70 L 25 50 L 50 65 L 75 40 L 100 65 V 100 H 0 Z" fill="#D1D5DB" />
//     <circle cx="75" cy="25" r="15" fill="#FDE047" />
//   </svg>
// );

function CustomCardNode({ id, data }: NodeProps) {
  const cardData = data as CustomCardNodeData;
  const { setNodes } = useReactFlow();
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleSave = useCallback((newData: Pick<CustomCardNodeData, 'title' | 'content' | 'imageUrl'>) => {
    setNodes((nodes) =>
      nodes.map((node) => {
        if (node.id === id) {
          return { ...node, data: { ...node.data, ...newData } };
        }
        return node;
      })
    );
  }, [id, setNodes]);

  return (
    <>
      <div
        className="relative aspect-square w-full max-w-lg min-w-[260px] rounded-2xl border-1 border-gray-900 bg-white shadow-[2px_2px_0_0_#000000] flex flex-col gap-5 p-6 transition-all duration-200 hover:shadow-[4px_4px_0_0_#000000] hover:ring-2 hover:ring-gray-900"
        style={{ width: '100%', maxWidth: '32rem', minWidth: '260px' }}
      >
        <Handle type="target" position={Position.Left} className="!w-3 !h-3 !bg-white !border !border-black !rounded-full" />
        {/* Title Section */}
        <div className="flex items-center justify-between">
          <h2 className="text-xl md:text-2xl font-bold tracking-tight text-gray-800 break-words">
            {cardData.title}
          </h2>
          <div className="flex space-x-2 ml-2">
            <button
              onClick={() => {
                /* Implement delete functionality */
              }}
              className="group p-2 text-white rounded-full border-1 border-gray-900"
              style={{ backgroundColor: '#FF7F70' }}
              aria-label="Delete"
            >
              <Trash2 size={20} className="opacity-80 group-hover:opacity-100 transition-opacity duration-150" />
            </button>
            <button
              onClick={() => {
                /* Implement hide functionality */
              }}
              className="group p-2 text-white rounded-full border-1 border-gray-900"
              style={{ backgroundColor: '#FEA439' }}
              aria-label="Hide"
            >
              <EyeOff size={20} className="opacity-80 group-hover:opacity-100 transition-opacity duration-150" />
            </button>
            <button
              onClick={() => setIsModalOpen(true)}
              className="group p-2 text-white rounded-full border-1 border-gray-900"
              style={{ backgroundColor: '#68DB94' }}
              aria-label="Edit"
            >
              <Edit size={20} className="opacity-80 group-hover:opacity-100 transition-opacity duration-150" />
            </button>
          </div>
        </div>
        {/* Image Upload/Display Section */}
        <div className={`relative w-full rounded-xl overflow-hidden flex items-center justify-center group border-1 border-gray-900 bg-gray-50`} style={{ minHeight: 200 }}>
          {cardData.imageUrl ? (
            <img
              src={cardData.imageUrl}
              alt="Storyboard image"
              className="w-full h-auto object-cover"
            />
          ) : (
            <div className="text-gray-500 flex flex-col items-center justify-center p-6 w-full">
              <div className="w-full max-w-[80px] mx-auto">
                <svg width="80" height="80" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" className="opacity-80">
                  <rect x="5" y="5" width="90" height="90" rx="10" fill="none" stroke="#111827" strokeWidth="2" />
                  <path d="M15 68 L 30 52 L 50 62 L 72 42 L 85 58" fill="none" stroke="#9CA3AF" strokeWidth="2" />
                  <circle cx="76" cy="28" r="10" fill="none" stroke="#F59E0B" strokeWidth="2" />
                </svg>
              </div>
              <span className="mt-2 text-sm">No image</span>
            </div>
          )}
        </div>
        {/* Text Section */}
        <div className="text-gray-700 w-full flex-1 flex flex-col justify-end">
          <p className="text-base md:text-lg leading-relaxed break-words whitespace-pre-wrap p-3 border-1 border-gray-900 rounded-xl bg-gray-50 min-h-[96px]">
            {cardData.content}
          </p>
        </div>
        <Handle type="source" position={Position.Right} className="!w-3 !h-3 !bg-white !border !border-black !rounded-full absolute top-1/2 right-[-8px] -translate-y-1/2 z-20" />
      </div>

      <EditModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSave}
        nodeData={data}
      />
    </>
  )
}


export default CustomCardNode