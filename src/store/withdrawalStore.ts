import { create } from 'zustand';
import { api } from '@/lib/api';

export type CryptoType = 'BTC' | 'ETH' | 'SOL';

export interface WithdrawalRequest {
  id: string;
  userId: string;
  username: string;
  email: string;
  amount: number;
  cryptoType: CryptoType;
  walletAddress: string;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: string;
  processedAt?: string;
  processedBy?: string;
}

interface WithdrawalStore {
  withdrawals: WithdrawalRequest[];
  loadWithdrawals: () => Promise<void>;
  requestWithdrawal: (data: Omit<WithdrawalRequest, 'id' | 'status' | 'createdAt'>) => Promise<{ success: boolean; error?: string }>;
  approveWithdrawal: (withdrawalId: string, adminId: string) => Promise<void>;
  rejectWithdrawal: (withdrawalId: string, adminId: string) => Promise<void>;
  getPendingWithdrawals: () => WithdrawalRequest[];
  getUserWithdrawals: (userId: string) => WithdrawalRequest[];
  getAllWithdrawals: () => WithdrawalRequest[];
}

export const useWithdrawalStore = create<WithdrawalStore>()((set, get) => ({
  withdrawals: [],
  async loadWithdrawals() {
    try {
      const { withdrawals } = await api<{ withdrawals: WithdrawalRequest[] }>('/api/withdrawals');
      set({ withdrawals });
    } catch {}
  },
  async requestWithdrawal(data) {
    try {
      await api('/api/withdrawals', { method: 'POST', body: JSON.stringify(data) });
      await get().loadWithdrawals();
      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message || 'Failed to submit withdrawal request' };
    }
  },
  async approveWithdrawal(withdrawalId) {
    await api(`/api/withdrawals/${withdrawalId}/approve`, { method: 'POST' });
    await get().loadWithdrawals();
  },
  async rejectWithdrawal(withdrawalId) {
    await api(`/api/withdrawals/${withdrawalId}/reject`, { method: 'POST' });
    await get().loadWithdrawals();
  },
  getPendingWithdrawals() { return get().withdrawals.filter((w) => w.status === 'pending'); },
  getUserWithdrawals(userId) { return get().withdrawals.filter((w) => w.userId === userId); },
  getAllWithdrawals() { return get().withdrawals; },
}));
