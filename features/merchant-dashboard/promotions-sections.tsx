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
  formatPeso,
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
import type { MerchantSession } from "@/features/merchant-dashboard/dashboard-types";
import {
  type Promotion,
  PROMOTION_STATUSES,
  PROMOTION_TYPES,
  type PromotionScope,
  promotionScopeLabel,
  type PromotionStatus,
  type PromotionType,
  promotionTypeLabels,
} from "@/features/merchant-dashboard/promotions-reviews-demo-data";
import {
  ALL_STATUSES,
  ALL_TYPES,
  availablePromotionActions,
  isIsoDate,
  paginate,
  type PromotionAction,
  type PromotionFilters,
  promotionStatusCounts,
  WORKSPACE_PAGE_SIZE,
} from "@/features/merchant-dashboard/use-promotions-reviews";

/**
 * The Promotions workspace and the one form that serves both Create and Edit.
 *
 * Built from the same table pattern the rest of the dashboard uses — the shared
 * filter row, flex-ratio columns, anchored row menus and pagination — so a
 * merchant moving between workspaces is looking at one system.
 */

const TILE_MIN_WIDTH = 150;
const DENSE_TABLE_WIDTH = 1000;

const statusTones: Record<
  PromotionStatus,
  ComponentProps<typeof StatusChip>["tone"]
> = {
  Active: "green",
  Archived: "neutral",
  Draft: "blue",
  Expired: "neutral",
  Paused: "warning",
  Scheduled: "pink",
};

const actionLabels: Record<PromotionAction, string> = {
  activate: "Activate",
  archive: "Archive promotion",
  duplicate: "Duplicate",
  pause: "Pause",
};

const actionIcons: Record<
  PromotionAction,
  ComponentProps<typeof DashboardIcon>["name"]
> = {
  activate: "play-circle-outline",
  archive: "archive-arrow-down-outline",
  duplicate: "content-duplicate",
  pause: "pause-circle-outline",
};

/** The discount a row advertises, in the unit its type actually uses. */
export function discountLabel(promotion: Promotion) {
  if (promotion.type === "FREE_SHIPPING") return "Free shipping";
  if (promotion.type === "PERCENTAGE") return `${promotion.discountValue}%`;
  return formatPeso(promotion.discountValue, { decimals: false });
}

export function usageLabel(promotion: Promotion) {
  return promotion.usageLimit === null
    ? `${formatCount(promotion.usageCount)} used`
    : `${formatCount(promotion.usageCount)} / ${formatCount(promotion.usageLimit)}`;
}

export function promotionMenuItems({
  onAction,
  onEdit,
  onView,
  promotion,
  session,
}: {
  onAction?: (promotion: Promotion, action: PromotionAction) => void;
  onEdit?: (promotion: Promotion) => void;
  onView?: (promotion: Promotion) => void;
  promotion: Promotion;
  session?: MerchantSession;
}): DashboardMenuItem[] {
  const manages = session ? can(session, "promotions.manage") : true;

  return [
    {
      icon: "eye-outline",
      key: "view",
      label: "View promotion",
      onPress: () => onView?.(promotion),
    },
    {
      disabled: !manages || promotion.status === "Archived",
      icon: "pencil-outline",
      key: "edit",
      label: "Edit promotion",
      onPress:
        manages && promotion.status !== "Archived"
          ? () => onEdit?.(promotion)
          : undefined,
    },
    ...availablePromotionActions(promotion).map((action) => ({
      disabled: !manages,
      icon: actionIcons[action],
      key: action,
      label: actionLabels[action],
      onPress: manages ? () => onAction?.(promotion, action) : undefined,
    })),
  ];
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
    <View
      onLayout={grid.onLayout}
      style={styles.tileGrid}
      testID="promotion-tiles"
    >
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

export function PromotionsContent({
  compact,
  filters,
  onAction,
  onCreate,
  onEdit,
  onFiltersChange,
  onView,
  promotions,
  session,
}: {
  compact: boolean;
  filters: PromotionFilters;
  onAction?: (promotion: Promotion, action: PromotionAction) => void;
  onCreate?: () => void;
  onEdit?: (promotion: Promotion) => void;
  onFiltersChange: (filters: PromotionFilters) => void;
  onView?: (promotion: Promotion) => void;
  promotions: readonly Promotion[];
  session?: MerchantSession;
}) {
  const [page, setPage] = useState(1);
  const [tableWidth, setTableWidth] = useState(0);

  const counts = useMemo(() => promotionStatusCounts(promotions), [promotions]);
  const { pageCount, rows, safePage } = paginate(
    promotions,
    page,
    WORKSPACE_PAGE_SIZE,
  );
  const dense = tableWidth > 0 && tableWidth < DENSE_TABLE_WIDTH;
  const manages = Boolean(session && can(session, "promotions.manage"));

  const setFilter = (next: Partial<PromotionFilters>) => {
    setPage(1);
    onFiltersChange({ ...filters, ...next });
  };
  const menu = (promotion: Promotion) =>
    promotionMenuItems({ onAction, onEdit, onView, promotion, session });

  return (
    <>
      <DashboardCard testID="promotions-summary">
        <SectionHeading
          description="Where every promotion in this workspace currently stands."
          title="Promotion pipeline"
        />
        <View style={styles.tileWrap}>
          <SummaryTiles
            tiles={[
              {
                key: "active",
                label: "Active",
                tone: colors.feedback.success,
                value: counts.active,
              },
              {
                key: "scheduled",
                label: "Scheduled",
                tone: colors.brand.primary,
                value: counts.scheduled,
              },
              {
                key: "draft",
                label: "Draft",
                tone: colors.feedback.info,
                value: counts.draft,
              },
              {
                key: "expired",
                label: "Expired",
                tone: colors.neutral[400],
                value: counts.expired,
              },
            ]}
          />
        </View>
      </DashboardCard>

      <DashboardCard testID="promotions-table-card">
        <SectionHeading
          action={
            <DashboardButton
              disabled={!manages}
              icon="plus"
              label="Create Promotion"
              onPress={onCreate}
              testID="promotions-create"
              title="Your role cannot manage promotions."
              tone="primary"
            />
          }
          description={`${promotions.length} promotions match your filters`}
          title="Promotions"
        />
        <View style={styles.notice}>
          <DashboardIcon
            color={colors.feedback.info}
            name="flask-outline"
            size={14}
          />
          <StylishText style={styles.noticeText} unstyled variant="caption">
            Creating, editing and status changes update the demo data only —
            they are not sent anywhere yet.
          </StylishText>
        </View>

        <View style={styles.controls}>
          <SearchField
            accessibilityLabel="Search promotions"
            label="Search promotions"
            onChangeText={(query) => setFilter({ query })}
            placeholder="Promotion name or target"
            testID="promotions-search"
            value={filters.query}
          />
          <FilterSelect
            label="Status"
            onChange={(next) =>
              setFilter({
                status: PROMOTION_STATUSES.find((status) => status === next),
              })
            }
            options={[ALL_STATUSES, ...PROMOTION_STATUSES]}
            testID="promotions-status-filter"
            value={filters.status ?? ALL_STATUSES}
          />
          <FilterSelect
            label="Type"
            onChange={(next) =>
              setFilter({
                type: PROMOTION_TYPES.find(
                  (type) => promotionTypeLabels[type] === next,
                ),
              })
            }
            options={[
              ALL_TYPES,
              ...PROMOTION_TYPES.map((type) => promotionTypeLabels[type]),
            ]}
            testID="promotions-type-filter"
            value={filters.type ? promotionTypeLabels[filters.type] : ALL_TYPES}
          />
          <SearchField
            accessibilityLabel="Promotions active from"
            label="From (YYYY-MM-DD)"
            onChangeText={(value) =>
              setFilter({ from: isIsoDate(value) ? value : undefined })
            }
            placeholder="2026-08-01"
            testID="promotions-from"
            value={filters.from ?? ""}
          />
          <SearchField
            accessibilityLabel="Promotions active to"
            label="To (YYYY-MM-DD)"
            onChangeText={(value) =>
              setFilter({ to: isIsoDate(value) ? value : undefined })
            }
            placeholder="2026-08-31"
            testID="promotions-to"
            value={filters.to ?? ""}
          />
        </View>

        {compact ? (
          <View style={styles.cards} testID="promotions-body">
            {rows.map((promotion) => (
              <View
                key={promotion.id}
                style={styles.card}
                testID={`promotion-card-${promotion.id}`}
              >
                <View style={styles.cardHeading}>
                  <View style={styles.identityCopy}>
                    <StylishText
                      numberOfLines={2}
                      style={styles.rowTitle}
                      unstyled
                      variant="caption"
                    >
                      {promotion.name}
                    </StylishText>
                    <StylishText
                      numberOfLines={1}
                      style={styles.rowMeta}
                      unstyled
                      variant="caption"
                    >
                      {promotionTypeLabels[promotion.type]} ·{" "}
                      {promotionScopeLabel(promotion)}
                    </StylishText>
                  </View>
                  <RowActionsButton
                    accessibilityLabel={`Actions for ${promotion.name}`}
                    items={menu(promotion)}
                    menuLabel={`${promotion.name} actions`}
                    testID={`promotion-card-actions-${promotion.id}`}
                  />
                </View>
                <View style={styles.cardChips}>
                  <StatusChip
                    label={promotion.status}
                    tone={statusTones[promotion.status]}
                  />
                  <StatusChip label={discountLabel(promotion)} tone="blue" />
                </View>
                <StylishText
                  numberOfLines={2}
                  style={styles.rowMeta}
                  unstyled
                  variant="caption"
                >
                  {formatOrderDate(promotion.startsAt)} →{" "}
                  {formatOrderDate(promotion.endsAt)} · {usageLabel(promotion)}
                </StylishText>
              </View>
            ))}
            {rows.length === 0 ? (
              <EmptyRow label="No promotions match your filters." />
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
              style={[styles.table, { minWidth: dense ? 860 : 1040 }]}
            >
              <View style={[styles.tableRow, styles.tableHeader]}>
                <TableCell width={2.2}>
                  <TableText header value="Promotion" />
                </TableCell>
                <TableCell width={1.1}>
                  <TableText header value="Type" />
                </TableCell>
                <TableCell width={1}>
                  <TableText header value="Discount" />
                </TableCell>
                {dense ? null : (
                  <TableCell width={1.4}>
                    <TableText header value="Applies to" />
                  </TableCell>
                )}
                <TableCell width={1}>
                  <TableText header value="Start" />
                </TableCell>
                <TableCell width={1}>
                  <TableText header value="End" />
                </TableCell>
                {dense ? null : (
                  <TableCell width={1}>
                    <TableText header value="Usage" />
                  </TableCell>
                )}
                <TableCell width={1.1}>
                  <TableText header value="Status" />
                </TableCell>
                <View style={styles.actionsSpacer} />
              </View>

              <View style={styles.tableBody} testID="promotions-body">
                {rows.map((promotion) => (
                  <View
                    key={promotion.id}
                    style={styles.tableRow}
                    testID={`promotion-row-${promotion.id}`}
                  >
                    <TableCell width={2.2}>
                      <TableText strong value={promotion.name} />
                    </TableCell>
                    <TableCell width={1.1}>
                      <TableText value={promotionTypeLabels[promotion.type]} />
                    </TableCell>
                    <TableCell width={1}>
                      <TableText
                        numeric
                        strong
                        value={discountLabel(promotion)}
                      />
                    </TableCell>
                    {dense ? null : (
                      <TableCell width={1.4}>
                        <TableText value={promotionScopeLabel(promotion)} />
                      </TableCell>
                    )}
                    <TableCell width={1}>
                      <TableText value={formatOrderDate(promotion.startsAt)} />
                    </TableCell>
                    <TableCell width={1}>
                      <TableText value={formatOrderDate(promotion.endsAt)} />
                    </TableCell>
                    {dense ? null : (
                      <TableCell width={1}>
                        <TableText numeric value={usageLabel(promotion)} />
                      </TableCell>
                    )}
                    <TableCell width={1.1}>
                      <StatusChip
                        label={promotion.status}
                        tone={statusTones[promotion.status]}
                      />
                    </TableCell>
                    <RowActionsButton
                      accessibilityLabel={`Actions for ${promotion.name}`}
                      items={menu(promotion)}
                      menuLabel={`${promotion.name} actions`}
                      testID={`promotion-actions-${promotion.id}`}
                    />
                  </View>
                ))}
                {rows.length === 0 ? (
                  <EmptyRow label="No promotions match your filters." />
                ) : null}
              </View>
            </View>
          </ScrollView>
        )}

        <TablePagination
          onChange={setPage}
          page={safePage}
          pageCount={pageCount}
          testIDPrefix="promotions"
        />
      </DashboardCard>
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

/* ------------------------------------------------------------------ */
/* Promotion form                                                      */
/* ------------------------------------------------------------------ */

export type PromotionFormValues = {
  discountValue: string;
  endsAt: string;
  minimumPurchase: string;
  name: string;
  scope: PromotionScope;
  scopeTarget: string;
  startsAt: string;
  status: PromotionStatus;
  type: PromotionType;
  usageLimit: string;
};

export function emptyPromotionForm(): PromotionFormValues {
  return {
    discountValue: "",
    endsAt: "",
    minimumPurchase: "",
    name: "",
    scope: "all",
    scopeTarget: "",
    startsAt: "",
    status: "Draft",
    type: "PERCENTAGE",
    usageLimit: "",
  };
}

export function promotionFormValues(promotion: Promotion): PromotionFormValues {
  return {
    discountValue:
      promotion.type === "FREE_SHIPPING"
        ? ""
        : promotion.type === "PERCENTAGE"
          ? String(promotion.discountValue)
          : String(promotion.discountValue / 100),
    endsAt: promotion.endsAt,
    minimumPurchase: String(promotion.minimumPurchaseCentavos / 100),
    name: promotion.name,
    scope: promotion.scope,
    scopeTarget: promotion.scopeTarget ?? "",
    startsAt: promotion.startsAt,
    status: promotion.status,
    type: promotion.type,
    usageLimit:
      promotion.usageLimit === null ? "" : String(promotion.usageLimit),
  };
}

export type PromotionFormErrors = Partial<
  Record<keyof PromotionFormValues, string>
>;

/** Money is entered in pesos and stored in centavos, like the rest of the app. */
function pesosToCentavos(value: string) {
  const parsed = Number.parseFloat(value.trim());
  return Number.isFinite(parsed) ? Math.round(parsed * 100) : Number.NaN;
}

export function validatePromotionForm(
  values: PromotionFormValues,
): PromotionFormErrors {
  const errors: PromotionFormErrors = {};

  if (values.name.trim().length === 0) errors.name = "Enter a promotion name";
  else if (values.name.trim().length > 120) {
    errors.name = "Use at most 120 characters";
  }

  if (values.type === "PERCENTAGE") {
    const percent = Number.parseFloat(values.discountValue);
    if (!Number.isFinite(percent) || percent <= 0 || percent > 100) {
      errors.discountValue = "Enter a percentage between 1 and 100";
    }
  } else if (values.type === "FIXED_AMOUNT") {
    const centavos = pesosToCentavos(values.discountValue);
    if (!Number.isFinite(centavos) || centavos <= 0) {
      errors.discountValue = "Enter an amount greater than zero";
    }
  }

  if (values.scope !== "all" && values.scopeTarget.trim().length === 0) {
    errors.scopeTarget = "Name the category or product this applies to";
  }
  if (!isIsoDate(values.startsAt)) errors.startsAt = "Use YYYY-MM-DD";
  if (!isIsoDate(values.endsAt)) errors.endsAt = "Use YYYY-MM-DD";
  else if (isIsoDate(values.startsAt) && values.endsAt < values.startsAt) {
    errors.endsAt = "The end date must fall after the start date";
  }

  if (values.minimumPurchase.trim().length > 0) {
    const minimum = pesosToCentavos(values.minimumPurchase);
    if (!Number.isFinite(minimum) || minimum < 0) {
      errors.minimumPurchase = "Enter zero or a positive amount";
    }
  }
  if (values.usageLimit.trim().length > 0) {
    const limit = Number.parseInt(values.usageLimit.trim(), 10);
    if (!Number.isInteger(limit) || limit <= 0) {
      errors.usageLimit = "Enter a whole number greater than zero";
    }
  }

  return errors;
}

/** Builds the promotion a valid form describes, preserving usage on an edit. */
export function promotionFrom(
  values: PromotionFormValues,
  existing: Promotion | null,
): Promotion {
  const discountValue =
    values.type === "FREE_SHIPPING"
      ? 0
      : values.type === "PERCENTAGE"
        ? Number.parseFloat(values.discountValue)
        : pesosToCentavos(values.discountValue);

  return {
    discountValue,
    endsAt: values.endsAt,
    id: existing?.id ?? `promo-${Math.random().toString(36).slice(2, 10)}`,
    minimumPurchaseCentavos:
      values.minimumPurchase.trim().length > 0
        ? pesosToCentavos(values.minimumPurchase)
        : 0,
    name: values.name.trim(),
    scope: values.scope,
    scopeTarget: values.scope === "all" ? null : values.scopeTarget.trim(),
    startsAt: values.startsAt,
    status: values.status,
    type: values.type,
    // Usage belongs to the promotion's history, not to the form.
    usageCount: existing?.usageCount ?? 0,
    usageLimit:
      values.usageLimit.trim().length > 0
        ? Number.parseInt(values.usageLimit.trim(), 10)
        : null,
  };
}

export function PromotionFormModal({
  onClose,
  onSave,
  promotion,
  visible,
}: {
  onClose: () => void;
  onSave: (promotion: Promotion) => void;
  /** Null for Create; the row for Edit. */
  promotion: Promotion | null;
  visible: boolean;
}) {
  const editing = promotion !== null;
  const [values, setValues] = useState<PromotionFormValues>(emptyPromotionForm);
  const [errors, setErrors] = useState<PromotionFormErrors>({});

  useEffect(() => {
    if (!visible) return;
    setValues(
      promotion ? promotionFormValues(promotion) : emptyPromotionForm(),
    );
    setErrors({});
  }, [promotion, visible]);

  const set = <Key extends keyof PromotionFormValues>(
    key: Key,
    value: PromotionFormValues[Key],
  ) => {
    setValues((current) => ({ ...current, [key]: value }));
    setErrors((current) => ({ ...current, [key]: undefined }));
  };

  const submit = () => {
    const found = validatePromotionForm(values);
    if (Object.keys(found).length > 0) {
      setErrors(found);
      return;
    }
    onSave(promotionFrom(values, promotion));
    onClose();
  };

  return (
    <DashboardDialog
      description={
        editing
          ? "Changes apply to the demo data so you can see them on the list."
          : "New promotions are added to the demo data immediately."
      }
      footer={
        <>
          <DashboardButton
            label="Cancel"
            onPress={onClose}
            testID="promotion-form-cancel"
            tone="quiet"
          />
          <DashboardButton
            label={editing ? "Save Changes" : "Create Promotion"}
            onPress={submit}
            testID="promotion-form-submit"
            tone="primary"
          />
        </>
      }
      onClose={onClose}
      testID="promotion-form-modal"
      title={editing ? "Edit promotion" : "Create promotion"}
      visible={visible}
      width={600}
    >
      <Field error={errors.name} label="Promotion name" required>
        <StylishTextInput
          accessibilityLabel="Promotion name"
          maxLength={120}
          onChangeText={(value) => set("name", value)}
          placeholder="Amihan Season Launch"
          placeholderTextColor={colors.neutral[450]}
          style={styles.input}
          testID="promotion-form-name"
          value={values.name}
        />
      </Field>

      <Field label="Type">
        <Segmented
          onChange={(type) => set("type", type as PromotionType)}
          options={PROMOTION_TYPES.map((type) => ({
            label: promotionTypeLabels[type],
            value: type,
          }))}
          testID="promotion-form-type"
          value={values.type}
        />
      </Field>

      {values.type === "FREE_SHIPPING" ? null : (
        <Field
          error={errors.discountValue}
          hint={
            values.type === "PERCENTAGE"
              ? "A whole percentage between 1 and 100."
              : "In pesos; stored in centavos."
          }
          label={
            values.type === "PERCENTAGE" ? "Discount %" : "Discount amount"
          }
          required
        >
          <StylishTextInput
            accessibilityLabel="Discount value"
            inputMode="decimal"
            onChangeText={(value) => set("discountValue", value)}
            placeholder={values.type === "PERCENTAGE" ? "20" : "500"}
            placeholderTextColor={colors.neutral[450]}
            style={styles.input}
            testID="promotion-form-discount"
            value={values.discountValue}
          />
        </Field>
      )}

      <Field label="Applies to">
        <Segmented
          onChange={(scope) => set("scope", scope as PromotionScope)}
          options={[
            { label: "All products", value: "all" },
            { label: "Category", value: "category" },
            { label: "Product", value: "product" },
          ]}
          testID="promotion-form-scope"
          value={values.scope}
        />
      </Field>

      {values.scope === "all" ? null : (
        <Field error={errors.scopeTarget} label="Target" required>
          <StylishTextInput
            accessibilityLabel="Promotion target"
            onChangeText={(value) => set("scopeTarget", value)}
            placeholder={
              values.scope === "category" ? "Dresses" : "Habi Weave Tote"
            }
            placeholderTextColor={colors.neutral[450]}
            style={styles.input}
            testID="promotion-form-target"
            value={values.scopeTarget}
          />
        </Field>
      )}

      <View style={styles.formRow}>
        <Field error={errors.startsAt} label="Start (YYYY-MM-DD)" required>
          <StylishTextInput
            accessibilityLabel="Start date"
            onChangeText={(value) => set("startsAt", value)}
            placeholder="2026-08-01"
            placeholderTextColor={colors.neutral[450]}
            style={styles.input}
            testID="promotion-form-start"
            value={values.startsAt}
          />
        </Field>
        <Field error={errors.endsAt} label="End (YYYY-MM-DD)" required>
          <StylishTextInput
            accessibilityLabel="End date"
            onChangeText={(value) => set("endsAt", value)}
            placeholder="2026-08-31"
            placeholderTextColor={colors.neutral[450]}
            style={styles.input}
            testID="promotion-form-end"
            value={values.endsAt}
          />
        </Field>
      </View>

      <View style={styles.formRow}>
        <Field
          error={errors.minimumPurchase}
          hint="Leave blank for no minimum."
          label="Minimum purchase (₱)"
        >
          <StylishTextInput
            accessibilityLabel="Minimum purchase"
            inputMode="decimal"
            onChangeText={(value) => set("minimumPurchase", value)}
            placeholder="1500"
            placeholderTextColor={colors.neutral[450]}
            style={styles.input}
            testID="promotion-form-minimum"
            value={values.minimumPurchase}
          />
        </Field>
        <Field
          error={errors.usageLimit}
          hint="Leave blank for unlimited."
          label="Usage limit"
        >
          <StylishTextInput
            accessibilityLabel="Usage limit"
            inputMode="numeric"
            onChangeText={(value) => set("usageLimit", value)}
            placeholder="500"
            placeholderTextColor={colors.neutral[450]}
            style={styles.input}
            testID="promotion-form-limit"
            value={values.usageLimit}
          />
        </Field>
      </View>

      <Field label="Status">
        <Segmented
          onChange={(status) => set("status", status as PromotionStatus)}
          options={["Draft", "Scheduled", "Active", "Paused"].map((status) => ({
            label: status,
            value: status,
          }))}
          testID="promotion-form-status"
          value={values.status}
        />
      </Field>
    </DashboardDialog>
  );
}

function Segmented({
  onChange,
  options,
  testID,
  value,
}: {
  onChange: (value: string) => void;
  options: { label: string; value: string }[];
  testID: string;
  value: string;
}) {
  return (
    <View style={styles.segmented}>
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <Pressable
            accessibilityLabel={option.label}
            accessibilityRole="radio"
            accessibilityState={{ checked: selected }}
            className="focus-visible:ring-[3px] focus-visible:ring-brand-blue/55"
            key={option.value}
            onPress={() => onChange(option.value)}
            style={[styles.segment, selected && styles.segmentSelected]}
            testID={`${testID}-${option.value}`}
          >
            <StylishText
              numberOfLines={1}
              style={[
                styles.segmentLabel,
                selected && styles.segmentLabelSelected,
              ]}
              unstyled
              variant="caption"
            >
              {option.label}
            </StylishText>
          </Pressable>
        );
      })}
    </View>
  );
}

function Field({
  children,
  error,
  hint,
  label,
  required = false,
}: {
  children: React.ReactNode;
  error?: string;
  hint?: string;
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
      ) : hint ? (
        <StylishText style={styles.fieldHint} unstyled variant="caption">
          {hint}
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
  field: { flexBasis: 0, flexGrow: 1, gap: spacing.xxs, minWidth: 168 },
  fieldError: {
    color: colors.feedback.danger,
    fontFamily: "Montserrat_500Medium",
    fontSize: 11,
    lineHeight: 16,
  },
  fieldHint: {
    color: colors.neutral[550],
    fontFamily: "Montserrat_400Regular",
    fontSize: 11,
    lineHeight: 16,
  },
  fieldLabel: {
    color: colors.ink.primary,
    fontFamily: "Montserrat_600SemiBold",
    fontSize: 12,
    lineHeight: 18,
  },
  formRow: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
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
  rowMeta: {
    color: colors.neutral[550],
    fontFamily: "Montserrat_400Regular",
    fontSize: 10,
    lineHeight: 15,
  },
  rowTitle: {
    color: colors.ink.primary,
    fontFamily: "Montserrat_600SemiBold",
    fontSize: 12,
    lineHeight: 17,
  },
  segment: {
    alignItems: "center",
    backgroundColor: colors.neutral[150],
    borderColor: colors.neutral[200],
    borderRadius: borderRadius.input,
    borderStyle: "solid",
    borderWidth: 1,
    flexBasis: 0,
    flexGrow: 1,
    justifyContent: "center",
    minHeight: 44,
    paddingHorizontal: spacing.xs,
  },
  segmentLabel: {
    color: colors.neutral[550],
    fontFamily: "Montserrat_500Medium",
    fontSize: 12,
    lineHeight: 18,
  },
  segmentLabelSelected: { color: colors.feedback.danger },
  segmentSelected: {
    backgroundColor: colors.brand.socialSurface,
    borderColor: colors.brand.pinkSoft,
  },
  segmented: { flexDirection: "row", flexWrap: "wrap", gap: spacing.xs },
  table: { flexGrow: 1, paddingHorizontal: spacing.lg },
  tableBody: { minHeight: WORKSPACE_PAGE_SIZE * 48 },
  tableContent: { flexGrow: 1 },
  tableHeader: { backgroundColor: colors.neutral[50] },
  tableRow: {
    alignItems: "center",
    borderBottomColor: colors.neutral[200],
    borderBottomWidth: 1,
    flexDirection: "row",
    gap: spacing.xs,
    minHeight: 48,
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
