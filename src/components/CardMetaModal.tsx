import React, { useState, useRef } from 'react';
import { EnrichedCreditCard, WealthfolioAccount, CardMetadata } from '../types';

interface CardMetaModalProps {
  card: EnrichedCreditCard | null;
  cashAccounts: WealthfolioAccount[];
  isOpen: boolean;
  onClose: () => void;
  onSave: (metadata: CardMetadata) => Promise<void> | void;
}

export const CardMetaModal: React.FC<CardMetaModalProps> = ({
  card,
  cashAccounts,
  isOpen,
  onClose,
  onSave,
}) => {
  if (!isOpen || !card) return null;

  const [dueDate, setDueDate] = useState(card.meta.dueDate || '');
  const [paymentDue, setPaymentDue] = useState(
    card.meta.paymentDue !== undefined ? String(card.meta.paymentDue) : ''
  );
  const [creditLimit, setCreditLimit] = useState(
    card.meta.creditLimit ? String(card.meta.creditLimit) : ''
  );
  const [payableAccountId, setPayableAccountId] = useState(card.meta.payableAccountId || '');
  const [imageUrl, setImageUrl] = useState(card.meta.imageUrl || '');
  const [interestRate, setInterestRate] = useState(
    card.meta.interestRate !== undefined ? String(card.meta.interestRate) : ''
  );
  const [promoExpirationDate, setPromoExpirationDate] = useState(
    card.meta.promoExpirationDate || ''
  );

  const [saving, setSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const isExternalHttp = imageUrl.trim().startsWith('http://') || imageUrl.trim().startsWith('https://');

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const rawDataUrl = event.target?.result as string;
      // Compress and scale image to max 420px width to keep base64 storage compact and blazing fast
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const maxW = 420;
        const scale = Math.min(1, maxW / img.width);
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          const compressed = canvas.toDataURL('image/jpeg', 0.75);
          setImageUrl(compressed);
        } else {
          setImageUrl(rawDataUrl);
        }
      };
      img.src = rawDataUrl;
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setError(null);
    setSaving(true);

    try {
      const cleanPaymentDue = paymentDue.trim() === '' ? 0 : parseFloat(paymentDue.replace(/[^0-9.-]+/g, ''));
      const cleanCreditLimit = creditLimit.trim() === '' ? 0 : parseFloat(creditLimit.replace(/[^0-9.-]+/g, ''));
      const cleanInterestRate = interestRate.trim() === '' ? undefined : parseFloat(interestRate.replace(/[^0-9.-]+/g, ''));

      const updatedMeta: CardMetadata = {
        accountId: card.account.id,
        dueDate: dueDate.trim(),
        paymentDue: isNaN(cleanPaymentDue) ? 0 : cleanPaymentDue,
        creditLimit: isNaN(cleanCreditLimit) ? 0 : cleanCreditLimit,
        payableAccountId: payableAccountId || undefined,
        imageUrl: imageUrl.trim() || undefined,
        interestRate: cleanInterestRate !== undefined && !isNaN(cleanInterestRate) ? cleanInterestRate : undefined,
        promoExpirationDate: promoExpirationDate.trim() || undefined,
        isConfigured: true,
      };

      console.log('[CreditTracker] Submitting card settings:', updatedMeta);
      await onSave(updatedMeta);
      setSavedSuccess(true);

      // Brief delay so user sees confirmation
      setTimeout(() => {
        onClose();
      }, 350);
    } catch (err) {
      console.error('[CreditTracker] Save card settings error:', err);
      setError('Unable to save settings: ' + (err instanceof Error ? err.message : String(err)));
      setSaving(false);
    }
  };

  const inputStyle: React.CSSProperties = {
    backgroundColor: 'var(--input-bg, var(--background))',
    color: 'var(--foreground)',
    borderColor: 'var(--input, var(--border))',
    borderRadius: 'var(--control-radius, 0.75rem)',
    height: '38px',
    boxSizing: 'border-box',
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
        className="rounded-2xl max-w-lg w-full p-6 border space-y-4 shadow-2xl max-h-[90vh] overflow-y-auto"
      >
        
        {/* Header */}
        <div 
          style={{ borderColor: 'var(--border)' }}
          className="flex items-center justify-between pb-3 border-b"
        >
          <div>
            <h3 className="text-lg font-bold tracking-tight" style={{ color: 'var(--card-foreground)' }}>
              Edit Card Payment Details
            </h3>
            <p className="text-xs mt-0.5" style={{ color: 'var(--muted-foreground)' }}>
              Card: {card.account.name}
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

        {error && (
          <div 
            style={{
              backgroundColor: 'var(--destructive-subtle)',
              borderColor: 'var(--destructive-subtle-border)',
              color: 'var(--destructive-subtle-foreground, var(--destructive))',
              borderRadius: 'var(--control-radius, 0.75rem)',
            }}
            className="p-3 border text-xs flex items-center space-x-2"
          >
            <span>⚠️</span>
            <span>{error}</span>
          </div>
        )}

        <div className="space-y-4 text-sm">
          
          {/* Row 1: Due Date & Statement Payment Due */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="flex items-center h-6 text-xs font-medium mb-1" style={{ color: 'var(--muted-foreground)' }}>
                Payment Due Date
              </label>
              <input
                type="date"
                value={dueDate}
                onChange={e => setDueDate(e.target.value)}
                style={inputStyle}
                className="w-full px-3 border focus:border-[var(--ring)] focus:outline-none transition cursor-pointer"
              />
            </div>

            <div>
              <label className="flex items-center h-6 text-xs font-medium mb-1" style={{ color: 'var(--muted-foreground)' }}>
                Statement Payment Due ($)
              </label>
              <input
                type="text"
                inputMode="decimal"
                value={paymentDue}
                onChange={e => setPaymentDue(e.target.value)}
                style={{ ...inputStyle, ...monoStyle }}
                className="w-full px-3 border font-medium focus:border-[var(--ring)] focus:outline-none transition"
                placeholder="0.00"
              />
            </div>
          </div>

          {/* Row 2: Credit Limit & Payable Account */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="flex items-center h-6 text-xs font-medium mb-1" style={{ color: 'var(--muted-foreground)' }}>
                Credit Limit ($)
              </label>
              <input
                type="text"
                inputMode="decimal"
                value={creditLimit}
                onChange={e => setCreditLimit(e.target.value)}
                style={{ ...inputStyle, ...monoStyle }}
                className="w-full px-3 border font-medium focus:border-[var(--ring)] focus:outline-none transition"
                placeholder="e.g. 15000"
              />
            </div>

            <div>
              <label className="flex items-center h-6 text-xs font-medium mb-1" style={{ color: 'var(--muted-foreground)' }}>
                Payable Checking Account
              </label>
              <select
                value={payableAccountId}
                onChange={e => setPayableAccountId(e.target.value)}
                style={inputStyle}
                className="w-full px-3 border font-medium focus:border-[var(--ring)] focus:outline-none transition cursor-pointer"
              >
                <option value="">-- None / Select Checking --</option>
                {cashAccounts.map(cash => (
                  <option key={cash.id} value={cash.id}>
                    {cash.name} (${cash.balance.toFixed(2)})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Row 3: Card Background Image / Upload */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="flex items-center h-6 text-xs font-medium" style={{ color: 'var(--muted-foreground)' }}>
                Card Background Artwork
              </label>
              {imageUrl && (
                <button
                  type="button"
                  onClick={() => setImageUrl('')}
                  className="text-[11px] text-red-400 hover:underline cursor-pointer"
                >
                  ✕ Remove Image
                </button>
              )}
            </div>

            <div className="flex gap-2 items-center">
              {/* Native label for file upload - 100% reliable in sandboxed iframes */}
              <label
                style={{
                  backgroundColor: 'var(--secondary)',
                  color: 'var(--secondary-foreground)',
                  borderColor: 'var(--border)',
                  borderRadius: 'var(--control-radius, 0.75rem)',
                  height: '38px',
                }}
                className="px-3.5 border text-xs font-semibold shrink-0 hover:opacity-90 transition flex items-center space-x-1.5 cursor-pointer shadow-xs select-none"
              >
                <span>📁</span>
                <span>Choose Image File...</span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileUpload}
                  style={{ display: 'none' }}
                />
              </label>

              {/* Or Paste Data URL */}
              <input
                type="text"
                value={imageUrl.startsWith('data:') ? 'Image uploaded from file (data:image)' : imageUrl}
                onChange={e => setImageUrl(e.target.value)}
                style={inputStyle}
                className="flex-1 px-3 border focus:border-[var(--ring)] focus:outline-none transition text-xs"
                placeholder="Or paste image / data URL"
              />

              {/* Preview Thumbnail (only renders img for CSP-safe data: or blob: URLs) */}
              {imageUrl.trim() && (
                <div 
                  style={{
                    width: '56px',
                    height: '38px',
                    borderRadius: 'var(--control-radius, 0.4rem)',
                    borderColor: 'var(--border)',
                    backgroundColor: 'var(--muted)',
                  }}
                  className="shrink-0 border overflow-hidden flex items-center justify-center p-0.5"
                  title="Card artwork preview"
                >
                  {(imageUrl.trim().startsWith('data:') || imageUrl.trim().startsWith('blob:')) ? (
                    <img
                      src={imageUrl.trim()}
                      alt="Card Preview"
                      className="w-full h-full object-cover rounded"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = 'none';
                      }}
                    />
                  ) : (
                    <span className="text-[9px] text-amber-400 font-bold text-center leading-tight">
                      Web Link
                    </span>
                  )}
                </div>
              )}
            </div>

            {/* CSP Guidance Note if an external http/https URL is entered */}
            {isExternalHttp && (
              <div 
                style={{
                  backgroundColor: 'var(--warning-subtle)',
                  borderColor: 'var(--warning-subtle-border)',
                  color: 'var(--warning-subtle-foreground, var(--warning))',
                  borderRadius: 'var(--control-radius, 0.5rem)',
                }}
                className="p-2 border text-[11px] leading-relaxed mt-1"
              >
                ⚠️ <strong>Wealthfolio Security Restriction:</strong> Wealthfolio blocks external web URLs (<code className="font-mono text-[10px]">img-src data: blob:</code>).
                <br />
                Please right-click the card image on the web, choose <em>"Save image as..."</em> to your computer, and click <strong>"📁 Choose Image File..."</strong> above!
              </div>
            )}
          </div>

          {/* Row 4: Optional Rates & Promotions - Perfectly Aligned */}
          <div 
            style={{
              backgroundColor: 'var(--muted)',
              borderColor: 'var(--border)',
              borderRadius: 'var(--control-radius, 0.75rem)',
            }}
            className="p-3.5 border space-y-3"
          >
            <div className="text-[11px] font-bold uppercase tracking-wider" style={{ color: 'var(--muted-foreground)' }}>
              Optional Rates & Promotions
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-start">
              {/* Optional APR % */}
              <div>
                <label className="flex items-center h-6 text-xs font-medium mb-1" style={{ color: 'var(--muted-foreground)' }}>
                  Interest Rate (APR %) <span className="opacity-70 ml-1">(Optional)</span>
                </label>
                <input
                  type="text"
                  inputMode="decimal"
                  value={interestRate}
                  onChange={e => setInterestRate(e.target.value)}
                  style={{ ...inputStyle, ...monoStyle }}
                  className="w-full px-3 border focus:border-[var(--ring)] focus:outline-none transition"
                  placeholder="e.g. 19.99"
                />
              </div>

              {/* Optional 0% Promo End Date */}
              <div>
                <label className="flex items-center h-6 text-xs font-medium mb-1" style={{ color: 'var(--muted-foreground)' }}>
                  0% Promo Expiration Date <span className="opacity-70 ml-1">(Optional)</span>
                </label>
                <input
                  type="date"
                  value={promoExpirationDate}
                  onChange={e => setPromoExpirationDate(e.target.value)}
                  style={inputStyle}
                  className="w-full px-3 border focus:border-[var(--ring)] focus:outline-none transition cursor-pointer"
                />
              </div>
            </div>
          </div>

          {/* Live balance indicator */}
          <div className="text-xs" style={{ color: 'var(--muted-foreground)' }}>
            Live balance in Wealthfolio: <strong style={{ ...monoStyle, color: 'var(--destructive)' }}>-${Math.abs(card.account.balance).toFixed(2)}</strong> (automatically updated by transactions).
          </div>

          {/* Action Buttons */}
          <div 
            style={{ borderColor: 'var(--border)' }}
            className="flex items-center justify-end space-x-3 pt-3 border-t"
          >
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              style={{
                backgroundColor: 'var(--secondary)',
                color: 'var(--secondary-foreground)',
                borderColor: 'var(--border)',
                borderRadius: 'var(--button-radius, 9999px)',
              }}
              className="px-4 py-2 text-xs font-medium border transition cursor-pointer hover:bg-[var(--accent)] hover:text-[var(--accent-foreground)]"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={saving}
              style={{
                backgroundColor: savedSuccess ? 'var(--success)' : 'var(--primary)',
                color: savedSuccess ? 'var(--success-foreground, #ffffff)' : 'var(--primary-foreground)',
                borderRadius: 'var(--button-radius, 9999px)',
              }}
              className="px-5 py-2 text-xs font-semibold transition cursor-pointer hover:opacity-90 disabled:opacity-50 shadow-sm flex items-center space-x-1.5"
            >
              {saving ? (
                <span>Saving...</span>
              ) : savedSuccess ? (
                <>
                  <span>✓</span>
                  <span>Saved!</span>
                </>
              ) : (
                <span>Save Settings</span>
              )}
            </button>
          </div>

        </div>
      </div>
    </div>
  );
};
