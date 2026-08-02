import { CatalogOptionsTrigger } from "@/components/catalog/catalog-options-trigger";

type FilterButtonProps = {
  active?: boolean;
  count?: number;
  onPress: () => void;
};

export function FilterButton({
  active = false,
  count = 0,
  onPress,
}: FilterButtonProps) {
  return (
    <CatalogOptionsTrigger
      accessibilityHint="Opens product filtering options"
      active={active}
      badgeCount={count}
      kind="filter"
      label="Filter"
      onPress={onPress}
    />
  );
}
