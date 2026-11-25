import { CardMetadata, CashAccountMetadata, AddonStorageAPI } from '../types';

/**
 * Wealthfolio Add-on Storage Keys
 * Wealthfolio enforces a ~250 KB per-value limit in its host SQLite database.
 * To ensure 100% persistent DB storage without exceeding limits:
 * 1. Card metadata (dates, limits, payments, accounts) is stored in 'cct_cards_meta' (~2 KB).
 * 2. Card background images are stored in dedicated per-card keys 'cct_img_<id>' (~25 KB each).
 * 3. Cash account settings are stored in 'cct_cash_meta' (~500 B).
 */
const STORAGE_KEYS = {
  CARDS_META: 'cct_cards_meta',
  CASH_META: 'cct_cash_meta',
  CARD_IMG_PREFIX: 'cct_img_',
  // Legacy monolithic key for automatic migration
  LEGACY_ALL_CARDS: 'cct_cards_data',
  LEGACY_ALL_CASH: 'cct_cash_data',
};

// In-memory cache
const memoryStore = new Map<string, string>();

// LocalStorage helpers (safe for iframe / sandbox)
const LS_PREFIX = 'wf_cct_';

function getLocalStorage(key: string): string | null {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      return window.localStorage.getItem(LS_PREFIX + key) || window.localStorage.getItem(key);
    }
  } catch {}
  return null;
}

function setLocalStorage(key: string, value: string): void {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.setItem(LS_PREFIX + key, value);
    }
  } catch {}
}

function removeLocalStorage(key: string): void {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.removeItem(LS_PREFIX + key);
      window.localStorage.removeItem(key);
    }
  } catch {}
}

// Host Storage Helpers (Wealthfolio ctx.api.storage)
async function hostStorageGet(storage: any, key: string): Promise<string | null> {
  if (!storage) return null;
  try {
    if (typeof storage.get === 'function') {
      const res = await storage.get(key);
      return typeof res === 'string' ? res : (res ? JSON.stringify(res) : null);
    }
    if (typeof storage.getItem === 'function') {
      const res = await storage.getItem(key);
      return typeof res === 'string' ? res : (res ? JSON.stringify(res) : null);
    }
  } catch (err) {
    console.warn(`[CreditTracker DB] Error reading key "${key}" from host DB:`, err);
  }
  return null;
}

async function hostStorageSet(storage: any, key: string, value: string): Promise<boolean> {
  if (!storage) return false;
  try {
    if (typeof storage.set === 'function') {
      await storage.set(key, value);
      return true;
    }
    if (typeof storage.setItem === 'function') {
      await storage.setItem(key, value);
      return true;
    }
  } catch (err) {
    console.warn(`[CreditTracker DB] Error writing key "${key}" to host DB:`, err);
  }
  return false;
}

async function hostStorageDelete(storage: any, key: string): Promise<void> {
  if (!storage) return;
  try {
    if (typeof storage.delete === 'function') {
      await storage.delete(key);
    } else if (typeof storage.removeItem === 'function') {
      await storage.removeItem(key);
    } else if (typeof storage.remove === 'function') {
      await storage.remove(key);
    }
  } catch {}
}

const fallbackStorage: AddonStorageAPI = {
  get: async (key: string) => memoryStore.get(key) || getLocalStorage(key) || null,
  set: async (key: string, value: string) => {
    memoryStore.set(key, value);
    setLocalStorage(key, value);
  },
  remove: async (key: string) => {
    memoryStore.delete(key);
    removeLocalStorage(key);
  },
};

export class StorageService {
  private storage: AddonStorageAPI;
  private cardsCache: Record<string, CardMetadata> | null = null;
  private cashCache: Record<string, CashAccountMetadata> | null = null;

  constructor(storageApi?: AddonStorageAPI) {
    this.storage = storageApi || fallbackStorage;
  }

  // Load all credit cards metadata from Wealthfolio DB
  async getAllCardsMetadata(): Promise<Record<string, CardMetadata>> {
    if (this.cardsCache && Object.keys(this.cardsCache).length > 0) {
      return { ...this.cardsCache };
    }

    let rawMetaString: string | null = null;
    let sourceLabel = '';

    // 1. Try host SQLite DB 'cct_cards_meta'
    rawMetaString = await hostStorageGet(this.storage, STORAGE_KEYS.CARDS_META);
    if (rawMetaString) {
      sourceLabel = 'Wealthfolio Host DB (cct_cards_meta)';
    }

    // 2. Try legacy key 'cct_cards_data' in host DB
    if (!rawMetaString) {
      rawMetaString = await hostStorageGet(this.storage, STORAGE_KEYS.LEGACY_ALL_CARDS);
      if (rawMetaString) {
        sourceLabel = 'Wealthfolio Host DB (Legacy cct_cards_data)';
      }
    }

    // 3. Fallback to localStorage
    if (!rawMetaString) {
      rawMetaString = getLocalStorage(STORAGE_KEYS.CARDS_META) || getLocalStorage(STORAGE_KEYS.LEGACY_ALL_CARDS);
      if (rawMetaString) {
        sourceLabel = 'Browser LocalStorage';
      }
    }

    // 4. Fallback to in-memory store
    if (!rawMetaString) {
      rawMetaString = memoryStore.get(STORAGE_KEYS.CARDS_META) || memoryStore.get(STORAGE_KEYS.LEGACY_ALL_CARDS) || null;
      if (rawMetaString) {
        sourceLabel = 'In-Memory Cache';
      }
    }

    if (!rawMetaString) {
      console.log('[CreditTracker DB] No card records found in DB, ready for setup.');
      this.cardsCache = {};
      return {};
    }

    let parsedCards: Record<string, CardMetadata> = {};
    try {
      parsedCards = JSON.parse(rawMetaString);
    } catch (e) {
      console.error('[CreditTracker DB] Failed to parse cards JSON:', e);
      this.cardsCache = {};
      return {};
    }

    // Load separate image keys for each card in parallel
    const accountIds = Object.keys(parsedCards);
    console.log(`[CreditTracker DB] Loaded ${accountIds.length} card(s) from ${sourceLabel}. Hydrating image data...`);

    const imagePromises = accountIds.map(async (id) => {
      const card = parsedCards[id];
      // If card already has an image (from legacy data), keep it
      if (card.imageUrl) return;

      const imgKey = `${STORAGE_KEYS.CARD_IMG_PREFIX}${id}`;
      // Check host DB for card image
      let imgData = await hostStorageGet(this.storage, imgKey);
      if (!imgData) {
        imgData = getLocalStorage(imgKey) || memoryStore.get(imgKey) || null;
      }

      if (imgData) {
        card.imageUrl = imgData;
      }
    });

    await Promise.allSettled(imagePromises);

    this.cardsCache = parsedCards;
    return { ...this.cardsCache };
  }

  // Save single credit card metadata to Wealthfolio DB
  async saveCardMetadata(meta: CardMetadata): Promise<void> {
    if (!this.cardsCache) {
      await this.getAllCardsMetadata();
    }

    // Update in-memory cache
    this.cardsCache = {
      ...(this.cardsCache || {}),
      [meta.accountId]: { ...meta },
    };

    // 1. Separate image from card metadata to strictly respect SQLite 250KB limit
    const imgKey = `${STORAGE_KEYS.CARD_IMG_PREFIX}${meta.accountId}`;
    const imageUrl = meta.imageUrl;

    if (imageUrl && (imageUrl.startsWith('data:') || imageUrl.startsWith('blob:'))) {
      // Save image to dedicated host DB key
      await hostStorageSet(this.storage, imgKey, imageUrl);
      setLocalStorage(imgKey, imageUrl);
      memoryStore.set(imgKey, imageUrl);
    } else if (!imageUrl) {
      // Remove image key if cleared
      await hostStorageDelete(this.storage, imgKey);
      removeLocalStorage(imgKey);
      memoryStore.delete(imgKey);
    }

    // 2. Build lightweight metadata map without base64 image strings
    const lightweightCards: Record<string, any> = {};
    for (const [id, c] of Object.entries(this.cardsCache)) {
      const { imageUrl: _, ...rest } = c;
      lightweightCards[id] = {
        ...rest,
        hasCustomImage: Boolean(c.imageUrl),
      };
    }

    const serializedMeta = JSON.stringify(lightweightCards);

    // Save lightweight metadata (~1-3 KB) to Wealthfolio DB
    const dbSuccess = await hostStorageSet(this.storage, STORAGE_KEYS.CARDS_META, serializedMeta);
    setLocalStorage(STORAGE_KEYS.CARDS_META, serializedMeta);
    memoryStore.set(STORAGE_KEYS.CARDS_META, serializedMeta);

    if (dbSuccess) {
      console.log(`[CreditTracker DB] Card "${meta.accountId}" saved to Wealthfolio database successfully.`);
    } else {
      console.warn(`[CreditTracker DB] Note: Host storage did not acknowledge write, saved to persistent browser cache.`);
    }
  }

  // Batch save multiple cards metadata (e.g. backup restore)
  async saveAllCardsMetadata(allMeta: Record<string, CardMetadata>): Promise<void> {
    this.cardsCache = { ...allMeta };

    const lightweightCards: Record<string, any> = {};

    // Process each card: save images to their own keys, strip from main batch
    const imagePromises: Promise<any>[] = [];

    for (const [id, c] of Object.entries(allMeta)) {
      const imgKey = `${STORAGE_KEYS.CARD_IMG_PREFIX}${id}`;
      if (c.imageUrl && (c.imageUrl.startsWith('data:') || c.imageUrl.startsWith('blob:'))) {
        imagePromises.push(
          hostStorageSet(this.storage, imgKey, c.imageUrl),
        );
        setLocalStorage(imgKey, c.imageUrl);
        memoryStore.set(imgKey, c.imageUrl);
      }

      const { imageUrl: _, ...rest } = c;
      lightweightCards[id] = {
        ...rest,
        hasCustomImage: Boolean(c.imageUrl),
      };
    }

    await Promise.allSettled(imagePromises);

    const serializedMeta = JSON.stringify(lightweightCards);
    await hostStorageSet(this.storage, STORAGE_KEYS.CARDS_META, serializedMeta);
    setLocalStorage(STORAGE_KEYS.CARDS_META, serializedMeta);
    memoryStore.set(STORAGE_KEYS.CARDS_META, serializedMeta);

    console.log(`[CreditTracker DB] Batch saved ${Object.keys(allMeta).length} cards to database.`);
  }

  // Load all cash accounts metadata from Wealthfolio DB
  async getAllCashMetadata(): Promise<Record<string, CashAccountMetadata>> {
    if (this.cashCache && Object.keys(this.cashCache).length > 0) {
      return { ...this.cashCache };
    }

    let rawString: string | null = null;
    rawString = await hostStorageGet(this.storage, STORAGE_KEYS.CASH_META);
    if (!rawString) {
      rawString = await hostStorageGet(this.storage, STORAGE_KEYS.LEGACY_ALL_CASH);
    }
    if (!rawString) {
      rawString = getLocalStorage(STORAGE_KEYS.CASH_META) || getLocalStorage(STORAGE_KEYS.LEGACY_ALL_CASH);
    }
    if (!rawString) {
      rawString = memoryStore.get(STORAGE_KEYS.CASH_META) || null;
    }

    if (rawString) {
      try {
        const parsed = JSON.parse(rawString);
        if (parsed && typeof parsed === 'object') {
          this.cashCache = parsed;
          return { ...this.cashCache };
        }
      } catch {}
    }

    this.cashCache = {};
    return {};
  }

  // Save single cash account metadata to Wealthfolio DB
  async saveCashMetadata(meta: CashAccountMetadata): Promise<void> {
    if (!this.cashCache) {
      await this.getAllCashMetadata();
    }
    this.cashCache = {
      ...(this.cashCache || {}),
      [meta.accountId]: meta,
    };

    const serialized = JSON.stringify(this.cashCache);
    await hostStorageSet(this.storage, STORAGE_KEYS.CASH_META, serialized);
    setLocalStorage(STORAGE_KEYS.CASH_META, serialized);
    memoryStore.set(STORAGE_KEYS.CASH_META, serialized);
  }

  // Batch save multiple cash accounts metadata
  async saveAllCashMetadata(allMeta: Record<string, CashAccountMetadata>): Promise<void> {
    this.cashCache = { ...allMeta };
    const serialized = JSON.stringify(this.cashCache);
    await hostStorageSet(this.storage, STORAGE_KEYS.CASH_META, serialized);
    setLocalStorage(STORAGE_KEYS.CASH_META, serialized);
    memoryStore.set(STORAGE_KEYS.CASH_META, serialized);
  }
}
