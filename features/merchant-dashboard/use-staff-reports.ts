import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { rolePermissions } from "@/features/merchant-dashboard/dashboard-access";
import { resolveDashboardDataState } from "@/features/merchant-dashboard/dashboard-state-model";
import type {
  DashboardDataState,
  MerchantRole,
} from "@/features/merchant-dashboard/dashboard-types";
import {
  loadReportsWorkspace,
  loadStaffWorkspace,
  type ReportsWorkspaceSnapshot,
  type StaffMember,
  type StaffStatus,
} from "@/features/merchant-dashboard/staff-reports-demo-data";

/**
 * Filtering, paging and the demo mutations for the Staff & Permissions and
 * Reports workspaces.
 *
 * Every rule below is derived from the repository's own permission model rather
 * than a second copy of it, and every mutation is local state. When the team API
 * arrives these pure functions become its request bodies and this hook keeps its
 * shape.
 */

export const ALL_ROLES = "All roles";
export const ALL_STATUSES = "All statuses";
export const STAFF_PAGE_SIZE = 8;

export const MERCHANT_ROLES: readonly MerchantRole[] = [
  "Merchant Owner",
  "Merchant Administrator",
  "Manager",
  "Catalog Staff",
  "Inventory Staff",
  "Fulfillment Staff",
  "Support Staff",
];

export type StaffFilters = {
  query: string;
  role?: MerchantRole;
  status?: StaffStatus;
};

export const emptyStaffFilters: StaffFilters = { query: "" };

export function filterStaff(
  staff: readonly StaffMember[],
  filters: StaffFilters,
) {
  const needle = filters.query.trim().toLowerCase();

  return staff.filter((member) => {
    if (filters.role && member.role !== filters.role) return false;
    if (filters.status && member.status !== filters.status) return false;
    if (!needle) return true;
    return (
      member.name.toLowerCase().includes(needle) ||
      member.email.toLowerCase().includes(needle)
    );
  });
}

export function paginate<Row>(
  rows: readonly Row[],
  page: number,
  pageSize: number,
) {
  const pageCount = Math.max(1, Math.ceil(rows.length / pageSize));
  const safePage = Math.min(Math.max(1, page), pageCount);
  return {
    pageCount,
    rows: rows.slice((safePage - 1) * pageSize, safePage * pageSize),
    safePage,
  };
}

export function staffSummary(staff: readonly StaffMember[]) {
  return {
    active: staff.filter((member) => member.status === "Active").length,
    pending: staff.filter((member) => member.status === "Pending").length,
    roles: new Set(staff.map((member) => member.role)).size,
    total: staff.length,
  };
}

/** How many owners the team has — the guard behind every owner protection. */
export function ownerCount(staff: readonly StaffMember[]) {
  return staff.filter(
    (member) => member.role === "Merchant Owner" && member.status === "Active",
  ).length;
}

export type StaffAction =
  | "deactivate"
  | "edit-role"
  | "reactivate"
  | "remove"
  | "resend"
  | "view-permissions";

/**
 * Which demo actions a member's state allows.
 *
 * The last active owner is deliberately protected: removing, deactivating or
 * downgrading them would leave the workspace with nobody who can manage staff,
 * which no backend should accept either.
 */
export function availableStaffActions(
  member: StaffMember,
  staff: readonly StaffMember[],
): StaffAction[] {
  const lastOwner = isLastOwner(member, staff);
  const actions: StaffAction[] = ["view-permissions"];

  if (!lastOwner) actions.push("edit-role");
  if (member.status === "Pending") actions.push("resend");
  if (member.status === "Active" && !lastOwner) actions.push("deactivate");
  if (member.status === "Inactive") actions.push("reactivate");
  if (!lastOwner) actions.push("remove");
  return actions;
}

export function isLastOwner(
  member: StaffMember,
  staff: readonly StaffMember[],
) {
  return member.role === "Merchant Owner" && ownerCount(staff) <= 1;
}

/** The reason an action is withheld, so the UI can say why rather than hide it. */
export function ownerProtectionReason(
  member: StaffMember,
  staff: readonly StaffMember[],
) {
  return isLastOwner(member, staff)
    ? "This workspace must keep at least one active Merchant Owner."
    : undefined;
}

export function applyStaffAction(
  member: StaffMember,
  action: StaffAction,
): StaffMember {
  switch (action) {
    case "deactivate":
      return { ...member, status: "Inactive" };
    case "reactivate":
      return { ...member, status: "Active" };
    default:
      return member;
  }
}

/* ------------------------------------------------------------------ */
/* Invitations                                                         */
/* ------------------------------------------------------------------ */

export type InviteValues = { email: string; role: MerchantRole };

export function emptyInvite(): InviteValues {
  return { email: "", role: "Catalog Staff" };
}

export function validateInvite(
  values: InviteValues,
  staff: readonly StaffMember[],
) {
  const errors: Partial<Record<keyof InviteValues, string>> = {};
  const email = values.email.trim().toLowerCase();

  if (email.length === 0) errors.email = "Enter an email address";
  // Deliberately permissive: the server is the real authority on address
  // validity, so this only catches obvious typos before a round trip.
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    errors.email = "Enter a valid email address";
  } else if (staff.some((member) => member.email.toLowerCase() === email)) {
    errors.email = "That person is already on the team";
  }

  return errors;
}

export function inviteToStaff(values: InviteValues): StaffMember {
  const email = values.email.trim().toLowerCase();
  return {
    email,
    id: `staff-${Math.random().toString(36).slice(2, 10)}`,
    // The date is fixed from the email rather than `new Date()` so the demo
    // stays deterministic; a real API would stamp this server-side.
    invitedAt: "2026-08-08",
    lastActiveAt: null,
    // A useful placeholder until the invitee sets their own name.
    name: email.split("@")[0].replace(/[._-]+/g, " "),
    role: values.role,
    status: "Pending",
  };
}

/** The permissions a role grants, straight from the app's own model. */
export function previewPermissions(role: MerchantRole) {
  return rolePermissions[role];
}

/* ------------------------------------------------------------------ */
/* Hook                                                                */
/* ------------------------------------------------------------------ */

export type StaffReportsWorkspace = {
  dataState: DashboardDataState;
  inviteStaff: (values: InviteValues) => void;
  removeStaff: (id: string) => void;
  reports: ReportsWorkspaceSnapshot | null;
  retry: () => void;
  staff: StaffMember[];
  staffAction: (id: string, action: StaffAction) => void;
  updateRole: (id: string, role: MerchantRole) => void;
};

export function useStaffReports({
  enabled,
  loadReports = loadReportsWorkspace,
  loadStaff = loadStaffWorkspace,
}: {
  enabled: boolean;
  loadReports?: () => Promise<ReportsWorkspaceSnapshot>;
  loadStaff?: () => Promise<{ staff: StaffMember[] }>;
}): StaffReportsWorkspace {
  const [attempt, setAttempt] = useState(0);
  const [failed, setFailed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [staff, setStaff] = useState<StaffMember[] | null>(null);
  const [reports, setReports] = useState<ReportsWorkspaceSnapshot | null>(null);
  const staffRef = useRef(loadStaff);
  const reportsRef = useRef(loadReports);
  staffRef.current = loadStaff;
  reportsRef.current = loadReports;

  useEffect(() => {
    if (!enabled) {
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);

    Promise.all([staffRef.current(), reportsRef.current()])
      .then(([staffResult, reportResult]) => {
        if (cancelled) return;
        setFailed(false);
        setStaff(staffResult.staff);
        setReports(reportResult);
      })
      .catch(() => {
        if (cancelled) return;
        setFailed(true);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [attempt, enabled]);

  const reload = useCallback(() => setAttempt((current) => current + 1), []);

  const staffAction = useCallback((id: string, action: StaffAction) => {
    setStaff((current) =>
      current
        ? current.map((member) =>
            member.id === id ? applyStaffAction(member, action) : member,
          )
        : current,
    );
  }, []);

  const updateRole = useCallback((id: string, role: MerchantRole) => {
    setStaff((current) => {
      if (!current) return current;
      const target = current.find((member) => member.id === id);
      // Never let an edit strip the workspace of its last owner.
      if (target && isLastOwner(target, current) && role !== "Merchant Owner") {
        return current;
      }
      return current.map((member) =>
        member.id === id ? { ...member, role } : member,
      );
    });
  }, []);

  const removeStaff = useCallback((id: string) => {
    setStaff((current) => {
      if (!current) return current;
      const target = current.find((member) => member.id === id);
      if (target && isLastOwner(target, current)) return current;
      return current.filter((member) => member.id !== id);
    });
  }, []);

  const inviteStaff = useCallback((values: InviteValues) => {
    setStaff((current) =>
      current ? [inviteToStaff(values), ...current] : current,
    );
  }, []);

  return useMemo(
    () => ({
      dataState: resolveDashboardDataState({
        failedSectionCount: failed ? 1 : 0,
        hasCatalog: (staff?.length ?? 0) > 0,
        hasSnapshot: staff !== null,
        loading,
        sectionCount: 1,
      }),
      inviteStaff,
      removeStaff,
      reports,
      retry: reload,
      staff: staff ?? [],
      staffAction,
      updateRole,
    }),
    [
      failed,
      inviteStaff,
      loading,
      reload,
      removeStaff,
      reports,
      staff,
      staffAction,
      updateRole,
    ],
  );
}
