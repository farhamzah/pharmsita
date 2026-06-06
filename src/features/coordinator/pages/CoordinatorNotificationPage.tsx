import React, { useState } from 'react';
import RoleLayoutComponent from '../../../layouts/MainLayout';
import ContentWrapper from '../../../components/ContentWrapper';
import { SectionCard } from '../../../components/ui/SectionCard';
import { Bell, Send } from 'lucide-react';
import { notificationMock } from '../../../mock-data/coordinator-ui-mocks';

export const CoordinatorNotificationPage: React.FC = () => {
  const [compose, setCompose] = useState(false);

  return (
    <RoleLayoutComponent>
      <ContentWrapper 
        title="Pusat Pengumuman" 
        description="Buat dan kelola notifikasi massal untuk mahasiswa dan dosen"
        headerRight={
          <button onClick={() => setCompose(!compose)} className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground text-sm font-semibold rounded-md shadow-sm hover:bg-primary/90 transition-colors">
            {compose ? 'Lihat Riwayat Broadcast' : 'Buat Pengumuman Baru'}
          </button>
        }
      >
        {compose ? (
          <SectionCard title="Buat Pengumuman Baru" className="animate-in fade-in" align="center">
            <div className="bg-card border rounded-xl overflow-hidden shadow-sm max-w-3xl mx-auto">
              <div className="p-4 bg-muted/30 border-b">
                <p className="text-sm text-muted-foreground">Notifikasi akan dikirim langsung ke sistem dan email institusi target dalam hitungan detik.</p>
              </div>
              <form className="p-6 space-y-5">
                <div>
                  <label className="block text-sm font-semibold mb-1.5 text-foreground">Target Penerima</label>
                  <select className="w-full p-2.5 border border-input rounded-md bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 font-medium">
                    <option>Semua Mahasiswa Aktif TA</option>
                    <option>Semua Dosen Pembimbing & Penguji</option>
                    <option>Mahasiswa Tugas Akhir (Skripsi)</option>
                    <option>Mahasiswa Tugas Akhir (Non-Skripsi)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-1.5 text-foreground">Judul Pengumuman</label>
                  <input type="text" placeholder="Masukkan judul ringkas (cth: Batas Akhir Submit Dokumen)" className="w-full p-2.5 border border-input rounded-md bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" />
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-1.5 text-foreground">Isi Pesan / Instruksi</label>
                  <textarea rows={6} placeholder="Tuliskan pengumuman lengkap secara mendetail di sini..." className="w-full p-3 border border-input rounded-md bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none" />
                </div>
                <div className="pt-2">
                  <button type="submit" className="w-full sm:w-auto flex justify-center items-center gap-2 px-8 py-2.5 bg-primary text-primary-foreground font-semibold rounded-md shadow-sm hover:bg-primary/90 transition-colors">
                    <Send className="w-4 h-4" /> Publikasikan Notifikasi
                  </button>
                </div>
              </form>
            </div>
          </SectionCard>
        ) : (
          <div className="space-y-4 animate-in fade-in">
            {notificationMock.map(notif => (
              <div key={notif.id} className="p-5 border border-border/50 rounded-xl bg-card shadow-sm hover:border-primary/30 hover:shadow-md transition-all">
                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start mb-3 gap-2">
                  <h3 className="font-bold text-lg flex items-center gap-2.5 text-foreground">
                    <div className="p-1.5 bg-primary/10 rounded-full text-primary"><Bell className="w-4 h-4" /></div>
                    {notif.title}
                  </h3>
                  <span className="text-xs bg-muted text-muted-foreground px-3 py-1 rounded-full font-semibold border inline-flex items-center self-start">Target: {notif.target}</span>
                </div>
                <p className="text-sm text-muted-foreground mb-4 leading-relaxed bg-muted/20 p-3 rounded-lg border border-transparent">{notif.message}</p>
                <p className="text-xs text-muted-foreground font-medium flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block"></span> Terkirim pada {new Intl.DateTimeFormat('id-ID', { dateStyle: 'full', timeStyle: 'short' }).format(new Date(notif.date))} WIB
                </p>
              </div>
            ))}
          </div>
        )}
      </ContentWrapper>
    </RoleLayoutComponent>
  );
};

export default CoordinatorNotificationPage;
