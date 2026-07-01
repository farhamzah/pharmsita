import React, { useEffect, useState } from 'react';
import RoleLayoutComponent from '../../../layouts/MainLayout';
import ContentWrapper from '../../../components/ContentWrapper';
import { SharedStudentDetail } from '../../../components/shared/SharedStudentDetail';
import { getCurrentRolePath } from '../../../lib/getCurrentRolePath';
import { coordinatorWorkflowApi, type StudentDirectoryItem } from '../../../core/api/domain';

const mapDirectoryStudent = (student: StudentDirectoryItem) => ({
  id: student.id,
  name: student.name,
  nim: student.nim || student.identifier,
  title: student.thesisTitle || 'Belum mengajukan judul',
});

export const CoordinatorStudentDetailPage: React.FC = () => {
  const hash = window.location.hash;
  const idMatch = hash.match(/detail\/([^/]+)$/);
  const studentId = idMatch ? decodeURIComponent(idMatch[1]) : '';
  const [student, setStudent] = useState<ReturnType<typeof mapDirectoryStudent> | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    coordinatorWorkflowApi
      .listStudents({ limit: 100 })
      .then((response) => {
        if (!mounted) return;
        const found = response.data.find((item) => item.id === studentId);
        setStudent(found ? mapDirectoryStudent(found) : null);
        setLoadError(found ? null : 'Mahasiswa tidak ditemukan.');
      })
      .catch(() => {
        if (!mounted) return;
        setStudent(null);
        setLoadError('Detail mahasiswa belum bisa dimuat dari backend.');
      })
      .finally(() => {
        if (mounted) setIsLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, [studentId]);

  return (
    <RoleLayoutComponent>
      <ContentWrapper>
        {isLoading && (
          <p className="text-sm text-muted-foreground">Memuat detail mahasiswa...</p>
        )}
        {loadError && (
          <div className="rounded-xl border border-dashed border-border px-4 py-10 text-center text-sm text-muted-foreground">
            {loadError}
          </div>
        )}
        {student && (
          <SharedStudentDetail
            student={student}
            onBack={() => window.location.hash = `#/${getCurrentRolePath()}/monitoring`}
            showValidationPanel={true}
          />
        )}
      </ContentWrapper>
    </RoleLayoutComponent>
  );
};

export default CoordinatorStudentDetailPage;
