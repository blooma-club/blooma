"use client";

import React, { useState } from 'react';
import type { StoryboardFrame } from '@/types/storyboard';
import { useStoryboardStore } from '@/store/storyboard';
import Image from 'next/image';

export interface FrameEditModalProps {
  frame: StoryboardFrame;
  storyboardId: string;
  onClose: () => void;
  onSaved?: (updated: StoryboardFrame) => void;
}

const FrameEditModal: React.FC<FrameEditModalProps> = ({ frame, storyboardId, onClose, onSaved }) => {
  const [draft, setDraft] = useState<StoryboardFrame>({ ...frame });
  const setCards = useStoryboardStore(s => s.setCards);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const state = useStoryboardStore.getState();
    const currentCards = state.cards[storyboardId] || [];
    const updatedCards = currentCards.map((card: any) => card.id === draft.id ? {
      ...card,
      scene_number: draft.scene,
      shot_description: draft.shotDescription,
      shot_type: draft.shot,
      dialogue: draft.dialogue,
      sound: draft.sound,
      image_prompt: draft.imagePrompt
    } : card);
    setCards(storyboardId, updatedCards);
    const cardToPersist = updatedCards.find((c: any) => c.id === draft.id);
    if (cardToPersist) {
      try {
        const res = await fetch('/api/cards', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ cards: [{
            id: cardToPersist.id,
            storyboard_id: cardToPersist.storyboard_id,
            user_id: cardToPersist.user_id,
            type: cardToPersist.type,
            title: cardToPersist.title,
            content: cardToPersist.content,
            user_input: cardToPersist.user_input,
            image_urls: cardToPersist.image_urls,
            selected_image_url: cardToPersist.selected_image_url,
            order_index: cardToPersist.order_index,
            scene_number: cardToPersist.scene_number,
            shot_type: cardToPersist.shot_type,
            dialogue: cardToPersist.dialogue,
            sound: cardToPersist.sound,
            image_prompt: cardToPersist.image_prompt,
            storyboard_status: cardToPersist.storyboard_status,
            shot_description: cardToPersist.shot_description,
            next_card_id: cardToPersist.next_card_id,
            prev_card_id: cardToPersist.prev_card_id,
          }] })
        });
        if (!res.ok) {
          console.warn('⚠️ 메타데이터 저장 실패', await res.text());
        }
      } catch (err) {
        console.warn('⚠️ 메타데이터 저장 중 오류', err);
      }
    }
    onSaved?.(draft);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70" onClick={onClose} />
      <div className="relative w-full max-w-5xl bg-gray-900 rounded-xl border border-gray-700 shadow-xl p-0 overflow-hidden">
        <div className="flex flex-col md:flex-row h-full max-h-[85vh]">
          <div className="md:w-1/2 w-full bg-gray-900 relative flex items-center justify-center">
            {draft.imageUrl ? (
              <div className="relative w-full h-full">
                <Image src={draft.imageUrl} alt="frame" fill className="object-contain" />
              </div>
            ) : (
              <div className="text-gray-400 text-xs">No image</div>
            )}
            <button type="button" onClick={onClose} className="absolute top-2 right-2 bg-black/80 text-white rounded-md px-2 py-1 text-[11px] hover:bg-black">Close</button>
            <div className="absolute bottom-2 left-2 bg-gray-800/80 backdrop-blur px-2 py-0.5 rounded text-[11px] font-light text-white">Scene {draft.scene}</div>
          </div>
          <div className="md:w-1/2 w-full flex flex-col p-6 overflow-y-auto text-sm">
            <h3 className="text-sm font-semibold mb-4 text-white">Frame editing</h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <Field label="Scene">
                <input type="number" min={1} value={draft.scene || 1} onChange={e=>setDraft(d=>({...d,scene:Number(e.target.value)}))} className="px-2 py-1.5 rounded border border-gray-600 bg-gray-800 text-white text-xs w-full focus:border-gray-500 focus:outline-none" />
              </Field>
              <Field label="Shot Description">
                <textarea value={draft.shotDescription || ''} onChange={e=>setDraft(d=>({...d,shotDescription:e.target.value}))} rows={4} className="px-2 py-1.5 rounded border border-gray-600 bg-gray-800 text-white text-xs resize-y w-full focus:border-gray-500 focus:outline-none" />
              </Field>
              <Field label="Image Prompt" help="Prompt for generating images separate from Shot Description.">
                <textarea value={draft.imagePrompt || ''} onChange={e=>setDraft(d=>({...d,imagePrompt:e.target.value}))} rows={4} className="px-2 py-1.5 rounded border border-gray-600 bg-gray-800 text-white text-xs resize-y font-mono w-full focus:border-gray-500 focus:outline-none" />
              </Field>
              <Field label="Shot">
                <input type="text" value={draft.shot} onChange={e=>setDraft(d=>({...d,shot:e.target.value}))} required className="px-2 py-1.5 rounded border border-gray-600 bg-gray-800 text-white text-xs w-full focus:border-gray-500 focus:outline-none" />
              </Field>
              <Field label="Dialogue / VO">
                <input type="text" value={draft.dialogue} onChange={e=>setDraft(d=>({...d,dialogue:e.target.value}))} required className="px-2 py-1.5 rounded border border-gray-600 bg-gray-800 text-white text-xs w-full focus:border-gray-500 focus:outline-none" />
              </Field>
              <Field label="Sound">
                <input type="text" value={draft.sound} onChange={e=>setDraft(d=>({...d,sound:e.target.value}))} required className="px-2 py-1.5 rounded border border-gray-600 bg-gray-800 text-white text-xs w-full focus:border-gray-500 focus:outline-none" />
              </Field>
              <div className="flex justify-end gap-2 pt-2 border-t border-gray-700">
                <button type="button" onClick={onClose} className="px-4 py-1.5 rounded border border-gray-600 text-gray-300 text-xs hover:border-gray-500 hover:text-white transition-colors">Cancel</button>
                <button type="submit" className="px-5 py-1.5 rounded bg-white text-black text-xs hover:bg-gray-200 transition-colors">Save</button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

const Field: React.FC<{label: string; help?: string; children: React.ReactNode}> = ({ label, help, children }) => (
  <div className="flex flex-col gap-1">
    <label className="text-xs font-medium text-gray-300">{label}</label>
    {children}
    {help && <p className="text-[10px] text-gray-400">{help}</p>}
  </div>
);

export default FrameEditModal;
