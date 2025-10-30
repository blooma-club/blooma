'use client'

import React, { useState } from 'react'
import clsx from 'clsx'
import { ChevronDown } from 'lucide-react'
import { CARD_WIDTH_MIN, CARD_WIDTH_MAX, clampCardWidth, DEFAULT_RATIO } from '@/lib/constants'
import type { StoryboardAspectRatio } from '@/types/storyboard'

type StoryboardWidthControlsProps = {
  visible: boolean
  cardWidthMin: number
  cardWidthMax: number
  normalizedCardWidth: number
  onCardWidthChange: (value: number) => void
  aspectRatio?: StoryboardAspectRatio
  onAspectRatioChange?: (ratio: StoryboardAspectRatio) => void
  onClose?: () => void
  className?: string
}

const ASPECT_RATIO_OPTIONS: StoryboardAspectRatio[] = ['16:9', '4:3', '3:2', '2:3', '3:4', '9:16']

const PRESETS = [
  { label: 'Compact', value: 280 },
  { label: 'Normal', value: 400 },
  { label: 'Large', value: 560 },
] as const

const sliderBaseClasses =
  'w-full appearance-none rounded-full h-2 bg-[hsl(var(--muted))] accent-[hsl(var(--foreground))] [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-[hsl(var(--foreground))] [&::-webkit-slider-thumb]:shadow [&::-moz-range-thumb]:appearance-none [&::-moz-range-thumb]:h-3 [&::-moz-range-thumb]:w-3 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-[hsl(var(--foreground))] [&::-moz-range-thumb]:border-0'

const StoryboardWidthControls: React.FC<StoryboardWidthControlsProps> = ({
  visible,
  cardWidthMin,
  cardWidthMax,
  normalizedCardWidth,
  onCardWidthChange,
  aspectRatio = DEFAULT_RATIO,
  onAspectRatioChange,
  onClose,
  className,
}) => {
  const [aspectDropdownOpen, setAspectDropdownOpen] = useState(false)
  const cardRef = React.useRef<HTMLDivElement>(null)

  // 외부 클릭 시 드롭다운 닫기 및 카드 닫기
  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement

      // 드롭다운 외부 클릭 시 드롭다운 닫기
      if (!target.closest('.aspect-dropdown-container')) {
        setAspectDropdownOpen(false)
      }

      // 카드 외부 클릭 시 카드 닫기 (슬라이더, 프리셋 버튼, 드롭다운 제외)
      if (cardRef.current && !cardRef.current.contains(target) && onClose) {
        // 슬라이더, 프리셋 버튼, 드롭다운 클릭이 아닌 경우에만 카드 닫기
        const isSlider =
          (target as HTMLInputElement).type === 'range' || target.closest('[data-slider="true"]')
        const isPresetButton = target.closest('[data-preset="true"]')
        const isDropdown = target.closest('.aspect-dropdown-container')

        if (!isSlider && !isPresetButton && !isDropdown) {
          onClose()
        }
      }
    }

    if (visible) {
      document.addEventListener('click', handleClickOutside)
    }

    return () => {
      document.removeEventListener('click', handleClickOutside)
    }
  }, [visible, onClose])
  return (
    <div className={clsx('w-full sm:w-[208px]', className)}>
      <div
        ref={cardRef}
        className={clsx(
          'rounded-xl border px-4 py-4 shadow-lg text-sm transition-all duration-150',
          visible
            ? 'visible opacity-100 pointer-events-auto'
            : 'invisible opacity-0 pointer-events-none'
        )}
        aria-hidden={!visible}
        style={{
          backgroundColor: 'hsl(var(--popover))',
          borderColor: 'hsl(var(--border))',
          color: 'hsl(var(--popover-foreground))',
        }}
      >
        <div className="space-y-4">
          {/* 비율 드롭다운 */}
          {onAspectRatioChange && (
            <div className="space-y-2">
              <span className="text-xs" style={{ color: 'hsl(var(--muted-foreground))' }}>Aspect ratio</span>
              <div className="relative aspect-dropdown-container">
                <button
                  type="button"
                  className="w-full appearance-none rounded-lg text-sm px-3 py-2 pr-8 focus:outline-none flex items-center justify-between border transition-colors"
                  style={{
                    backgroundColor: 'hsl(var(--muted))',
                    color: 'hsl(var(--muted-foreground))',
                    borderColor: 'hsl(var(--border))',
                  }}
                  onClick={() => setAspectDropdownOpen(!aspectDropdownOpen)}
                >
                  {aspectRatio}
                  <span className="pointer-events-none absolute inset-y-0 right-2 flex items-center text-xs" style={{ color: 'hsl(var(--muted-foreground))' }}>
                    <ChevronDown className="h-3 w-3" />
                  </span>
                </button>
                {aspectDropdownOpen && (
                  <ul className="absolute z-10 mt-1 min-w-[100px] rounded-lg border shadow-lg" style={{ backgroundColor: 'hsl(var(--popover))', borderColor: 'hsl(var(--border))' }}>
                    {ASPECT_RATIO_OPTIONS.map(option => (
                      <li key={option}>
                        <button
                          type="button"
                          className="block w-full text-left px-3 py-2 text-sm rounded-md transition-colors whitespace-nowrap"
                          style={{ color: 'hsl(var(--popover-foreground))' }}
                          onClick={() => {
                            onAspectRatioChange(option)
                            setAspectDropdownOpen(false)
                          }}
                          onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'hsl(var(--accent))')}
                          onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                        >
                          {option}
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          )}

          {/* 프리셋 버튼들 */}
          <div className="space-y-2">
            <span className="text-xs" style={{ color: 'hsl(var(--muted-foreground))' }}>Quick presets</span>
            <div className="flex gap-1">
              {PRESETS.map(preset => (
                <button
                  key={preset.label}
                  type="button"
                  data-preset="true"
                  onClick={() => onCardWidthChange(preset.value)}
                  className={clsx(
                    'flex-1 px-2 py-1 text-xs rounded-md border transition-colors',
                    Math.abs(normalizedCardWidth - preset.value) < 20
                      ? 'bg-[hsl(var(--accent))] text-[hsl(var(--accent-foreground))] border-[hsl(var(--accent))]'
                      : 'bg-[hsl(var(--muted))] text-[hsl(var(--muted-foreground))] border-[hsl(var(--border))] hover:bg-[hsl(var(--muted))]/70'
                  )}
                >
                  {preset.label}
                </button>
              ))}
            </div>
          </div>

          {/* 슬라이더 */}
          <label className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium" style={{ color: 'hsl(var(--foreground))' }}>Card size</span>
              <span className="text-xs" style={{ color: 'hsl(var(--muted-foreground))' }}>{normalizedCardWidth}px</span>
            </div>
            <div className="flex items-center justify-between text-xs" style={{ color: 'hsl(var(--muted-foreground))' }}>
              <span>{cardWidthMin}px</span>
              <span>{cardWidthMax}px</span>
            </div>
            <input
              id="storyboard-card-width"
              type="range"
              data-slider="true"
              min={cardWidthMin}
              max={cardWidthMax}
              step={10}
              value={normalizedCardWidth}
              aria-label="Adjust storyboard card width"
              onChange={event => onCardWidthChange(Number(event.target.value))}
              className={sliderBaseClasses}
            />
          </label>
        </div>
      </div>
    </div>
  )
}

export default StoryboardWidthControls
