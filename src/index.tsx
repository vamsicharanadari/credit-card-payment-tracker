import React, { useState } from 'react';
import { AddonContext, EnrichedCreditCard } from './types';
import { useTrackerData } from './hooks/useTrackerData';
import { GlanceBoxes } from './components/GlanceBoxes';
import { BillsRadar } from './components/BillsRadar';
import { MarkPaidModal } from './components/MarkPaidModal';
import { CardMetaModal } from './components/CardMetaModal';
import { UtilizationMeter } from './components/UtilizationMeter';
import { SettingsPage } from './components/SettingsPage';

let addonCtx: AddonContext | undefined;

export const CreditTrackerApp: React.FC<{ ctx?: AddonContext; initialView?: 'dashboard' | 'settings' }> = ({
  ctx,
  initialView = 'dashboard',
}) => {
  const activeCtx = ctx || addonCtx;
  const [activeView, setActiveView] = useState<'dashboard' | 'settings'>(initialView);

  const {
    loading,
    refreshing,
    refresh,
    cashAccounts,
    activeCashAccounts,
    totalCashBalance,
    toggleCashExclusion,
    setCashAccountsVisibility,
    creditCards,
    activeCreditCards,
    topActiveCreditCards,
    topNonExcludedCreditCards,
    totalCreditBalance,
    netLiquidPosition,
    toggleCardExclusion,
    setCardAccountsVisibility,
    updateCardMetadata,
    activeBills,
    paidBills,
    overallUtilization,
    totalCreditLimit,
    markAsPaid,
    restoreFullBackup,
    rawCashAccounts,
    cardMetadata,
    cashMetadata,
    showToast,
  } = useTrackerData(activeCtx);

  const [editingCard, setEditingCard] = useState<EnrichedCreditCard | null>(null);
  const [payingCard, setPayingCard] = useState<EnrichedCreditCard | null>(null);

  const handleSwipePay = (card: EnrichedCreditCard) => {
    setPayingCard(card);
  };

  if (loading) {
    return (
      <div 
        style={{
          fontFamily: "'JetBrains Mono', var(--font-mono, monospace)",
          color: 'var(--foreground)',
        }}
        className="min-h-[400px] flex flex-col items-center justify-center p-8 space-y-3"
      >
        <div 
          style={{ borderColor: 'var(--primary)', borderTopColor: 'transparent' }}
          className="w-8 h-8 border-2 rounded-full animate-spin"
        ></div>
        <p style={{ color: 'var(--muted-foreground)' }} className="text-sm">
          Loading your accounts from Wealthfolio...
        </p>
      </div>
    );
  }

  const totalCreditDebt = Math.abs(totalCreditBalance);

  return (
    <div 
      data-cct-root="true"
      style={{
        fontFamily: "'JetBrains Mono', var(--font-mono, monospace)",
        color: 'var(--foreground)',
      }}
      className="max-w-7xl mx-auto p-4 sm:p-6 space-y-6 antialiased cct-app-root"
    >
      {/* Enforce JetBrains Mono across EVERY child element, modal, button, input, dropdown */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@300;400;500;600;700;800&display=swap');
        .cct-app-root, .cct-app-root *, [data-cct-root], [data-cct-root] * {
          font-family: 'JetBrains Mono', var(--font-mono, ui-monospace, monospace) !important;
        }
      `}</style>
      
      {/* Title & Top Navigation Bar */}
      <div 
        style={{ borderColor: 'var(--border)' }}
        className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b"
      >
        <div>
          <h1 
            style={{ color: 'var(--foreground)' }}
            className="text-2xl font-bold tracking-tight"
          >
            Credit Card & Payment Command Center
          </h1>
          <p 
            style={{ color: 'var(--muted-foreground)' }}
            className="text-sm mt-1"
          >
            Track and manage your upcoming bills, credit utilization, and payments
          </p>
        </div>

        {/* View Switcher & Action Controls */}
        <div className="flex items-center space-x-2">
          {/* Dashboard / Settings Tab Navigation */}
          <div 
            style={{
              backgroundColor: 'var(--secondary)',
              borderColor: 'var(--border)',
              borderRadius: 'var(--button-radius, 9999px)',
            }}
            className="flex items-center p-0.5 border"
          >
            <button
              type="button"
              onClick={() => setActiveView('dashboard')}
              style={{
                backgroundColor: activeView === 'dashboard' ? 'var(--primary)' : 'transparent',
                color: activeView === 'dashboard' ? 'var(--primary-foreground)' : 'var(--muted-foreground)',
                borderRadius: 'var(--button-radius, 9999px)',
                height: '32px',
              }}
              className="px-3.5 text-xs font-semibold transition cursor-pointer flex items-center space-x-1.5 hover:opacity-90"
            >
              <svg className="w-3.5 h-3.5 opacity-85" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="7" height="7" rx="1.5" />
                <rect x="14" y="3" width="7" height="7" rx="1.5" />
                <rect x="14" y="14" width="7" height="7" rx="1.5" />
                <rect x="3" y="14" width="7" height="7" rx="1.5" />
              </svg>
              <span>Dashboard</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveView('settings')}
              style={{
                backgroundColor: activeView === 'settings' ? 'var(--primary)' : 'transparent',
                color: activeView === 'settings' ? 'var(--primary-foreground)' : 'var(--muted-foreground)',
                borderRadius: 'var(--button-radius, 9999px)',
                height: '32px',
              }}
              className="px-3.5 text-xs font-semibold transition cursor-pointer flex items-center space-x-1.5 hover:opacity-90"
            >
              <svg className="w-3.5 h-3.5 opacity-85" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
                <circle cx="12" cy="12" r="3" />
              </svg>
              <span>Settings & Backup</span>
            </button>
          </div>

          {/* Sync Button */}
          <button
            type="button"
            onClick={refresh}
            disabled={refreshing}
            style={{
              backgroundColor: 'var(--secondary)',
              color: 'var(--secondary-foreground)',
              borderColor: 'var(--border)',
              borderRadius: 'var(--button-radius, 9999px)',
              height: '38px',
            }}
            className="flex items-center space-x-1.5 px-3.5 text-xs font-semibold border transition disabled:opacity-50 hover:bg-[var(--accent)] hover:text-[var(--accent-foreground)] cursor-pointer"
          >
            <svg className={`w-3.5 h-3.5 opacity-85 ${refreshing ? 'animate-spin' : ''}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
              <path d="M3 3v5h5" />
              <path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16" />
              <path d="M16 21h5v-5" />
            </svg>
            <span>{refreshing ? 'Syncing...' : 'Refresh'}</span>
          </button>
        </div>
      </div>

      {/* VIEW 1: DASHBOARD VIEW */}
      {activeView === 'dashboard' && (
        <>
          {/* 1. TOP AT-A-GLANCE SECTION */}
          <GlanceBoxes
            cashAccounts={cashAccounts}
            activeCashAccounts={activeCashAccounts}
            totalCashBalance={totalCashBalance}
            toggleCashExclusion={toggleCashExclusion}
            setCashAccountsVisibility={setCashAccountsVisibility}
            creditCards={creditCards}
            activeCreditCards={activeCreditCards}
            topActiveCreditCards={topActiveCreditCards}
            topNonExcludedCreditCards={topNonExcludedCreditCards}
            totalCreditBalance={totalCreditBalance}
            netLiquidPosition={netLiquidPosition}
            toggleCardExclusion={toggleCardExclusion}
            setCardAccountsVisibility={setCardAccountsVisibility}
          />

          {/* 2. BILLS RADAR (CHRONOLOGICAL SCHEDULE) */}
          <BillsRadar
            activeBills={activeBills}
            paidBills={paidBills}
            allCards={creditCards}
            onOpenEditModal={(card) => setEditingCard(card)}
            onOpenPayModal={(card) => setPayingCard(card)}
            onSwipePay={handleSwipePay}
          />

          {/* 3. OVERALL CREDIT UTILIZATION METER */}
          <UtilizationMeter
            overallUtilization={overallUtilization}
            totalCreditLimit={totalCreditLimit}
            totalCreditDebt={totalCreditDebt}
          />
        </>
      )}

      {/* VIEW 2: SETTINGS & BACKUP VIEW */}
      {activeView === 'settings' && (
        <SettingsPage
          creditCards={creditCards}
          cashAccounts={rawCashAccounts}
          cardMetadata={cardMetadata}
          cashMetadata={cashMetadata}
          onRestoreBackup={restoreFullBackup}
          showToast={showToast}
          onOpenEditModal={(card) => setEditingCard(card)}
          onBackToDashboard={() => setActiveView('dashboard')}
        />
      )}

      {/* MODALS */}
      <MarkPaidModal
        card={payingCard}
        cashAccounts={rawCashAccounts}
        isOpen={Boolean(payingCard)}
        onClose={() => setPayingCard(null)}
        onConfirm={markAsPaid}
      />

      <CardMetaModal
        card={editingCard}
        cashAccounts={rawCashAccounts}
        isOpen={Boolean(editingCard)}
        onClose={() => setEditingCard(null)}
        onSave={updateCardMetadata}
      />

    </div>
  );
};

// Route wrapper component mounted by Wealthfolio host
const AddonRoute = (props?: any) => {
  const isSettings = props?.location?.pathname?.includes('/settings') || props?.location?.search?.includes('settings');
  const activeCtx = props?.ctx || addonCtx || (typeof window !== 'undefined' ? (window as any).__WF_ADDON_CTX : undefined);
  return <CreditTrackerApp ctx={activeCtx} initialView={isSettings ? 'settings' : 'dashboard'} />;
};

// Official Wealthfolio Add-on enable function
const enable = (ctx: any) => {
  addonCtx = ctx;
  if (typeof window !== 'undefined') {
    (window as any).__WF_ADDON_CTX = ctx;
  }

  if (ctx?.router?.add) {
    ctx.router.add({
      id: 'credit-card-payment-tracker',
      path: '/addons/credit-card-payment-tracker',
      component: AddonRoute,
    });
  }

  if (ctx?.onDisable) {
    ctx.onDisable(() => {
      addonCtx = undefined;
      if (typeof window !== 'undefined') {
        delete (window as any).__WF_ADDON_CTX;
      }
    });
  }
};

export default enable;
