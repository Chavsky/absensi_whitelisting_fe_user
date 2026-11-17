import React from 'react';
import { TopHeader } from './TopHeader';
import { BottomNav } from './BottomNav';
import { OfflineBanner } from '../feedback/OfflineBanner';
import { PWAInstallBanner } from '../feedback/PWAInstallBanner';
import { useAuth } from '../../features/auth/AuthContext';

interface MobileShellProps {
  children: React.ReactNode;
  showNav?: boolean;
}

export const MobileShell: React.FC<MobileShellProps> = ({
  children,
  showNav = true,
}) => {
  const { isAuthenticated } = useAuth();
  const shouldRenderNav = showNav && isAuthenticated;

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col items-center justify-start sm:py-4">
      {/* Container simulating high-end smartphone view on desktop, full-width on mobile */}
      <div className="w-full max-w-md min-h-screen sm:min-h-[844px] bg-white sm:rounded-3xl sm:shadow-xl sm:border sm:border-slate-200/80 flex flex-col overflow-hidden relative">
        <OfflineBanner />
        <PWAInstallBanner />
        <TopHeader />

        {/* Main Content Area */}
        <main
          className={`flex-1 flex flex-col bg-slate-50/60 overflow-y-auto ${
            shouldRenderNav ? 'pb-24' : 'pb-8'
          }`}
        >
          {children}
        </main>

        {/* Bottom Navigation */}
        {shouldRenderNav && <BottomNav />}
      </div>
    </div>
  );
};
