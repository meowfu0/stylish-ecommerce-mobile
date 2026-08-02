import { readFileSync } from "node:fs";
import { join } from "node:path";

import { render } from "@testing-library/react-native";
import { StyleSheet } from "react-native";

import { StylishTextInput } from "@/components/forms/stylish-text-input";
import { colors } from "@/constants/design-tokens";

describe("StylishTextInput", () => {
  it("keeps the nested native control transparent", () => {
    const { getByTestId } = render(
      <StylishTextInput editable={false} testID="input" value="Stylish" />,
    );
    const input = getByTestId("input");
    const style = StyleSheet.flatten(input.props.style);

    expect(style).toMatchObject({
      backgroundColor: "transparent",
      borderColor: "transparent",
      borderRadius: 0,
      borderWidth: 0,
      outlineColor: "transparent",
    });
    expect(input.props.selectionColor).toBe(colors.brand.primary);
    expect(input.props.underlineColorAndroid).toBe("transparent");
  });

  it("normalizes every required browser autofill state", () => {
    const css = readFileSync(join(process.cwd(), "global.css"), "utf8");

    expect(css).toContain("input:-webkit-autofill");
    expect(css).toContain("input:-webkit-autofill:hover");
    expect(css).toContain("input:-webkit-autofill:focus");
    expect(css).toContain("input:-webkit-autofill:active");
    expect(css).toContain("-webkit-background-clip: text !important");
    expect(css).toContain("background-color: transparent !important");
  });
});
