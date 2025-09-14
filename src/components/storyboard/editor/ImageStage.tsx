"use client";
import React from 'react';
import type { StoryboardFrame } from '@/types/storyboard';
import Image from 'next/image';

interface ImageStageProps {
  frame?: StoryboardFrame;
  onPrev?: () => void;
  onNext?: () => void;
  hasPrev?: boolean;
  hasNext?: boolean;
}

export const ImageStage: React.FC<ImageStageProps> = ({ frame, onPrev, onNext, hasPrev, hasNext }) => {
  if (!frame) {
    return (
      <div className="h-[480px] flex items-center justify-center border border-dashed border-neutral-600 rounded bg-neutral-800 text-neutral-300 text-sm">
        Select or create a frame.
      </div>
    );
  }
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between text-xs text-neutral-300">
        <div>Scene {frame.scene} • <span className="text-neutral-500">{frame.status}</span></div>
        <div className="flex gap-2">
          <button disabled={!hasPrev} onClick={onPrev} className="px-2 py-1 rounded border border-neutral-600 text-[11px] disabled:opacity-30 text-white hover:bg-neutral-700">Prev</button>
          <button disabled={!hasNext} onClick={onNext} className="px-2 py-1 rounded border border-neutral-600 text-[11px] disabled:opacity-30 text-white hover:bg-neutral-700">Next</button>
        </div>
      </div>
      <div className="relative bg-neutral-800 border border-neutral-600 rounded flex items-center justify-center overflow-hidden min-h-[480px]">
        {frame.imageUrl ? (
          <Image src={frame.imageUrl} alt="frame" fill className="object-contain" />
        ) : (
          <div className="text-neutral-300 text-sm">{frame.status !== 'ready' ? 'Processing…' : 'No image'}</div>
        )}
      </div>
      {frame.imagePrompt && frame.imagePrompt.trim() && frame.imagePrompt.trim() !== (frame.shotDescription || '').trim() && (
        <div>
          <div className="text-[11px] font-medium text-neutral-300 mb-1">Image Prompt</div>
          <pre className="whitespace-pre-wrap text-xs text-white p-2 bg-neutral-800 border border-neutral-600 rounded max-h-40 overflow-auto">{frame.imagePrompt}</pre>
        </div>
      )}
    </div>
  );
};

export default ImageStage;
