// AsyncStorage has no native module under Jest, so the package's own in-memory
// mock stands in. Anything persisting through it (the remembered workspace,
// onboarding completion) is then testable without a device.
jest.mock("@react-native-async-storage/async-storage", () =>
  require("@react-native-async-storage/async-storage/jest/async-storage-mock"),
);
