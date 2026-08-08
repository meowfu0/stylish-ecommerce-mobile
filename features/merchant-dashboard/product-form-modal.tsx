import { useEffect, useMemo, useRef, useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";

import { StylishTextInput } from "@/components/forms/stylish-text-input";
import { StylishText } from "@/components/typography/stylish-text";
import { borderRadius, colors, spacing } from "@/constants/design-tokens";
import { DashboardDialog } from "@/features/merchant-dashboard/dashboard-dialog";
import {
  DashboardButton,
  DashboardIcon,
  StatusChip,
} from "@/features/merchant-dashboard/dashboard-primitives";
import { AuthRequestError } from "@/services/auth/auth-error";
import {
  type BrandView,
  type CategoryView,
  createProduct,
  type CreateProductBody,
  newIdempotencyKey,
  type ProductDetailsView,
  PRODUCT_SLUG_PATTERN,
  slugify,
  updateProduct,
  type UpdateProductBody,
} from "@/services/merchant/catalog-api";

/**
 * One product form, used for both Create and Edit.
 *
 * It carries exactly the fields `CreateProductDto` and `UpdateProductDto`
 * accept — nothing more. Price, SKU, stock and images are deliberately absent:
 * they live on variants and images, behind their own endpoints, and a field here
 * would have nowhere to go. Status is absent too, because the server assigns
 * `DRAFT` on create and only the lifecycle endpoints move it afterwards.
 */

const NAME_MAX = 200;
const SLUG_MAX = 220;
const SHORT_DESCRIPTION_MAX = 500;
const DESCRIPTION_MAX = 20_000;
const CATEGORY_MAX = 20;

export type ProductFormValues = {
  categoryIds: string[];
  description: string;
  brandId: string;
  isFeatured: boolean;
  name: string;
  primaryCategoryId: string;
  shortDescription: string;
  slug: string;
};

export type ProductFormErrors = Partial<
  Record<keyof ProductFormValues | "form", string>
>;

export function emptyProductForm(): ProductFormValues {
  return {
    brandId: "",
    categoryIds: [],
    description: "",
    isFeatured: false,
    name: "",
    primaryCategoryId: "",
    shortDescription: "",
    slug: "",
  };
}

export function productFormValues(
  product: ProductDetailsView,
): ProductFormValues {
  return {
    brandId: product.brandId ?? "",
    categoryIds: [...product.categoryIds],
    description: product.description ?? "",
    isFeatured: product.isFeatured,
    name: product.name,
    primaryCategoryId: product.primaryCategoryId ?? "",
    shortDescription: product.shortDescription ?? "",
    slug: product.slug,
  };
}

/**
 * Mirrors the server's own rules so a request that cannot succeed is never sent.
 * The server re-validates everything; this only spares the merchant a round trip.
 */
export function validateProductForm(
  values: ProductFormValues,
): ProductFormErrors {
  const errors: ProductFormErrors = {};
  const name = values.name.trim();
  const slug = values.slug.trim();

  if (name.length === 0) errors.name = "Enter a product name";
  else if (name.length > NAME_MAX) {
    errors.name = `Use at most ${NAME_MAX} characters`;
  }

  if (slug.length === 0) errors.slug = "Enter a URL slug";
  else if (slug.length > SLUG_MAX) {
    errors.slug = `Use at most ${SLUG_MAX} characters`;
  } else if (!PRODUCT_SLUG_PATTERN.test(slug)) {
    errors.slug = "Use lowercase letters, numbers and single hyphens";
  }

  if (values.shortDescription.length > SHORT_DESCRIPTION_MAX) {
    errors.shortDescription = `Use at most ${SHORT_DESCRIPTION_MAX} characters`;
  }
  if (values.description.length > DESCRIPTION_MAX) {
    errors.description = `Use at most ${DESCRIPTION_MAX} characters`;
  }
  if (values.categoryIds.length > CATEGORY_MAX) {
    errors.categoryIds = `Choose at most ${CATEGORY_MAX} categories`;
  }
  // The server rejects a primary category that is not among the selected ones.
  if (
    values.primaryCategoryId &&
    !values.categoryIds.includes(values.primaryCategoryId)
  ) {
    errors.primaryCategoryId = "The primary category must be one you selected";
  }

  return errors;
}

/** The create body, with blank optional fields omitted rather than sent empty. */
export function createBodyFrom(values: ProductFormValues): CreateProductBody {
  return {
    name: values.name.trim(),
    slug: values.slug.trim(),
    ...(values.brandId ? { brandId: values.brandId } : {}),
    ...(values.shortDescription.trim()
      ? { shortDescription: values.shortDescription.trim() }
      : {}),
    ...(values.description.trim()
      ? { description: values.description.trim() }
      : {}),
    ...(values.isFeatured ? { isFeatured: true } : {}),
    ...(values.categoryIds.length > 0
      ? { categoryIds: values.categoryIds }
      : {}),
    ...(values.primaryCategoryId
      ? { primaryCategoryId: values.primaryCategoryId }
      : {}),
  };
}

/**
 * Only what actually changed. The server rejects an empty PATCH, and sending
 * untouched fields would overwrite concurrent edits for no reason.
 *
 * `categoryIds` is sent whenever the primary category changes, because the
 * server requires the pair together.
 */
export function updateBodyFrom(
  values: ProductFormValues,
  product: ProductDetailsView,
): UpdateProductBody {
  const body: UpdateProductBody = {};
  const name = values.name.trim();
  const slug = values.slug.trim();
  const shortDescription = values.shortDescription.trim();
  const description = values.description.trim();
  const brandId = values.brandId || null;
  const primaryCategoryId = values.primaryCategoryId || null;
  const sameCategories =
    values.categoryIds.length === product.categoryIds.length &&
    values.categoryIds.every((id) => product.categoryIds.includes(id));

  if (name !== product.name) body.name = name;
  if (slug !== product.slug) body.slug = slug;
  if (brandId !== product.brandId) body.brandId = brandId;
  if (shortDescription !== (product.shortDescription ?? "")) {
    body.shortDescription = shortDescription || null;
  }
  if (description !== (product.description ?? "")) {
    body.description = description || null;
  }
  if (values.isFeatured !== product.isFeatured) {
    body.isFeatured = values.isFeatured;
  }
  if (primaryCategoryId !== product.primaryCategoryId) {
    body.primaryCategoryId = primaryCategoryId;
    body.categoryIds = values.categoryIds;
  } else if (!sameCategories) {
    body.categoryIds = values.categoryIds;
  }

  return body;
}

/** Turns the API's field errors into the form's own error map. */
export function errorsFromResponse(error: unknown): ProductFormErrors {
  if (!(error instanceof AuthRequestError)) {
    return { form: "Something went wrong. Please try again." };
  }

  const mapped: ProductFormErrors = {};
  const known = new Set<keyof ProductFormValues>([
    "brandId",
    "categoryIds",
    "description",
    "isFeatured",
    "name",
    "primaryCategoryId",
    "shortDescription",
    "slug",
  ]);
  for (const [field, message] of Object.entries(error.fieldErrors)) {
    if (known.has(field as keyof ProductFormValues)) {
      mapped[field as keyof ProductFormValues] = message;
    }
  }

  if (Object.keys(mapped).length === 0) {
    mapped.form =
      error.status === 409
        ? (error.message ??
          "That product conflicts with one that already exists.")
        : error.message;
  }
  return mapped;
}

export function ProductFormModal({
  brands,
  categories,
  merchantId,
  onClose,
  onSaved,
  product,
  visible,
}: {
  brands: readonly BrandView[];
  categories: readonly CategoryView[];
  merchantId: string;
  onClose: () => void;
  /** Called with the saved product so the list can refresh around it. */
  onSaved: (product: ProductDetailsView) => void;
  /** Null for Create; the loaded product for Edit. */
  product: ProductDetailsView | null;
  visible: boolean;
}) {
  const editing = product !== null;
  const [values, setValues] = useState<ProductFormValues>(emptyProductForm);
  const [errors, setErrors] = useState<ProductFormErrors>({});
  const [submitting, setSubmitting] = useState(false);
  // Held for the life of one create so a retry after a network blip replays the
  // same key and cannot produce a second product.
  const idempotencyKey = useRef(newIdempotencyKey("product"));
  const slugTouched = useRef(false);

  useEffect(() => {
    if (!visible) return;
    setValues(product ? productFormValues(product) : emptyProductForm());
    setErrors({});
    setSubmitting(false);
    slugTouched.current = editing;
    idempotencyKey.current = newIdempotencyKey("product");
  }, [editing, product, visible]);

  const activeCategories = useMemo(
    () => categories.filter((category) => category.isActive),
    [categories],
  );
  const selectedCategories = useMemo(
    () => activeCategories.filter((c) => values.categoryIds.includes(c.id)),
    [activeCategories, values.categoryIds],
  );

  const set = <Key extends keyof ProductFormValues>(
    key: Key,
    value: ProductFormValues[Key],
  ) => {
    setValues((current) => ({ ...current, [key]: value }));
    setErrors((current) => ({ ...current, [key]: undefined, form: undefined }));
  };

  const changeName = (name: string) => {
    setValues((current) => ({
      ...current,
      name,
      // The slug follows the name until the merchant edits it themselves.
      slug: slugTouched.current ? current.slug : slugify(name),
    }));
    setErrors((current) => ({
      ...current,
      form: undefined,
      name: undefined,
      slug: undefined,
    }));
  };

  const toggleCategory = (id: string) => {
    setValues((current) => {
      const selected = current.categoryIds.includes(id);
      const categoryIds = selected
        ? current.categoryIds.filter((value) => value !== id)
        : [...current.categoryIds, id];
      return {
        ...current,
        categoryIds,
        // Removing the primary category must not leave a dangling reference.
        primaryCategoryId: categoryIds.includes(current.primaryCategoryId)
          ? current.primaryCategoryId
          : (categoryIds[0] ?? ""),
      };
    });
    setErrors((current) => ({
      ...current,
      categoryIds: undefined,
      form: undefined,
      primaryCategoryId: undefined,
    }));
  };

  const submit = async () => {
    if (submitting) return;
    const found = validateProductForm(values);
    if (Object.keys(found).length > 0) {
      setErrors(found);
      return;
    }

    setSubmitting(true);
    try {
      const saved = editing
        ? await updateProduct(
            merchantId,
            product.id,
            updateBodyFrom(values, product),
          )
        : await createProduct(
            merchantId,
            createBodyFrom(values),
            idempotencyKey.current,
          );
      onSaved(saved);
      onClose();
    } catch (error) {
      setErrors(errorsFromResponse(error));
      // A rejected create must not replay the old key, or the server would
      // return the original conflict instead of accepting the correction.
      idempotencyKey.current = newIdempotencyKey("product");
    } finally {
      setSubmitting(false);
    }
  };

  const unchanged =
    editing && Object.keys(updateBodyFrom(values, product)).length === 0;

  return (
    <DashboardDialog
      busy={submitting}
      description={
        editing
          ? "Update the fields your catalog supports. Price, stock and images are managed separately."
          : "New products are created as a draft. Add variants and publish once it is ready."
      }
      footer={
        <>
          <DashboardButton
            disabled={submitting}
            label="Cancel"
            onPress={onClose}
            testID="product-form-cancel"
            tone="quiet"
          />
          <DashboardButton
            disabled={submitting || unchanged}
            icon={submitting ? "progress-clock" : undefined}
            label={
              submitting
                ? "Saving…"
                : editing
                  ? "Save Changes"
                  : "Create Product"
            }
            onPress={() => void submit()}
            testID="product-form-submit"
            title={unchanged ? "Nothing has changed yet." : undefined}
            tone="primary"
          />
        </>
      }
      onClose={onClose}
      testID="product-form-modal"
      title={editing ? "Edit product" : "Create product"}
      visible={visible}
    >
      {errors.form ? (
        <View style={styles.formError} testID="product-form-error">
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

      <Field error={errors.name} label="Product name" required>
        <StylishTextInput
          accessibilityLabel="Product name"
          editable={!submitting}
          maxLength={NAME_MAX}
          onChangeText={changeName}
          placeholder="Amihan Linen Wrap Dress"
          placeholderTextColor={colors.neutral[450]}
          style={styles.input}
          testID="product-form-name"
          value={values.name}
        />
      </Field>

      <Field
        error={errors.slug}
        hint="Used in the storefront URL. Lowercase letters, numbers and hyphens."
        label="URL slug"
        required
      >
        <StylishTextInput
          accessibilityLabel="URL slug"
          autoCapitalize="none"
          editable={!submitting}
          maxLength={SLUG_MAX}
          onChangeText={(slug) => {
            slugTouched.current = true;
            set("slug", slug);
          }}
          placeholder="amihan-linen-wrap-dress"
          placeholderTextColor={colors.neutral[450]}
          style={styles.input}
          testID="product-form-slug"
          value={values.slug}
        />
      </Field>

      <Field error={errors.brandId} label="Brand">
        <InlineSelect
          disabled={submitting}
          emptyLabel="No brand"
          onChange={(brandId) => set("brandId", brandId)}
          options={brands
            .filter((brand) => brand.isActive || brand.id === values.brandId)
            .map((brand) => ({ id: brand.id, label: brand.name }))}
          testID="product-form-brand"
          value={values.brandId}
        />
      </Field>

      <Field
        error={errors.categoryIds}
        hint="A product needs at least one category before it can be published."
        label="Categories"
      >
        {activeCategories.length === 0 ? (
          <StylishText style={styles.hint} unstyled variant="caption">
            No active categories are available for this merchant yet.
          </StylishText>
        ) : (
          <View style={styles.chips}>
            {activeCategories.map((category) => {
              const selected = values.categoryIds.includes(category.id);
              return (
                <Pressable
                  accessibilityLabel={category.name}
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: selected }}
                  className="focus-visible:ring-[3px] focus-visible:ring-brand-blue/55"
                  disabled={submitting}
                  key={category.id}
                  onPress={() => toggleCategory(category.id)}
                  style={[styles.chip, selected && styles.chipSelected]}
                  testID={`product-form-category-${category.id}`}
                >
                  {selected ? (
                    <DashboardIcon
                      color={colors.feedback.danger}
                      name="check"
                      size={14}
                    />
                  ) : null}
                  <StylishText
                    style={[
                      styles.chipLabel,
                      selected && styles.chipLabelSelected,
                    ]}
                    unstyled
                    variant="caption"
                  >
                    {category.name}
                  </StylishText>
                </Pressable>
              );
            })}
          </View>
        )}
      </Field>

      {selectedCategories.length > 0 ? (
        <Field error={errors.primaryCategoryId} label="Primary category">
          <InlineSelect
            disabled={submitting}
            emptyLabel="None"
            onChange={(id) => set("primaryCategoryId", id)}
            options={selectedCategories.map((category) => ({
              id: category.id,
              label: category.name,
            }))}
            testID="product-form-primary-category"
            value={values.primaryCategoryId}
          />
        </Field>
      ) : null}

      <Field
        error={errors.shortDescription}
        hint={`${values.shortDescription.length}/${SHORT_DESCRIPTION_MAX}`}
        label="Short description"
      >
        <StylishTextInput
          accessibilityLabel="Short description"
          editable={!submitting}
          maxLength={SHORT_DESCRIPTION_MAX}
          onChangeText={(value) => set("shortDescription", value)}
          placeholder="A one-line summary for listings"
          placeholderTextColor={colors.neutral[450]}
          style={styles.input}
          testID="product-form-short-description"
          value={values.shortDescription}
        />
      </Field>

      <Field
        error={errors.description}
        hint="Required before this product can be published."
        label="Description"
      >
        <StylishTextInput
          accessibilityLabel="Description"
          editable={!submitting}
          maxLength={DESCRIPTION_MAX}
          multiline
          numberOfLines={5}
          onChangeText={(value) => set("description", value)}
          placeholder="Fabric, fit, care and anything a shopper should know."
          placeholderTextColor={colors.neutral[450]}
          style={[styles.input, styles.textarea]}
          testID="product-form-description"
          value={values.description}
        />
      </Field>

      <Pressable
        accessibilityLabel="Feature this product"
        accessibilityRole="switch"
        accessibilityState={{ checked: values.isFeatured }}
        className="focus-visible:ring-[3px] focus-visible:ring-brand-blue/55"
        disabled={submitting}
        onPress={() => set("isFeatured", !values.isFeatured)}
        style={styles.toggleRow}
        testID="product-form-featured"
      >
        <View
          style={[styles.checkbox, values.isFeatured && styles.checkboxChecked]}
        >
          {values.isFeatured ? (
            <DashboardIcon color={colors.neutral[0]} name="check" size={14} />
          ) : null}
        </View>
        <View style={styles.toggleCopy}>
          <StylishText style={styles.label} unstyled variant="caption">
            Feature this product
          </StylishText>
          <StylishText style={styles.hint} unstyled variant="caption">
            Featured products are surfaced first on the storefront.
          </StylishText>
        </View>
      </Pressable>

      {editing ? (
        <View style={styles.statusRow}>
          <StylishText style={styles.hint} unstyled variant="caption">
            Current status
          </StylishText>
          <StatusChip label={product.status} tone="neutral" />
        </View>
      ) : null}
    </DashboardDialog>
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

/**
 * A select that expands in place rather than in a floating layer: this form is
 * already inside a modal, and a second overlay on top of it is exactly where
 * nested-modal focus and dismissal behaviour goes wrong across platforms.
 */
function InlineSelect({
  disabled,
  emptyLabel,
  onChange,
  options,
  testID,
  value,
}: {
  disabled: boolean;
  emptyLabel: string;
  onChange: (value: string) => void;
  options: { id: string; label: string }[];
  testID: string;
  value: string;
}) {
  const [open, setOpen] = useState(false);
  const selected = options.find((option) => option.id === value);

  return (
    <View>
      <Pressable
        accessibilityLabel={`${selected?.label ?? emptyLabel}. Change selection.`}
        accessibilityRole="button"
        accessibilityState={{ disabled, expanded: open }}
        className="focus-visible:ring-[3px] focus-visible:ring-brand-blue/55"
        disabled={disabled}
        onPress={() => setOpen((current) => !current)}
        style={styles.control}
        testID={testID}
      >
        <StylishText
          numberOfLines={1}
          style={selected ? styles.controlValue : styles.controlPlaceholder}
          unstyled
          variant="caption"
        >
          {selected?.label ?? emptyLabel}
        </StylishText>
        <DashboardIcon name={open ? "chevron-up" : "chevron-down"} size={16} />
      </Pressable>

      {open ? (
        <View style={styles.optionList} testID={`${testID}-options`}>
          <SelectRow
            label={emptyLabel}
            onPress={() => {
              onChange("");
              setOpen(false);
            }}
            selected={value === ""}
            testID={`${testID}-option-none`}
          />
          {options.map((option) => (
            <SelectRow
              key={option.id}
              label={option.label}
              onPress={() => {
                onChange(option.id);
                setOpen(false);
              }}
              selected={option.id === value}
              testID={`${testID}-option-${option.id}`}
            />
          ))}
        </View>
      ) : null}
    </View>
  );
}

function SelectRow({
  label,
  onPress,
  selected,
  testID,
}: {
  label: string;
  onPress: () => void;
  selected: boolean;
  testID: string;
}) {
  const [hovered, setHovered] = useState(false);

  return (
    <Pressable
      accessibilityRole="menuitem"
      accessibilityState={{ selected }}
      className="focus-visible:ring-[3px] focus-visible:ring-brand-blue/55"
      onHoverIn={() => setHovered(true)}
      onHoverOut={() => setHovered(false)}
      onPress={onPress}
      style={[styles.optionRow, hovered && styles.optionRowHovered]}
      testID={testID}
    >
      <View style={styles.optionIcon}>
        {selected ? (
          <DashboardIcon color={colors.ink.primary} name="check" size={14} />
        ) : null}
      </View>
      <StylishText
        numberOfLines={1}
        style={styles.optionLabel}
        unstyled
        variant="caption"
      >
        {label}
      </StylishText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  checkbox: {
    alignItems: "center",
    borderColor: colors.neutral[300],
    borderRadius: borderRadius.xs,
    borderStyle: "solid",
    borderWidth: 1,
    flexShrink: 0,
    height: 20,
    justifyContent: "center",
    marginTop: 1,
    width: 20,
  },
  checkboxChecked: {
    backgroundColor: colors.brand.primary,
    borderColor: colors.brand.primary,
  },
  chip: {
    alignItems: "center",
    backgroundColor: colors.neutral[150],
    borderColor: colors.neutral[200],
    borderRadius: borderRadius.pill,
    borderStyle: "solid",
    borderWidth: 1,
    flexDirection: "row",
    gap: 4,
    minHeight: 32,
    paddingHorizontal: spacing.sm,
  },
  chipLabel: {
    color: colors.neutral[550],
    fontFamily: "Montserrat_500Medium",
    fontSize: 12,
    lineHeight: 18,
  },
  chipLabelSelected: { color: colors.feedback.danger },
  chipSelected: {
    backgroundColor: colors.brand.socialSurface,
    borderColor: colors.brand.pinkSoft,
  },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: spacing.xs },
  control: {
    alignItems: "center",
    backgroundColor: colors.neutral[150],
    borderColor: colors.neutral[200],
    borderRadius: borderRadius.input,
    borderStyle: "solid",
    borderWidth: 1,
    flexDirection: "row",
    gap: spacing.xs,
    justifyContent: "space-between",
    minHeight: 44,
    paddingHorizontal: spacing.sm,
  },
  controlPlaceholder: {
    color: colors.neutral[450],
    flexShrink: 1,
    fontFamily: "Montserrat_400Regular",
    fontSize: 13,
    lineHeight: 20,
  },
  controlValue: {
    color: colors.ink.primary,
    flexShrink: 1,
    fontFamily: "Montserrat_400Regular",
    fontSize: 13,
    lineHeight: 20,
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
  optionIcon: { alignItems: "center", width: 16 },
  optionLabel: {
    color: colors.ink.primary,
    flexShrink: 1,
    fontFamily: "Montserrat_500Medium",
    fontSize: 12,
    lineHeight: 18,
  },
  optionList: {
    backgroundColor: colors.neutral[0],
    borderColor: colors.neutral[200],
    borderRadius: borderRadius.input,
    borderStyle: "solid",
    borderWidth: 1,
    marginTop: spacing.xxs,
    maxHeight: 220,
    overflow: "hidden",
    padding: spacing.xxs,
  },
  optionRow: {
    alignItems: "center",
    borderRadius: borderRadius.sm,
    flexDirection: "row",
    gap: spacing.xs,
    minHeight: 36,
    paddingHorizontal: spacing.xs,
  },
  optionRowHovered: { backgroundColor: colors.neutral[75] },
  statusRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.xs,
  },
  textarea: { minHeight: 108, textAlignVertical: "top" },
  toggleCopy: { flex: 1, gap: 2, minWidth: 0 },
  toggleRow: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: spacing.xs,
  },
});
