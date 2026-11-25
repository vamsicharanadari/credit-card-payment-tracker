import React, { useState, useRef, useEffect, useCallback } from 'react';
import { EnrichedCreditCard } from '../types';

interface SwipeToPayButtonProps {
  card: EnrichedCreditCard;
  onPay: (card: EnrichedCreditCard) => void;
  disabled?: boolean;
  embedded?: boolean;
}

export const SwipeToPayButton: React.FC<SwipeToPayButtonProps> = ({
  card,
  onPay,
  disabled = false,
  embedded = false,
}) => {
  const [dragX, setDragX] = useState(0);
  const [isDragging, setIsDragging] = useState(false);

  const trackRef = useRef<HTMLDivElement>(null);
  const startXRef = useRef<number>(0);
  const currentXRef = useRef<number>(0);

  const KNOB_WIDTH = embedded ? 40 : 44;
  const PADDING = 3;

  const getPayableName = () => {
    if (card.payableAccount) {
      return card.payableAccount.name;
    }
    return 'Select Checking Account';
  };

  const getPayableBalance = () => {
    if (card.payableAccount) {
      return `$${card.payableAccount.balance.toLocaleString('en-US', { minimumFractionDigits: 2 })}`;
    }
    return '';
  };

  const getCardName = () => {
    return card.account.name;
  };

  const getPaymentDue = () => {
    return `$${card.meta.paymentDue.toLocaleString('en-US', { minimumFractionDigits: 2 })}`;
  };

  const handleDragStart = (clientX: number) => {
    if (disabled) return;
    setIsDragging(true);
    startXRef.current = clientX - currentXRef.current;
  };

  const handleDragMove = useCallback((clientX: number) => {
    if (!isDragging || !trackRef.current) return;

    const trackWidth = trackRef.current.clientWidth;
    const maxDrag = Math.max(0, trackWidth - KNOB_WIDTH - PADDING * 2);

    let nextX = clientX - startXRef.current;
    if (nextX < 0) nextX = 0;
    if (nextX > maxDrag) nextX = maxDrag;

    currentXRef.current = nextX;
    setDragX(nextX);

    // If dragged >= 90% of the way, trigger confirmation popup
    if (maxDrag > 0 && nextX >= maxDrag * 0.90) {
      triggerPayment();
    }
  }, [isDragging]);

  const handleDragEnd = useCallback(() => {
    if (!isDragging) return;
    setIsDragging(false);

    if (!trackRef.current) return;
    const trackWidth = trackRef.current.clientWidth;
    const maxDrag = Math.max(0, trackWidth - KNOB_WIDTH - PADDING * 2);

    // If not reached completion threshold, spring back to 0
    if (currentXRef.current < maxDrag * 0.90) {
      currentXRef.current = 0;
      setDragX(0);
    }
  }, [isDragging]);

  const triggerPayment = () => {
    setIsDragging(false);

    // Lock to right edge momentarily for visual confirmation
    if (trackRef.current) {
      const maxDrag = Math.max(0, trackRef.current.clientWidth - KNOB_WIDTH - PADDING * 2);
      currentXRef.current = maxDrag;
      setDragX(maxDrag);
    }

    // Open the confirmation dialog popup with Cancel and OK
    onPay(card);

    // Return knob smoothly to starting position so it is ready if user cancels or views again
    setTimeout(() => {
      currentXRef.current = 0;
      setDragX(0);
    }, 400);
  };

  // Global mouse event listeners while dragging
  useEffect(() => {
    const onMouseMove = (e: MouseEvent) => {
      handleDragMove(e.clientX);
    };
    const onMouseUp = () => {
      handleDragEnd();
    };

    if (isDragging) {
      window.addEventListener('mousemove', onMouseMove);
      window.addEventListener('mouseup', onMouseUp);
    }
    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };
  }, [isDragging, handleDragMove, handleDragEnd]);

  // Touch event listeners for mobile devices
  const onTouchStart = (e: React.TouchEvent) => {
    if (e.touches[0]) {
      handleDragStart(e.touches[0].clientX);
    }
  };

  const onTouchMove = (e: React.TouchEvent) => {
    if (e.touches[0]) {
      handleDragMove(e.touches[0].clientX);
    }
  };

  const onTouchEnd = () => {
    handleDragEnd();
  };

  const trackWidth = trackRef.current?.clientWidth || 300;
  const maxDrag = Math.max(1, trackWidth - KNOB_WIDTH - PADDING * 2);
  const dragRatio = Math.min(1, dragX / maxDrag);

  return (
    <div className="w-full select-none space-y-1.5">
      {/* External Top Context Row (only if NOT embedded in card) */}
      {!embedded && (
        <div 
          style={{ color: 'var(--muted-foreground)' }}
          className="flex flex-wrap items-center justify-between text-xs px-2 gap-2 font-medium"
        >
          <div className="flex items-center space-x-1.5 truncate max-w-[50%]">
            <span>🏦 From:</span>
            <span style={{ color: 'var(--foreground)' }} className="font-bold truncate">
              {getPayableName()}
            </span>
            {getPayableBalance() && (
              <span className="opacity-75 font-mono text-[11px] shrink-0">
                ({getPayableBalance()})
              </span>
            )}
          </div>

          <div className="flex items-center space-x-1.5 truncate max-w-[50%] justify-end">
            <span>💳 To:</span>
            <span style={{ color: 'var(--foreground)' }} className="font-bold truncate">
              {getCardName()}
            </span>
            <span className="font-bold font-mono text-[11px] shrink-0" style={{ color: 'var(--primary)' }}>
              ({getPaymentDue()})
            </span>
          </div>
        </div>
      )}

      {/* Slider Track */}
      <div
        ref={trackRef}
        style={{
          backgroundColor: embedded ? 'rgba(0, 0, 0, 0.50)' : 'var(--muted)',
          backdropFilter: embedded ? 'blur(12px)' : undefined,
          WebkitBackdropFilter: embedded ? 'blur(12px)' : undefined,
          borderColor: isDragging 
            ? 'rgba(16, 185, 129, 0.7)' 
            : embedded 
            ? 'rgba(255, 255, 255, 0.16)' 
            : 'var(--border)',
          borderRadius: '9999px',
          height: embedded ? '46px' : '52px',
          boxShadow: embedded ? 'inset 0 2px 4px rgba(0, 0, 0, 0.4)' : undefined,
        }}
        className="relative flex items-center p-1 border overflow-hidden transition-colors shadow-inner"
      >
        {/* Progress Background Fill with emerald gradient */}
        <div
          style={{
            width: `${Math.max(KNOB_WIDTH, dragX + KNOB_WIDTH + PADDING)}px`,
            background: 'linear-gradient(90deg, rgba(16, 185, 129, 0.3) 0%, rgba(16, 185, 129, 0.8) 100%)',
            borderRadius: '9999px',
          }}
          className="absolute left-0 top-0 bottom-0 pointer-events-none transition-[width] duration-75"
        />

        {/* Center Track Prompt: Fades out as user drags so text NEVER collides! */}
        <div 
          style={{
            opacity: Math.max(0, 1 - dragRatio * 2.2),
            color: embedded ? '#cbd5e1' : 'var(--muted-foreground)',
          }}
          className="absolute inset-0 flex items-center justify-center text-[10px] font-bold tracking-wider uppercase pointer-events-none transition-opacity"
        >
          <span className="flex items-center space-x-1.5 drop-shadow-sm">
            <span>Slide to Pay {getPaymentDue()}</span>
            <span className="text-xs tracking-widest text-emerald-400 animate-pulse">›››</span>
          </span>
        </div>

        {/* Draggable Knob with Bill Symbol */}
        <div
          onMouseDown={(e) => handleDragStart(e.clientX)}
          onTouchStart={onTouchStart}
          onTouchMove={onTouchMove}
          onTouchEnd={onTouchEnd}
          style={{
            transform: `translateX(${dragX}px)`,
            width: `${KNOB_WIDTH}px`,
            height: `${KNOB_WIDTH}px`,
            backgroundColor: isDragging
              ? '#10b981'
              : embedded
              ? 'rgba(255, 255, 255, 0.95)'
              : 'var(--card)',
            color: isDragging
              ? '#ffffff'
              : '#0f172a',
            borderColor: embedded ? 'rgba(255, 255, 255, 0.3)' : 'var(--border)',
            borderRadius: '9999px',
            zIndex: 10,
            cursor: isDragging ? 'grabbing' : 'grab',
            boxShadow: isDragging 
              ? '0 6px 16px rgba(0,0,0,0.5), 0 0 0 2px #10b981'
              : '0 3px 8px rgba(0,0,0,0.3)',
            transition: isDragging ? 'none' : 'transform 0.28s cubic-bezier(0.2, 0.9, 0.3, 1)',
          }}
          className="flex items-center justify-center border shrink-0 active:scale-105 select-none"
          title="Drag right to confirm and pay"
        >
          <svg 
            className={`${embedded ? 'w-5 h-5' : 'w-6 h-6'} text-current`} 
            viewBox="0 0 24 24" 
            fill="none" 
            stroke="currentColor" 
            strokeWidth="1.75" 
            strokeLinecap="round" 
            strokeLinejoin="round"
          >
            <rect x="2" y="6" width="20" height="12" rx="2" />
            <circle cx="12" cy="12" r="3" />
            <path d="M6 12h.01M18 12h.01" />
          </svg>
        </div>
      </div>
    </div>
  );
};
