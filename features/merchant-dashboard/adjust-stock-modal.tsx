import { useEffect, useRef, useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";

import { StylishTextInput } from "@/components/forms/stylish-text-input";
import { StylishText } from "@/components/typography/stylish-text";
import { borderRadius, colors, spacing } from "@/constants/design-tokens";
import { DashboardDialog } from "@/features/merchant-dashboard/dashboard-dialog";
import { formatCount } from "@/features/merchant-dashboard/dashboard-format";
import {
  DashboardButton,
  DashboardIcon,
  StatusChip,
} from "@/features/merchant-dashboard/dashboard-primitives";
import { AuthRequestError } from "@/services/auth/auth-error";
import { newIdempotencyKey } from "@/services/merchant/catalog-api";
import {
  adjustStock,
  INVENTORY_MOVEMENT_TYPES,
  type InventoryLevelView,
  type InventoryMovementType,
  movementTypeLabels,
  projectedOnHand,
  stockStatusLabels,
  validateAdjustment,
} from "@/services/merchant/inventory-api";

/**
 * The Adjust Stock dialog.
 *
 * It carries exactly what `CreateInventoryAdjustmentDto` accepts: the location
 * and variant are fixed by the row that opened it, and the merchant supplies an
 * operation, a quantity, a reason and optionally a new reorder threshold.
 *
 * `expectedVersion` is echoed back from the level being adjusted. The server
 * uses it to reject a stale write with a 409 rather than overwriting someone
 * else's change, so a conflict is surfaced as "reload and try again" instead of
 * being retried blindly.
 */

export type AdjustStockErrors = {
  form?: string;
  quantity?: string;
  reason?: string;
  reorderThreshold?: string;
};

/** Parsed here so a half-typed value never reaches the request as NaN. */
export function parseQuantity(value: string) {
  const trimmed = value.trim();
  if (!/^-?\d+$/.test(trimmed)) return Number.NaN;
  return Number.parseInt(trimmed, 10);
}

export function adjustmentErrorMessage(error: unknown) {
  if (!(error instanceof AuthRequestError)) {
    return "Something went wrong. Please try again.";
  }
  if (error.kind === "permission-denied") {
    return "Your role cannot adjust inventory.";
  }
  if (error.status === 409) {
    // The balance moved under us, so the safe answer is to reload, not retry.
    return (
      error.message ||
      "This stock level changed while the dialog was open. Close it and try again with the latest figures."
    );
  }
  if (error.status === 404) return "That variant or location no longer exists.";
  return error.message || "That adjustment could not be applied.";
}

export function AdjustStockModal({
  level,
  locationName,
  merchantId,
  onAdjusted,
  onClose,
  visible,
}: {
  /** Null while closed; the row's level supplies the variant, location and version. */
  level: InventoryLevelView | null;
  locationName?: string;
  merchantId: string;
  onAdjusted: () => void;
  onClose: () => void;
  visible: boolean;
}) {
  const [operation, setOperation] = useState<InventoryMovementType>("STOCK_IN");
  const [quantity, setQuantity] = useState("");
  const [reason, setReason] = useState("");
  const [threshold, setThreshold] = useState("");
  const [errors, setErrors] = useState<AdjustStockErrors>({});
  const [submitting, setSubmitting] = useState(false);
  const idempotencyKey = useRef(newIdempotencyKey("adjust"));

  useEffect(() => {
    if (!visible) return;
    setOperation("STOCK_IN");
    setQuantity("");
    setReason("");
    setThreshold(level ? String(level.reorderThreshold) : "");
    setErrors({});
    setSubmitting(false);
    idempotencyKey.current = newIdempotencyKey("adjust");
  }, [level, visible]);

  if (!level) {
    return (
      <DashboardDialog
        onClose={onClose}
        testID="adjust-stock-modal"
        title="Adjust stock"
        visible={false}
        width={520}
      >
        <View />
      </DashboardDialog>
    );
  }

  const parsedQuantity = parseQuantity(quantity);
  const parsedThreshold =
    threshold.trim() === "" ? null : parseQuantity(threshold);
  const projected = projectedOnHand(level.onHand, operation, parsedQuantity);
  const wouldGoNegative = Number.isFinite(parsedQuantity) && projected < 0;

  const submit = async () => {
    if (submitting) return;
    const found: AdjustStockErrors = validateAdjustment({
      operation,
      quantity: parsedQuantity,
      reason,
    });
    if (
      parsedThreshold !== null &&
      (!Number.isInteger(parsedThreshold) || parsedThreshold < 0)
    ) {
      found.reorderThreshold = "Enter zero or a positive whole number";
    }
    if (Object.keys(found).length > 0) {
      setErrors(found);
      return;
    }
    if (wouldGoNegative) {
      // The server enforces this too; catching it here saves a round trip.
      setErrors({ quantity: "On hand cannot fall below zero" });
      return;
    }

    setSubmitting(true);
    try {
      await adjustStock(
        merchantId,
        {
          expectedVersion: level.version as number,
          locationId: level.locationId as string,
          operation,
          quantity: parsedQuantity,
          reason: reason.trim(),
          variantId: level.variantId,
          ...(parsedThreshold !== null &&
          parsedThreshold !== level.reorderThreshold
            ? { reorderThreshold: parsedThreshold }
            : {}),
        },
        idempotencyKey.current,
      );
      onAdjusted();
      onClose();
    } catch (error) {
      setErrors({ form: adjustmentErrorMessage(error) });
      // A rejected attempt must not replay the old key, or the server would
      // return the original outcome instead of accepting the correction.
      idempotencyKey.current = newIdempotencyKey("adjust");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <DashboardDialog
      busy={submitting}
      description={`${level.variantName} · ${level.sku}`}
      footer={
        <>
          <DashboardButton
            disabled={submitting}
            label="Cancel"
            onPress={onClose}
            testID="adjust-stock-cancel"
            tone="quiet"
          />
          <DashboardButton
            disabled={submitting}
            label={submitting ? "Applying…" : "Apply Adjustment"}
            onPress={() => void submit()}
            testID="adjust-stock-submit"
            tone="primary"
          />
        </>
      }
      onClose={onClose}
      testID="adjust-stock-modal"
      title={`Adjust ${level.productName}`}
      visible={visible}
      width={520}
    >
      {errors.form ? (
        <View style={styles.formError} testID="adjust-stock-error">
          <DashboardIcon
            color={colors.feedback.danger}
            name="alert-circle-outline"
            size={16}
          />
          <StylishText style={styles.formErrorText} unstyled variant="caption">
            {errors.form}
          </StylishText>
        </View>
      ) : null}

      <View style={styles.summary}>
        <View style={styles.summaryRow}>
          <StatusChip
            label={stockStatusLabels[level.stockStatus]}
            tone={
              level.stockStatus === "IN_STOCK"
                ? "green"
                : level.stockStatus === "LOW_STOCK"
                  ? "warning"
                  : "danger"
            }
          />
          {locationName ? (
            <StatusChip label={locationName} tone="neutral" />
          ) : null}
        </View>
        <View style={styles.summaryMetrics}>
          <Datum label="On hand" value={level.onHand} />
          <Datum label="Reserved" value={level.reserved} />
          <Datum label="Available" value={level.available} />
        </View>
      </View>

      <Field label="Operation">
        <View style={styles.segmented}>
          {INVENTORY_MOVEMENT_TYPES.map((type) => {
            const selected = type === operation;
            return (
              <Pressable
                accessibilityLabel={movementTypeLabels[type]}
                accessibilityRole="radio"
                accessibilityState={{ checked: selected }}
                className="focus-visible:ring-[3px] focus-visible:ring-brand-blue/55"
                disabled={submitting}
                key={type}
                onPress={() => {
                  setOperation(type);
                  setErrors((current) => ({
                    ...current,
                    form: undefined,
                    quantity: undefined,
                  }));
                }}
                style={[styles.segment, selected && styles.segmentSelected]}
                testID={`adjust-operation-${type}`}
              >
                <StylishText
                  style={[
                    styles.segmentLabel,
                    selected && styles.segmentLabelSelected,
                  ]}
                  unstyled
                  variant="caption"
                >
                  {movementTypeLabels[type]}
                </StylishText>
              </Pressable>
            );
          })}
        </View>
      </Field>

      <Field
        error={errors.quantity}
        hint={
          operation === "ADJUSTMENT"
            ? "A signed change, for example -3 to remove three."
            : "A positive whole number."
        }
        label="Quantity"
        required
      >
        <StylishTextInput
          accessibilityLabel="Quantity"
          editable={!submitting}
          inputMode="numeric"
          onChangeText={(value) => {
            setQuantity(value);
            setErrors((current) => ({
              ...current,
              form: undefined,
              quantity: undefined,
            }));
          }}
          placeholder={operation === "ADJUSTMENT" ? "-3" : "12"}
          placeholderTextColor={colors.neutral[450]}
          style={styles.input}
          testID="adjust-quantity"
          value={quantity}
        />
      </Field>

      {Number.isFinite(parsedQuantity) ? (
        <View
          style={[styles.preview, wouldGoNegative && styles.previewDanger]}
          testID="adjust-preview"
        >
          <DashboardIcon
            color={
              wouldGoNegative ? colors.feedback.danger : colors.feedback.info
            }
            name={wouldGoNegative ? "alert-outline" : "arrow-right"}
            size={14}
          />
          <StylishText
            style={[
              styles.previewText,
              wouldGoNegative && styles.previewTextDanger,
            ]}
            unstyled
            variant="caption"
          >
            {wouldGoNegative
              ? `On hand would fall to ${formatCount(projected)}, which the server rejects.`
              : `On hand ${formatCount(level.onHand)} → ${formatCount(projected)}`}
          </StylishText>
        </View>
      ) : null}

      <Field
        error={errors.reason}
        hint="Recorded on the movement history and cannot be edited later."
        label="Reason"
        required
      >
        <StylishTextInput
          accessibilityLabel="Reason"
          editable={!submitting}
          maxLength={500}
          multiline
          numberOfLines={3}
          onChangeText={(value) => {
            setReason(value);
            setErrors((current) => ({
              ...current,
              form: undefined,
              reason: undefined,
            }));
          }}
          placeholder="Cycle count correction, supplier delivery, damaged unit…"
          placeholderTextColor={colors.neutral[450]}
          style={[styles.input, styles.textarea]}
          testID="adjust-reason"
          value={reason}
        />
      </Field>

      <Field
        error={errors.reorderThreshold}
        hint="Leave unchanged to keep the current threshold."
        label="Reorder threshold"
      >
        <StylishTextInput
          accessibilityLabel="Reorder threshold"
          editable={!submitting}
          inputMode="numeric"
          onChangeText={(value) => {
            setThreshold(value);
            setErrors((current) => ({
              ...current,
              form: undefined,
              reorderThreshold: undefined,
            }));
          }}
          placeholder={String(level.reorderThreshold)}
          placeholderTextColor={colors.neutral[450]}
          style={styles.input}
          testID="adjust-threshold"
          value={threshold}
        />
      </Field>
    </DashboardDialog>
  );
}

function Datum({ label, value }: { label: string; value: number }) {
  return (
    <View style={styles.datum}>
      <StylishText style={styles.datumLabel} unstyled variant="caption">
        {label.toUpperCase()}
      </StylishText>
      <StylishText style={styles.datumValue} unstyled variant="caption">
        {formatCount(value)}
      </StylishText>
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
      <StylishText style={styles.label} unstyled variant="caption">
        {label}
        {required ? " *" : ""}
      </StylishText>
      {children}
      {error ? (
        <StylishText style={styles.error} unstyled variant="caption">
          {error}
        </StylishText>
      ) : hint ? (
        <StylishText style={styles.hint} unstyled variant="caption">
          {hint}
        </StylishText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  datum: { flexBasis: 0, flexGrow: 1, gap: 1, minWidth: 0 },
  datumLabel: {
    color: colors.neutral[550],
    fontFamily: "Montserrat_500Medium",
    fontSize: 9,
    letterSpacing: 0.3,
    lineHeight: 13,
  },
  datumValue: {
    color: colors.ink.primary,
    fontFamily: "Montserrat_700Bold",
    fontSize: 15,
    fontVariant: ["tabular-nums"],
    lineHeight: 22,
  },
  error: {
    color: colors.feedback.danger,
    fontFamily: "Montserrat_500Medium",
    fontSize: 11,
    lineHeight: 16,
  },
  field: { gap: spacing.xxs },
  formError: {
    alignItems: "flex-start",
    backgroundColor: colors.feedback.dangerSoft,
    borderColor: colors.feedback.dangerBorder,
    borderRadius: borderRadius.input,
    borderStyle: "solid",
    borderWidth: 1,
    flexDirection: "row",
    gap: spacing.xs,
    padding: spacing.sm,
  },
  formErrorText: {
    color: colors.feedback.danger,
    flexShrink: 1,
    fontFamily: "Montserrat_500Medium",
    fontSize: 12,
    lineHeight: 18,
  },
  hint: {
    color: colors.neutral[550],
    fontFamily: "Montserrat_400Regular",
    fontSize: 11,
    lineHeight: 16,
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
  label: {
    color: colors.ink.primary,
    fontFamily: "Montserrat_600SemiBold",
    fontSize: 12,
    lineHeight: 18,
  },
  preview: {
    alignItems: "center",
    backgroundColor: colors.feedback.infoSoft,
    borderColor: colors.brand.blueSoft,
    borderRadius: borderRadius.input,
    borderStyle: "solid",
    borderWidth: 1,
    flexDirection: "row",
    gap: spacing.xs,
    padding: spacing.sm,
  },
  previewDanger: {
    backgroundColor: colors.feedback.dangerSoft,
    borderColor: colors.feedback.dangerBorder,
  },
  previewText: {
    color: colors.feedback.info,
    flexShrink: 1,
    fontFamily: "Montserrat_500Medium",
    fontSize: 12,
    lineHeight: 18,
  },
  previewTextDanger: { color: colors.feedback.danger },
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
  segmented: { flexDirection: "row", gap: spacing.xs },
  summary: {
    backgroundColor: colors.neutral[50],
    borderColor: colors.neutral[200],
    borderRadius: borderRadius.input,
    borderStyle: "solid",
    borderWidth: 1,
    gap: spacing.sm,
    padding: spacing.sm,
  },
  summaryMetrics: { flexDirection: "row", gap: spacing.sm },
  summaryRow: { flexDirection: "row", flexWrap: "wrap", gap: spacing.xs },
  textarea: { minHeight: 88, textAlignVertical: "top" },
});
