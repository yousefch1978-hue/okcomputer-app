import { create } from 'zustand';
import type { PromoCode } from '@/types';
import { api } from '@/lib/api';
import { useAuthStore } from './authStore';

interface PromoCodeStore {
  promoCodes: PromoCode[];
  usedCodes: Record<string, string[]>;
  loadPromoCodes: () => Promise<void>;
  createPromoCode: (code: string, amount: number, uses: number, createdBy: string) => Promise<PromoCode>;
  deletePromoCode: (codeId: string) => Promise<void>;
  usePromoCode: (code: string, userId: string) => Promise<{ success: boolean; amount?: number; error?: string }>;
  getPromoCodeByCode: (code: string) => PromoCode | undefined;
  hasUserUsedCode: (userId: string, codeId: string) => boolean;
  getAllPromoCodes: () => PromoCode[];
}

export const usePromoCodeStore = create<PromoCodeStore>()((set, get) => ({
  promoCodes: [], usedCodes: {},
  async loadPromoCodes() {
    try {
      const { promoCodes } = await api<{ promoCodes: PromoCode[] }>('/api/promocodes');
      set({ promoCodes });
    } catch {}
  },
  async createPromoCode(code, amount, uses) {
    const { promoCode } = await api<{ promoCode: PromoCode }>('/api/promocodes', { method: 'POST', body: JSON.stringify({ code, amount, uses }) });
    await get().loadPromoCodes();
    return promoCode;
  },
  async deletePromoCode(codeId) {
    await api(`/api/promocodes/${codeId}`, { method: 'DELETE' });
    await get().loadPromoCodes();
  },
  async usePromoCode(code) {
    try {
      const { amount, user } = await api<{ success: boolean; amount: number; user: any }>('/api/promocodes/use', { method: 'POST', body: JSON.stringify({ code }) });
      useAuthStore.getState().setUser(user);
      await get().loadPromoCodes();
      return { success: true, amount };
    } catch (error: any) {
      return { success: false, error: error.message || 'Invalid promo code' };
    }
  },
  getPromoCodeByCode(code) { return get().promoCodes.find((p) => p.code === code.toUpperCase()); },
  hasUserUsedCode(userId, codeId) { return (get().usedCodes[userId] || []).includes(codeId); },
  getAllPromoCodes() { return get().promoCodes; },
}));
