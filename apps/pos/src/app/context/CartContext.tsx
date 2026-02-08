import { createContext, useContext, useState, useCallback, ReactNode } from 'react';

interface MenuItem {
  id: string;
  name: string;
  price: number;
  image?: string;
}

interface CartItem {
  menuItem: MenuItem;
  quantity: number;
  notes?: string;
  modifiers: string[];
  excludedIngredients: string[]; // Çıkarılan malzemeler
}

interface CartContextType {
  items: CartItem[];
  tableId: string | null;
  addItem: (menuItem: MenuItem, quantity?: number, notes?: string, modifiers?: string[], excludedIngredients?: string[]) => void;
  removeItem: (menuItemId: string) => void;
  updateQuantity: (menuItemId: string, quantity: number) => void;
  updateNotes: (menuItemId: string, notes: string) => void;
  updateExcludedIngredients: (menuItemId: string, excluded: string[]) => void;
  clearCart: () => void;
  setTableId: (tableId: string | null) => void;
  total: number;
  itemCount: number;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [tableId, setTableId] = useState<string | null>(null);

  const addItem = useCallback((
    menuItem: MenuItem,
    quantity = 1,
    notes?: string,
    modifiers: string[] = [],
    excludedIngredients: string[] = []
  ) => {
    setItems((prev) => {
      const existingIndex = prev.findIndex(
        (item) =>
          item.menuItem.id === menuItem.id &&
          item.notes === notes &&
          JSON.stringify(item.modifiers) === JSON.stringify(modifiers) &&
          JSON.stringify(item.excludedIngredients) === JSON.stringify(excludedIngredients)
      );

      if (existingIndex >= 0) {
        // Mevcut öğeyi güncelle
        return prev.map((item, idx) => 
          idx === existingIndex 
            ? { ...item, quantity: item.quantity + quantity }
            : item
        );
      }

      return [...prev, { menuItem, quantity, notes, modifiers, excludedIngredients }];
    });
  }, []);

  const removeItem = useCallback((menuItemId: string) => {
    setItems((prev) => prev.filter((item) => item.menuItem.id !== menuItemId));
  }, []);

  const updateQuantity = useCallback((menuItemId: string, quantity: number) => {
    if (quantity <= 0) {
      setItems((prev) => prev.filter((item) => item.menuItem.id !== menuItemId));
      return;
    }

    setItems((prev) =>
      prev.map((item) =>
        item.menuItem.id === menuItemId ? { ...item, quantity } : item
      )
    );
  }, []);

  const updateNotes = useCallback((menuItemId: string, notes: string) => {
    setItems((prev) =>
      prev.map((item) =>
        item.menuItem.id === menuItemId ? { ...item, notes } : item
      )
    );
  }, []);

  const updateExcludedIngredients = useCallback((menuItemId: string, excluded: string[]) => {
    setItems((prev) =>
      prev.map((item) =>
        item.menuItem.id === menuItemId ? { ...item, excludedIngredients: excluded } : item
      )
    );
  }, []);

  const clearCart = useCallback(() => {
    setItems([]);
    setTableId(null);
  }, []);

  const total = items.reduce(
    (sum, item) => sum + item.menuItem.price * item.quantity,
    0
  );

  const itemCount = items.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <CartContext.Provider
      value={{
        items,
        tableId,
        addItem,
        removeItem,
        updateQuantity,
        updateNotes,
        updateExcludedIngredients,
        clearCart,
        setTableId,
        total,
        itemCount,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (context === undefined) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
}

