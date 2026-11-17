import React from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, History, User } from 'lucide-react';

export const BottomNav: React.FC = () => {
  const navItems = [
    {
      to: '/',
      label: 'Beranda',
      icon: LayoutDashboard,
    },
    {
      to: '/riwayat',
      label: 'Riwayat',
      icon: History,
    },
    {
      to: '/profil',
      label: 'Profil',
      icon: User,
    },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200 select-none pb-[env(safe-area-inset-bottom,0px)]">
      <div className="max-w-md mx-auto grid grid-cols-3 h-16 items-center px-4">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              className={({ isActive }) =>
                `flex flex-col items-center justify-center gap-1 py-1 transition-all duration-150 relative ${
                  isActive
                    ? 'text-blue-600 font-bold'
                    : 'text-slate-500 hover:text-slate-800 font-medium'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <div
                    className={`p-1 rounded-xl transition-colors ${
                      isActive ? 'bg-blue-50 text-blue-600' : 'text-slate-500'
                    }`}
                  >
                    <Icon className="w-5 h-5" strokeWidth={isActive ? 2.5 : 2} />
                  </div>
                  <span className="text-[11px] leading-tight tracking-tight">
                    {item.label}
                  </span>
                  {isActive && (
                    <span className="w-1 h-1 bg-blue-600 rounded-full absolute -top-1" />
                  )}
                </>
              )}
            </NavLink>
          );
        })}
      </div>
    </nav>
  );
};
