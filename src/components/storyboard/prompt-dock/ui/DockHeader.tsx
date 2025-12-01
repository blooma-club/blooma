import React from 'react'
import clsx from 'clsx'
import { Plus, Edit3, Video, Check, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import type { useDockState } from '../hooks/useDockState'
import type { PromptDockProps } from '../types'

type DockHeaderProps = {
    state: ReturnType<typeof useDockState>
    props: PromptDockProps
}

export const DockHeader: React.FC<DockHeaderProps> = ({ state, props }) => {
    const {
        currentMode,
        setInternalMode,
        isControlled,
        models,
        modelId,
        selectedModel,
        setSelectedModelId,
    } = state

    const {
        onModeChange,
        videoSelection = [],
        selectedShotNumber,
        selectedFrameId,
        onClearSelectedShot,
    } = props

    const videoCount =
        Array.isArray(videoSelection) && videoSelection.length > 0
            ? videoSelection.length
            : currentMode === 'video' && selectedFrameId
                ? 1
                : 0

    return (
        <div className="flex items-center justify-between gap-3">
            {/* 왼쪽: 탭과 배지 */}
            <div className="flex items-center gap-3 min-w-0 flex-1">
                <Tabs
                    value={currentMode}
                    onValueChange={v => {
                        const next = v as 'generate' | 'edit' | 'video'
                        if (!isControlled) setInternalMode(next)
                        onModeChange?.(next)
                    }}
                    className="flex-shrink-0"
                >
                    <TabsList className="inline-flex items-center gap-1 rounded-full border border-border/40 bg-background/60 backdrop-blur-md p-1 shadow-sm supports-[backdrop-filter]:bg-background/40">
                        <TabsTrigger
                            value="generate"
                            className="flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-medium transition-all duration-300 data-[state=active]:bg-muted data-[state=active]:text-foreground data-[state=active]:shadow-none data-[state=inactive]:text-muted-foreground/70 data-[state=inactive]:hover:text-foreground hover:bg-muted/50"
                            title="Generate new image"
                        >
                            <Plus className="w-3.5 h-3.5" strokeWidth={2} />
                            <span className="hidden sm:inline">Generate</span>
                        </TabsTrigger>
                        <TabsTrigger
                            value="edit"
                            className="flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-medium transition-all duration-300 data-[state=active]:bg-muted data-[state=active]:text-foreground data-[state=active]:shadow-none data-[state=inactive]:text-muted-foreground/70 data-[state=inactive]:hover:text-foreground hover:bg-muted/50"
                            title="Edit current image"
                        >
                            <Edit3 className="w-3.5 h-3.5" strokeWidth={2} />
                            <span className="hidden sm:inline">Edit</span>
                        </TabsTrigger>
                        <TabsTrigger
                            value="video"
                            className="flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-medium transition-all duration-300 data-[state=active]:bg-muted data-[state=active]:text-foreground data-[state=active]:shadow-none data-[state=inactive]:text-muted-foreground/70 data-[state=inactive]:hover:text-foreground hover:bg-muted/50"
                            title="Generate video"
                        >
                            <Video className="w-3.5 h-3.5" strokeWidth={2} />
                            <span className="hidden sm:inline">Video</span>
                        </TabsTrigger>
                    </TabsList>
                </Tabs>

                {/* 배지 */}
                <div className="flex items-center gap-2 min-w-0 flex-1">
                    {currentMode === 'video' ? (
                        Array.isArray(videoSelection) && videoSelection.length > 0 ? (
                            <span
                                className={clsx(
                                    "group relative inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium flex-shrink-0 whitespace-nowrap select-none border transition-all duration-300",
                                    "bg-violet-500/10 text-violet-600 dark:text-violet-300 border-violet-500/20 backdrop-blur-sm shadow-sm hover:bg-violet-500/20"
                                )}
                                role="status"
                                aria-label={
                                    videoCount === 1
                                        ? `Video ${videoSelection[0]?.shotNumber ?? ''}`
                                        : `Start ${videoSelection[0]?.shotNumber ?? ''} -> End ${videoSelection[1]?.shotNumber ?? ''}`
                                }
                            >
                                {videoCount === 1 ? (
                                    <>Video {videoSelection[0]?.shotNumber ?? ''}</>
                                ) : (
                                    <>
                                        Start {videoSelection[0]?.shotNumber ?? ''} -&gt; End{' '}
                                        {videoSelection[1]?.shotNumber ?? ''}
                                    </>
                                )}
                                {onClearSelectedShot && (
                                    <button
                                        type="button"
                                        onClick={onClearSelectedShot}
                                        className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-violet-500/20 hover:bg-violet-500/30 text-violet-600 dark:text-violet-300 transition-colors focus:outline-none ml-1"
                                        aria-label="Clear selection"
                                    >
                                        <X className="h-2.5 w-2.5" />
                                    </button>
                                )}
                            </span>
                        ) : (
                            selectedFrameId && typeof selectedShotNumber === 'number' ? (
                                <span
                                    className={clsx(
                                        "group relative inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium flex-shrink-0 whitespace-nowrap select-none border transition-all duration-300",
                                        "bg-violet-500/10 text-violet-600 dark:text-violet-300 border-violet-500/20 backdrop-blur-sm shadow-sm hover:bg-violet-500/20"
                                    )}
                                    role="status"
                                    aria-label={`Video ${selectedShotNumber}`}
                                >
                                    <>Video {selectedShotNumber}</>
                                    {onClearSelectedShot && (
                                        <button
                                            type="button"
                                            onClick={onClearSelectedShot}
                                            className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-violet-500/20 hover:bg-violet-500/30 text-violet-600 dark:text-violet-300 transition-colors focus:outline-none ml-1"
                                            aria-label="Clear selection"
                                        >
                                            <X className="h-2.5 w-2.5" />
                                        </button>
                                    )}
                                </span>
                            ) : null
                        )
                    ) : (
                        typeof selectedShotNumber === 'number' && (
                            <span
                                className={clsx(
                                    "group relative inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium flex-shrink-0 whitespace-nowrap select-none border transition-all duration-300",
                                    "bg-violet-500/10 text-violet-600 dark:text-violet-300 border-violet-500/20 backdrop-blur-sm shadow-sm hover:bg-violet-500/20"
                                )}
                                role="status"
                                aria-label={`Selected ${currentMode} shot ${selectedShotNumber}`}
                            >
                                {currentMode === 'edit' ? 'Edit' : 'Generate'} {selectedShotNumber}
                                {onClearSelectedShot && (
                                    <button
                                        type="button"
                                        onClick={onClearSelectedShot}
                                        className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-violet-500/20 hover:bg-violet-500/30 text-violet-600 dark:text-violet-300 transition-colors focus:outline-none ml-1"
                                        aria-label="Clear selection"
                                    >
                                        <X className="h-2.5 w-2.5" />
                                    </button>
                                )}
                            </span>
                        )
                    )}
                </div>
            </div>

            {/* 오른쪽: AI 모델 선택 */}
            <div className="flex items-center gap-2 flex-shrink-0">
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button
                            variant="outline"
                            className="h-9 w-auto px-3 justify-between gap-2 rounded-xl bg-background/50 hover:bg-accent/50 border border-border/40 shadow-sm hover:shadow-md transition-all duration-300 backdrop-blur-sm min-w-[140px]"
                            title="Select AI Model"
                        >
                            <span className="text-xs font-medium text-foreground/90 truncate max-w-[120px]">
                                {selectedModel?.name || 'Select Model'}
                            </span>
                            <Check className="h-3 w-3 opacity-50" />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent
                        className="z-[95] w-[200px] rounded-xl border border-border/40 bg-background/80 backdrop-blur-xl p-1.5 text-popover-foreground shadow-2xl"
                        sideOffset={8}
                        align="end"
                    >
                        <div className="px-2 py-1.5 mb-1 border-b border-border/30">
                            <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">AI Model</span>
                        </div>
                        {models.map(model => (
                            <DropdownMenuItem
                                key={model.id}
                                onClick={() => setSelectedModelId(model.id)}
                                className={clsx(
                                    'rounded-lg px-2.5 py-2 text-xs font-medium cursor-pointer transition-colors mb-0.5 justify-between',
                                    modelId === model.id
                                        ? 'bg-violet-500/10 text-violet-600 dark:text-violet-300'
                                        : 'hover:bg-violet-500/5 text-muted-foreground hover:text-foreground'
                                )}
                            >
                                <span className="truncate">{model.name}</span>
                                {modelId === model.id && <Check className="h-3 w-3 ml-2 flex-shrink-0" />}
                            </DropdownMenuItem>
                        ))}
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>
        </div>
    )
}
