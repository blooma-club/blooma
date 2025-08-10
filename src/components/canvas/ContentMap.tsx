'use client'

import React, { useRef } from 'react'
import {
  ReactFlow,
  Controls,
  Background,
  MiniMap,
  BackgroundVariant,
  Node,
  Edge,
  OnNodeDrag,
  NodeChange,
  EdgeChange
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import CustomCardNode from './CustomCardNode'
import type { CustomCardNodeData } from '@/types'

const nodeTypes = {
  customCard: CustomCardNode,
}

interface ContentMapProps {
  nodes: Node<CustomCardNodeData>[]
  edges: Edge[]
  onNodesChange?: (changes: NodeChange[]) => void
  onEdgesChange?: (changes: EdgeChange[]) => void
  onNodeDragStop?: OnNodeDrag
  onAddCard?: (position: { x: number; y: number }) => void
}


const ContentMap: React.FC<ContentMapProps> = ({
  nodes,
  edges,
  onNodesChange,
  onEdgesChange,
  onNodeDragStop,
  onAddCard
}) => {
  const reactFlowWrapper = useRef<HTMLDivElement>(null);


  // 캔버스 클릭 시 아무 동작도 하지 않음 (카드 추가는 Add Card 버튼에서만)
  const handlePaneClick = (event: React.MouseEvent) => {
    // 예: 선택 해제 등 다른 용도로만 사용 가능
  };

  return (
    <div ref={reactFlowWrapper} style={{ height: '100%', width: '100%', position: 'relative' }}>
      {onAddCard && (
        <button
          style={{
            position: 'absolute',
            top: 16,
            right: 24,
            zIndex: 10,
            padding: '8px 16px',
            background: '#2563eb',
            color: '#fff',
            borderRadius: 8,
            fontWeight: 600,
            boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
            border: 'none',
            cursor: 'pointer',
            transition: 'background 0.2s',
          }}
          onClick={() => onAddCard({ x: 100, y: 100 })}
          onMouseOver={e => (e.currentTarget.style.background = '#1d4ed8')}
          onMouseOut={e => (e.currentTarget.style.background = '#2563eb')}
        >
          Add Card
        </button>
      )}
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeDragStop={onNodeDragStop}
        nodeTypes={nodeTypes}
        minZoom={0.1}
        maxZoom={1.5}
        snapToGrid={false}
        snapGrid={[1, 1]}
        selectNodesOnDrag={false}
        panOnDrag={true}
        zoomOnScroll={true}
        attributionPosition="bottom-left"
        onPaneClick={handlePaneClick}
      >
        <Background variant={BackgroundVariant.Dots} gap={20} size={1} color="#e5e7eb" />
        <Controls position="top-left" />
        <MiniMap 
          nodeColor={(node: Node) => {
            switch (node.type) {
              case 'customCard':
                return '#3b82f6'
              case 'input':
                return '#0ea5e9'
              case 'output':
                return '#ef4444'
              default:
                return '#10b981'
            }
          }}
          maskColor="rgba(0, 0, 0, 0.1)"
          style={{
            backgroundColor: '#ffffff',
            border: '1px solid #e5e7eb',
            borderRadius: '8px',
          }}
          position="bottom-left"
        />
      </ReactFlow>
    </div>
  );
};

export default ContentMap 