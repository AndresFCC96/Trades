import { Outlet, createRootRoute } from '@tanstack/react-router';
import { Topbar } from '@/components/layout/Topbar';
import { Sidebar } from '@/components/layout/Sidebar';
import { Breadcrumbs } from '@/components/layout/Breadcrumbs';
import { CmdK } from '@/components/layout/CmdK';
import { GlobalShortcuts } from '@/components/layout/GlobalShortcuts';
import { ToastStack } from '@/components/ui/Toast';

export const Route = createRootRoute({
  component: RootLayout,
});

function RootLayout() {
  return (
    <div
      className="flex flex-col h-screen bg-bg text-fg font-sans"
      style={{ fontFamily: 'IBM Plex Sans, system-ui, sans-serif' }}
    >
      <Topbar />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar />
        <main className="flex-1 overflow-auto flex flex-col">
          <Breadcrumbs />
          <div className="flex-1 overflow-auto">
            <Outlet />
          </div>
        </main>
      </div>
      <CmdK />
      <ToastStack />
      <GlobalShortcuts />
    </div>
  );
}
