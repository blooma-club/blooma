"use client";

import { ReactFlowProvider } from '@xyflow/react';
import EditorPageContent from '@/components/EditorPageContent';
import '@xyflow/react/dist/style.css';

export default function ProjectEditorPage() {
  // storyboardId 없이 에디터만 보여줌 (추후 내부에서 선택/생성 가능)
  return (
    <ReactFlowProvider>
      <EditorPageContent />
    </ReactFlowProvider>
  );
}
