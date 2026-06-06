import { useMemo, useState } from "react";
import type { ProposalNote } from "../../../../../mock-data/student-ui-mocks";

export function useProposalNotesTable(initialData: ProposalNote[]) {
  const [data, setData] = useState<ProposalNote[]>(initialData);
  const [search, setSearch] = useState('');
  const [sortKey, setSortKey] = useState<keyof ProposalNote>('date');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [page, setPage] = useState(1);

  const pageSize = 5;

  const filteredData = useMemo(() => {
    return data.filter((item) =>
      Object.keys(item)
        .filter((key) => key !== 'id') // Exclude ID from search
        .map((key) => String(item[key as keyof ProposalNote]))
        .join(' ')
        .toLowerCase()
        .includes(search.toLowerCase()),
    );
  }, [data, search]);

  const sortedData = useMemo(() => {
    return [...filteredData].sort((a, b) => {
      const aValue = String(a[sortKey]);
      const bValue = String(b[sortKey]);

      if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
  }, [filteredData, sortKey, sortDirection]);

  const paginatedData = useMemo(() => {
    const start = (page - 1) * pageSize;
    return sortedData.slice(start, start + pageSize);
  }, [sortedData, page]);

  const totalPages = Math.ceil(sortedData.length / pageSize) || 1;

  const handleSort = (key: keyof ProposalNote) => {
    if (key === sortKey) {
      setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDirection('asc');
    }
  };

  const addNote = (newNote: Omit<ProposalNote, 'id'>) => {
    const nextId = data.length > 0 ? Math.max(...data.map(d => d.id)) + 1 : 1;
    setData([{ id: nextId, ...newNote }, ...data]);
  };

  const updateNoteStatus = (id: number, newStatus: ProposalNote['status']) => {
    setData((prev) => prev.map(note => note.id === id ? { ...note, status: newStatus } : note));
  };

  return {
    data,
    search,
    setSearch,
    sortKey,
    sortDirection,
    handleSort,
    page,
    setPage,
    paginatedData,
    totalPages,
    addNote,
    updateNoteStatus,
  };
}

