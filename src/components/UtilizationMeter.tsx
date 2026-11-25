import React from 'react';

interface UtilizationMeterProps {
  overallUtilization: number;
  totalCreditLimit: number;
  totalCreditDebt: number;
}

export const UtilizationMeter: React.FC<UtilizationMeterProps> = ({
  overallUtilization,
  totalCreditLimit,
  totalCreditDebt,
}) => {
  const availableCredit = Math.max(0, totalCreditLimit - totalCreditDebt);
  const clampedUtil = Math.min(100, Math.max(0, overallUtilization));

  const monoStyle = {
    fontFamily: 'var(--font-mono, "JetBrains Mono", ui-monospace, monospace)',
    fontVariantNumeric: 'tabular-nums',
  };

  const getStatusColor = (util: number) => {
    if (util > 30) return 'var(--destructive)';
    if (util > 10) return 'var(--warning)';
    return 'var(--success)';
  };

  const cardStyle = {
    backgroundColor: 'var(--card)',
    color: 'var(--card-foreground)',
    borderRadius: 'var(--card-radius, 1rem)',
    borderColor: 'var(--card-border, var(--border))',
    boxShadow: 'var(--card-shadow, none)',
  };

  return (
    <div 
      style={cardStyle}
      className="p-5 border space-y-4 transition-colors"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="font-semibold text-base tracking-tight" style={{ color: 'var(--card-foreground)' }}>
            Overall Credit Utilization
          </h3>
        </div>
        <div className="text-right">
          <span 
            style={{ ...monoStyle, color: getStatusColor(overallUtilization) }}
            className="text-base font-bold"
          >
            {overallUtilization.toFixed(1)}%
          </span>
          <span 
            style={{ color: 'var(--muted-foreground)' }}
            className="text-[10px] block font-medium"
          >
            {overallUtilization > 30 ? '⚠️ High (>30%)' : overallUtilization > 10 ? 'Fair (10-30%)' : 'Excellent (<10%)'}
          </span>
        </div>
      </div>

      {/* Progress Bar Track */}
      <div 
        style={{
          backgroundColor: 'var(--muted)',
          borderColor: 'var(--border)',
          borderRadius: 'var(--button-radius, 9999px)',
        }}
        className="w-full h-3 overflow-hidden border"
      >
        <div
          style={{
            width: `${clampedUtil}%`,
            backgroundColor: getStatusColor(overallUtilization),
            borderRadius: 'var(--button-radius, 9999px)',
          }}
          className="h-full transition-all duration-500"
        />
      </div>

      {/* Stats footer */}
      <div className="grid grid-cols-3 gap-3 pt-1 text-center text-xs">
        <div 
          style={{
            backgroundColor: 'var(--muted)',
            borderColor: 'var(--border)',
            borderRadius: 'var(--control-radius, 0.75rem)',
          }}
          className="p-2.5 border"
        >
          <span style={{ color: 'var(--muted-foreground)' }} className="block text-[11px]">Total Credit Line</span>
          <span 
            style={{ ...monoStyle, color: 'var(--card-foreground)' }}
            className="font-bold text-sm"
          >
            ${totalCreditLimit.toLocaleString('en-US')}
          </span>
        </div>
        <div 
          style={{
            backgroundColor: 'var(--muted)',
            borderColor: 'var(--border)',
            borderRadius: 'var(--control-radius, 0.75rem)',
          }}
          className="p-2.5 border"
        >
          <span style={{ color: 'var(--muted-foreground)' }} className="block text-[11px]">Total Debt Used</span>
          <span 
            style={{ ...monoStyle, color: 'var(--destructive)' }}
            className="font-bold text-sm"
          >
            -${totalCreditDebt.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
        </div>
        <div 
          style={{
            backgroundColor: 'var(--muted)',
            borderColor: 'var(--border)',
            borderRadius: 'var(--control-radius, 0.75rem)',
          }}
          className="p-2.5 border"
        >
          <span style={{ color: 'var(--muted-foreground)' }} className="block text-[11px]">Available Credit</span>
          <span 
            style={{ ...monoStyle, color: 'var(--success)' }}
            className="font-bold text-sm"
          >
            ${availableCredit.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
        </div>
      </div>
    </div>
  );
};
