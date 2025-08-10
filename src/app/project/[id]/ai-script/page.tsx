import SetupSidebar from '@/components/project/SetupSidebar';
import AIScriptGenerator from '@/components/project/AIScriptGenerator';

export default function AIScriptPage() {
  return (
    <div className="flex min-h-screen">
      <SetupSidebar />
      <main className="flex-1">
        <AIScriptGenerator />
      </main>
    </div>
  );
}
