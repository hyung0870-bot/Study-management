import { NavLink } from 'react-router-dom';
import { BookOpenCheck, Clock3, CalendarRange, Shapes } from 'lucide-react';

const TABS = [
  { to: '/', label: '오늘 할 일', icon: BookOpenCheck, end: true },
  { to: '/timetable', label: '하루 시간표', icon: Clock3 },
  { to: '/planner', label: '주간 계획', icon: CalendarRange },
  { to: '/subjects', label: '과목 관리', icon: Shapes },
];

export default function BottomNav() {
  return (
    <nav
      className="sticky bottom-0 z-30 border-t border-slate-100 bg-white/90 backdrop-blur-md pb-[env(safe-area-inset-bottom)]"
      aria-label="주요 메뉴"
    >
      <ul className="grid grid-cols-4">
        {TABS.map(({ to, label, icon: Icon, end }) => (
          <li key={to}>
            <NavLink
              to={to}
              end={end}
              className={({ isActive }) =>
                `group flex flex-col items-center gap-0.5 py-2.5 text-[11px] transition-colors ${
                  isActive ? 'text-accent' : 'text-ink-soft hover:text-ink'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <span
                    className={`flex h-8 w-12 items-center justify-center rounded-full transition-all ${
                      isActive ? 'bg-accent/10 scale-105' : 'group-hover:bg-slate-50'
                    }`}
                  >
                    <Icon size={20} strokeWidth={isActive ? 2.4 : 1.8} />
                  </span>
                  <span className={isActive ? 'font-bold' : ''}>{label}</span>
                </>
              )}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}
