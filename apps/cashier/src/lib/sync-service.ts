// Sync service for offline transactions

import { 
  getUnsyncedTransactions, 
  markTransactionSynced, 
  cacheProducts,
  cacheCategories,
  isOnline,
  getUnsyncedCount,
} from './offline-db';
import { api } from './api';

type SyncStatus = 'idle' | 'syncing' | 'error' | 'success';

interface SyncResult {
  synced: number;
  failed: number;
  errors: string[];
}

// Sync offline transactions to server
export async function syncOfflineTransactions(): Promise<SyncResult> {
  const result: SyncResult = { synced: 0, failed: 0, errors: [] };
  
  if (!isOnline()) {
    return result;
  }

  const unsyncedTx = await getUnsyncedTransactions();
  
  for (const tx of unsyncedTx) {
    try {
      // Transform offline transaction format to API format
      const payload = {
        items: tx.items.map(item => ({
          productId: item.productId,
          quantity: item.quantity,
        })),
        customerId: tx.customerId,
        discount: tx.discount,
        paid: tx.paid,
        paymentMethod: tx.paymentMethod,
        payments: tx.payments,
      };
      
      await api.post('/transactions', payload);
      await markTransactionSynced(tx.id);
      result.synced++;
    } catch (error: any) {
      result.failed++;
      result.errors.push(`Transaction ${tx.id}: ${error.message || 'Unknown error'}`);
    }
  }
  
  return result;
}

// Refresh product cache from server
export async function refreshProductCache(): Promise<boolean> {
  if (!isOnline()) {
    return false;
  }

  try {
    const [productsRes, categoriesRes] = await Promise.all([
      api.get('/products'),
      api.get('/categories'),
    ]);
    
    const products = productsRes.data.map((p: any) => ({
      id: p.id,
      name: p.name,
      sku: p.sku,
      price: p.price,
      stock: p.stock,
      categoryId: p.categoryId,
      categoryName: p.category?.name || '',
      updatedAt: p.updatedAt,
    }));
    
    await cacheProducts(products);
    await cacheCategories(categoriesRes.data);
    
    return true;
  } catch (error) {
    console.error('Failed to refresh cache:', error);
    return false;
  }
}

// Auto-sync on reconnect
let syncInProgress = false;
let listeners: ((status: SyncStatus, count?: number) => void)[] = [];

export function addSyncListener(listener: (status: SyncStatus, count?: number) => void) {
  listeners.push(listener);
  return () => {
    listeners = listeners.filter(l => l !== listener);
  };
}

function notifyListeners(status: SyncStatus, count?: number) {
  listeners.forEach(l => l(status, count));
}

export async function autoSync() {
  if (syncInProgress || !isOnline()) return;
  
  syncInProgress = true;
  notifyListeners('syncing');
  
  try {
    const result = await syncOfflineTransactions();
    
    if (result.synced > 0 || result.failed === 0) {
      await refreshProductCache();
      notifyListeners('success', result.synced);
    } else {
      notifyListeners('error');
    }
  } catch (error) {
    notifyListeners('error');
  } finally {
    syncInProgress = false;
    
    // Update count
    const count = await getUnsyncedCount();
    if (count > 0) {
      notifyListeners('idle', count);
    }
  }
}

// Initialize sync listeners
export function initSyncService() {
  // Sync when coming online
  window.addEventListener('online', () => {
    console.log('Online! Starting auto-sync...');
    autoSync();
  });
  
  // Initial status
  window.addEventListener('offline', () => {
    notifyListeners('idle');
  });
  
  // Initial sync if online
  if (isOnline()) {
    refreshProductCache();
  }
  
  // Check for unsynced count
  getUnsyncedCount().then(count => {
    if (count > 0) {
      notifyListeners('idle', count);
      if (isOnline()) {
        autoSync();
      }
    }
  });
}
