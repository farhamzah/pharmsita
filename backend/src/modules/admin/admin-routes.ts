import { json } from "../../http/response";
import { conflict, notFound } from "../../http/errors";
import type { Router } from "../../http/router";
import { masterDataRepository, refreshTokenRepository, userRepository } from "../../repositories";
import {
  validateAcademicPeriods,
  validateAdminUserCreate,
  validateAdminUserPasswordReset,
  validateAdminUserStatusUpdate,
  validateAdminUserUpdate,
  validateRequirementDefinitions,
  validateSupportingDocuments,
  validateThesisTypes,
  validateUserAccounts,
} from "../../validation/request-validators";
import { auditService } from "../audit/audit-service";
import { authService } from "../auth/auth-service";

const listResponse = (data: unknown[]) => ({
  data,
  meta: {
    page: 1,
    limit: data.length,
    total: data.length,
    totalPages: 1,
  },
});

export const registerAdminRoutes = (router: Router) => {
  router.get("/admin/users", async ({ headers }) => {
    await authService.requirePermission(headers, "admin.users.manage");
    return json(listResponse(await userRepository.list()));
  });
  router.post("/admin/users", async ({ body, headers }) => {
    const actor = await authService.requirePermission(headers, "admin.users.manage");
    const payload = validateAdminUserCreate(body);
    const existing = await userRepository.findByIdentifier(payload.identifier);

    if (existing) {
      throw conflict("Identifier user sudah terdaftar.", {
        identifier: payload.identifier,
      });
    }

    const timestamp = new Date().toISOString();
    const created = await userRepository.createUser({
      ...payload,
      actorId: actor.id,
      timestamp,
    });

    await auditService.record({
      actor,
      action: "ADMIN_USER_CREATED",
      resourceType: "user",
      resourceId: created.id,
      after: created,
    });

    return json({ data: created }, 201);
  });
  router.patch("/admin/users/:userId", async ({ params, body, headers }) => {
    const actor = await authService.requirePermission(headers, "admin.users.manage");
    const payload = validateAdminUserUpdate(body);
    const before = await userRepository.findById(params.userId);

    if (!before) {
      throw notFound("User tidak ditemukan.");
    }

    if (payload.identifier && payload.identifier !== before.identifier) {
      const existing = await userRepository.findByIdentifier(payload.identifier);
      if (existing && existing.id !== before.id) {
        throw conflict("Identifier user sudah terdaftar.", {
          identifier: payload.identifier,
        });
      }
    }

    const updated = await userRepository.updateUser(params.userId, {
      ...payload,
      actorId: actor.id,
      timestamp: new Date().toISOString(),
    });

    if (!updated) {
      throw notFound("User tidak ditemukan.");
    }

    await auditService.record({
      actor,
      action: "ADMIN_USER_UPDATED",
      resourceType: "user",
      resourceId: updated.id,
      before,
      after: updated,
    });

    return json({ data: updated });
  });
  router.patch("/admin/users/:userId/status", async ({ params, body, headers }) => {
    const actor = await authService.requirePermission(headers, "admin.users.manage");
    const payload = validateAdminUserStatusUpdate(body);
    const before = await userRepository.findById(params.userId);

    if (!before) {
      throw notFound("User tidak ditemukan.");
    }

    const updated = await userRepository.updateStatus(params.userId, {
      status: payload.status,
      actorId: actor.id,
      timestamp: new Date().toISOString(),
    });

    if (!updated) {
      throw notFound("User tidak ditemukan.");
    }

    if (payload.status === "Nonaktif") {
      await refreshTokenRepository.revokeAllForUser(params.userId, new Date().toISOString());
    }

    await auditService.record({
      actor,
      action: "ADMIN_USER_STATUS_UPDATED",
      resourceType: "user",
      resourceId: updated.id,
      before,
      after: updated,
    });

    return json({ data: updated });
  });
  router.post("/admin/users/:userId/reset-password", async ({ params, body, headers }) => {
    const actor = await authService.requirePermission(headers, "admin.users.manage");
    const payload = validateAdminUserPasswordReset(body);
    const before = await userRepository.findById(params.userId);

    if (!before) {
      throw notFound("User tidak ditemukan.");
    }

    const timestamp = new Date().toISOString();
    const updated = await userRepository.resetPassword(params.userId, {
      password: payload.password,
      actorId: actor.id,
      timestamp,
    });

    if (!updated) {
      throw notFound("User tidak ditemukan.");
    }

    await refreshTokenRepository.revokeAllForUser(params.userId, timestamp);
    await auditService.record({
      actor,
      action: "ADMIN_USER_PASSWORD_RESET",
      resourceType: "user",
      resourceId: updated.id,
      before: {
        passwordStatus: before.passwordStatus,
        forceChangeOnLogin: before.forceChangeOnLogin,
      },
      after: {
        passwordStatus: updated.passwordStatus,
        forceChangeOnLogin: updated.forceChangeOnLogin,
      },
    });

    return json({ data: updated });
  });
  router.put("/admin/users", async ({ body, headers }) => {
    const actor = await authService.requirePermission(headers, "admin.users.manage");
    const payload = validateUserAccounts(body);
    const before = await userRepository.list();
    const after = await userRepository.replaceAll(payload);

    await auditService.record({
      actor,
      action: "ADMIN_USERS_REPLACED",
      resourceType: "users",
      resourceId: "all",
      before,
      after,
    });

    return json(listResponse(after));
  });

  router.get("/admin/master/academic-periods", async ({ headers }) => {
    await authService.requirePermission(headers, "admin.master.manage");
    return json(listResponse(await masterDataRepository.listAcademicPeriods()));
  });
  router.put("/admin/master/academic-periods", async ({ body, headers }) => {
    const actor = await authService.requirePermission(headers, "admin.master.manage");
    const payload = validateAcademicPeriods(body);
    const before = await masterDataRepository.listAcademicPeriods();
    const after = await masterDataRepository.replaceAcademicPeriods(payload);

    await auditService.record({
      actor,
      action: "ADMIN_MASTER_ACADEMIC_PERIODS_REPLACED",
      resourceType: "academic-periods",
      resourceId: "all",
      before,
      after,
    });

    return json(listResponse(after));
  });

  router.get("/admin/master/thesis-types", async ({ headers }) => {
    await authService.requirePermission(headers, "admin.master.manage");
    return json(listResponse(await masterDataRepository.listThesisTypes()));
  });
  router.put("/admin/master/thesis-types", async ({ body, headers }) => {
    const actor = await authService.requirePermission(headers, "admin.master.manage");
    const payload = validateThesisTypes(body);
    const before = await masterDataRepository.listThesisTypes();
    const after = await masterDataRepository.replaceThesisTypes(payload);

    await auditService.record({
      actor,
      action: "ADMIN_MASTER_THESIS_TYPES_REPLACED",
      resourceType: "thesis-types",
      resourceId: "all",
      before,
      after,
    });

    return json(listResponse(after));
  });

  router.get("/admin/master/supporting-documents", async ({ headers }) => {
    await authService.requirePermission(headers, "admin.master.manage");
    return json(listResponse(await masterDataRepository.listSupportingDocuments()));
  });
  router.put("/admin/master/supporting-documents", async ({ body, headers }) => {
    const actor = await authService.requirePermission(headers, "admin.master.manage");
    const payload = validateSupportingDocuments(body);
    const before = await masterDataRepository.listSupportingDocuments();
    const after = await masterDataRepository.replaceSupportingDocuments(payload);

    await auditService.record({
      actor,
      action: "ADMIN_MASTER_SUPPORTING_DOCUMENTS_REPLACED",
      resourceType: "supporting-documents",
      resourceId: "all",
      before,
      after,
    });

    return json(listResponse(after));
  });

  router.get("/admin/master/requirements", async ({ headers }) => {
    await authService.requirePermission(headers, "admin.master.manage");
    return json(listResponse(await masterDataRepository.listRequirementDefinitions()));
  });
  router.put("/admin/master/requirements", async ({ body, headers }) => {
    const actor = await authService.requirePermission(headers, "admin.master.manage");
    const payload = validateRequirementDefinitions(body);
    const before = await masterDataRepository.listRequirementDefinitions();
    const after = await masterDataRepository.replaceRequirementDefinitions(payload);

    await auditService.record({
      actor,
      action: "ADMIN_MASTER_REQUIREMENTS_REPLACED",
      resourceType: "requirement-definitions",
      resourceId: "all",
      before,
      after,
    });

    return json(listResponse(after));
  });

  router.get("/master/academic-periods", async ({ headers }) => {
    await authService.requireAuthenticated(headers);
    return json(listResponse(await masterDataRepository.listAcademicPeriods()));
  });
  router.get("/master/thesis-types", async ({ headers }) => {
    await authService.requireAuthenticated(headers);
    return json(listResponse(await masterDataRepository.listThesisTypes()));
  });
  router.get("/master/lecturers", async ({ headers }) => {
    await authService.requireAuthenticated(headers);
    const users = await userRepository.list();
    return json(
      listResponse(
        users.filter((user) => user.role === "dosen" && user.status === "Aktif")
      )
    );
  });
  router.get("/master/supporting-documents", async ({ headers }) => {
    await authService.requireAuthenticated(headers);
    return json(listResponse(await masterDataRepository.listSupportingDocuments()));
  });
  router.get("/master/requirements", async ({ query, headers }) => {
    await authService.requireAuthenticated(headers);
    return json(
      listResponse(
        await masterDataRepository.listRequirementDefinitions({
          tahap: query.get("tahap"),
        })
      )
    );
  });
};
