import { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  WealthfolioAccount, 
  CardMetadata, 
  CashAccountMetadata, 
  EnrichedCreditCard, 
  EnrichedCashAccount,
  BillUrgency,
  AddonContext
} from '../types';
import { StorageService } from '../services/storageService';
import { WealthfolioService } from '../services/wealthfolioService';

export function useTrackerData(ctx?: AddonContext) {
  const [accounts, setAccounts] = useState<WealthfolioAccount[]>([]);
  const [cardMetadata, setCardMetadata] = useState<Record<string, CardMetadata>>({});
  const [cashMetadata, setCashMetadata] = useState<Record<string, CashAccountMetadata>>({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const storageService = useMemo(() => new StorageService(ctx?.api?.storage), [ctx]);
  const wealthfolioService = useMemo(() => new WealthfolioService(ctx), [ctx]);

  // Load all accounts and metadata
  const loadData = useCallback(async (isBackground = false) => {
    if (!isBackground) setLoading(true);
    else setRefreshing(true);

    try {
      // Fetch live accounts from Wealthfolio
      const fetchedAccounts = await wealthfolioService.fetchAccounts();
      setAccounts(fetchedAccounts);

      // Load custom metadata from persistent database
      const [storedCards, storedCash] = await Promise.all([
        storageService.getAllCardsMetadata(),
        storageService.getAllCashMetadata()
      ]);

      setCardMetadata(storedCards);
      setCashMetadata(storedCash);
    } catch (err) {
      console.error('Error loading tracker data:', err);
      wealthfolioService.showToast('Failed to load accounts from Wealthfolio', 'error');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [wealthfolioService, storageService]);

  useEffect(() => {
    loadData(false);
  }, [loadData]);

  // Segregate Accounts
  const rawCashAccounts = useMemo(() => {
    return accounts.filter(acc => {
      if (acc.isArchived) return false;
      const type = String(acc.accountType || acc.type || (acc as any).account_type || '').toUpperCase();
      const group = String(acc.group || '').toLowerCase();
      const name = String(acc.name || '').toLowerCase();

      // Check if it's explicitly a liability/credit card
      if (
        type === 'CREDIT_CARD' ||
        type === 'CREDITCARD' ||
        type === 'CREDIT_CARDS' ||
        type.includes('LIABILITY') ||
        group.includes('liability')
      ) {
        return false;
      }

      // Check if it's an investment/crypto
      if (
        type.includes('SECURITIES') ||
        type.includes('CRYPTO') ||
        type.includes('INVEST') ||
        type.includes('BROKERAGE') ||
        type.includes('RETIREMENT') ||
        type.includes('IRA') ||
        type.includes('401K') ||
        group.includes('investment') ||
        group.includes('crypto')
      ) {
        return false;
      }

      // Cash accounts: matches Wealthfolio CASH type, checking/savings keywords
      return (
        type === 'CASH' ||
        type.includes('CHECKING') ||
        type.includes('SAVINGS') ||
        type.includes('DEPOSITORY') ||
        group.includes('cash') ||
        group.includes('checking') ||
        group.includes('savings') ||
        name.includes('checking') ||
        name.includes('savings') ||
        name.includes('cash') ||
        name.includes('bank')
      );
    });
  }, [accounts]);

  const rawCreditCardAccounts = useMemo(() => {
    return accounts.filter(acc => {
      if (acc.isArchived) return false;
      const type = String(acc.accountType || acc.type || (acc as any).account_type || '').toUpperCase().trim();

      // Only display accounts whose account type is strictly credit card
      return type === 'CREDIT_CARD' || type === 'CREDITCARD' || type === 'CREDIT_CARDS';
    });
  }, [accounts]);

  // Enriched Cash Accounts
  const cashAccounts: EnrichedCashAccount[] = useMemo(() => {
    return rawCashAccounts.map(acc => {
      const meta = cashMetadata[acc.id];
      // Default: show cash accounts by default unless explicitly excluded by user
      const isExcluded = meta?.isExcludedFromGlance !== undefined
        ? meta.isExcludedFromGlance
        : false;

      return {
        account: acc,
        isExcluded
      };
    });
  }, [rawCashAccounts, cashMetadata]);

  // Enriched Credit Cards
  const creditCards: EnrichedCreditCard[] = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return rawCreditCardAccounts.map(acc => {
      const storedMeta = cardMetadata[acc.id];
      const liveDebt = Math.abs(acc.balance);
      
      // If paymentDue was never explicitly saved in storage, default it to current active debt
      const defaultPaymentDue = storedMeta?.paymentDue !== undefined
        ? storedMeta.paymentDue
        : (liveDebt > 0 ? liveDebt : 0);

      // Default: show credit cards by default unless explicitly excluded by user
      const isExcluded = storedMeta?.isExcludedFromGlance !== undefined
        ? storedMeta.isExcludedFromGlance
        : false;

      const meta: CardMetadata = {
        accountId: acc.id,
        dueDate: storedMeta?.dueDate || '',
        paymentDue: defaultPaymentDue,
        creditLimit: storedMeta?.creditLimit || 0,
        payableAccountId: storedMeta?.payableAccountId,
        imageUrl: storedMeta?.imageUrl && (storedMeta.imageUrl.startsWith('data:') || storedMeta.imageUrl.startsWith('blob:'))
          ? storedMeta.imageUrl
          : undefined,
        interestRate: storedMeta?.interestRate,
        promoExpirationDate: storedMeta?.promoExpirationDate,
        isExcludedFromGlance: isExcluded,
        isConfigured: Boolean(storedMeta),
      };

      // Calculate days remaining
      let daysRemaining = 999;
      let urgency: BillUrgency = 'later';

      if (meta.dueDate) {
        const dueDateObj = new Date(meta.dueDate + 'T00:00:00');
        const diffTime = dueDateObj.getTime() - today.getTime();
        daysRemaining = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      }

      if (meta.paymentDue <= 0) {
        urgency = 'paid';
      } else if (!meta.dueDate) {
        urgency = 'later';
      } else if (daysRemaining <= 3) {
        urgency = 'critical';
      } else if (daysRemaining <= 7) {
        urgency = 'upcoming';
      } else {
        urgency = 'later';
      }

      // Calculate utilization
      const debtAmount = Math.abs(acc.balance);
      const utilization = meta.creditLimit > 0 ? (debtAmount / meta.creditLimit) * 100 : 0;

      // Check linked payable checking account
      const payableAccount = meta.payableAccountId 
        ? rawCashAccounts.find(c => c.id === meta.payableAccountId) 
        : undefined;

      const isInsufficientFunds = Boolean(
        meta.paymentDue > 0 && 
        payableAccount && 
        payableAccount.balance < meta.paymentDue
      );

      return {
        account: acc,
        meta,
        daysRemaining,
        urgency,
        utilization,
        isInsufficientFunds,
        payableAccount
      };
    });
  }, [rawCreditCardAccounts, cardMetadata, rawCashAccounts]);

  // Top Section - Cash Total (Only selected/active cash accounts)
  const activeCashAccounts = useMemo(() => {
    return cashAccounts.filter(c => !c.isExcluded);
  }, [cashAccounts]);

  const totalCashBalance = useMemo(() => {
    return activeCashAccounts.reduce((sum, c) => sum + c.account.balance, 0);
  }, [activeCashAccounts]);

  // Top Section - Credit Cards (Only selected/active credit cards)
  const activeCreditCards = useMemo(() => {
    return creditCards.filter(card => !card.meta.isExcludedFromGlance);
  }, [creditCards]);

  const topActiveCreditCards = activeCreditCards;
  const topNonExcludedCreditCards = activeCreditCards;

  // Total Payment Due of selected cards (from bottom section)
  const totalPaymentDue = useMemo(() => {
    return activeCreditCards.reduce((sum, card) => {
      return sum + (card.meta.paymentDue > 0 ? card.meta.paymentDue : 0);
    }, 0);
  }, [activeCreditCards]);

  // Total Credit Balance (Signed Negative): reflects upcoming payment due
  const totalCreditBalance = useMemo(() => {
    return -totalPaymentDue;
  }, [totalPaymentDue]);

  // Net Liquid Position: Active Cash minus Total Payment Due
  const netLiquidPosition = useMemo(() => {
    return totalCashBalance - totalPaymentDue;
  }, [totalCashBalance, totalPaymentDue]);

  // Bills Radar Sorting: Chronological by due date
  // Active bills: Cards with paymentDue > 0 OR cards without a due date configured yet
  // Runs cumulative cash-flow simulation per checking account across chronological bills
  const activeBills = useMemo(() => {
    const sorted = creditCards
      .filter(c => c.meta.paymentDue > 0 || !c.meta.dueDate)
      .sort((a, b) => {
        if (a.meta.dueDate && !b.meta.dueDate) return -1;
        if (!a.meta.dueDate && b.meta.dueDate) return 1;
        if (a.meta.dueDate && b.meta.dueDate) return a.daysRemaining - b.daysRemaining;
        return a.account.name.localeCompare(b.account.name);
      });

    // Track running balance per cash/checking account
    const runningCashMap = new Map<string, number>();
    rawCashAccounts.forEach(acc => {
      runningCashMap.set(acc.id, acc.balance);
    });

    return sorted.map(card => {
      const payableId = card.meta.payableAccountId;
      if (!payableId || card.meta.paymentDue <= 0) {
        return card;
      }

      const currentAvailable = runningCashMap.get(payableId) ?? 0;
      const paymentAmount = card.meta.paymentDue;
      const isInsufficient = currentAvailable < paymentAmount;
      const shortfall = isInsufficient ? paymentAmount - Math.max(0, currentAvailable) : 0;
      const remaining = currentAvailable - paymentAmount;

      // Update running balance for downstream bills
      runningCashMap.set(payableId, remaining);

      return {
        ...card,
        isInsufficientFunds: isInsufficient,
        shortfallAmount: shortfall,
        projectedPayableBalance: currentAvailable,
        remainingPayableBalance: remaining,
      };
    });
  }, [creditCards, rawCashAccounts]);

  const paidBills = useMemo(() => {
    return creditCards
      .filter(c => c.meta.dueDate && c.meta.paymentDue <= 0)
      .sort((a, b) => (a.meta.dueDate || '').localeCompare(b.meta.dueDate || ''));
  }, [creditCards]);

  // Overall Utilization
  const overallUtilization = useMemo(() => {
    let totalDebt = 0;
    let totalLimit = 0;
    creditCards.forEach(c => {
      totalDebt += Math.abs(c.account.balance);
      totalLimit += c.meta.creditLimit || 0;
    });
    return totalLimit > 0 ? (totalDebt / totalLimit) * 100 : 0;
  }, [creditCards]);

  const totalCreditLimit = useMemo(() => {
    return creditCards.reduce((sum, c) => sum + (c.meta.creditLimit || 0), 0);
  }, [creditCards]);

  // Action: Toggle Cash Account Exclusion
  const toggleCashExclusion = async (accountId: string) => {
    const cashAcc = cashAccounts.find(c => c.account.id === accountId);
    const currentlyExcluded = cashAcc ? cashAcc.isExcluded : false;
    const current = cashMetadata[accountId] || { accountId, isExcludedFromGlance: currentlyExcluded };
    const updated: CashAccountMetadata = {
      ...current,
      accountId,
      isExcludedFromGlance: !currentlyExcluded
    };
    await storageService.saveCashMetadata(updated);
    setCashMetadata(prev => ({ ...prev, [accountId]: updated }));
  };

  const setCashAccountsVisibility = async (updates: Record<string, boolean>) => {
    const newMetadata = { ...cashMetadata };
    for (const [id, isExcluded] of Object.entries(updates)) {
      const current = newMetadata[id] || { accountId: id, isExcludedFromGlance: false };
      newMetadata[id] = {
        ...current,
        accountId: id,
        isExcludedFromGlance: isExcluded
      };
    }
    await storageService.saveAllCashMetadata(newMetadata);
    setCashMetadata(newMetadata);
  };

  // Action: Toggle Card Exclusion from Top Glance
  const toggleCardExclusion = async (accountId: string) => {
    const card = creditCards.find(c => c.account.id === accountId);
    const currentlyExcluded = card ? card.meta.isExcludedFromGlance : false;
    const current = cardMetadata[accountId] || {
      accountId,
      dueDate: '',
      paymentDue: 0,
      creditLimit: 0,
      isExcludedFromGlance: currentlyExcluded
    };
    const updated: CardMetadata = {
      ...current,
      accountId,
      isExcludedFromGlance: !currentlyExcluded
    };
    await storageService.saveCardMetadata(updated);
    setCardMetadata(prev => ({ ...prev, [accountId]: updated }));
  };

  const setCardAccountsVisibility = async (updates: Record<string, boolean>) => {
    const newMetadata = { ...cardMetadata };
    for (const [id, isExcluded] of Object.entries(updates)) {
      const current = newMetadata[id] || {
        accountId: id,
        dueDate: '',
        paymentDue: 0,
        creditLimit: 0,
        isExcludedFromGlance: false
      };
      newMetadata[id] = {
        ...current,
        accountId: id,
        isExcludedFromGlance: isExcluded
      };
    }
    await storageService.saveAllCardsMetadata(newMetadata);
    setCardMetadata(newMetadata);
  };

  // Action: Update Card Metadata
  const updateCardMetadata = async (meta: CardMetadata) => {
    await storageService.saveCardMetadata(meta);
    setCardMetadata(prev => ({ ...prev, [meta.accountId]: meta }));
    wealthfolioService.showToast('Card settings updated', 'success');
  };

  // Action: Mark as Paid (Executes two-way transfer & rolls date)
  const markAsPaid = async (
    cardId: string, 
    payFromCheckingId: string, 
    amount: number, 
    paymentDate: string
  ) => {
    const card = creditCards.find(c => c.account.id === cardId);
    if (!card) return;

    try {
      // 1. Create transfer activity in Wealthfolio
      await wealthfolioService.recordTransferPayment(
        payFromCheckingId,
        cardId,
        amount,
        paymentDate
      );

      // 2. Advance due date by +1 month
      let nextDueDate = card.meta.dueDate;
      if (card.meta.dueDate) {
        const [year, month, day] = card.meta.dueDate.split('-').map(Number);
        const nextDate = new Date(year, month - 1 + 1, day);
        nextDueDate = nextDate.toISOString().split('T')[0];
      }

      // 3. Reset payment due to 0 and save
      const updatedMeta: CardMetadata = {
        ...card.meta,
        dueDate: nextDueDate,
        paymentDue: 0,
      };

      await storageService.saveCardMetadata(updatedMeta);
      setCardMetadata(prev => ({ ...prev, [cardId]: updatedMeta }));

      wealthfolioService.showToast(
        `Paid $${amount.toFixed(2)} to ${card.account.name}. Scheduled for next month!`,
        'success'
      );

      // 4. Background refresh accounts to get updated live balances from Wealthfolio
      loadData(true);
    } catch (err) {
      console.error('Mark as paid failed:', err);
      wealthfolioService.showToast('Failed to record payment transfer in Wealthfolio', 'error');
      throw err;
    }
  };

  // Action: Restore Backup
  const restoreFullBackup = async (
    cards: Record<string, CardMetadata>,
    cash: Record<string, CashAccountMetadata>
  ) => {
    try {
      await Promise.all([
        storageService.saveAllCardsMetadata(cards),
        storageService.saveAllCashMetadata(cash)
      ]);
      setCardMetadata(cards);
      setCashMetadata(cash);
    } catch (err) {
      console.error('Failed to restore full backup:', err);
      throw err;
    }
  };

  return {
    loading,
    refreshing,
    refresh: () => loadData(true),
    // Cash accounts
    cashAccounts,
    activeCashAccounts,
    totalCashBalance,
    toggleCashExclusion,
    setCashAccountsVisibility,
    cashMetadata,
    // Credit cards
    creditCards,
    activeCreditCards,
    topActiveCreditCards,
    topNonExcludedCreditCards,
    totalCreditBalance,
    totalPaymentDue,
    netLiquidPosition,
    toggleCardExclusion,
    setCardAccountsVisibility,
    updateCardMetadata,
    cardMetadata,
    // Bills Radar
    activeBills,
    paidBills,
    // Utilization
    overallUtilization,
    totalCreditLimit,
    // Actions
    markAsPaid,
    restoreFullBackup,
    rawCashAccounts,
    showToast: (msg: string, type: 'success' | 'error' | 'info' = 'info') => 
      wealthfolioService.showToast(msg, type)
  };
}
