'use client'

import React from 'react'

type Props = {
  currentStep: 1 | 2 | 3
}

export default function WizardProgress({ currentStep }: Props) {
  const steps: Array<{ key: 1 | 2 | 3; label: string }> = [
    { key: 1, label: 'Script' },
    { key: 2, label: 'Models' },
    { key: 3, label: 'Preview' },
  ]

  return (
    <nav className="inline-block" aria-label="Setup progress">
      <ol className="flex items-center gap-3">
        {steps.map((s, idx) => {
          const isActive = currentStep === s.key
          const isCompleted = (currentStep as number) > (s.key as number)
          return (
            <li key={s.key} className="flex items-center gap-3">
              <div
                aria-current={isActive ? 'step' : undefined}
                className={`inline-flex items-center gap-2 px-3 py-2 rounded-lg border transition text-sm cursor-default ${
                  isActive
                    ? 'border-white text-white bg-neutral-900'
                    : isCompleted
                    ? 'border-neutral-500 text-neutral-200 bg-neutral-800'
                    : 'border-neutral-700 text-neutral-300 bg-neutral-900'
                }`}
              >
                <span
                  className={`w-6 h-6 inline-flex items-center justify-center rounded-full text-xs font-semibold ${
                    isActive ? 'bg-white text-black' : isCompleted ? 'bg-white/80 text-black' : 'bg-neutral-700 text-white'
                  }`}
                  aria-hidden="true"
                >
                  {s.key}
                </span>
                <span className="font-medium">{s.label}</span>
              </div>
              {idx < steps.length - 1 && (
                <span
                  aria-hidden="true"
                  className={`w-10 h-px ${
                    (currentStep as number) > (s.key as number) ? 'bg-white/80' : 'bg-neutral-700'
                  }`}
                />
              )}
            </li>
          )
        })}
      </ol>
    </nav>
  )
}
