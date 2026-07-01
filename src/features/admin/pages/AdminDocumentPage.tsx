import React, { useEffect, useState } from 'react';
import ContentWrapper from '../../../components/ContentWrapper';
import MainLayout from '../../../layouts/MainLayout';
import DataTable from '../../../components/ui/DataTable';
import Button from '../../../components/ui/Button';
import BaseModal from '../../../components/ui/BaseModal';
import { Plus, Download, UploadCloud, FileIcon } from 'lucide-react';
import { adminApi } from '../../../core/api/domain';
import type { AdminMasterRecord } from '../../../core/services/admin-data-service';

type DocumentRow = {
  id: string;
  title: string;
  category: string;
  version: string;
  date: string;
};

const formatDocumentRow = (record: AdminMasterRecord): DocumentRow => ({
  id: String(record.id || record.name || crypto.randomUUID()),
  title: String(record.title || record.name || '-'),
  category: String(record.category || record.isRequired || record.allowedTypes || '-'),
  version: String(record.version || record.status || '-'),
  date: String(record.updatedAt || record.updated_at || record.createdAt || record.created_at || '-'),
});

const AdminDocumentPage: React.FC = () => {
  const [openModal, setOpenModal] = useState(false);
  const [documents, setDocuments] = useState<DocumentRow[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    adminApi
      .listSupportingDocuments()
      .then((response) => {
        if (!mounted) return;
        setDocuments(response.data.map(formatDocumentRow));
        setLoadError(null);
      })
      .catch(() => {
        if (!mounted) return;
        setDocuments([]);
        setLoadError('Dokumen pendukung belum bisa dimuat dari backend.');
      });

    return () => {
      mounted = false;
    };
  }, []);

  return (
    <MainLayout>
      <ContentWrapper
        title="Dokumen Pendukung"
        description="Kelola dokumen template standar dan formulir untuk mahasiswa & dosen."
        headerRight={
          <Button 
            className="flex items-center gap-2"
            onClick={() => setOpenModal(true)}
          >
            <Plus size={16} /> Upload Dokumen
          </Button>
        }
      >
        {loadError && (
          <p className="mb-4 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-700">
            {loadError}
          </p>
        )}
        <DataTable
          data={documents}
          columns={[
            { key: 'title', label: 'Nama Dokumen' },
            { 
              key: 'category', 
              label: 'Kategori',
              render: (row: any) => <span className="bg-blue-50 text-blue-700 px-2 py-1 rounded text-xs font-semibold border border-blue-100">{row.category}</span>
            },
            { key: 'version', label: 'Versi', render: (row: any) => <span className="text-muted-foreground">v{row.version}</span> },
            { key: 'date', label: 'Tgl Diperbarui' },
            {
              key: 'actions',
              label: 'Aksi',
              render: () => (
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" title="Download"><Download size={14} /></Button>
                  <Button variant="outline" size="sm">Update Versi</Button>
                </div>
              )
            }
          ]}
        />

        {/* Modal Upload Dokumen */}
        <BaseModal
          open={openModal}
          onClose={() => setOpenModal(false)}
          title="Upload Dokumen Baru"
          maxWidth="lg"
        >
          <form className="space-y-5" onSubmit={(e) => { e.preventDefault(); setOpenModal(false); }}>
            <div>
              <label className="block text-sm font-semibold mb-1.5 text-foreground">Nama Dokumen</label>
              <input 
                type="text" 
                placeholder="Contoh: Template Laporan Akhir Tugas Akhir"
                className="w-full p-2.5 border border-input rounded-md bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold mb-1.5 text-foreground">Kategori</label>
                <select className="w-full p-2.5 border border-input rounded-md bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 font-medium">
                  <option>Template</option>
                  <option>Formulir</option>
                  <option>Panduan</option>
                  <option>SK Rektor/Dekan</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold mb-1.5 text-foreground">Versi Dokumen</label>
                <input 
                  type="text" 
                  placeholder="Contoh: 1.0"
                  className="w-full p-2.5 border border-input rounded-md bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold mb-1.5 text-foreground">Pilih Berkas (PDF/DOCX/XLSX)</label>
              <div className="border-2 border-dashed border-border/60 rounded-xl p-8 hover:border-primary/50 hover:bg-primary/5 transition-all text-center group cursor-pointer relative">
                <input 
                  type="file" 
                  className="absolute inset-0 opacity-0 cursor-pointer"
                  required
                />
                <div className="flex flex-col items-center gap-2">
                  <div className="p-3 bg-muted rounded-full text-muted-foreground group-hover:text-primary group-hover:bg-primary/10 transition-colors">
                    <UploadCloud size={24} />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-foreground">Klik untuk pilih berkas atau tarik ke sini</p>
                    <p className="text-xs text-muted-foreground mt-1">Maksimal ukuran file: 10MB</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t">
              <button
                type="button"
                onClick={() => setOpenModal(false)}
                className="px-4 py-2 text-sm font-medium border rounded-md hover:bg-muted font-heading"
              >
                Batal
              </button>
              <button
                type="submit"
                className="flex items-center gap-2 px-6 py-2 text-sm font-medium bg-primary text-primary-foreground rounded-md hover:bg-primary/90 font-heading"
              >
                <FileIcon size={14} /> Simpan Dokumen
              </button>
            </div>
          </form>
        </BaseModal>
      </ContentWrapper>
    </MainLayout>
  );
};

export default AdminDocumentPage;
