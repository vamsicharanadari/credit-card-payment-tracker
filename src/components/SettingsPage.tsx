import React from 'react';
import { CardMetadata, CashAccountMetadata, EnrichedCreditCard, WealthfolioAccount } from '../types';
import { BackupSection } from './BackupSection';

interface SettingsPageProps {
  creditCards: EnrichedCreditCard[];
  cashAccounts: WealthfolioAccount[];
  cardMetadata: Record<string, CardMetadata>;
  cashMetadata: Record<string, CashAccountMetadata>;
  onRestoreBackup: (cards: Record<string, CardMetadata>, cash: Record<string, CashAccountMetadata>) => Promise<void>;
  showToast: (msg: string, type: 'success' | 'error' | 'info') => void;
  onOpenEditModal: (card: EnrichedCreditCard) => void;
  onBackToDashboard: () => void;
}

export const SettingsPage: React.FC<SettingsPageProps> = ({
  creditCards,
  cashAccounts,
  cardMetadata,
  cashMetadata,
  onRestoreBackup,
  showToast,
  onOpenEditModal,
  onBackToDashboard,
}) => {
  const configuredCardsCount = Object.values(cardMetadata).filter(m => m.dueDate || m.creditLimit > 0).length;

  const cardStyle = {
    backgroundColor: 'var(--card)',
    color: 'var(--card-foreground)',
    borderRadius: 'var(--card-radius, 1rem)',
    borderColor: 'var(--card-border, var(--border))',
    boxShadow: 'var(--card-shadow, none)',
  };

  const monoStyle = {
    fontFamily: 'var(--font-mono, "JetBrains Mono", ui-monospace, monospace)',
    fontVariantNumeric: 'tabular-nums',
  };

  return (
    <div className="space-y-6">
      {/* Settings Navigation Bar */}
      <div 
        style={{ borderColor: 'var(--border)' }}
        className="flex items-center justify-between pb-4 border-b"
      >
        <div>
          <h2 className="text-xl font-bold tracking-tight flex items-center space-x-2" style={{ color: 'var(--foreground)' }}>
            <span>⚙️</span>
            <span>Add-on Settings & Data Management</span>
          </h2>
          <p className="text-xs sm:text-sm mt-1 font-normal" style={{ color: 'var(--muted-foreground)' }}>
            Configure backup & recovery, due date schedules, credit limits, and payment accounts
          </p>
        </div>

        <button
          type="button"
          onClick={onBackToDashboard}
          style={{
            backgroundColor: 'var(--secondary)',
            color: 'var(--secondary-foreground)',
            borderColor: 'var(--border)',
            borderRadius: 'var(--button-radius, 9999px)',
          }}
          className="flex items-center space-x-1.5 px-4 py-1.5 text-xs font-semibold border transition active:scale-95 cursor-pointer hover:bg-[var(--accent)] hover:text-[var(--accent-foreground)]"
        >
          <span>←</span>
          <span>Back to Dashboard</span>
        </button>
      </div>

      {/* 1. BACKUP & RESTORE SECTION */}
      <BackupSection
        cardMetadata={cardMetadata}
        cashMetadata={cashMetadata}
        onRestoreBackup={onRestoreBackup}
        showToast={showToast}
      />

      {/* 2. CARD CONFIGURATION MANAGER TABLE */}
      <div 
        style={cardStyle}
        className="p-6 border space-y-4"
      >
        <div 
          style={{ borderColor: 'var(--border)' }}
          className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b"
        >
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-lg">💳</span>
              <h3 className="text-base font-semibold" style={{ color: 'var(--foreground)' }}>
                Credit Card Configurations
              </h3>
              <span 
                style={{
                  backgroundColor: 'var(--secondary)',
                  color: 'var(--muted-foreground)',
                  borderColor: 'var(--border)',
                  borderRadius: 'var(--badge-radius, 9999px)',
                }}
                className="text-xs px-2.5 py-0.5 border font-medium"
              >
                {configuredCardsCount} of {creditCards.length} configured
              </span>
            </div>
            <p className="text-xs mt-1" style={{ color: 'var(--muted-foreground)' }}>
              Review and edit due dates, statement payment amounts, credit lines, and payable checking accounts for all cards
            </p>
          </div>
        </div>

        {creditCards.length === 0 ? (
          <div className="py-8 text-center text-xs" style={{ color: 'var(--muted-foreground)' }}>
            No credit card accounts found in Wealthfolio.
          </div>
        ) : (
          <div className="overflow-x-auto mt-2">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr 
                  style={{ borderColor: 'var(--border)', color: 'var(--muted-foreground)' }}
                  className="border-b font-semibold uppercase text-[10px] tracking-wider"
                >
                  <th className="py-2.5 px-3">Card Name</th>
                  <th className="py-2.5 px-3">Due Date</th>
                  <th className="py-2.5 px-3 text-right">Payment Due</th>
                  <th className="py-2.5 px-3 text-right">Credit Line</th>
                  <th className="py-2.5 px-3">Payable Account</th>
                  <th className="py-2.5 px-3 text-right">APR %</th>
                  <th className="py-2.5 px-3 text-center">Action</th>
                </tr>
              </thead>
              <tbody 
                style={{ borderColor: 'var(--border)' }}
                className="divide-y divide-[var(--border)]/60"
              >
                {creditCards.map(card => {
                  const meta = card.meta;
                  const payableAcc = cashAccounts.find(a => a.id === meta.payableAccountId);
                  const isConfigured = Boolean(meta.dueDate || meta.creditLimit > 0);

                  return (
                    <tr 
                      key={card.account.id}
                      className="hover:bg-[var(--accent)]/40 transition group"
                    >
                      <td className="py-3 px-3 font-medium" style={{ color: 'var(--foreground)' }}>
                        <div className="flex items-center space-x-2.5">
                          {meta.imageUrl && (meta.imageUrl.startsWith('data:') || meta.imageUrl.startsWith('blob:')) ? (
                            <img
                              src={meta.imageUrl}
                              alt=""
                              style={{
                                width: '36px',
                                height: '22px',
                                borderRadius: 'var(--control-radius, 0.25rem)',
                                border: '1px solid var(--border)',
                                backgroundColor: 'var(--muted)',
                              }}
                              className="object-contain shrink-0"
                              onError={(e) => {
                                (e.target as HTMLImageElement).style.display = 'none';
                              }}
                            />
                          ) : (
                            <span className="text-sm">💳</span>
                          )}
                          <span>{card.account.name}</span>
                          {!isConfigured && (
                            <span 
                              style={{
                                backgroundColor: 'var(--warning-subtle)',
                                color: 'var(--warning-subtle-foreground, var(--warning))',
                                borderColor: 'var(--warning-subtle-border)',
                                borderRadius: 'var(--badge-radius, 9999px)',
                              }}
                              className="text-[10px] px-2 py-0.2 border font-medium"
                            >
                              Unconfigured
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-3" style={monoStyle}>
                        {meta.dueDate ? (
                          <span className="font-medium" style={{ color: 'var(--foreground)' }}>{meta.dueDate}</span>
                        ) : (
                          <span style={{ color: 'var(--muted-foreground)' }} className="italic opacity-60">Not set</span>
                        )}
                      </td>
                      <td className="py-3 px-3 text-right" style={monoStyle}>
                        {meta.paymentDue > 0 ? (
                          <span className="font-semibold" style={{ color: 'var(--foreground)' }}>
                            ${meta.paymentDue.toFixed(2)}
                          </span>
                        ) : (
                          <span style={{ color: 'var(--success)' }} className="font-semibold">$0.00</span>
                        )}
                      </td>
                      <td className="py-3 px-3 text-right" style={monoStyle}>
                        {meta.creditLimit > 0 ? (
                          <span style={{ color: 'var(--foreground)' }}>
                            ${meta.creditLimit.toLocaleString()}
                          </span>
                        ) : (
                          <span style={{ color: 'var(--muted-foreground)' }} className="italic opacity-60">Not set</span>
                        )}
                      </td>
                      <td className="py-3 px-3">
                        {payableAcc ? (
                          <span style={{ color: 'var(--info)' }} className="font-medium">
                            🏦 {payableAcc.name}
                          </span>
                        ) : (
                          <span style={{ color: 'var(--muted-foreground)' }} className="italic opacity-60">
                            None linked
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-3 text-right" style={monoStyle}>
                        {meta.interestRate !== undefined ? (
                          <span style={{ color: 'var(--foreground)' }}>{meta.interestRate}%</span>
                        ) : (
                          <span style={{ color: 'var(--muted-foreground)' }} className="opacity-60">—</span>
                        )}
                      </td>
                      <td className="py-3 px-3 text-center">
                        <button
                          type="button"
                          onClick={() => onOpenEditModal(card)}
                          style={{
                            backgroundColor: 'var(--secondary)',
                            color: 'var(--secondary-foreground)',
                            borderColor: 'var(--border)',
                            borderRadius: 'var(--button-radius, 9999px)',
                          }}
                          className="px-3.5 py-1 text-xs font-semibold border transition active:scale-95 cursor-pointer hover:bg-[var(--accent)] hover:text-[var(--accent-foreground)]"
                        >
                          ✏️ Edit
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Return to Dashboard Footer */}
      <div className="flex justify-end pt-2">
        <button
          type="button"
          onClick={onBackToDashboard}
          style={{
            backgroundColor: 'var(--secondary)',
            color: 'var(--secondary-foreground)',
            borderColor: 'var(--border)',
            borderRadius: 'var(--button-radius, 9999px)',
          }}
          className="px-6 py-2 text-xs font-bold border shadow hover:bg-[var(--accent)] hover:text-[var(--accent-foreground)] active:scale-95 transition flex items-center space-x-1.5 cursor-pointer"
        >
          <span>← Return to Tracker Dashboard</span>
        </button>
      </div>
    </div>
  );
};
