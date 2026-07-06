import { Outlet, NavLink } from 'react-router-dom'

const tabs = [
  { to: '/parent/overview',  label: 'Overview',  icon: OverviewIcon },
  { to: '/parent/calendar',  label: 'Calendar',  icon: CalendarIcon },
  { to: '/parent/account',   label: 'Account',   icon: AccountIcon },
]

export default function ParentLayout() {
  return (
    <div className="flex flex-col w-full max-w-[430px] mx-auto h-[100dvh] bg-dot-bg">
      <main className="flex-1 overflow-y-auto overflow-x-hidden">
        <Outlet />
      </main>

      <nav className="flex-shrink-0 bg-dot-white border-t border-dot-border pb-safe">
        <div className="flex">
          {tabs.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                'flex-1 flex flex-col items-center justify-center pt-2 pb-1 gap-[3px] transition-colors ' +
                (isActive ? 'text-dot-rose' : 'text-dot-muted')
              }
            >
              <Icon />
              <span className="text-2xs font-semibold tracking-wide">{label}</span>
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  )
}

function OverviewIcon() {
  return (
    <svg className="w-[22px] h-[22px]" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
    </svg>
  )
}

function CalendarIcon() {
  return (
    <svg className="w-[22px] h-[22px]" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
      <rect x="3" y="4" width="18" height="18" rx="3" />
      <path strokeLinecap="round" d="M16 2v4M8 2v4M3 10h18" />
    </svg>
  )
}

function AccountIcon() {
  return (
    <svg className="w-[22px] h-[22px]" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
      <circle cx="12" cy="8" r="4" />
      <path strokeLinecap="round" d="M4 20c0-4 3.6-7 8-7s8 3 8 7" />
    </svg>
  )
}
