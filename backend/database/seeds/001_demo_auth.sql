-- PharmSITA Demo Auth Seed
-- Dialect: PostgreSQL-compatible SQL
-- Depends on:
--   migrations/001_auth_master_data.sql
--   migrations/002_permissions_and_workflow.sql
--   migrations/003_multi_role_first_login.sql

INSERT INTO users (
  id,
  role,
  identifier,
  name,
  email,
  status,
  password_hash,
  password_status,
  force_change_on_login,
  first_login_completed_at,
  password_changed_at
)
VALUES
  (
    '00000000-0000-4000-8000-000000000001',
    'mahasiswa',
    'mahasiswa',
    'Dimas Indra Jaya',
    'mahasiswa@pharmsita.local',
    'Aktif',
    'scrypt:0b69eec202fc1a676a969ff070e28e4c:f3d8b56effd8ba99793c4762eebec68ac4f6da867534e8bf221e81eadb3325e5d45d1d7caa325d3df1c6a7480db8c38838650d6f32b9f1f525e70fefd396e57c',
    'active',
    FALSE,
    NOW(),
    NOW()
  ),
  (
    '00000000-0000-4000-8000-000000000002',
    'dosen',
    'dosen',
    'Dr. Budi Harto, M.Farm.',
    'dosen@pharmsita.local',
    'Aktif',
    'scrypt:4d123bd883f41bd11be0f9a0bf6e5071:36d0110db95a2623e0907c8cea0fd4830c570affa44d7ffbb9c3b2dfb0221f06bcce9250196847d15518326df3511b23fdac8bf0a62cf24d55d1489e3f69f974',
    'active',
    FALSE,
    NOW(),
    NOW()
  ),
  (
    '00000000-0000-4000-8000-000000000003',
    'admin',
    'admin',
    'Admin PharmSITA',
    'admin@pharmsita.local',
    'Aktif',
    'scrypt:540f28901ea6a74d902bf8797fc28851:fe74aefabc4a262c4fdc3fcd5d710a4cfba77b21f120cc3482f8e71d09828f0b8700fd04abd4c466e1f6a453c553270f7bf9da5c42663f2d8fa7ccf8a0dded84',
    'active',
    FALSE,
    NOW(),
    NOW()
  ),
  (
    '00000000-0000-4000-8000-000000000004',
    'koordinator',
    'kordinator',
    'Koordinator TA',
    'koordinator@pharmsita.local',
    'Aktif',
    'scrypt:dc7eab25e3de153334ba13b2aef6001e:2f32d47bdc9f546c1f8281f82d3ac85d25a599295099b24ad3c8dc0fdc97616b895758e6cee0908ae9fce2fcd05664894fedf8c8dd9cce2355bb0945fad22fd9',
    'active',
    FALSE,
    NOW(),
    NOW()
  ),
  (
    '00000000-0000-4000-8000-000000000005',
    'dosen',
    'multi',
    'Dr. Multi Peran, M.Farm.',
    'multi@pharmsita.local',
    'Aktif',
    'scrypt:0b69eec202fc1a676a969ff070e28e4c:f3d8b56effd8ba99793c4762eebec68ac4f6da867534e8bf221e81eadb3325e5d45d1d7caa325d3df1c6a7480db8c38838650d6f32b9f1f525e70fefd396e57c',
    'active',
    FALSE,
    NOW(),
    NOW()
  ),
  (
    '00000000-0000-4000-8000-000000000006',
    'mahasiswa',
    'firstlogin',
    'Mahasiswa Aktivasi Pertama',
    'firstlogin@pharmsita.local',
    'Aktif',
    'scrypt:0b69eec202fc1a676a969ff070e28e4c:f3d8b56effd8ba99793c4762eebec68ac4f6da867534e8bf221e81eadb3325e5d45d1d7caa325d3df1c6a7480db8c38838650d6f32b9f1f525e70fefd396e57c',
    'needs_activation',
    TRUE,
    NULL,
    NULL
  )
ON CONFLICT (id) DO UPDATE
SET
  role = EXCLUDED.role,
  identifier = EXCLUDED.identifier,
  name = EXCLUDED.name,
  email = EXCLUDED.email,
  status = EXCLUDED.status,
  password_hash = EXCLUDED.password_hash,
  password_status = EXCLUDED.password_status,
  force_change_on_login = EXCLUDED.force_change_on_login,
  first_login_completed_at = EXCLUDED.first_login_completed_at,
  password_changed_at = EXCLUDED.password_changed_at,
  updated_at = NOW();

INSERT INTO user_roles (user_id, role, status)
VALUES
  ('00000000-0000-4000-8000-000000000001', 'mahasiswa', 'Aktif'),
  ('00000000-0000-4000-8000-000000000002', 'dosen', 'Aktif'),
  ('00000000-0000-4000-8000-000000000003', 'admin', 'Aktif'),
  ('00000000-0000-4000-8000-000000000004', 'koordinator', 'Aktif'),
  ('00000000-0000-4000-8000-000000000005', 'dosen', 'Aktif'),
  ('00000000-0000-4000-8000-000000000005', 'koordinator', 'Aktif'),
  ('00000000-0000-4000-8000-000000000006', 'mahasiswa', 'Aktif')
ON CONFLICT (user_id, role) DO UPDATE
SET
  status = EXCLUDED.status,
  updated_at = NOW();

INSERT INTO student_profiles (user_id, nim, program_studi, angkatan, kelas)
VALUES
  (
    '00000000-0000-4000-8000-000000000001',
    '220110001',
    'S1 Farmasi',
    '2022',
    'FA-22-01'
  ),
  (
    '00000000-0000-4000-8000-000000000006',
    '220110099',
    'S1 Farmasi',
    '2022',
    'FA-22-02'
  )
ON CONFLICT (user_id) DO UPDATE
SET
  nim = EXCLUDED.nim,
  program_studi = EXCLUDED.program_studi,
  angkatan = EXCLUDED.angkatan,
  kelas = EXCLUDED.kelas,
  updated_at = NOW();

INSERT INTO lecturer_profiles (user_id, nidn, expertise, quota_limit)
VALUES
  (
    '00000000-0000-4000-8000-000000000002',
    '221011401065',
    'Farmasetika',
    8
  ),
  (
    '00000000-0000-4000-8000-000000000005',
    '221011401099',
    'Manajemen Farmasi',
    8
  )
ON CONFLICT (user_id) DO UPDATE
SET
  nidn = EXCLUDED.nidn,
  expertise = EXCLUDED.expertise,
  quota_limit = EXCLUDED.quota_limit,
  updated_at = NOW();

INSERT INTO admin_profiles (user_id, employee_number)
VALUES (
  '00000000-0000-4000-8000-000000000003',
  'ADM-001'
)
ON CONFLICT (user_id) DO UPDATE
SET
  employee_number = EXCLUDED.employee_number,
  updated_at = NOW();

INSERT INTO coordinator_profiles (user_id, employee_number)
VALUES
  (
    '00000000-0000-4000-8000-000000000004',
    'KOR-001'
  ),
  (
    '00000000-0000-4000-8000-000000000005',
    'KOR-099'
  )
ON CONFLICT (user_id) DO UPDATE
SET
  employee_number = EXCLUDED.employee_number,
  updated_at = NOW();
