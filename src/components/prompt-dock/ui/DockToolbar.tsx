import React from 'react'
import clsx from 'clsx'
import { ImagePlus, Video, Edit3, Plus, Check } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import CameraLibrary from '@/components/libraries/CameraLibrary'
import ModelLibraryDropdown from '@/components/libraries/ModelLibraryDropdown'
import BackgroundLibraryDropdown from '@/components/libraries/BackgroundLibraryDropdown'
import type { useDockState } from '../hooks/useDockState'

type DockToolbarProps = {
    state: ReturnType<typeof useDockState>
    submitting: boolean
    onSubmit: () => Promise<void>
    videoCount: number
    hasValidVideoFrames: boolean
}

export const DockToolbar: React.FC<DockToolbarProps> = ({
    state,
    submitting,
    onSubmit,
    videoCount,
    hasValidVideoFrames,
}) => {
    const {
        currentMode,
        referenceImages,
        handlePromptImageSelect,
        selectedCameraPreset,
        handleApplyCameraPreset,
        handleClearCameraPreset,
        cameraDropdownOpen,
        setCameraDropdownOpen,
        handleCameraDropdownChange,
        selectedModelAsset,
        handleSelectModelAsset,
        handleClearModelAsset,
        modelDropdownOpen,
        setModelDropdownOpen,
        handleModelDropdownChange,
        selectedBackgroundAsset,
        handleSelectBackgroundAsset,
        handleClearBackgroundAsset,
        backgroundDropdownOpen,
        setBackgroundDropdownOpen,
        handleBackgroundDropdownChange,
        duration,
        setDuration,
        modelId,
        resolution,
        setResolution,
        imageCount,
        setImageCount,
        prompt,
        selectedModel,
    } = state

    const fileInputRef = React.useRef<HTMLInputElement>(null)

    const isVideoMode = currentMode === 'video'
    const buttonDisabled =
        submitting ||
        (isVideoMode
            ? videoCount === 0 || !hasValidVideoFrames
                ? true
                : videoCount === 1
                    ? !selectedModel
                    : videoCount === 2
                        ? !selectedModel
                        : true
            : !prompt.trim())

    return (
        <div className="flex items-center gap-2 flex-wrap">
            {/* 이미지 업로드 */}
            {currentMode !== 'video' && (
                <>
                    <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        multiple
                        className="hidden"
                        onChange={handlePromptImageSelect}
                    />
                    <Button
                        type="button"
                        variant="glass"
                        size="sm"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={submitting || referenceImages.length >= 3}
                        className="h-9 w-9 rounded-lg p-0 flex items-center justify-center flex-shrink-0 text-muted-foreground hover:text-foreground"
                        aria-label="Add reference image"
                    >
                        <ImagePlus className="h-4 w-4" strokeWidth={1.5} />
                    </Button>
                </>
            )}
            <CameraLibrary
                selectedPreset={selectedCameraPreset}
                onSelect={state.setSelectedCameraPreset}
                onClear={() => state.setSelectedCameraPreset(null)}
                open={cameraDropdownOpen}
                onOpenChange={handleCameraDropdownChange}
            />
            <ModelLibraryDropdown
                selectedAsset={selectedModelAsset}
                onSelect={state.setSelectedModelAsset}
                onClear={() => state.setSelectedModelAsset(null)}
                open={modelDropdownOpen}
                onOpenChange={handleModelDropdownChange}
            />
            <BackgroundLibraryDropdown
                selectedAsset={selectedBackgroundAsset}
                onSelect={state.setSelectedBackgroundAsset}
                onClear={() => state.setSelectedBackgroundAsset(null)}
                open={backgroundDropdownOpen}
                onOpenChange={handleBackgroundDropdownChange}
            />

            <div className="ml-auto flex items-center gap-2">
                {/* 해상도/Duration 선택 */}
                {currentMode === 'video' ? (
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button
                                variant="ghost"
                                className="h-9 w-auto px-2.5 justify-center rounded-xl bg-background/30 hover:bg-accent/50 border border-border/20 shadow-sm hover:shadow-md transition-all duration-300"
                                title="Video Duration"
                            >
                                <span className="text-xs font-medium text-foreground/90">{duration}s</span>
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent
                            className="z-[95] w-auto min-w-[80px] rounded-xl border border-border/40 bg-background/80 backdrop-blur-xl p-1.5 text-popover-foreground shadow-2xl"
                            sideOffset={8}
                        >
                            <div className="px-2 py-1.5 mb-1 border-b border-border/30">
                                <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">Time</span>
                            </div>
                            {(['5', '10'] as const).map(sec => (
                                <DropdownMenuItem
                                    key={sec}
                                    onClick={() => setDuration(sec)}
                                    className={clsx(
                                        'rounded-lg px-2.5 py-2 text-xs font-medium cursor-pointer transition-colors mb-0.5 justify-between',
                                        duration === sec
                                            ? 'bg-violet-500/10 text-violet-600 dark:text-violet-300'
                                            : 'hover:bg-violet-500/5 text-muted-foreground hover:text-foreground'
                                    )}
                                >
                                    {sec}s
                                    {duration === sec && <Check className="h-3 w-3 ml-2" />}
                                </DropdownMenuItem>
                            ))}
                        </DropdownMenuContent>
                    </DropdownMenu>
                ) : (
                    <>
                        {/* Resolution 선택: Nano Banana Pro 또는 Seedream 모델만 지원 */}
                        {(modelId.includes('-pro') || modelId.includes('seedream')) && (
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button
                                        variant="ghost"
                                        className="h-9 w-auto px-2.5 justify-center rounded-xl bg-background/30 hover:bg-accent/50 border border-border/20 shadow-sm hover:shadow-md transition-all duration-300"
                                        title="Resolution"
                                    >
                                        <span className="text-xs font-medium text-foreground/90">{resolution}</span>
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent
                                    className="z-[95] w-auto min-w-[80px] rounded-xl border border-border/40 bg-background/80 backdrop-blur-xl p-1.5 text-popover-foreground shadow-2xl"
                                    sideOffset={8}
                                >
                                    <div className="px-2 py-1.5 mb-1 border-b border-border/30">
                                        <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">Res</span>
                                    </div>
                                    {(['1K', '2K', '4K'] as const).map(res => (
                                        <DropdownMenuItem
                                            key={res}
                                            onClick={() => setResolution(res)}
                                            className={clsx(
                                                'rounded-lg px-2.5 py-2 text-xs font-medium cursor-pointer transition-colors mb-0.5 justify-between',
                                                resolution === res
                                                    ? 'bg-violet-500/10 text-violet-600 dark:text-violet-300'
                                                    : 'hover:bg-violet-500/5 text-muted-foreground hover:text-foreground'
                                            )}
                                        >
                                            {res}
                                            {resolution === res && <Check className="h-3 w-3 ml-2" />}
                                        </DropdownMenuItem>
                                    ))}
                                </DropdownMenuContent>
                            </DropdownMenu>
                        )}

                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button
                                    type="button"
                                    variant="glass"
                                    className="h-9 px-3 text-xs font-semibold tracking-wide rounded-xl bg-background/30 border-border/20"
                                    aria-label={`Generate ×${imageCount}`}
                                >
                                    ×{imageCount}
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="z-[95] w-24 p-1.5 rounded-xl border border-border/40 bg-background/80 backdrop-blur-xl shadow-2xl">
                                {[1, 2, 3, 4].map(count => (
                                    <DropdownMenuItem
                                        key={count}
                                        onClick={() => setImageCount(count)}
                                        className={clsx(
                                            "flex items-center justify-between rounded-lg px-3 py-2 text-xs font-medium cursor-pointer transition-colors mb-0.5",
                                            imageCount === count
                                                ? "bg-violet-500/10 text-violet-600 dark:text-violet-300"
                                                : "hover:bg-violet-500/5 text-muted-foreground hover:text-foreground"
                                        )}
                                    >
                                        ×{count}
                                        {imageCount === count && <Check className="h-3 w-3" />}
                                    </DropdownMenuItem>
                                ))}
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </>
                )}

                {/* 제출 버튼 */}
                <Button
                    type="button"
                    onClick={() => void onSubmit()}
                    disabled={buttonDisabled}
                    variant="violet"
                    className={clsx(
                        "h-9 w-9 rounded-lg p-0 flex items-center justify-center relative overflow-hidden",
                        buttonDisabled && "bg-muted text-muted-foreground shadow-none hover:bg-muted hover:shadow-none hover:scale-100 opacity-50 cursor-not-allowed"
                    )}
                    aria-label={
                        currentMode === 'edit'
                            ? 'Apply changes'
                            : currentMode === 'video'
                                ? 'Generate video'
                                : 'Generate'
                    }
                >
                    {submitting ? (
                        <>
                            <div className="absolute inset-0 bg-black/10 dark:bg-white/10 animate-pulse" />
                            <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent relative z-10"></div>
                        </>
                    ) : currentMode === 'video' ? (
                        <Video className="h-3.5 w-3.5" strokeWidth={2} />
                    ) : currentMode === 'edit' ? (
                        <Edit3 className="h-3.5 w-3.5" strokeWidth={2} />
                    ) : (
                        <Plus className="h-3.5 w-3.5" strokeWidth={2} />
                    )}
                </Button>
            </div>
        </div>
    )
}
