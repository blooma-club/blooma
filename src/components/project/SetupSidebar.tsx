'use client'

import React from 'react';
import { Settings, Book } from 'lucide-react';
import { useRouter, useParams } from 'next/navigation';

const SetupSidebar = () => {
  const router = useRouter();
  const params = useParams();
  const id = params.id;

  return (
  <aside className="w-60 shrink-0 bg-white flex flex-col py-6 px-5">
      <div className="flex items-center gap-2 mb-6">
        <img src="/blooma.svg" alt="Blooma" className="w-6 h-6 object-contain" />
        <span className="font-semibold tracking-tight text-gray-900">Blooma</span>
      </div>
      <nav className="flex flex-col gap-1 text-sm">
        <button
          onClick={() => router.push(`/project/${id}/setup`)}
          className="flex items-center gap-2 px-3 py-2 rounded-md text-gray-600 hover:text-gray-900 hover:bg-gray-50 transition-colors"
        >
          <Book className="w-4 h-4 text-gray-500" />
          <span className="font-medium">Storyboard Setup</span>
        </button>
        <button
          disabled
          className="flex items-center gap-2 px-3 py-2 rounded-md text-gray-400 cursor-not-allowed"
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
