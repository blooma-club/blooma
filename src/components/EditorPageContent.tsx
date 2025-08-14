'use client'

import React, { useCallback, useMemo, useState, useRef } from 'react'
import { useNodesState, useEdgesState, Node, Edge, Connection } from '@xyflow/react'
import ContentMap from '@/components/canvas/ContentMap'
import { EditorHeader } from '@/components/editor/EditorHeader'
import { Storyboard, Card } from '@/types'
import { useCanvasStore } from '@/store/canvas'
import type { CustomCardNodeData } from '@/types'

// Action types for undo/redo system
interface Action {
  type: 'ADD' | 'DELETE' | 'EDIT' | 'MOVE'
  nodeId: string
  data?: any
  timestamp: number
}

export default function EditorPageContent() {
  const storyboard = useCanvasStore(s => s.storyboard)
  const cardsBySb = useCanvasStore(s => s.cards)
  const setCards = useCanvasStore(s => s.setCards)
  const saveCards = useCanvasStore(s => s.saveCards)
  const [nodes, setNodes, onNodesChange] = useNodesState<Node<CustomCardNodeData>>([])
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([])
  const [isSaving, setIsSaving] = useState(false)
  const lastSavedNodesRef = useRef<string>('')
  const isSavingRef = useRef(false) // Add ref to track saving state in useEffect

  // Action history for undo/redo
  const [actionHistory, setActionHistory] = useState<Action[]>([])
  const [historyIndex, setHistoryIndex] = useState(-1)
  const maxHistorySize = 50 // Limit history size to prevent memory issues

  // Helper function to add action to history
  const addActionToHistory = useCallback(
    (action: Omit<Action, 'timestamp'>) => {
      const newAction: Action = {
        ...action,
        timestamp: Date.now(),
      }

      setActionHistory(prev => {
        // Remove any actions after current index (when undoing and then doing new action)
        const trimmedHistory = prev.slice(0, historyIndex + 1)
        const newHistory = [...trimmedHistory, newAction]

        // Limit history size
        if (newHistory.length > maxHistorySize) {
          return newHistory.slice(-maxHistorySize)
        }
        return newHistory
      })

      setHistoryIndex(prev => Math.min(prev + 1, maxHistorySize - 1))
    },
    [historyIndex]
  )

  // Undo function
  const handleUndo = useCallback(() => {
    if (historyIndex < 0) {
      alert('Nothing to undo!')
      return
    }

    const actionToUndo = actionHistory[historyIndex]

    switch (actionToUndo.type) {
      case 'DELETE':
        // Restore deleted node
        if (actionToUndo.data) {
          const { node, connectedEdges } = actionToUndo.data

          // Restore the node
          setNodes(prev => [...prev, node])

          // Restore connected edges
          setEdges(prev => [...prev, ...connectedEdges])

          // Restore to store if we have storyboard context
          if (storyboard) {
            const currentCards = cardsBySb[storyboard.id] || []
            const restoredCard: Card = {
              id: node.id,
              storyboard_id: storyboard.id,
              user_id: storyboard.user_id || 'demo',
              type: 'hook' as const,
              title: node.data.title || 'Untitled Card',
              content: node.data.content || '',
              image_urls: node.data.imageUrls || [],
              selected_image_url: node.data.selectedImageUrl || 0,
              position_x: Math.round(node.position.x),
              position_y: Math.round(node.position.y),
              width: Math.round(typeof node.style?.width === 'number' ? node.style.width : 400),
              height: Math.round(typeof node.style?.height === 'number' ? node.style.height : 180),
              // Styling is now hardcoded for consistency
              order_index: currentCards.length,
            }

            setCards(storyboard.id, [...currentCards, restoredCard])
          }
        }
        break

      case 'ADD':
        // Remove added node
        setNodes(prev => prev.filter(n => n.id !== actionToUndo.nodeId))
        setEdges(prev =>
          prev.filter(e => e.source !== actionToUndo.nodeId && e.target !== actionToUndo.nodeId)
        )

        // Remove from store
        if (storyboard) {
          const currentCards = cardsBySb[storyboard.id] || []
          setCards(
            storyboard.id,
            currentCards.filter(c => c.id !== actionToUndo.nodeId)
          )
        }
        break

      case 'EDIT':
        // Restore previous data
        if (actionToUndo.data) {
          setNodes(prev =>
            prev.map(n => (n.id === actionToUndo.nodeId ? { ...n, data: actionToUndo.data } : n))
          )
        }
        break

      case 'MOVE':
        // Restore previous position
        if (actionToUndo.data) {
          setNodes(prev =>
            prev.map(n =>
              n.id === actionToUndo.nodeId ? { ...n, position: actionToUndo.data.position } : n
            )
          )
        }
        break
    }

    // Move history index back
    setHistoryIndex(prev => prev - 1)
  }, [historyIndex, actionHistory, setNodes, setEdges, storyboard, cardsBySb, setCards])

  // Check if undo is available
  const canUndo = historyIndex >= 0

  // Clear history after saving
  const clearHistory = useCallback(() => {
    setActionHistory([])
    setHistoryIndex(-1)
  }, [])
  // Auto-save timeout ref removed since auto-save is disabled
  // const autoSaveTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  // const initialLoadRef = useRef<boolean>(true) // Flag to prevent auto-save on initial load

  // Handle connections between nodes
  const handleConnect = useCallback(
    (connection: Connection) => {
      // Create new connection
      const newEdge: Edge = {
        id: `e${connection.source}-${connection.target}`,
        source: connection.source!,
        target: connection.target!,
        type: 'default',
      }

      // Update edges in a single operation: remove conflicting connections and add new one
      setEdges(currentEdges => {
        // Remove any existing connections from the source node as a source
        let filteredEdges = currentEdges.filter(edge => connection.source !== edge.source)

        // Remove any existing connections from the target node as a target
        filteredEdges = filteredEdges.filter(edge => connection.target !== edge.target)

        // Add the new connection
        return [...filteredEdges, newEdge]
      })
    },
    [setEdges]
  )

  // Build nodes from store cards if present
  const derived = useMemo(() => {
    if (!storyboard) return null
    const cards = cardsBySb[storyboard.id] || []
    if (!cards.length) return null

    const ns: Node<CustomCardNodeData>[] = cards.map((c, idx) => ({
      id: c.id,
      type: 'customCard',
      position: { x: c.position_x ?? 80 + idx * 340, y: c.position_y ?? 80 },
      data: {
        title: c.title,
        content: c.content,
        userInput: c.user_input || '',
        imageUrls: c.image_urls || [],
        selectedImageUrl: c.selected_image_url || 0,
      },
      style: { width: c.width ?? 400, height: c.height ?? 180 },
    }))

    const es: Edge[] = []
    for (let i = 0; i < ns.length - 1; i++) {
      es.push({
        id: `e${ns[i].id}-${ns[i + 1].id}`,
        source: ns[i].id,
        target: ns[i + 1].id,
        type: 'default',
      })
    }

    return { ns, es }
  }, [storyboard, cardsBySb])

  React.useEffect(() => {
    // Skip synchronization during save operations to prevent conflicts
    if (isSavingRef.current) {
      return
    }

    if (derived) {
      setNodes(derived.ns)
      setEdges(derived.es)
    } else {
      // If no cards, start with empty canvas
      setNodes([])
      setEdges([])
    }
  }, [derived, setNodes, setEdges])

  // Handle node drag stop to sync position changes
  const handleNodeDragStop = useCallback(
    (event: React.MouseEvent | React.TouchEvent, node: Node) => {
      // Find the node's previous position before the move
      const previousNode = nodes.find(n => n.id === node.id)
      if (
        previousNode &&
        (previousNode.position.x !== node.position.x || previousNode.position.y !== node.position.y)
      ) {
        // Record the move action in history for undo
        addActionToHistory({
          type: 'MOVE',
          nodeId: node.id,
          data: { position: previousNode.position },
        })
      }

      // Only update the local node state - don't update the store yet
      // The store will be updated when the user manually saves
    },
    [nodes, addActionToHistory]
  )

  // Handle node editing
  const handleNodeEdit = useCallback(
    (nodeId: string, data: CustomCardNodeData) => {
      // Find the current node data before editing
      const currentNode = nodes.find(n => n.id === nodeId)
      if (currentNode) {
        // Record the edit action in history for undo
        addActionToHistory({
          type: 'EDIT',
          nodeId,
          data: currentNode.data,
        })
      }

      // Update the node data in the nodes state
      setNodes(currentNodes =>
        currentNodes.map(node =>
          node.id === nodeId ? { ...node, data: { ...node.data, ...data } } : node
        )
      )

      // Don't update the store yet - let the manual save handle it
    },
    [setNodes, nodes, addActionToHistory]
  )

  // Handle node deletion
  const handleNodeDelete = useCallback(
    (nodeId: string) => {
      // Find the node and its connected edges before deletion
      const nodeToDelete = nodes.find(n => n.id === nodeId)
      const connectedEdges = edges.filter(e => e.source === nodeId || e.target === nodeId)

      if (nodeToDelete) {
        // Record the deletion action in history for undo
        addActionToHistory({
          type: 'DELETE',
          nodeId,
          data: {
            node: nodeToDelete,
            connectedEdges,
          },
        })
      }

      // Remove the node from the nodes state
      setNodes(currentNodes => currentNodes.filter(node => node.id !== nodeId))

      // Remove any edges connected to this node
      setEdges(currentEdges =>
        currentEdges.filter(edge => edge.source !== nodeId && edge.target !== nodeId)
      )

      // Also remove the card from the store to keep them in sync
      if (storyboard) {
        const currentCards = cardsBySb[storyboard.id] || []
        const updatedCards = currentCards.filter(card => card.id !== nodeId)

        setCards(storyboard.id, updatedCards)
      }
    },
    [setNodes, setEdges, storyboard, cardsBySb, setCards, nodes, edges, addActionToHistory]
  )

  // Handle edge deletion
  const handleEdgeDelete = useCallback(
    (edgeId: string) => {
      setEdges(currentEdges => currentEdges.filter(edge => edge.id !== edgeId))
    },
    [setEdges]
  )

  // Manual save function for when user wants to save explicitly
  const handleManualSave = useCallback(async () => {
    if (storyboard && nodes.length > 0) {
      setIsSaving(true)
      isSavingRef.current = true // Prevent node synchronization during save
      try {
        // Convert current nodes to cards format for saving
        const tempCardsForSave = nodes.map((node, index) => ({
          id: node.id, // Keep the existing ID if it has one
          storyboard_id: storyboard.id,
          user_id: storyboard.user_id || 'demo',
          type: 'hook' as const,
          title: node.data.title || 'Untitled Card',
          content: node.data.content || '',
          user_input: node.data.userInput || '',
          image_urls: node.data.imageUrls || [],
          selected_image_url: node.data.selectedImageUrl || 0,
          position_x: Math.round(node.position.x),
          position_y: Math.round(node.position.y),
          width: Math.round(typeof node.style?.width === 'number' ? node.style.width : 400),
          height: Math.round(typeof node.style?.height === 'number' ? node.style.height : 180),
          // Styling is now hardcoded for consistency
          order_index: index,
          // Don't include timestamp fields - let the database handle them
        }))

        // Get the current cards from the store to preserve existing data
        const currentCards = cardsBySb[storyboard.id] || []

        // Merge the current node data with existing card data to preserve timestamps
        // This ensures deleted cards are excluded since they're not in the nodes array
        const mergedCards = tempCardsForSave.map(tempCard => {
          const existingCard = currentCards.find(card => card.id === tempCard.id)
          if (existingCard) {
            // Preserve existing card data including timestamps
            const mergedCard = {
              ...existingCard,
              title: tempCard.title,
              content: tempCard.content,
              user_input: tempCard.user_input,
              image_urls: tempCard.image_urls,
              selected_image_url: tempCard.selected_image_url,
              position_x: tempCard.position_x,
              position_y: tempCard.position_y,
              width: tempCard.width,
              height: tempCard.height,
              order_index: tempCard.order_index,
            }

            return mergedCard
          } else {
            // This is a new card

            return tempCard
          }
        })

        // Update the store with merged data (deleted cards are automatically excluded)

        setCards(storyboard.id, mergedCards)

        // Save to database

        const saveResult = await saveCards(storyboard.id)

        if (saveResult) {
          lastSavedNodesRef.current = JSON.stringify(nodes)

          // Clear action history after successful save
          clearHistory()
        } else {
          console.error('Failed to save cards')
          // You could add a toast notification here
        }
      } catch (error) {
        console.error('Manual save failed:', error)
        // You could add a toast notification here
      } finally {
        setIsSaving(false)
        isSavingRef.current = false // Re-enable node synchronization
      }
    }
  }, [storyboard, nodes, cardsBySb, setCards, saveCards, clearHistory])

  // Auto-save is disabled - only manual save via button or navigation
  // React.useEffect(() => {
  //   // Auto-save functionality removed as per user preference
  //   // Changes are only saved when manually clicking save button or navigating away
  // }, [])

  // Initialize lastSavedNodesRef when nodes are first loaded
  React.useEffect(() => {
    if (nodes.length > 0 && !lastSavedNodesRef.current) {
      lastSavedNodesRef.current = JSON.stringify(nodes)
    }
  }, [nodes])

  // Add Card 버튼 클릭 시 새 노드 추가 (가장 오른쪽에)
  const handleAddCard = useCallback(() => {
    if (!storyboard) return

    // Generate a more unique ID using crypto.randomUUID if available, fallback to timestamp + random
    const newId =
      typeof crypto !== 'undefined' && crypto.randomUUID
        ? crypto.randomUUID()
        : `card-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`

    const newNode: Node<CustomCardNodeData> = {
      id: newId,
      type: 'customCard',
      position: { x: 80 + nodes.length * 340, y: 80 },
      data: {
        title: `New Card ${nodes.length + 1}`,
        content: 'Add your content here...',
        userInput: '',
        imageUrls: [],
        selectedImageUrl: 0,
      },
      style: { width: 400, height: 180 },
    }

    // Record the add action in history for undo
    addActionToHistory({
      type: 'ADD',
      nodeId: newId,
    })

    // Add new node without creating any edges
    setNodes(nds => [...nds, newNode])

    // Don't update the store directly here - let the manual save handle it
    // This prevents infinite loops while still maintaining the node state
  }, [nodes, setNodes, storyboard, addActionToHistory])

  // Test API connection function removed as it's not being used

  const headerStoryboard: Storyboard = storyboard ?? {
    id: 'demo',
    user_id: 'demo',
    project_id: 'demo',
    title: 'Demo Storyboard',
    description: 'Demo',
    is_public: false,
    created_at: '',
    updated_at: '',
  }

  return (
    <div className="w-screen h-screen flex flex-col">
      <EditorHeader
        storyboard={headerStoryboard}
        isAutoSaving={isSaving}
        onManualSave={handleManualSave}
      />
      <div className="flex-1">
        <ContentMap
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onAddCard={handleAddCard}
          onConnect={handleConnect}
          onNodeDragStop={handleNodeDragStop}
          onNodeEdit={handleNodeEdit}
          onNodeDelete={handleNodeDelete}
          onEdgeDelete={handleEdgeDelete}
          onUndo={handleUndo}
          canUndo={canUndo}
        />
      </div>
    </div>
  )
}
