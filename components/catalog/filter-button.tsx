import { CatalogOptionsTrigger } from "@/components/catalog/catalog-options-trigger";

type FilterButtonProps = {
  active?: boolean;
  onPress: () => void;
};

export function FilterButton({ active = false, onPress }: FilterButtonProps) {
  return (
    <CatalogOptionsTrigger
      accessibilityHint="Opens product filtering options"
      active={active}
      kind="filter"
      label="Filter"
      onPress={onPress}
    />
  );
}
