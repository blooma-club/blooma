'use client'

import React from 'react';
import { Settings, Book, Film, Edit3 } from 'lucide-react';
import { useRouter, useParams, usePathname, useSearchParams } from 'next/navigation';
import { loadLastStoryboardId } from '@/lib/localStorage';

const SetupSidebar = () => {
  const router = useRouter();
  const params = useParams();
  const pathname = usePathname();
  const id = params.id;
  const searchParams = useSearchParams();
  const sbIdFromUrl = (searchParams?.get('sbId') || '').trim();

  // 현재 경로가 Storyboard 페이지인지 확인
  const isStoryboardPage = pathname.includes('/storyboard');
  const isSetupPage = pathname.includes('/setup');
  const isEditorPage = false;

  return (
  <aside className="w-60 shrink-0 bg-neutral-900 flex flex-col py-6 px-5 border-r border-neutral-700">
      <div className="flex items-center gap-2 mb-6">
        <img src="/blooma.svg" alt="Blooma" className="w-6 h-6 object-contain" />
        <span className="font-semibold tracking-tight text-white">Blooma</span>
      </div>
      <nav className="flex flex-col gap-1 text-sm">
        <button
          onClick={() => router.push(`/project/${id}/setup`)}
          className={`flex items-center gap-2 px-3 py-2 rounded-md transition-colors ${
            isSetupPage 
              ? 'bg-neutral-700 text-white cursor-default' 
              : 'text-neutral-300 hover:text-white hover:bg-neutral-800'
          }`}
          disabled={isSetupPage}
        >
          <Book className={`w-4 h-4 ${isSetupPage ? 'text-white' : 'text-neutral-400'}`} />
          <span className="font-medium">Storyboard Setup</span>
        </button>
        <button
          onClick={() => {
            const sb = sbIdFromUrl || (typeof window !== 'undefined' ? loadLastStoryboardId(String(id)) : null);
            router.push(sb ? `/project/${id}/storyboard/${sb}` : `/project/${id}/storyboard`)
          }}
          className={`flex items-center gap-2 px-3 py-2 rounded-md transition-colors ${
            isStoryboardPage && !isEditorPage
              ? 'bg-neutral-700 text-white' 
              : 'text-neutral-300 hover:text-white hover:bg-neutral-800'
          }`}
        >
          <Film className={`w-4 h-4 ${isStoryboardPage && !isEditorPage ? 'text-white' : 'text-neutral-400'}`} />
          <span className="font-medium">Storyboard</span>
        </button>
        {/* Editor item removed (Canvas is integrated into Storyboard tab) */}
        <button
          disabled
          className="flex items-center gap-2 px-3 py-2 rounded-md text-neutral-500 cursor-not-allowed"
        >
          <Settings className="w-4 h-4" />
          <span className="font-medium">Settings</span>
        </button>
  <div className="mt-auto pt-8" />
      </nav>
    </aside>
  );
};

export default SetupSidebar;
