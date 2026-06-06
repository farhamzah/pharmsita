import React from 'react';
import RoleLayoutComponent from '../../../layouts/MainLayout';
import ContentWrapper from '../../../components/ContentWrapper';
import { LecturerDashboardSummary } from '../components/LecturerDashboardSummary';

export const LecturerDashboardPage: React.FC = () => {
  return (
    <RoleLayoutComponent>
      <ContentWrapper title="Dashboard & Ringkasan Dosen" description="Ringkasan statistik dan aktivitas terbaru dari seluruh mahasiswa bimbingan & ujian Anda.">
        <div className="min-h-[400px]">
          <LecturerDashboardSummary />
        </div>
      </ContentWrapper>
    </RoleLayoutComponent>
  );
};

export default LecturerDashboardPage;
