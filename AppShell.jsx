// src/components/layout/AppShell.jsx
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';

export default function AppShell() {
  return (
    <div className="min-h-screen bg-surface-0 bg-mesh">
      <Sidebar />
      <main className="ml-[240px] min-h-screen transition-all duration-300">
        <Outlet />
      </main>
    </div>
  );
}
