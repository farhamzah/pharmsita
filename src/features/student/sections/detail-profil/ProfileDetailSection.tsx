import ProfileCard from "../../components/profile/ProfileCard";

import { profileDataMock } from "../../../../mock-data/student-ui-mocks";

const DetailProfilSection = () => {
  return (
    <section>
      <ProfileCard data={profileDataMock} />
    </section>
  );
};

export default DetailProfilSection;
