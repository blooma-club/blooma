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
  onGenerateVideo?: (frame: StoryboardFrame) => void;
  onPlayVideo?: (frame: StoryboardFrame) => void;
  isGeneratingVideo?: boolean;
}

export const ImageStage: React.FC<ImageStageProps> = ({
  frame,
  onPrev,
  onNext,
  hasPrev,
  hasNext,
  onGenerateVideo,
  onPlayVideo,
  isGeneratingVideo = false,
}) => {
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
        <div className="flex items-center gap-3">
          <span>
            Shot {frame.scene} • <span className="text-neutral-500">{frame.status}</span>
          </span>
          {frame.videoUrl && (
            <span className="inline-flex items-center gap-1 rounded-full bg-green-500/20 text-green-200 px-2 py-0.5 text-[10px] uppercase tracking-wide">
              Video ready
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {onPlayVideo && frame.videoUrl && (
            <button
              onClick={() => onPlayVideo(frame)}
              className="px-3 py-1 rounded border border-neutral-500 text-[11px] text-white hover:bg-neutral-700"
            >
              Play Video
            </button>
          )}
          {onGenerateVideo && !frame.videoUrl && (
            <button
              onClick={() => onGenerateVideo(frame)}
              disabled={isGeneratingVideo}
              className={`px-3 py-1 rounded border text-[11px] uppercase font-semibold tracking-wide ${
                isGeneratingVideo
                  ? 'border-neutral-600 text-neutral-400 cursor-not-allowed'
                  : 'border-white/60 text-white hover:bg-neutral-700'
              }`}
            >
              {isGeneratingVideo ? (
                <span className="inline-flex items-center gap-2">
                  <span className="w-3 h-3 border border-white border-t-transparent rounded-full animate-spin" />
                  Generating…
                </span>
              ) : (
                'Create Video'
              )}
            </button>
          )}
          <div className="flex gap-2">
            <button disabled={!hasPrev} onClick={onPrev} className="px-2 py-1 rounded border border-neutral-600 text-[11px] disabled:opacity-30 text-white hover:bg-neutral-700">Prev</button>
            <button disabled={!hasNext} onClick={onNext} className="px-2 py-1 rounded border border-neutral-600 text-[11px] disabled:opacity-30 text-white hover:bg-neutral-700">Next</button>
          </div>
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
