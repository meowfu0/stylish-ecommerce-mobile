import { useEffect, useState, type ReactNode } from "react";
import { Pressable, StyleSheet, View } from "react-native";

import { StylishTextInput } from "@/components/forms/stylish-text-input";
import { StylishText } from "@/components/typography/stylish-text";
import { borderRadius, colors, spacing } from "@/constants/design-tokens";
import { can } from "@/features/merchant-dashboard/dashboard-access";
import { DashboardDialog } from "@/features/merchant-dashboard/dashboard-dialog";
import { formatOrderDate } from "@/features/merchant-dashboard/dashboard-format";
import { useResponsiveGrid } from "@/features/merchant-dashboard/dashboard-grid";
import {
  DashboardButton,
  DashboardCard,
  DashboardIcon,
  type DashboardIconName,
  SectionHeading,
  StatusChip,
} from "@/features/merchant-dashboard/dashboard-primitives";
import { FilterSelect } from "@/features/merchant-dashboard/dashboard-table";
import { presentStoreStatus } from "@/features/merchant-dashboard/merchant-store-status";
import type { MerchantSession } from "@/features/merchant-dashboard/dashboard-types";
import {
  DATE_FORMATS,
  type DateFormat,
  formattedAddress,
  type MerchantProfile,
  NOTIFICATION_KEYS,
  type NotificationKey,
  type NotificationPreferences,
  notificationCopy,
  PREFERENCE_LOCATIONS,
  type SecurityInfo,
  type SecuritySession,
  type StorePreferences,
  type Timezone,
  TIMEZONES,
  type WeekStart,
  WEEK_STARTS,
} from "@/features/merchant-dashboard/profile-settings-demo-data";
import {
  DESCRIPTION_LIMIT,
  hasErrors,
  integrationCopy,
  isDirty,
  type PendingIntegration,
  type ProfileFormErrors,
  type ProfileFormValues,
  profileFormValues,
  validateProfile,
} from "@/features/merchant-dashboard/use-profile-settings";

/**
 * The Merchant Profile and Settings workspaces.
 *
 * Both are built from the dashboard's existing furniture — `DashboardCard`,
 * `SectionHeading`, `DashboardButton`, `StatusChip`, `FilterSelect`,
 * `DashboardDialog` and `StylishTextInput` — so nothing here introduces a
 * second card, form or dialog treatment.
 *
 * Anything the session already knows (store name, role, verification, store
 * status, default location, sign-in email) is read from `MerchantSession`
 * rather than duplicated into the fixture, so the profile agrees with the
 * header and the sidebar instead of drifting from them.
 */

const DETAIL_MIN_WIDTH = 220;
/** The narrowest a preference field can be and still show its value in full. */
const PREFERENCE_MIN_WIDTH = 190;

/* ------------------------------------------------------------------ */
/* Merchant Profile                                                    */
/* ------------------------------------------------------------------ */

export function ProfileContent({
  compact,
  onEdit,
  profile,
  session,
}: {
  compact: boolean;
  onEdit: () => void;
  profile: MerchantProfile;
  session: MerchantSession;
}) {
  const editable = can(session, "merchant.profile.update");
  const storeStatus = presentStoreStatus(session);

  return (
    <>
      <DashboardCard testID="profile-header">
        <SectionHeading
          action={
            <DashboardButton
              disabled={!editable}
              icon="pencil-outline"
              label="Edit Profile"
              onPress={onEdit}
              testID="profile-edit"
              title={
                editable
                  ? undefined
                  : "Your role cannot update the merchant profile."
              }
              tone="primary"
            />
          }
          description={profile.description}
          title="Merchant Profile"
        />
        <View style={styles.identity}>
          <View style={styles.avatar}>
            <StylishText style={styles.avatarText} unstyled variant="price">
              {initialsOf(profile.storeName)}
            </StylishText>
          </View>
          <View style={styles.identityCopy}>
            <StylishText
              style={styles.storeName}
              unstyled
              variant="headingSmall"
            >
              {profile.storeName}
            </StylishText>
            <StylishText style={styles.handle} unstyled variant="caption">
              {`@${session.merchantHandle} · ${session.role}`}
            </StylishText>
            <View style={styles.chips}>
              {/* Both chips carry a word and an icon, so status never depends
                  on colour alone. */}
              <StatusChip
                icon={session.verified ? "check-decagram" : "clock-outline"}
                label={session.verified ? "Verified" : "Verification pending"}
                tone={session.verified ? "green" : "warning"}
              />
              <StatusChip
                icon={storeStatus.icon}
                label={storeStatus.label}
                tone={storeStatus.tone}
              />
            </View>
          </View>
        </View>
      </DashboardCard>

      <DetailCard
        compact={compact}
        details={[
          {
            hint: "Shown to shoppers on your storefront.",
            icon: "storefront-outline",
            key: "store",
            label: "Store name",
            value: profile.storeName,
          },
          {
            hint: "Where order and support mail reaches you.",
            icon: "email-outline",
            key: "email",
            label: "Contact email",
            value: profile.contactEmail,
          },
          {
            icon: "phone-outline",
            key: "phone",
            label: "Contact phone",
            value: profile.contactPhone,
          },
          {
            icon: "account-circle-outline",
            key: "signin",
            label: "Sign-in email",
            value: session.email,
          },
        ]}
        description="How customers and Velori reach this business."
        title="Contact"
      />

      <DetailCard
        compact={compact}
        details={[
          {
            icon: "map-marker-outline",
            key: "address",
            label: "Business address",
            value: formattedAddress(profile),
          },
          {
            hint: "Stock movements default to this location.",
            icon: "warehouse",
            key: "location",
            label: "Default location",
            value: session.defaultLocation,
          },
          {
            icon: "shield-account-outline",
            key: "role",
            label: "Merchant role",
            value: session.role,
          },
          {
            icon: "calendar-outline",
            key: "since",
            label: "Member since",
            value: formatOrderDate(profile.memberSince),
          },
        ]}
        description="Registration details for this workspace."
        title="Business information"
      />

      <DashboardCard testID="profile-about">
        <SectionHeading
          description="The short description shown alongside your storefront."
          title="About the business"
        />
        <View style={styles.body}>
          <StylishText style={styles.paragraph} unstyled variant="body">
            {profile.description.length > 0
              ? profile.description
              : "No description yet. Add one so shoppers know what you make."}
          </StylishText>
        </View>
      </DashboardCard>
    </>
  );
}

type Detail = {
  hint?: string;
  icon: DashboardIconName;
  key: string;
  label: string;
  value: string;
};

/**
 * A card of labelled values that wraps into as many columns as the measured
 * width allows, using the dashboard's own grid rather than a card-level
 * breakpoint.
 */
function DetailCard({
  compact,
  description,
  details,
  title,
}: {
  compact: boolean;
  description: string;
  details: Detail[];
  title: string;
}) {
  const grid = useResponsiveGrid({
    count: details.length,
    gap: spacing.sm,
    minItemWidth: DETAIL_MIN_WIDTH,
  });

  return (
    <DashboardCard testID={`profile-${title.toLowerCase().split(" ")[0]}`}>
      <SectionHeading description={description} title={title} />
      <View style={styles.body}>
        <View onLayout={grid.onLayout} style={styles.detailGrid}>
          {details.map((detail) => (
            <View
              key={detail.key}
              style={[styles.detail, compact ? undefined : grid.itemStyle]}
            >
              <View style={styles.detailLabelRow}>
                <DashboardIcon
                  color={colors.neutral[550]}
                  name={detail.icon}
                  size={14}
                />
                <StylishText
                  style={styles.detailLabel}
                  unstyled
                  variant="caption"
                >
                  {detail.label}
                </StylishText>
              </View>
              <StylishText style={styles.detailValue} unstyled variant="body">
                {detail.value}
              </StylishText>
              {detail.hint ? (
                <StylishText style={styles.hint} unstyled variant="caption">
                  {detail.hint}
                </StylishText>
              ) : null}
            </View>
          ))}
        </View>
      </View>
    </DashboardCard>
  );
}

/* ------------------------------------------------------------------ */
/* Edit Profile                                                        */
/* ------------------------------------------------------------------ */

export function EditProfileModal({
  onClose,
  onSave,
  profile,
  visible,
}: {
  onClose: () => void;
  onSave: (values: ProfileFormValues) => void;
  profile: MerchantProfile | null;
  visible: boolean;
}) {
  const [values, setValues] = useState<ProfileFormValues>(() =>
    profile
      ? profileFormValues(profile)
      : {
          addressLine: "",
          city: "",
          contactEmail: "",
          contactPhone: "",
          country: "",
          description: "",
          postalCode: "",
          storeName: "",
        },
  );
  const [errors, setErrors] = useState<ProfileFormErrors>({});

  // Reopening always starts from what is currently saved, so an abandoned edit
  // never leaks into the next one.
  useEffect(() => {
    if (visible && profile) {
      setValues(profileFormValues(profile));
      setErrors({});
    }
  }, [profile, visible]);

  const set = <Key extends keyof ProfileFormValues>(
    key: Key,
    value: ProfileFormValues[Key],
  ) => {
    setValues((current) => ({ ...current, [key]: value }));
    setErrors((current) => ({ ...current, [key]: undefined }));
  };

  const submit = () => {
    const found = validateProfile(values);
    setErrors(found);
    if (hasErrors(found)) return;
    onSave(values);
    onClose();
  };

  const dirty = profile ? isDirty(values, profile) : false;
  const remaining = DESCRIPTION_LIMIT - values.description.length;

  return (
    <DashboardDialog
      description="Changes are kept on this device only — there is no profile endpoint yet."
      footer={
        <>
          <DashboardButton
            label="Cancel"
            onPress={onClose}
            testID="profile-form-cancel"
          />
          <DashboardButton
            disabled={!dirty}
            label="Save changes"
            onPress={submit}
            testID="profile-form-save"
            title={dirty ? undefined : "Nothing has changed yet."}
            tone="primary"
          />
        </>
      }
      onClose={onClose}
      testID="profile-form"
      title="Edit profile"
      visible={visible}
    >
      <Field error={errors.storeName} label="Store name" required>
        <StylishTextInput
          accessibilityLabel="Store name"
          onChangeText={(next) => set("storeName", next)}
          placeholder="Your business name"
          placeholderTextColor={colors.neutral[450]}
          style={styles.input}
          testID="profile-form-name"
          value={values.storeName}
        />
      </Field>

      <View style={styles.formRow}>
        <View style={styles.formColumn}>
          <Field error={errors.contactEmail} label="Contact email" required>
            <StylishTextInput
              accessibilityLabel="Contact email"
              autoCapitalize="none"
              inputMode="email"
              onChangeText={(next) => set("contactEmail", next)}
              placeholder="hello@example.com"
              placeholderTextColor={colors.neutral[450]}
              style={styles.input}
              testID="profile-form-email"
              value={values.contactEmail}
            />
          </Field>
        </View>
        <View style={styles.formColumn}>
          <Field error={errors.contactPhone} label="Contact phone" required>
            <StylishTextInput
              accessibilityLabel="Contact phone"
              inputMode="tel"
              onChangeText={(next) => set("contactPhone", next)}
              placeholder="+63 900 000 0000"
              placeholderTextColor={colors.neutral[450]}
              style={styles.input}
              testID="profile-form-phone"
              value={values.contactPhone}
            />
          </Field>
        </View>
      </View>

      <Field error={errors.addressLine} label="Street address" required>
        <StylishTextInput
          accessibilityLabel="Street address"
          onChangeText={(next) => set("addressLine", next)}
          placeholder="Unit, building and street"
          placeholderTextColor={colors.neutral[450]}
          style={styles.input}
          testID="profile-form-address"
          value={values.addressLine}
        />
      </Field>

      <View style={styles.formRow}>
        <View style={styles.formColumn}>
          <Field error={errors.city} label="City" required>
            <StylishTextInput
              accessibilityLabel="City"
              onChangeText={(next) => set("city", next)}
              placeholder="City"
              placeholderTextColor={colors.neutral[450]}
              style={styles.input}
              testID="profile-form-city"
              value={values.city}
            />
          </Field>
        </View>
        <View style={styles.formColumn}>
          <Field label="Postal code">
            <StylishTextInput
              accessibilityLabel="Postal code"
              inputMode="numeric"
              onChangeText={(next) => set("postalCode", next)}
              placeholder="0000"
              placeholderTextColor={colors.neutral[450]}
              style={styles.input}
              testID="profile-form-postal"
              value={values.postalCode}
            />
          </Field>
        </View>
        <View style={styles.formColumn}>
          <Field label="Country">
            <StylishTextInput
              accessibilityLabel="Country"
              onChangeText={(next) => set("country", next)}
              placeholder="Country"
              placeholderTextColor={colors.neutral[450]}
              style={styles.input}
              testID="profile-form-country"
              value={values.country}
            />
          </Field>
        </View>
      </View>

      <Field
        error={errors.description}
        hint={`${Math.max(0, remaining)} characters left`}
        label="Business description"
      >
        <StylishTextInput
          accessibilityLabel="Business description"
          multiline
          numberOfLines={4}
          onChangeText={(next) => set("description", next)}
          placeholder="What does this business make?"
          placeholderTextColor={colors.neutral[450]}
          style={[styles.input, styles.textarea]}
          testID="profile-form-description"
          value={values.description}
        />
      </Field>
    </DashboardDialog>
  );
}

/* ------------------------------------------------------------------ */
/* Settings                                                            */
/* ------------------------------------------------------------------ */

export function SettingsContent({
  compact,
  notifications,
  onOpenProfile,
  onPending,
  onPreferenceChange,
  onToggleNotification,
  preferences,
  security,
  session,
}: {
  compact: boolean;
  notifications: NotificationPreferences;
  onOpenProfile: () => void;
  onPending: (pending: PendingIntegration) => void;
  onPreferenceChange: <Key extends keyof StorePreferences>(
    key: Key,
    value: StorePreferences[Key],
  ) => void;
  onToggleNotification: (key: NotificationKey) => void;
  preferences: StorePreferences;
  security: SecurityInfo;
  session: MerchantSession;
}) {
  const manageable = can(session, "settings.manage");
  const storeStatus = presentStoreStatus(session);

  return (
    <>
      <DashboardCard testID="settings-header">
        <SectionHeading
          description="Preferences for this workspace. Notification and display settings are saved on this device for now."
          title="Settings"
        />
        <View style={styles.notice}>
          <DashboardIcon
            color={colors.feedback.info}
            name="flask-outline"
            size={14}
          />
          <StylishText style={styles.noticeText} unstyled variant="caption">
            Demo data. Preferences change locally, and security actions are
            marked where they still need backend support.
          </StylishText>
        </View>
      </DashboardCard>

      {/* Account & workspace */}
      <DashboardCard testID="settings-account">
        <SectionHeading
          action={
            <DashboardButton
              icon="account-outline"
              label="Merchant Profile"
              onPress={onOpenProfile}
              testID="settings-open-profile"
            />
          }
          description="Who you are signed in as, and which workspace these settings apply to."
          title="Account & workspace"
        />
        <View style={styles.body}>
          <SettingRow
            label="Workspace"
            value={`${session.merchantName} · @${session.merchantHandle}`}
          />
          <SettingRow label="Signed in as" value={session.email} />
          <SettingRow label="Role" value={session.role} />
          <SettingRow
            label="Merchant status"
            trailing={
              <View style={styles.chips}>
                <StatusChip
                  icon={session.verified ? "check-decagram" : "clock-outline"}
                  label={session.verified ? "Verified" : "Unverified"}
                  tone={session.verified ? "green" : "warning"}
                />
                <StatusChip
                  icon={storeStatus.icon}
                  label={storeStatus.label}
                  tone={storeStatus.tone}
                />
              </View>
            }
          />
        </View>
      </DashboardCard>

      {/* Notifications */}
      <DashboardCard testID="settings-notifications">
        <SectionHeading
          description="Choose what this workspace tells you about."
          title="Notifications"
        />
        <View style={styles.body}>
          {NOTIFICATION_KEYS.map((key) => (
            <SettingToggle
              description={notificationCopy[key].description}
              disabled={!manageable}
              key={key}
              label={notificationCopy[key].label}
              onToggle={() => onToggleNotification(key)}
              testID={`notification-${key}`}
              value={notifications[key]}
            />
          ))}
        </View>
      </DashboardCard>

      {/* Store preferences */}
      <DashboardCard testID="settings-preferences">
        <SectionHeading
          description="How figures, dates and stock are presented across the dashboard."
          title="Store preferences"
        />
        <PreferenceFields
          onPreferenceChange={onPreferenceChange}
          preferences={preferences}
        />
      </DashboardCard>

      {/* Security */}
      <DashboardCard testID="settings-security">
        <SectionHeading
          description="Sign-in and session information for this account."
          title="Security"
        />
        <View style={styles.body}>
          <View style={styles.securityRow}>
            <SettingRow
              hint={`Last changed ${formatOrderDate(security.passwordChangedAt)}.`}
              label="Password"
              value="••••••••••"
            />
            <DashboardButton
              icon="lock-outline"
              label="Change password"
              onPress={() => onPending("change-password")}
              testID="security-change-password"
            />
          </View>

          <SettingRow
            hint={
              security.twoFactorEnabled
                ? undefined
                : "Two-factor sign-in is not available in this build."
            }
            label="Two-factor authentication"
            trailing={
              <StatusChip
                icon={security.twoFactorEnabled ? "check-decagram" : "minus"}
                label={security.twoFactorEnabled ? "Enabled" : "Not set up"}
                tone={security.twoFactorEnabled ? "green" : "neutral"}
              />
            }
          />

          <View style={styles.sessionList}>
            <StylishText style={styles.groupLabel} unstyled variant="caption">
              Active sessions
            </StylishText>
            {security.sessions.map((entry) => (
              <SessionRow entry={entry} key={entry.id} />
            ))}
          </View>

          <DashboardButton
            fullWidth={compact}
            icon="logout"
            label="Sign out other sessions"
            onPress={() => onPending("revoke-sessions")}
            testID="security-revoke-sessions"
          />
        </View>
      </DashboardCard>

      {/* Danger zone */}
      <DashboardCard style={styles.dangerCard} testID="settings-danger">
        <SectionHeading
          description="Actions that take your storefront offline. These need backend support and do nothing yet."
          title="Danger zone"
        />
        <View style={styles.body}>
          <View style={styles.danger}>
            <DashboardIcon
              color={colors.feedback.danger}
              name="alert-outline"
              size={16}
            />
            <StylishText style={styles.dangerText} unstyled variant="caption">
              Deactivating hides your storefront and stops new orders. Existing
              orders and inventory are kept.
            </StylishText>
          </View>
          <DashboardButton
            fullWidth={compact}
            icon="store-off-outline"
            label="Deactivate store"
            onPress={() => onPending("deactivate-store")}
            testID="danger-deactivate"
          />
        </View>
      </DashboardCard>
    </>
  );
}

/**
 * The five store-preference fields.
 *
 * They share one measured grid rather than a card-level breakpoint, so the row
 * packs as many equal columns as fit and every field stretches to fill them —
 * five across on a wide card, then 3 + 2, then one per row on a phone. Currency
 * is a field here rather than a stray row underneath, which is what keeps the
 * card's full width in use at every size.
 */
function PreferenceFields({
  onPreferenceChange,
  preferences,
}: {
  onPreferenceChange: <Key extends keyof StorePreferences>(
    key: Key,
    value: StorePreferences[Key],
  ) => void;
  preferences: StorePreferences;
}) {
  const grid = useResponsiveGrid({
    count: 5,
    gap: spacing.sm,
    minItemWidth: PREFERENCE_MIN_WIDTH,
  });

  return (
    <View style={styles.body}>
      <View onLayout={grid.onLayout} style={styles.preferenceGrid}>
        <View style={grid.itemStyle}>
          <FilterSelect
            fill
            label="Timezone"
            onChange={(next) =>
              onPreferenceChange(
                "timezone",
                (TIMEZONES.find((zone) => zone === next) ??
                  preferences.timezone) as Timezone,
              )
            }
            options={[...TIMEZONES]}
            testID="preference-timezone"
            value={preferences.timezone}
          />
        </View>
        <View style={grid.itemStyle}>
          <FilterSelect
            fill
            label="Date format"
            onChange={(next) =>
              onPreferenceChange(
                "dateFormat",
                (DATE_FORMATS.find((format) => format === next) ??
                  preferences.dateFormat) as DateFormat,
              )
            }
            options={[...DATE_FORMATS]}
            testID="preference-date-format"
            value={preferences.dateFormat}
          />
        </View>
        <View style={grid.itemStyle}>
          <FilterSelect
            fill
            label="Week starts on"
            onChange={(next) =>
              onPreferenceChange(
                "weekStart",
                (WEEK_STARTS.find((day) => day === next) ??
                  preferences.weekStart) as WeekStart,
              )
            }
            options={[...WEEK_STARTS]}
            testID="preference-week-start"
            value={preferences.weekStart}
          />
        </View>
        <View style={grid.itemStyle}>
          <FilterSelect
            fill
            label="Default inventory location"
            onChange={(next) =>
              onPreferenceChange(
                "defaultLocation",
                PREFERENCE_LOCATIONS.find((location) => location === next) ??
                  preferences.defaultLocation,
              )
            }
            options={[...PREFERENCE_LOCATIONS]}
            testID="preference-location"
            value={preferences.defaultLocation}
          />
        </View>
        {/* Currency is shown rather than offered: every figure in the app is
            stored in Philippine centavos, so a picker here would be a choice
            the dashboard cannot honour. It keeps the field shape of its
            neighbours, with a lock instead of a chevron so it does not read as
            something you can open. */}
        <View style={grid.itemStyle}>
          <View style={styles.readOnlyField}>
            <StylishText style={styles.fieldLabel} unstyled variant="caption">
              Currency
            </StylishText>
            <View
              accessibilityLabel="Currency: PHP, Philippine peso. This cannot be changed."
              accessibilityRole="text"
              style={styles.readOnlyControl}
              testID="preference-currency"
            >
              <StylishText
                numberOfLines={1}
                style={styles.readOnlyValue}
                unstyled
                variant="caption"
              >
                PHP (₱)
              </StylishText>
              <DashboardIcon
                color={colors.neutral[450]}
                name="lock-outline"
                size={14}
              />
            </View>
          </View>
        </View>
      </View>
      <StylishText style={styles.hint} unstyled variant="caption">
        All amounts are stored and displayed in Philippine pesos.
      </StylishText>
    </View>
  );
}

function SessionRow({ entry }: { entry: SecuritySession }) {
  return (
    <View style={styles.session} testID={`session-${entry.id}`}>
      <DashboardIcon
        color={colors.neutral[550]}
        name={entry.platform === "iPhone" ? "cellphone" : "laptop"}
        size={16}
      />
      <View style={styles.sessionCopy}>
        <StylishText style={styles.detailValue} unstyled variant="body">
          {`${entry.platform} · ${entry.browser}`}
        </StylishText>
        <StylishText style={styles.hint} unstyled variant="caption">
          {`${entry.location} · last active ${formatOrderDate(entry.lastActiveAt)}`}
        </StylishText>
      </View>
      {entry.current ? (
        <StatusChip icon="check" label="This device" tone="green" />
      ) : null}
    </View>
  );
}

/**
 * The confirmation and explanation dialog for every action that needs a backend.
 *
 * It deliberately has no destructive path: confirming closes the dialog and says
 * so, rather than mutating fixture state, because a store that "deactivates"
 * only in local memory would be a misleading thing to demonstrate.
 */
export function PendingIntegrationDialog({
  onClose,
  pending,
}: {
  onClose: () => void;
  pending: PendingIntegration | null;
}) {
  const danger = pending === "deactivate-store";

  return (
    <DashboardDialog
      description={pending ? integrationCopy[pending] : ""}
      footer={
        <DashboardButton
          label="Close"
          onPress={onClose}
          testID="pending-dialog-close"
        />
      }
      onClose={onClose}
      testID="pending-dialog"
      title={pending ? pendingTitles[pending] : ""}
      visible={pending !== null}
      width={520}
    >
      <View style={danger ? styles.danger : styles.notice}>
        <DashboardIcon
          color={danger ? colors.feedback.danger : colors.feedback.info}
          name={danger ? "alert-outline" : "information-outline"}
          size={16}
        />
        <StylishText
          style={danger ? styles.dangerText : styles.noticeText}
          unstyled
          variant="caption"
        >
          {danger
            ? "Nothing has been deactivated. This confirmation exists so the flow can be reviewed before the store service is wired up."
            : "This dialog is here to show the flow. No credentials or sessions were changed."}
        </StylishText>
      </View>
    </DashboardDialog>
  );
}

const pendingTitles: Record<PendingIntegration, string> = {
  "change-password": "Change password",
  "deactivate-store": "Deactivate store",
  "revoke-sessions": "Sign out other sessions",
};

/* ------------------------------------------------------------------ */
/* Small shared pieces                                                 */
/* ------------------------------------------------------------------ */

function SettingRow({
  hint,
  label,
  trailing,
  value,
}: {
  hint?: string;
  label: string;
  trailing?: ReactNode;
  value?: string;
}) {
  return (
    <View style={styles.settingRow}>
      <View style={styles.settingCopy}>
        <StylishText style={styles.detailLabel} unstyled variant="caption">
          {label}
        </StylishText>
        {value ? (
          <StylishText style={styles.detailValue} unstyled variant="body">
            {value}
          </StylishText>
        ) : null}
        {hint ? (
          <StylishText style={styles.hint} unstyled variant="caption">
            {hint}
          </StylishText>
        ) : null}
      </View>
      {trailing}
    </View>
  );
}

/**
 * The dashboard's existing checkbox-style toggle, as used by the product form:
 * a `Pressable` carrying `accessibilityRole="switch"` and the checked state, so
 * a screen reader announces it as a switch and the whole 44px row is the target.
 */
export function SettingToggle({
  description,
  disabled = false,
  label,
  onToggle,
  testID,
  value,
}: {
  description: string;
  disabled?: boolean;
  label: string;
  onToggle: () => void;
  testID?: string;
  value: boolean;
}) {
  return (
    <Pressable
      accessibilityLabel={label}
      accessibilityRole="switch"
      accessibilityState={{ checked: value, disabled }}
      className="focus-visible:ring-[3px] focus-visible:ring-brand-blue/55"
      disabled={disabled}
      onPress={onToggle}
      style={[styles.toggleRow, disabled && styles.toggleDisabled]}
      testID={testID}
    >
      <View style={[styles.checkbox, value && styles.checkboxChecked]}>
        {value ? (
          <DashboardIcon color={colors.neutral[0]} name="check" size={14} />
        ) : null}
      </View>
      <View style={styles.toggleCopy}>
        <StylishText style={styles.detailValue} unstyled variant="body">
          {label}
        </StylishText>
        <StylishText style={styles.hint} unstyled variant="caption">
          {description}
        </StylishText>
      </View>
      {/* A word as well as a tick, so the state is not carried by the box
          alone. */}
      <StylishText style={styles.toggleState} unstyled variant="caption">
        {value ? "On" : "Off"}
      </StylishText>
    </Pressable>
  );
}

function Field({
  children,
  error,
  hint,
  label,
  required = false,
}: {
  children: ReactNode;
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
        <StylishText style={styles.hint} unstyled variant="caption">
          {hint}
        </StylishText>
      ) : null}
    </View>
  );
}

/** Up to two initials for the avatar, so a one-word name still renders. */
export function initialsOf(name: string) {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return "?";
  return words
    .slice(0, 2)
    .map((word) => word[0].toUpperCase())
    .join("");
}

const styles = StyleSheet.create({
  avatar: {
    alignItems: "center",
    backgroundColor: colors.brand.socialSurface,
    borderColor: colors.brand.pinkSoft,
    borderRadius: borderRadius.md,
    borderStyle: "solid",
    borderWidth: 1,
    flexShrink: 0,
    height: 64,
    justifyContent: "center",
    width: 64,
  },
  avatarText: {
    color: colors.brand.primary,
    fontFamily: "Montserrat_700Bold",
    fontSize: 22,
    lineHeight: 28,
  },
  body: { gap: spacing.md, padding: spacing.lg },
  checkbox: {
    alignItems: "center",
    borderColor: colors.neutral[300],
    borderRadius: borderRadius.sm,
    borderStyle: "solid",
    borderWidth: 1,
    flexShrink: 0,
    height: 22,
    justifyContent: "center",
    width: 22,
  },
  checkboxChecked: {
    backgroundColor: colors.brand.primary,
    borderColor: colors.brand.primary,
  },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: spacing.xs },
  danger: {
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
  dangerCard: { borderColor: colors.feedback.dangerBorder },
  dangerText: {
    color: colors.feedback.danger,
    flexShrink: 1,
    fontFamily: "Montserrat_500Medium",
    fontSize: 12,
    lineHeight: 18,
  },
  detail: {
    backgroundColor: colors.neutral[50],
    borderColor: colors.neutral[200],
    borderRadius: borderRadius.input,
    borderStyle: "solid",
    borderWidth: 1,
    gap: spacing.xxs,
    minWidth: 0,
    padding: spacing.sm,
  },
  detailGrid: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  detailLabel: {
    color: colors.neutral[550],
    fontFamily: "Montserrat_600SemiBold",
    fontSize: 11,
    lineHeight: 16,
  },
  detailLabelRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.xxs,
  },
  detailValue: {
    color: colors.ink.primary,
    fontFamily: "Montserrat_500Medium",
    fontSize: 13,
    lineHeight: 20,
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
  formColumn: { flexBasis: 0, flexGrow: 1, minWidth: 180 },
  formRow: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  groupLabel: {
    color: colors.neutral[550],
    fontFamily: "Montserrat_600SemiBold",
    fontSize: 11,
    lineHeight: 16,
    textTransform: "uppercase",
  },
  handle: {
    color: colors.neutral[550],
    fontFamily: "Montserrat_400Regular",
    fontSize: 12,
    lineHeight: 18,
  },
  hint: {
    color: colors.neutral[550],
    fontFamily: "Montserrat_400Regular",
    fontSize: 11,
    lineHeight: 16,
  },
  identity: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.md,
    padding: spacing.lg,
  },
  identityCopy: { flexBasis: 0, flexGrow: 1, gap: spacing.xxs, minWidth: 0 },
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
    alignItems: "flex-start",
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
  paragraph: {
    color: colors.ink.primary,
    fontFamily: "Montserrat_400Regular",
    fontSize: 13,
    lineHeight: 21,
  },
  preferenceGrid: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  // The same surface, height and radius the selects use, so the row reads as
  // one set of fields rather than a select row plus an odd one out.
  readOnlyControl: {
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
    minWidth: 0,
    paddingHorizontal: spacing.sm,
  },
  readOnlyField: { gap: spacing.xxs, minWidth: 0, width: "100%" },
  readOnlyValue: {
    color: colors.neutral[550],
    flexShrink: 1,
    fontFamily: "Montserrat_400Regular",
    fontSize: 12,
    lineHeight: 18,
  },
  session: {
    alignItems: "center",
    backgroundColor: colors.neutral[50],
    borderColor: colors.neutral[200],
    borderRadius: borderRadius.input,
    borderStyle: "solid",
    borderWidth: 1,
    flexDirection: "row",
    gap: spacing.xs,
    minHeight: 44,
    padding: spacing.sm,
  },
  securityRow: {
    alignItems: "center",
    flexDirection: "row",
    // Wraps rather than squeezing the button, so the label and the action stay
    // legible when the card is narrow.
    flexWrap: "wrap",
    gap: spacing.sm,
    justifyContent: "space-between",
  },
  sessionCopy: { flexBasis: 0, flexGrow: 1, gap: 1, minWidth: 0 },
  sessionList: { gap: spacing.xs },
  settingCopy: { flexBasis: 0, flexGrow: 1, gap: spacing.xxs, minWidth: 0 },
  settingRow: {
    alignItems: "center",
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
    justifyContent: "space-between",
    minHeight: 44,
  },
  stack: { flexDirection: "column" },
  storeName: {
    color: colors.ink.primary,
    fontFamily: "Montserrat_700Bold",
    fontSize: 20,
    lineHeight: 28,
  },
  textarea: { minHeight: 96, paddingTop: 10, textAlignVertical: "top" },
  toggleCopy: { flexBasis: 0, flexGrow: 1, gap: 1, minWidth: 0 },
  toggleDisabled: { opacity: 0.55 },
  toggleRow: {
    alignItems: "center",
    borderRadius: borderRadius.input,
    flexDirection: "row",
    gap: spacing.sm,
    minHeight: 44,
  },
  toggleState: {
    color: colors.neutral[550],
    flexShrink: 0,
    fontFamily: "Montserrat_600SemiBold",
    fontSize: 11,
    lineHeight: 16,
    minWidth: 24,
    textAlign: "right",
  },
});
