"use client"

import React from 'react'
import clsx from 'clsx'

type StoryboardWidthControlsProps = {
  visible: boolean
  cardWidthMin: number
  cardWidthMax: number
  normalizedCardWidth: number
  normalizedContainerWidth: number
  containerMaxWidth: number
  containerStep: number
  onCardWidthChange: (value: number) => void
  onContainerWidthChange: (value: number) => void
  className?: string
}

const sliderBaseClasses =
  'w-full appearance-none rounded-full h-2 bg-neutral-800 accent-neutral-100 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-neutral-100 [&::-webkit-slider-thumb]:shadow [&::-moz-range-thumb]:appearance-none [&::-moz-range-thumb]:h-3 [&::-moz-range-thumb]:w-3 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-neutral-100 [&::-moz-range-thumb]:border-0'

const StoryboardWidthControls: React.FC<StoryboardWidthControlsProps> = ({
  visible,
  cardWidthMin,
  cardWidthMax,
  normalizedCardWidth,
  normalizedContainerWidth,
  containerMaxWidth,
  containerStep,
  onCardWidthChange,
  onContainerWidthChange,
  className,
}) => {
  return (
    <div className={clsx('w-full sm:w-[208px]', className)}>
      <div
        className={clsx(
          'rounded-xl border border-neutral-800/70 bg-[#1A1A1A] px-4 py-4 shadow-lg text-sm text-neutral-200 transition-all duration-150',
          visible ? 'visible opacity-100 pointer-events-auto' : 'invisible opacity-0 pointer-events-none'
        )}
        aria-hidden={!visible}
      >
        <div className="space-y-4">
          <label className="flex flex-col gap-2">
            <span className="text-sm font-medium text-neutral-100">Card size</span>
            <div className="flex items-center justify-between text-xs text-neutral-400">
              <span className="text-neutral-100 font-semibold">{normalizedCardWidth}px</span>
              <span>
                {cardWidthMin}px – {cardWidthMax}px
              </span>
            </div>
            <input
              id="storyboard-card-width"
              type="range"
              min={cardWidthMin}
              max={cardWidthMax}
              step={10}
              value={normalizedCardWidth}
              aria-label="Adjust storyboard card width"
              onChange={event => onCardWidthChange(Number(event.target.value))}
              className={sliderBaseClasses}
            />
          </label>

          <label className="flex flex-col gap-2">
            <span className="text-sm font-medium text-neutral-100">Container size</span>
            <div className="flex items-center justify-between text-xs text-neutral-400">
              <span className="text-neutral-100 font-semibold">{normalizedContainerWidth}px</span>
              <span>max {containerMaxWidth}px</span>
            </div>
            <input
              id="storyboard-container-width"
              type="range"
              min={normalizedCardWidth}
              max={containerMaxWidth}
              step={containerStep}
              value={normalizedContainerWidth}
              aria-label="Adjust storyboard container width"
              onChange={event => onContainerWidthChange(Number(event.target.value))}
              className={clsx(sliderBaseClasses, 'bg-neutral-900')}
            />
          </label>
        </div>
      </div>
    </div>
  )
}

export default StoryboardWidthControls
