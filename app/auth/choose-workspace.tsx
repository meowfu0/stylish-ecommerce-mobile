import { Image, type ImageSource } from "expo-image";
import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  useWindowDimensions,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import {
  AuthAlertBanner,
  type AuthAlertTone,
} from "@/components/auth/auth-alert-banner";
import { StylishLogo } from "@/components/brand/stylish-logo";
import { StylishText } from "@/components/typography/stylish-text";
import { colors, typography } from "@/constants/design-tokens";
import { AuthRequestError } from "@/services/auth/auth-api";
import {
  refreshAuthenticatedUser,
  signOutCurrentSession,
} from "@/services/auth/auth-session";
import {
  destinationForWorkspace,
  type AuthWorkspace,
  workspacesFromAuthContext,
} from "@/services/auth/auth-workspaces";
import { useAuthWorkspaceStore } from "@/stores/auth-workspace-store";
import { useAuthSessionStore } from "@/stores/auth-session-store";

type WorkspacePageState =
  "empty" | "loading" | "network-error" | "ready" | "session-expired";

type WorkspaceNotice = {
  message: string;
  tone: AuthAlertTone;
};

const WORKSPACE_ICONS: Readonly<Record<AuthWorkspace["kind"], ImageSource>> = {
  customer: require("@/assets/icons/workspace-customer.svg"),
  merchant: require("@/assets/icons/workspace-merchant.svg"),
  platform: require("@/assets/icons/workspace-platform.svg"),
};

function isSessionError(error: unknown) {
  return (
    error instanceof AuthRequestError &&
    (error.status === 401 || error.status === 403)
  );
}

function StatusPanel({
  actionLabel,
  busy = false,
  description,
  onAction,
  title,
}: {
  actionLabel?: string;
  busy?: boolean;
  description: string;
  onAction?: () => void;
  title: string;
}) {
  return (
    <View
      accessibilityLiveRegion="polite"
      style={styles.statusPanel}
      testID="auth-workspace-status"
    >
      {busy ? (
        <ActivityIndicator
          accessibilityLabel="Loading workspaces"
          color={colors.brand.primary}
          size="large"
        />
      ) : (
        <View style={styles.statusIconSurface}>
          <Image
            accessible={false}
            contentFit="contain"
            source={WORKSPACE_ICONS.platform}
            style={styles.workspaceIcon}
          />
        </View>
      )}

      <View style={styles.statusCopy}>
        <StylishText
          accessibilityRole="header"
          style={styles.statusTitle}
          unstyled
          variant="section-title"
        >
          {title}
        </StylishText>
        <StylishText style={styles.statusDescription} unstyled variant="body">
          {description}
        </StylishText>
      </View>

      {actionLabel && onAction ? (
        <Pressable
          accessibilityLabel={actionLabel}
          accessibilityRole="button"
          onPress={onAction}
          style={({ pressed }) => [
            styles.statusAction,
            pressed && styles.actionPressed,
          ]}
          testID="auth-workspace-status-action"
        >
          <StylishText
            style={styles.statusActionLabel}
            unstyled
            variant="button"
          >
            {actionLabel}
          </StylishText>
        </Pressable>
      ) : null}
    </View>
  );
}

export default function ChooseWorkspaceScreen() {
  const router = useRouter();
  const { height, width } = useWindowDimensions();
  const selectWorkspace = useAuthWorkspaceStore(
    (state) => state.selectWorkspace,
  );
  const clearWorkspace = useAuthWorkspaceStore((state) => state.clearWorkspace);
  const navigationStartedRef = useRef(false);
  const selectionInFlightRef = useRef(false);
  const [email, setEmail] = useState<string | null>(null);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [notice, setNotice] = useState<WorkspaceNotice | null>(null);
  const [pageState, setPageState] = useState<WorkspacePageState>("loading");
  const [pendingWorkspaceKey, setPendingWorkspaceKey] = useState<string | null>(
    null,
  );
  const [workspaces, setWorkspaces] = useState<AuthWorkspace[]>([]);

  const desktop = Platform.OS === "web" && width >= 1024;
  const compactDesktop = desktop && height < 760;
  const horizontalPadding = width < 480 ? 16 : width < 1024 ? 24 : 32;
  const contentWidth = Math.min(
    1280,
    Math.max(0, width - horizontalPadding * 2),
  );
  const gridGap = width < 600 ? 16 : 24;
  const columnCount = contentWidth >= 1120 ? 3 : contentWidth >= 720 ? 2 : 1;
  const cardWidth =
    (contentWidth - gridGap * Math.max(0, columnCount - 1)) / columnCount;
  const logoWidth = desktop ? 182 : width < 480 ? 146 : 168;
  const pageVerticalPadding = compactDesktop ? 24 : desktop ? 48 : 24;
  const titleSize = desktop ? 40 : width < 480 ? 30 : 34;
  const titleLineHeight = desktop ? 48 : width < 480 ? 38 : 42;

  const navigateToWorkspace = useCallback(
    (workspace: AuthWorkspace) => {
      if (navigationStartedRef.current) {
        return;
      }

      navigationStartedRef.current = true;
      selectWorkspace(workspace);
      router.replace(destinationForWorkspace(workspace));
    },
    [router, selectWorkspace],
  );

  const expireSession = useCallback(async () => {
    selectionInFlightRef.current = false;
    setPendingWorkspaceKey(null);
    setNotice(null);
    setWorkspaces([]);
    setPageState("session-expired");
    clearWorkspace();
    useAuthSessionStore.getState().setUnauthenticated("session-expired");
  }, [clearWorkspace]);

  const loadWorkspaces = useCallback(async () => {
    setPageState("loading");
    setNotice(null);

    try {
      const context = await refreshAuthenticatedUser();
      const availableWorkspaces = workspacesFromAuthContext(context);

      setEmail(context.email);
      setWorkspaces(availableWorkspaces);

      if (availableWorkspaces.length === 0) {
        setPageState("empty");
        return;
      }

      if (availableWorkspaces.length === 1) {
        navigateToWorkspace(availableWorkspaces[0]);
        return;
      }

      setPageState("ready");
    } catch (error) {
      if (isSessionError(error)) {
        await expireSession();
        return;
      }

      setPageState("network-error");
    }
  }, [expireSession, navigateToWorkspace]);

  useEffect(() => {
    void loadWorkspaces();
  }, [loadWorkspaces]);

  const continueToWorkspace = async (workspace: AuthWorkspace) => {
    if (
      selectionInFlightRef.current ||
      navigationStartedRef.current ||
      isSigningOut
    ) {
      return;
    }

    selectionInFlightRef.current = true;
    setPendingWorkspaceKey(workspace.key);
    setNotice(null);

    try {
      const context = await refreshAuthenticatedUser();
      const currentWorkspaces = workspacesFromAuthContext(context);
      const currentWorkspace = currentWorkspaces.find(
        (candidate) => candidate.key === workspace.key,
      );

      setEmail(context.email);
      setWorkspaces(currentWorkspaces);

      if (!currentWorkspace) {
        setPageState(currentWorkspaces.length === 0 ? "empty" : "ready");
        setNotice({
          message:
            "Your workspace access changed. The available workspaces have been refreshed.",
          tone: "warning",
        });
        return;
      }

      navigateToWorkspace(currentWorkspace);
    } catch (error) {
      if (isSessionError(error)) {
        await expireSession();
        return;
      }

      setNotice({
        message:
          "We couldn’t confirm this workspace. Check your connection and try again.",
        tone: "error",
      });
    } finally {
      selectionInFlightRef.current = false;
      if (!navigationStartedRef.current) {
        setPendingWorkspaceKey(null);
      }
    }
  };

  const signOut = async () => {
    if (isSigningOut || navigationStartedRef.current) {
      return;
    }

    setIsSigningOut(true);
    selectionInFlightRef.current = true;

    try {
      await signOutCurrentSession();
    } finally {
      navigationStartedRef.current = true;
      router.replace("/sign-in");
    }
  };

  const returnToSignIn = async () => {
    if (navigationStartedRef.current) {
      return;
    }

    navigationStartedRef.current = true;
    await signOutCurrentSession();
    router.replace("/sign-in");
  };

  return (
    <View style={styles.page} testID="auth-workspace-page">
      <StatusBar style="dark" />

      <View pointerEvents="none" style={[styles.glow, styles.pinkGlow]} />
      <View pointerEvents="none" style={[styles.glow, styles.blueGlow]} />

      <SafeAreaView edges={["top", "bottom"]} style={styles.page}>
        <ScrollView
          bounces={false}
          contentContainerStyle={[
            styles.scrollContent,
            {
              minHeight: height,
              paddingHorizontal: horizontalPadding,
              paddingVertical: pageVerticalPadding,
            },
          ]}
          contentInsetAdjustmentBehavior="never"
          overScrollMode="never"
          showsVerticalScrollIndicator={false}
        >
          <View style={[styles.content, { width: contentWidth }]}>
            <View style={styles.topBar} testID="auth-workspace-header">
              <StylishLogo testID="auth-workspace-logo" width={logoWidth} />

              <Pressable
                accessibilityLabel="Sign out"
                accessibilityRole="button"
                accessibilityState={{
                  busy: isSigningOut,
                  disabled: isSigningOut,
                }}
                disabled={isSigningOut}
                onPress={() => void signOut()}
                style={({ pressed }) => [
                  styles.signOutButton,
                  pressed && !isSigningOut && styles.actionPressed,
                  isSigningOut && styles.actionDisabled,
                ]}
                testID="auth-workspace-sign-out"
              >
                {isSigningOut ? (
                  <ActivityIndicator color={colors.ink.primary} size="small" />
                ) : (
                  <Image
                    accessible={false}
                    contentFit="contain"
                    source={require("@/assets/icons/workspace-sign-out.svg")}
                    style={styles.signOutIcon}
                  />
                )}
                <StylishText
                  style={styles.signOutLabel}
                  unstyled
                  variant="navigation-strong"
                >
                  {isSigningOut ? "Signing out…" : "Sign out"}
                </StylishText>
              </Pressable>
            </View>

            <View
              style={[
                styles.intro,
                { marginTop: compactDesktop ? 24 : desktop ? 40 : 32 },
              ]}
              testID="auth-workspace-intro"
            >
              <StylishText style={styles.eyebrow} unstyled variant="eyebrow">
                {email
                  ? `SIGNED IN AS ${email.toUpperCase()}`
                  : "YOUR STYLISH ACCOUNT"}
              </StylishText>
              <StylishText
                accessibilityRole="header"
                style={[
                  styles.pageTitle,
                  { fontSize: titleSize, lineHeight: titleLineHeight },
                ]}
                unstyled
                variant="page-title"
              >
                Choose a workspace
              </StylishText>
              <StylishText
                style={styles.introDescription}
                unstyled
                variant="body"
              >
                Your account has access to more than one Stylish workspace. Pick
                where you’d like to continue — you can switch at any time.
              </StylishText>
            </View>

            {notice ? (
              <View style={styles.notice} testID="auth-workspace-notice">
                <AuthAlertBanner message={notice.message} tone={notice.tone} />
              </View>
            ) : null}

            {pageState === "loading" ? (
              <StatusPanel
                busy
                description="We’re checking the roles and memberships attached to your account."
                title="Loading your workspaces"
              />
            ) : null}

            {pageState === "network-error" ? (
              <StatusPanel
                actionLabel="Try Again"
                description="Check your connection, confirm the Stylish API is running, and try again."
                onAction={() => void loadWorkspaces()}
                title="We couldn’t load your workspaces"
              />
            ) : null}

            {pageState === "session-expired" ? (
              <StatusPanel
                actionLabel="Sign In"
                description="Your secure session is no longer valid. Sign in again to continue."
                onAction={() => void returnToSignIn()}
                title="Your session expired"
              />
            ) : null}

            {pageState === "empty" ? (
              <StatusPanel
                actionLabel="Reload Workspaces"
                description="No active customer, merchant, or platform workspace is currently available for this account."
                onAction={() => void loadWorkspaces()}
                title="No workspace is available"
              />
            ) : null}

            {pageState === "ready" ? (
              <View
                accessibilityLabel={`${workspaces.length} workspaces available`}
                accessibilityRole="list"
                style={[styles.workspaceGrid, { gap: gridGap }]}
                testID="auth-workspace-grid"
              >
                {workspaces.map((workspace, index) => {
                  const pending = pendingWorkspaceKey === workspace.key;
                  const disabled = pendingWorkspaceKey !== null || isSigningOut;

                  return (
                    <View
                      accessibilityLabel={`${workspace.title}, ${workspace.roleLabel}`}
                      key={workspace.key}
                      style={[styles.workspaceCard, { width: cardWidth }]}
                      testID={`auth-workspace-card-${index}`}
                    >
                      <View style={styles.workspaceIconSurface}>
                        <Image
                          accessible={false}
                          contentFit="contain"
                          source={WORKSPACE_ICONS[workspace.kind]}
                          style={styles.workspaceIcon}
                        />
                      </View>

                      <View style={styles.workspaceCopy}>
                        <StylishText
                          style={styles.workspaceTitle}
                          unstyled
                          variant="section-title"
                        >
                          {workspace.title}
                        </StylishText>
                        <View style={styles.roleBadge}>
                          <StylishText
                            style={styles.roleBadgeLabel}
                            unstyled
                            variant="helper"
                          >
                            {workspace.roleLabel}
                          </StylishText>
                        </View>
                        <StylishText
                          style={styles.workspaceDescription}
                          unstyled
                          variant="body"
                        >
                          {workspace.description}
                        </StylishText>
                      </View>

                      <Pressable
                        accessibilityHint={`Continues to ${workspace.title}`}
                        accessibilityLabel={`Continue to ${workspace.title}`}
                        accessibilityRole="button"
                        accessibilityState={{ busy: pending, disabled }}
                        disabled={disabled}
                        onPress={() => void continueToWorkspace(workspace)}
                        style={({ pressed }) => [
                          styles.continueButton,
                          pressed && !disabled && styles.actionPressed,
                          disabled && !pending && styles.actionDisabled,
                        ]}
                        testID={`auth-workspace-continue-${index}`}
                      >
                        {pending ? (
                          <ActivityIndicator
                            color={colors.neutral[0]}
                            size="small"
                          />
                        ) : null}
                        <StylishText
                          style={styles.continueLabel}
                          unstyled
                          variant="button"
                        >
                          {pending ? "Opening…" : "Continue"}
                        </StylishText>
                      </Pressable>
                    </View>
                  );
                })}
              </View>
            ) : null}

            <StylishText style={styles.footerNote} unstyled variant="helper">
              Workspaces and role labels are provided by the backend after
              authentication. Roles are never selected during sign-in.
            </StylishText>
          </View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  actionDisabled: { opacity: 0.55 },
  actionPressed: { opacity: 0.86, transform: [{ scale: 0.988 }] },
  blueGlow: {
    backgroundColor: colors.brand.blueSoft,
    bottom: -220,
    height: 620,
    opacity: 0.34,
    right: -180,
    width: 620,
  },
  content: { alignSelf: "center" },
  continueButton: {
    alignItems: "center",
    backgroundColor: colors.brand.primary,
    borderRadius: 8,
    boxShadow: "0 6px 8px rgba(248, 55, 88, 0.52)",
    flexDirection: "row",
    gap: 10,
    height: 56,
    justifyContent: "center",
    shadowColor: colors.brand.primary,
    shadowOffset: { height: 6, width: 0 },
    shadowOpacity: 0.34,
    shadowRadius: 8,
    width: "100%",
  },
  continueLabel: {
    color: colors.neutral[0],
    fontFamily: typography.fontFamily.montserratSemibold,
    fontSize: typography.fontSize.button,
    lineHeight: typography.lineHeight.button,
  },
  eyebrow: {
    color: "#C81E3E",
    fontFamily: typography.fontFamily.montserratSemibold,
    fontSize: typography.fontSize.label,
    letterSpacing: typography.letterSpacing.eyebrow,
    lineHeight: typography.lineHeight.label,
  },
  footerNote: {
    color: colors.neutral[525],
    fontFamily: typography.fontFamily.montserratRegular,
    fontSize: typography.fontSize.caption,
    lineHeight: typography.lineHeight.caption,
    marginTop: 40,
    maxWidth: 640,
  },
  glow: {
    borderRadius: 999,
    position: "absolute",
  },
  intro: { gap: 12, maxWidth: 640 },
  introDescription: {
    color: colors.neutral[525],
    fontFamily: typography.fontFamily.montserratRegular,
    fontSize: typography.fontSize.bodyLarge,
    lineHeight: typography.lineHeight.bodyLarge,
  },
  notice: { marginTop: 24, maxWidth: 640, width: "100%" },
  page: { backgroundColor: colors.neutral[50], flex: 1, overflow: "hidden" },
  pageTitle: {
    color: colors.ink.primary,
    fontFamily: typography.fontFamily.montserratBold,
    letterSpacing: typography.letterSpacing.display,
  },
  pinkGlow: {
    backgroundColor: colors.brand.pinkSoft,
    height: 520,
    left: -180,
    opacity: 0.23,
    top: -220,
    width: 520,
  },
  roleBadge: {
    alignSelf: "flex-start",
    backgroundColor: "rgba(207, 226, 252, 0.60)",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  roleBadgeLabel: {
    color: "#1B5AAB",
    fontFamily: typography.fontFamily.montserratSemibold,
    fontSize: typography.fontSize.caption,
    lineHeight: typography.lineHeight.caption,
  },
  scrollContent: { flexGrow: 1 },
  signOutButton: {
    alignItems: "center",
    borderRadius: 8,
    flexDirection: "row",
    gap: 10,
    justifyContent: "center",
    minHeight: 44,
    paddingHorizontal: 20,
  },
  signOutIcon: { height: 16, width: 16 },
  signOutLabel: {
    color: colors.ink.primary,
    fontFamily: typography.fontFamily.montserratSemibold,
    fontSize: typography.fontSize.button,
    lineHeight: typography.lineHeight.button,
  },
  statusAction: {
    alignItems: "center",
    backgroundColor: colors.brand.primary,
    borderRadius: 8,
    justifyContent: "center",
    minHeight: 52,
    paddingHorizontal: 24,
    width: "100%",
  },
  statusActionLabel: {
    color: colors.neutral[0],
    fontFamily: typography.fontFamily.montserratSemibold,
    fontSize: typography.fontSize.button,
    lineHeight: typography.lineHeight.button,
  },
  statusCopy: { gap: 8 },
  statusDescription: {
    color: colors.neutral[525],
    fontFamily: typography.fontFamily.montserratRegular,
    fontSize: typography.fontSize.bodySmall,
    lineHeight: typography.lineHeight.bodySmall,
    textAlign: "center",
  },
  statusIconSurface: {
    alignItems: "center",
    backgroundColor: colors.brand.socialSurface,
    borderRadius: 14,
    height: 52,
    justifyContent: "center",
    width: 52,
  },
  statusPanel: {
    alignItems: "center",
    alignSelf: "center",
    backgroundColor: colors.neutral[0],
    borderColor: colors.neutral[200],
    borderRadius: 16,
    borderWidth: 1,
    boxShadow: "0 16px 34px rgba(23, 34, 59, 0.10)",
    gap: 20,
    marginTop: 40,
    maxWidth: 520,
    padding: 30,
    width: "100%",
  },
  statusTitle: {
    color: colors.ink.primary,
    fontFamily: typography.fontFamily.montserratBold,
    fontSize: 22,
    lineHeight: 30,
    textAlign: "center",
  },
  topBar: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    minHeight: 44,
  },
  workspaceCard: {
    backgroundColor: colors.neutral[0],
    borderColor: colors.neutral[200],
    borderRadius: 16,
    borderWidth: 1,
    gap: 20,
    justifyContent: "space-between",
    minHeight: 320,
    padding: 29,
    shadowColor: colors.ink.primary,
    shadowOffset: { height: 8, width: 0 },
    shadowOpacity: 0.035,
    shadowRadius: 20,
  },
  workspaceCopy: { alignItems: "flex-start", gap: 8 },
  workspaceDescription: {
    color: colors.neutral[525],
    fontFamily: typography.fontFamily.montserratRegular,
    fontSize: typography.fontSize.bodySmall,
    lineHeight: typography.lineHeight.bodySmall,
  },
  workspaceGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginTop: 40,
    width: "100%",
  },
  workspaceIcon: { height: 24, width: 24 },
  workspaceIconSurface: {
    alignItems: "center",
    backgroundColor: colors.brand.socialSurface,
    borderRadius: 14,
    height: 52,
    justifyContent: "center",
    width: 52,
  },
  workspaceTitle: {
    color: colors.ink.primary,
    fontFamily: typography.fontFamily.montserratBold,
    fontSize: typography.fontSize.headingSmall,
    lineHeight: typography.lineHeight.headingSmall,
  },
});
