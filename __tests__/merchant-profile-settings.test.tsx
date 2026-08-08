import { fireEvent, render } from "@testing-library/react-native";

import { rolePermissions } from "@/features/merchant-dashboard/dashboard-access";
import type { MerchantSession } from "@/features/merchant-dashboard/dashboard-types";
import { resolveProfileSection } from "@/features/merchant-dashboard/merchant-navigation";
import {
  demoNotifications,
  demoProfile,
  demoSecurity,
  demoStorePreferences,
  formattedAddress,
  loadProfileWorkspace,
  NOTIFICATION_KEYS,
  notificationCopy,
} from "@/features/merchant-dashboard/profile-settings-demo-data";
import {
  EditProfileModal,
  initialsOf,
  ProfileContent,
  SettingsContent,
} from "@/features/merchant-dashboard/profile-settings-sections";
import {
  DESCRIPTION_LIMIT,
  hasErrors,
  integrationCopy,
  isDirty,
  profileFormValues,
  profileFrom,
  validateProfile,
} from "@/features/merchant-dashboard/use-profile-settings";

jest.mock("expo-router", () => ({
  useRouter: () => ({ push: jest.fn(), replace: jest.fn() }),
}));

jest.mock("@expo/vector-icons", () => ({
  MaterialCommunityIcons: () => null,
}));

function sessionFor(role: MerchantSession["role"]): MerchantSession {
  return {
    defaultLocation: "Makati Warehouse",
    displayName: "vinceee",
    email: "vinceee@postmanfashion.ph",
    merchantHandle: "merchant:m1",
    merchantId: "m1",
    merchantName: "Postman Fashion",
    permissions: rolePermissions[role],
    role,
    storeStatus: "active",
    verified: true,
  };
}

const owner = sessionFor("Merchant Owner");

describe("profile navigation", () => {
  it("resolves both section keys and nothing else", () => {
    expect(resolveProfileSection("merchant-profile")).toBe("merchant-profile");
    expect(resolveProfileSection("settings")).toBe("settings");
    expect(resolveProfileSection("SETTINGS")).toBe("settings");
    expect(resolveProfileSection(" settings ")).toBe("settings");
    expect(resolveProfileSection("overview")).toBeUndefined();
    expect(resolveProfileSection(undefined)).toBeUndefined();
  });
});

describe("fixture data", () => {
  it("loads a complete snapshot", async () => {
    const snapshot = await loadProfileWorkspace();

    expect(snapshot.profile).toEqual(demoProfile);
    expect(snapshot.notifications).toEqual(demoNotifications);
    expect(snapshot.preferences).toEqual(demoStorePreferences);
    expect(snapshot.security).toEqual(demoSecurity);
  });

  it("covers every notification key with copy", () => {
    NOTIFICATION_KEYS.forEach((key) => {
      expect(notificationCopy[key].label.length).toBeGreaterThan(0);
      expect(notificationCopy[key].description.length).toBeGreaterThan(0);
      expect(typeof demoNotifications[key]).toBe("boolean");
    });
  });

  it("has both on and off preferences, so the toggle is visible both ways", () => {
    const values = NOTIFICATION_KEYS.map((key) => demoNotifications[key]);

    expect(values).toContain(true);
    expect(values).toContain(false);
  });

  it("marks exactly one session as the current device", () => {
    expect(demoSecurity.sessions.filter((entry) => entry.current)).toHaveLength(
      1,
    );
  });

  it("joins the address without leaving empty segments", () => {
    expect(formattedAddress(demoProfile)).toContain(demoProfile.city);
    expect(formattedAddress(demoProfile)).not.toContain(", ,");
    expect(formattedAddress({ ...demoProfile, postalCode: "" })).not.toContain(
      ", ,",
    );
  });
});

describe("profile validation", () => {
  const values = profileFormValues(demoProfile);

  it("accepts the fixture unchanged", () => {
    expect(hasErrors(validateProfile(values))).toBe(false);
  });

  it("requires a store name", () => {
    expect(validateProfile({ ...values, storeName: "   " }).storeName).toBe(
      "Enter a store name",
    );
    expect(validateProfile({ ...values, storeName: "P" }).storeName).toBe(
      "Use at least 2 characters",
    );
  });

  it("rejects a malformed contact email", () => {
    expect(validateProfile({ ...values, contactEmail: "" }).contactEmail).toBe(
      "Enter a contact email",
    );
    expect(
      validateProfile({ ...values, contactEmail: "not-an-email" }).contactEmail,
    ).toBe("Enter a valid email address");
  });

  it("rejects a phone number with too few digits", () => {
    expect(
      validateProfile({ ...values, contactPhone: "+63 91" }).contactPhone,
    ).toBe("Enter a complete phone number");
    // Formatting characters must not count against the digit minimum.
    expect(
      validateProfile({ ...values, contactPhone: "(02) 8123-4567" })
        .contactPhone,
    ).toBeUndefined();
  });

  it("requires an address and city", () => {
    expect(validateProfile({ ...values, addressLine: "" }).addressLine).toBe(
      "Enter a street address",
    );
    expect(validateProfile({ ...values, city: " " }).city).toBe("Enter a city");
  });

  it("caps the description", () => {
    expect(
      validateProfile({ ...values, description: "x".repeat(DESCRIPTION_LIMIT) })
        .description,
    ).toBeUndefined();
    expect(
      validateProfile({
        ...values,
        description: "x".repeat(DESCRIPTION_LIMIT + 1),
      }).description,
    ).toBeDefined();
  });
});

describe("saving a profile", () => {
  it("trims every field", () => {
    const saved = profileFrom(
      {
        ...profileFormValues(demoProfile),
        city: "  Cebu City  ",
        storeName: "  Postman Atelier  ",
      },
      demoProfile,
    );

    expect(saved.storeName).toBe("Postman Atelier");
    expect(saved.city).toBe("Cebu City");
  });

  it("keeps fields the form does not edit", () => {
    const saved = profileFrom(profileFormValues(demoProfile), demoProfile);

    expect(saved.memberSince).toBe(demoProfile.memberSince);
  });

  it("reports dirtiness only for a real change", () => {
    const values = profileFormValues(demoProfile);

    expect(isDirty(values, demoProfile)).toBe(false);
    // Whitespace alone is not a change, because saving trims it anyway.
    expect(isDirty({ ...values, city: ` ${values.city} ` }, demoProfile)).toBe(
      false,
    );
    expect(isDirty({ ...values, city: "Cebu City" }, demoProfile)).toBe(true);
  });
});

describe("Merchant Profile page", () => {
  it("shows the business details and both status badges", () => {
    const view = render(
      <ProfileContent
        compact={false}
        onEdit={jest.fn()}
        profile={demoProfile}
        session={owner}
      />,
    );

    expect(view.getAllByText(demoProfile.storeName).length).toBeGreaterThan(0);
    expect(view.getByText(demoProfile.contactPhone)).toBeTruthy();
    expect(view.getByText(formattedAddress(demoProfile))).toBeTruthy();
    // Session-owned values, not fixture copies.
    expect(view.getByText(owner.email)).toBeTruthy();
    expect(view.getByText(owner.defaultLocation)).toBeTruthy();
    expect(view.getByText("Verified")).toBeTruthy();
    expect(view.getByText("Store active")).toBeTruthy();
  });

  it("labels an unverified, suspended store in words rather than colour", () => {
    const view = render(
      <ProfileContent
        compact={false}
        onEdit={jest.fn()}
        profile={demoProfile}
        session={{ ...owner, storeStatus: "suspended", verified: false }}
      />,
    );

    expect(view.getByText("Verification pending")).toBeTruthy();
    expect(view.getByText("Store suspended")).toBeTruthy();
  });

  it("opens the editor from the header action", () => {
    const onEdit = jest.fn();
    const view = render(
      <ProfileContent
        compact={false}
        onEdit={onEdit}
        profile={demoProfile}
        session={owner}
      />,
    );

    fireEvent.press(view.getByTestId("profile-edit"));
    expect(onEdit).toHaveBeenCalled();
  });

  it("disables editing for a role without the profile permission", () => {
    const view = render(
      <ProfileContent
        compact={false}
        onEdit={jest.fn()}
        profile={demoProfile}
        session={sessionFor("Support Staff")}
      />,
    );

    expect(
      view.getByTestId("profile-edit").props.accessibilityState.disabled,
    ).toBe(true);
  });

  it("builds initials from one or two words", () => {
    expect(initialsOf("Postman Fashion")).toBe("PF");
    expect(initialsOf("Velori")).toBe("V");
    expect(initialsOf("a b c d")).toBe("AB");
    expect(initialsOf("   ")).toBe("?");
  });
});

describe("Edit Profile modal", () => {
  function renderModal(onSave = jest.fn()) {
    return {
      onSave,
      view: render(
        <EditProfileModal
          onClose={jest.fn()}
          onSave={onSave}
          profile={demoProfile}
          visible
        />,
      ),
    };
  }

  it("opens with the saved values", () => {
    const { view } = renderModal();

    expect(view.getByTestId("profile-form-name").props.value).toBe(
      demoProfile.storeName,
    );
    expect(view.getByTestId("profile-form-email").props.value).toBe(
      demoProfile.contactEmail,
    );
  });

  it("keeps Save disabled until something changes", () => {
    const { view } = renderModal();

    expect(
      view.getByTestId("profile-form-save").props.accessibilityState.disabled,
    ).toBe(true);

    fireEvent.changeText(
      view.getByTestId("profile-form-name"),
      "Postman Atelier",
    );

    expect(
      view.getByTestId("profile-form-save").props.accessibilityState.disabled,
    ).toBe(false);
  });

  it("shows an error and does not save an invalid email", () => {
    const { onSave, view } = renderModal();

    fireEvent.changeText(view.getByTestId("profile-form-email"), "broken");
    fireEvent.press(view.getByTestId("profile-form-save"));

    expect(view.getByText("Enter a valid email address")).toBeTruthy();
    expect(onSave).not.toHaveBeenCalled();
  });

  it("saves the edited values", () => {
    const { onSave, view } = renderModal();

    fireEvent.changeText(
      view.getByTestId("profile-form-name"),
      "Postman Atelier",
    );
    fireEvent.press(view.getByTestId("profile-form-save"));

    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({ storeName: "Postman Atelier" }),
    );
  });

  it("clears a field error as soon as it is corrected", () => {
    const { view } = renderModal();

    fireEvent.changeText(view.getByTestId("profile-form-email"), "broken");
    fireEvent.press(view.getByTestId("profile-form-save"));
    expect(view.getByText("Enter a valid email address")).toBeTruthy();

    fireEvent.changeText(view.getByTestId("profile-form-email"), "a@b.co");
    expect(view.queryByText("Enter a valid email address")).toBeNull();
  });
});

describe("Settings page", () => {
  function renderSettings(
    overrides: Partial<Parameters<typeof SettingsContent>[0]> = {},
  ) {
    const props = {
      compact: false,
      notifications: demoNotifications,
      onOpenProfile: jest.fn(),
      onPending: jest.fn(),
      onPreferenceChange: jest.fn(),
      onToggleNotification: jest.fn(),
      preferences: demoStorePreferences,
      security: demoSecurity,
      session: owner,
      ...overrides,
    };
    return { props, view: render(<SettingsContent {...props} />) };
  }

  it("renders every settings section", () => {
    const { view } = renderSettings();

    ["account", "notifications", "preferences", "security", "danger"].forEach(
      (key) => expect(view.getByTestId(`settings-${key}`)).toBeTruthy(),
    );
  });

  it("renders a switch per notification preference, with its state", () => {
    const { view } = renderSettings();

    NOTIFICATION_KEYS.forEach((key) => {
      const control = view.getByTestId(`notification-${key}`);
      expect(control.props.accessibilityRole).toBe("switch");
      expect(control.props.accessibilityState.checked).toBe(
        demoNotifications[key],
      );
    });
  });

  it("reports a toggled preference", () => {
    const { props, view } = renderSettings();

    fireEvent.press(view.getByTestId("notification-promotions"));
    expect(props.onToggleNotification).toHaveBeenCalledWith("promotions");
  });

  it("disables the toggles for a role that cannot manage settings", () => {
    const { view } = renderSettings({ session: sessionFor("Support Staff") });

    expect(
      view.getByTestId("notification-orders").props.accessibilityState.disabled,
    ).toBe(true);
  });

  it("shows the current store preferences", () => {
    const { view } = renderSettings();

    expect(view.getByTestId("preference-timezone")).toBeTruthy();
    expect(view.getByText(demoStorePreferences.timezone)).toBeTruthy();
    expect(view.getByText("PHP (₱)")).toBeTruthy();
  });

  it("lays every preference out as a field, currency included", () => {
    const { view } = renderSettings();

    [
      "preference-timezone",
      "preference-date-format",
      "preference-week-start",
      "preference-location",
      "preference-currency",
    ].forEach((testID) => expect(view.getByTestId(testID)).toBeTruthy());
  });

  it("presents currency as read-only rather than a picker", () => {
    const { view } = renderSettings();
    const currency = view.getByTestId("preference-currency");

    // Every figure in the app is centavos, so a currency picker would be a
    // control the dashboard could not honour.
    expect(currency.props.accessibilityRole).toBe("text");
    expect(
      view.getByTestId("preference-timezone").props.accessibilityRole,
    ).toBe("button");
  });

  it("lists the active sessions and marks this device", () => {
    const { view } = renderSettings();

    demoSecurity.sessions.forEach((entry) =>
      expect(view.getByTestId(`session-${entry.id}`)).toBeTruthy(),
    );
    expect(view.getByText("This device")).toBeTruthy();
  });

  it("routes security actions to the integration notice instead of acting", () => {
    const { props, view } = renderSettings();

    fireEvent.press(view.getByTestId("security-change-password"));
    expect(props.onPending).toHaveBeenCalledWith("change-password");

    fireEvent.press(view.getByTestId("security-revoke-sessions"));
    expect(props.onPending).toHaveBeenCalledWith("revoke-sessions");

    fireEvent.press(view.getByTestId("danger-deactivate"));
    expect(props.onPending).toHaveBeenCalledWith("deactivate-store");
  });

  it("explains that no security action was performed", () => {
    Object.values(integrationCopy).forEach((copy) =>
      expect(copy.length).toBeGreaterThan(0),
    );
    expect(integrationCopy["deactivate-store"]).toContain(
      "Nothing was deactivated",
    );
    expect(integrationCopy["revoke-sessions"]).toContain("no session");
  });

  it("links to the profile from the account card", () => {
    const { props, view } = renderSettings();

    fireEvent.press(view.getByTestId("settings-open-profile"));
    expect(props.onOpenProfile).toHaveBeenCalled();
  });
});
