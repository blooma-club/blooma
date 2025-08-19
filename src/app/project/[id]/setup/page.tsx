// src/app/project/[id]/setup/page.tsx
import SetupForm from '@/components/project/SetupForm'
import SetupSidebar from '@/components/project/SetupSidebar'
import ProjectHeader from '@/components/project/ProjectHeader'

export default async function ProjectSetupPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  return (
    <div className="min-h-screen flex bg-white text-gray-900">
      <SetupSidebar />
  <div className="flex-1 flex flex-col bg-white">
  <header className="h-14 flex items-center gap-4 px-6 bg-white">
          <ProjectHeader />
        </header>
        <main className="flex-1 overflow-auto bg-white">
          <div className="w-full p-4 md:p-6 lg:p-8">
            <SetupForm id={id} />
          </div>
        </main>
      </div>
    </div>
  );
}