'use client';

import { useState, forwardRef, useImperativeHandle } from "react";
import DataTable from "@/components/ui/DataTable";
import DataTableToolbar from "@/components/ui/DataTableToolbar";
import DataTablePagination from "@/components/ui/DataTablePagination";
import DataTableStatusBadge from "@/components/ui/DataTableStatusBadge";
import { SectionCard } from "../../../../components/ui/SectionCard";
import { BaseCard } from "../../../../components/ui/BaseCard";
import BaseModal from "../../../../components/ui/BaseModal";
import type { ProposalNote } from "../../../../mock-data/student-ui-mocks";
import { useProposalNotesTable } from "./hooks/use-proposal-notes-table";
import { AuthService } from "../../../../core/services/auth-service";

interface Props {
  data: ProposalNote[];
  canAddNote: boolean;
}

export interface ProposalNotesRef {
  addNote: (note: Omit<ProposalNote, 'id'>) => void;
}

const ProposalNotesSection = forwardRef<ProposalNotesRef, Props>(
  ({ data, canAddNote }, ref) => {
    const table = useProposalNotesTable(data);
    const auth = new AuthService();
    const role = auth.getRole(); // 'mahasiswa', 'dosen', etc
    const isLecturer = role === 'dosen';

    useImperativeHandle(ref, () => ({
      addNote: (note) => {
        table.addNote(note);
      }
    }));

  // Modal states
  const [modalOpen, setModalOpen] = useState(false);
  const [topic, setTopic] = useState('');
  const [noteText, setNoteText] = useState('');
  const [statusVal, setStatusVal] = useState<'send' | 'revision'>('send');

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    table.addNote({
      date: new Intl.DateTimeFormat('id-ID', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(new Date()),
      author: isLecturer ? 'Anda (Dosen)' : 'Anda (Mahasiswa)',
      topic,
      note: noteText,
      status: statusVal,
    });
    setModalOpen(false);
    setTopic('');
    setNoteText('');
    setStatusVal('send');
  };

  const handeApprove = (id: number) => {
    table.updateNoteStatus(id, 'approved');
  };

  const columns = [
    { key: "date", label: 'Date', sortable: true },
    { key: 'author', label: 'By' },
    { key: 'topic', label: 'Topic' },
    { key: 'note', label: 'Note' },
    {
      key: 'status',
      label: 'Status',
      render: (row: ProposalNote) => (
        <DataTableStatusBadge status={row.status} />
      ),
    },
    ...(isLecturer
      ? [
          {
            key: 'action',
            label: 'Aksi',
            render: (row: ProposalNote) =>
              row.status === 'revision' ? (
                <button
                  onClick={() => handeApprove(row.id)}
                  className="px-3 py-1 bg-blue-100 text-blue-700 hover:bg-blue-200 text-xs font-semibold rounded"
                >
                  Approve
                </button>
              ) : null,
          },
        ]
      : []),
  ];

  return (
    <section>
      <SectionCard title="Catatan Bimbingan & Arahan">
        <div className="space-y-4 min-w-0">
          <DataTableToolbar
            searchValue={table.search}
            onSearchChange={table.setSearch}
            actionSlot={
              canAddNote && (
                <button 
                  onClick={() => setModalOpen(true)}
                  className="rounded-md bg-primary px-6 py-3 text-xs text-white hover:bg-primary/90 transition-colors"
                >
                  + Add Note
                </button>
              )
            }
          />

          <BaseCard className="px-0 py-0 overflow-hidden">
            <DataTable
              columns={columns}
              data={table.paginatedData}
              sortKey={table.sortKey}
              sortDirection={table.sortDirection}
              onSort={(key) => table.handleSort(key as keyof ProposalNote)}
            />
          </BaseCard>

          <DataTablePagination
            currentPage={table.page}
            totalPages={table.totalPages}
            onNext={() =>
              table.setPage((p) => Math.min(p + 1, table.totalPages))
            }
            onPrev={() => table.setPage((p) => Math.max(p - 1, 1))}
          />
        </div>
      </SectionCard>

      {/* Modal Add Note */}
      <BaseModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Tambah Catatan Bimbingan"
        maxWidth="md"
      >
        <form onSubmit={handleAddSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-sm font-semibold">Topik Bimbingan</label>
            <input
              type="text"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="Contoh: Bab 1, Latar Belakang"
              required
              className="w-full border rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-primary focus:outline-none bg-background text-foreground"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-semibold">Catatan / Pembahasan</label>
            <textarea
              value={noteText}
              onChange={(e) => setNoteText(e.target.value)}
              placeholder="Detail pertanyaan atau arahan revisi..."
              required
              rows={4}
              className="w-full border rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-primary focus:outline-none bg-background text-foreground resize-none"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-semibold">Status Catatan</label>
            <div className="flex gap-4 items-center mt-1">
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input
                  type="radio"
                  name="statusNote"
                  checked={statusVal === 'send'}
                  onChange={() => setStatusVal('send')}
                  className="text-primary focus:ring-primary h-4 w-4"
                />
                Kirim Biasa (Send)
              </label>

              {isLecturer && (
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <input
                    type="radio"
                    name="statusNote"
                    checked={statusVal === 'revision'}
                    onChange={() => setStatusVal('revision')}
                    className="text-yellow-500 focus:ring-yellow-500 h-4 w-4"
                  />
                  Perlu Revisi (Revision)
                </label>
              )}
            </div>
            {!isLecturer && (
              <p className="text-xs text-muted-foreground mt-1">
                Mahasiswa hanya dapat mengirim pesan biasa. Status Revisi ditetapkan oleh dosen.
              </p>
            )}
          </div>

          <div className="flex justify-end pt-4 border-t mt-6 gap-3">
            <button
              type="button"
              onClick={() => setModalOpen(false)}
              className="px-4 py-2 text-sm font-medium border rounded-md hover:bg-muted"
            >
              Batal
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-sm font-medium bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
            >
              + Simpan Catatan
            </button>
          </div>
        </form>
      </BaseModal>
    </section>
  );
});

export default ProposalNotesSection;
