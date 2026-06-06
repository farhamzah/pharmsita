import React from 'react';
import RoleLayoutComponent from '../../../layouts/MainLayout';
import ContentWrapper from '../../../components/ContentWrapper';
import { coordinatorStudentMock } from '../../../mock-data/coordinator-ui-mocks';
import { SharedStudentDetail } from '../../../components/shared/SharedStudentDetail';
import { getCurrentRolePath } from '../../../lib/getCurrentRolePath';

export const CoordinatorStudentDetailPage: React.FC = () => {
  const hash = window.location.hash;
  const idMatch = hash.match(/detail\/(\d+)$/);
  const studentId = idMatch ? idMatch[1] : '1';
  
  const student = coordinatorStudentMock.find(s => s.id === studentId) || coordinatorStudentMock[0];

  return (
    <RoleLayoutComponent>
      <ContentWrapper>
        <SharedStudentDetail 
          student={student} 
          onBack={() => window.location.hash = `#/${getCurrentRolePath()}/monitoring`} 
          showValidationPanel={true}
        />
      </ContentWrapper>
    </RoleLayoutComponent>
  );
};

export default CoordinatorStudentDetailPage;
