import React, { useState } from 'react';
import { EnrichedCreditCard, WealthfolioAccount } from '../types';

interface MarkPaidModalProps {
  card: EnrichedCreditCard | null;
  cashAccounts: WealthfolioAccount[];
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (cardId: string, payFromCheckingId: string, amount: number, paymentDate: string) => Promise<void>;
}

export const MarkPaidModal: React.FC<MarkPaidModalProps> = ({
  card,
  cashAccounts,
  isOpen,
  onClose,
  onConfirm,
}) => {
  if (!isOpen || !card) return null;

  const [amount, setAmount] = useState<number>(
    card.meta.paymentDue > 0 ? card.meta.paymentDue : Math.abs(card.account.balance)
  );
  const [payFromId, setPayFromId] = useState<string>(
    card.meta.payableAccountId || (cashAccounts[0]?.id ?? '')
  );
  const [paymentDate, setPaymentDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [submitting, setSubmitting] = useState(false);

  const selectedCashAccount = cashAccounts.find(c => c.id === payFromId);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!payFromId || amount <= 0) return;

    setSubmitting(true);
    try {
      await onConfirm(card.account.id, payFromId, amount, paymentDate);
      onClose();
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  const inputStyle = {
    backgroundColor: 'var(--input-bg, var(--background))',
    color: 'var(--foreground)',
    borderColor: 'var(--input, var(--border))',
    borderRadius: 'var(--control-radius, 0.75rem)',
  };

  const monoStyle = {
    fontFamily: 'var(--font-mono, "JetBrains Mono", ui-monospace, monospace)',
    fontVariantNumeric: 'tabular-nums',
  };

  return (
    <div 
      style={{ backgroundColor: 'rgba(0, 0, 0, 0.7)' }}
      className="fixed inset-0 z-50 backdrop-blur-xs flex items-center justify-center p-4"
    >
      <div 
        style={{
          backgroundColor: 'var(--card)',
          color: 'var(--card-foreground)',
          boxShadow: 'var(--overlay-shadow, 0 25px 50px -12px rgba(0,0,0,0.5))',
          borderRadius: 'var(--dialog-radius, 1.25rem)',
          borderColor: 'var(--card-border, var(--border))',
          fontFamily: 'var(--font-sans, Inter, ui-sans-serif, system-ui, sans-serif)',
        }}
        className="max-w-md w-full p-6 border space-y-4 shadow-2xl"
      >
        
        {/* Header */}
        <div 
          style={{ borderColor: 'var(--border)' }}
          className="flex items-center justify-between pb-3 border-b"
        >
          <div>
            <h3 className="text-lg font-bold tracking-tight" style={{ color: 'var(--card-foreground)' }}>
              Confirm Bill Payment
            </h3>
            <p className="text-xs mt-0.5" style={{ color: 'var(--muted-foreground)' }}>
              Card: <strong style={{ color: 'var(--foreground)' }}>{card.account.name}</strong>
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{ color: 'var(--muted-foreground)' }}
            className="hover:text-[var(--card-foreground)] text-lg p-1 transition cursor-pointer"
          >
            ✕
          </button>
        </div>

        {/* Transaction Summary Banner */}
        <div 
          style={{
            backgroundColor: 'var(--muted)',
            borderColor: 'var(--border)',
            borderRadius: 'var(--control-radius, 0.75rem)',
          }}
          className="p-3 border text-xs space-y-2"
        >
          <div className="font-semibold text-xs flex items-center space-x-1.5" style={{ color: 'var(--foreground)' }}>
            <span>💳</span>
            <span>This transaction will be executed in Wealthfolio:</span>
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs pt-1">
            <div 
              style={{
                backgroundColor: 'var(--card)',
                borderColor: 'var(--border)',
                borderRadius: 'var(--control-radius, 0.5rem)',
              }}
              className="p-2 border"
            >
              <span className="text-[10px] block" style={{ color: 'var(--muted-foreground)' }}>From Account:</span>
              <span className="font-semibold truncate block" style={{ color: 'var(--foreground)' }}>
                {selectedCashAccount ? selectedCashAccount.name : 'Select Checking'}
              </span>
            </div>
            <div 
              style={{
                backgroundColor: 'var(--card)',
                borderColor: 'var(--border)',
                borderRadius: 'var(--control-radius, 0.5rem)',
              }}
              className="p-2 border"
            >
              <span className="text-[10px] block" style={{ color: 'var(--muted-foreground)' }}>To Credit Card:</span>
              <span className="font-semibold truncate block" style={{ color: 'var(--foreground)' }}>
                {card.account.name}
              </span>
            </div>
          </div>
        </div>

        <div className="space-y-4 text-sm">
          {/* Amount to Pay */}
          <div>
            <label className="block text-xs font-medium mb-1" style={{ color: 'var(--muted-foreground)' }}>
              Payment Amount
            </label>
            <div 
              style={{
                ...inputStyle,
                height: '42px',
              }}
              className="flex items-center overflow-hidden border focus-within:border-[var(--ring)] transition"
            >
              <span 
                style={{ color: 'var(--muted-foreground)', ...monoStyle }} 
                className="pl-3 pr-1 text-sm font-bold select-none"
              >
                $
              </span>
              <input
                type="number"
                step="0.01"
                min="0.01"
                required
                value={amount}
                onChange={e => setAmount(parseFloat(e.target.value) || 0)}
                style={{ ...monoStyle }}
                className="flex-1 h-full bg-transparent border-0 outline-none pr-3 text-sm font-bold text-[var(--foreground)]"
              />
            </div>
            <div 
              style={{ ...monoStyle, color: 'var(--muted-foreground)' }}
              className="flex justify-between text-xs mt-1"
            >
              <span>Statement Due: ${card.meta.paymentDue.toFixed(2)}</span>
              <span>Live Bal: -${Math.abs(card.account.balance).toFixed(2)}</span>
            </div>
          </div>

          {/* Pay From Account */}
          <div>
            <label className="block text-xs font-medium mb-1" style={{ color: 'var(--muted-foreground)' }}>
              Pay From Checking/Savings Account
            </label>
            <select
              value={payFromId}
              onChange={e => setPayFromId(e.target.value)}
              required
              style={inputStyle}
              className="w-full px-3 py-2 border font-medium focus:border-[var(--ring)] focus:outline-none transition cursor-pointer"
            >
              {cashAccounts.length === 0 ? (
                <option value="">No checking accounts found</option>
              ) : (
                cashAccounts.map(cash => (
                  <option key={cash.id} value={cash.id}>
                    {cash.name} (Balance: ${cash.balance.toLocaleString('en-US', { minimumFractionDigits: 2 })})
                  </option>
                ))
              )}
            </select>
            {selectedCashAccount && selectedCashAccount.balance < amount && (
              <p 
                style={{
                  backgroundColor: 'var(--destructive-subtle)',
                  borderColor: 'var(--destructive-subtle-border)',
                  color: 'var(--destructive-subtle-foreground, var(--destructive))',
                  borderRadius: 'var(--control-radius, 0.5rem)',
                }}
                className="text-xs font-semibold mt-1.5 p-2 border"
              >
                ⚠️ Warning: Selected account has ${selectedCashAccount.balance.toFixed(2)}, which is less than this payment!
              </p>
            )}
          </div>

          {/* Payment Date */}
          <div>
            <label className="block text-xs font-medium mb-1" style={{ color: 'var(--muted-foreground)' }}>
              Payment Date
            </label>
            <input
              type="date"
              required
              value={paymentDate}
              onChange={e => setPaymentDate(e.target.value)}
              style={inputStyle}
              className="w-full px-3 py-2 border focus:border-[var(--ring)] focus:outline-none transition cursor-pointer"
            />
          </div>

          {/* What happens next */}
          <div 
            style={{
              backgroundColor: 'var(--muted)',
              borderColor: 'var(--border)',
              borderRadius: 'var(--control-radius, 0.75rem)',
            }}
            className="p-3 border text-xs space-y-1"
          >
            <p className="font-semibold" style={{ color: 'var(--card-foreground)' }}>What happens next:</p>
            <ul className="list-disc list-inside space-y-0.5 text-[11px]" style={{ color: 'var(--muted-foreground)' }}>
              <li>Logs transfer in Wealthfolio from checking to this card.</li>
              <li>Advances the due date calendar by +1 month.</li>
              <li>Resets Payment Due to $0.00 until next statement.</li>
            </ul>
          </div>

          {/* OK Button */}
          <div 
            style={{ borderColor: 'var(--border)' }}
            className="flex items-center justify-end pt-3 border-t"
          >
            <button
              type="button"
              onClick={handleSubmit}
              disabled={submitting}
              style={{
                backgroundColor: 'var(--primary)',
                color: 'var(--primary-foreground)',
                borderRadius: 'var(--button-radius, 9999px)',
                height: '38px',
                minWidth: '96px',
              }}
              className="px-6 text-xs font-bold shadow-sm transition hover:opacity-90 disabled:opacity-50 cursor-pointer flex items-center justify-center space-x-1.5"
            >
              {submitting ? (
                <>
                  <span className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin"></span>
                  <span>Executing...</span>
                </>
              ) : (
                <span>OK</span>
              )}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
