import { useRef, useState, type ReactNode } from "react";
import { Pressable, StyleSheet, View } from "react-native";

import { StylishTextInput } from "@/components/forms/stylish-text-input";
import { StylishText } from "@/components/typography/stylish-text";
import { borderRadius, colors, spacing } from "@/constants/design-tokens";
import {
  DashboardMenu,
  type DashboardMenuItem,
  type MenuAnchor,
} from "@/features/merchant-dashboard/dashboard-menu";
import {
  DashboardButton,
  DashboardIcon,
} from "@/features/merchant-dashboard/dashboard-primitives";

/**
 * The dashboard's shared table furniture.
 *
 * Recent orders established this pattern — measured filter row, flex-ratio
 * columns, an anchored row menu and the reference pagination — and the catalog
 * tables need exactly the same behaviour. Keeping one implementation here means
 * the two never drift apart, and the column typography stays defined once.
 */

/**
 * Measures its trigger so an anchored menu can sit against it. Open state is
 * tracked separately from the measurement, so a trigger still opens its menu if
 * `measureInWindow` has not reported a frame yet.
 */
export function useAnchoredMenu() {
  const trigger = useRef<View>(null);
  const [anchor, setAnchor] = useState<MenuAnchor | null>(null);
  const [visible, setVisible] = useState(false);

  return {
    anchor,
    close: () => setVisible(false),
    open: () => {
      setVisible(true);
      trigger.current?.measureInWindow((x, y, width, height) => {
        setAnchor({ height, width, x, y });
      });
    },
    trigger,
    visible,
  };
}

/** Labelled select backed by the shared anchored menu. */
export function FilterSelect({
  fill = false,
  label,
  onChange,
  options,
  testID,
  value,
}: {
  /**
   * Stretches the field to its container instead of the compact 168px a table
   * toolbar wants. Settings-style cards use this so a row of selects fills the
   * card rather than leaving dead space at its right edge.
   */
  fill?: boolean;
  label: string;
  onChange: (value: string) => void;
  options: readonly string[];
  testID: string;
  value: string;
}) {
  const menu = useAnchoredMenu();

  return (
    <View style={[styles.filterField, fill && styles.filterFieldFill]}>
      <StylishText style={styles.fieldLabel} unstyled variant="caption">
        {label}
      </StylishText>
      <Pressable
        accessibilityLabel={`${label}: ${value}`}
        accessibilityRole="button"
        accessibilityState={{ expanded: menu.visible }}
        className="focus-visible:ring-[3px] focus-visible:ring-brand-blue/55"
        onPress={menu.open}
        ref={menu.trigger}
        style={[styles.filterControl, fill && styles.filterControlFill]}
        testID={testID}
      >
        <StylishText
          numberOfLines={1}
          style={styles.filterLabel}
          unstyled
          variant="caption"
        >
          {value}
        </StylishText>
        <DashboardIcon name="chevron-down" size={16} />
      </Pressable>
      <DashboardMenu
        accessibilityLabel={`${label} options`}
        align="start"
        anchor={menu.anchor}
        items={options.map((option) => ({
          key: option,
          label: option,
          onPress: () => onChange(option),
          selected: option === value,
        }))}
        minWidth={168}
        onClose={menu.close}
        testID={`${testID}-menu`}
        visible={menu.visible}
      />
    </View>
  );
}

/** Labelled search box. Takes the width the compact selects leave behind. */
export function SearchField({
  accessibilityLabel,
  label,
  onChangeText,
  placeholder,
  testID,
  value,
}: {
  accessibilityLabel: string;
  label: string;
  onChangeText: (value: string) => void;
  placeholder: string;
  testID?: string;
  value: string;
}) {
  return (
    <View style={styles.searchFieldColumn}>
      <StylishText style={styles.fieldLabel} unstyled variant="caption">
        {label}
      </StylishText>
      <View style={styles.searchControl}>
        <DashboardIcon name="magnify" />
        <StylishTextInput
          accessibilityLabel={accessibilityLabel}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={colors.neutral[450]}
          style={styles.searchInput}
          testID={testID}
          value={value}
        />
      </View>
    </View>
  );
}

/** One column box. `width` is a flex ratio, never a pixel width. */
export function TableCell({
  children,
  width,
}: {
  children: ReactNode;
  width: number;
}) {
  return <View style={{ flex: width, minWidth: 0 }}>{children}</View>;
}

/** Column text. Numeric values are tabular so they line up down the list. */
export function TableText({
  header = false,
  lines,
  numeric = false,
  strong = false,
  value,
}: {
  header?: boolean;
  lines?: number;
  numeric?: boolean;
  strong?: boolean;
  value: string;
}) {
  return (
    <StylishText
      numberOfLines={lines ?? (numeric ? 1 : 2)}
      style={[
        styles.tableText,
        strong && styles.tableTextStrong,
        numeric && styles.numericValue,
        header && styles.tableHeaderText,
      ]}
      unstyled
      variant="caption"
    >
      {header ? value.toUpperCase() : value}
    </StylishText>
  );
}

/**
 * Sortable column header. The active column takes the brand colour and shows
 * its direction; the rest stay neutral behind a quiet affordance, so a table
 * with several sortable columns still reads as having exactly one sort.
 */
export function SortHeaderCell({
  active = true,
  ascendingHint = "ascending",
  descendingHint = "descending",
  direction,
  label,
  onPress,
  testID,
  width,
}: {
  active?: boolean;
  ascendingHint?: string;
  descendingHint?: string;
  direction: "asc" | "desc";
  label: string;
  onPress: () => void;
  testID: string;
  width: number;
}) {
  return (
    <Pressable
      accessibilityLabel={
        active
          ? `Sort by ${label}, currently ${
              direction === "desc" ? descendingHint : ascendingHint
            }`
          : `Sort by ${label}`
      }
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      className="focus-visible:ring-[3px] focus-visible:ring-brand-blue/55"
      onPress={onPress}
      style={[styles.sortHeader, { flex: width }]}
      testID={testID}
    >
      <StylishText
        numberOfLines={1}
        style={active ? styles.sortHeaderLabel : styles.tableHeaderText}
        unstyled
        variant="caption"
      >
        {label.toUpperCase()}
      </StylishText>
      <DashboardIcon
        color={active ? colors.brand.primary : colors.neutral[400]}
        name={
          active
            ? direction === "desc"
              ? "arrow-down"
              : "arrow-up"
            : "unfold-more-horizontal"
        }
        size={12}
      />
    </Pressable>
  );
}

/**
 * Three-dot row menu. The caller decides which actions a row and a role allow;
 * this only owns the trigger, its hover treatment and the anchored menu.
 */
export function RowActionsButton({
  accessibilityLabel,
  items,
  menuLabel,
  testID,
}: {
  accessibilityLabel: string;
  items: readonly DashboardMenuItem[];
  menuLabel: string;
  testID: string;
}) {
  const menu = useAnchoredMenu();
  const [hovered, setHovered] = useState(false);
  const open = menu.visible;

  return (
    <View style={styles.rowActionsCell}>
      <Pressable
        accessibilityLabel={accessibilityLabel}
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
        className="focus-visible:ring-[3px] focus-visible:ring-brand-blue/55"
        onHoverIn={() => setHovered(true)}
        onHoverOut={() => setHovered(false)}
        onPress={menu.open}
        ref={menu.trigger}
        style={[
          styles.rowActionsTrigger,
          (hovered || open) && styles.rowActionsTriggerActive,
        ]}
        testID={testID}
      >
        <DashboardIcon
          color={open ? colors.ink.primary : colors.neutral[550]}
          name="dots-horizontal"
          size={18}
        />
      </Pressable>
      <DashboardMenu
        accessibilityLabel={menuLabel}
        anchor={menu.anchor}
        items={items}
        onClose={menu.close}
        testID={`${testID}-menu`}
        visible={open}
      />
    </View>
  );
}

/** The reference pagination footer: page indicator left, controls right. */
export function TablePagination({
  onChange,
  page,
  pageCount,
  testIDPrefix,
}: {
  onChange: (page: number) => void;
  page: number;
  pageCount: number;
  testIDPrefix: string;
}) {
  return (
    <View style={styles.pagination}>
      <StylishText
        accessibilityLiveRegion="polite"
        style={styles.pageLabel}
        unstyled
        variant="caption"
      >
        Page {page} of {pageCount}
      </StylishText>
      <View style={styles.paginationButtons}>
        <DashboardButton
          disabled={page <= 1}
          icon="chevron-left"
          label="Previous"
          onPress={() => onChange(Math.max(1, page - 1))}
          testID={`${testIDPrefix}-previous-page`}
          tone="quiet"
        />
        <DashboardButton
          disabled={page >= pageCount}
          label="Next"
          onPress={() => onChange(Math.min(pageCount, page + 1))}
          testID={`${testIDPrefix}-next-page`}
          trailingIcon="chevron-right"
        />
      </View>
    </View>
  );
}

/**
 * Clamps a page against the rows that survived filtering and slices it out.
 * Pure, so a filter that shrinks the list below the current page can be tested
 * without rendering a table.
 */
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

const styles = StyleSheet.create({
  fieldLabel: {
    color: colors.neutral[550],
    fontFamily: "Montserrat_500Medium",
    fontSize: 11,
    lineHeight: 16,
  },
  filterControl: {
    alignItems: "center",
    backgroundColor: colors.neutral[150],
    borderColor: colors.neutral[200],
    borderRadius: borderRadius.input,
    borderWidth: 1,
    flexDirection: "row",
    gap: spacing.xs,
    justifyContent: "space-between",
    minHeight: 44,
    minWidth: 150,
    paddingHorizontal: spacing.sm,
  },
  // The control's own floor, dropped in fill mode so a field can shrink to a
  // single narrow column on a phone.
  filterControlFill: { minWidth: 0 },
  // Selects stay compact; the search field takes the width that is left.
  filterField: {
    flexGrow: 0,
    flexShrink: 0,
    gap: spacing.xxs,
    width: 168,
  },
  filterFieldFill: {
    flexGrow: 1,
    flexShrink: 1,
    minWidth: 0,
    width: "100%",
  },
  filterLabel: {
    color: colors.ink.primary,
    flexShrink: 1,
    fontFamily: "Montserrat_400Regular",
    fontSize: 12,
    lineHeight: 18,
  },
  numericValue: { flexShrink: 0, fontVariant: ["tabular-nums"] },
  pageLabel: {
    color: colors.neutral[550],
    fontFamily: "Montserrat_400Regular",
    fontSize: 11,
    lineHeight: 16,
  },
  pagination: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    padding: spacing.lg,
  },
  paginationButtons: { flexDirection: "row", gap: spacing.xs },
  rowActionsCell: {
    alignItems: "center",
    flexBasis: 40,
    flexGrow: 0,
    flexShrink: 0,
  },
  rowActionsTrigger: {
    alignItems: "center",
    borderRadius: borderRadius.sm,
    height: 32,
    justifyContent: "center",
    // Colour-only change on hover, so the row never shifts under the cursor.
    transitionDuration: "150ms",
    transitionProperty: "background-color",
    width: 32,
  },
  rowActionsTriggerActive: { backgroundColor: colors.neutral[150] },
  searchControl: {
    alignItems: "center",
    backgroundColor: colors.neutral[150],
    borderColor: colors.neutral[200],
    borderRadius: borderRadius.input,
    borderWidth: 1,
    flex: 1,
    flexDirection: "row",
    gap: spacing.xs,
    minHeight: 44,
    minWidth: 220,
    overflow: "hidden",
    paddingHorizontal: spacing.sm,
  },
  searchFieldColumn: {
    flexGrow: 1,
    flexShrink: 1,
    gap: spacing.xxs,
    minWidth: 220,
  },
  searchInput: {
    color: colors.ink.primary,
    flex: 1,
    fontFamily: "Montserrat_400Regular",
    fontSize: 12,
    lineHeight: 18,
    minWidth: 0,
    padding: 0,
  },
  sortHeader: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.xxs,
    minWidth: 0,
  },
  sortHeaderLabel: {
    color: colors.brand.primary,
    fontFamily: "Montserrat_600SemiBold",
    fontSize: 10,
    letterSpacing: 0.4,
    lineHeight: 14,
  },
  tableHeaderText: {
    color: colors.neutral[550],
    fontFamily: "Montserrat_600SemiBold",
    fontSize: 10,
    letterSpacing: 0.4,
    lineHeight: 14,
  },
  tableText: {
    color: colors.neutral[550],
    fontFamily: "Montserrat_400Regular",
    fontSize: 10,
    lineHeight: 15,
  },
  tableTextStrong: {
    color: colors.ink.primary,
    fontFamily: "Montserrat_600SemiBold",
  },
});
