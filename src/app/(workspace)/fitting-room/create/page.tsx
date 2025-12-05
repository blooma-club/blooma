"use client";

import React, { useState } from "react";
import { Upload, Image as ImageIcon, X, Plus, FolderOpen, Loader2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import ModelLibraryDropdown, { ModelLibraryAsset } from "@/components/storyboard/libraries/ModelLibraryDropdown";

export default function FittingRoomCreatePage() {
    const [selectedModels, setSelectedModels] = useState<ModelLibraryAsset[]>([]);
    const [referenceImages, setReferenceImages] = useState<string[]>([]);
    const [prompt, setPrompt] = useState("");
    const [isPromptOpen, setIsPromptOpen] = useState(false);
    const [isLibraryOpen, setIsLibraryOpen] = useState(false);
    const [isAddMenuOpen, setIsAddMenuOpen] = useState(false);
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
            const imageUrls = [
                modelImageUrl,
                ...referenceImages
            ].filter(Boolean) as string[];

            const finalPrompt = prompt || "Generate a fashion image with the model wearing the outfit";

            const response = await fetch('/api/generate-image', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    modelId: 'fal-ai/bytedance/seedream/v4.5/edit',
                    prompt: finalPrompt,
                    imageUrls,
                }),
            });

            const result = await response.json();

            if (result.success && result.imageUrl) {
                // Add to local state
                setGeneratedImages(prev => [result.imageUrl, ...prev]);
                setPreviewImage(result.imageUrl);

                // Save to database
                await fetch('/api/fitting-room/generated', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        image_url: result.imageUrl,
                        prompt: finalPrompt,
                        model_id: 'fal-ai/bytedance/seedream/v4.5/edit',
                        source_model_url: modelImageUrl,
                        source_outfit_urls: referenceImages.length > 0 ? referenceImages : null,
                    }),
                }).catch(console.error);
            } else {
                setError(result.error || "Failed to generate image");
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
                            <div className="mt-4 flex gap-2 overflow-x-auto pb-1">
                                {generatedImages.map((img, idx) => (
                                    <button
                                        key={idx}
                                        onClick={() => setPreviewImage(img)}
                                        className={cn(
                                            "w-14 h-14 shrink-0 rounded-xl overflow-hidden transition-all",
                                            previewImage === img
                                                ? "ring-2 ring-foreground ring-offset-2"
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
                                    <Sparkles className="w-4 h-4 mr-2" />
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
