import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Users, Wallet, Check, X, Crown, Gift, Headphones, Search, LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuthStore } from '@/store/authStore';
import { useTransactionStore } from '@/store/transactionStore';
import { usePromoCodeStore } from '@/store/promoCodeStore';
import { useWithdrawalStore } from '@/store/withdrawalStore';
import { useChatStore } from '@/store/chatStore';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import type { User } from '@/types';

interface AdminPageProps { onPageChange: (page: string) => void; }

export default function AdminPage({ onPageChange }: AdminPageProps) {
  const { logout, user: adminUser, refreshUser } = useAuthStore();
  const txStore = useTransactionStore();
  const withdrawalStore = useWithdrawalStore();
  const promoStore = usePromoCodeStore();
  const chatStore = useChatStore();
  const [users, setUsers] = useState<User[]>([]);
  const [search, setSearch] = useState('');
  const [balanceMap, setBalanceMap] = useState<Record<string, string>>({});
  const [newCode, setNewCode] = useState('');
  const [newCodeAmount, setNewCodeAmount] = useState('');
  const [newCodeUses, setNewCodeUses] = useState('');
  const [replyMap, setReplyMap] = useState<Record<string, string>>({});

  const loadUsers = async () => {
    const { users } = await api<{ users: User[] }>('/api/admin/users');
    setUsers(users);
  };

  useEffect(() => {
    loadUsers();
    txStore.loadTransactions();
    withdrawalStore.loadWithdrawals();
    promoStore.loadPromoCodes();
    chatStore.loadMessages();
    const interval = setInterval(() => {
      loadUsers(); txStore.loadTransactions(); withdrawalStore.loadWithdrawals(); promoStore.loadPromoCodes(); chatStore.loadMessages(); refreshUser();
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  const filteredUsers = useMemo(() => users.filter((u) => u.email.toLowerCase().includes(search.toLowerCase()) || u.username.toLowerCase().includes(search.toLowerCase())), [users, search]);
  const pendingDeposits = txStore.transactions.filter((t) => t.type === 'deposit' && t.status === 'pending');
  const supportThreads = Array.from(new Map(chatStore.supportMessages.map((m) => [m.userId, m])).keys()).map((userId) => ({ userId, messages: chatStore.supportMessages.filter((m) => m.userId === userId) }));

  const adjustBalance = async (userId: string) => {
    const amount = parseFloat(balanceMap[userId] || '0');
    if (Number.isNaN(amount) || !amount) return toast.error('Enter a valid amount');
    await api(`/api/admin/users/${userId}/balance`, { method: 'POST', body: JSON.stringify({ amount }) });
    toast.success('Balance updated');
    setBalanceMap((p) => ({ ...p, [userId]: '' }));
    await loadUsers();
  };

  const createPromo = async () => {
    if (!newCode || !newCodeAmount || !newCodeUses) return toast.error('Fill all promo fields');
    await promoStore.createPromoCode(newCode, parseFloat(newCodeAmount), parseInt(newCodeUses), 'admin');
    setNewCode(''); setNewCodeAmount(''); setNewCodeUses('');
    toast.success('Promo code created');
  };

  const sendSupportReply = async (userId: string) => {
    const message = replyMap[userId]?.trim();
    if (!message) return;
    await chatStore.addSupportMessage({ userId, username: adminUser?.username || 'Admin', message, isAdmin: true, isSupport: true });
    setReplyMap((p) => ({ ...p, [userId]: '' }));
    toast.success('Reply sent');
  };

  return (
    <div className="min-h-screen pt-20 pb-10 px-2 sm:px-4 lg:px-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex flex-col sm:flex-row justify-between gap-4 items-start sm:items-center">
          <div className="flex items-center gap-3"><div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-neon-green to-neon-purple flex items-center justify-center"><Crown className="w-6 h-6 text-dark-900"/></div><div><h1 className="text-2xl font-bold">Admin Dashboard</h1><p className="text-gray-400 text-sm">Shared backend enabled</p></div></div>
          <Button variant="outline" onClick={async()=>{await logout(); onPageChange('home');}}><LogOut className="w-4 h-4 mr-2"/>Logout</Button>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            ['Users', String(users.length), Users],
            ['Pending Deposits', String(pendingDeposits.length), Wallet],
            ['Pending Withdrawals', String(withdrawalStore.getPendingWithdrawals().length), Wallet],
            ['Support Threads', String(supportThreads.length), Headphones],
          ].map(([label, value, Icon]: any) => (
            <motion.div key={label} initial={{opacity:0,y:10}} animate={{opacity:1,y:0}} className="bg-dark-800/80 rounded-2xl border border-white/10 p-4">
              <div className="flex items-center gap-2 text-gray-400 text-sm"><Icon className="w-4 h-4"/>{label}</div>
              <div className="text-2xl font-bold mt-2">{value}</div>
            </motion.div>
          ))}
        </div>

        <Tabs defaultValue="deposits" className="w-full">
          <TabsList className="grid grid-cols-3 lg:grid-cols-5 bg-dark-800 p-1 rounded-xl">
            <TabsTrigger value="deposits">Deposits</TabsTrigger>
            <TabsTrigger value="withdrawals">Withdrawals</TabsTrigger>
            <TabsTrigger value="users">Users</TabsTrigger>
            <TabsTrigger value="promo">Promo</TabsTrigger>
            <TabsTrigger value="support">Support</TabsTrigger>
          </TabsList>

          <TabsContent value="deposits" className="space-y-3 mt-4">
            {pendingDeposits.length === 0 ? <div className="text-gray-400">No pending deposits.</div> : pendingDeposits.map((tx) => (
              <div key={tx.id} className="bg-dark-800/80 border border-white/10 rounded-2xl p-4 flex flex-col lg:flex-row gap-4 lg:items-center lg:justify-between">
                <div><div className="font-semibold">{tx.username}</div><div className="text-sm text-gray-400">${tx.amount} • {tx.cryptoType.toUpperCase()} • {tx.txHash}</div></div>
                <div className="flex gap-2"><Button onClick={async()=>{await txStore.approveTransaction(tx.id); await loadUsers(); toast.success('Deposit approved');}} className="bg-neon-green text-dark-900"><Check className="w-4 h-4 mr-1"/>Approve</Button><Button variant="outline" onClick={async()=>{await txStore.rejectTransaction(tx.id); toast.error('Deposit rejected');}}><X className="w-4 h-4 mr-1"/>Reject</Button></div>
              </div>
            ))}
          </TabsContent>

          <TabsContent value="withdrawals" className="space-y-3 mt-4">
            {withdrawalStore.getPendingWithdrawals().length === 0 ? <div className="text-gray-400">No pending withdrawals.</div> : withdrawalStore.getPendingWithdrawals().map((w) => (
              <div key={w.id} className="bg-dark-800/80 border border-white/10 rounded-2xl p-4 flex flex-col lg:flex-row gap-4 lg:items-center lg:justify-between">
                <div><div className="font-semibold">{w.username}</div><div className="text-sm text-gray-400">${w.amount} • {w.cryptoType} • {w.walletAddress}</div></div>
                <div className="flex gap-2"><Button onClick={async()=>{await withdrawalStore.approveWithdrawal(w.id, adminUser?.id || ''); await loadUsers(); toast.success('Withdrawal approved');}} className="bg-neon-green text-dark-900"><Check className="w-4 h-4 mr-1"/>Approve</Button><Button variant="outline" onClick={async()=>{await withdrawalStore.rejectWithdrawal(w.id, adminUser?.id || ''); await loadUsers(); toast.error('Withdrawal rejected and refunded');}}><X className="w-4 h-4 mr-1"/>Reject</Button></div>
              </div>
            ))}
          </TabsContent>

          <TabsContent value="users" className="mt-4">
            <div className="relative mb-4"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500"/><Input value={search} onChange={(e)=>setSearch(e.target.value)} className="pl-9" placeholder="Search users"/></div>
            <div className="space-y-3">{filteredUsers.map((u) => (
              <div key={u.id} className="bg-dark-800/80 border border-white/10 rounded-2xl p-4 grid md:grid-cols-[1fr_auto] gap-3 items-center">
                <div><div className="font-semibold">{u.username}</div><div className="text-sm text-gray-400">{u.email}</div><div className="text-sm text-neon-green mt-1">${u.balance.toFixed(2)}</div></div>
                <div className="flex gap-2"><Input value={balanceMap[u.id] || ''} onChange={(e)=>setBalanceMap((p)=>({...p,[u.id]:e.target.value}))} placeholder="+100 or -10" className="w-32"/><Button onClick={()=>adjustBalance(u.id)}>Update</Button></div>
              </div>
            ))}</div>
          </TabsContent>

          <TabsContent value="promo" className="mt-4 space-y-4">
            <div className="grid md:grid-cols-4 gap-3"><Input placeholder="Code" value={newCode} onChange={(e)=>setNewCode(e.target.value)}/><Input placeholder="Amount" value={newCodeAmount} onChange={(e)=>setNewCodeAmount(e.target.value)}/><Input placeholder="Uses" value={newCodeUses} onChange={(e)=>setNewCodeUses(e.target.value)}/><Button onClick={createPromo}><Gift className="w-4 h-4 mr-2"/>Create</Button></div>
            <div className="space-y-3">{promoStore.promoCodes.map((p) => <div key={p.id} className="bg-dark-800/80 border border-white/10 rounded-2xl p-4 flex justify-between items-center gap-4"><div><div className="font-semibold">{p.code}</div><div className="text-sm text-gray-400">${p.amount} • {p.usesLeft}/{p.totalUses} left</div></div><Button variant="outline" onClick={async()=>{await promoStore.deletePromoCode(p.id); toast.success('Deleted');}}>Delete</Button></div>)}</div>
          </TabsContent>

          <TabsContent value="support" className="mt-4 space-y-4">
            {supportThreads.length === 0 ? <div className="text-gray-400">No support messages yet.</div> : supportThreads.map((thread) => (
              <div key={thread.userId} className="bg-dark-800/80 border border-white/10 rounded-2xl p-4 space-y-3">
                <div className="font-semibold">Conversation: {thread.messages[0]?.username || thread.userId}</div>
                <div className="space-y-2 max-h-64 overflow-auto">{thread.messages.map((m) => <div key={m.id} className={`rounded-xl px-3 py-2 ${m.isAdmin ? 'bg-neon-purple/20' : 'bg-dark-700'}`}><div className="text-xs text-gray-400 mb-1">{m.isAdmin ? 'Support' : m.username}</div><div>{m.message}</div></div>)}</div>
                <div className="flex gap-2"><Input value={replyMap[thread.userId] || ''} onChange={(e)=>setReplyMap((p)=>({...p,[thread.userId]:e.target.value}))} placeholder="Reply to user"/><Button onClick={()=>sendSupportReply(thread.userId)}>Send</Button></div>
              </div>
            ))}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
