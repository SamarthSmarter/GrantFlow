export interface TransactionItem {
  id: string; // generated UUID or Tx Hash
  grantId: string;
  type: 'submit' | 'release' | 'reject';
  amount: string;
  grantorName: string;
  timestamp: number;
  status: 'pending' | 'processing' | 'success' | 'failed' | 'cancelled';
  hash: string;
  network: 'testnet' | 'sandbox';
}

export interface TransactionStats {
  total: number;
  pending: number;
  processing: number;
  success: number;
  failed: number;
  cancelled: number;
  submits: number;
  releases: number;
  rejects: number;
}

export function getTransactionHistory(): TransactionItem[] {
  try {
    const data = localStorage.getItem('grantflow_transactions');
    return data ? JSON.parse(data) : [];
  } catch (err) {
    console.error('Error loading transaction history:', err);
    return [];
  }
}

export function saveTransactionHistory(txs: TransactionItem[]): void {
  try {
    localStorage.setItem('grantflow_transactions', JSON.stringify(txs));
    window.dispatchEvent(new Event('grantflow_transactions_change'));
  } catch (err) {
    console.error('Error saving transaction history:', err);
  }
}

export function addTransaction(tx: Omit<TransactionItem, 'timestamp'>): TransactionItem {
  const newTx: TransactionItem = {
    ...tx,
    timestamp: Date.now(),
  };
  const history = getTransactionHistory();
  history.unshift(newTx);
  saveTransactionHistory(history);
  return newTx;
}

export function updateTransactionStatus(id: string, status: TransactionItem['status'], hash?: string): void {
  const history = getTransactionHistory();
  const txIndex = history.findIndex((t) => t.id === id || t.hash === id);
  if (txIndex !== -1) {
    history[txIndex].status = status;
    if (hash) {
      history[txIndex].hash = hash;
      history[txIndex].id = hash;
    }
    saveTransactionHistory(history);
  }
}

export function clearTransactionHistory(): void {
  saveTransactionHistory([]);
}

/**
 * Get all transactions for a specific grant ID
 */
export function getTransactionsByGrant(grantId: string): TransactionItem[] {
  return getTransactionHistory().filter(tx => tx.grantId === grantId);
}

/**
 * Get all transactions of a specific type
 */
export function getTransactionsByType(type: TransactionItem['type']): TransactionItem[] {
  return getTransactionHistory().filter(tx => tx.type === type);
}

/**
 * Get aggregate statistics for the transaction history
 */
export function getTransactionStats(): TransactionStats {
  const history = getTransactionHistory();
  return {
    total: history.length,
    pending: history.filter(t => t.status === 'pending').length,
    processing: history.filter(t => t.status === 'processing').length,
    success: history.filter(t => t.status === 'success').length,
    failed: history.filter(t => t.status === 'failed').length,
    cancelled: history.filter(t => t.status === 'cancelled').length,
    submits: history.filter(t => t.type === 'submit').length,
    releases: history.filter(t => t.type === 'release').length,
    rejects: history.filter(t => t.type === 'reject').length,
  };
}
