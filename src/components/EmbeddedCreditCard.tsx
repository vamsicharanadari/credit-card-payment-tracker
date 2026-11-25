import React, { useState } from 'react';
import { EnrichedCreditCard, BillUrgency } from '../types';
import { SwipeToPayButton } from './SwipeToPayButton';

interface EmbeddedCreditCardProps {
  card: EnrichedCreditCard;
  onOpenEditModal: (card: EnrichedCreditCard) => void;
  onSwipePay: (card: EnrichedCreditCard) => void;
  monoStyle?: React.CSSProperties;
}

export const EmbeddedCreditCard: React.FC<EmbeddedCreditCardProps> = ({
  card,
  onOpenEditModal,
  onSwipePay,
  monoStyle = { fontFamily: 'var(--font-mono, monospace)', fontVariantNumeric: 'tabular-nums' },
}) => {
  const { account, meta, daysRemaining, urgency, utilization, isInsufficientFunds, payableAccount } = card;
  const [imageError, setImageError] = useState(false);

  // Only allow data: and blob: URLs to strictly comply with Wealthfolio's CSP (img-src data: blob:)
  const isCspSafeImage = Boolean(
    meta.imageUrl &&
    meta.imageUrl.trim() &&
    (meta.imageUrl.trim().startsWith('data:') || meta.imageUrl.trim().startsWith('blob:'))
  );

  const hasCustomImage = Boolean(isCspSafeImage && !imageError);

  const isDueActive = meta.paymentDue > 0.01;

  const getUrgencyBadge = (
    urg: BillUrgency,
    days: number,
    due?: string,
    dueAmount = 0
  ) => {
    if (!due) {
      return (
        <span className="px-2 py-0.5 text-[9px] font-bold rounded-full bg-slate-800/80 text-slate-300 border border-slate-700/60 backdrop-blur-md">
          ⚙️ SETUP DUE
        </span>
      );
    }
    if (dueAmount <= 0.01) {
      return (
        <span className="px-2 py-0.5 text-[9px] font-bold rounded-full bg-emerald-950/80 text-emerald-300 border border-emerald-500/40 backdrop-blur-md">
          ✓ PAID
        </span>
      );
    }
    if (urg === 'critical') {
      const label = days < 0
        ? `🔴 ${Math.abs(days)}d OVERDUE`
        : days === 0
        ? '🔴 TODAY'
        : `🔴 ${days}d`;
      return (
        <span className="px-2 py-0.5 text-[9px] font-bold rounded-full bg-red-950/85 text-red-200 border border-red-500/50 backdrop-blur-md animate-pulse">
          {label}
        </span>
      );
    }
    if (urg === 'upcoming') {
      return (
        <span className="px-2 py-0.5 text-[9px] font-bold rounded-full bg-amber-950/80 text-amber-200 border border-amber-500/40 backdrop-blur-md">
          🟡 {days}d
        </span>
      );
    }
    return (
      <span className="px-2 py-0.5 text-[9px] font-bold rounded-full bg-emerald-950/80 text-emerald-300 border border-emerald-500/40 backdrop-blur-md">
        🟢 {days}d
      </span>
    );
  };

  const getPromoCountdown = (promoDate?: string) => {
    if (!promoDate) return null;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const promoObj = new Date(promoDate + 'T00:00:00');
    const diffDays = Math.ceil((promoObj.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays <= 0) {
      return (
        <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-red-950/80 text-red-300 border border-red-500/40 backdrop-blur-md font-semibold">
          ⚠️ 0% Expired
        </span>
      );
    }
    return (
      <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-blue-950/80 text-blue-200 border border-blue-500/40 backdrop-blur-md font-semibold">
        🏷️ 0% ({diffDays}d)
      </span>
    );
  };

  // Dynamic Card Background Style:
  // If custom imageUrl is set: use that image with a subtle vignette gradient so embedded text stays readable.
  // If no URL: use sleek metallic slate/indigo gradient.
  const cardBackgroundStyle: React.CSSProperties = hasCustomImage
    ? {
        backgroundImage: `linear-gradient(180deg, rgba(15, 23, 42, 0.25) 0%, rgba(15, 23, 42, 0.45) 45%, rgba(10, 15, 30, 0.85) 100%), url(${meta.imageUrl!.trim()})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
      }
    : {
        background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 45%, #1e1b4b 100%)',
      };

  const textShadowStyle: React.CSSProperties = {
    textShadow: '0 1px 3px rgba(0, 0, 0, 0.95), 0 2px 6px rgba(0, 0, 0, 0.85), 0 0 1px rgba(0, 0, 0, 1)',
  };

  return (
    <div
      style={{
        ...cardBackgroundStyle,
        borderRadius: '1.25rem', // 20px physical credit card corners
        borderColor: urgency === 'critical' && meta.paymentDue > 0 
          ? 'rgba(239, 68, 68, 0.5)' 
          : 'rgba(255, 255, 255, 0.15)',
        boxShadow: '0 16px 36px -8px rgba(0, 0, 0, 0.65), 0 4px 12px rgba(0, 0, 0, 0.35)',
      }}
      className="w-full max-w-[380px] h-[350px] border p-4 flex flex-col justify-between text-white relative overflow-hidden select-none transition-transform hover:scale-[1.01] shrink-0"
    >
      {/* Hidden image element to detect load errors (only for CSP-safe data/blob URLs) */}
      {hasCustomImage && (
        <img
          src={meta.imageUrl!.trim()}
          alt=""
          className="hidden"
          onError={() => setImageError(true)}
        />
      )}

      {/* Decorative metallic card sheen when using fallback gradient */}
      {!hasCustomImage && (
        <div 
          style={{
            backgroundImage: 'radial-gradient(circle at 85% 15%, rgba(255,255,255,0.09) 0%, transparent 60%)',
          }}
          className="absolute inset-0 pointer-events-none"
        />
      )}

      {/* ======================================================== */}
      {/* 1. TOP HEADER: Card Name (only if no image), Status & Monochrome Edit */}
      {/* ======================================================== */}
      <div className="relative z-10">
        <div className="flex items-center justify-between gap-2">
          
          {/* Card Name - ONLY DISPLAYED IF NO IMAGE IS ADDED */}
          {!hasCustomImage ? (
            <div className="truncate max-w-[60%]">
              <span className="font-extrabold text-base sm:text-lg tracking-wide text-white uppercase truncate drop-shadow-md block">
                {account.name}
              </span>
            </div>
          ) : (
            <div />
          )}

          {/* Right Header Cluster: Status Badge & Promo ON LEFT of Monochrome Edit Icon */}
          <div className="flex items-center space-x-1.5 ml-auto">
            {getUrgencyBadge(urgency, daysRemaining, meta.dueDate, meta.paymentDue)}
            {getPromoCountdown(meta.promoExpirationDate)}

            {/* Monochrome Outlined Edit Icon Button (No Colored Emoji, No 'Edit' Text) */}
            <button
              type="button"
              onClick={() => onOpenEditModal(card)}
              style={{
                backgroundColor: 'rgba(0, 0, 0, 0.45)',
                borderColor: 'rgba(255, 255, 255, 0.25)',
              }}
              className="p-1.5 rounded-full border text-slate-200 hover:text-white hover:bg-black/60 transition backdrop-blur-md flex items-center justify-center cursor-pointer shrink-0 shadow-xs"
              title="Edit Card Details & Background Image"
            >
              <svg 
                className="w-3.5 h-3.5 text-slate-200" 
                viewBox="0 0 24 24" 
                fill="none" 
                stroke="currentColor" 
                strokeWidth="2" 
                strokeLinecap="round" 
                strokeLinejoin="round"
              >
                <path d="M12 20h9" />
                <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* ======================================================== */}
      {/* 2. EMBEDDED METRICS: Centered, Clean Shadow Highlight (No Boxes) */}
      {/* ======================================================== */}
      <div className="relative z-10 grid grid-cols-2 gap-x-4 gap-y-2.5 my-1.5 px-1">
        
        {/* Metric 1: Payment Due (Centered, Red if > 0.01) */}
        <div className="text-center space-y-0.5">
          <span 
            style={textShadowStyle}
            className="text-[9.5px] font-bold uppercase tracking-wider text-slate-300/90 block text-center"
          >
            Payment Due
          </span>
          <span
            style={{
              ...monoStyle,
              ...textShadowStyle,
              color: isDueActive ? '#ef4444' : '#34d399',
            }}
            className="text-xs font-bold tracking-normal truncate block text-center"
          >
            ${meta.paymentDue.toLocaleString('en-US', { minimumFractionDigits: 2 })}
          </span>
        </div>

        {/* Metric 2: Due Date (Centered, Red if Payment Due > 0.01) */}
        <div className="text-center space-y-0.5">
          <span 
            style={textShadowStyle}
            className="text-[9.5px] font-bold uppercase tracking-wider text-slate-300/90 block text-center"
          >
            Due Date
          </span>
          <span 
            style={{
              ...textShadowStyle,
              color: isDueActive ? '#ef4444' : '#ffffff',
            }}
            className="text-xs font-semibold truncate block text-center"
          >
            {meta.dueDate || 'Not set'}
          </span>
        </div>

        {/* Metric 3: Live Balance (Centered) */}
        <div className="text-center space-y-0.5">
          <span 
            style={textShadowStyle}
            className="text-[9.5px] font-bold uppercase tracking-wider text-slate-300/90 block text-center"
          >
            Live Balance
          </span>
          <span
            style={{
              ...monoStyle,
              ...textShadowStyle,
              color: account.balance < 0 ? '#f87171' : '#ffffff',
            }}
            className="text-xs font-medium truncate block text-center"
          >
            {account.balance < 0
              ? `-$${Math.abs(account.balance).toLocaleString('en-US', { minimumFractionDigits: 2 })}`
              : `$${account.balance.toLocaleString('en-US', { minimumFractionDigits: 2 })}`}
          </span>
        </div>

        {/* Metric 4: Credit Limit (Centered) */}
        <div className="text-center space-y-0.5">
          <span 
            style={textShadowStyle}
            className="text-[9.5px] font-bold uppercase tracking-wider text-slate-300/90 block text-center"
          >
            Credit Limit
          </span>
          <span 
            style={{
              ...monoStyle,
              ...textShadowStyle,
            }}
            className="text-xs font-medium text-white truncate block text-center"
          >
            {meta.creditLimit > 0 ? (
              <>
                ${meta.creditLimit.toLocaleString('en-US')}{' '}
                <span
                  style={{ color: utilization > 30 ? '#ef4444' : '#cbd5e1' }}
                  className="text-[10px] font-normal opacity-90"
                >
                  ({utilization.toFixed(0)}%)
                </span>
              </>
            ) : (
              'Not set'
            )}
          </span>
        </div>

      </div>

      {/* ======================================================== */}
      {/* 3. EMBEDDED SWIPE FUNCTION & PAYABLE CHECKING ACCOUNT    */}
      {/* ======================================================== */}
      <div className="relative z-10 space-y-1.5 pt-1">
        
        {/* Payable Account Info */}
        <div 
          style={textShadowStyle}
          className="flex items-center justify-between text-[10.5px] px-1 text-slate-200"
        >
          <div className="flex items-center space-x-1.5 truncate max-w-[70%]">
            <span className="opacity-75">Pay from:</span>
            <strong className="text-white truncate font-medium">
              {payableAccount ? payableAccount.name : 'Select Checking'}
            </strong>
            {payableAccount && (
              <span className="text-[9.5px] opacity-80 font-mono shrink-0">
                (${Math.max(0, card.projectedPayableBalance ?? payableAccount.balance).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })})
              </span>
            )}
          </div>

          {isInsufficientFunds && payableAccount && (
            <span 
              className="text-red-400 font-bold font-mono text-[10px] shrink-0 bg-red-950/80 px-1.5 py-0.5 rounded border border-red-500/50 animate-pulse"
              title={`Insufficient balance! Shortfall: -$${(card.shortfallAmount ?? 0).toFixed(2)}`}
            >
              ⚠️ (-${(card.shortfallAmount ?? 0).toFixed(0)})
            </span>
          )}
        </div>

        {/* Embedded Swipe Slider */}
        {meta.paymentDue > 0.01 ? (
          <SwipeToPayButton
            card={card}
            onPay={onSwipePay}
            embedded
          />
        ) : (
          <div
            style={{
              backgroundColor: 'rgba(16, 185, 129, 0.25)',
              backdropFilter: 'blur(10px)',
              borderColor: 'rgba(52, 211, 153, 0.4)',
              borderRadius: '9999px',
            }}
            className="w-full py-2 px-3 border text-xs font-semibold text-emerald-300 flex items-center justify-center space-x-1.5 shadow-xs"
          >
            <span>✓</span>
            <span>Card Bill Paid ($0.00 Due)</span>
          </div>
        )}

      </div>
    </div>
  );
};
