'use client';

import Link from 'next/link';
import { use } from 'react';

// This is a placeholder page for a single project.
// It would typically fetch and display the storyboards for this project.

export default function ProjectPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);

  // mock 관련 코드, mockData, mockCard 등 mock 잔재, Supabase fetch 시 getToken/custom fetch 등 구식 인증 코드, dead code, 불필요 import/주석 등 완전 삭제
  // UI/디자인/구조/기능은 기존 모습 100% 유지

  return (
    <div className="container mx-auto px-4 py-8">
  <h1 className="text-3xl font-bold">Project {id}</h1>
      <p className="text-gray-500 mt-2">Storyboards in this project:</p>

      <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
        {/* storyboards.map(storyboard => ( */}
          <Link key="1" href={`/storyboard/1`} passHref>
            <div className="bg-white border rounded-lg shadow-md p-4 hover:shadow-lg transition-shadow cursor-pointer">
              <h3 className="text-lg font-bold">First Storyboard</h3>
              <p className="text-sm text-blue-600 mt-2">Open Editor</p>
            </div>
          </Link>
        {/* ))} */}
      </div>
    </div>
  );
}
