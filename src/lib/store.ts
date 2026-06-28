import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface CartItem {
  id: string;
  name: string;
  price: number;
  image: string | null;
  quantity: number;
  notes?: string;
  isVeg: boolean;
}

export interface TableSession {
  id: string;
  tableNumber: number;
  capacity: number;
  qrToken: string;
}

interface OrderState {
  cart: CartItem[];
  tableSession: TableSession | null;
  activeOrderId: string | null;
  
  // Actions
  setTableSession: (session: TableSession | null) => void;
  addToCart: (item: Omit<CartItem, 'quantity'>, quantity: number, notes?: string) => void;
  removeFromCart: (itemId: string) => void;
  updateQuantity: (itemId: string, quantity: number) => void;
  updateNotes: (itemId: string, notes: string) => void;
  clearCart: () => void;
  setActiveOrderId: (orderId: string | null) => void;
}

export const useOrderStore = create<OrderState>()(
  persist(
    (set) => ({
      cart: [],
      tableSession: null,
      activeOrderId: null,
      
      setTableSession: (session) => set({ tableSession: session }),
      
      addToCart: (item, quantity, notes) => set((state) => {
        // Find if item already exists in cart with same customization notes
        const existingIndex = state.cart.findIndex(
          (i) => i.id === item.id && (i.notes || '') === (notes || '')
        );
        
        const newCart = [...state.cart];
        if (existingIndex > -1) {
          newCart[existingIndex].quantity += quantity;
        } else {
          newCart.push({ ...item, quantity, notes });
        }
        return { cart: newCart };
      }),
      
      removeFromCart: (itemId) => set((state) => ({
        cart: state.cart.filter((item) => item.id !== itemId)
      })),
      
      updateQuantity: (itemId, quantity) => set((state) => ({
        cart: state.cart.map((item) =>
          item.id === itemId ? { ...item, quantity: Math.max(1, quantity) } : item
        )
      })),
      
      updateNotes: (itemId, notes) => set((state) => ({
        cart: state.cart.map((item) =>
          item.id === itemId ? { ...item, notes } : item
        )
      })),
      
      clearCart: () => set({ cart: [] }),
      
      setActiveOrderId: (orderId) => set({ activeOrderId: orderId }),
    }),
    {
      name: 'luxedine-order-storage',
    }
  )
);
