import React, { useState } from 'react';
import { BaseCard as Card } from '../../../components/ui/BaseCard';
import type { GuidanceActivity, GuidanceStatus } from '../../../mock-data/lecturer-ui-mocks';
import { Send, FileText, CheckCircle, AlertCircle, MessageSquare } from 'lucide-react';

interface LecturerGuidanceTableProps {
  data: GuidanceActivity[];
}

export const LecturerGuidanceTable: React.FC<LecturerGuidanceTableProps> = ({ data }) => {
  const [activities, setActivities] = useState<GuidanceActivity[]>(data);
  const [newMessage, setNewMessage] = useState('');
  const [isRevisi, setIsRevisi] = useState(false);

  // Status Badge Helper
  const getStatusBadge = (status: GuidanceStatus) => {
    switch (status) {
      case 'approve':
        return (
          <span className="flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300">
            <CheckCircle className="w-3.5 h-3.5" /> Approve
          </span>
        );
      case 'revisi':
        return (
          <span className="flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-full bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300">
            <AlertCircle className="w-3.5 h-3.5" /> Revisi
          </span>
        );
      default:
        return (
          <span className="flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300">
            <MessageSquare className="w-3.5 h-3.5" /> Send
          </span>
        );
    }
  };

  const handleApprove = (id: string) => {
    setActivities(activities.map(a => a.id === id ? { ...a, status: 'approve' } : a));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim()) return;

    const newActivity: GuidanceActivity = {
      id: `g${Date.now()}`,
      date: new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }).format(new Date()),
      author: 'Anda (Dosen)',
      role: 'Dosen',
      message: newMessage,
      status: isRevisi ? 'revisi' : 'send',
    };

    setActivities([...activities, newActivity]);
    setNewMessage('');
    setIsRevisi(false);
  };

  return (
    <div className="space-y-6">
      {/* List / Timeline Bimbingan */}
      <h3 className="text-xl font-semibold tracking-tight border-b pb-2">Log Bimbingan & Arahan</h3>
      
      <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
        {activities.map((item) => {
          const isDosen = item.role === 'Dosen';
          const isRevisiStatus = item.status === 'revisi';

          return (
            <div 
              key={item.id} 
              className={`relative flex gap-4 p-5 rounded-xl border ${
                isRevisiStatus 
                  ? 'bg-amber-50/50 border-amber-200 dark:bg-amber-950/20 dark:border-amber-900/50' 
                  : isDosen 
                    ? 'bg-blue-50/50 border-blue-100 dark:bg-blue-950/20 dark:border-blue-900/50' 
                    : 'bg-card border-border shadow-sm'
              }`}
            >
              <div className="flex-1 space-y-2">
                <div className="flex justify-between items-start">
                  <div>
                    <h4 className="font-semibold text-foreground flex items-center gap-2">
                      {item.author} 
                      <span className="text-xs font-normal text-muted-foreground bg-muted px-2 py-0.5 rounded-full">{item.role}</span>
                    </h4>
                    <p className="text-xs text-muted-foreground mt-1">{item.date}</p>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    {getStatusBadge(item.status)}
                    {isDosen && isRevisiStatus && (
                      <button 
                        onClick={() => handleApprove(item.id)}
                        className="text-[10px] uppercase font-bold tracking-wider text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 dark:hover:text-emerald-300 bg-emerald-100 hover:bg-emerald-200 dark:bg-emerald-900/30 dark:hover:bg-emerald-900/60 px-2 py-1 rounded transition-colors"
                      >
                        Tandai Selesai (Approve)
                      </button>
                    )}
                  </div>
                </div>

                <div className="text-sm text-foreground/90 leading-relaxed whitespace-pre-wrap">
                  {item.message}
                </div>

                {item.attachment && (
                  <div className="mt-3 flex items-center gap-2 text-sm text-primary bg-primary/5 w-fit px-3 py-1.5 rounded-md border border-primary/10 hover:bg-primary/10 transition-colors cursor-pointer">
                    <FileText className="w-4 h-4" />
                    <span className="font-medium underline-offset-4 hover:underline">{item.attachment}</span>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Input Dosen Area */}
      <Card className="p-5 mt-8 border-primary/20 bg-primary/5">
        <h4 className="font-semibold mb-4 text-primary flex items-center gap-2">
          <MessageSquare className="w-4 h-4" /> Berikan Arahan / Catatan Bimbingan
        </h4>
        <form onSubmit={handleSubmit} className="space-y-4">
          <textarea
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Ketik catatan bimbingan atau penjelasan revisi di sini..."
            className="w-full min-h-[100px] p-3 text-sm rounded-md border border-input focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent bg-background shadow-sm resize-y"
            required
          />
          <div className="flex items-center justify-between">
            <div className="flex gap-4">
              <label className="flex items-center gap-2 cursor-pointer text-sm font-medium">
                <input 
                  type="radio" 
                  name="statusType" 
                  checked={!isRevisi} 
                  onChange={() => setIsRevisi(false)}
                  className="w-4 h-4 text-primary focus:ring-primary"
                />
                <span className="text-foreground">Kirim Pesan Biasa (Send)</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer text-sm font-medium">
                <input 
                  type="radio" 
                  name="statusType" 
                  checked={isRevisi} 
                  onChange={() => setIsRevisi(true)}
                  className="w-4 h-4 text-amber-500 focus:ring-amber-500"
                />
                <span className="text-amber-600 dark:text-amber-500">Perlu Revisi (Warning)</span>
              </label>
            </div>
            
            <button 
              type="submit"
              className="px-6 py-2 bg-primary text-primary-foreground font-medium rounded-md hover:bg-primary/90 transition-colors flex items-center gap-2 shadow-sm focus:outline-none focus:ring-2 focus:ring-ring"
            >
              <Send className="w-4 h-4" /> Kirim
            </button>
          </div>
        </form>
      </Card>
    </div>
  );
};
