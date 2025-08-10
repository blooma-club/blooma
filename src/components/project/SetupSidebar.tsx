'use client'

import React from 'react';
import { Button } from '@/components/ui/button';
import { Settings, Book, Bot } from 'lucide-react';
import { useRouter, useParams } from 'next/navigation';

const SetupSidebar = () => {
  const router = useRouter();
  const params = useParams();
  const id = params.id;

  return (
    <div className="bg-white w-64 h-screen p-4 border-r border-gray-900 flex flex-col sticky top-0">
      <div className="flex items-center gap-2 mb-8">
        <img
          src="/blooma.svg"
          alt="Blooma Logo"
          className="w-10 h-10 object-contain"
        />
        <span className="text-2xl font-bold text-gray-900">Blooma</span>
      </div>
      <nav className="flex flex-col gap-2 h-full">
        <Button 
          variant="ghost" 
          className="justify-start gap-2"
          onClick={() => router.push(`/project/${id}/setup`)}
        >
          <Book className="w-5 h-5" />
          <span>Storyboard Setup</span>
        </Button>
        <Button 
          variant="ghost" 
          className="justify-start gap-2"
          onClick={() => router.push(`/project/${id}/ai-script`)}
        >
          <Bot className="w-5 h-5" />
          <span>Script Generator</span>
        </Button>
        {/* <Button variant="ghost" className="justify-start gap-2">
          <Bot className="w-5 h-5" />
          <span>AI Script</span>
        </Button> */}
        <div className="flex-1" />
        <Button variant="ghost" className="justify-start gap-2">
          <Settings className="w-5 h-5" />
          <span>Settings</span>
        </Button>
      </nav>
    </div>
  );
};

export default SetupSidebar;
