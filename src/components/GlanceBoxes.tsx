import React, { useState, useRef, useEffect } from 'react';
import { EnrichedCashAccount, EnrichedCreditCard } from '../types';

interface GlanceBoxesProps {
  cashAccounts: EnrichedCashAccount[];
  activeCashAccounts: EnrichedCashAccount[];
  totalCashBalance: number;
  toggleCashExclusion: (id: string) => Promise<void> | void;
  setCashAccountsVisibility?: (updates: Record<string, boolean>) => Promise<void> | void;

  creditCards: EnrichedCreditCard[];
  activeCreditCards?: EnrichedCreditCard[];
  topActiveCreditCards?: EnrichedCreditCard[];
  topNonExcludedCreditCards?: EnrichedCreditCard[];
  totalCreditBalance: number;
  netLiquidPosition: number;
  toggleCardExclusion: (id: string) => Promise<void> | void;
  setCardAccountsVisibility?: (updates: Record<string, boolean>) => Promise<void> | void;
}

export const GlanceBoxes: React.FC<GlanceBoxesProps> = ({
  cashAccounts,
  activeCashAccounts,
  totalCashBalance,
  toggleCashExclusion,
  setCashAccountsVisibility,
  creditCards,
  activeCreditCards,
  totalCreditBalance,
  netLiquidPosition,
  toggleCardExclusion,
  setCardAccountsVisibility,
}) => {
  const [showCashFilter, setShowCashFilter] = useState(false);
  const [showCardFilter, setShowCardFilter] = useState(false);
  const [cashSearch, setCashSearch] = useState('');
  const [cardSearch, setCardSearch] = useState('');

  const cashDropdownRef = useRef<HTMLDivElement>(null);
  const cardDropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (cashDropdownRef.current && !cashDropdownRef.current.contains(e.target as Node)) {
        setShowCashFilter(false);
      }
      if (cardDropdownRef.current && !cardDropdownRef.current.contains(e.target as Node)) {
        setShowCardFilter(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const formatCurrency = (val: number, isCreditCard = false) => {
    if (isCreditCard) {
      if (Math.abs(val) < 0.009) return '$0.00';
      return `-$${Math.abs(val).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    }
    return `$${val.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const displayedCards = activeCreditCards || creditCards.filter(c => !c.meta.isExcludedFromGlance);

  // Filtered lists inside dropdowns for quick search
  const filteredCashInDropdown = cashAccounts.filter(c =>
    c.account.name.toLowerCase().includes(cashSearch.toLowerCase())
  );

  const filteredCardsInDropdown = creditCards.filter(c =>
    c.account.name.toLowerCase().includes(cardSearch.toLowerCase())
  );

  // Quick preset actions for cash
  const handleCashPreset = (type: 'gte001' | 'all' | 'none') => {
    if (!setCashAccountsVisibility) {
      cashAccounts.forEach(c => {
        const shouldExclude = type === 'gte001' ? c.account.balance < 0.01 : type === 'none';
        if (c.isExcluded !== shouldExclude) toggleCashExclusion(c.account.id);
      });
      return;
    }
    const updates: Record<string, boolean> = {};
    cashAccounts.forEach(c => {
      if (type === 'gte001') updates[c.account.id] = c.account.balance < 0.01;
      else if (type === 'all') updates[c.account.id] = false;
      else updates[c.account.id] = true;
    });
    setCashAccountsVisibility(updates);
  };

  // Quick preset actions for cards
  const handleCardPreset = (type: 'gte001' | 'all' | 'none') => {
    if (!setCardAccountsVisibility) {
      creditCards.forEach(c => {
        const shouldExclude = type === 'gte001' ? c.meta.paymentDue < 0.01 : type === 'none';
        if (c.meta.isExcludedFromGlance !== shouldExclude) toggleCardExclusion(c.account.id);
      });
      return;
    }
    const updates: Record<string, boolean> = {};
    creditCards.forEach(c => {
      if (type === 'gte001') updates[c.account.id] = c.meta.paymentDue < 0.01;
      else if (type === 'all') updates[c.account.id] = false;
      else updates[c.account.id] = true;
    });
    setCardAccountsVisibility(updates);
  };

  const cardStyle = {
    backgroundColor: 'var(--card)',
    color: 'var(--card-foreground)',
    borderRadius: 'var(--card-radius, 1rem)',
    borderColor: 'var(--card-border, var(--border))',
    boxShadow: 'var(--card-shadow, none)',
  };

  const popoverStyle = {
    backgroundColor: 'var(--popover, var(--card))',
    color: 'var(--popover-foreground, var(--foreground))',
    borderRadius: 'var(--dialog-radius, 1rem)',
    borderColor: 'var(--border)',
    boxShadow: 'var(--popup-shadow, 0 10px 25px -5px rgba(0,0,0,0.5))',
  };

  const monoStyle = {
    fontFamily: 'var(--font-mono, "JetBrains Mono", ui-monospace, monospace)',
    fontVariantNumeric: 'tabular-nums',
  };

  return (
    <div className="space-y-4">
      {/* Top 2 Side-by-Side Boxes */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        
        {/* LEFT BOX: Cash & Checking Accounts */}
        <div 
          style={cardStyle}
          className="p-5 border flex flex-col justify-between transition-colors relative"
        >
          <div>
            <div 
              style={{ borderColor: 'var(--border)' }}
              className="flex items-center justify-between pb-3 border-b"
            >
              <div>
                <h3 className="font-semibold text-base tracking-tight" style={{ color: 'var(--card-foreground)' }}>
                  Cash & Checking Accounts
                </h3>
              </div>

              {/* Filter Button & Dropdown Anchor */}
              <div className="relative" ref={cashDropdownRef}>
                <button
                  type="button"
                  onClick={() => {
                    setShowCashFilter(!showCashFilter);
                    setShowCardFilter(false);
                  }}
                  style={{
                    backgroundColor: showCashFilter ? 'var(--primary)' : 'var(--secondary)',
                    color: showCashFilter ? 'var(--primary-foreground)' : 'var(--secondary-foreground)',
                    borderColor: showCashFilter ? 'var(--primary)' : 'var(--border)',
                    borderRadius: 'var(--button-radius, 9999px)',
                  }}
                  className="text-xs px-3 py-1.5 border font-medium transition flex items-center space-x-1.5 cursor-pointer hover:opacity-90"
                >
                  <span>Filter ({activeCashAccounts.length}/{cashAccounts.length})</span>
                  <span className="text-[10px]">{showCashFilter ? '▲' : '▼'}</span>
                </button>

                {/* Filter Dropdown Popover */}
                {showCashFilter && (
                  <div 
                    style={popoverStyle}
                    className="absolute right-0 top-full mt-2 w-80 sm:w-96 border p-4 z-50 space-y-3 shadow-xl"
                  >
                    {/* Header */}
                    <div 
                      style={{ borderColor: 'var(--border)' }}
                      className="flex items-center justify-between pb-2 border-b"
                    >
                      <div>
                        <h4 className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--foreground)' }}>
                          Filter Cash Accounts
                        </h4>
                        <p className="text-[11px]" style={{ color: 'var(--muted-foreground)' }}>
                          {activeCashAccounts.length} of {cashAccounts.length} accounts showing in box
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setShowCashFilter(false)}
                        style={{ color: 'var(--muted-foreground)' }}
                        className="p-1 rounded-full text-xs transition hover:text-[var(--foreground)] cursor-pointer"
                      >
                        ✕
                      </button>
                    </div>

                    {/* Presets */}
                    <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                      <button
                        type="button"
                        onClick={() => handleCashPreset('gte001')}
                        style={{
                          backgroundColor: 'var(--secondary)',
                          color: 'var(--secondary-foreground)',
                          borderColor: 'var(--border)',
                          borderRadius: 'var(--button-radius, 9999px)',
                        }}
                        className="text-[11px] px-2.5 py-1 border font-medium transition cursor-pointer hover:bg-[var(--accent)] hover:text-[var(--accent-foreground)]"
                      >
                        ≥ $0.01 Only (Default)
                      </button>
                      <button
                        type="button"
                        onClick={() => handleCashPreset('all')}
                        style={{
                          backgroundColor: 'var(--secondary)',
                          color: 'var(--secondary-foreground)',
                          borderColor: 'var(--border)',
                          borderRadius: 'var(--button-radius, 9999px)',
                        }}
                        className="text-[11px] px-2.5 py-1 border font-medium transition cursor-pointer hover:bg-[var(--accent)] hover:text-[var(--accent-foreground)]"
                      >
                        Select All
                      </button>
                      <button
                        type="button"
                        onClick={() => handleCashPreset('none')}
                        style={{
                          backgroundColor: 'var(--secondary)',
                          color: 'var(--secondary-foreground)',
                          borderColor: 'var(--border)',
                          borderRadius: 'var(--button-radius, 9999px)',
                        }}
                        className="text-[11px] px-2.5 py-1 border font-medium transition cursor-pointer hover:bg-[var(--accent)] hover:text-[var(--accent-foreground)]"
                      >
                        Clear All
                      </button>
                    </div>

                    {/* Search if more than 5 accounts */}
                    {cashAccounts.length > 5 && (
                      <input
                        type="text"
                        value={cashSearch}
                        onChange={e => setCashSearch(e.target.value)}
                        placeholder="Search checking/savings..."
                        style={{
                          backgroundColor: 'var(--input-bg, var(--background))',
                          color: 'var(--foreground)',
                          borderColor: 'var(--input, var(--border))',
                          borderRadius: 'var(--control-radius, 0.5rem)',
                        }}
                        className="w-full text-xs px-2.5 py-1.5 border focus:border-[var(--ring)] focus:outline-none transition"
                      />
                    )}

                    {/* Checkbox List */}
                    <div className="max-h-56 overflow-y-auto space-y-1 pr-1">
                      {filteredCashInDropdown.length === 0 ? (
                        <p className="text-xs italic py-2" style={{ color: 'var(--muted-foreground)' }}>
                          No accounts match search.
                        </p>
                      ) : (
                        filteredCashInDropdown.map(({ account, isExcluded }) => (
                          <label
                            key={account.id}
                            style={{
                              backgroundColor: !isExcluded ? 'var(--accent)' : 'transparent',
                              borderRadius: 'var(--control-radius, 0.5rem)',
                            }}
                            className="flex items-center justify-between p-2 text-xs transition cursor-pointer hover:bg-[var(--accent)]"
                          >
                            <div className="flex items-center space-x-2.5 truncate">
                              <input
                                type="checkbox"
                                checked={!isExcluded}
                                onChange={() => toggleCashExclusion(account.id)}
                                className="rounded accent-[var(--primary)] cursor-pointer"
                              />
                              <span 
                                style={{ color: !isExcluded ? 'var(--foreground)' : 'var(--muted-foreground)' }}
                                className="font-medium truncate"
                              >
                                {account.name}
                              </span>
                            </div>
                            <span 
                              style={{ ...monoStyle, color: 'var(--muted-foreground)' }}
                              className="font-semibold text-[11px] shrink-0"
                            >
                              {formatCurrency(account.balance)}
                            </span>
                          </label>
                        ))
                      )}
                    </div>

                    {/* Footer */}
                    <div 
                      style={{ borderColor: 'var(--border)' }}
                      className="pt-2 border-t flex items-center justify-between"
                    >
                      <span className="text-[11px]" style={{ color: 'var(--muted-foreground)' }}>
                        {activeCashAccounts.length} of {cashAccounts.length} selected
                      </span>
                      <button
                        type="button"
                        onClick={() => setShowCashFilter(false)}
                        style={{
                          backgroundColor: 'var(--primary)',
                          color: 'var(--primary-foreground)',
                          borderRadius: 'var(--button-radius, 9999px)',
                        }}
                        className="px-4 py-1.5 text-xs font-semibold transition hover:opacity-90 cursor-pointer shadow-sm"
                      >
                        ✓ Save & Apply Filter
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="mt-3 mb-2 flex items-center justify-between">
              <span 
                style={{ color: 'var(--muted-foreground)' }}
                className="text-xs font-semibold uppercase tracking-wider"
              >
                Total Active Cash
              </span>
              <span 
                style={{ ...monoStyle, color: 'var(--success)' }}
                className="text-lg font-bold tracking-tight"
              >
                {formatCurrency(totalCashBalance)}
              </span>
            </div>

            {/* Account List - ONLY SHOW WHAT USER SELECTED IN FILTER */}
            <div className="mt-3 space-y-1.5 max-h-52 overflow-y-auto pr-1">
              {cashAccounts.length === 0 ? (
                <p style={{ color: 'var(--muted-foreground)' }} className="text-sm italic py-2">
                  No checking or savings accounts found in Wealthfolio.
                </p>
              ) : activeCashAccounts.length === 0 ? (
                <div style={{ color: 'var(--muted-foreground)' }} className="py-6 text-center text-xs space-y-1.5">
                  <p>All accounts are currently hidden.</p>
                  <button
                    type="button"
                    onClick={() => setShowCashFilter(true)}
                    style={{ color: 'var(--foreground)' }}
                    className="hover:underline font-semibold cursor-pointer"
                  >
                    Click Filter ({activeCashAccounts.length}/{cashAccounts.length}) to select accounts to show →
                  </button>
                </div>
              ) : (
                activeCashAccounts.map(({ account }) => (
                  <div
                    key={account.id}
                    style={{
                      backgroundColor: 'var(--muted)',
                      borderColor: 'var(--border)',
                      borderRadius: 'var(--control-radius, 0.75rem)',
                    }}
                    className="flex items-center justify-between p-2.5 border transition opacity-90 hover:opacity-100"
                  >
                    <div className="flex items-center space-x-2 truncate">
                      <span className="text-sm font-medium truncate" style={{ color: 'var(--foreground)' }}>
                        {account.name}
                      </span>
                    </div>
                    <div className="flex items-center space-x-3 flex-shrink-0">
                      <span 
                        style={{ ...monoStyle, color: 'var(--foreground)' }}
                        className="text-sm font-semibold"
                      >
                        {formatCurrency(account.balance)}
                      </span>
                      <button
                        type="button"
                        onClick={() => toggleCashExclusion(account.id)}
                        title="Hide from left box"
                        style={{ color: 'var(--muted-foreground)' }}
                        className="hover:text-[var(--foreground)] p-0.5 transition text-xs font-semibold cursor-pointer"
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* RIGHT BOX: Credit Card Accounts */}
        <div 
          style={cardStyle}
          className="p-5 border flex flex-col justify-between transition-colors relative"
        >
          <div>
            <div 
              style={{ borderColor: 'var(--border)' }}
              className="flex items-center justify-between pb-3 border-b"
            >
              <div>
                <h3 className="font-semibold text-base tracking-tight" style={{ color: 'var(--card-foreground)' }}>
                  Credit Cards (Payment Due)
                </h3>
              </div>

              {/* Filter Button & Dropdown Anchor */}
              <div className="relative" ref={cardDropdownRef}>
                <button
                  type="button"
                  onClick={() => {
                    setShowCardFilter(!showCardFilter);
                    setShowCashFilter(false);
                  }}
                  style={{
                    backgroundColor: showCardFilter ? 'var(--primary)' : 'var(--secondary)',
                    color: showCardFilter ? 'var(--primary-foreground)' : 'var(--secondary-foreground)',
                    borderColor: showCardFilter ? 'var(--primary)' : 'var(--border)',
                    borderRadius: 'var(--button-radius, 9999px)',
                  }}
                  className="text-xs px-3 py-1.5 border font-medium transition flex items-center space-x-1.5 cursor-pointer hover:opacity-90"
                >
                  <span>Filter ({displayedCards.length}/{creditCards.length})</span>
                  <span className="text-[10px]">{showCardFilter ? '▲' : '▼'}</span>
                </button>

                {/* Filter Dropdown Popover */}
                {showCardFilter && (
                  <div 
                    style={popoverStyle}
                    className="absolute right-0 top-full mt-2 w-80 sm:w-96 border p-4 z-50 space-y-3 shadow-xl"
                  >
                    {/* Header */}
                    <div 
                      style={{ borderColor: 'var(--border)' }}
                      className="flex items-center justify-between pb-2 border-b"
                    >
                      <div>
                        <h4 className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--foreground)' }}>
                          Filter Credit Cards
                        </h4>
                        <p className="text-[11px]" style={{ color: 'var(--muted-foreground)' }}>
                          {displayedCards.length} of {creditCards.length} cards showing in box
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setShowCardFilter(false)}
                        style={{ color: 'var(--muted-foreground)' }}
                        className="p-1 rounded-full text-xs transition hover:text-[var(--foreground)] cursor-pointer"
                      >
                        ✕
                      </button>
                    </div>

                    {/* Presets */}
                    <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                      <button
                        type="button"
                        onClick={() => handleCardPreset('gte001')}
                        style={{
                          backgroundColor: 'var(--secondary)',
                          color: 'var(--secondary-foreground)',
                          borderColor: 'var(--border)',
                          borderRadius: 'var(--button-radius, 9999px)',
                        }}
                        className="text-[11px] px-2.5 py-1 border font-medium transition cursor-pointer hover:bg-[var(--accent)] hover:text-[var(--accent-foreground)]"
                      >
                        Due &gt; $0 Only (Default)
                      </button>
                      <button
                        type="button"
                        onClick={() => handleCardPreset('all')}
                        style={{
                          backgroundColor: 'var(--secondary)',
                          color: 'var(--secondary-foreground)',
                          borderColor: 'var(--border)',
                          borderRadius: 'var(--button-radius, 9999px)',
                        }}
                        className="text-[11px] px-2.5 py-1 border font-medium transition cursor-pointer hover:bg-[var(--accent)] hover:text-[var(--accent-foreground)]"
                      >
                        Select All
                      </button>
                      <button
                        type="button"
                        onClick={() => handleCardPreset('none')}
                        style={{
                          backgroundColor: 'var(--secondary)',
                          color: 'var(--secondary-foreground)',
                          borderColor: 'var(--border)',
                          borderRadius: 'var(--button-radius, 9999px)',
                        }}
                        className="text-[11px] px-2.5 py-1 border font-medium transition cursor-pointer hover:bg-[var(--accent)] hover:text-[var(--accent-foreground)]"
                      >
                        Clear All
                      </button>
                    </div>

                    {/* Search if more than 5 cards */}
                    {creditCards.length > 5 && (
                      <input
                        type="text"
                        value={cardSearch}
                        onChange={e => setCardSearch(e.target.value)}
                        placeholder="Search credit cards..."
                        style={{
                          backgroundColor: 'var(--input-bg, var(--background))',
                          color: 'var(--foreground)',
                          borderColor: 'var(--input, var(--border))',
                          borderRadius: 'var(--control-radius, 0.5rem)',
                        }}
                        className="w-full text-xs px-2.5 py-1.5 border focus:border-[var(--ring)] focus:outline-none transition"
                      />
                    )}

                    {/* Checkbox List */}
                    <div className="max-h-56 overflow-y-auto space-y-1 pr-1">
                      {filteredCardsInDropdown.length === 0 ? (
                        <p className="text-xs italic py-2" style={{ color: 'var(--muted-foreground)' }}>
                          No cards match search.
                        </p>
                      ) : (
                        filteredCardsInDropdown.map(({ account, meta }) => {
                          const isShowing = !meta.isExcludedFromGlance;
                          return (
                            <label
                              key={account.id}
                              style={{
                                backgroundColor: isShowing ? 'var(--accent)' : 'transparent',
                                borderRadius: 'var(--control-radius, 0.5rem)',
                              }}
                              className="flex items-center justify-between p-2 text-xs transition cursor-pointer hover:bg-[var(--accent)]"
                            >
                              <div className="flex items-center space-x-2.5 truncate">
                                <input
                                  type="checkbox"
                                  checked={isShowing}
                                  onChange={() => toggleCardExclusion(account.id)}
                                  className="rounded accent-[var(--primary)] cursor-pointer"
                                />
                                <span 
                                  style={{ color: isShowing ? 'var(--foreground)' : 'var(--muted-foreground)' }}
                                  className="font-medium truncate"
                                >
                                  {account.name}
                                </span>
                              </div>
                              <span 
                                style={{ ...monoStyle, color: 'var(--muted-foreground)' }}
                                className="font-semibold text-[11px] shrink-0"
                              >
                                {formatCurrency(meta.paymentDue || 0, true)}
                              </span>
                            </label>
                          );
                        })
                      )}
                    </div>

                    {/* Footer */}
                    <div 
                      style={{ borderColor: 'var(--border)' }}
                      className="pt-2 border-t flex items-center justify-between"
                    >
                      <span className="text-[11px]" style={{ color: 'var(--muted-foreground)' }}>
                        {displayedCards.length} of {creditCards.length} selected
                      </span>
                      <button
                        type="button"
                        onClick={() => setShowCardFilter(false)}
                        style={{
                          backgroundColor: 'var(--primary)',
                          color: 'var(--primary-foreground)',
                          borderRadius: 'var(--button-radius, 9999px)',
                        }}
                        className="px-4 py-1.5 text-xs font-semibold transition hover:opacity-90 cursor-pointer shadow-sm"
                      >
                        ✓ Save & Apply Filter
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="mt-3 mb-2 flex items-center justify-between">
              <span 
                style={{ color: 'var(--muted-foreground)' }}
                className="text-xs font-semibold uppercase tracking-wider"
              >
                Total Payment Due
              </span>
              <span 
                style={{ ...monoStyle, color: 'var(--destructive)' }}
                className="text-lg font-bold tracking-tight"
              >
                {formatCurrency(totalCreditBalance, true)}
              </span>
            </div>

            {/* Card List - ONLY SHOW WHAT USER SELECTED IN FILTER */}
            <div className="mt-3 space-y-1.5 max-h-52 overflow-y-auto pr-1">
              {creditCards.length === 0 ? (
                <p style={{ color: 'var(--muted-foreground)' }} className="text-sm italic py-2">
                  No credit card accounts found in Wealthfolio.
                </p>
              ) : displayedCards.length === 0 ? (
                <div style={{ color: 'var(--muted-foreground)' }} className="py-6 text-center text-xs space-y-1.5">
                  <p>All credit cards are currently hidden.</p>
                  <button
                    type="button"
                    onClick={() => setShowCardFilter(true)}
                    style={{ color: 'var(--foreground)' }}
                    className="hover:underline font-semibold cursor-pointer"
                  >
                    Click Filter ({displayedCards.length}/{creditCards.length}) to select cards to show →
                  </button>
                </div>
              ) : (
                displayedCards.map((card) => (
                  <div
                    key={card.account.id}
                    style={{
                      backgroundColor: 'var(--muted)',
                      borderColor: 'var(--border)',
                      borderRadius: 'var(--control-radius, 0.75rem)',
                    }}
                    className="flex items-center justify-between p-2.5 border transition opacity-90 hover:opacity-100"
                  >
                    <div className="flex items-center space-x-2 truncate">
                      <span className="text-sm font-medium truncate" style={{ color: 'var(--foreground)' }}>
                        {card.account.name}
                      </span>
                    </div>
                    <div className="flex items-center space-x-3 flex-shrink-0">
                      <span 
                        style={{ ...monoStyle, color: card.meta.paymentDue > 0 ? 'var(--destructive)' : 'var(--muted-foreground)' }}
                        className="text-sm font-semibold"
                      >
                        {formatCurrency(card.meta.paymentDue || 0, true)}
                      </span>
                      <button
                        type="button"
                        onClick={() => toggleCardExclusion(card.account.id)}
                        title="Hide from right box"
                        style={{ color: 'var(--muted-foreground)' }}
                        className="hover:text-[var(--foreground)] p-0.5 transition text-xs font-semibold cursor-pointer"
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

      </div>

      {/* Net Liquid Position Banner */}
      <div 
        style={cardStyle}
        className="p-4 border flex flex-col sm:flex-row items-center justify-between gap-2"
      >
        <div className="flex items-center space-x-2">
          <span className="text-sm font-medium" style={{ color: 'var(--muted-foreground)' }}>
            Net Liquid Position (Active Cash minus Payment Due):
          </span>
          <span 
            style={{
              ...monoStyle,
              color: netLiquidPosition >= 0 ? 'var(--success)' : 'var(--destructive)',
            }}
            className="text-base font-bold"
          >
            {netLiquidPosition >= 0 ? '+' : ''}{formatCurrency(netLiquidPosition)}
          </span>
        </div>
      </div>
    </div>
  );
};
