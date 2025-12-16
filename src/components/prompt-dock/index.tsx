'use client'

import React from 'react'
import clsx from 'clsx'
import type { PromptDockProps } from './types'
import { useDockState } from './hooks/useDockState'
import { useSubmitAction } from './hooks/useSubmitAction'
import { DockHeader } from './ui/DockHeader'
import { ReferenceArea } from './ui/ReferenceArea'
import { PromptInput } from './ui/PromptInput'
import { DockToolbar } from './ui/DockToolbar'

export const PromptDock: React.FC<PromptDockProps> = props => {
    const state = useDockState(props)
    const { submitting, error, handleSubmit } = useSubmitAction(props, state)

    const {
        currentMode,
        videoSelection = [], // Default to empty array if undefined
        selectedModel,
    } = state

    const { className, selectedFrameId, selectedShotNumber } = props

    const isVideoMode = currentMode === 'video'
    const videoCount =
        Array.isArray(props.videoSelection) && props.videoSelection.length > 0
            ? props.videoSelection.length
            : isVideoMode && selectedFrameId
                ? 1
                : 0

    const hasValidVideoFrames = React.useMemo(() => {
        if (!isVideoMode) return true

        if (Array.isArray(props.videoSelection) && props.videoSelection.length > 0) {
            return props.videoSelection.every(frame => Boolean(frame.imageUrl))
        }

        if (selectedFrameId) {
            return true
        }

        return false
    }, [isVideoMode, props.videoSelection, selectedFrameId])

    const handleKeyDown: React.KeyboardEventHandler<HTMLTextAreaElement> = event => {
        if (event.key === 'Enter' && !event.shiftKey) {
            event.preventDefault()
            void handleSubmit()
        }
    }

    return (
        <div
            className={clsx(
                'fixed bottom-6 left-1/2 -translate-x-1/2 z-[70] pointer-events-none',
                'w-[min(400px,90%)]',
                '2xl:w-[min(600px,75%)]',
                className
            )}
            aria-live="polite"
        >
            {/* 메인 입력 컨테이너 */}
            <div className="pointer-events-auto relative flex flex-col gap-3">
                {/* 상단: 모드 탭, 배지, 모델 선택 */}
                <DockHeader state={state} props={props} />

                {/* 중간: 프롬프트 입력 영역 */}
                <div className="rounded-2xl border border-violet-200/20 dark:border-violet-800/30 bg-background/80 backdrop-blur-xl p-3 flex flex-col gap-3 transition-all focus-within:ring-1 focus-within:ring-violet-500/20 focus-within:ring-offset-0 focus-within:border-violet-500/30 focus-within:bg-background/95 shadow-[0_8px_32px_-8px_rgba(139,92,246,0.15)] dark:shadow-[0_8px_32px_-8px_rgba(139,92,246,0.25)] supports-[backdrop-filter]:bg-background/60">
                    <ReferenceArea state={state} />

                    <PromptInput
                        state={state}
                        submitting={submitting}
                        onKeyDown={handleKeyDown}
                    />

                    <DockToolbar
                        state={state}
                        submitting={submitting}
                        onSubmit={handleSubmit}
                        videoCount={videoCount}
                        hasValidVideoFrames={hasValidVideoFrames}
                    />
                </div>

                {/* 에러 메시지 */}
                {error && (
                    <div className="rounded-md border border-destructive/60 bg-destructive/10 px-3 py-2 animate-in fade-in ring-1 ring-destructive/20">
                        <p className="text-xs text-destructive font-medium">{error}</p>
                    </div>
                )}
            </div>
        </div>
    )
}

export default PromptDock
