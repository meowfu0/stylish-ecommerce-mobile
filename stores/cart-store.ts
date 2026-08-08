import { create } from "zustand";

export type CartProduct = {
  id: string;
  image: number;
  price: number;
  size: string;
  title: string;
};

export type CartLine = CartProduct & {
  quantity: number;
};

type CartStore = {
  addItem: (product: CartProduct) => void;
  clearCart: () => void;
  decrementItem: (id: string, size: string) => void;
  items: CartLine[];
  removeItem: (id: string, size: string) => void;
};

export const useCartStore = create<CartStore>((set) => ({
  addItem: (product) =>
    set((state) => {
      const existingIndex = state.items.findIndex(
        (item) => item.id === product.id && item.size === product.size,
      );

      if (existingIndex === -1) {
        return {
          items: [...state.items, { ...product, quantity: 1 }],
        };
      }

      return {
        items: state.items.map((item, index) =>
          index === existingIndex
            ? { ...item, quantity: item.quantity + 1 }
            : item,
        ),
      };
    }),
  clearCart: () => set({ items: [] }),
  decrementItem: (id, size) =>
    set((state) => ({
      items: state.items.flatMap((item) => {
        if (item.id !== id || item.size !== size) {
          return [item];
        }

        return item.quantity > 1
          ? [{ ...item, quantity: item.quantity - 1 }]
          : [];
      }),
    })),
  items: [],
  removeItem: (id, size) =>
    set((state) => ({
      items: state.items.filter((item) => item.id !== id || item.size !== size),
    })),
}));

export const selectCartQuantity = (state: CartStore) =>
  state.items.reduce((total, item) => total + item.quantity, 0);

export const selectCartSubtotal = (state: CartStore) =>
  state.items.reduce((total, item) => total + item.price * item.quantity, 0);
