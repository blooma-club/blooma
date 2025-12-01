import React from 'react'
import type { useDockState } from '../hooks/useDockState'

type PromptInputProps = {
    state: ReturnType<typeof useDockState>
    submitting: boolean
    onKeyDown: React.KeyboardEventHandler<HTMLTextAreaElement>
}

export const PromptInput: React.FC<PromptInputProps> = ({ state, submitting, onKeyDown }) => {
    const { prompt, setPrompt, currentMode } = state
    const textareaRef = React.useRef<HTMLTextAreaElement>(null)

    // textarea 높이 자동 조정
    const adjustTextareaHeight = React.useCallback(() => {
        const textarea = textareaRef.current
        if (!textarea) return

        // 높이를 초기화하고 스크롤 높이에 맞춰 조정
        textarea.style.height = 'auto'
        const scrollHeight = textarea.scrollHeight
        const maxHeight = 128 // max-h-32 (8rem = 128px)

        if (scrollHeight > maxHeight) {
            textarea.style.height = `${maxHeight}px`
        } else {
            textarea.style.height = `${scrollHeight}px`
        }
    }, [])

    // 텍스트 변경 시 높이 조정
    React.useEffect(() => {
        adjustTextareaHeight()
    }, [prompt, adjustTextareaHeight])

    return (
        <textarea
            ref={textareaRef}
            value={prompt}
            onChange={e => setPrompt(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder={
                currentMode === 'edit'
                    ? 'Modify the image…'
                    : currentMode === 'video'
                        ? 'Describe the video direction… (optional)'
                        : 'Create a scene…'
            }
            aria-label="prompt input"
            className="w-full bg-transparent text-sm text-foreground placeholder:text-muted-foreground/50 resize-none overflow-y-auto focus:outline-none focus:ring-0 min-h-[3rem] max-h-32 leading-relaxed px-1"
            disabled={submitting}
            rows={1}
        />
    )
}
