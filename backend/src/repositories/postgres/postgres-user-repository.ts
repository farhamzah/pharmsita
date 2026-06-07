import type { PostgresQueryExecutor } from "../../database/postgres/connection";
import type {
  LecturerDirectoryItem,
  StepId,
  StepStatus,
  StudentDirectoryItem,
  UserAccount,
  UserRecord,
  UserRole,
} from "../../domain/types";
import { hashPassword } from "../../security/password";
import type { UserRepository } from "../contracts";
import { toUserAccount, toUserRecord, type UserRow } from "./row-mappers";

const userColumns = `
  id,
  role,
  identifier,
  name,
  email,
  status,
  phone,
  address,
  gender,
  birth_date,
  password_hash,
  password_status,
  force_change_on_login,
  last_login_at,
  first_login_completed_at,
  password_changed_at
`;

const profileUserColumns = `
  u.id,
  u.role,
  u.identifier,
  u.name,
  u.email,
  u.status,
  u.phone,
  u.address,
  u.gender,
  u.birth_date,
  u.password_hash,
  u.password_status,
  u.force_change_on_login,
  u.last_login_at,
  u.first_login_completed_at,
  u.password_changed_at,
  sp.nim,
  sp.program_studi,
  sp.angkatan,
  sp.kelas,
  sp.skema_ta,
  sp.jenis_ta,
  lp.nidn,
  lp.expertise,
  lp.jabatan_akademik,
  lp.peran_sistem,
  cp.jabatan,
  cp.hak_akses_utama,
  ap.divisi,
  ap.tingkat_akses,
  ap.cakupan_akses
`;

const profileJoins = `
  LEFT JOIN student_profiles sp ON sp.user_id = u.id
  LEFT JOIN lecturer_profiles lp ON lp.user_id = u.id
  LEFT JOIN coordinator_profiles cp ON cp.user_id = u.id
  LEFT JOIN admin_profiles ap ON ap.user_id = u.id
`;

const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{12}$/i;

export class PostgresUserRepository implements UserRepository {
  constructor(private readonly db: PostgresQueryExecutor) {}

  async list() {
    const result = await this.db.query<UserRow>(`
      SELECT ${profileUserColumns}
      FROM users u
      ${profileJoins}
      ORDER BY u.role ASC, u.name ASC
    `);

    return result.rows.map(toUserAccount);
  }

  async listLecturerDirectory() {
    const result = await this.db.query<{
      id: string;
      identifier: string;
      name: string;
      email: string | null;
      status: "Aktif" | "Nonaktif";
      nidn: string | null;
      expertise: string | null;
      quota_limit: number;
      p1_active: string | number | null;
      p2_active: string | number | null;
      completed_count: string | number | null;
    }>(`
      SELECT
        u.id::TEXT AS id,
        u.identifier,
        u.name,
        u.email,
        u.status,
        lp.nidn,
        lp.expertise,
        COALESCE(lp.quota_limit, 0) AS quota_limit,
        COUNT(sa.id) FILTER (
          WHERE sa.supervisor_order = 1
            AND sa.status = 'Aktif'
            AND fpr.status = 'Disetujui'
        )::TEXT AS p1_active,
        COUNT(sa.id) FILTER (
          WHERE sa.supervisor_order = 2
            AND sa.status = 'Aktif'
            AND fpr.status = 'Disetujui'
        )::TEXT AS p2_active,
        COUNT(DISTINCT fpr.student_id) FILTER (
          WHERE fpr.status = 'Disetujui'
        )::TEXT AS completed_count
      FROM users u
      LEFT JOIN lecturer_profiles lp
        ON lp.user_id = u.id
      LEFT JOIN supervisor_assignments sa
        ON sa.lecturer_id = u.id
      LEFT JOIN final_project_registrations fpr
        ON fpr.id = sa.registration_id
      WHERE u.status = 'Aktif'
        AND (
          u.role = 'dosen'
          OR EXISTS (
            SELECT 1
            FROM user_roles ur
            WHERE ur.user_id = u.id
              AND ur.role = 'dosen'
              AND ur.status = 'Aktif'
          )
        )
      GROUP BY
        u.id,
        u.identifier,
        u.name,
        u.email,
        u.status,
        lp.nidn,
        lp.expertise,
        lp.quota_limit
      ORDER BY u.name ASC
    `);

    return result.rows.map((row): LecturerDirectoryItem => ({
      id: row.id,
      name: row.name,
      identifier: row.identifier,
      email: row.email || undefined,
      status: row.status,
      nidn: row.nidn || row.identifier,
      expertise: row.expertise || undefined,
      programStudi: "S1 Farmasi",
      jabatan: row.expertise ? `Dosen ${row.expertise}` : "Dosen Pembimbing",
      quotaLimit: Number(row.quota_limit || 0),
      p1Active: Number(row.p1_active || 0),
      p2Active: Number(row.p2_active || 0),
      completedCount: Number(row.completed_count || 0),
    }));
  }

  async updateLecturerQuota(
    lecturerId: string,
    input: { quotaLimit: number; actorId: string; timestamp: string }
  ) {
    await this.db.query(
      `
        INSERT INTO lecturer_profiles (user_id, quota_limit, updated_at)
        VALUES ($1, $2, $3)
        ON CONFLICT (user_id) DO UPDATE
        SET quota_limit = EXCLUDED.quota_limit,
            updated_at = EXCLUDED.updated_at
      `,
      [lecturerId, input.quotaLimit, input.timestamp]
    );

    return (
      (await this.listLecturerDirectory()).find((item) => item.id === lecturerId) ||
      null
    );
  }

  async listStudentDirectory(options: { lecturerId?: string | null } = {}) {
    const result = await this.db.query<{
      id: string;
      identifier: string;
      name: string;
      email: string | null;
      status: "Aktif" | "Nonaktif";
      nim: string | null;
      program_studi: string | null;
      angkatan: string | null;
      kelas: string | null;
      thesis_title: string | null;
      active_step_id: StepId | null;
      active_step_label: string | null;
      active_step_status: StepStatus | null;
      completed_steps: number | string | null;
      total_steps: number | string | null;
      supervisor1_id: string | null;
      supervisor1_name: string | null;
      supervisor2_id: string | null;
      supervisor2_name: string | null;
    }>(`
      WITH latest_registration AS (
        SELECT DISTINCT ON (student_id)
          id,
          student_id,
          judul_ta,
          updated_at,
          submitted_at,
          validated_at,
          created_at
        FROM final_project_registrations
        WHERE status IN ('Draft', 'Menunggu Validasi Koordinator', 'Disetujui')
        ORDER BY
          student_id,
          COALESCE(updated_at, submitted_at, validated_at, created_at) DESC,
          id DESC
      ),
      supervisor_map AS (
        SELECT
          registration_id,
          MAX(lecturer_id::TEXT) FILTER (WHERE supervisor_order = 1) AS supervisor1_id,
          MAX(lecturer_name_snapshot) FILTER (WHERE supervisor_order = 1) AS supervisor1_name,
          MAX(lecturer_id::TEXT) FILTER (WHERE supervisor_order = 2) AS supervisor2_id,
          MAX(lecturer_name_snapshot) FILTER (WHERE supervisor_order = 2) AS supervisor2_name
        FROM supervisor_assignments
        WHERE status = 'Aktif'
        GROUP BY registration_id
      ),
      progress_counts AS (
        SELECT
          student_id,
          COUNT(*) FILTER (WHERE status = 'completed') AS completed_steps,
          COUNT(*) AS total_steps
        FROM student_progress_steps
        GROUP BY student_id
      )
      SELECT
        u.id::TEXT AS id,
        u.identifier,
        u.name,
        u.email,
        u.status,
        sp.nim,
        sp.program_studi,
        sp.angkatan,
        sp.kelas,
        lr.judul_ta AS thesis_title,
        COALESCE(active_step.step_id, next_step.step_id)::TEXT AS active_step_id,
        COALESCE(active_step.label, next_step.label) AS active_step_label,
        COALESCE(active_step.status, next_step.status)::TEXT AS active_step_status,
        pc.completed_steps,
        pc.total_steps,
        sm.supervisor1_id,
        sm.supervisor1_name,
        sm.supervisor2_id,
        sm.supervisor2_name
      FROM users u
      LEFT JOIN student_profiles sp
        ON sp.user_id = u.id
      LEFT JOIN latest_registration lr
        ON lr.student_id = u.id
      LEFT JOIN supervisor_map sm
        ON sm.registration_id = lr.id
      LEFT JOIN progress_counts pc
        ON pc.student_id = u.id
      LEFT JOIN LATERAL (
        SELECT step_id, label, status
        FROM student_progress_steps
        WHERE student_id = u.id
          AND status = 'active'
        ORDER BY step_order ASC
        LIMIT 1
      ) active_step ON TRUE
      LEFT JOIN LATERAL (
        SELECT step_id, label, status
        FROM student_progress_steps
        WHERE student_id = u.id
          AND status <> 'completed'
        ORDER BY step_order ASC
        LIMIT 1
      ) next_step ON TRUE
      WHERE u.status = 'Aktif'
        AND (
          u.role = 'mahasiswa'
          OR EXISTS (
            SELECT 1
            FROM user_roles ur
            WHERE ur.user_id = u.id
              AND ur.role = 'mahasiswa'
              AND ur.status = 'Aktif'
          )
        )
      ORDER BY u.name ASC
    `);

    return result.rows.map((row): StudentDirectoryItem => {
      const completedSteps = Number(row.completed_steps || 0);
      const totalSteps = Number(row.total_steps || 0);
      const isCompleted = totalSteps > 0 && completedSteps === totalSteps;
      const supervisorRole =
        options.lecturerId && row.supervisor1_id === options.lecturerId
          ? "pembimbing-1"
          : options.lecturerId && row.supervisor2_id === options.lecturerId
            ? "pembimbing-2"
            : null;

      return {
        id: row.id,
        name: row.name,
        identifier: row.identifier,
        email: row.email || undefined,
        status: row.status,
        nim: row.nim || row.identifier,
        programStudi: row.program_studi || undefined,
        angkatan: row.angkatan || undefined,
        kelas: row.kelas || undefined,
        thesisTitle: row.thesis_title || "Tugas Akhir belum diajukan",
        activeStepId: isCompleted ? null : row.active_step_id || "pendaftaran-ta",
        activeStepLabel: isCompleted
          ? "Selesai"
          : row.active_step_label || "Pendaftaran TA",
        activeStepStatus: isCompleted ? null : row.active_step_status || "active",
        isCompleted,
        supervisor1Id: row.supervisor1_id,
        supervisor1Name: row.supervisor1_name || undefined,
        supervisor2Id: row.supervisor2_id,
        supervisor2Name: row.supervisor2_name || undefined,
        supervisorRole,
      };
    });
  }

  async replaceAll(records: UserAccount[]): Promise<UserAccount[]> {
    for (const record of records) {
      const existing = await this.findAuthRecordByIdentifier(record.identifier);
      const plainPassword =
        typeof record.password === "string" && record.password.trim().length > 0
          ? record.password.trim()
          : null;
      const isNewUser = !existing;
      const passwordHash = plainPassword
        ? hashPassword(plainPassword)
        : existing?.passwordHash || hashPassword("demo");
      const passwordStatus = plainPassword || isNewUser
        ? "needs_activation"
        : record.passwordStatus || existing.passwordStatus || "active";
      const forceChangeOnLogin = plainPassword || isNewUser
        ? true
        : record.forceChangeOnLogin ?? existing.forceChangeOnLogin ?? false;
      const firstLoginCompletedAt = plainPassword || isNewUser
        ? null
        : record.firstLoginCompletedAt ?? existing.firstLoginCompletedAt ?? null;
      const passwordChangedAt = plainPassword || isNewUser
        ? null
        : record.passwordChangedAt ?? existing.passwordChangedAt ?? null;
      const idValue = record.id && uuidPattern.test(record.id) ? record.id : null;

      const upsert = await this.db.query<UserRow>(
        `
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
            password_changed_at,
            updated_at
          )
          VALUES (
            COALESCE($1::UUID, gen_random_uuid()),
            $2,
            $3,
            $4,
            $5,
            $6,
            $7,
            $8,
            $9,
            $10,
            $11,
            NOW()
          )
          ON CONFLICT (identifier) DO UPDATE
          SET
            role = EXCLUDED.role,
            name = EXCLUDED.name,
            email = EXCLUDED.email,
            status = EXCLUDED.status,
            password_hash = EXCLUDED.password_hash,
            password_status = EXCLUDED.password_status,
            force_change_on_login = EXCLUDED.force_change_on_login,
            first_login_completed_at = EXCLUDED.first_login_completed_at,
            password_changed_at = EXCLUDED.password_changed_at,
            updated_at = NOW()
          RETURNING ${userColumns}
        `,
        [
          idValue,
          record.role,
          record.identifier,
          record.name,
          record.email || null,
          record.status,
          passwordHash,
          passwordStatus,
          forceChangeOnLogin,
          firstLoginCompletedAt,
          passwordChangedAt,
        ]
      );
      const user = upsert.rows[0];
      if (!user) {
        continue;
      }

      await this.db.query(
        `
          INSERT INTO user_roles (user_id, role, status, updated_at)
          VALUES ($1, $2, $3, NOW())
          ON CONFLICT (user_id, role) DO UPDATE
          SET status = EXCLUDED.status,
              updated_at = NOW()
        `,
        [user.id, record.role, record.status]
      );

      if (record.role === "mahasiswa") {
        await this.db.query(
          `
            INSERT INTO student_profiles (user_id, nim, program_studi, updated_at)
            VALUES ($1, $2, $3, NOW())
            ON CONFLICT (user_id) DO UPDATE
            SET nim = COALESCE(student_profiles.nim, EXCLUDED.nim),
                program_studi = COALESCE(EXCLUDED.program_studi, student_profiles.program_studi),
                updated_at = NOW()
          `,
          [user.id, record.identifier, "S1 Farmasi"]
        );
      }

      if (record.role === "dosen") {
        await this.db.query(
          `
            INSERT INTO lecturer_profiles (user_id, nidn, quota_limit, updated_at)
            VALUES ($1, $2, 8, NOW())
            ON CONFLICT (user_id) DO UPDATE
            SET nidn = COALESCE(lecturer_profiles.nidn, EXCLUDED.nidn),
                updated_at = NOW()
          `,
          [user.id, record.identifier]
        );
      }

      if (record.role === "koordinator") {
        await this.db.query(
          `
            INSERT INTO coordinator_profiles (user_id, employee_number, updated_at)
            VALUES ($1, $2, NOW())
            ON CONFLICT (user_id) DO UPDATE
            SET employee_number = COALESCE(coordinator_profiles.employee_number, EXCLUDED.employee_number),
                updated_at = NOW()
          `,
          [user.id, record.identifier]
        );
      }

      if (record.role === "admin") {
        await this.db.query(
          `
            INSERT INTO admin_profiles (user_id, employee_number, updated_at)
            VALUES ($1, $2, NOW())
            ON CONFLICT (user_id) DO UPDATE
            SET employee_number = COALESCE(admin_profiles.employee_number, EXCLUDED.employee_number),
                updated_at = NOW()
          `,
          [user.id, record.identifier]
        );
      }
    }

    return this.list();
  }

  async createUser(
    input: Omit<UserAccount, "id"> & {
      id?: string;
      password?: string;
      actorId: string;
      timestamp: string;
    }
  ) {
    const idValue = input.id && uuidPattern.test(input.id) ? input.id : null;
    const plainPassword =
      typeof input.password === "string" && input.password.trim().length > 0
        ? input.password.trim()
        : "demo";
    const result = await this.db.query<UserRow>(
      `
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
          password_changed_at,
          updated_at,
          updated_by
        )
        VALUES (
          COALESCE($1::UUID, gen_random_uuid()),
          $2,
          $3,
          $4,
          $5,
          $6,
          $7,
          'needs_activation',
          TRUE,
          NULL,
          NULL,
          $8,
          $9
        )
        RETURNING ${userColumns}
      `,
      [
        idValue,
        input.role,
        input.identifier,
        input.name,
        input.email || null,
        input.status || "Aktif",
        hashPassword(plainPassword),
        input.timestamp,
        input.actorId,
      ]
    );
    const created = result.rows[0];
    if (!created) {
      throw new Error("User gagal dibuat.");
    }

    await this.db.query(
      `
        INSERT INTO user_roles (user_id, role, status, created_at, created_by, updated_at)
        VALUES ($1, $2, $3, $4, $5, $4)
        ON CONFLICT (user_id, role) DO UPDATE
        SET status = EXCLUDED.status,
            updated_at = EXCLUDED.updated_at
      `,
      [created.id, input.role, input.status || "Aktif", input.timestamp, input.actorId]
    );

    const withProfile = await this.updateProfile(created.id, {
      ...input,
      actorId: input.actorId,
      timestamp: input.timestamp,
    });

    return withProfile || toUserAccount(created);
  }

  async updateUser(
    userId: string,
    input: Partial<Omit<UserAccount, "id">> & {
      password?: string;
      actorId: string;
      timestamp: string;
    }
  ) {
    const current = await this.findAuthRecordById(userId);
    if (!current) {
      return null;
    }

    const nextRole = input.role || current.role;
    const nextStatus = input.status || current.status;
    await this.db.query(
      `
        UPDATE users
        SET
          role = $2,
          identifier = $3,
          name = $4,
          email = $5,
          status = $6,
          updated_at = $7,
          updated_by = $8
        WHERE id = $1
      `,
      [
        userId,
        nextRole,
        input.identifier || current.identifier,
        input.name || current.name,
        input.email !== undefined ? input.email || null : current.email || null,
        nextStatus,
        input.timestamp,
        input.actorId,
      ]
    );

    if (input.role !== undefined || input.status !== undefined) {
      await this.db.query(
        `
          UPDATE user_roles
          SET status = 'Nonaktif', updated_at = $2
          WHERE user_id = $1
        `,
        [userId, input.timestamp]
      );
      await this.db.query(
        `
          INSERT INTO user_roles (user_id, role, status, created_at, created_by, updated_at)
          VALUES ($1, $2, $3, $4, $5, $4)
          ON CONFLICT (user_id, role) DO UPDATE
          SET status = EXCLUDED.status,
              updated_at = EXCLUDED.updated_at
        `,
        [userId, nextRole, nextStatus, input.timestamp, input.actorId]
      );
    }

    if (typeof input.password === "string" && input.password.trim().length > 0) {
      await this.db.query(
        `
          UPDATE users
          SET
            password_hash = $2,
            password_status = 'needs_activation',
            force_change_on_login = TRUE,
            first_login_completed_at = NULL,
            password_changed_at = NULL,
            updated_at = $3,
            updated_by = $4
          WHERE id = $1
        `,
        [userId, hashPassword(input.password.trim()), input.timestamp, input.actorId]
      );
    }

    return this.updateProfile(userId, {
      name: input.name || current.name,
      email: input.email !== undefined ? input.email : current.email,
      phone: input.phone !== undefined ? input.phone : current.phone,
      address: input.address !== undefined ? input.address : current.address,
      gender: input.gender !== undefined ? input.gender : current.gender,
      birthDate: input.birthDate !== undefined ? input.birthDate : current.birthDate,
      nim: input.nim !== undefined ? input.nim : current.nim,
      programStudi:
        input.programStudi !== undefined ? input.programStudi : current.programStudi,
      angkatan: input.angkatan !== undefined ? input.angkatan : current.angkatan,
      kelas: input.kelas !== undefined ? input.kelas : current.kelas,
      skemaTA: input.skemaTA !== undefined ? input.skemaTA : current.skemaTA,
      jenisTA: input.jenisTA !== undefined ? input.jenisTA : current.jenisTA,
      nidn: input.nidn !== undefined ? input.nidn : current.nidn,
      bidangKeahlian:
        input.bidangKeahlian !== undefined
          ? input.bidangKeahlian
          : current.bidangKeahlian,
      jabatanAkademik:
        input.jabatanAkademik !== undefined
          ? input.jabatanAkademik
          : current.jabatanAkademik,
      peranSistem:
        input.peranSistem !== undefined ? input.peranSistem : current.peranSistem,
      jabatan: input.jabatan !== undefined ? input.jabatan : current.jabatan,
      hakAksesUtama:
        input.hakAksesUtama !== undefined
          ? input.hakAksesUtama
          : current.hakAksesUtama,
      divisi: input.divisi !== undefined ? input.divisi : current.divisi,
      tingkatAkses:
        input.tingkatAkses !== undefined ? input.tingkatAkses : current.tingkatAkses,
      cakupanAkses:
        input.cakupanAkses !== undefined ? input.cakupanAkses : current.cakupanAkses,
      actorId: input.actorId,
      timestamp: input.timestamp,
    });
  }

  async updateStatus(
    userId: string,
    input: {
      status: UserAccount["status"];
      actorId: string;
      timestamp: string;
    }
  ) {
    return this.updateUser(userId, input);
  }

  async resetPassword(
    userId: string,
    input: {
      password: string;
      actorId: string;
      timestamp: string;
    }
  ) {
    return this.updateUser(userId, {
      password: input.password,
      actorId: input.actorId,
      timestamp: input.timestamp,
    });
  }

  async findById(id: string) {
    const record = await this.findAuthRecordById(id);
    return record ? this.omitPassword(record) : null;
  }

  async findByIdentifier(identifier: string) {
    const record = await this.findAuthRecordByIdentifier(identifier);
    return record ? this.omitPassword(record) : null;
  }

  async findAuthRecordById(id: string) {
    const result = await this.db.query<UserRow>(
      `
        SELECT ${profileUserColumns}
        FROM users u
        ${profileJoins}
        WHERE u.id = $1
        LIMIT 1
      `,
      [id]
    );

    return result.rows[0] ? toUserRecord(result.rows[0]) : null;
  }

  async findAuthRecordByIdentifier(identifier: string) {
    const normalized = identifier.toLowerCase();
    const result = await this.db.query<UserRow>(
      `
        SELECT ${profileUserColumns}
        FROM users u
        ${profileJoins}
        WHERE LOWER(u.identifier) = $1 OR LOWER(u.role) = $1
        ORDER BY CASE WHEN LOWER(u.identifier) = $1 THEN 0 ELSE 1 END, u.created_at ASC
        LIMIT 1
      `,
      [normalized]
    );

    return result.rows[0] ? toUserRecord(result.rows[0]) : null;
  }

  async touchLastLogin(userId: string, timestamp: string) {
    const result = await this.db.query<UserRow>(
      `
        UPDATE users
        SET last_login_at = $2, updated_at = NOW()
        WHERE id = $1
        RETURNING ${userColumns}
      `,
      [userId, timestamp]
    );

    return result.rows[0] ? toUserAccount(result.rows[0]) : null;
  }

  async updateProfile(
    userId: string,
    input: {
      name?: string;
      email?: string;
      phone?: string;
      address?: string;
      gender?: UserAccount["gender"];
      birthDate?: string;
      nim?: string;
      programStudi?: string;
      angkatan?: string;
      kelas?: string;
      skemaTA?: UserAccount["skemaTA"];
      jenisTA?: string;
      nidn?: string;
      bidangKeahlian?: string[];
      jabatanAkademik?: string;
      peranSistem?: string[];
      jabatan?: string;
      hakAksesUtama?: string[];
      divisi?: string;
      tingkatAkses?: UserAccount["tingkatAkses"];
      cakupanAkses?: string[];
      actorId: string;
      timestamp: string;
    }
  ) {
    const user = await this.findAuthRecordById(userId);
    if (!user) {
      return null;
    }

    await this.db.query(
      `
        UPDATE users
        SET
          name = COALESCE($2, name),
          email = $3,
          phone = $4,
          address = $5,
          gender = $6,
          birth_date = $7,
          updated_at = $8,
          updated_by = $9
        WHERE id = $1
        RETURNING ${userColumns}
      `,
      [
        userId,
        input.name || null,
        input.email || null,
        input.phone || null,
        input.address || null,
        input.gender || null,
        input.birthDate || null,
        input.timestamp,
        input.actorId,
      ]
    );

    if (user.role === "mahasiswa") {
      await this.db.query(
        `
          INSERT INTO student_profiles (
            user_id, nim, program_studi, angkatan, kelas, skema_ta, jenis_ta, updated_at
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
          ON CONFLICT (user_id) DO UPDATE
          SET nim = COALESCE(EXCLUDED.nim, student_profiles.nim),
              program_studi = COALESCE(EXCLUDED.program_studi, student_profiles.program_studi),
              angkatan = COALESCE(EXCLUDED.angkatan, student_profiles.angkatan),
              kelas = COALESCE(EXCLUDED.kelas, student_profiles.kelas),
              skema_ta = COALESCE(EXCLUDED.skema_ta, student_profiles.skema_ta),
              jenis_ta = COALESCE(EXCLUDED.jenis_ta, student_profiles.jenis_ta),
              updated_at = EXCLUDED.updated_at
        `,
        [
          userId,
          input.nim || null,
          input.programStudi || null,
          input.angkatan || null,
          input.kelas || null,
          input.skemaTA || null,
          input.jenisTA || null,
          input.timestamp,
        ]
      );
    }

    if (user.role === "dosen") {
      await this.db.query(
        `
          INSERT INTO lecturer_profiles (
            user_id, nidn, expertise, program_studi, jabatan_akademik, peran_sistem, updated_at
          )
          VALUES ($1, $2, $3, $4, $5, $6::JSONB, $7)
          ON CONFLICT (user_id) DO UPDATE
          SET nidn = COALESCE(EXCLUDED.nidn, lecturer_profiles.nidn),
              expertise = COALESCE(EXCLUDED.expertise, lecturer_profiles.expertise),
              program_studi = COALESCE(EXCLUDED.program_studi, lecturer_profiles.program_studi),
              jabatan_akademik = COALESCE(EXCLUDED.jabatan_akademik, lecturer_profiles.jabatan_akademik),
              peran_sistem = COALESCE(EXCLUDED.peran_sistem, lecturer_profiles.peran_sistem),
              updated_at = EXCLUDED.updated_at
        `,
        [
          userId,
          input.nidn || null,
          input.bidangKeahlian?.join(", ") || null,
          input.programStudi || null,
          input.jabatanAkademik || null,
          JSON.stringify(input.peranSistem || []),
          input.timestamp,
        ]
      );
    }

    if (user.role === "koordinator") {
      await this.db.query(
        `
          INSERT INTO coordinator_profiles (
            user_id, employee_number, jabatan, program_studi, hak_akses_utama, updated_at
          )
          VALUES ($1, $2, $3, $4, $5::JSONB, $6)
          ON CONFLICT (user_id) DO UPDATE
          SET employee_number = COALESCE(EXCLUDED.employee_number, coordinator_profiles.employee_number),
              jabatan = COALESCE(EXCLUDED.jabatan, coordinator_profiles.jabatan),
              program_studi = COALESCE(EXCLUDED.program_studi, coordinator_profiles.program_studi),
              hak_akses_utama = COALESCE(EXCLUDED.hak_akses_utama, coordinator_profiles.hak_akses_utama),
              updated_at = EXCLUDED.updated_at
        `,
        [
          userId,
          input.nidn || null,
          input.jabatan || null,
          input.programStudi || null,
          JSON.stringify(input.hakAksesUtama || []),
          input.timestamp,
        ]
      );
    }

    if (user.role === "admin") {
      await this.db.query(
        `
          INSERT INTO admin_profiles (
            user_id, employee_number, divisi, tingkat_akses, cakupan_akses, updated_at
          )
          VALUES ($1, $2, $3, $4, $5::JSONB, $6)
          ON CONFLICT (user_id) DO UPDATE
          SET employee_number = COALESCE(EXCLUDED.employee_number, admin_profiles.employee_number),
              divisi = COALESCE(EXCLUDED.divisi, admin_profiles.divisi),
              tingkat_akses = COALESCE(EXCLUDED.tingkat_akses, admin_profiles.tingkat_akses),
              cakupan_akses = COALESCE(EXCLUDED.cakupan_akses, admin_profiles.cakupan_akses),
              updated_at = EXCLUDED.updated_at
        `,
        [
          userId,
          input.nidn || null,
          input.divisi || null,
          input.tingkatAkses || null,
          JSON.stringify(input.cakupanAkses || []),
          input.timestamp,
        ]
      );
    }

    const updated = await this.findAuthRecordById(userId);
    return updated ? this.omitPassword(updated) : null;
  }

  async getRoles(userId: string) {
    const result = await this.db.query<{ role: UserRole }>(
      `
        SELECT role
        FROM user_roles
        WHERE user_id = $1
          AND status = 'Aktif'
        ORDER BY role ASC
      `,
      [userId]
    );

    if (result.rows.length > 0) {
      return result.rows.map((row) => row.role);
    }

    const user = await this.findAuthRecordById(userId);
    return user && user.status === "Aktif" ? [user.role] : [];
  }

  async completeFirstLogin(userId: string, passwordHash: string, completedAt: string) {
    const result = await this.db.query<UserRow>(
      `
        UPDATE users
        SET
          password_hash = $2,
          password_status = 'active',
          force_change_on_login = FALSE,
          first_login_completed_at = $3,
          password_changed_at = $3,
          updated_at = NOW()
        WHERE id = $1
        RETURNING ${userColumns}
      `,
      [userId, passwordHash, completedAt]
    );

    return result.rows[0] ? toUserAccount(result.rows[0]) : null;
  }

  async getPermissions(role: UserRole) {
    const result = await this.db.query<{ permission: string }>(
      `
        SELECT permission
        FROM role_permissions
        WHERE role = $1
        ORDER BY permission ASC
      `,
      [role]
    );

    return result.rows.map((row) => row.permission);
  }

  private omitPassword(record: UserRecord): UserAccount {
    const { passwordHash: _passwordHash, ...account } = record;
    return account;
  }
}
