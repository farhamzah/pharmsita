import React, { useState } from 'react';
import ContentWrapper from '../../../components/ContentWrapper';
import MainLayout from '../../../layouts/MainLayout';
import DataTable from '../../../components/ui/DataTable';
import Button from '../../../components/ui/Button';
import BaseModal from '../../../components/ui/BaseModal';
import { Plus, Send } from 'lucide-react';

type InformationRow = {
  id: string;
  title: string;
  category: string;
  target: string;
  status: string;
  date: string;
};

const informationRows: InformationRow[] = [];

const AdminInformationPage: React.FC = () => {
  const [openModal, setOpenModal] = useState(false);

  return (
    <MainLayout>
      <ContentWrapper
        title="Informasi & Panduan"
        description="Kelola pengumuman, panduan, dan FAQ yang tampil di dashboard pengguna."
        headerRight={
          <Button 
            className="flex items-center gap-2"
            onClick={() => setOpenModal(true)}
          >
            <Plus size={16} /> Buat Konten
          </Button>
        }
      >
        <DataTable
          data={informationRows}
          columns={[
            { key: 'title', label: 'Judul Informasi' },
            { 
              key: 'category', 
              label: 'Kategori',
              render: (row: any) => <span className={`text-xs font-semibold px-2 py-1 rounded ${row.category === 'Panduan' ? 'bg-indigo-100 text-indigo-700' : 'bg-amber-100 text-amber-700'}`}>{row.category}</span>
            },
            { key: 'target', label: 'Target Audience' },
            { key: 'date', label: 'Tgl Dibuat' },
            { 
              key: 'status', 
              label: 'Status',
              render: (row: any) => (
                <span className={`text-xs font-semibold px-2 py-1 rounded-full ${row.status === 'Publish' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'}`}>{row.status}</span>
              )
            },
            {
              key: 'actions',
              label: 'Aksi',
              render: () => <Button variant="outline" size="sm">Edit</Button>
            }
          ]}
        />

        {/* Modal Tambah Konten */}
        <BaseModal
          open={openModal}
          onClose={() => setOpenModal(false)}
          title="Buat Konten Informasi Baru"
          maxWidth="lg"
        >
          <form className="space-y-5" onSubmit={(e) => { e.preventDefault(); setOpenModal(false); }}>
            <div>
              <label className="block text-sm font-semibold mb-1.5 text-foreground">Judul Konten</label>
              <input 
                type="text" 
                placeholder="Contoh: Jadwal Pelaksanaan Sidang Gelombang 1"
                className="w-full p-2.5 border border-input rounded-md bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold mb-1.5 text-foreground">Kategori</label>
                <select className="w-full p-2.5 border border-input rounded-md bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 font-medium">
                  <option>Pengumuman</option>
                  <option>Panduan</option>
                  <option>FAQ</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold mb-1.5 text-foreground">Target Audience</label>
                <select className="w-full p-2.5 border border-input rounded-md bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 font-medium">
                  <option>Semua</option>
                  <option>Mahasiswa</option>
                  <option>Dosen</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold mb-1.5 text-foreground">Isi Konten / Detail</label>
              <textarea 
                rows={6} 
                placeholder="Tuliskan isi informasi secara lengkap di sini..." 
                className="w-full p-3 border border-input rounded-md bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none"
                required
              />
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t">
              <button
                type="button"
                onClick={() => setOpenModal(false)}
                className="px-4 py-2 text-sm font-medium border rounded-md hover:bg-muted"
              >
                Batal
              </button>
              <button
                type="submit"
                className="flex items-center gap-2 px-6 py-2 text-sm font-medium bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
              >
                <Send size={14} /> Terbitkan Konten
              </button>
            </div>
          </form>
        </BaseModal>
      </ContentWrapper>
    </MainLayout>
  );
};

export default AdminInformationPage;
