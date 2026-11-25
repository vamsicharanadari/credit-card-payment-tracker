import React, { useState } from 'react';

interface CreditCardVisualProps {
  name: string;
  imageUrl?: string;
  last4?: string;
  onClickEdit?: () => void;
  className?: string;
}

export const CreditCardVisual: React.FC<CreditCardVisualProps> = ({
  name,
  imageUrl,
  last4,
  onClickEdit,
  className = '',
}) => {
  const [imageError, setImageError] = useState(false);

  const hasValidImage = Boolean(
    imageUrl && 
    imageUrl.trim() && 
    (imageUrl.startsWith('data:') || imageUrl.startsWith('blob:')) && 
    !imageError
  );

  // Derive card styling or fallback last 4
  const displayLast4 = last4 || (name.match(/\d{4}$/) ? name.match(/\d{4}$/)![0] : '••••');

  return (
    <div
      style={{
        borderRadius: '1rem',
        borderColor: 'rgba(255, 255, 255, 0.12)',
        boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.5), 0 4px 6px -2px rgba(0, 0, 0, 0.3)',
      }}
      className={`border overflow-hidden select-none w-full max-w-[280px] sm:w-[260px] bg-slate-900 shrink-0 transition-transform hover:scale-[1.01] ${className}`}
    >
      {/* 1. TOP SECTION: CARD ARTWORK (Aspect ratio ~1.58:1, ~145px height) */}
      <div 
        style={{ height: '145px' }}
        className="relative w-full overflow-hidden bg-slate-950 flex items-center justify-center"
      >
        {hasValidImage ? (
          <img
            src={imageUrl!.trim()}
            alt={name}
            className="w-full h-full object-cover object-center"
            onError={() => setImageError(true)}
          />
        ) : (
          /* Sleek Fallback Virtual Credit Card Visual */
          <div 
            style={{
              background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 40%, #1e1b4b 100%)',
            }}
            className="w-full h-full p-3.5 flex flex-col justify-between relative overflow-hidden"
          >
            {/* Subtle background card pattern */}
            <div 
              style={{
                backgroundImage: 'radial-gradient(circle at 80% 20%, rgba(255,255,255,0.08) 0%, transparent 50%)',
              }}
              className="absolute inset-0 pointer-events-none"
            />

            {/* Top row: Card Title & Contactless wave */}
            <div className="flex items-center justify-between relative z-10">
              <span className="text-[11px] font-extrabold tracking-widest text-slate-200 uppercase truncate max-w-[170px]">
                {name}
              </span>
              {/* Contactless symbol */}
              <svg 
                className="w-4 h-4 text-slate-400 opacity-80" 
                viewBox="0 0 24 24" 
                fill="none" 
                stroke="currentColor" 
                strokeWidth="2" 
                strokeLinecap="round" 
                strokeLinejoin="round"
              >
                <path d="M8.5 4.5a14 14 0 0 1 0 15" />
                <path d="M12.5 7.5a9 9 0 0 1 0 9" />
                <path d="M16.5 10.5a4 4 0 0 1 0 3" />
              </svg>
            </div>

            {/* Middle: Gold EMV Chip */}
            <div className="relative z-10 my-auto">
              <div 
                style={{
                  background: 'linear-gradient(135deg, #fbbf24 0%, #f59e0b 50%, #d97706 100%)',
                  boxShadow: 'inset 0 1px 2px rgba(255,255,255,0.4), 0 2px 4px rgba(0,0,0,0.3)',
                  borderColor: 'rgba(217, 119, 6, 0.6)',
                }}
                className="w-9 h-7 rounded-sm border p-0.5 flex flex-col justify-between"
              >
                <div className="w-full h-full border border-amber-800/40 rounded-xs grid grid-cols-2 grid-rows-3 gap-0.5 opacity-60">
                  <div className="border-r border-b border-amber-900"></div>
                  <div className="border-b border-amber-900"></div>
                  <div className="border-r border-b border-amber-900"></div>
                  <div className="border-b border-amber-900"></div>
                  <div className="border-r border-amber-900"></div>
                  <div></div>
                </div>
              </div>
            </div>

            {/* Bottom row: Masked number & Dual circles logo */}
            <div className="flex items-end justify-between relative z-10">
              <span className="text-[11px] font-mono tracking-wider text-slate-300 font-semibold">
                •••• {displayLast4}
              </span>
              {/* Overlapping shiny circles (Mastercard / sleek card logo) */}
              <div className="flex -space-x-2 opacity-80">
                <div className="w-5 h-5 rounded-full bg-red-500/80 mix-blend-screen"></div>
                <div className="w-5 h-5 rounded-full bg-amber-400/80 mix-blend-screen"></div>
              </div>
            </div>
          </div>
        )}

        {/* Quick Edit Overlay Button on Hover */}
        {onClickEdit && (
          <button
            type="button"
            onClick={onClickEdit}
            style={{ backgroundColor: 'rgba(0, 0, 0, 0.6)' }}
            className="absolute top-2 right-2 text-white text-xs px-2 py-1 rounded-md opacity-0 group-hover:opacity-100 transition-opacity flex items-center space-x-1 cursor-pointer hover:bg-black/80"
            title="Edit card image URL"
          >
            <span>✏️</span>
            <span>Edit</span>
          </button>
        )}
      </div>

      {/* 2. BOTTOM TAB / FOOTER: Dark gray container with 💳 Card Name (Matching Image 1) */}
      <div 
        style={{
          backgroundColor: '#26282e',
          borderColor: 'rgba(255, 255, 255, 0.08)',
        }}
        className="px-3.5 py-2.5 flex items-center justify-between border-t text-xs font-semibold text-slate-100"
      >
        <div className="flex items-center space-x-2 truncate">
          <span className="text-sm">💳</span>
          <span className="truncate font-semibold text-white tracking-tight text-sm">
            {name}
          </span>
        </div>
        {onClickEdit && (
          <button
            type="button"
            onClick={onClickEdit}
            className="text-slate-400 hover:text-white transition cursor-pointer p-0.5 text-xs opacity-75 hover:opacity-100"
            title="Edit card details or image URL"
          >
            ✏️
          </button>
        )}
      </div>
    </div>
  );
};
