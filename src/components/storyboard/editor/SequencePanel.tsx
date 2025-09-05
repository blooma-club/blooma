"use client";
import React from 'react';
import type { StoryboardFrame } from '@/types/storyboard';

interface SequencePanelProps {
  frames: StoryboardFrame[];
  currentIndex: number;
  onSelect: (index: number) => void;
  onAddFrame?: () => void;
}

export const SequencePanel: React.FC<SequencePanelProps> = ({ frames, currentIndex, onSelect, onAddFrame }) => {
  const currentFrame = frames[currentIndex];

  return (
    <div className="flex flex-col gap-6 p-4 text-sm">
      {/* Frames Section */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold tracking-wide text-neutral-300 uppercase">Frames</h3>
          {onAddFrame && <button onClick={onAddFrame} className="px-3 py-2 rounded border border-neutral-700 text-sm hover:bg-neutral-800 text-white">＋</button>}
        </div>
        <ul className="space-y-2">
          {frames.map((f, i) => {
            const active = i === currentIndex;
            return (
              <li key={f.id}>
                <button
                  onClick={() => onSelect(i)}
                  className={
                    `group w-full flex items-center gap-3 px-3 py-2 rounded border text-left transition-colors ${active ? 'bg-white text-black border-white' : 'bg-neutral-800 hover:bg-neutral-700 border-neutral-700 text-white'}`
                  }
                >
                  <div className="flex-1 truncate">
                    <span className="mr-2 text-sm opacity-60">{i + 1}.</span>
                    <span className="truncate text-sm">{(f.shotDescription || f.imagePrompt || 'Untitled').slice(0, 50)}</span>
                  </div>
                  {f.status && <span className="text-xs uppercase tracking-wide text-neutral-500">{f.status}</span>}
                </button>
              </li>
            );
          })}
          {frames.length === 0 && (
            <li className="text-neutral-400 text-sm italic py-6 text-center border border-neutral-700 rounded">No frames</li>
          )}
        </ul>
      </div>

      {/* Metadata Section */}
      {currentFrame && (
        <div>
          <h3 className="text-sm font-semibold tracking-wide text-neutral-300 uppercase mb-3">Metadata</h3>
          <div className="space-y-3 text-sm">
            <div>
              <div className="text-neutral-400 mb-2">Scene</div>
              <div className="text-white bg-neutral-800 px-3 py-2 rounded border border-neutral-700">{currentFrame.scene || 'N/A'}</div>
            </div>
            <div>
              <div className="text-neutral-400 mb-2">Shot</div>
              <div className="text-white bg-neutral-800 px-3 py-2 rounded border border-neutral-700">{currentFrame.shot || 'N/A'}</div>
            </div>
            <div>
              <div className="text-neutral-400 mb-2">Dialogue / VO</div>
              <div className="text-white bg-neutral-800 px-3 py-2 rounded border border-neutral-700 max-h-20 overflow-y-auto">{currentFrame.dialogue || 'N/A'}</div>
            </div>
            <div>
              <div className="text-neutral-400 mb-2">Sound</div>
              <div className="text-white bg-neutral-800 px-3 py-2 rounded border border-neutral-700">{currentFrame.sound || 'N/A'}</div>
            </div>
            <div>
              <div className="text-neutral-400 mb-2">Description</div>
              <div className="text-white bg-neutral-800 px-3 py-2 rounded border border-neutral-700 max-h-24 overflow-y-auto text-sm leading-relaxed">{currentFrame.shotDescription || 'N/A'}</div>
            </div>
            {currentFrame.imagePrompt && currentFrame.imagePrompt.trim() !== (currentFrame.shotDescription || '').trim() && (
              <div>
                <div className="text-neutral-400 mb-2">Image Prompt</div>
                <div className="text-white bg-neutral-800 px-3 py-2 rounded border border-neutral-700 max-h-24 overflow-y-auto text-sm leading-relaxed font-mono">{currentFrame.imagePrompt}</div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default SequencePanel;
