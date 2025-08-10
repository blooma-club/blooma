"use client";

import React, { useCallback, useMemo } from 'react';
import { useNodesState, useEdgesState } from '@xyflow/react';
import ContentMap from '@/components/canvas/ContentMap';
import { EditorHeader } from '@/components/editor/EditorHeader';
import { Storyboard } from '@/types';
import { useCanvasStore } from '@/store/canvas';

const initialNodes: any[] = [
  {
    id: '1',
    type: 'customCard',
    position: { x: 80, y: 80 },
    data: { title: 'Node 1', content: 'This is node 1', imageUrl: undefined },
    style: { width: 400, height: 'auto' },
  },
  {
    id: '2',
    type: 'customCard',
    position: { x: 420, y: 80 },
    data: { title: 'Node 2', content: 'This is node 2', imageUrl: undefined },
    style: { width: 400, height: 'auto' },
  },
];

const initialEdges: any[] = [
  { id: 'e1-2', source: '1', target: '2', type: 'default' },
];

export default function EditorPageContent() {
  const storyboard = useCanvasStore(s => s.storyboard)
  const cardsBySb = useCanvasStore(s => s.cards)
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  // Build nodes from store cards if present
  const derived = useMemo(() => {
    if (!storyboard) return null
    const cards = cardsBySb[storyboard.id] || []
    if (!cards.length) return null
    const ns = cards.map((c, idx) => ({
      id: c.id,
      type: 'customCard',
      position: { x: c.position_x ?? 80 + idx * 340, y: c.position_y ?? 80 },
      data: { title: c.title, content: c.content, imageUrl: c.image_url },
      style: { width: c.width ?? 400, height: 'auto' },
    }))
    const es = ns.slice(1).map((n, i) => ({ id: `e${ns[i].id}-${n.id}`, source: ns[i].id, target: n.id, type: 'default' }))
    return { ns, es }
  }, [storyboard, cardsBySb])

  React.useEffect(() => {
    if (derived) {
      setNodes(derived.ns as any)
      setEdges(derived.es as any)
    }
  }, [derived, setNodes, setEdges])

  // Add Card 버튼 클릭 시 새 노드 추가 (가장 오른쪽에)
  const handleAddCard = useCallback(() => {
    const newId = (nodes.length + 1).toString();
    const newNode = {
      id: newId,
      type: 'customCard',
      position: { x: 80 + nodes.length * 340, y: 80 },
      data: { title: `Node ${newId}`, content: `This is node ${newId}`, imageUrl: undefined },
      style: { width: 400, height: 'auto' },
    };
    setNodes((nds) => [...nds, newNode]);
    // 새 노드를 이전 노드와 연결
    if (nodes.length > 0) {
      setEdges((eds) => [
        ...eds,
        { id: `e${nodes.length}-${newId}`, source: nodes[nodes.length - 1].id, target: newId, type: 'default' },
      ]);
    }
  }, [nodes, setNodes, setEdges]);

  const headerStoryboard: Storyboard = storyboard ?? {
    id: 'demo', user_id: 'demo', project_id: 'demo', title: 'Demo Storyboard', description: 'Demo', is_public: false, created_at: '', updated_at: ''
  }

  return (
    <div className="w-screen h-screen flex flex-col">
      <EditorHeader storyboard={headerStoryboard} />
    <div className="flex-1">
        <ContentMap
      nodes={nodes as any}
      edges={edges as any}
      onNodesChange={onNodesChange as any}
      onEdgesChange={onEdgesChange as any}
          onAddCard={handleAddCard}
        />
      </div>
    </div>
  );
}