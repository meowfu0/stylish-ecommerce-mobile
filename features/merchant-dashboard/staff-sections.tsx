import { useEffect, useMemo, useState, type ComponentProps } from "react";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";

import { StylishTextInput } from "@/components/forms/stylish-text-input";
import { StylishText } from "@/components/typography/stylish-text";
import { borderRadius, colors, spacing } from "@/constants/design-tokens";
import { can } from "@/features/merchant-dashboard/dashboard-access";
import { DashboardDialog } from "@/features/merchant-dashboard/dashboard-dialog";
import {
  formatCount,
  formatOrderDate,
} from "@/features/merchant-dashboard/dashboard-format";
import { useResponsiveGrid } from "@/features/merchant-dashboard/dashboard-grid";
import type { DashboardMenuItem } from "@/features/merchant-dashboard/dashboard-menu";
import {
  DashboardButton,
  DashboardCard,
  DashboardIcon,
  SectionHeading,
  StatusChip,
} from "@/features/merchant-dashboard/dashboard-primitives";
import {
  FilterSelect,
  RowActionsButton,
  SearchField,
  TableCell,
  TablePagination,
  TableText,
} from "@/features/merchant-dashboard/dashboard-table";
import type {
  MerchantRole,
  MerchantSession,
  Permission,
} from "@/features/merchant-dashboard/dashboard-types";
import { MerchantPermissionMatrix } from "@/features/merchant-dashboard/merchant-permission-matrix";
import {
  STAFF_STATUSES,
  type StaffMember,
  type StaffStatus,
} from "@/features/merchant-dashboard/staff-reports-demo-data";
import {
  ALL_ROLES,
  ALL_STATUSES,
  availableStaffActions,
  emptyInvite,
  type InviteValues,
  isLastOwner,
  MERCHANT_ROLES,
  ownerProtectionReason,
  paginate,
  previewPermissions,
  STAFF_PAGE_SIZE,
  type StaffAction,
  type StaffFilters,
  staffSummary,
  validateInvite,
} from "@/features/merchant-dashboard/use-staff-reports";

/**
 * The Staff & Permissions workspace, its two dialogs and the role matrix.
 *
 * Permissions are never restated here: every list comes from
 * `rolePermissions`, the map the sidebar and every gated control already read,
 * and the matrix card reuses the existing `MerchantPermissionMatrix` component
 * rather than drawing a second one.
 */

const TILE_MIN_WIDTH = 150;
const DENSE_TABLE_WIDTH = 940;

const statusTones: Record<
  StaffStatus,
  ComponentProps<typeof StatusChip>["tone"]
> = {
  Active: "green",
  Inactive: "neutral",
  Pending: "warning",
};

const actionLabels: Record<StaffAction, string> = {
  deactivate: "Deactivate",
  "edit-role": "Edit role",
  reactivate: "Reactivate",
  remove: "Remove from team",
  resend: "Resend invitation",
  "view-permissions": "View permissions",
};

const actionIcons: Record<
  StaffAction,
  ComponentProps<typeof DashboardIcon>["name"]
> = {
  deactivate: "account-cancel-outline",
  "edit-role": "shield-edit-outline",
  reactivate: "account-check-outline",
  remove: "account-remove-outline",
  resend: "email-sync-outline",
  "view-permissions": "shield-account-outline",
};

/** A short human summary of what a role can do, for the table's narrow column. */
export function permissionSummary(role: MerchantRole) {
  const permissions = previewPermissions(role);
  if (permissions.length === 0) return "No permissions";
  const areas = new Set(
    permissions.map((permission) => permission.split(".")[0]),
  );
  return `${formatCount(permissions.length)} permissions · ${[...areas]
    .slice(0, 3)
    .join(", ")}${areas.size > 3 ? "…" : ""}`;
}

export function staffMenuItems({
  member,
  onAction,
  onEditRole,
  onViewPermissions,
  session,
  staff,
}: {
  member: StaffMember;
  onAction?: (member: StaffMember, action: StaffAction) => void;
  onEditRole?: (member: StaffMember) => void;
  onViewPermissions?: (member: StaffMember) => void;
  session?: MerchantSession;
  staff: readonly StaffMember[];
}): DashboardMenuItem[] {
  const manages = session ? can(session, "staff.manage") : true;
  const allowed = availableStaffActions(member, staff);

  return (
    [
      "view-permissions",
      "edit-role",
      "resend",
      "deactivate",
      "reactivate",
      "remove",
    ] as StaffAction[]
  )
    .filter(
      (action) => action === "view-permissions" || allowed.includes(action),
    )
    .map((action) => ({
      disabled: action !== "view-permissions" && !manages,
      icon: actionIcons[action],
      key: action,
      label: actionLabels[action],
      onPress:
        action === "view-permissions"
          ? () => onViewPermissions?.(member)
          : !manages
            ? undefined
            : action === "edit-role"
              ? () => onEditRole?.(member)
              : () => onAction?.(member, action),
    }));
}

function SummaryTiles({
  tiles,
}: {
  tiles: { key: string; label: string; tone: string; value: number }[];
}) {
  const grid = useResponsiveGrid({
    count: tiles.length,
    gap: spacing.sm,
    minItemWidth: TILE_MIN_WIDTH,
  });

  return (
    <View onLayout={grid.onLayout} style={styles.tileGrid} testID="staff-tiles">
      {tiles.map((tile) => (
        <View key={tile.key} style={[styles.tile, grid.itemStyle]}>
          <View style={styles.tileHeader}>
            <View style={[styles.tileDot, { backgroundColor: tile.tone }]} />
            <StylishText
              numberOfLines={1}
              style={styles.tileLabel}
              unstyled
              variant="caption"
            >
              {tile.label}
            </StylishText>
          </View>
          <StylishText style={styles.tileValue} unstyled variant="price">
            {formatCount(tile.value)}
          </StylishText>
        </View>
      ))}
    </View>
  );
}

function MemberIdentity({
  member,
  staff,
}: {
  member: StaffMember;
  staff: readonly StaffMember[];
}) {
  return (
    <View style={styles.identityCopy}>
      <View style={styles.nameRow}>
        <StylishText
          numberOfLines={1}
          style={styles.memberName}
          unstyled
          variant="caption"
        >
          {member.name}
        </StylishText>
        {isLastOwner(member, staff) ? (
          // Marked with an icon and a label, never colour alone.
          <View style={styles.ownerTag}>
            <DashboardIcon
              color={colors.feedback.danger}
              name="shield-crown-outline"
              size={12}
            />
            <StylishText style={styles.ownerTagText} unstyled variant="caption">
              Owner
            </StylishText>
          </View>
        ) : null}
      </View>
      <StylishText
        numberOfLines={1}
        style={styles.memberEmail}
        unstyled
        variant="caption"
      >
        {member.email}
      </StylishText>
    </View>
  );
}

export function StaffContent({
  compact,
  filters,
  onAction,
  onEditRole,
  onFiltersChange,
  onInvite,
  onViewPermissions,
  session,
  staff,
  visibleStaff,
}: {
  compact: boolean;
  filters: StaffFilters;
  onAction?: (member: StaffMember, action: StaffAction) => void;
  onEditRole?: (member: StaffMember) => void;
  onFiltersChange: (filters: StaffFilters) => void;
  onInvite?: () => void;
  onViewPermissions?: (member: StaffMember) => void;
  session?: MerchantSession;
  /** The whole team, used for the owner guards and the summary tiles. */
  staff: readonly StaffMember[];
  /** The filtered rows the table shows. */
  visibleStaff: readonly StaffMember[];
}) {
  const [page, setPage] = useState(1);
  const [tableWidth, setTableWidth] = useState(0);

  const summary = useMemo(() => staffSummary(staff), [staff]);
  const { pageCount, rows, safePage } = paginate(
    visibleStaff,
    page,
    STAFF_PAGE_SIZE,
  );
  const dense = tableWidth > 0 && tableWidth < DENSE_TABLE_WIDTH;
  const manages = Boolean(session && can(session, "staff.manage"));

  const setFilter = (next: Partial<StaffFilters>) => {
    setPage(1);
    onFiltersChange({ ...filters, ...next });
  };
  const menu = (member: StaffMember) =>
    staffMenuItems({
      member,
      onAction,
      onEditRole,
      onViewPermissions,
      session,
      staff,
    });

  return (
    <>
      <DashboardCard testID="staff-summary">
        <SectionHeading
          description="Who can work in this merchant workspace."
          title="Team overview"
        />
        <View style={styles.tileWrap}>
          <SummaryTiles
            tiles={[
              {
                key: "total",
                label: "Total staff",
                tone: colors.feedback.info,
                value: summary.total,
              },
              {
                key: "active",
                label: "Active staff",
                tone: colors.feedback.success,
                value: summary.active,
              },
              {
                key: "pending",
                label: "Pending invitations",
                tone: colors.feedback.warning,
                value: summary.pending,
              },
              {
                key: "roles",
                label: "Roles in use",
                tone: colors.brand.primary,
                value: summary.roles,
              },
            ]}
          />
        </View>
      </DashboardCard>

      <DashboardCard testID="staff-table-card">
        <SectionHeading
          action={
            <DashboardButton
              disabled={!manages}
              icon="account-plus-outline"
              label="Invite Staff"
              onPress={onInvite}
              testID="staff-invite"
              title="Your role cannot manage staff."
              tone="primary"
            />
          }
          description={`${visibleStaff.length} of ${staff.length} team members match your filters`}
          title="Staff & Permissions"
        />
        <View style={styles.notice}>
          <DashboardIcon
            color={colors.feedback.info}
            name="flask-outline"
            size={14}
          />
          <StylishText style={styles.noticeText} unstyled variant="caption">
            Invitations and role changes update the demo data only — nothing is
            sent or saved yet.
          </StylishText>
        </View>

        <View style={styles.controls}>
          <SearchField
            accessibilityLabel="Search staff"
            label="Search staff"
            onChangeText={(query) => setFilter({ query })}
            placeholder="Name or email"
            testID="staff-search"
            value={filters.query}
          />
          <FilterSelect
            label="Role"
            onChange={(next) =>
              setFilter({ role: MERCHANT_ROLES.find((role) => role === next) })
            }
            options={[ALL_ROLES, ...MERCHANT_ROLES]}
            testID="staff-role-filter"
            value={filters.role ?? ALL_ROLES}
          />
          <FilterSelect
            label="Status"
            onChange={(next) =>
              setFilter({
                status: STAFF_STATUSES.find((status) => status === next),
              })
            }
            options={[ALL_STATUSES, ...STAFF_STATUSES]}
            testID="staff-status-filter"
            value={filters.status ?? ALL_STATUSES}
          />
        </View>

        {compact ? (
          <View style={styles.cards} testID="staff-body">
            {rows.map((member) => (
              <View
                key={member.id}
                style={styles.card}
                testID={`staff-card-${member.id}`}
              >
                <View style={styles.cardHeading}>
                  <MemberIdentity member={member} staff={staff} />
                  <RowActionsButton
                    accessibilityLabel={`Actions for ${member.name}`}
                    items={menu(member)}
                    menuLabel={`${member.name} actions`}
                    testID={`staff-card-actions-${member.id}`}
                  />
                </View>
                <View style={styles.cardChips}>
                  <StatusChip label={member.role} tone="blue" />
                  <StatusChip
                    label={member.status}
                    tone={statusTones[member.status]}
                  />
                </View>
                <StylishText
                  numberOfLines={2}
                  style={styles.cardMeta}
                  unstyled
                  variant="caption"
                >
                  {permissionSummary(member.role)} ·{" "}
                  {member.lastActiveAt
                    ? `Last active ${formatOrderDate(member.lastActiveAt)}`
                    : "Never signed in"}
                </StylishText>
              </View>
            ))}
            {rows.length === 0 ? (
              <EmptyRow label="No team members match your filters." />
            ) : null}
          </View>
        ) : (
          <ScrollView
            className="st-scroll"
            contentContainerStyle={styles.tableContent}
            horizontal
            onLayout={(event) => setTableWidth(event.nativeEvent.layout.width)}
            showsHorizontalScrollIndicator
            style={styles.tableScroll}
          >
            <View
              accessibilityRole="list"
              style={[styles.table, { minWidth: dense ? 800 : 980 }]}
            >
              <View style={[styles.tableRow, styles.tableHeader]}>
                <TableCell width={2.4}>
                  <TableText header value="Staff member" />
                </TableCell>
                <TableCell width={1.5}>
                  <TableText header value="Role" />
                </TableCell>
                <TableCell width={1}>
                  <TableText header value="Status" />
                </TableCell>
                {dense ? null : (
                  <TableCell width={2}>
                    <TableText header value="Permissions" />
                  </TableCell>
                )}
                <TableCell width={1.2}>
                  <TableText header value="Last active" />
                </TableCell>
                <View style={styles.actionsSpacer} />
              </View>

              <View style={styles.tableBody} testID="staff-body">
                {rows.map((member) => (
                  <View
                    key={member.id}
                    style={styles.tableRow}
                    testID={`staff-row-${member.id}`}
                  >
                    <TableCell width={2.4}>
                      <MemberIdentity member={member} staff={staff} />
                    </TableCell>
                    <TableCell width={1.5}>
                      <TableText value={member.role} />
                    </TableCell>
                    <TableCell width={1}>
                      <StatusChip
                        label={member.status}
                        tone={statusTones[member.status]}
                      />
                    </TableCell>
                    {dense ? null : (
                      <TableCell width={2}>
                        <TableText value={permissionSummary(member.role)} />
                      </TableCell>
                    )}
                    <TableCell width={1.2}>
                      <TableText
                        value={
                          member.lastActiveAt
                            ? formatOrderDate(member.lastActiveAt)
                            : "Never"
                        }
                      />
                    </TableCell>
                    <RowActionsButton
                      accessibilityLabel={`Actions for ${member.name}`}
                      items={menu(member)}
                      menuLabel={`${member.name} actions`}
                      testID={`staff-actions-${member.id}`}
                    />
                  </View>
                ))}
                {rows.length === 0 ? (
                  <EmptyRow label="No team members match your filters." />
                ) : null}
              </View>
            </View>
          </ScrollView>
        )}

        <TablePagination
          onChange={setPage}
          page={safePage}
          pageCount={pageCount}
          testIDPrefix="staff"
        />
      </DashboardCard>

      {/* The existing matrix component, not a second copy of the same table. */}
      <MerchantPermissionMatrix />
    </>
  );
}

function EmptyRow({ label }: { label: string }) {
  return (
    <View style={styles.emptyRow}>
      <StylishText style={styles.emptyText} unstyled variant="caption">
        {label}
      </StylishText>
    </View>
  );
}

/** Grouped permission list, shared by the invite preview and the role editor. */
export function PermissionPreview({
  permissions,
  title,
}: {
  permissions: readonly Permission[];
  title: string;
}) {
  const grouped = useMemo(() => {
    const groups = new Map<string, Permission[]>();
    for (const permission of permissions) {
      const area = permission.split(".")[0];
      groups.set(area, [...(groups.get(area) ?? []), permission]);
    }
    return [...groups.entries()];
  }, [permissions]);

  return (
    <View style={styles.preview}>
      <StylishText style={styles.previewTitle} unstyled variant="caption">
        {title}
      </StylishText>
      {permissions.length === 0 ? (
        <StylishText style={styles.previewEmpty} unstyled variant="caption">
          This role grants no permissions.
        </StylishText>
      ) : (
        grouped.map(([area, entries]) => (
          <View key={area} style={styles.previewGroup}>
            <StylishText
              style={styles.previewGroupLabel}
              unstyled
              variant="caption"
            >
              {area.toUpperCase()}
            </StylishText>
            <View style={styles.previewChips}>
              {entries.map((permission) => (
                <View key={permission} style={styles.previewChip}>
                  <DashboardIcon
                    color={colors.feedback.success}
                    name="check"
                    size={12}
                  />
                  <StylishText
                    style={styles.previewChipText}
                    unstyled
                    variant="caption"
                  >
                    {permission}
                  </StylishText>
                </View>
              ))}
            </View>
          </View>
        ))
      )}
    </View>
  );
}

function RolePicker({
  disabledRoles = [],
  onChange,
  testID,
  value,
}: {
  disabledRoles?: readonly MerchantRole[];
  onChange: (role: MerchantRole) => void;
  testID: string;
  value: MerchantRole;
}) {
  return (
    <View style={styles.roleGrid}>
      {MERCHANT_ROLES.map((role) => {
        const selected = role === value;
        const disabled = disabledRoles.includes(role);
        return (
          <Pressable
            accessibilityLabel={role}
            accessibilityRole="radio"
            accessibilityState={{ checked: selected, disabled }}
            className="focus-visible:ring-[3px] focus-visible:ring-brand-blue/55"
            disabled={disabled}
            key={role}
            onPress={() => onChange(role)}
            style={[
              styles.roleOption,
              selected && styles.roleOptionSelected,
              disabled && styles.roleOptionDisabled,
            ]}
            testID={`${testID}-${role.replace(/\s+/g, "-").toLowerCase()}`}
          >
            {selected ? (
              <DashboardIcon
                color={colors.feedback.danger}
                name="check"
                size={14}
              />
            ) : null}
            <StylishText
              numberOfLines={1}
              style={[
                styles.roleOptionLabel,
                selected && styles.roleOptionLabelSelected,
              ]}
              unstyled
              variant="caption"
            >
              {role}
            </StylishText>
          </Pressable>
        );
      })}
    </View>
  );
}

export function InviteStaffModal({
  onClose,
  onInvite,
  staff,
  visible,
}: {
  onClose: () => void;
  onInvite: (values: InviteValues) => void;
  staff: readonly StaffMember[];
  visible: boolean;
}) {
  const [values, setValues] = useState<InviteValues>(emptyInvite);
  const [errors, setErrors] = useState<
    Partial<Record<keyof InviteValues, string>>
  >({});

  useEffect(() => {
    if (!visible) return;
    setValues(emptyInvite());
    setErrors({});
  }, [visible]);

  const submit = () => {
    const found = validateInvite(values, staff);
    if (Object.keys(found).length > 0) {
      setErrors(found);
      return;
    }
    onInvite(values);
    onClose();
  };

  return (
    <DashboardDialog
      description="They will appear as a pending invitation until they accept."
      footer={
        <>
          <DashboardButton
            label="Cancel"
            onPress={onClose}
            testID="invite-cancel"
            tone="quiet"
          />
          <DashboardButton
            label="Send Invitation"
            onPress={submit}
            testID="invite-submit"
            tone="primary"
          />
        </>
      }
      onClose={onClose}
      testID="invite-staff-modal"
      title="Invite a team member"
      visible={visible}
      width={560}
    >
      <Field error={errors.email} label="Email address" required>
        <StylishTextInput
          accessibilityLabel="Email address"
          autoCapitalize="none"
          inputMode="email"
          onChangeText={(email) => {
            setValues((current) => ({ ...current, email }));
            setErrors((current) => ({ ...current, email: undefined }));
          }}
          placeholder="name@example.com"
          placeholderTextColor={colors.neutral[450]}
          style={styles.input}
          testID="invite-email"
          value={values.email}
        />
      </Field>

      <Field label="Role">
        {/* Only an existing owner may create another; the demo keeps that rule
            visible rather than silently accepting it. */}
        <RolePicker
          disabledRoles={["Merchant Owner"]}
          onChange={(role) => setValues((current) => ({ ...current, role }))}
          testID="invite-role"
          value={values.role}
        />
      </Field>

      <PermissionPreview
        permissions={previewPermissions(values.role)}
        title={`${values.role} will be able to:`}
      />
    </DashboardDialog>
  );
}

export function EditRoleModal({
  member,
  onClose,
  onSave,
  staff,
  visible,
}: {
  member: StaffMember | null;
  onClose: () => void;
  onSave: (member: StaffMember, role: MerchantRole) => void;
  staff: readonly StaffMember[];
  visible: boolean;
}) {
  const [role, setRole] = useState<MerchantRole>("Catalog Staff");

  useEffect(() => {
    if (!visible || !member) return;
    setRole(member.role);
  }, [member, visible]);

  const lastOwner = member ? isLastOwner(member, staff) : false;

  return (
    <DashboardDialog
      description={member ? `${member.name} · ${member.email}` : ""}
      footer={
        <>
          <DashboardButton
            label="Cancel"
            onPress={onClose}
            testID="edit-role-cancel"
            tone="quiet"
          />
          <DashboardButton
            disabled={lastOwner && role !== "Merchant Owner"}
            label="Save Role"
            onPress={() => {
              if (!member) return;
              onSave(member, role);
              onClose();
            }}
            testID="edit-role-submit"
            title={ownerProtectionReason(member ?? staff[0], staff)}
            tone="primary"
          />
        </>
      }
      onClose={onClose}
      testID="edit-role-modal"
      title="Edit role"
      visible={visible}
      width={600}
    >
      {member ? (
        <>
          {lastOwner ? (
            <View style={styles.guard} testID="edit-role-guard">
              <DashboardIcon
                color={colors.feedback.warning}
                name="shield-alert-outline"
                size={16}
              />
              <StylishText style={styles.guardText} unstyled variant="caption">
                {ownerProtectionReason(member, staff)}
              </StylishText>
            </View>
          ) : null}

          <Field label="Role">
            <RolePicker onChange={setRole} testID="edit-role" value={role} />
          </Field>

          <PermissionPreview
            permissions={previewPermissions(role)}
            title={`${role} will be able to:`}
          />
        </>
      ) : (
        <View />
      )}
    </DashboardDialog>
  );
}

export function PermissionsDialog({
  member,
  onClose,
}: {
  member: StaffMember | null;
  onClose: () => void;
}) {
  return (
    <DashboardDialog
      description={member ? `${member.name} · ${member.role}` : ""}
      onClose={onClose}
      testID="permissions-dialog"
      title="Permissions"
      visible={member !== null}
      width={560}
    >
      {member ? (
        <PermissionPreview
          permissions={previewPermissions(member.role)}
          title={`Granted by the ${member.role} role`}
        />
      ) : (
        <View />
      )}
    </DashboardDialog>
  );
}

function Field({
  children,
  error,
  label,
  required = false,
}: {
  children: React.ReactNode;
  error?: string;
  label: string;
  required?: boolean;
}) {
  return (
    <View style={styles.field}>
      <StylishText style={styles.fieldLabel} unstyled variant="caption">
        {label}
        {required ? " *" : ""}
      </StylishText>
      {children}
      {error ? (
        <StylishText style={styles.fieldError} unstyled variant="caption">
          {error}
        </StylishText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  actionsSpacer: { flexBasis: 40, flexGrow: 0, flexShrink: 0 },
  card: {
    backgroundColor: colors.neutral[50],
    borderColor: colors.neutral[200],
    borderRadius: borderRadius.md,
    borderStyle: "solid",
    borderWidth: 1,
    gap: spacing.xs,
    padding: spacing.md,
  },
  cardChips: { flexDirection: "row", flexWrap: "wrap", gap: spacing.xs },
  cardHeading: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: spacing.xs,
    justifyContent: "space-between",
  },
  cardMeta: {
    color: colors.neutral[550],
    fontFamily: "Montserrat_400Regular",
    fontSize: 10,
    lineHeight: 16,
  },
  cards: { gap: spacing.sm, paddingHorizontal: spacing.md },
  controls: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
    padding: spacing.lg,
  },
  emptyRow: { paddingVertical: spacing.xl },
  emptyText: {
    color: colors.neutral[550],
    fontFamily: "Montserrat_400Regular",
    fontSize: 12,
    lineHeight: 18,
    textAlign: "center",
  },
  field: { gap: spacing.xxs },
  fieldError: {
    color: colors.feedback.danger,
    fontFamily: "Montserrat_500Medium",
    fontSize: 11,
    lineHeight: 16,
  },
  fieldLabel: {
    color: colors.ink.primary,
    fontFamily: "Montserrat_600SemiBold",
    fontSize: 12,
    lineHeight: 18,
  },
  guard: {
    alignItems: "flex-start",
    backgroundColor: colors.feedback.warningSoft,
    borderColor: colors.feedback.warningBorder,
    borderRadius: borderRadius.input,
    borderStyle: "solid",
    borderWidth: 1,
    flexDirection: "row",
    gap: spacing.xs,
    padding: spacing.sm,
  },
  guardText: {
    color: colors.feedback.warning,
    flexShrink: 1,
    fontFamily: "Montserrat_500Medium",
    fontSize: 12,
    lineHeight: 18,
  },
  identityCopy: {
    flexBasis: 0,
    flexGrow: 1,
    flexShrink: 1,
    gap: 1,
    minWidth: 0,
  },
  input: {
    backgroundColor: colors.neutral[150],
    borderColor: colors.neutral[200],
    borderRadius: borderRadius.input,
    borderStyle: "solid",
    borderWidth: 1,
    color: colors.ink.primary,
    fontFamily: "Montserrat_400Regular",
    fontSize: 13,
    lineHeight: 20,
    minHeight: 44,
    paddingHorizontal: spacing.sm,
    paddingVertical: 10,
  },
  memberEmail: {
    color: colors.neutral[550],
    fontFamily: "Montserrat_400Regular",
    fontSize: 10,
    lineHeight: 15,
  },
  memberName: {
    color: colors.ink.primary,
    flexShrink: 1,
    fontFamily: "Montserrat_600SemiBold",
    fontSize: 12,
    lineHeight: 18,
  },
  nameRow: { alignItems: "center", flexDirection: "row", gap: spacing.xxs },
  notice: {
    alignItems: "center",
    backgroundColor: colors.feedback.infoSoft,
    borderColor: colors.brand.blueSoft,
    borderRadius: borderRadius.input,
    borderStyle: "solid",
    borderWidth: 1,
    flexDirection: "row",
    gap: spacing.xs,
    marginHorizontal: spacing.lg,
    marginTop: spacing.lg,
    padding: spacing.sm,
  },
  noticeText: {
    color: colors.feedback.info,
    flexShrink: 1,
    fontFamily: "Montserrat_500Medium",
    fontSize: 11,
    lineHeight: 16,
  },
  ownerTag: {
    alignItems: "center",
    backgroundColor: colors.feedback.dangerSoft,
    borderColor: colors.brand.pinkSoft,
    borderRadius: borderRadius.pill,
    borderStyle: "solid",
    borderWidth: 1,
    flexDirection: "row",
    flexShrink: 0,
    gap: 2,
    paddingHorizontal: 6,
  },
  ownerTagText: {
    color: colors.feedback.danger,
    fontFamily: "Montserrat_600SemiBold",
    fontSize: 9,
    lineHeight: 15,
  },
  preview: {
    backgroundColor: colors.neutral[50],
    borderColor: colors.neutral[200],
    borderRadius: borderRadius.input,
    borderStyle: "solid",
    borderWidth: 1,
    gap: spacing.sm,
    padding: spacing.sm,
  },
  previewChip: {
    alignItems: "center",
    backgroundColor: colors.neutral[0],
    borderColor: colors.neutral[200],
    borderRadius: borderRadius.pill,
    borderStyle: "solid",
    borderWidth: 1,
    flexDirection: "row",
    gap: 4,
    minHeight: 24,
    paddingHorizontal: spacing.xs,
  },
  previewChipText: {
    color: colors.ink.primary,
    fontFamily: "Montserrat_500Medium",
    fontSize: 10,
    lineHeight: 16,
  },
  previewChips: { flexDirection: "row", flexWrap: "wrap", gap: spacing.xxs },
  previewEmpty: {
    color: colors.neutral[550],
    fontFamily: "Montserrat_400Regular",
    fontSize: 12,
    lineHeight: 18,
  },
  previewGroup: { gap: spacing.xxs },
  previewGroupLabel: {
    color: colors.neutral[550],
    fontFamily: "Montserrat_600SemiBold",
    fontSize: 9,
    letterSpacing: 0.4,
    lineHeight: 14,
  },
  previewTitle: {
    color: colors.ink.primary,
    fontFamily: "Montserrat_600SemiBold",
    fontSize: 12,
    lineHeight: 18,
  },
  roleGrid: { flexDirection: "row", flexWrap: "wrap", gap: spacing.xs },
  roleOption: {
    alignItems: "center",
    backgroundColor: colors.neutral[150],
    borderColor: colors.neutral[200],
    borderRadius: borderRadius.pill,
    borderStyle: "solid",
    borderWidth: 1,
    flexDirection: "row",
    gap: 4,
    minHeight: 36,
    paddingHorizontal: spacing.sm,
  },
  roleOptionDisabled: { opacity: 0.45 },
  roleOptionLabel: {
    color: colors.neutral[550],
    fontFamily: "Montserrat_500Medium",
    fontSize: 12,
    lineHeight: 18,
  },
  roleOptionLabelSelected: { color: colors.feedback.danger },
  roleOptionSelected: {
    backgroundColor: colors.brand.socialSurface,
    borderColor: colors.brand.pinkSoft,
  },
  table: { flexGrow: 1, paddingHorizontal: spacing.lg },
  tableBody: { minHeight: STAFF_PAGE_SIZE * 52 },
  tableContent: { flexGrow: 1 },
  tableHeader: { backgroundColor: colors.neutral[50] },
  tableRow: {
    alignItems: "center",
    borderBottomColor: colors.neutral[200],
    borderBottomWidth: 1,
    flexDirection: "row",
    gap: spacing.xs,
    minHeight: 52,
    paddingHorizontal: spacing.sm,
  },
  tableScroll: { flexGrow: 0 },
  tile: {
    backgroundColor: colors.neutral[50],
    borderColor: colors.neutral[200],
    borderRadius: borderRadius.input,
    borderStyle: "solid",
    borderWidth: 1,
    gap: spacing.xxs,
    padding: spacing.sm,
  },
  tileDot: {
    borderRadius: borderRadius.pill,
    flexShrink: 0,
    height: 8,
    width: 8,
  },
  tileGrid: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  tileHeader: { alignItems: "center", flexDirection: "row", gap: spacing.xs },
  tileLabel: {
    color: colors.neutral[550],
    flexShrink: 1,
    fontFamily: "Montserrat_400Regular",
    fontSize: 11,
    lineHeight: 16,
  },
  tileValue: {
    color: colors.ink.primary,
    fontFamily: "Montserrat_700Bold",
    fontSize: 18,
    lineHeight: 24,
  },
  tileWrap: { padding: spacing.lg },
});
