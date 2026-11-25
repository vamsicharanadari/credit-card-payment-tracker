import { WealthfolioAccount, AddonContext } from '../types';

export class WealthfolioService {
  private ctx?: AddonContext;

  constructor(ctx?: AddonContext) {
    this.ctx = ctx;
  }

  async fetchAccounts(): Promise<WealthfolioAccount[]> {
    if (!this.ctx?.api?.accounts) {
      console.warn('[CreditTracker] Wealthfolio accounts API not available on ctx.api');
      return [];
    }

    try {
      const rawAccounts = await this.ctx.api.accounts.getAll();
      console.log('[CreditTracker] Raw accounts fetched:', rawAccounts);

      if (!Array.isArray(rawAccounts)) {
        return [];
      }

      // Fetch latest valuations to get accurate account balances if available
      const valuationsMap = new Map<string, number>();
      if (this.ctx?.api?.portfolio?.getLatestValuations && rawAccounts.length > 0) {
        try {
          const accountIds = rawAccounts.map((a: any) => a.id);
          const valuations = await this.ctx.api.portfolio.getLatestValuations(accountIds);
          console.log('[CreditTracker] Valuations fetched:', valuations);

          if (Array.isArray(valuations)) {
            for (const v of valuations) {
              const val = v.cashBalance !== undefined && v.cashBalance !== null
                ? Number(v.cashBalance)
                : Number(v.totalValue ?? 0);
              valuationsMap.set(v.accountId, val);
            }
          }
        } catch (valErr) {
          console.warn('[CreditTracker] Failed to load portfolio valuations:', valErr);
        }
      }

      return rawAccounts.map((acc: any) => {
        const valBalance = valuationsMap.get(acc.id);
        const resolvedBalance = valBalance !== undefined 
          ? valBalance 
          : (typeof acc.balance === 'number' ? acc.balance : 0);

        return {
          id: acc.id,
          name: acc.name || 'Unnamed Account',
          accountType: acc.accountType || acc.account_type || acc.type,
          type: acc.accountType || acc.account_type || acc.type,
          group: acc.group,
          currency: acc.currency || 'USD',
          balance: resolvedBalance,
          isDefault: Boolean(acc.isDefault),
          isActive: acc.isActive !== undefined ? Boolean(acc.isActive) : true,
          isArchived: Boolean(acc.isArchived),
          accountNumber: acc.accountNumber,
        };
      });
    } catch (err) {
      console.error('[CreditTracker] Failed to fetch accounts from Wealthfolio API:', err);
      return [];
    }
  }

  async recordTransferPayment(
    fromCheckingAccountId: string,
    toCreditCardAccountId: string,
    amount: number,
    paymentDate: string
  ): Promise<boolean> {
    if (!this.ctx?.api?.activities) {
      console.warn('Wealthfolio activities API not available, simulating transfer.');
      return true;
    }

    try {
      // Create transfer activity in Wealthfolio:
      // Transfer Out from Checking Account
      await this.ctx.api.activities.create({
        accountId: fromCheckingAccountId,
        activityType: 'TRANSFER_OUT',
        activityDate: paymentDate,
        amount: Math.abs(amount),
        currency: 'USD',
        comment: 'Credit Card Bill Payment',
      });

      // Transfer In to Credit Card Account
      await this.ctx.api.activities.create({
        accountId: toCreditCardAccountId,
        activityType: 'TRANSFER_IN',
        activityDate: paymentDate,
        amount: Math.abs(amount),
        currency: 'USD',
        comment: 'Credit Card Bill Payment Received',
      });

      return true;
    } catch (err) {
      console.error('Failed to create transfer activity in Wealthfolio:', err);
      throw err;
    }
  }

  showToast(message: string, type: 'success' | 'error' | 'info' = 'info'): void {
    if (this.ctx?.api?.toast) {
      if (type === 'success') this.ctx.api.toast.success(message);
      else if (type === 'error') this.ctx.api.toast.error(message);
      else this.ctx.api.toast.info(message);
    } else {
      console.log(`[Toast ${type.toUpperCase()}]: ${message}`);
    }
  }
}
