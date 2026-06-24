CREATE TABLE "users" (
  "id" uuid PRIMARY KEY,
  "username" varchar UNIQUE,
  "password_hash" varchar,
  "full_name" varchar,
  "email" varchar,
  "phone" varchar,
  "study_program_id" uuid NOT NULL,
  "first_login" boolean DEFAULT true,
  "is_active" boolean DEFAULT true,
  "created_at" timestamp,
  "updated_at" timestamp
);

CREATE TABLE "roles" (
  "id" uuid PRIMARY KEY,
  "code" varchar(50) UNIQUE NOT NULL,
  "name" varchar(100) NOT NULL,
  "created_at" timestamp
);

CREATE TABLE "user_roles" (
  "id" uuid PRIMARY KEY,
  "user_id" uuid NOT NULL,
  "role_id" uuid NOT NULL,
  "created_at" timestamp
);

CREATE TABLE "thesis_committees" (
  "id" uuid PRIMARY KEY,
  "thesis_id" uuid NOT NULL,
  "lecturer_id" uuid NOT NULL,
  "role" varchar(30),
  "assigned_at" timestamp
);

CREATE TABLE "lecturer_quotas" (
  "id" uuid PRIMARY KEY,
  "lecturer_id" uuid UNIQUE NOT NULL,
  "supervisor_1_quota" int NOT NULL,
  "supervisor_2_quota" int NOT NULL,
  "created_at" timestamp,
  "updated_at" timestamp
);

CREATE TABLE "system_settings" (
  "id" uuid PRIMARY KEY,
  "key" varchar(100) UNIQUE,
  "value" varchar(255)
);

CREATE TABLE "thesis_schemes" (
  "id" uuid PRIMARY KEY,
  "name" varchar(100) NOT NULL,
  "created_at" timestamp
);

CREATE TABLE "thesis_types" (
  "id" uuid PRIMARY KEY,
  "scheme_id" uuid NOT NULL,
  "name" varchar(100) NOT NULL,
  "created_at" timestamp
);

CREATE TABLE "thesis_stages" (
  "id" uuid PRIMARY KEY,
  "code" varchar(50) UNIQUE,
  "name" varchar(100)
);

CREATE TABLE "thesis_stage_histories" (
  "id" uuid PRIMARY KEY,
  "thesis_id" uuid NOT NULL,
  "stage_id" uuid NOT NULL,
  "started_at" timestamp,
  "finished_at" timestamp,
  "created_at" timestamp
);

CREATE TABLE "requirement_categories" (
  "id" uuid PRIMARY KEY,
  "name" varchar(100) NOT NULL
);

CREATE TABLE "requirements" (
  "id" uuid PRIMARY KEY,
  "category_id" uuid NOT NULL,
  "name" varchar(255) NOT NULL,
  "is_required" boolean DEFAULT true,
  "is_active" boolean DEFAULT true,
  "created_at" timestamp
);

CREATE TABLE "study_programs" (
  "id" uuid PRIMARY KEY,
  "name" varchar(100) NOT NULL,
  "is_active" boolean NOT NULL DEFAULT true,
  "created_at" timestamp,
  "updated_at" timestamp
);

CREATE TABLE "academic_periods" (
  "id" uuid PRIMARY KEY,
  "name" varchar,
  "is_active" boolean
);

CREATE TABLE "thesis_registrations" (
  "id" uuid PRIMARY KEY,
  "student_id" uuid NOT NULL,
  "scheme_id" uuid NOT NULL,
  "academic_period_id" uuid NOT NULL,
  "thesis_type_id" uuid NOT NULL,
  "title" varchar(255) NOT NULL,
  "title_description" text,
  "requirement_drive_link" text NOT NULL,
  "payment_proof_file_url" text NOT NULL,
  "recommended_supervisor_1_id" uuid,
  "status" varchar(50) NOT NULL,
  "validation_note" text,
  "submitted_at" timestamp,
  "validated_at" timestamp,
  "created_at" timestamp,
  "updated_at" timestamp
);

CREATE TABLE "thesis_registration_requirement_validations" (
  "id" uuid PRIMARY KEY,
  "registration_id" uuid NOT NULL,
  "requirement_id" uuid NOT NULL,
  "is_checked" boolean DEFAULT false,
  "note" text,
  "validated_by" uuid,
  "validated_at" timestamp
);

CREATE TABLE "theses" (
  "id" uuid PRIMARY KEY,
  "registration_id" uuid NOT NULL,
  "student_id" uuid NOT NULL,
  "title" varchar(255),
  "status" varchar(50),
  "started_at" timestamp,
  "created_at" timestamp
);

CREATE TABLE "guidance_requests" (
  "id" uuid PRIMARY KEY,
  "thesis_id" uuid NOT NULL,
  "stage_id" uuid NOT NULL,
  "document_link" text NOT NULL,
  "approved_by" uuid,
  "status" varchar(50),
  "approval_note" text,
  "submitted_at" timestamp,
  "approved_at" timestamp,
  "created_at" timestamp
);

CREATE TABLE "guidance_materials" (
  "id" uuid PRIMARY KEY,
  "guidance_request_id" uuid NOT NULL,
  "submitted_by" uuid NOT NULL,
  "description" text,
  "status" varchar(50),
  "validated_by" uuid,
  "submitted_at" timestamp,
  "validated_at" timestamp,
  "created_at" timestamp
);

CREATE TABLE "stage_submissions" (
  "id" uuid PRIMARY KEY,
  "thesis_id" uuid NOT NULL,
  "stage_id" uuid NOT NULL,
  "requirement_drive_link" text,
  "latest_document_file" text,
  "status" varchar(50),
  "validation_note" text,
  "validated_by" uuid,
  "submitted_at" timestamp,
  "validated_at" timestamp,
  "created_at" timestamp
);

CREATE TABLE "stage_submission_requirement_validations" (
  "id" uuid PRIMARY KEY,
  "stage_submission_id" uuid NOT NULL,
  "requirement_id" uuid NOT NULL,
  "is_checked" boolean DEFAULT false,
  "validated_by" uuid,
  "validated_at" timestamp,
  "created_at" timestamp
);

CREATE TABLE "thesis_schedules" (
  "id" uuid PRIMARY KEY,
  "thesis_id" uuid NOT NULL,
  "stage_id" uuid NOT NULL,
  "room" varchar(100),
  "start_time" timestamp,
  "end_time" timestamp,
  "created_by" uuid,
  "created_at" timestamp,
  "updated_at" timestamp
);

CREATE TABLE "thesis_assessments" (
  "id" uuid PRIMARY KEY,
  "schedule_id" uuid NOT NULL,
  "examiner_id" uuid NOT NULL,
  "presentation_score" decimal(5,2),
  "writing_score" decimal(5,2),
  "qa_score" decimal(5,2),
  "total_score" decimal(5,2),
  "created_at" timestamp
);

CREATE TABLE "revision_notes" (
  "id" uuid PRIMARY KEY,
  "assessment_id" uuid NOT NULL,
  "title" varchar(255),
  "status" varchar(50),
  "created_at" timestamp
);

CREATE UNIQUE INDEX ON "stage_submission_requirement_validations" ("stage_submission_id", "requirement_id");

ALTER TABLE "user_roles" ADD FOREIGN KEY ("user_id") REFERENCES "users" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "user_roles" ADD FOREIGN KEY ("role_id") REFERENCES "roles" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "users" ADD FOREIGN KEY ("study_program_id") REFERENCES "study_programs" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "thesis_types" ADD FOREIGN KEY ("scheme_id") REFERENCES "thesis_schemes" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "requirements" ADD FOREIGN KEY ("category_id") REFERENCES "requirement_categories" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "thesis_committees" ADD FOREIGN KEY ("thesis_id") REFERENCES "theses" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "thesis_committees" ADD FOREIGN KEY ("lecturer_id") REFERENCES "users" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "lecturer_quotas" ADD FOREIGN KEY ("lecturer_id") REFERENCES "users" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "thesis_registrations" ADD FOREIGN KEY ("student_id") REFERENCES "users" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "thesis_registrations" ADD FOREIGN KEY ("scheme_id") REFERENCES "thesis_schemes" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "thesis_registrations" ADD FOREIGN KEY ("thesis_type_id") REFERENCES "thesis_types" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "thesis_registrations" ADD FOREIGN KEY ("academic_period_id") REFERENCES "academic_periods" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "thesis_registration_requirement_validations" ADD FOREIGN KEY ("registration_id") REFERENCES "thesis_registrations" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "thesis_registration_requirement_validations" ADD FOREIGN KEY ("requirement_id") REFERENCES "requirements" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "thesis_registration_requirement_validations" ADD FOREIGN KEY ("validated_by") REFERENCES "users" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "theses" ADD FOREIGN KEY ("registration_id") REFERENCES "thesis_registrations" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "theses" ADD FOREIGN KEY ("student_id") REFERENCES "users" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "thesis_stage_histories" ADD FOREIGN KEY ("thesis_id") REFERENCES "theses" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "thesis_stage_histories" ADD FOREIGN KEY ("stage_id") REFERENCES "thesis_stages" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "guidance_requests" ADD FOREIGN KEY ("thesis_id") REFERENCES "theses" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "guidance_requests" ADD FOREIGN KEY ("stage_id") REFERENCES "thesis_stages" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "guidance_requests" ADD FOREIGN KEY ("approved_by") REFERENCES "users" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "guidance_materials" ADD FOREIGN KEY ("guidance_request_id") REFERENCES "guidance_requests" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "guidance_materials" ADD FOREIGN KEY ("submitted_by") REFERENCES "users" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "guidance_materials" ADD FOREIGN KEY ("validated_by") REFERENCES "users" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "stage_submissions" ADD FOREIGN KEY ("thesis_id") REFERENCES "theses" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "stage_submissions" ADD FOREIGN KEY ("stage_id") REFERENCES "thesis_stages" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "stage_submissions" ADD FOREIGN KEY ("validated_by") REFERENCES "users" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "stage_submission_requirement_validations" ADD FOREIGN KEY ("stage_submission_id") REFERENCES "stage_submissions" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "stage_submission_requirement_validations" ADD FOREIGN KEY ("requirement_id") REFERENCES "requirements" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "stage_submission_requirement_validations" ADD FOREIGN KEY ("validated_by") REFERENCES "users" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "thesis_schedules" ADD FOREIGN KEY ("thesis_id") REFERENCES "theses" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "thesis_schedules" ADD FOREIGN KEY ("stage_id") REFERENCES "thesis_stages" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "thesis_schedules" ADD FOREIGN KEY ("created_by") REFERENCES "users" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "thesis_assessments" ADD FOREIGN KEY ("schedule_id") REFERENCES "thesis_schedules" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "thesis_assessments" ADD FOREIGN KEY ("examiner_id") REFERENCES "users" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "revision_notes" ADD FOREIGN KEY ("assessment_id") REFERENCES "thesis_assessments" ("id") DEFERRABLE INITIALLY IMMEDIATE;
