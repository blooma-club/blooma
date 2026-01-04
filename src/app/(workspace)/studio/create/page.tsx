"use client";

import React, { useState } from "react";
import { Upload, Image as ImageIcon, X, Plus, FolderOpen, Loader2, Sparkles, Coins, Camera } from "lucide-react";
import { useUserCredits } from "@/hooks/useUserCredits";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import ModelLibraryDropdown, { ModelLibraryAsset } from "@/components/libraries/ModelLibraryDropdown";
import LocationLibraryDropdown, { LocationLibraryAsset } from "@/components/libraries/LocationLibraryDropdown";
import { CAMERA_PRESETS, CameraPreset } from "@/components/libraries/CameraLibrary";
import { ensureR2Url, extractR2Key } from "@/lib/imageUpload";
import Image from "next/image";
import { useToast } from "@/components/ui/toast";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Switch } from "@/components/ui/switch";

// Maximum total images allowed (model + reference images)
const MAX_TOTAL_IMAGES = 6;

export default function FittingRoomCreatePage() {
    const { refresh: refreshCredits } = useUserCredits();
    const { push: toast } = useToast();
    const [selectedModels, setSelectedModels] = useState<ModelLibraryAsset[]>([]);
    const [selectedLocations, setSelectedLocations] = useState<LocationLibraryAsset[]>([]);
    const [referenceImages, setReferenceImages] = useState<string[]>([]); // blob URLs for preview
    const [prompt, setPrompt] = useState("");
    const [isPromptOpen, setIsPromptOpen] = useState(false);
    const [isLibraryOpen, setIsLibraryOpen] = useState(false);
    const [isLocationLibraryOpen, setIsLocationLibraryOpen] = useState(false);
    const [isAddMenuOpen, setIsAddMenuOpen] = useState(false);
    const [isLocationAddMenuOpen, setIsLocationAddMenuOpen] = useState(false);
    const [resolution, setResolution] = useState<'1K' | '2K' | '4K'>('1K'); // 해상도 선택
    const [numImages, setNumImages] = useState<2 | 4>(2); // 생성 개수
    const [selectedCameraPreset, setSelectedCameraPreset] = useState<CameraPreset>(CAMERA_PRESETS[0]); // 카메라 프리셋
    const [modelTier, setModelTier] = useState<'standard' | 'pro'>('standard'); // 모델 티어 선택
    const [isModelAuto, setIsModelAuto] = useState(false); // Model Auto 토글
    const [isLocationAuto, setIsLocationAuto] = useState(false); // Location Auto 토글
    const [isDraggingOutfit, setIsDraggingOutfit] = useState(false); // Outfit 드래그 상태
    const modelFileInputRef = React.useRef<HTMLInputElement>(null);
    const locationFileInputRef = React.useRef<HTMLInputElement>(null);
    const outfitFileInputRef = React.useRef<HTMLInputElement>(null);

    // Fix hydration mismatch
    const [isMounted, setIsMounted] = useState(false);
    React.useEffect(() => {
        setIsMounted(true);
    }, []);

    React.useEffect(() => {
        // When switching to Pro tier, ensure resolution is valid (2K or 4K)
        if (modelTier === 'pro' && resolution === '1K') {
            setResolution('2K');
        }
    }, [modelTier, resolution]);






    // Image generation state
    const [generatedImages, setGeneratedImages] = useState<string[]>([]);
    const [previewImage, setPreviewImage] = useState<string | null>(null);
    const [isGenerating, setIsGenerating] = useState(false);
    const [error, setError] = useState<string | null>(null);

    if (!isMounted) {
        return null;
    }

    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (files) {
            const currentCount = selectedModels.length + referenceImages.length;
            const remainingSlots = MAX_TOTAL_IMAGES - currentCount;

            if (remainingSlots <= 0) {
                toast({ title: 'Limit reached', description: `Maximum ${MAX_TOTAL_IMAGES} images allowed` });
                return;
            }

            const filesToAdd = Array.from(files).slice(0, remainingSlots);
            const newImages = filesToAdd.map((file) => URL.createObjectURL(file));
            setReferenceImages((prev) => [...prev, ...newImages]);

            if (files.length > remainingSlots) {
                toast({ title: 'Some images skipped', description: `Only ${remainingSlots} more image(s) could be added` });
            }
        }
    };

    const removeReferenceImage = (index: number) => {
        const urlToRevoke = referenceImages[index];
        if (urlToRevoke?.startsWith('blob:')) {
            URL.revokeObjectURL(urlToRevoke);
        }
        setReferenceImages((prev) => prev.filter((_, i) => i !== index));
    };

    const handleModelSelect = (asset: ModelLibraryAsset) => {
        setSelectedModels([asset]);
    };

    const removeModel = (modelId: string) => {
        const modelToRemove = selectedModels.find(m => m.id === modelId);
        if (modelToRemove?.imageUrl?.startsWith('blob:')) {
            URL.revokeObjectURL(modelToRemove.imageUrl);
        }
        setSelectedModels((prev) => prev.filter(m => m.id !== modelId));
    };

    const handleLocationSelect = (asset: LocationLibraryAsset) => {
        setSelectedLocations([asset]);
    };

    const removeLocation = (locationId: string) => {
        const locToRemove = selectedLocations.find(l => l.id === locationId);
        if (locToRemove?.imageUrl?.startsWith('blob:')) {
            URL.revokeObjectURL(locToRemove.imageUrl);
        }
        setSelectedLocations((prev) => prev.filter(l => l.id !== locationId));
    };

    const handleGenerate = async () => {
        // Model이 Auto가 아닐 때만 모델 선택 필수
        if (!isModelAuto && selectedModels.length === 0) {
            setError("Please select a model or enable Auto mode");
            return;
        }

        setIsGenerating(true);
        setError(null);

        try {
            const modelImageUrl = selectedModels[0]?.imageUrl;
            const locationImageUrl = selectedLocations[0]?.imageUrl;

            const rawImageUrls = [
                modelImageUrl,
                ...referenceImages,
                locationImageUrl
            ].filter(Boolean) as string[];

            // 모든 URL을 Fal AI가 접근 가능한 공개 URL로 변환
            const uploadOptions = { projectId: 'studio', frameId: crypto.randomUUID() };
            const imageUrls = await Promise.all(
                rawImageUrls.map(async (url) => {
                    return await ensureR2Url(url, uploadOptions);
                })
            );

            // Location URL 추출 (마지막에 추가했으므로)
            const finalLocationUrl = locationImageUrl ? imageUrls[imageUrls.length - 1] : null;



            // 프롬프트는 서버에서 프리셋으로 처리됨 - 사용자 추가 입력만 전송
            const userPrompt = prompt?.trim() || '';

            // 모델 티어에 따라 모델 ID 선택
            const selectedModelId = modelTier === 'pro'
                ? 'fal-ai/nano-banana-pro/edit'
                : 'fal-ai/gpt-image-1.5/edit';

            const response = await fetch('/api/generate-image', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    modelId: selectedModelId,
                    prompt: userPrompt,
                    imageUrls,
                    resolution, // 사용자가 선택한 해상도 (2K 또는 4K)
                    numImages,  // 생성 개수 (2 또는 4)
                    viewType: selectedCameraPreset.id as 'front' | 'behind' | 'side' | 'quarter',  // View 타입
                    cameraPrompt: selectedCameraPreset.prompt,   // 카메라 프리셋 프롬프트
                    locationImageUrl: finalLocationUrl, // Location 이미지 URL 전달
                    isModelAuto, // Model Auto 모드
                    isLocationAuto, // Location Auto 모드
                }),
            });

            const result = await response.json();

            // API 응답이 { success: true, data: { imageUrl, imageUrls, ... } } 형식
            const generatedImageUrls = result.data?.imageUrls || (result.data?.imageUrl ? [result.data.imageUrl] : []);
            const firstImageUrl = generatedImageUrls[0] || result.data?.imageUrl || result.imageUrl;

            if (result.success && firstImageUrl) {
                // 교체 방식: 새로 생성된 이미지들로 교체 (누적 X)
                setGeneratedImages(generatedImageUrls);
                setPreviewImage(firstImageUrl);

                // Save each image to database
                const batchId = crypto.randomUUID();

                for (const imgUrl of generatedImageUrls) {
                    // 모델 이미지 URL (첫 번째 선택된 모델 - 이미 R2 또는 system-models 경로)
                    const sourceModelUrl = selectedModels[0]?.imageUrl || null;


                    // 아웃핏 이미지 URL (이미 121-126행에서 R2로 변환됨)
                    // imageUrls[0]는 모델 이미지, 나머지가 outfit 이미지
                    const sourceOutfitUrls = imageUrls.length > 1 ? imageUrls.slice(1) : null;

                    await fetch('/api/studio/generated', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            image_url: imgUrl,
                            group_id: batchId,
                            prompt: userPrompt || null,
                            model_id: selectedModelId,
                            source_model_url: sourceModelUrl,
                            source_outfit_urls: sourceOutfitUrls,
                            generation_params: null,
                        }),
                    }).catch(console.error);
                }

                // 크레딧 UI 즉시 갱신
                refreshCredits();
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
                        <div
                            className={cn(
                                "w-[480px] aspect-[3/4] bg-secondary/80 rounded-2xl overflow-hidden flex flex-col items-center justify-center relative border transition-all duration-300",
                                isDraggingOutfit
                                    ? "border-foreground/20 bg-secondary"
                                    : "border-border/20 hover:border-border/40"
                            )}
                            onDragOver={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                setIsDraggingOutfit(true);
                            }}
                            onDragLeave={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                setIsDraggingOutfit(false);
                            }}
                            onDrop={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                setIsDraggingOutfit(false);
                                const files = e.dataTransfer.files;
                                if (files && files.length > 0) {
                                    const currentCount = (isModelAuto ? 0 : selectedModels.length) + referenceImages.length;
                                    const remainingSlots = MAX_TOTAL_IMAGES - currentCount;
                                    if (remainingSlots > 0) {
                                        const filesToAdd = Array.from(files).slice(0, remainingSlots);
                                        const newImages = filesToAdd.map((file) => URL.createObjectURL(file));
                                        setReferenceImages((prev) => [...prev, ...newImages]);
                                    }
                                }
                            }}
                        >
                            {/* Main Content */}
                            {isGenerating ? (
                                <div className="flex flex-col items-center gap-4 animate-pulse">
                                    <div className="w-10 h-10 rounded-full bg-foreground/5 flex items-center justify-center">
                                        <Loader2 className="w-5 h-5 animate-spin text-foreground/40" />
                                    </div>
                                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-widest">Generating</p>
                                </div>
                            ) : previewImage ? (
                                <div className="relative w-full h-full">
                                    <Image
                                        src={previewImage}
                                        alt="Generated"
                                        fill
                                        className="object-contain"
                                        sizes="620px"
                                        quality={95}
                                        priority
                                    />
                                </div>
                            ) : isDraggingOutfit ? (
                                <div className="flex flex-col items-center gap-4 animate-in fade-in zoom-in-95 duration-200">
                                    <div className="w-16 h-16 rounded-full bg-background flex items-center justify-center shadow-lg shadow-black/5">
                                        <Upload className="w-6 h-6 text-foreground/70" />
                                    </div>
                                    <div className="text-center">
                                        <p className="text-sm font-medium text-foreground/80">Drop to upload</p>
                                    </div>
                                </div>
                            ) : (
                                /* Outfit Upload - Centered & Minimal */
                                <div className="flex flex-col items-center justify-center w-full h-full p-8 transition-all duration-300">
                                    {referenceImages.length > 0 ? (
                                        /* Outfit Thumbnails with Add button */
                                        <div className="flex gap-4 items-center flex-wrap justify-center animate-in fade-in zoom-in-95 duration-300">
                                            {referenceImages.map((img, idx) => (
                                                <div
                                                    key={idx}
                                                    className="relative w-20 aspect-[3/4] rounded-2xl overflow-hidden group shadow-sm hover:shadow-md transition-all duration-300 hover:scale-[1.02] bg-background"
                                                >
                                                    <Image
                                                        src={img}
                                                        alt={`Outfit ${idx + 1}`}
                                                        fill
                                                        className="object-cover object-center"
                                                        sizes="80px"
                                                        quality={80}
                                                        loading="lazy"
                                                    />
                                                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-all duration-300" />
                                                    <button
                                                        onClick={() => removeReferenceImage(idx)}
                                                        className="absolute top-1 right-1 w-5 h-5 rounded-full bg-black/40 hover:bg-black/60 backdrop-blur-sm flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-200 transform translate-y-2 group-hover:translate-y-0"
                                                    >
                                                        <X className="w-3 h-3 text-white" />
                                                    </button>
                                                </div>
                                            ))}
                                            {/* Minimal Add Button */}
                                            {((isModelAuto ? 0 : selectedModels.length) + referenceImages.length) < MAX_TOTAL_IMAGES && (
                                                <label className="w-20 aspect-[3/4] rounded-2xl border border-border/40 hover:border-foreground/20 bg-background/50 hover:bg-background flex flex-col items-center justify-center gap-2 cursor-pointer transition-all duration-300 group">
                                                    <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                                                        <Plus className="w-4 h-4 text-foreground/60" />
                                                    </div>
                                                    <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider group-hover:text-foreground/70 transition-colors">Add</span>
                                                    <input
                                                        ref={outfitFileInputRef}
                                                        type="file"
                                                        multiple
                                                        accept="image/*"
                                                        className="hidden"
                                                        onChange={handleImageUpload}
                                                    />
                                                </label>
                                            )}
                                        </div>
                                    ) : (
                                        /* Empty state - Very Minimal */
                                        <label className="flex flex-col items-center gap-5 cursor-pointer group w-full h-full justify-center">
                                            <div className="w-16 h-16 rounded-full bg-background border border-border/30 shadow-sm group-hover:shadow-md group-hover:scale-105 transition-all duration-500 flex items-center justify-center">
                                                <Plus className="w-6 h-6 text-foreground/40 group-hover:text-foreground/70 transition-colors duration-300" />
                                            </div>
                                            <div className="text-center space-y-1.5">
                                                <p className="text-sm font-medium text-foreground/60 group-hover:text-foreground/90 transition-colors duration-300">Add Outfit</p>
                                                <p className="text-[11px] text-muted-foreground/60 uppercase tracking-widest group-hover:text-muted-foreground/80 transition-colors duration-300">
                                                    Drop or click to upload
                                                </p>
                                            </div>
                                            <input
                                                ref={outfitFileInputRef}
                                                type="file"
                                                multiple
                                                accept="image/*"
                                                className="hidden"
                                                onChange={handleImageUpload}
                                            />
                                        </label>
                                    )}
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
                                            <Image
                                                src={img}
                                                alt={`Generated ${idx + 1}`}
                                                fill
                                                className="object-cover"
                                                sizes="64px"
                                                quality={60}
                                                loading="lazy"
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
                    <div className="w-full lg:w-72 flex flex-col gap-4">
                        <Accordion type="multiple" defaultValue={['model', 'location']} className="w-full pl-1 -ml-1">
                            {/* Model */}
                            <div className="border-b border-border/40">
                                <div className="flex items-center justify-between py-3">
                                    <span className="text-xs font-medium text-muted-foreground uppercase tracking-widest">Model</span>
                                    <div className="flex items-center gap-2">
                                        <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">Auto</span>
                                        <Switch
                                            checked={isModelAuto}
                                            onCheckedChange={setIsModelAuto}
                                            className="h-4 w-7 data-[state=checked]:bg-foreground data-[state=unchecked]:bg-muted"
                                        />
                                    </div>
                                </div>
                                {!isModelAuto && (
                                    <div className="pt-2 pb-6">
                                        <div className="flex gap-3">
                                            {selectedModels.map((model) => (
                                                <div
                                                    key={model.id}
                                                    className="relative w-16 aspect-[3/4] rounded-xl overflow-hidden group border border-border/50"
                                                >
                                                    <Image
                                                        src={model.imageUrl}
                                                        alt={model.name}
                                                        fill
                                                        className="object-cover object-center"
                                                        sizes="80px"
                                                        quality={75}
                                                        loading="lazy"
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
                                                        <button className="w-16 aspect-[3/4] rounded-xl border border-dashed border-border hover:border-foreground/30 hover:bg-muted/30 flex flex-col items-center justify-center gap-1.5 transition-all">
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
                                )}
                            </div>


                            {/* Location */}
                            <div className="border-b border-border/40">
                                <div className="flex items-center justify-between py-3">
                                    <span className="text-xs font-medium text-muted-foreground uppercase tracking-widest">Location</span>
                                    <div className="flex items-center gap-2">
                                        <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">Auto</span>
                                        <Switch
                                            checked={isLocationAuto}
                                            onCheckedChange={setIsLocationAuto}
                                            className="h-4 w-7 data-[state=checked]:bg-foreground data-[state=unchecked]:bg-muted"
                                        />
                                    </div>
                                </div>
                                {!isLocationAuto && (
                                    <div className="pt-2 pb-6">
                                        <div className="flex gap-3">
                                            {selectedLocations.map((loc) => (
                                                <div
                                                    key={loc.id}
                                                    className="relative w-16 aspect-[3/4] rounded-xl overflow-hidden group border border-border/50"
                                                >
                                                    <Image
                                                        src={loc.imageUrl}
                                                        alt={loc.name}
                                                        fill
                                                        className="object-cover object-center"
                                                        sizes="80px"
                                                        quality={75}
                                                        loading="lazy"
                                                    />
                                                    <button
                                                        onClick={() => removeLocation(loc.id)}
                                                        className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                                                    >
                                                        <X className="w-5 h-5 text-white" />
                                                    </button>
                                                </div>
                                            ))}

                                            {selectedLocations.length === 0 && (
                                                <Popover open={isLocationAddMenuOpen} onOpenChange={setIsLocationAddMenuOpen}>
                                                    <PopoverTrigger asChild>
                                                        <button className="w-16 aspect-[3/4] rounded-xl border border-dashed border-border hover:border-foreground/30 hover:bg-muted/30 flex flex-col items-center justify-center gap-1.5 transition-all">
                                                            <Plus className="w-5 h-5 text-muted-foreground" />
                                                            <span className="text-[10px] text-muted-foreground font-medium">Add</span>
                                                        </button>
                                                    </PopoverTrigger>
                                                    <PopoverContent className="w-44 p-1.5" align="start" sideOffset={8}>
                                                        <button
                                                            onClick={() => {
                                                                locationFileInputRef.current?.click();
                                                                setIsLocationAddMenuOpen(false);
                                                            }}
                                                            className="flex items-center gap-2.5 px-3 py-2 text-sm hover:bg-muted rounded-lg transition-colors w-full text-left"
                                                        >
                                                            <Upload className="w-4 h-4 text-muted-foreground" />
                                                            <span>Upload</span>
                                                        </button>
                                                        <button
                                                            onClick={() => {
                                                                setIsLocationLibraryOpen(true);
                                                                setIsLocationAddMenuOpen(false);
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
                                                ref={locationFileInputRef}
                                                type="file"
                                                accept="image/*"
                                                className="hidden"
                                                onChange={(e) => {
                                                    const file = e.target.files?.[0];
                                                    if (!file) return;
                                                    const tempLoc: LocationLibraryAsset = {
                                                        id: `temp-loc-${Date.now()}`,
                                                        name: file.name.split('.')[0],
                                                        subtitle: 'Uploaded',
                                                        imageUrl: URL.createObjectURL(file),
                                                    };
                                                    setSelectedLocations([tempLoc]);
                                                    e.target.value = '';
                                                }}
                                            />

                                            <div className="hidden">
                                                <LocationLibraryDropdown
                                                    selectedAsset={selectedLocations[0] || null}
                                                    onSelect={handleLocationSelect}
                                                    onClear={() => setSelectedLocations([])}
                                                    open={isLocationLibraryOpen}
                                                    onOpenChange={setIsLocationLibraryOpen}
                                                />
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* View */}
                            <AccordionItem value="view" className="border-b border-border/40">
                                <AccordionTrigger className="text-xs font-medium text-muted-foreground uppercase tracking-widest hover:no-underline py-3">
                                    View
                                </AccordionTrigger>
                                <AccordionContent className="pt-2 pb-6">
                                    <div className="flex gap-2">
                                        {CAMERA_PRESETS.map((preset) => (
                                            <button
                                                key={preset.id}
                                                onClick={() => setSelectedCameraPreset(preset)}
                                                className={cn(
                                                    "relative w-16 aspect-[3/4] rounded-xl overflow-hidden transition-all",
                                                    selectedCameraPreset.id === preset.id
                                                        ? "border-[1.5px] border-foreground"
                                                        : "border border-border/50 hover:border-foreground/30"
                                                )}
                                            >
                                                {preset.image ? (
                                                    <Image
                                                        src={preset.image}
                                                        alt={preset.title}
                                                        fill
                                                        className="object-cover object-center"
                                                        sizes="80px"
                                                        quality={75}
                                                        loading="lazy"
                                                    />
                                                ) : (
                                                    <div className="w-full h-full flex items-center justify-center bg-muted/30">
                                                        <Camera className="w-5 h-5 text-muted-foreground" />
                                                    </div>
                                                )}
                                                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-1.5">
                                                    <span className="text-[10px] font-medium text-white">{preset.title}</span>
                                                </div>
                                            </button>
                                        ))}
                                    </div>
                                </AccordionContent>
                            </AccordionItem>

                            {/* Detail */}
                            <AccordionItem value="detail" className="border-b border-border/40">
                                <AccordionTrigger className="text-xs font-medium text-muted-foreground uppercase tracking-widest hover:no-underline py-3">
                                    Detail
                                </AccordionTrigger>
                                <AccordionContent className="pt-2 pb-6">
                                    <Textarea
                                        placeholder="Describe outfit fit, fabric, or styling details..."
                                        className="min-h-[80px] resize-none bg-muted/30 border-1 rounded-xl text-sm placeholder:text-muted-foreground/50"
                                        value={prompt}
                                        onChange={(e) => setPrompt(e.target.value)}
                                    />
                                </AccordionContent>
                            </AccordionItem>

                            {/* Settings */}
                            <AccordionItem value="settings" className="border-b-0">
                                <AccordionTrigger className="text-xs font-medium text-muted-foreground uppercase tracking-widest hover:no-underline py-4">
                                    Settings
                                </AccordionTrigger>
                                <AccordionContent className="pt-2 pb-8">
                                    <div className="flex flex-col gap-6">

                                        {/* Row 1: Resolution (Pro only) & Count */}
                                        <div className={modelTier === 'pro' ? "grid grid-cols-2 gap-4" : ""}>
                                            {/* Resolution - Only show for Pro tier */}
                                            {modelTier === 'pro' && (
                                                <div className="space-y-2.5">
                                                    <div className="flex items-center gap-1.5 px-0.5">
                                                        <span className="text-[10px] font-semibold text-muted-foreground/60 uppercase tracking-widest">Resolution</span>
                                                    </div>
                                                    <div className="flex p-1 bg-muted rounded-xl border border-border/40">
                                                        <button
                                                            onClick={() => setResolution('2K')}
                                                            className={cn(
                                                                "flex-1 py-1.5 rounded-lg text-xs font-medium transition-all duration-200",
                                                                resolution === '2K'
                                                                    ? "bg-background text-foreground shadow-sm ring-1 ring-black/5 dark:ring-white/10"
                                                                    : "text-muted-foreground hover:text-foreground hover:bg-muted/40"
                                                            )}
                                                        >
                                                            2K
                                                        </button>
                                                        <button
                                                            onClick={() => setResolution('4K')}
                                                            className={cn(
                                                                "flex-1 py-1.5 rounded-lg text-xs font-medium transition-all duration-200",
                                                                resolution === '4K'
                                                                    ? "bg-background text-foreground shadow-sm ring-1 ring-black/5 dark:ring-white/10"
                                                                    : "text-muted-foreground hover:text-foreground hover:bg-muted/40"
                                                            )}
                                                        >
                                                            4K
                                                        </button>
                                                    </div>
                                                </div>
                                            )}

                                            {/* Count */}
                                            <div className="space-y-2.5">
                                                <div className="flex items-center gap-1.5 px-0.5">
                                                    <span className="text-[10px] font-semibold text-muted-foreground/60 uppercase tracking-widest">Count</span>
                                                </div>
                                                <div className="flex p-1 bg-muted rounded-xl border border-border/40">
                                                    <button
                                                        onClick={() => setNumImages(2)}
                                                        className={cn(
                                                            "flex-1 py-1.5 rounded-lg text-xs font-medium transition-all duration-200",
                                                            numImages === 2
                                                                ? "bg-background text-foreground shadow-sm ring-1 ring-black/5 dark:ring-white/10"
                                                                : "text-muted-foreground hover:text-foreground hover:bg-muted/40"
                                                        )}
                                                    >
                                                        2
                                                    </button>
                                                    <button
                                                        onClick={() => setNumImages(4)}
                                                        className={cn(
                                                            "flex-1 py-1.5 rounded-lg text-xs font-medium transition-all duration-200",
                                                            numImages === 4
                                                                ? "bg-background text-foreground shadow-sm ring-1 ring-black/5 dark:ring-white/10"
                                                                : "text-muted-foreground hover:text-foreground hover:bg-muted/40"
                                                        )}
                                                    >
                                                        4
                                                    </button>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Row 2: Mode */}
                                        <div className="space-y-2.5">
                                            <div className="flex items-center gap-1.5 px-0.5">
                                                <span className="text-[10px] font-semibold text-muted-foreground/60 uppercase tracking-widest">Quality Mode</span>
                                            </div>
                                            <div className="grid grid-cols-2 gap-3">
                                                <button
                                                    onClick={() => setModelTier('standard')}
                                                    className={cn(
                                                        "relative group flex flex-col items-start gap-1 p-3 rounded-xl border transition-all duration-200 text-left h-[72px]",
                                                        modelTier === 'standard'
                                                            ? "bg-background border-foreground text-foreground shadow-sm"
                                                            : "bg-muted/10 border-border/60 text-muted-foreground hover:bg-muted/30 hover:border-foreground/20"
                                                    )}
                                                >
                                                    <div className="w-full flex items-start justify-between">
                                                        <span className="text-xs font-semibold mt-0.5">Standard</span>
                                                        <div className="px-1.5 py-0.5 rounded-md bg-muted/50 border border-border/50 text-[10px] font-medium text-muted-foreground group-hover:bg-muted group-hover:text-foreground/80 transition-colors">
                                                            <Coins className="w-2.5 h-2.5 inline mr-1 -mt-0.5" />
                                                            {10 * numImages}
                                                        </div>
                                                    </div>
                                                    <p className="text-[10px] opacity-60 font-medium">Balanced quality</p>
                                                </button>

                                                <button
                                                    onClick={() => setModelTier('pro')}
                                                    className={cn(
                                                        "relative group flex flex-col items-start gap-1 p-3 rounded-xl border transition-all duration-200 text-left h-[72px]",
                                                        modelTier === 'pro'
                                                            ? "bg-foreground border-foreground text-background shadow-md"
                                                            : "bg-muted/10 border-border/60 text-muted-foreground hover:bg-muted/30 hover:border-foreground/20"
                                                    )}
                                                >
                                                    <div className="w-full flex items-start justify-between">
                                                        <span className="text-xs font-semibold mt-0.5">Pro</span>
                                                        <div className={cn(
                                                            "px-1.5 py-0.5 rounded-md text-[10px] font-medium transition-colors border",
                                                            modelTier === 'pro'
                                                                ? "bg-white/20 border-white/20 text-white/90"
                                                                : "bg-muted/50 border-border/50 text-muted-foreground group-hover:bg-muted group-hover:text-foreground/80"
                                                        )}>
                                                            <Coins className="w-2.5 h-2.5 inline mr-1 -mt-0.5" />
                                                            {(resolution === '4K' ? 100 : 50) * numImages}
                                                        </div>
                                                    </div>
                                                    <p className={cn("text-[10px] font-medium", modelTier === 'pro' ? "text-white/60" : "opacity-60")}>Highest detail</p>
                                                </button>
                                            </div>
                                        </div>

                                    </div>
                                </AccordionContent>
                            </AccordionItem>
                        </Accordion>

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
        </div >
    );
}
