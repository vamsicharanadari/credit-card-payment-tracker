import React, { useState } from 'react';
import { EnrichedCreditCard } from '../types';
import { EmbeddedCreditCard } from './EmbeddedCreditCard';

interface BillsRadarProps {
  activeBills: EnrichedCreditCard[];
  paidBills: EnrichedCreditCard[];
  allCards: EnrichedCreditCard[];
  onOpenEditModal: (card: EnrichedCreditCard) => void;
  onOpenPayModal: (card: EnrichedCreditCard) => void;
  onSwipePay?: (card: EnrichedCreditCard) => Promise<void> | void;
}

export const BillsRadar: React.FC<BillsRadarProps> = ({
  activeBills,
  paidBills,
  allCards,
  onOpenEditModal,
  onOpenPayModal,
  onSwipePay,
}) => {
  // Default: only bills due
  const [filterMode, setFilterMode] = useState<'due' | 'all' | 'paid'>('due');

  const combinedCards = allCards || [];

  const displayedCards = filterMode === 'due'
    ? activeBills
    : filterMode === 'paid'
    ? paidBills
    : combinedCards;

  const monoStyle = {
    fontFamily: 'var(--font-mono, "JetBrains Mono", ui-monospace, monospace)',
    fontVariantNumeric: 'tabular-nums',
  };

  const cardContainerStyle = {
    backgroundColor: 'var(--card)',
    color: 'var(--card-foreground)',
    borderRadius: 'var(--card-radius, 1rem)',
    borderColor: 'var(--card-border, var(--border))',
    boxShadow: 'var(--card-shadow, none)',
  };

  const handlePayAction = async (card: EnrichedCreditCard) => {
    if (onSwipePay) {
      await onSwipePay(card);
    } else {
      onOpenPayModal(card);
    }
  };

  return (
    <div 
      style={cardContainerStyle}
      className="p-5 border space-y-5 transition-colors"
    >
      {/* Title & Filter Header */}
      <div 
        style={{ borderColor: 'var(--border)' }}
        className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b"
      >
        <div>
          <h3 className="font-semibold text-base tracking-tight" style={{ color: 'var(--card-foreground)' }}>
            Upcoming Bills & Payment Radar
          </h3>
        </div>

        {/* View mode toggle */}
        <div 
          style={{
            backgroundColor: 'var(--secondary)',
            borderColor: 'var(--border)',
            borderRadius: 'var(--button-radius, 9999px)',
          }}
          className="flex items-center p-0.5 border text-xs font-medium"
        >
          <button
            type="button"
            onClick={() => setFilterMode('due')}
            style={{
              backgroundColor: filterMode === 'due' ? 'var(--primary)' : 'transparent',
              color: filterMode === 'due' ? 'var(--primary-foreground)' : 'var(--muted-foreground)',
              borderRadius: 'var(--button-radius, 9999px)',
            }}
            className="px-3.5 py-1 font-semibold transition cursor-pointer hover:opacity-90"
          >
            Bills Due ({activeBills.length})
          </button>
          <button
            type="button"
            onClick={() => setFilterMode('all')}
            style={{
              backgroundColor: filterMode === 'all' ? 'var(--primary)' : 'transparent',
              color: filterMode === 'all' ? 'var(--primary-foreground)' : 'var(--muted-foreground)',
              borderRadius: 'var(--button-radius, 9999px)',
            }}
            className="px-3.5 py-1 font-semibold transition cursor-pointer hover:opacity-90"
          >
            All Cards ({combinedCards.length})
          </button>
          <button
            type="button"
            onClick={() => setFilterMode('paid')}
            style={{
              backgroundColor: filterMode === 'paid' ? 'var(--primary)' : 'transparent',
              color: filterMode === 'paid' ? 'var(--primary-foreground)' : 'var(--muted-foreground)',
              borderRadius: 'var(--button-radius, 9999px)',
            }}
            className="px-3.5 py-1 font-semibold transition cursor-pointer hover:opacity-90"
          >
            Paid / $0 ({paidBills.length})
          </button>
        </div>
      </div>

      {/* BILLS GRID: Responsive Grid of Uniform, Fixed-Size Embedded Credit Cards */}
      <div>
        {displayedCards.length === 0 ? (
          <div className="py-12 text-center space-y-2" style={{ color: 'var(--muted-foreground)' }}>
            <span className="text-3xl block">
              {filterMode === 'due' ? '🎉' : '💳'}
            </span>
            <p className="text-sm font-medium">
              {filterMode === 'due' 
                ? 'All caught up! No credit cards with pending payment dues.'
                : filterMode === 'paid'
                ? 'No cards currently marked as paid.'
                : 'No credit card accounts found in Wealthfolio.'}
            </p>
            {filterMode === 'due' && combinedCards.length > 0 && (
              <button
                type="button"
                onClick={() => setFilterMode('all')}
                style={{
                  backgroundColor: 'var(--secondary)',
                  color: 'var(--secondary-foreground)',
                  borderColor: 'var(--border)',
                  borderRadius: 'var(--button-radius, 9999px)',
                }}
                className="text-xs px-4 py-2 border transition font-medium cursor-pointer hover:bg-[var(--accent)] hover:text-[var(--accent-foreground)]"
              >
                Select "All Cards" ({combinedCards.length}) to view & update dates →
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 justify-items-center">
            {displayedCards.map((card) => (
              <EmbeddedCreditCard
                key={card.account.id}
                card={card}
                onOpenEditModal={onOpenEditModal}
                onSwipePay={handlePayAction}
                monoStyle={monoStyle}
              />
            ))}
          </div>
        )}
      </div>

    </div>
  );
};
