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
  history.unshift(newTx); // Newest first
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
