const Wrapper = () => (
  <>
        {isQuickActionVisible && (
          <aside
            className={clsx(
              'space-y-6',
              quickActionIsUpload
                ? 'w-full lg:max-w-[940px]'
                : 'w-full lg:w-[420px] xl:w-[480px]'
            )}
            aria-hidden={!activeQuickAction}
          >
            {quickActionForRender === 'generate' ? (
              <div className="rounded-xl bg-neutral-900 border border-neutral-800 shadow-lg p-6">
              <div className="mb-4 flex items-start justify-between gap-3">
              <div>
              <h3 className="text-lg font-semibold text-white">Generate Model</h3>
              <p className="mt-1 text-xs text-neutral-400">
              Describe a character and create a fresh portrait.
              </p>
              </div>
              <div className="flex items-center gap-2">
              {script?.trim() && (
              <Button
              onClick={handleAutoDetectCharacters}
              disabled={detecting || autoGenerating}
              className="text-xs px-3 py-1 h-8 bg-purple-600 hover:bg-purple-700 text-white"
              >
              {detecting
              ? 'Detecting...'
              : autoGenerating
              ? 'Generating...'
              : '🤖 Auto-Detect'}
              </Button>
              )}
              <button
              type="button"
              onClick={() => setActiveQuickAction(null)}
              className="rounded-full border border-neutral-700/70 px-2 py-1 text-xs text-neutral-300 transition-colors hover:border-neutral-500 hover:text-white"
              >
              Close
              </button>
              </div>
              </div>
              
              {script?.trim() && (detecting || autoGenerating) && (
              <div className="mb-4 rounded-lg border border-purple-500/30 bg-purple-900/20 p-3">
              <div className="flex items-center gap-2 text-sm text-purple-300">
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-purple-500 border-t-transparent"></div>
              {detecting
              ? 'Analyzing script to detect characters...'
              : autoGenerating
              ? 'Generating character images...'
              : ''}
              </div>
              </div>
              )}
              
              <div className="space-y-4">
              <div>
              <label className="mb-2 block text-sm font-medium text-neutral-300">
              Model Name *
              </label>
              <input
              type="text"
              value={characterName}
              onChange={e => setCharacterName(e.target.value)}
              placeholder="Enter character name"
              ref={generateNameInputRef}
              className="w-full rounded-md border border-neutral-700 bg-neutral-900 p-3 text-white placeholder-neutral-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
              />
              </div>
              
              <div>
              <label className="mb-2 block text-sm font-medium text-neutral-300">
              Generated Preview
              </label>
              {loading ? (
              <div className="flex aspect-[3/4] w-full items-center justify-center rounded-md border-2 border-blue-500 border-dashed bg-neutral-800">
              <div className="text-center">
              <div className="mx-auto mb-2 h-8 w-8 animate-spin rounded-full border-2 border-blue-500 border-t-transparent"></div>
              <div className="text-sm text-blue-400">Generating...</div>
              </div>
              </div>
              ) : characters.length > 0 ? (
              <div className="aspect-[3/4] w-full overflow-hidden rounded-md bg-neutral-800">
              <Image
              src={characters[characters.length - 1].imageUrl!}
              alt={`Generated preview of ${characters[characters.length - 1]?.name || 'latest character'}`}
              width={400}
              height={533}
              className="h-full w-full object-cover"
              />
              </div>
                  ) : (
              <div className="flex aspect-[3/4] w-full items-center justify-center rounded-md border border-neutral-700 bg-neutral-800">
              <div className="text-lg text-neutral-500">No preview yet</div>
              </div>
                  )}
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-neutral-300">
                    Character Description
                  </label>
                  <textarea
                    value={imagePrompt}
                    onChange={e => setImagePrompt(e.target.value)}
                    placeholder="Describe the character (e.g., 'young woman with curly hair, wearing a blue dress')"
                    className="w-full rounded-md border border-neutral-700 bg-neutral-900 p-3 text-white placeholder-neutral-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
                    rows={3}
                  />
                  <div className="mt-1 text-xs text-neutral-500">
                    Leave empty for a default character portrait
                  </div>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-neutral-300">Model</label>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button
                        type="button"
                        className="group inline-flex w-full items-center justify-between rounded-lg border border-neutral-700 bg-neutral-900 px-4 py-3 text-white transition-all duration-200 hover:border-neutral-600 hover:bg-neutral-800"
                      >
                        <span className="text-sm font-medium">
                          {allowedCharacterModels.find(m => m.id === model)?.name || 'Select Model'}
                        </span>
                        <svg
                          className="h-4 w-4 text-neutral-400 transition-colors group-hover:text-neutral-300"
                          viewBox="0 0 20 20"
                          fill="none"
                          xmlns="http://www.w3.org/2000/svg"
                        >
                          <path
                            d="M6 8l4 4 4-4"
                            stroke="currentColor"
                            strokeWidth="1.5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent
                      sideOffset={4}
                      className="w-64 rounded-lg border border-neutral-700 bg-neutral-900 shadow-xl"
                    >
                      <DropdownMenuRadioGroup value={model} onValueChange={setModel}>
                        {allowedCharacterModels.map(m => (
                          <DropdownMenuRadioItem
                            key={m.id}
                            value={m.id}
                            className="cursor-pointer border-b border-neutral-700 px-4 py-3 text-white transition-colors hover:bg-neutral-800 last:border-b-0"
                          >
                            {m.name}
                          </DropdownMenuRadioItem>
                        ))}
                      </DropdownMenuRadioGroup>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>

                <Button
                  onClick={handleGenerateImage}
                  disabled={loading || detecting || autoGenerating}
                  className="h-12 w-full"
                >
                  {loading ? 'Generating...' : 'Generate'}
                </Button>

                {error && (
                  <div
                    className={`text-sm ${error.startsWith('✅') ? 'text-green-400' : 'text-red-400'}`}
                  >
                    {error}
                  </div>
                )}
              </div>
            </div>
            ) : (
              <div className="space-y-5">
              <div className="flex flex-col gap-6 lg:flex-row">
                <div className="flex-1 rounded-[36px] border border-neutral-800 bg-neutral-950/70 p-6 sm:p-8 shadow-inner">
                  <div className="flex h-full flex-col">
                    <div className="max-w-xs">
                      <label className="sr-only" htmlFor="manual-name-input">
                        Character name
                      </label>
                      <input
                        id="manual-name-input"
                        ref={uploadPanelNameInputRef}
                        value={manualName}
                        onChange={event => setManualName(event.target.value)}
                        placeholder="Enter model name"
                        className="w-full rounded-2xl border border-neutral-700/80 bg-neutral-900/80 px-4 py-3 text-sm text-white shadow-inner placeholder:text-neutral-400 focus:border-neutral-400 focus:outline-none"
                      />
                    </div>

                    <div className="mt-8 flex flex-col items-start gap-4 sm:flex-row sm:items-start">
                      <div className="relative aspect-[3/4] w-full max-w-[220px] overflow-hidden rounded-3xl border border-neutral-700/70 bg-neutral-900">
                        {activeManualPreview ? (
                          <img
                            src={activeManualPreview}
                            alt="Manual model preview"
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center text-xs text-neutral-500">
                            Upload a reference image
                          </div>
                        )}
                        {hasManualImages && (
                          <button
                            type="button"
                            onClick={() => handleManualRemoveImage()}
                            className="absolute right-3 top-3 flex h-7 w-7 items-center justify-center rounded-full bg-black/70 text-sm text-white/80 transition hover:bg-black"
                            aria-label="Remove selected image"
                          >
                            ×
                          </button>
                        )}
                      </div>

                      {manualImagePreviews.length > 1 && (
                        <div className="flex gap-2 overflow-x-auto pb-2">
                          {manualImagePreviews.map((preview, index) => {
                            const isActive = index === boundedManualIndex
                            return (
                              <button
                                key={`${preview}-${index}`}
                                type="button"
                                onClick={() => setManualActiveImageIndex(index)}
                                className={`relative h-16 w-12 flex-shrink-0 overflow-hidden rounded-xl border ${isActive ? 'border-white' : 'border-neutral-700/70'} transition-colors`}
                              >
                                <img
                                  src={preview}
                                  alt={`Manual preview ${index + 1}`}
                                  className="h-full w-full object-cover"
                                />
                                <span
                                  className={`absolute inset-0 border-2 ${isActive ? 'border-white/70' : 'border-transparent'}`}
                                ></span>
                              </button>
                            )
                          })}
                        </div>
                      )}
                    </div>

                    {manualError && (
                      <div className="mt-4 w-full rounded-2xl border border-red-500/30 bg-red-900/20 px-4 py-3 text-xs text-red-200">
                        {manualError}
                      </div>
                    )}

                    <div className="mt-auto flex flex-col items-center gap-4 pt-10 sm:flex-row sm:justify-center">
                      <button
                        type="button"
                        onClick={() => manualFileInputRef.current?.click()}
                        className="inline-flex items-center gap-2 rounded-2xl border border-neutral-700/80 bg-neutral-800/80 px-8 py-3 text-sm font-medium text-white/90 shadow-inner transition hover:border-neutral-500 hover:bg-neutral-700"
                      >
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="1.5"
                          className="h-4 w-4"
                        >
                          <path d="M4 7a2 2 0 012-2h2l1-2h6l1 2h2a2 2 0 012 2v11a2 2 0 01-2 2H6a2 2 0 01-2-2V7z" />
                          <path d="M12 11v6" strokeLinecap="round" strokeLinejoin="round" />
                          <path d="M9 14h6" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                        Upload images
                      </button>
                      <button
                        type="button"
                        onClick={() => handleQuickAction('generate')}
                        className="inline-flex items-center gap-2 rounded-2xl border border-neutral-700/80 bg-neutral-800/80 px-8 py-3 text-sm font-medium text-white/90 shadow-inner transition hover:border-neutral-500 hover:bg-neutral-700"
                      >
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="1.5"
                          className="h-4 w-4"
                        >
                          <path
                            d="M12 3v3M5.6 5.6l2.1 2.1M3 12h3m10.3-4.3 2.1-2.1M18 12h3m-5.4 6.4 2.1 2.1M12 18v3m-6.4-5.4-2.1 2.1"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                        Generate
                      </button>
                      <button
                        type="button"
                        onClick={handleManualCreateCharacter}
                        disabled={manualSaving || !manualName.trim()}
                        className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white px-8 py-3 text-sm font-semibold text-black transition hover:bg-neutral-200 disabled:cursor-not-allowed disabled:border-white/20 disabled:bg-white/60"
                      >
                        {manualSaving ? 'Saving…' : 'Add model'}
                      </button>
                    </div>

                    <input
                      ref={manualFileInputRef}
                      type="file"
                      accept="image/*"
                      multiple
                      className="hidden"
                      onChange={handleManualFileChange}
                    />
                  </div>
                </div>

                <div className="w-full max-w-[200px] rounded-[28px] border border-neutral-800 bg-neutral-950/70 p-4">
                  <h4 className="mb-4 text-center text-xs font-semibold uppercase tracking-wide text-neutral-400">
                    Existing models
                  </h4>
                  <div className="space-y-4">
                    {characters.length > 0 ? (
                      characters.map((char, idx) => (
                        <div
                          key={char.id}
                          className="overflow-hidden rounded-2xl border border-neutral-800/80 bg-neutral-900/80 p-3 text-center"
                        >
                          <div className="aspect-[3/4] w-full overflow-hidden rounded-xl bg-neutral-800">
                            {char.imageUrl ? (
                              <Image
                                src={char.imageUrl}
                                alt={`Model portrait of ${char.name}`}
                                width={200}
                                height={280}
                                className="h-full w-full object-cover"
                              />
                            ) : (
                              <div className="flex h-full w-full items-center justify-center text-xs text-neutral-500">
                                No image
                              </div>
                            )}
                          </div>
                          <div className="mt-2 text-xs font-medium text-white">{char.name}</div>
                        </div>
                      ))
                    ) : (
                      <div className="rounded-2xl border border-dashed border-neutral-700/70 bg-neutral-900/60 p-6 text-center text-xs text-neutral-400">
                        Models you add will appear here.
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 text-xs text-neutral-500">
                <button
                  type="button"
                  onClick={resetManualForm}
                  className="rounded-full border border-neutral-700/60 px-3 py-1 transition-colors hover:border-neutral-500 hover:text-neutral-300"
                >
                  Reset
                </button>
                <button
                  type="button"
                  onClick={() => setActiveQuickAction(null)}
                  className="rounded-full border border-neutral-700/60 px-3 py-1 transition-colors hover:border-neutral-500 hover:text-neutral-300"
                >
                  Close
                </button>
              </div>
            </div>
              </div>
            )}
          </aside>
        )}
  </>
)
