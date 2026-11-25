import React, { useState, useRef } from 'react';
import { CardMetadata, CashAccountMetadata } from '../types';

interface BackupPayload {
  version: number;
  exportedAt: string;
  source: string;
  cards: Record<string, CardMetadata>;
  cash: Record<string, CashAccountMetadata>;
}

interface BackupSectionProps {
  cardMetadata: Record<string, CardMetadata>;
  cashMetadata: Record<string, CashAccountMetadata>;
  onRestoreBackup: (cards: Record<string, CardMetadata>, cash: Record<string, CashAccountMetadata>) => Promise<void>;
  showToast: (msg: string, type: 'success' | 'error' | 'info') => void;
}

export const BackupSection: React.FC<BackupSectionProps> = ({
  cardMetadata,
  cashMetadata,
  onRestoreBackup,
  showToast,
}) => {
  const [copied, setCopied] = useState(false);
  const [showPasteModal, setShowPasteModal] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [exportedJson, setExportedJson] = useState('');
  const [modalCopied, setModalCopied] = useState(false);
  const [pastedJson, setPastedJson] = useState('');
  const [pasteError, setPasteError] = useState<string | null>(null);
  const [restoring, setRestoring] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const cardCount = Object.keys(cardMetadata).length;

  const buildBackupPayload = (): BackupPayload => ({
    version: 1,
    exportedAt: new Date().toISOString(),
    source: 'wealthfolio-credit-card-payment-tracker',
    cards: cardMetadata,
    cash: cashMetadata,
  });

  // Safe multi-strategy clipboard copy
  const copyTextToClipboard = async (text: string): Promise<boolean> => {
    // Strategy A: Modern navigator.clipboard API
    if (navigator.clipboard && navigator.clipboard.writeText) {
      try {
        await navigator.clipboard.writeText(text);
        return true;
      } catch (err) {
        console.warn('navigator.clipboard.writeText failed (sandbox permission?), trying fallback:', err);
      }
    }

    // Strategy B: Hidden textarea with document.execCommand('copy')
    try {
      const textarea = document.createElement('textarea');
      textarea.value = text;
      textarea.style.position = 'fixed';
      textarea.style.left = '-9999px';
      textarea.style.top = '0';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.focus();
      textarea.select();
      const successful = document.execCommand('copy');
      document.body.removeChild(textarea);
      return successful;
    } catch (fallbackErr) {
      console.error('execCommand fallback copy failed:', fallbackErr);
      return false;
    }
  };

  // 1. Download Backup as .json file (with deferred revocation & fallbacks)
  const handleDownload = async () => {
    try {
      const payload = buildBackupPayload();
      const jsonStr = JSON.stringify(payload, null, 2);
      const dateStr = new Date().toISOString().split('T')[0];
      const fileName = `credit-card-tracker-backup-${dateStr}.json`;

      // 1. Trigger browser file download (Blob method with deferred revocation)
      let downloaded = false;
      try {
        const blob = new Blob([jsonStr], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = fileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        // Do NOT revoke immediately - revoking synchronously aborts the download!
        setTimeout(() => URL.revokeObjectURL(url), 60000);
        downloaded = true;
      } catch (blobErr) {
        console.warn('Blob download failed, trying data URI fallback:', blobErr);
      }

      // 2. Data URI fallback if Blob failed
      if (!downloaded) {
        try {
          const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(jsonStr);
          const link = document.createElement('a');
          link.href = dataUri;
          link.download = fileName;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          downloaded = true;
        } catch (dataErr) {
          console.warn('Data URI download failed:', dataErr);
        }
      }

      // 3. Automatically copy to clipboard as an instant guarantee
      await copyTextToClipboard(jsonStr);

      // 4. Open the Export Modal so the user can see the file data, copy it, or view it directly
      setExportedJson(jsonStr);
      setShowExportModal(true);
      showToast('Backup download initiated & JSON copied to clipboard!', 'success');
    } catch (err) {
      console.error('Failed to download backup:', err);
      showToast('Could not download file. Opening backup text window...', 'info');
      const payload = buildBackupPayload();
      setExportedJson(JSON.stringify(payload, null, 2));
      setShowExportModal(true);
    }
  };

  // 2. Copy Backup JSON to clipboard
  const handleCopy = async () => {
    try {
      const payload = buildBackupPayload();
      const jsonStr = JSON.stringify(payload, null, 2);
      const ok = await copyTextToClipboard(jsonStr);
      if (ok) {
        setCopied(true);
        showToast('Backup JSON copied to clipboard!', 'success');
        setTimeout(() => setCopied(false), 2500);
      } else {
        setExportedJson(jsonStr);
        setShowExportModal(true);
        showToast('Select & copy the backup JSON from the window.', 'info');
      }
    } catch (err) {
      console.error('Failed to copy JSON:', err);
      showToast('Failed to copy to clipboard', 'error');
    }
  };

  // 3. Process & restore parsed backup
  const processRestore = async (parsed: any) => {
    if (!parsed || typeof parsed !== 'object') {
      throw new Error('Invalid JSON format: expected an object.');
    }

    const cards: Record<string, CardMetadata> = parsed.cards || (parsed.cardMetadata ? parsed.cardMetadata : {});
    const cash: Record<string, CashAccountMetadata> = parsed.cash || (parsed.cashMetadata ? parsed.cashMetadata : {});

    if (Object.keys(cards).length === 0 && Object.keys(cash).length === 0) {
      throw new Error('No valid card or account settings found in backup.');
    }

    setRestoring(true);
    try {
      await onRestoreBackup(cards, cash);
      showToast(`Restored settings for ${Object.keys(cards).length} cards & ${Object.keys(cash).length} accounts!`, 'success');
      setShowPasteModal(false);
      setPastedJson('');
      setPasteError(null);
    } catch (err: any) {
      console.error('Failed to restore backup:', err);
      showToast(err.message || 'Failed to restore backup data', 'error');
    } finally {
      setRestoring(false);
    }
  };

  // 4. Handle file upload restore
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const text = evt.target?.result as string;
        const parsed = JSON.parse(text);
        await processRestore(parsed);
      } catch (err: any) {
        console.error('File parse error:', err);
        showToast(err.message || 'Invalid JSON backup file', 'error');
      } finally {
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      }
    };
    reader.readAsText(file);
  };

  // 5. Handle pasted JSON restore
  const handlePasteRestore = async () => {
    setPasteError(null);
    if (!pastedJson.trim()) {
      setPasteError('Please paste your backup JSON text.');
      return;
    }
    try {
      const parsed = JSON.parse(pastedJson.trim());
      await processRestore(parsed);
    } catch (err: any) {
      setPasteError(err.message || 'Invalid JSON format');
    }
  };

  const cardStyle = {
    backgroundColor: 'var(--card)',
    color: 'var(--card-foreground)',
    borderRadius: 'var(--card-radius, 1rem)',
    borderColor: 'var(--card-border, var(--border))',
    boxShadow: 'var(--card-shadow, none)',
  };

  const buttonSecondaryStyle = {
    backgroundColor: 'var(--secondary)',
    color: 'var(--secondary-foreground)',
    borderColor: 'var(--border)',
    borderRadius: 'var(--button-radius, 9999px)',
  };

  return (
    <div 
      style={cardStyle}
      className="p-6 border space-y-4"
    >
      <div 
        style={{ borderColor: 'var(--border)' }}
        className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-5 border-b"
      >
        <div>
          <div className="flex items-center space-x-2">
            <span className="text-xl">💾</span>
            <h3 className="text-base font-semibold" style={{ color: 'var(--foreground)' }}>
              Data Backup & Disaster Recovery
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
              {cardCount} card{cardCount !== 1 ? 's' : ''} configured
            </span>
          </div>
          <p 
            style={{ color: 'var(--muted-foreground)' }}
            className="text-xs mt-1.5 max-w-2xl leading-relaxed font-normal"
          >
            Your card settings (due dates, statement payment dues, credit limits, links, APRs, and filter exclusions) 
            are stored in Wealthfolio database. Export a backup anytime so you can instantly restore your data even if 
            the add-on is uninstalled, wiped, or moved to another device.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Download JSON Button */}
          <button
            type="button"
            onClick={handleDownload}
            style={{
              backgroundColor: 'var(--primary)',
              color: 'var(--primary-foreground)',
              borderRadius: 'var(--button-radius, 9999px)',
            }}
            className="px-4 py-2 text-xs font-semibold shadow hover:opacity-90 active:scale-95 transition flex items-center space-x-1.5 cursor-pointer"
          >
            <span>⬇️</span>
            <span>Download Backup</span>
          </button>

          {/* Copy JSON Button */}
          <button
            type="button"
            onClick={handleCopy}
            style={buttonSecondaryStyle}
            className="px-4 py-2 text-xs font-semibold border active:scale-95 transition flex items-center space-x-1.5 cursor-pointer hover:bg-[var(--accent)] hover:text-[var(--accent-foreground)]"
          >
            <span>{copied ? '✓' : '📋'}</span>
            <span>{copied ? 'Copied!' : 'Copy JSON'}</span>
          </button>

          {/* Restore file picker (hidden input) */}
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileUpload}
            accept=".json,application/json"
            className="hidden"
          />

          {/* Import File Button */}
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            style={buttonSecondaryStyle}
            className="px-4 py-2 text-xs font-semibold border active:scale-95 transition flex items-center space-x-1.5 cursor-pointer hover:bg-[var(--accent)] hover:text-[var(--accent-foreground)]"
          >
            <span>📂</span>
            <span>Import File</span>
          </button>

          {/* Paste JSON Button */}
          <button
            type="button"
            onClick={() => {
              setShowPasteModal(true);
              setPasteError(null);
            }}
            style={buttonSecondaryStyle}
            className="px-4 py-2 text-xs font-semibold border active:scale-95 transition flex items-center space-x-1.5 cursor-pointer hover:bg-[var(--accent)] hover:text-[var(--accent-foreground)]"
          >
            <span>📝</span>
            <span>Paste JSON</span>
          </button>
        </div>
      </div>

      {/* Persistence Info Banner */}
      <div 
        style={{ color: 'var(--muted-foreground)' }}
        className="flex items-start space-x-2 text-xs leading-normal"
      >
        <span style={{ color: 'var(--success)' }} className="font-bold">ℹ️ Note:</span>
        <span>
          When updating or reinstalling this add-on over an existing install, Wealthfolio <strong>retains your data automatically</strong>. 
          Only if you explicitly click &ldquo;Uninstall&rdquo; in Wealthfolio Add-on settings will data be cleared. Use this backup feature before uninstalling.
        </span>
      </div>

      {/* Paste Modal */}
      {showPasteModal && (
        <div 
          style={{ backgroundColor: 'rgba(0,0,0,0.7)' }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-xs"
        >
          <div 
            style={{
              backgroundColor: 'var(--card)',
              color: 'var(--card-foreground)',
              boxShadow: 'var(--overlay-shadow, 0 25px 50px -12px rgba(0,0,0,0.5))',
              borderRadius: 'var(--dialog-radius, 1.25rem)',
              borderColor: 'var(--border)',
              fontFamily: 'var(--font-sans, Inter, ui-sans-serif, system-ui, sans-serif)',
            }}
            className="w-full max-w-lg p-6 border space-y-4 shadow-2xl"
          >
            <div 
              style={{ borderColor: 'var(--border)' }}
              className="flex items-center justify-between pb-3 border-b"
            >
              <h4 className="text-sm font-bold flex items-center space-x-2" style={{ color: 'var(--foreground)' }}>
                <span>📝</span>
                <span>Restore Backup from JSON</span>
              </h4>
              <button
                type="button"
                onClick={() => setShowPasteModal(false)}
                style={{ color: 'var(--muted-foreground)' }}
                className="hover:text-[var(--foreground)] text-lg p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <p className="text-xs" style={{ color: 'var(--muted-foreground)' }}>
              Paste the exported JSON backup contents below to restore all card payment settings, credit limits, and preferences:
            </p>

            <textarea
              rows={8}
              value={pastedJson}
              onChange={e => {
                setPastedJson(e.target.value);
                setPasteError(null);
              }}
              placeholder='{"version": 1, "cards": { ... }, "cash": { ... }}'
              style={{
                backgroundColor: 'var(--input-bg, var(--background))',
                color: 'var(--foreground)',
                borderColor: 'var(--input, var(--border))',
                borderRadius: 'var(--control-radius, 0.75rem)',
                fontFamily: 'var(--font-mono, "JetBrains Mono", ui-monospace, monospace)',
              }}
              className="w-full p-3 text-xs border focus:border-[var(--ring)] focus:outline-none transition resize-none"
            />

            {pasteError && (
              <div 
                style={{
                  backgroundColor: 'var(--destructive-subtle)',
                  borderColor: 'var(--destructive-subtle-border)',
                  color: 'var(--destructive-subtle-foreground, var(--destructive))',
                  borderRadius: 'var(--control-radius, 0.5rem)',
                }}
                className="p-2.5 border text-xs font-medium"
              >
                ⚠️ {pasteError}
              </div>
            )}

            <div 
              style={{ borderColor: 'var(--border)' }}
              className="flex items-center justify-end space-x-3 pt-3 border-t"
            >
              <button
                type="button"
                onClick={() => setShowPasteModal(false)}
                disabled={restoring}
                style={buttonSecondaryStyle}
                className="px-4 py-2 text-xs font-semibold border transition cursor-pointer hover:bg-[var(--accent)] hover:text-[var(--accent-foreground)]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handlePasteRestore}
                disabled={restoring}
                style={{
                  backgroundColor: 'var(--primary)',
                  color: 'var(--primary-foreground)',
                  borderRadius: 'var(--button-radius, 9999px)',
                  cursor: restoring ? 'wait' : 'pointer',
                }}
                className="px-6 py-2 text-xs font-bold shadow hover:opacity-90 active:scale-95 transition flex items-center space-x-1.5 cursor-pointer"
              >
                {restoring && <span className="inline-block w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin"></span>}
                <span>{restoring ? 'Restoring...' : 'Restore Configuration'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Export Modal */}
      {showExportModal && (
        <div 
          style={{ backgroundColor: 'rgba(0,0,0,0.7)' }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-xs"
        >
          <div 
            style={{
              backgroundColor: 'var(--card)',
              color: 'var(--card-foreground)',
              boxShadow: 'var(--overlay-shadow, 0 25px 50px -12px rgba(0,0,0,0.5))',
              borderRadius: 'var(--dialog-radius, 1.25rem)',
              borderColor: 'var(--border)',
              fontFamily: 'var(--font-sans, Inter, ui-sans-serif, system-ui, sans-serif)',
            }}
            className="w-full max-w-lg p-6 border space-y-4 shadow-2xl"
          >
            <div 
              style={{ borderColor: 'var(--border)' }}
              className="flex items-center justify-between pb-3 border-b"
            >
              <h4 className="text-sm font-bold flex items-center space-x-2" style={{ color: 'var(--foreground)' }}>
                <span>💾</span>
                <span>Exported Backup Data</span>
              </h4>
              <button
                type="button"
                onClick={() => setShowExportModal(false)}
                style={{ color: 'var(--muted-foreground)' }}
                className="hover:text-[var(--foreground)] text-lg p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <p className="text-xs" style={{ color: 'var(--muted-foreground)' }}>
              A file download was initiated. If your browser or webview blocks direct file saving, your backup has also been copied to your clipboard, and the full JSON is shown below:
            </p>

            <textarea
              rows={8}
              readOnly
              value={exportedJson}
              onClick={e => (e.target as HTMLTextAreaElement).select()}
              style={{
                backgroundColor: 'var(--input-bg, var(--background))',
                color: 'var(--foreground)',
                borderColor: 'var(--input, var(--border))',
                borderRadius: 'var(--control-radius, 0.75rem)',
                fontFamily: 'var(--font-mono, "JetBrains Mono", ui-monospace, monospace)',
              }}
              className="w-full p-3 text-xs border focus:border-[var(--ring)] focus:outline-none transition resize-none cursor-text select-all"
            />

            <div 
              style={{ borderColor: 'var(--border)' }}
              className="flex items-center justify-between pt-3 border-t"
            >
              <button
                type="button"
                onClick={async () => {
                  const ok = await copyTextToClipboard(exportedJson);
                  if (ok) {
                    setModalCopied(true);
                    showToast('Copied to clipboard!', 'success');
                    setTimeout(() => setModalCopied(false), 2000);
                  }
                }}
                style={buttonSecondaryStyle}
                className="px-4 py-2 text-xs font-semibold border transition cursor-pointer hover:bg-[var(--accent)] hover:text-[var(--accent-foreground)] flex items-center space-x-1.5"
              >
                <span>{modalCopied ? '✓' : '📋'}</span>
                <span>{modalCopied ? 'Copied to Clipboard!' : 'Copy to Clipboard'}</span>
              </button>

              <button
                type="button"
                onClick={() => setShowExportModal(false)}
                style={{
                  backgroundColor: 'var(--primary)',
                  color: 'var(--primary-foreground)',
                  borderRadius: 'var(--button-radius, 9999px)',
                  minWidth: '80px',
                  height: '38px',
                }}
                className="px-5 text-xs font-bold shadow hover:opacity-90 active:scale-95 transition cursor-pointer flex items-center justify-center"
              >
                OK
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
