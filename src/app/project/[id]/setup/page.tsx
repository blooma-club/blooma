// src/app/project/[id]/setup/page.tsx
import SetupForm from '@/components/project/SetupForm'
import SetupSidebar from '@/components/project/SetupSidebar'

export default async function ProjectSetupPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  return (
    <div className="flex bg-[#F8F9FA] min-h-screen">
      <SetupSidebar />
      <main className="flex-1">
        <SetupForm id={id} />
      </main>
    </div>
  );
}