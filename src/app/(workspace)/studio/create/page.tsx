"use client";

import React, { useState } from "react";
import dynamic from "next/dynamic";
import { Upload, Image as ImageIcon, X, Plus, FolderOpen, Loader2, Camera } from "lucide-react";
import { useUserCredits } from "@/hooks/useUserCredits";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import type { ModelLibraryAsset } from "@/components/libraries/ModelLibraryDropdown";
import type { LocationLibraryAsset } from "@/components/libraries/LocationLibraryDropdown";
import { COMPOSITION_PRESETS, type CompositionPreset } from "@/lib/compositionPresets";
import { ensureR2Url } from "@/lib/imageUpload";
import Image from "next/image";
import { useToast } from "@/components/ui/toast";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { useHandleCreditError } from "@/hooks/useHandleCreditError";
import { Switch } from "@/components/ui/switch";

const ModelLibraryDropdown = dynamic(
    () => import("@/components/libraries/ModelLibraryDropdown"),
    { ssr: false }
);
const LocationLibraryDropdown = dynamic(
    () => import("@/components/libraries/LocationLibraryDropdown"),
    { ssr: false }
);


// Maximum total images allowed (model + reference images)
const MAX_TOTAL_IMAGES = 8;
const VIEW_TYPES = ['front', 'behind', 'side', 'quarter'] as const;
type ViewType = typeof VIEW_TYPES[number];
const SHOT_SIZE_OPTIONS = [
    { id: 'extreme-close-up', label: 'Extreme Close Up' },
    { id: 'close-up', label: 'Close Up' },
    { id: 'medium-shot', label: 'Medium Shot' },
    { id: 'full-body', label: 'Full Body' },
] as const;
type ShotSize = typeof SHOT_SIZE_OPTIONS[number]['id'];
const accordionCardClass =
    "rounded-2xl border border-transparent bg-white shadow-sm ring-1 ring-border/50 overflow-hidden";
const glassCardClass =
    "rounded-2xl border border-transparent bg-white/60 backdrop-blur-md shadow-sm ring-1 ring-border/50 overflow-hidden";

export default function FittingRoomCreatePage() {
    const { refresh: refreshCredits, subscriptionTier } = useUserCredits();
    const { push: toast } = useToast();
    const { handleCreditError } = useHandleCreditError();
    const [selectedModels, setSelectedModels] = useState<ModelLibraryAsset[]>([]);
    const [selectedLocations, setSelectedLocations] = useState<LocationLibraryAsset[]>([]);
    const [referenceImages, setReferenceImages] = useState<string[]>([]); // blob URLs for preview
    const [prompt, setPrompt] = useState("");
    const [isLibraryOpen, setIsLibraryOpen] = useState(false);
    const [isLocationLibraryOpen, setIsLocationLibraryOpen] = useState(false);
    const [isAddMenuOpen, setIsAddMenuOpen] = useState(false);
    const [isLocationAddMenuOpen, setIsLocationAddMenuOpen] = useState(false);
    const [isInpaintEnabled, setIsInpaintEnabled] = useState(false);
    const [resolution, setResolution] = useState<'1K' | '2K' | '4K'>('1K');
    const [numImages, setNumImages] = useState<1 | 2 | 4>(2);
    const [selectedCameraPreset, setSelectedCameraPreset] = useState<CompositionPreset>(COMPOSITION_PRESETS[0]);
    const [shotSize, setShotSize] = useState<ShotSize>('medium-shot');
    const [modelTier, setModelTier] = useState<'standard' | 'pro'>('standard'); // Model Tier (Standard = Nano Banana, Pro = Nano Banana Pro)
    const modelFileInputRef = React.useRef<HTMLInputElement>(null);
    const locationFileInputRef = React.useRef<HTMLInputElement>(null);
    const outfitFileInputRef = React.useRef<HTMLInputElement>(null);

    // Fix hydration mismatch
    const [isMounted, setIsMounted] = useState(false);
    React.useEffect(() => {
        setIsMounted(true);
    }, []);

    const isFreeTier = !subscriptionTier || subscriptionTier === 'free';
    const isSmallBrands = subscriptionTier === 'Small Brands';
    const isPro4kRestricted = isFreeTier || isSmallBrands;
    const hasLocation = selectedLocations.length > 0;
    const defaultInpaintPrompt =
        'Place the model into the background. Preserve the background, lighting, and outfit details.';

    React.useEffect(() => {
        if (!hasLocation && isInpaintEnabled) {
            setIsInpaintEnabled(false);
        }
    }, [hasLocation, isInpaintEnabled]);

    const handleModelTierChange = (tier: 'standard' | 'pro') => {
        setModelTier(tier);

        if (tier === 'standard') {
            setResolution('1K');
            setNumImages(2);
            return;
        }

        setNumImages(1);
        setResolution((prev) => {
            if (isPro4kRestricted) {
                return '2K';
            }
            return prev === '1K' ? '2K' : prev;
        });
    };

    React.useEffect(() => {
        if (modelTier === 'pro' && isPro4kRestricted && resolution === '4K') {
            setResolution('2K');
        }
    }, [modelTier, isPro4kRestricted, resolution]);






    // Image generation state
    const [generatedImages, setGeneratedImages] = useState<string[]>([]);
    const [previewImage, setPreviewImage] = useState<string | null>(null);
    const [isGenerating, setIsGenerating] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const estimatedCredits = React.useMemo(() => {
        const baseCost = modelTier === 'pro' ? (resolution === '4K' ? 100 : 50) : 15;
        return baseCost * numImages;
    }, [modelTier, resolution, numImages]);
    const availableProResolutions = React.useMemo(
        () => (isPro4kRestricted ? ['2K'] : ['2K', '4K']),
        [isPro4kRestricted]
    );

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

        if (selectedModels.length === 0) {
            setError("Please select a model");
            return;
        }
        if (referenceImages.length === 0) {
            toast({ title: 'Outfit required', description: 'Add at least 1 outfit reference image' });
            setError("Please add at least 1 outfit reference image");
            return;
        }

        setIsGenerating(true);
        setError(null);

        try {
            const selectedModel = selectedModels[0] || null;
            const selectedLocation = selectedLocations[0] || null;

            const uploadOptions = { projectId: 'studio', frameId: crypto.randomUUID() };
            const modelImagePromise = selectedModel?.imageUrl
                ? ensureR2Url(selectedModel.imageUrl, uploadOptions)
                : Promise.resolve(null);
            const locationImagePromise = selectedLocation?.imageUrl
                ? ensureR2Url(selectedLocation.imageUrl, uploadOptions)
                : Promise.resolve(null);
            const outfitImagesPromise = Promise.all(
                referenceImages.map((url) => ensureR2Url(url, uploadOptions))
            );

            const [modelImageUrlPublic, outfitImageUrlsPublic, locationImageUrlPublic] = await Promise.all([
                modelImagePromise,
                outfitImagesPromise,
                locationImagePromise,
            ]);

            const userPrompt = prompt?.trim() || '';
            let finalPrompt = userPrompt;

            if (isInpaintEnabled) {
                finalPrompt = finalPrompt || defaultInpaintPrompt;
            } else {
                try {
                    const promptResponse = await fetch('/api/generate-image-prompt', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            userPrompt,
                            modelImageUrl: modelImageUrlPublic || undefined,
                            outfitImageUrls: outfitImageUrlsPublic,
                            locationImageUrl: locationImageUrlPublic || undefined,
                        }),
                    });

                    const promptResult = await promptResponse.json();
                    const generatedPrompt = promptResult.data?.prompt;

                    if (promptResponse.ok && generatedPrompt) {
                        finalPrompt = generatedPrompt;
                    } else {
                        toast({
                            title: 'Prompt generation failed',
                            description: 'Using your prompt instead.',
                        });
                    }
                } catch (promptError) {
                    console.error('Prompt generation failed:', promptError);
                    toast({
                        title: 'Prompt generation failed',
                        description: 'Using your prompt instead.',
                    });
                }
            }


            const selectedModelId = modelTier === 'pro'
                ? 'gemini-3-pro-image-preview' // Nano Banana Pro
                : 'gemini-2.5-flash-image';    // Nano Banana

            const viewType: ViewType = VIEW_TYPES.includes(selectedCameraPreset.id as ViewType)
                ? (selectedCameraPreset.id as ViewType)
                : 'front';

            const response = await fetch('/api/generate-image', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    modelId: selectedModelId,
                    prompt: finalPrompt,
                    modelImageUrl: modelImageUrlPublic || undefined,
                    outfitImageUrls: outfitImageUrlsPublic,
                    locationImageUrl: locationImageUrlPublic || undefined,
                    inpaint: isInpaintEnabled,
                    resolution,
                    numImages,
                    viewType,
                    cameraPrompt: selectedCameraPreset.prompt,
                    shotSize,
                }),
            });

            const result = await response.json();

            if (!result.success && handleCreditError(result)) {
                return;
            }

            const generatedImageUrls = [
                ...(result.data?.imageUrls ?? []),
                ...(result.data?.imageUrl ? [result.data.imageUrl] : []),
                ...(result.imageUrl ? [result.imageUrl] : []),
            ].filter((url): url is string => typeof url === 'string' && url.trim().length > 0);
            const firstImageUrl = generatedImageUrls[0] || null;

            if (result.success && firstImageUrl) {

                setGeneratedImages(generatedImageUrls);
                setPreviewImage(firstImageUrl);

                // Save each image to database
                const batchId = crypto.randomUUID();

                const sourceModelUrl = selectedModel?.imageUrl || null;
                const sourceOutfitUrls = outfitImageUrlsPublic.length > 0 ? outfitImageUrlsPublic : null;

                const saveResults = await Promise.allSettled(
                    generatedImageUrls.map((imgUrl) =>
                        fetch('/api/studio/generated', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                                image_url: imgUrl,
                                group_id: batchId,
                                prompt: finalPrompt || null,
                                model_id: selectedModelId,
                                source_model_url: sourceModelUrl,
                                source_outfit_urls: sourceOutfitUrls,
                                generation_params: null,
                            }),
                        })
                    )
                );
                saveResults.forEach((result) => {
                    if (result.status === 'rejected') {
                        console.error('[studio/generated] save failed:', result.reason);
                    }
                });


                refreshCredits();
            } else {

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
        <div className="flex-1 min-h-0 bg-white flex flex-col">
            <div className="px-6 py-3 flex-1 flex">
                <Card className="bg-secondary/60 p-6 rounded-3xl flex-1 w-full">
                    <div className="flex flex-col lg:flex-row items-start justify-center gap-6">

                {/* Left Panel: Assets */}
                <div className="order-2 lg:order-1 w-full lg:w-72 flex flex-col gap-3 shrink-0">
                    <Accordion type="multiple" defaultValue={['model', 'outfit', 'location']} className="w-full space-y-3">
                        {/* Model */}
                        <AccordionItem value="model" className={accordionCardClass}>
                            <AccordionTrigger className="px-4 text-xs font-medium text-muted-foreground uppercase tracking-widest hover:no-underline py-3">
                                Model
                            </AccordionTrigger>
                            <AccordionContent className="px-4 pt-2 pb-6">
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
                                                sizes="64px"
                                                quality={60}
                                                loading="lazy"
                                                unoptimized
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
                            </AccordionContent>
                        </AccordionItem>

                        {/* Outfit */}
                        <AccordionItem value="outfit" className={accordionCardClass}>
                            <AccordionTrigger className="px-4 text-xs font-medium text-muted-foreground uppercase tracking-widest hover:no-underline py-3">
                                Outfit
                            </AccordionTrigger>
                            <AccordionContent className="px-4 pt-2 pb-6">
                                <div className="flex gap-3 flex-wrap">
                                    {referenceImages.map((img, idx) => (
                                        <div
                                            key={idx}
                                            className="relative w-16 aspect-[3/4] rounded-xl overflow-hidden group border border-border/50"
                                        >
                                            <Image
                                                src={img}
                                                alt={`Outfit ${idx + 1}`}
                                                fill
                                                className="object-cover object-center"
                                                sizes="64px"
                                                quality={60}
                                                loading="lazy"
                                                unoptimized
                                            />
                                            <button
                                                onClick={() => removeReferenceImage(idx)}
                                                className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                                            >
                                                <X className="w-5 h-5 text-white" />
                                            </button>
                                        </div>
                                    ))}

                                    {(selectedModels.length + referenceImages.length) < MAX_TOTAL_IMAGES && (
                                        <button
                                            onClick={() => outfitFileInputRef.current?.click()}
                                            className="w-16 aspect-[3/4] rounded-xl border border-dashed border-border hover:border-foreground/30 hover:bg-muted/30 flex flex-col items-center justify-center gap-1.5 transition-all"
                                        >
                                            <Plus className="w-5 h-5 text-muted-foreground" />
                                            <span className="text-[10px] text-muted-foreground font-medium">Add</span>
                                        </button>
                                    )}

                                    <input
                                        ref={outfitFileInputRef}
                                        type="file"
                                        multiple
                                        accept="image/*"
                                        className="hidden"
                                        onChange={handleImageUpload}
                                    />
                                </div>
                            </AccordionContent>
                        </AccordionItem>

                        {/* Location */}
                        <AccordionItem value="location" className={accordionCardClass}>
                            <AccordionTrigger className="px-4 text-xs font-medium text-muted-foreground uppercase tracking-widest hover:no-underline py-3">
                                Location
                            </AccordionTrigger>
                            <AccordionContent className="px-4 pt-2 pb-6">
                                <div className="mb-3 flex items-center justify-between rounded-lg border border-border/40 bg-muted/30 px-3 py-2">
                                    <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                                        Inpaint
                                    </span>
                                    <Switch
                                        checked={isInpaintEnabled}
                                        onCheckedChange={setIsInpaintEnabled}
                                        disabled={!hasLocation}
                                    />
                                </div>
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
                                                sizes="64px"
                                                quality={60}
                                                loading="lazy"
                                                unoptimized
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
                            </AccordionContent>
                        </AccordionItem>
                    </Accordion>
                </div>

                {/* Center Panel: Preview */}
                <div className="order-1 lg:order-2 w-full lg:flex-1 flex flex-col items-center">
                    {/* Preview Area */}
                    <Card
                        className={cn(
                            "w-full max-w-[520px] aspect-[3/4] rounded-3xl overflow-hidden flex flex-col items-center justify-center relative transition-all duration-500",
                            "backdrop-blur-sm",
                            isGenerating && "border-primary/20 bg-white/80 shadow-lg ring-4 ring-primary/5"
                        )}
                    >
                        {/* Main Content */}
                        {isGenerating ? (
                            <div className="flex flex-col items-center gap-6 animate-pulse">
                                <div className="relative">
                                    <div className="absolute inset-0 bg-primary/20 blur-xl rounded-full animate-pulse" />
                                    <div className="w-16 h-16 rounded-2xl bg-white border border-border/50 flex items-center justify-center shadow-sm relative z-10">
                                        <Loader2 className="w-6 h-6 animate-spin text-primary" />
                                    </div>
                                </div>
                                <div className="space-y-1 text-center">
                                    <p className="text-xs font-semibold text-foreground/80 uppercase tracking-widest">Creating Masterpiece</p>
                                    <p className="text-[10px] text-muted-foreground font-medium">This usually takes about 10s</p>
                                </div>
                            </div>
                        ) : previewImage ? (
                            <div className="relative w-full h-full group">
                                <Image
                                    src={previewImage}
                                    alt="Generated"
                                    fill
                                    className="object-contain transition-transform duration-700 hover:scale-[1.02]"
                                    sizes="(max-width: 768px) 100vw, 600px"
                                    quality={95}
                                    priority
                                    unoptimized
                                />
                            </div>
                        ) : (
                            /* Empty state - Minimal Modern */
                            <div className="flex flex-col items-center gap-5 opacity-40 hover:opacity-100 transition-opacity duration-500">
                                <div className="w-20 h-20 rounded-[2rem] bg-secondary/30 border border-border/20 flex items-center justify-center rotate-3 transition-transform duration-500 hover:rotate-6 hover:scale-110">
                                    <ImageIcon className="w-8 h-8 text-neutral-400" strokeWidth={1} />
                                </div>
                                <div className="text-center space-y-1.5">
                                    <p className="text-xs font-medium text-neutral-500 uppercase tracking-[0.2em]">Studio Canvas</p>
                                    <p className="text-[10px] text-neutral-400 font-normal">Select assets to begin</p>
                                </div>
                            </div>
                        )}
                    </Card>

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
                                            quality={50}
                                            loading="lazy"
                                            unoptimized
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

                {/* Right Panel: Controls */}
                <div className="order-3 lg:order-3 w-full lg:w-72 flex flex-col gap-5 shrink-0">
                    <Accordion type="multiple" defaultValue={['view', 'prompt']} className="w-full space-y-3">
                        {/* Composition */}
                        <AccordionItem value="view" className={accordionCardClass}>
                            <AccordionTrigger className="px-4 text-xs font-medium text-muted-foreground uppercase tracking-widest hover:no-underline py-3">
                                Composition
                            </AccordionTrigger>
                            <AccordionContent className="px-4 pt-2 pb-6">
                                <div className="space-y-4">
                                    <div>
                                        <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                                            View
                                        </p>
                                        <div className="flex gap-2">
                                            {COMPOSITION_PRESETS.map((preset) => (
                                                <button
                                                    key={preset.id}
                                                    onClick={() => setSelectedCameraPreset(preset)}
                                                    className={cn(
                                                        "relative w-16 aspect-[3/4] rounded-xl overflow-hidden transition-all",
                                                        selectedCameraPreset.id === preset.id
                                                            ? "border border-foreground/40 bg-foreground/5 shadow-sm"
                                                            : "border border-transparent hover:bg-muted/40"
                                                    )}
                                                >
                                                    {selectedCameraPreset.id === preset.id && (
                                                        <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-foreground/70" />
                                                    )}
                                                    {preset.image ? (
                                                        <Image
                                                            src={preset.image}
                                                            alt={preset.title}
                                                            fill
                                                            className="object-cover object-center"
                                                            sizes="64px"
                                                            quality={60}
                                                            loading="lazy"
                                                            unoptimized
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
                                    </div>

                                    <div className="pt-4 border-t border-border/40">
                                        <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                                            Shot
                                        </p>
                                        <div className="flex flex-wrap gap-1.5">
                                        {SHOT_SIZE_OPTIONS.map((shot) => (
                                            <button
                                                key={shot.id}
                                                onClick={() => setShotSize(shot.id)}
                                                className={cn(
                                                    "px-3 py-1.5 text-[10px] font-medium rounded-lg transition-colors border",
                                                    shotSize === shot.id
                                                            ? "bg-foreground text-background border-foreground shadow-sm"
                                                            : "bg-background text-muted-foreground border-transparent hover:bg-muted/50 hover:text-foreground"
                                                    )}
                                                >
                                                    {shot.label}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </AccordionContent>
                        </AccordionItem>

                        {/* Detail */}
                        <AccordionItem value="prompt" className={glassCardClass}>
                            <AccordionTrigger className="px-4 text-xs font-medium text-muted-foreground uppercase tracking-widest hover:no-underline py-3">
                                Prompt
                            </AccordionTrigger>
                            <AccordionContent className="px-4 pt-2 pb-6">
                                <Textarea
                                    placeholder="Optional prompt details..."
                                    className="min-h-[80px] resize-none bg-muted/30 border-1 rounded-xl text-sm placeholder:text-muted-foreground/50"
                                    value={prompt}
                                    onChange={(e) => setPrompt(e.target.value)}
                                />
                            </AccordionContent>
                        </AccordionItem>
                    </Accordion>

                    {/* Generation Action Panel - Card Style */}
                    <Card className="bg-white/60 backdrop-blur-md overflow-hidden p-4 flex flex-col gap-4">
                        <div className="space-y-3">
                            <div className="flex items-center justify-between">
                                <span className="text-[11px] text-muted-foreground font-medium uppercase tracking-wider">Mode</span>
                                <div className="inline-flex rounded-xl bg-muted/60 p-1">
                                    <button
                                        onClick={() => handleModelTierChange('standard')}
                                        className={cn(
                                            "px-3.5 py-1.5 text-[11px] font-medium rounded-lg transition-colors",
                                            modelTier === 'standard'
                                                ? "bg-background text-foreground shadow-sm ring-1 ring-border/40"
                                                : "text-muted-foreground hover:text-foreground hover:bg-muted/40"
                                        )}
                                    >
                                        Standard
                                    </button>
                                    <button
                                        onClick={() => handleModelTierChange('pro')}
                                        className={cn(
                                            "px-3.5 py-1.5 text-[11px] font-medium rounded-lg transition-colors",
                                            modelTier === 'pro'
                                                ? "bg-background text-foreground shadow-sm ring-1 ring-border/40"
                                                : "text-muted-foreground hover:text-foreground hover:bg-muted/40"
                                        )}
                                    >
                                        Pro
                                    </button>
                                </div>
                            </div>

                            <div className="flex items-center justify-between">
                                <span className="text-[11px] text-muted-foreground font-medium uppercase tracking-wider">
                                    {modelTier === 'standard' ? 'Images' : 'Resolution'}
                                </span>
                                <div className="inline-flex rounded-xl bg-muted/60 p-1">
                                    {modelTier === 'standard' ? (
                                        [2, 4].map((count) => (
                                            <button
                                                key={count}
                                                onClick={() => setNumImages(count as 2 | 4)}
                                                className={cn(
                                                    "px-3.5 py-1.5 text-[11px] font-medium rounded-lg transition-colors",
                                                    numImages === count
                                                        ? "bg-background text-foreground shadow-sm ring-1 ring-border/40"
                                                        : "text-muted-foreground hover:text-foreground hover:bg-muted/40"
                                                )}
                                            >
                                                {count}
                                            </button>
                                        ))
                                    ) : (
                                        availableProResolutions.map((res) => (
                                            <button
                                                key={res}
                                                onClick={() => setResolution(res as '2K' | '4K')}
                                                className={cn(
                                                    "px-3.5 py-1.5 text-[11px] font-medium rounded-lg transition-colors",
                                                    resolution === res
                                                        ? "bg-background text-foreground shadow-sm ring-1 ring-border/40"
                                                        : "text-muted-foreground hover:text-foreground hover:bg-muted/40"
                                                )}
                                            >
                                                {res}
                                            </button>
                                        ))
                                    )}
                                </div>
                            </div>
                        </div>

                        <Button
                            onClick={handleGenerate}
                            disabled={isGenerating || !selectedModels.length}
                            className={cn(
                                "w-full py-6 rounded-xl text-sm font-medium relative overflow-hidden transition-all duration-300",
                                isGenerating
                                    ? "bg-muted text-muted-foreground cursor-not-allowed"
                                    : "bg-foreground text-background hover:bg-foreground/90 shadow-lg hover:shadow-xl hover:scale-[1.02]"
                            )}
                        >
                            {isGenerating ? (
                                <div className="flex items-center gap-2">
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                    <span>Generating...</span>
                                </div>
                            ) : (
                                <div className="flex items-center justify-center gap-2">
                                    <span className="relative z-10">Generate</span>
                                    {/* Credit cost badge */}
                                    <span className="relative z-10 px-1.5 py-0.5 rounded-md bg-white/20 text-[10px] font-semibold">
                                        {estimatedCredits}
                                    </span>
                                </div>
                            )}
                            {/* Shine effect */}
                            {!isGenerating && (
                                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent translate-x-[-100%] animate-[shimmer_2s_infinite]" />
                            )}
                        </Button>
                    </Card>
                </div>
                    </div>
                </Card>
            </div>
        </div>
    );
}





