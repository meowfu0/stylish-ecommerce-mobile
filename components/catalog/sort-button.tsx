import { CatalogOptionsTrigger } from "@/components/catalog/catalog-options-trigger";

type SortButtonProps = {
  active?: boolean;
  onPress: () => void;
};

export function SortButton({ active = false, onPress }: SortButtonProps) {
  return (
    <CatalogOptionsTrigger
      accessibilityHint="Opens product sorting options"
      active={active}
      kind="sort"
      label="Sort"
      onPress={onPress}
    />
  );
}
