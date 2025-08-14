'use client'

import React, { useRef, useState } from 'react'
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
  EdgeChange,
  Connection,
  addEdge,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import CustomCardNode from './CustomCardNode'
import EditModal from './EditModal'
import type { CustomCardNodeData } from '@/types'

interface ContentMapProps {
  nodes: Node<CustomCardNodeData>[]
  edges: Edge[]
  onNodesChange?: (changes: NodeChange[]) => void
  onEdgesChange?: (changes: EdgeChange[]) => void
  onNodeDragStop?: OnNodeDrag
  onAddCard?: (position: { x: number; y: number }) => void
  onConnect?: (connection: Connection) => void
  onNodeEdit?: (nodeId: string, data: CustomCardNodeData) => void
  onNodeDelete?: (nodeId: string) => void
  onEdgeDelete?: (edgeId: string) => void
  onUndo?: () => void
  canUndo?: boolean
  allCards?: any[] // All cards in the storyboard for selection
}

const ContentMap: React.FC<ContentMapProps> = ({
  nodes,
  edges,
  onNodesChange,
  onEdgesChange,
  onNodeDragStop,
  onAddCard,
  onConnect,
  onNodeEdit,
  onNodeDelete,
  onEdgeDelete,
  onUndo,
  canUndo = false,
  allCards,
}) => {
  const reactFlowWrapper = useRef<HTMLDivElement>(null)
  const [editingNode, setEditingNode] = useState<Node<CustomCardNodeData> | null>(null)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; edgeId?: string } | null>(
    null
  )

  // Define nodeTypes inside the component to access props
  const nodeTypes = {
    customCard: (props: any) => (
      <CustomCardNode {...props} onNodeDelete={onNodeDelete} allCards={allCards} />
    ),
  }

  // 캔버스 클릭 시 아무 동작도 하지 않음 (카드 추가는 Add Card 버튼에서만)
  const handlePaneClick = (event: React.MouseEvent) => {
    // 예: 선택 해제 등 다른 용도로만 사용 가능
  }

  // Handle connection between nodes
  const handleConnect = (connection: Connection) => {
    if (onConnect) {
      onConnect(connection)
    }
  }

  // Handle node drag stop to sync position changes
  const handleNodeDragStop: OnNodeDrag = (event, node, nodes) => {
    if (onNodeDragStop) {
      onNodeDragStop(event, node, nodes)
    }
  }

  // Handle node double click to open edit modal
  const handleNodeDoubleClick = (event: React.MouseEvent, node: Node<CustomCardNodeData>) => {
    setEditingNode(node)
    setIsEditModalOpen(true)
  }

  // Handle save from edit modal
  const handleEditSave = (data: CustomCardNodeData) => {
    if (editingNode && onNodeEdit) {
      onNodeEdit(editingNode.id, data)
    }
    setIsEditModalOpen(false)
    setEditingNode(null)
  }

  // Handle close edit modal
  const handleEditClose = () => {
    setIsEditModalOpen(false)
    setEditingNode(null)
  }

  // Handle delete card
  const handleDeleteCard = () => {
    if (editingNode && onNodeDelete) {
      onNodeDelete(editingNode.id)
    }
    setIsEditModalOpen(false)
    setEditingNode(null)
  }

  // Handle edge right-click
  const handleEdgeContextMenu = (event: React.MouseEvent, edge: Edge) => {
    event.preventDefault()
    setContextMenu({ x: event.clientX, y: event.clientY, edgeId: edge.id })
  }

  // Handle edge deletion
  const handleDeleteEdge = () => {
    if (contextMenu?.edgeId && onEdgeDelete) {
      onEdgeDelete(contextMenu.edgeId)
    }
    setContextMenu(null)
  }

  // Handle canvas click to close context menu
  const handleCanvasClick = () => {
    setContextMenu(null)
  }

  return (
    <div ref={reactFlowWrapper} style={{ height: '100%', width: '100%', position: 'relative' }}>
      {onAddCard && (
        <div className="absolute top-4 right-6 z-10 flex gap-2">
          <button
            style={{
              padding: '8px 16px',
              background: canUndo ? '#059669' : '#9ca3af',
              color: '#fff',
              borderRadius: 8,
              fontWeight: 600,
              boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
              border: 'none',
              cursor: canUndo ? 'pointer' : 'not-allowed',
              transition: 'background 0.2s',
            }}
            onClick={() => {
              if (canUndo && onUndo) {
                onUndo()
              } else {
                alert('Nothing to undo!')
              }
            }}
            disabled={!canUndo}
            onMouseOver={e => {
              if (canUndo) {
                e.currentTarget.style.background = '#047857'
              }
            }}
            onMouseOut={e => {
              if (canUndo) {
                e.currentTarget.style.background = '#059669'
              }
            }}
          >
            Undo
          </button>
          <button
            style={{
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
        </div>
      )}
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeDragStop={handleNodeDragStop}
        onConnect={handleConnect}
        onNodeDoubleClick={handleNodeDoubleClick}
        onEdgeContextMenu={handleEdgeContextMenu}
        onPaneClick={handleCanvasClick}
        nodeTypes={nodeTypes}
        minZoom={0.1}
        maxZoom={1.5}
        snapToGrid={false}
        snapGrid={[1, 1]}
        selectNodesOnDrag={false}
        panOnDrag={true}
        zoomOnScroll={true}
        attributionPosition="bottom-left"
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

      {/* Edit Modal */}
      {editingNode && (
        <EditModal
          isOpen={isEditModalOpen}
          onClose={handleEditClose}
          onSave={handleEditSave}
          onDelete={handleDeleteCard}
          nodeData={editingNode.data}
        />
      )}

      {/* Context Menu */}
      {contextMenu && (
        <div
          className="fixed bg-white border border-gray-300 rounded-lg shadow-lg z-50 py-1"
          style={{ left: contextMenu.x, top: contextMenu.y }}
        >
          <button
            onClick={handleDeleteEdge}
            className="w-full px-4 py-2 text-left text-red-600 hover:bg-red-50 text-sm"
          >
            Delete Connection
          </button>
        </div>
      )}
    </div>
  )
}

export default ContentMap
