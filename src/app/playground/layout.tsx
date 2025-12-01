import { ReactNode } from 'react'


export default function PlaygroundLayout({ children }: { children: ReactNode }) {
    return (
        <div className="flex h-screen flex-col bg-background text-foreground overflow-hidden">
            {/* Main Content Area */}
            <main className="flex-1 relative overflow-hidden">
                {children}
            </main>
        </div>
    )
}
