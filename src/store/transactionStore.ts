import { create } from 'zustand';
import type { Transaction } from '@/types';
import { api } from '@/lib/api';

interface TransactionStore {
  transactions: Transaction[];
  pendingDeposits: Transaction[];
  pendingWithdrawals: Transaction[];
  loadTransactions: () => Promise<void>;
  addTransaction: (transaction: Omit<Transaction, 'id' | 'createdAt' | 'status'>) => Promise<void>;
  approveTransaction: (transactionId: string) => Promise<void>;
  rejectTransaction: (transactionId: string) => Promise<void>;
  getUserTransactions: (userId: string) => Transaction[];
  getPendingTransactions: () => Transaction[];
  getTotalDeposits: () => number;
  getTotalWithdrawals: () => number;
}

export const useTransactionStore = create<TransactionStore>()((set, get) => ({
  transactions: [], pendingDeposits: [], pendingWithdrawals: [],
  async loadTransactions() {
    try {
      const { transactions } = await api<{ transactions: Transaction[] }>('/api/transactions');
      set({
        transactions,
        pendingDeposits: transactions.filter((t) => t.type === 'deposit' && t.status === 'pending'),
        pendingWithdrawals: transactions.filter((t) => t.type === 'withdrawal' && t.status === 'pending'),
      });
    } catch {}
  },
  async addTransaction(transactionData) {
    await api('/api/transactions', { method: 'POST', body: JSON.stringify(transactionData) });
    await get().loadTransactions();
  },
  async approveTransaction(transactionId) {
    await api(`/api/transactions/${transactionId}/approve`, { method: 'POST' });
    await get().loadTransactions();
  },
  async rejectTransaction(transactionId) {
    await api(`/api/transactions/${transactionId}/reject`, { method: 'POST' });
    await get().loadTransactions();
  },
  getUserTransactions(userId) { return get().transactions.filter((tx) => tx.userId === userId); },
  getPendingTransactions() { return get().transactions.filter((tx) => tx.status === 'pending'); },
  getTotalDeposits() { return get().transactions.filter((tx) => tx.type === 'deposit' && tx.status === 'approved').reduce((t,tx)=>t+tx.amount,0); },
  getTotalWithdrawals() { return get().transactions.filter((tx) => tx.type === 'withdrawal' && tx.status === 'approved').reduce((t,tx)=>t+tx.amount,0); },
}));

export const loadTransactions = async () => {
  await useTransactionStore.getState().loadTransactions();
};
