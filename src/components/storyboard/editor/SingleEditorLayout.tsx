"use client";
import React from 'react';

interface SingleEditorLayoutProps {
  left: React.ReactNode;
  center: React.ReactNode;
  right: React.ReactNode;
  header?: React.ReactNode;
  footer?: React.ReactNode;
}

// Pure layout shell for 3-column storyboard editor with floating panels.
export const SingleEditorLayout: React.FC<SingleEditorLayoutProps> = ({ left, center, right, header, footer }) => {
  return (
    <div className="flex flex-col h-full w-full">
      {header && <div className="shrink-0 border-b bg-white/80 backdrop-blur-sm px-4 py-2">{header}</div>}
      <div className="flex flex-1 min-h-0 gap-4 p-4">
        {/* Left Panel - Floating */}
        <div className="w-80 xl:w-96 h-full">
          <div className="h-full bg-neutral-900 border border-neutral-800 rounded-lg shadow-lg overflow-hidden">
            <div className="h-full overflow-y-auto">{left}</div>
          </div>
        </div>
        
        {/* Center Panel - Floating */}
        <div className="flex-1 min-w-0 flex flex-col items-center h-full">
          <div className="w-full max-w-5xl h-full">
            <div className="h-full bg-neutral-900 border border-neutral-800 rounded-lg shadow-lg overflow-hidden">
              <div className="h-full overflow-y-auto p-6">{center}</div>
            </div>
          </div>
        </div>
        
        {/* Right Panel - Floating */}
        <div className="w-[480px] h-full">
          <div className="h-full bg-neutral-900 border border-neutral-800 rounded-lg shadow-lg overflow-hidden">
            <div className="h-full overflow-y-auto">{right}</div>
          </div>
        </div>
      </div>
      {footer && <div className="shrink-0 border-t bg-white/90 backdrop-blur px-4 py-2">{footer}</div>}
    </div>
  );
};

export default SingleEditorLayout;
