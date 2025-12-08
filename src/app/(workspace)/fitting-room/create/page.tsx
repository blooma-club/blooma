"use client";

import React, { useState } from "react";
import { Upload, Image as ImageIcon, X, Plus, FolderOpen, Loader2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import ModelLibraryDropdown, { ModelLibraryAsset } from "@/components/storyboard/libraries/ModelLibraryDropdown";
import { ensureR2Url } from "@/lib/imageUpload";

export default function FittingRoomCreatePage() {
    const [selectedModels, setSelectedModels] = useState<ModelLibraryAsset[]>([]);
    const [referenceImages, setReferenceImages] = useState<string[]>([]); // blob URLs for preview
    const [prompt, setPrompt] = useState("");
    const [isPromptOpen, setIsPromptOpen] = useState(false);
    const [isLibraryOpen, setIsLibraryOpen] = useState(false);
    const [isAddMenuOpen, setIsAddMenuOpen] = useState(false);
    const [resolution, setResolution] = useState<'2K' | '4K'>('2K'); // 해상도 선택
    const [numImages, setNumImages] = useState<2 | 4>(2); // 생성 개수
    const modelFileInputRef = React.useRef<HTMLInputElement>(null);

    // Image generation state
    const [generatedImages, setGeneratedImages] = useState<string[]>([]);
    const [previewImage, setPreviewImage] = useState<string | null>(null);
    const [isGenerating, setIsGenerating] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (files) {
            const newImages = Array.from(files).map((file) =>
                URL.createObjectURL(file)
            );
            setReferenceImages((prev) => [...prev, ...newImages]);
        }
    };

    const removeReferenceImage = (index: number) => {
        setReferenceImages((prev) => prev.filter((_, i) => i !== index));
    };

    const handleModelSelect = (asset: ModelLibraryAsset) => {
        setSelectedModels([asset]);
    };

    const removeModel = (modelId: string) => {
        setSelectedModels((prev) => prev.filter(m => m.id !== modelId));
    };

    const handleGenerate = async () => {
        if (selectedModels.length === 0) {
            setError("Please select a model first");
            return;
        }

        setIsGenerating(true);
        setError(null);

        try {
            const modelImageUrl = selectedModels[0]?.imageUrl;
            const rawImageUrls = [
                modelImageUrl,
                ...referenceImages
            ].filter(Boolean) as string[];

            // 모든 URL을 Fal AI가 접근 가능한 공개 URL로 변환
            console.log('[FittingRoom] Processing images...');
            const uploadOptions = { projectId: 'fitting-room', frameId: crypto.randomUUID() };
            const imageUrls = await Promise.all(
                rawImageUrls.map(async (url) => {
                    console.log('[FittingRoom] Processing URL:', url.slice(0, 50) + '...');
                    return await ensureR2Url(url, uploadOptions);
                })
            );

            console.log('[FittingRoom] Uploaded imageUrls:', imageUrls);

            // 프롬프트는 서버에서 프리셋으로 처리됨 - 사용자 추가 입력만 전송
            const userPrompt = prompt?.trim() || '';

            const response = await fetch('/api/generate-image', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    modelId: 'fal-ai/bytedance/seedream/v4.5/edit',
                    prompt: userPrompt,
                    imageUrls,
                    resolution, // 사용자가 선택한 해상도 (2K 또는 4K)
                    numImages,  // 생성 개수 (2 또는 4)
                }),
            });

            const result = await response.json();
            console.log('[FittingRoom] API result:', result);

            // API 응답이 { success: true, data: { imageUrl, imageUrls, ... } } 형식
            const generatedImageUrls = result.data?.imageUrls || (result.data?.imageUrl ? [result.data.imageUrl] : []);
            const firstImageUrl = generatedImageUrls[0] || result.data?.imageUrl || result.imageUrl;

            if (result.success && firstImageUrl) {
                // 교체 방식: 새로 생성된 이미지들로 교체 (누적 X)
                setGeneratedImages(generatedImageUrls);
                setPreviewImage(firstImageUrl);

                // Save each image to database
                // imageUrls[0]은 모델, 나머지는 의상
                const uploadedModelUrl = imageUrls[0];
                const uploadedOutfitUrls = imageUrls.slice(1);
                const batchId = crypto.randomUUID();

                for (const imgUrl of generatedImageUrls) {
                    await fetch('/api/fitting-room/generated', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            image_url: imgUrl,
                            group_id: batchId,
                            prompt: userPrompt,
                            model_id: 'fal-ai/bytedance/seedream/v4.5/edit',
                            source_model_url: uploadedModelUrl,
                            source_outfit_urls: uploadedOutfitUrls.length > 0 ? uploadedOutfitUrls : null,
                        }),
                    }).catch(console.error);
                }
            } else {
                // API 에러 응답이 객체일 수 있으므로 message 추출
                const errorObj = result.error || result.data?.error;
                const errorMessage = typeof errorObj === 'object' && errorObj?.message
                    ? errorObj.message
                    : (typeof errorObj === 'string' ? errorObj : "Failed to generate image");
                setError(errorMessage);
            }
        } catch (err) {
            console.error('Generation error:', err);
            setError("An error occurred while generating the image");
        } finally {
            setIsGenerating(false);
        }
    };

    return (
        <div className="min-h-[calc(100vh-7rem)] bg-background">
            <div className="flex items-start justify-center px-6 py-8">
                <div className="flex gap-10">
                    {/* Left: Preview */}
                    <div className="flex flex-col">
                        {/* Preview Area */}
                        <div className="w-[420px] aspect-[3/4] bg-muted/30 rounded-2xl overflow-hidden flex items-center justify-center relative border border-border/40">
                            {isGenerating ? (
                                <div className="flex flex-col items-center gap-3">
                                    <div className="w-12 h-12 rounded-full bg-foreground/5 flex items-center justify-center">
                                        <Loader2 className="w-6 h-6 animate-spin text-foreground/40" />
                                    </div>
                                    <p className="text-sm text-muted-foreground">Generating...</p>
                                </div>
                            ) : previewImage ? (
                                <img
                                    src={previewImage}
                                    alt="Generated"
                                    className="w-full h-full object-contain"
                                />
                            ) : (
                                <div className="flex flex-col items-center gap-3">
                                    <div className="w-16 h-16 rounded-full bg-muted/50 flex items-center justify-center">
                                        <ImageIcon className="w-7 h-7 text-muted-foreground/40" />
                                    </div>
                                    <div className="text-center">
                                        <p className="text-sm font-medium text-foreground/70">Preview</p>
                                        <p className="text-xs text-muted-foreground mt-0.5">
                                            Your creation will appear here
                                        </p>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Thumbnail Gallery */}
                        {generatedImages.length > 0 && (
                            <div className="mt-4">
                                <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-border scrollbar-track-transparent">
                                    {generatedImages.map((img, idx) => (
                                        <button
                                            key={idx}
                                            onClick={() => setPreviewImage(img)}
                                            className={cn(
                                                "w-16 aspect-[3/4] shrink-0 rounded-lg overflow-hidden transition-all relative",
                                                previewImage === img
                                                    ? "opacity-100 after:absolute after:inset-0 after:rounded-lg after:border-2 after:border-foreground after:pointer-events-none"
                                                    : "opacity-60 hover:opacity-100"
                                            )}
                                        >
                                            <img
                                                src={img}
                                                alt={`Generated ${idx + 1}`}
                                                className="w-full h-full object-cover"
                                            />
                                        </button>
                                    ))}
                                </div>
                                <p className="text-[10px] text-muted-foreground mt-2 text-center">
                                    {generatedImages.length} image{generatedImages.length > 1 ? 's' : ''} generated
                                </p>
                            </div>
                        )}
                    </div>

                    {/* Right: Controls */}
                    <div className="w-72 flex flex-col gap-8">
                        {/* Model */}
                        <div>
                            <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-widest mb-4">Model</h3>
                            <div className="flex gap-3">
                                {selectedModels.map((model) => (
                                    <div
                                        key={model.id}
                                        className="relative w-20 aspect-[3/4] rounded-xl overflow-hidden group ring-1 ring-border/50"
                                    >
                                        <img
                                            src={model.imageUrl}
                                            alt={model.name}
                                            className="w-full h-full object-cover"
                                        />
                                        <button
                                            onClick={() => removeModel(model.id)}
                                            className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                                        >
                                            <X className="w-5 h-5 text-white" />
                                        </button>
                                    </div>
                                ))}

                                {selectedModels.length === 0 && (
                                    <Popover open={isAddMenuOpen} onOpenChange={setIsAddMenuOpen}>
                                        <PopoverTrigger asChild>
                                            <button className="w-20 aspect-[3/4] rounded-xl border border-dashed border-border hover:border-foreground/30 hover:bg-muted/30 flex flex-col items-center justify-center gap-1.5 transition-all">
                                                <Plus className="w-5 h-5 text-muted-foreground" />
                                                <span className="text-[10px] text-muted-foreground font-medium">Add</span>
                                            </button>
                                        </PopoverTrigger>
                                        <PopoverContent className="w-44 p-1.5" align="start" sideOffset={8}>
                                            <button
                                                onClick={() => {
                                                    modelFileInputRef.current?.click();
                                                    setIsAddMenuOpen(false);
                                                }}
                                                className="flex items-center gap-2.5 px-3 py-2 text-sm hover:bg-muted rounded-lg transition-colors w-full text-left"
                                            >
                                                <Upload className="w-4 h-4 text-muted-foreground" />
                                                <span>Upload</span>
                                            </button>
                                            <button
                                                onClick={() => {
                                                    setIsLibraryOpen(true);
                                                    setIsAddMenuOpen(false);
                                                }}
                                                className="flex items-center gap-2.5 px-3 py-2 text-sm hover:bg-muted rounded-lg transition-colors w-full text-left"
                                            >
                                                <FolderOpen className="w-4 h-4 text-muted-foreground" />
                                                <span>Library</span>
                                            </button>
                                        </PopoverContent>
                                    </Popover>
                                )}

                                <input
                                    ref={modelFileInputRef}
                                    type="file"
                                    accept="image/*"
                                    className="hidden"
                                    onChange={(e) => {
                                        const file = e.target.files?.[0];
                                        if (!file) return;
                                        const tempModel: ModelLibraryAsset = {
                                            id: `temp-${Date.now()}`,
                                            name: file.name.split('.')[0],
                                            subtitle: 'Uploaded',
                                            imageUrl: URL.createObjectURL(file),
                                        };
                                        setSelectedModels([tempModel]);
                                        e.target.value = '';
                                    }}
                                />

                                <div className="hidden">
                                    <ModelLibraryDropdown
                                        selectedAsset={selectedModels[0] || null}
                                        onSelect={handleModelSelect}
                                        onClear={() => setSelectedModels([])}
                                        open={isLibraryOpen}
                                        onOpenChange={setIsLibraryOpen}
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Outfit */}
                        <div>
                            <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-widest mb-4">Outfit</h3>
                            <div className="flex gap-3 flex-wrap">
                                {referenceImages.map((img, idx) => (
                                    <div
                                        key={idx}
                                        className="relative w-20 aspect-[3/4] rounded-xl overflow-hidden group ring-1 ring-border/50"
                                    >
                                        <img
                                            src={img}
                                            alt={`Outfit ${idx + 1}`}
                                            className="w-full h-full object-cover"
                                        />
                                        <button
                                            onClick={() => removeReferenceImage(idx)}
                                            className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                                        >
                                            <X className="w-5 h-5 text-white" />
                                        </button>
                                    </div>
                                ))}
                                <label className="w-20 aspect-[3/4] rounded-xl border border-dashed border-border hover:border-foreground/30 hover:bg-muted/30 flex flex-col items-center justify-center gap-1.5 cursor-pointer transition-all">
                                    <Plus className="w-5 h-5 text-muted-foreground" />
                                    <span className="text-[10px] text-muted-foreground font-medium">Add</span>
                                    <input
                                        type="file"
                                        multiple
                                        accept="image/*"
                                        className="hidden"
                                        onChange={handleImageUpload}
                                    />
                                </label>
                            </div>
                        </div>

                        {/* Prompt */}
                        <div>
                            <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-widest mb-4">Prompt</h3>
                            {!isPromptOpen && !prompt ? (
                                <button
                                    onClick={() => setIsPromptOpen(true)}
                                    className="w-full h-10 rounded-xl border border-dashed border-border hover:border-foreground/30 hover:bg-muted/30 flex items-center justify-center gap-2 text-sm text-muted-foreground transition-all"
                                >
                                    <Plus className="w-4 h-4" />
                                    Add Detail
                                </button>
                            ) : (
                                <Textarea
                                    placeholder="Describe the style, pose, or details..."
                                    className="min-h-[100px] resize-none bg-muted/30 border-0 focus-visible:ring-1 focus-visible:ring-foreground/20 rounded-xl text-sm placeholder:text-muted-foreground/50"
                                    value={prompt}
                                    onChange={(e) => setPrompt(e.target.value)}
                                    autoFocus
                                    onBlur={() => !prompt && setIsPromptOpen(false)}
                                />
                            )}
                        </div>

                        {/* Error */}
                        {error && (
                            <div className="text-sm text-destructive bg-destructive/10 px-4 py-3 rounded-xl">
                                {error}
                            </div>
                        )}

                        {/* Settings: Resolution + Count */}
                        <div>
                            <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-widest mb-3">Settings</h3>
                            <div className="flex items-center gap-4">
                                {/* Resolution */}
                                <div className="flex gap-1">
                                    <button
                                        onClick={() => setResolution('2K')}
                                        className={cn(
                                            "py-1.5 px-3 rounded-lg border text-xs font-medium transition-all",
                                            resolution === '2K'
                                                ? "border-foreground bg-foreground text-background"
                                                : "border-border text-muted-foreground hover:border-foreground/40 hover:text-foreground"
                                        )}
                                    >
                                        2K
                                    </button>
                                    <button
                                        onClick={() => setResolution('4K')}
                                        className={cn(
                                            "py-1.5 px-3 rounded-lg border text-xs font-medium transition-all",
                                            resolution === '4K'
                                                ? "border-foreground bg-foreground text-background"
                                                : "border-border text-muted-foreground hover:border-foreground/40 hover:text-foreground"
                                        )}
                                    >
                                        4K
                                    </button>
                                </div>

                                {/* Divider */}
                                <div className="w-px h-5 bg-border" />

                                {/* Count */}
                                <div className="flex gap-1">
                                    <button
                                        onClick={() => setNumImages(2)}
                                        className={cn(
                                            "py-1.5 px-3 rounded-lg border text-xs font-medium transition-all",
                                            numImages === 2
                                                ? "border-foreground bg-foreground text-background"
                                                : "border-border text-muted-foreground hover:border-foreground/40 hover:text-foreground"
                                        )}
                                    >
                                        ×2
                                    </button>
                                    <button
                                        onClick={() => setNumImages(4)}
                                        className={cn(
                                            "py-1.5 px-3 rounded-lg border text-xs font-medium transition-all",
                                            numImages === 4
                                                ? "border-foreground bg-foreground text-background"
                                                : "border-border text-muted-foreground hover:border-foreground/40 hover:text-foreground"
                                        )}
                                    >
                                        ×4
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Generate */}
                        <Button
                            size="lg"
                            className="w-full h-12 rounded-xl bg-foreground hover:bg-foreground/90 text-background font-medium text-sm transition-all disabled:opacity-40"
                            onClick={handleGenerate}
                            disabled={isGenerating || selectedModels.length === 0}
                        >
                            {isGenerating ? (
                                <>
                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                    Generating...
                                </>
                            ) : (
                                <>
                                    Generate
                                </>
                            )}
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
}
