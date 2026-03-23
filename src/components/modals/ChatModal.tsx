import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Send, MessageSquare, Headphones, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuthStore } from '@/store/authStore';
import { useChatStore } from '@/store/chatStore';
import { useSound } from '@/hooks/useSound';
import { toast } from 'sonner';

interface ChatModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function ChatModal({ isOpen, onClose }: ChatModalProps) {
  const { user } = useAuthStore();
  const { messages, supportMessages, addMessage, addSupportMessage, loadMessages } = useChatStore();
  const { play } = useSound();
  const [activeTab, setActiveTab] = useState('global');
  const [messageInput, setMessageInput] = useState('');
  const [supportInput, setSupportInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const supportEndRef = useRef<HTMLDivElement>(null);

  const isAdmin = user?.role === 'admin' || user?.email === 'yousefch1978@gmail.com';

  useEffect(() => { if (isOpen && user) { loadMessages(); const t = setInterval(() => loadMessages(), 4000); return () => clearInterval(t); } }, [isOpen, user?.id]);

  // Auto-scroll to bottom
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  useEffect(() => {
    if (supportEndRef.current) {
      supportEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [supportMessages]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!messageInput.trim() || !user) return;

    await addMessage({
      userId: user.id,
      username: user.username,
      message: messageInput.trim(),
      isAdmin,
    });

    play('message');
    setMessageInput('');
  };

  const handleSendSupport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supportInput.trim() || !user) return;

    await addSupportMessage({
      userId: user.id,
      username: user.username,
      message: supportInput.trim(),
      isAdmin,
      isSupport: true,
    });

    play('message');
    setSupportInput('');
    toast.success(isAdmin ? 'Support reply sent' : 'Message sent to support');
  };

  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  // Filter support messages for this user (or all for admin)
  const userSupportMessages = isAdmin 
    ? supportMessages 
    : supportMessages.filter(msg => msg.userId === user?.id || msg.isAdmin);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50"
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="fixed inset-0 sm:inset-auto sm:right-4 sm:top-20 sm:w-96 sm:h-[600px] z-50 flex items-end sm:items-start justify-center sm:justify-end p-4 sm:p-0"
          >
            <div className="bg-dark-800 rounded-2xl border border-white/10 shadow-2xl overflow-hidden w-full h-full sm:h-auto flex flex-col">
              {/* Header */}
              <div className="flex items-center justify-between px-4 py-3 border-b border-white/5 bg-dark-800">
                <div className="flex items-center gap-2">
                  <MessageSquare className="w-5 h-5 text-neon-green" />
                  <h2 className="text-lg font-semibold text-white">Chat</h2>
                </div>
                <button onClick={onClose} className="p-2 rounded-lg hover:bg-white/5 transition-colors">
                  <X className="w-5 h-5 text-gray-400" />
                </button>
              </div>

              {/* Tabs */}
              <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
                <TabsList className="grid grid-cols-2 bg-dark-700 p-1 m-3 rounded-xl">
                  <TabsTrigger value="global" className="rounded-lg data-[state=active]:bg-dark-600 data-[state=active]:text-white text-gray-400 text-sm">
                    <Users className="w-4 h-4 mr-2" />
                    Global
                  </TabsTrigger>
                  <TabsTrigger value="support" className="rounded-lg data-[state=active]:bg-dark-600 data-[state=active]:text-white text-gray-400 text-sm">
                    <Headphones className="w-4 h-4 mr-2" />
                    Support
                  </TabsTrigger>
                </TabsList>

                {/* Global Chat */}
                <TabsContent value="global" className="flex-1 flex flex-col m-0 mt-0">
                  <div className="flex-1 overflow-y-auto p-3 space-y-3 max-h-[400px]">
                    {messages.length === 0 ? (
                      <div className="text-center text-gray-500 py-8">
                        <MessageSquare className="w-12 h-12 mx-auto mb-2 opacity-50" />
                        <p className="text-sm">No messages yet. Be the first!</p>
                      </div>
                    ) : (
                      messages.slice().reverse().map((msg) => (
                        <div
                          key={msg.id}
                          className={`flex flex-col ${msg.userId === user?.id ? 'items-end' : 'items-start'}`}
                        >
                          <div className={`max-w-[80%] px-3 py-2 rounded-xl ${
                            msg.userId === user?.id 
                              ? 'bg-neon-green/20 text-white' 
                              : msg.isAdmin 
                                ? 'bg-neon-purple/20 text-white'
                                : 'bg-dark-700 text-gray-300'
                          }`}>
                            <div className="flex items-center gap-2 mb-1">
                              <span className={`text-xs font-medium ${msg.isAdmin ? 'text-neon-purple' : 'text-gray-400'}`}>
                                {msg.username}
                                {msg.isAdmin && ' 👑'}
                              </span>
                              <span className="text-[10px] text-gray-500">{formatTime(msg.timestamp)}</span>
                            </div>
                            <p className="text-sm">{msg.message}</p>
                          </div>
                        </div>
                      ))
                    )}
                    <div ref={messagesEndRef} />
                  </div>

                  {/* Input */}
                  {user && (
                    <form onSubmit={handleSendMessage} className="p-3 border-t border-white/5">
                      <div className="flex gap-2">
                        <Input
                          value={messageInput}
                          onChange={(e) => setMessageInput(e.target.value)}
                          placeholder="Type a message..."
                          className="flex-1 bg-dark-700 border-white/10 text-white text-sm"
                        />
                        <Button type="submit" size="icon" className="bg-neon-green text-dark-900 hover:bg-neon-green/90">
                          <Send className="w-4 h-4" />
                        </Button>
                      </div>
                    </form>
                  )}
                </TabsContent>

                {/* Support Chat */}
                <TabsContent value="support" className="flex-1 flex flex-col m-0 mt-0">
                  <div className="flex-1 overflow-y-auto p-3 space-y-3 max-h-[400px]">
                    {userSupportMessages.length === 0 ? (
                      <div className="text-center text-gray-500 py-8">
                        <Headphones className="w-12 h-12 mx-auto mb-2 opacity-50" />
                        <p className="text-sm">{isAdmin ? 'No support tickets yet' : 'Start a conversation with support'}</p>
                      </div>
                    ) : (
                      userSupportMessages.slice().reverse().map((msg) => (
                        <div
                          key={msg.id}
                          className={`flex flex-col ${msg.isAdmin ? 'items-start' : 'items-end'}`}
                        >
                          <div className={`max-w-[80%] px-3 py-2 rounded-xl ${
                            msg.isAdmin 
                              ? 'bg-neon-purple/20 text-white' 
                              : 'bg-neon-green/20 text-white'
                          }`}>
                            <div className="flex items-center gap-2 mb-1">
                              <span className={`text-xs font-medium ${msg.isAdmin ? 'text-neon-purple' : 'text-neon-green'}`}>
                                {msg.isAdmin ? 'Support Team 👑' : msg.username}
                              </span>
                              <span className="text-[10px] text-gray-500">{formatTime(msg.timestamp)}</span>
                            </div>
                            <p className="text-sm">{msg.message}</p>
                          </div>
                        </div>
                      ))
                    )}
                    <div ref={supportEndRef} />
                  </div>

                  {/* Input */}
                  {user && (
                    <form onSubmit={handleSendSupport} className="p-3 border-t border-white/5">
                      <div className="flex gap-2">
                        <Input
                          value={supportInput}
                          onChange={(e) => setSupportInput(e.target.value)}
                          placeholder={isAdmin ? "Reply to user..." : "Ask support..."}
                          className="flex-1 bg-dark-700 border-white/10 text-white text-sm"
                        />
                        <Button type="submit" size="icon" className="bg-neon-purple text-white hover:bg-neon-purple/90">
                          <Send className="w-4 h-4" />
                        </Button>
                      </div>
                    </form>
                  )}
                </TabsContent>
              </Tabs>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
