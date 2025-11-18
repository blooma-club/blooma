'use client'

import React from 'react'

type ToolId = 'bananaReplacement' | 'colorAdjust' | 'lightingFix' | 'cleanup'
type BananaToolMode = 'brush' | 'erase'

const TOOL_OPTIONS: Array<{ id: ToolId; name: string; description: string }> = [
  {
    id: 'bananaReplacement',
    name: 'Banana Replacement',
    description: 'Replace bananas with new hero products.',
  },
  { id: 'colorAdjust', name: 'Color Adjust', description: 'Tune saturation and white balance.' },
  {
    id: 'lightingFix',
    name: 'Lighting Fix',
    description: 'Rebalance exposure, highlights, and shadows.',
  },
  { id: 'cleanup', name: 'Cleanup', description: 'Remove blemishes or distracting elements.' },
]

interface BananaToolSettings {
  mode: BananaToolMode
  productName: string
  prompt: string
}

export interface EditTabProps {
  selectedTool: ToolId
  onSelectTool: (toolId: ToolId) => void
  bananaToolSettings: BananaToolSettings
  onBananaToolSettingsChange: (settings: BananaToolSettings) => void
}

const EditTab: React.FC<EditTabProps> = ({
  selectedTool,
  onSelectTool,
  bananaToolSettings,
  onBananaToolSettingsChange,
}) => {
  return (
    <div className="space-y-4">
      <div>
        <div className="mb-2 text-xs font-medium text-gray-300">Tools</div>
        <div className="grid grid-cols-2 gap-2">
          {TOOL_OPTIONS.map(tool => (
            <button
              key={tool.id}
              type="button"
              onClick={() => onSelectTool(tool.id)}
              className={`rounded border px-3 py-2 text-left transition-colors ${
                selectedTool === tool.id
                  ? 'border-white/80 bg-white/10 text-white'
                  : 'border-gray-700 bg-gray-800 text-gray-200 hover:border-gray-500 hover:text-white'
              }`}
            >
              <div className="text-xs font-semibold">{tool.name}</div>
              <div className="mt-1 text-[11px] text-gray-400">{tool.description}</div>
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-4 rounded border border-gray-700 bg-gray-900/70 p-4">
        {selectedTool === 'bananaReplacement' ? (
          <>
            <div className="text-xs font-medium text-white">Banana Replacement</div>
            <p className="text-[11px] text-gray-400">
              Brush over bananas to mask them, then describe the product you want to appear instead.
              Use erase to refine the mask before applying.
            </p>
            <div className="flex flex-wrap gap-2">
              {(['brush', 'erase'] as BananaToolMode[]).map(mode => (
                <button
                  key={mode}
                  type="button"
                  onClick={() =>
                    onBananaToolSettingsChange({
                      ...bananaToolSettings,
                      mode,
                    })
                  }
                  className={`rounded px-3 py-1.5 text-xs font-medium transition-colors ${
                    bananaToolSettings.mode === mode
                      ? 'bg-white text-black'
                      : 'bg-gray-800 text-gray-200 hover:bg-gray-700 hover:text-white'
                  }`}
                >
                  {mode === 'brush' ? 'Brush' : 'Erase'}
                </button>
              ))}
            </div>
            <Field label="Featured Product">
              <input
                type="text"
                value={bananaToolSettings.productName}
                onChange={e =>
                  onBananaToolSettingsChange({
                    ...bananaToolSettings,
                    productName: e.target.value,
                  })
                }
                placeholder="e.g. Premium chocolate bar"
                className="w-full rounded border border-gray-600 bg-gray-800 px-2 py-1.5 text-xs text-white focus:border-gray-500 focus:outline-none"
              />
            </Field>
            <Field
              label="Replacement Prompt"
              help="Describe the new product, lighting, and style for the replacement."
            >
              <textarea
                rows={3}
                value={bananaToolSettings.prompt}
                onChange={e =>
                  onBananaToolSettingsChange({
                    ...bananaToolSettings,
                    prompt: e.target.value,
                  })
                }
                placeholder="Hyper-realistic dessert shot replacing bananas with a glossy chocolate sculpture..."
                className="w-full resize-y rounded border border-gray-600 bg-gray-800 px-2 py-1.5 text-xs text-white focus:border-gray-500 focus:outline-none"
              />
            </Field>
            <button
              type="button"
              className="w-full rounded bg-white/90 py-2 text-xs font-semibold text-black transition-colors hover:bg-white"
            >
              Apply Banana Replacement
            </button>
          </>
        ) : (
          <div className="space-y-2 text-[11px] text-gray-400">
            <div className="text-xs font-semibold text-white">
              {TOOL_OPTIONS.find(tool => tool.id === selectedTool)?.name}
            </div>
            <p>
              This tool is coming soon. Select Banana Replacement to try the interactive workflow.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

const Field: React.FC<{ label: string; help?: string; children: React.ReactNode }> = ({
  label,
  help,
  children,
}) => (
  <div className="flex flex-col gap-1">
    <label className="text-xs font-medium text-gray-300">{label}</label>
    {children}
    {help && <p className="text-[10px] text-gray-400">{help}</p>}
  </div>
)

export default EditTab
