'use client'

import React, { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Copy,
  RefreshCw,
  Maximize2,
  MoreHorizontal,
  ArrowDown,
  Sparkles
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { PromptDock } from '@/components/storyboard/PromptDock'
import { cn } from '@/lib/utils'

// --- Types ---
interface PlaygroundImage {
  id: string
  url: string
}

interface GenerationSession {
  id: string
  prompt: string
  timestamp: Date
  model: string
  status: 'generating' | 'completed' | 'failed'
  images: (PlaygroundImage | null)[] // null이면 로딩 중인 슬롯
}

// --- Components ---

// 1. 개별 이미지 슬롯
const ImageSlot = ({ img, isLoading }: { img: PlaygroundImage | null; isLoading: boolean }) => {
  return (
    <div className="group relative w-full h-full aspect-square overflow-hidden rounded-xl bg-muted/10 border border-white/5 shadow-inner">
      <AnimatePresence mode="wait">
        {isLoading ? (
          <motion.div
            key="loading"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 flex items-center justify-center"
          >
            {/* Shimmer Effect */}
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full animate-[shimmer_1.5s_infinite]" />
            <Sparkles className="w-6 h-6 text-violet-500/50 animate-pulse" />
          </motion.div>
        ) : img ? (
          <motion.div
            key="image"
            initial={{ opacity: 0, scale: 1.05 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full h-full"
          >
            <img
              src={img.url}
              alt="Generated result"
              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
            />
            {/* Hover Actions */}
            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center gap-2 backdrop-blur-[2px]">
              <Button size="icon" variant="glass" className="h-8 w-8 rounded-full">
                <Maximize2 className="w-4 h-4 text-white" />
              </Button>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  )
}

// 2. 생성 세션 블록 (Midjourney Row Style)
const SessionBlock = ({ session, isLast }: { session: GenerationSession, isLast: boolean }) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        "w-full max-w-5xl mx-auto flex flex-col md:flex-row gap-6 p-6 md:p-8 transition-colors hover:bg-white/5 rounded-3xl mb-4",
        // 마지막 아이템(최신)은 약간의 강조 효과
        isLast && "bg-white/[0.02] border border-white/5"
      )}
    >
      {/* Left: Prompt & Meta Info */}
      <div className="md:w-1/3 flex flex-col gap-3 min-w-0">
        <div className="flex items-center gap-3 mb-1">
          <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-violet-600 to-indigo-600 flex items-center justify-center text-[10px] font-bold text-white shadow-lg shadow-violet-500/20">
            AI
          </div>
          <div className="flex flex-col">
            <span className="text-xs font-semibold text-foreground/90">Generating Session</span>
            <span className="text-[10px] text-muted-foreground">{session.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
          </div>
        </div>

        <div className="relative group/prompt">
          <div className="bg-muted/30 rounded-2xl p-4 border border-border/40 backdrop-blur-sm text-sm font-medium leading-relaxed text-foreground/80 group-hover/prompt:text-foreground transition-colors">
            {session.prompt}
          </div>
        </div>

        {/* Actions Toolbar */}
        <div className="flex items-center gap-1 mt-auto opacity-60 hover:opacity-100 transition-opacity">
          <Button variant="ghost" size="sm" className="h-7 text-xs gap-1.5 px-2 rounded-lg">
            <Copy className="w-3 h-3" /> Copy
          </Button>
          <Button variant="ghost" size="sm" className="h-7 text-xs gap-1.5 px-2 rounded-lg">
            <RefreshCw className="w-3 h-3" /> Re-roll
          </Button>
          <Button variant="ghost" size="icon" className="h-7 w-7 rounded-lg ml-auto">
            <MoreHorizontal className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>

      {/* Right: 4-Grid Images */}
      <div className="md:w-2/3">
        <div className="grid grid-cols-2 gap-3 aspect-square sm:aspect-[4/3] rounded-2xl overflow-hidden bg-black/20 p-3 border border-white/5 shadow-2xl">
          {/* 4개 슬롯 고정 */}
          {Array.from({ length: 4 }).map((_, idx) => (
            <ImageSlot
              key={idx}
              img={session.images[idx]}
              isLoading={session.status === 'generating' && !session.images[idx]}
            />
          ))}
        </div>
      </div>
    </motion.div>
  )
}

// 3. 메인 페이지
export default function PlaygroundPage() {
  const [sessions, setSessions] = useState<GenerationSession[]>([])
  const bottomRef = useRef<HTMLDivElement>(null)
  const scrollContainerRef = useRef<HTMLDivElement>(null)

  // 세션이 추가되거나 상태가 바뀌면 맨 아래로 스크롤
  useEffect(() => {
    if (bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [sessions.length, sessions[sessions.length - 1]?.status])

  const handleGenerate = async (prompt: string) => {
    // 1. 임시 세션 생성 (4개의 빈 슬롯)
    const newSession: GenerationSession = {
      id: Date.now().toString(),
      prompt,
      timestamp: new Date(),
      model: 'Nano Banana Pro',
      status: 'generating',
      images: [null, null, null, null]
    }

    setSessions(prev => [...prev, newSession])

    // 2. 가상의 비동기 생성 시뮬레이션 (순차적으로 생성되는 느낌)
    // 실제 API 연동 시에는 여기서 fetch 호출
    const demoImages = [
      'https://images.unsplash.com/photo-1736608149887-353273e979f4?w=500&auto=format&fit=crop&q=60&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxmZWF0dXJlZC1waG90b3MtZmVlZHw1fHx8ZW58MHx8fHx8',
      'https://images.unsplash.com/photo-1735596489467-3f988d55a79f?w=500&auto=format&fit=crop&q=60&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxmZWF0dXJlZC1waG90b3MtZmVlZHwxMnx8fGVufDB8fHx8fA%3D%3D',
      'https://images.unsplash.com/photo-1734568848496-c67d7cb91929?w=500&auto=format&fit=crop&q=60&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxmZWF0dXJlZC1waG90b3MtZmVlZHwyNnx8fGVufDB8fHx8fA%3D%3D',
      'https://images.unsplash.com/photo-1737033578705-592f69460df6?w=500&auto=format&fit=crop&q=60&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxmZWF0dXJlZC1waG90b3MtZmVlZHwzMXx8fGVufDB8fHx8fA%3D%3D'
    ]

    // 1초마다 하나씩 이미지가 채워지는 효과
    for (let i = 0; i < 4; i++) {
      await new Promise(r => setTimeout(r, 1000))
      setSessions(prev => prev.map(s => {
        if (s.id === newSession.id) {
          const newImages = [...s.images]
          newImages[i] = { id: `${i}`, url: demoImages[i] }
          const isComplete = i === 3
          return {
            ...s,
            status: isComplete ? 'completed' : 'generating',
            images: newImages
          }
        }
        return s
      }))
    }
  }

  return (
    <div className="relative h-screen flex flex-col bg-background overflow-hidden">

      {/* 1. Scrollable Feed Area */}
      <div ref={scrollContainerRef} className="flex-1 overflow-y-auto scroll-smooth">
        <div className="flex flex-col min-h-full">

          {/* Empty State (처음 진입 시 중앙에 표시) */}
          {sessions.length === 0 && (
            <div className="flex-1 flex flex-col items-center justify-center opacity-40 p-10 select-none">
              <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-violet-500/20 to-fuchsia-500/20 flex items-center justify-center mb-6 blur-xl" />
              <h2 className="text-2xl font-bold tracking-tight mb-2">Blooma Playground</h2>
              <p className="text-muted-foreground text-center max-w-md">
                Enter your prompt below to start creating.<br />
                Your generations will appear here.
              </p>
              <ArrowDown className="w-6 h-6 mt-8 animate-bounce opacity-50" />
            </div>
          )}

          {/* Session List */}
          <div className="flex flex-col gap-6 py-10 px-4 md:px-0">
            {sessions.map((session, idx) => (
              <SessionBlock
                key={session.id}
                session={session}
                isLast={idx === sessions.length - 1}
              />
            ))}

            {/* Bottom Spacer for Dock */}
            <div className="h-48" /> {/* PromptDock 높이만큼 여백 확보 */}
            <div ref={bottomRef} /> {/* Auto-scroll Target */}
          </div>
        </div>
      </div>

      {/* 2. Fixed Prompt Dock */}
      <PromptDock
        projectId="playground"
        onCreateFrame={async () => { }}
        onBeforeSubmit={async (prompt) => {
          await handleGenerate(prompt)
          return false // PromptDock 자체 로직 차단
        }}
        // 배경 흐림 효과 추가
        className="pb-6"
      />
    </div>
  )
}