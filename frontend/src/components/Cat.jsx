/* Inline SVG cat illustrations. All use currentColor so they inherit
   the parent's text color. Pass className for sizing + color. */

export function CatSitting({ className = 'w-20 h-20' }) {
  return (
    <svg className={className} viewBox="0 0 80 82" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      {/* Body */}
      <ellipse cx="40" cy="64" rx="17" ry="13" fill="currentColor" opacity="0.14" />
      {/* Head */}
      <circle cx="40" cy="35" r="18" fill="currentColor" opacity="0.18" />
      {/* Left ear outer */}
      <polygon points="24,20 19,7 32,18" fill="currentColor" opacity="0.32" />
      {/* Right ear outer */}
      <polygon points="56,18 61,7 48,20" fill="currentColor" opacity="0.32" />
      {/* Left ear inner */}
      <polygon points="24,19 22,12 29,18" fill="currentColor" opacity="0.08" />
      {/* Right ear inner */}
      <polygon points="56,18 58,12 51,19" fill="currentColor" opacity="0.08" />
      {/* Eyes — happy crescent shape */}
      <path d="M30 33 Q33 30 36 33" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" fill="none" opacity="0.75" />
      <path d="M44 33 Q47 30 50 33" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" fill="none" opacity="0.75" />
      {/* Nose */}
      <ellipse cx="40" cy="39" rx="2.5" ry="2" fill="currentColor" opacity="0.45" />
      {/* Mouth */}
      <path d="M37.5 42 Q40 45 42.5 42" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" fill="none" opacity="0.35" />
      {/* Whiskers left */}
      <line x1="18" y1="38" x2="34" y2="40" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" opacity="0.18" />
      <line x1="18" y1="42" x2="34" y2="42" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" opacity="0.13" />
      {/* Whiskers right */}
      <line x1="62" y1="38" x2="46" y2="40" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" opacity="0.18" />
      <line x1="62" y1="42" x2="46" y2="42" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" opacity="0.13" />
      {/* Paws */}
      <ellipse cx="30" cy="73" rx="7" ry="5" fill="currentColor" opacity="0.17" />
      <ellipse cx="50" cy="73" rx="7" ry="5" fill="currentColor" opacity="0.17" />
      {/* Tail */}
      <path d="M57 65 Q71 50 65 37" stroke="currentColor" strokeWidth="5" strokeLinecap="round" fill="none" opacity="0.14" />
    </svg>
  )
}

export function CatSleeping({ className = 'w-28 h-20' }) {
  return (
    <svg className={className} viewBox="0 0 110 72" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      {/* Curled body */}
      <ellipse cx="60" cy="50" rx="38" ry="19" fill="currentColor" opacity="0.12" />
      {/* Head */}
      <circle cx="26" cy="36" r="18" fill="currentColor" opacity="0.17" />
      {/* Left ear */}
      <polygon points="13,22 8,10 22,20" fill="currentColor" opacity="0.28" />
      {/* Right ear */}
      <polygon points="38,20 43,9 30,21" fill="currentColor" opacity="0.28" />
      {/* Closed sleeping eyes */}
      <path d="M18 34 Q22 31 26 34" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" fill="none" opacity="0.6" />
      <path d="M26 34 Q30 31 34 34" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" fill="none" opacity="0.6" />
      {/* Tiny nose */}
      <ellipse cx="26" cy="40" rx="2" ry="1.5" fill="currentColor" opacity="0.38" />
      {/* Paws peeking out */}
      <ellipse cx="46" cy="59" rx="9" ry="5.5" fill="currentColor" opacity="0.14" />
      <ellipse cx="60" cy="63" rx="9" ry="5.5" fill="currentColor" opacity="0.14" />
      {/* Tail wrap */}
      <path d="M96 55 Q108 33 90 27 Q74 23 78 42" stroke="currentColor" strokeWidth="7" strokeLinecap="round" fill="none" opacity="0.12" />
      {/* Zzz */}
      <text x="78" y="22" fontSize="11" fill="currentColor" opacity="0.22" fontFamily="Nunito, sans-serif" fontWeight="700">z</text>
      <text x="86" y="14" fontSize="9" fill="currentColor" opacity="0.16" fontFamily="Nunito, sans-serif" fontWeight="700">z</text>
      <text x="93" y="8" fontSize="7" fill="currentColor" opacity="0.12" fontFamily="Nunito, sans-serif" fontWeight="700">z</text>
    </svg>
  )
}

export function PawPrint({ className = 'w-5 h-5' }) {
  return (
    <svg className={className} viewBox="0 0 32 32" fill="currentColor" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      {/* Main pad */}
      <ellipse cx="16" cy="22.5" rx="8" ry="7" />
      {/* Toe beans */}
      <ellipse cx="7"  cy="13.5" rx="3.5" ry="4" />
      <ellipse cx="14" cy="10"   rx="3.5" ry="4" />
      <ellipse cx="22" cy="10"   rx="3.5" ry="4" />
      <ellipse cx="29" cy="13.5" rx="3.5" ry="4" />
    </svg>
  )
}

export function CatPeeking({ className = 'w-16 h-10' }) {
  return (
    <svg className={className} viewBox="0 0 64 42" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      {/* Peeking over edge — just eyes and ears visible */}
      {/* Left ear */}
      <polygon points="10,18 6,6 18,16" fill="currentColor" opacity="0.3" />
      {/* Right ear */}
      <polygon points="46,16 50,5 38,17" fill="currentColor" opacity="0.3" />
      {/* Head (partially hidden) */}
      <path d="M4 42 Q4 22 28 22 Q52 22 60 42" fill="currentColor" opacity="0.17" />
      {/* Eyes peeking */}
      <path d="M16 28 Q20 24 24 28" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" fill="none" opacity="0.7" />
      <path d="M32 28 Q36 24 40 28" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" fill="none" opacity="0.7" />
    </svg>
  )
}
