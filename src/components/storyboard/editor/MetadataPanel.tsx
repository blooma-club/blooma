"use client";
import React from 'react';
import type { StoryboardFrame } from '@/types/storyboard';

interface MetadataPanelProps {
  frame?: StoryboardFrame;
  onChange: (patch: Partial<StoryboardFrame>) => void;
}

export const MetadataPanel: React.FC<MetadataPanelProps> = ({ frame, onChange }) => {
  if (!frame) return <div className="p-4 text-xs text-neutral-300">No frame selected.</div>;
  return (
    <form className="flex flex-col gap-3 p-4 text-xs">
      <Section title="Scene">
        <input type="number" min={1} value={frame.scene || 1} onChange={e=>onChange({ scene: Number(e.target.value) })} className="w-full border border-neutral-600 rounded px-2 py-1 bg-neutral-800 text-white" />
      </Section>
      <Section title="Shot Description">
        <textarea value={frame.shotDescription || ''} onChange={e=>onChange({ shotDescription: e.target.value })} rows={3} className="w-full border border-neutral-600 rounded px-2 py-1 resize-y bg-neutral-800 text-white" />
      </Section>
      <Section title="Image Prompt" hint="Prompt for generating images separate from description">
        <textarea value={frame.imagePrompt || ''} onChange={e=>onChange({ imagePrompt: e.target.value })} rows={3} className="w-full border border-neutral-600 rounded px-2 py-1 resize-y font-mono bg-neutral-800 text-white" />
      </Section>
      <Section title="Shot">
        <input value={frame.shot} onChange={e=>onChange({ shot: e.target.value })} className="w-full border border-neutral-600 rounded px-2 py-1 bg-neutral-800 text-white" />
      </Section>
      <Section title="Dialogue / VO">
        <input value={frame.dialogue} onChange={e=>onChange({ dialogue: e.target.value })} className="w-full border border-neutral-600 rounded px-2 py-1 bg-neutral-800 text-white" />
      </Section>
      <Section title="Sound">
        <input value={frame.sound} onChange={e=>onChange({ sound: e.target.value })} className="w-full border border-neutral-600 rounded px-2 py-1 bg-neutral-800 text-white" />
      </Section>
    </form>
  );
};

const Section: React.FC<{ title: string; hint?: string; children: React.ReactNode }> = ({ title, hint, children }) => (
  <div className="flex flex-col gap-1">
    <label className="text-[11px] font-medium text-neutral-300">{title}</label>
    {children}
    {hint && <p className="text-[10px] text-neutral-400">{hint}</p>}
  </div>
);

export default MetadataPanel;
