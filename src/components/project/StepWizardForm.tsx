"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

export type WizardStep = {
  key: string;
  label: string;
  type: "input" | "textarea";
  placeholder?: string;
  // Optional quick-pick options; for textarea these will append lines, for input they replace value
  options?: string[];
  // Optional helper text
  helperText?: string;
};

export type StepWizardFormProps = {
  steps: WizardStep[];
  value: Record<string, string>;
  onChange: (value: Record<string, string>) => void;
  step: number;
  setStep: (n: number) => void;
  onComplete?: (value: Record<string, string>) => void;
  finishLabel?: string;
  // Optional: role manager profile info
  profile?: {
    avatar?: string;
    label: string;
    description?: string;
  };
};

export default function StepWizardForm({
  steps,
  value,
  onChange,
  step,
  setStep,
  onComplete,
  finishLabel = "Finish",
  profile,
}: StepWizardFormProps) {
  const total = steps.length;
  const s = steps[step];

  const setField = (k: string, v: string) => onChange({ ...value, [k]: v });

  const handleOptionClick = (opt: string) => {
    if (s.type === "textarea") {
      const prev = value[s.key] || "";
      const prefix = prev.trim().length ? "\n" : "";
      setField(s.key, `${prev}${prefix}${opt}`);
    } else {
      setField(s.key, opt);
    }
  };

  const percent = Math.round(((step + 1) / total) * 100);
  return (
    <div className="flex flex-col gap-10 w-full max-w-2xl mx-auto bg-white rounded-2xl py-12 px-6 sm:px-12">
      {/* Progress bar and percent */}
      <div className="flex items-center justify-between mb-1">
        <div className="text-xs text-gray-500 font-medium">{step + 1} / {total} ({percent}%)</div>
        <div className="w-24 h-1.5 bg-gray-100 rounded-full overflow-hidden">
          <div className="h-full bg-gray-900 transition-all" style={{ width: `${percent}%` }} />
        </div>
      </div>

      {/* Profile between progress and question */}
      {profile && (
        <div className="flex flex-col items-center justify-center mb-2">
          {profile.avatar && (
            <img src={profile.avatar} alt={profile.label} className="w-20 h-20 rounded-full mb-2 border-2 border-gray-200 object-cover" />
          )}
          <div className="text-xl font-bold text-gray-900 text-center">{profile.label}</div>
          {profile.description && (
            <div className="text-base text-gray-500 text-center mt-1 max-w-md">{profile.description}</div>
          )}
        </div>
      )}


      {/* Question number and text, with prominent helper for Content Type */}
      <div className="flex flex-col mb-6">
        <div className="flex items-center gap-4">
          <div className="flex items-center justify-center w-10 h-10 rounded-full bg-gray-900 text-white font-bold text-lg">{step + 1}</div>
          <span className="text-xl font-bold text-gray-900 leading-tight">{s.label}</span>
        </div>
        {s.helperText && (
          <div className="ml-14 mt-2 text-lg font-semibold text-gray-800">
            {s.helperText}
          </div>
        )}
      </div>

  {/* Show options as pill buttons above input whenever options are provided */}
  {s.options && s.options.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-2 ml-14">
          {s.options.map((opt) => (
            <Button
              key={opt}
              type="button"
              variant={value[s.key] === opt ? "default" : "ghost"}
              size="sm"
              className={`rounded-full border text-xs px-4 py-1 shadow-none hover:translate-none ${value[s.key] === opt ? 'bg-gray-900 text-white border-gray-900' : 'border-gray-300 text-gray-700'}`}
      onClick={() => handleOptionClick(opt)}
            >
              {opt}
            </Button>
          ))}
        </div>
      )}

      {/* Input area with example/placeholder */}
      <div className="flex flex-col gap-2 mb-8">
        <div className="bg-white border border-gray-300 rounded-2xl flex items-center p-2 shadow-sm">
          {s.type === "textarea" ? (
            <Textarea
              id={s.key}
              placeholder={s.placeholder}
              value={value[s.key] || ""}
              onChange={(e) => setField(s.key, e.target.value)}
              className="w-full bg-transparent border-0 outline-none shadow-none focus:ring-0 focus-visible:ring-0 text-gray-800 placeholder-gray-400 px-4 py-3 text-base resize-none min-h-[260px]"
            />
          ) : (
            <Input
              id={s.key}
              placeholder={s.placeholder}
              value={value[s.key] || ""}
              onChange={(e) => setField(s.key, e.target.value)}
              className="w-full bg-transparent border-0 outline-none shadow-none focus:ring-0 focus-visible:ring-0 text-gray-800 placeholder-gray-400 px-4 py-2 text-base"
            />
          )}
          <Button
            type="button"
            variant="ghost"
            onClick={() => {
              const currentValue = value[s.key]?.trim();
              if (!currentValue) {
                alert('Please enter');
                return;
              }
              if (step < total - 1) {
                setStep(step + 1);
              } else {
                onComplete?.(value);
              }
            }}
            className="rounded-xl p-3 flex-shrink-0 ml-2 !transform-none"
            aria-label="Submit"
            title="Submit"
            style={{ boxShadow: 'none', border: 'none', outline: 'none', transition: 'none' }}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="feather feather-send">
              <line x1="22" y1="2" x2="11" y2="13"></line>
              <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
            </svg>
          </Button>
        </div>
  {/* 예시(placeholder)는 input/textarea 내부에 미리보기로 표시됨 */}
        {s.helperText && (
          <p className="text-base text-gray-500 mt-2">{s.helperText}</p>
        )}
      </div>
      {/* Navigation and send button removed as per requirements */}
    </div>
  );
}