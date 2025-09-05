"use client";
import React from 'react';

interface FloatingHeaderProps {
  title: string;
  index: number;
  total: number;
  viewMode: 'grid' | 'frame';
  onSetGrid: () => void;
  onSetFrame: () => void;
}

export const FloatingHeader: React.FC<FloatingHeaderProps> = ({ title, index, total, viewMode, onSetGrid, onSetFrame }) => {
  const displayIndex = total > 0 ? index + 1 : 0
  return (
    <div className="relative left-1/2 -translate-x-1/2 w-[min(1100px,92%)] pointer-events-none mb-6">
      <div className="pointer-events-auto bg-neutral-900 border border-neutral-800 rounded-lg shadow-lg px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h2 className="text-lg font-semibold text-white">{title}</h2>
          <div className="text-sm text-neutral-300">{displayIndex} / {total}</div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={onSetGrid} className={`px-3 py-1 rounded text-sm border transition-colors ${viewMode === 'grid' ? 'bg-white text-black border-white' : 'border-neutral-600 text-neutral-300 hover:border-neutral-500 hover:text-white'}`}>Grid</button>
          <button onClick={onSetFrame} className={`px-3 py-1 rounded text-sm border transition-colors ${viewMode === 'frame' ? 'bg-white text-black border-white' : 'border-neutral-600 text-neutral-300 hover:border-neutral-500 hover:text-white'}`}>Single</button>
        </div>
      </div>
    </div>
  );
};

export default FloatingHeader;
