'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useOrderStore } from '@/lib/store';

export default function CartPage() {
  const router = useRouter();
  
  // Zustand state
  const cart = useOrderStore((state) => state.cart);
  const tableSession = useOrderStore((state) => state.tableSession);
  const updateQuantity = useOrderStore((state) => state.updateQuantity);
  const removeFromCart = useOrderStore((state) => state.removeFromCart);
  const clearCart = useOrderStore((state) => state.clearCart);

  // Client hydration check
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse space-y-4 text-center">
          <div className="w-10 h-10 rounded-full border-4 border-primary border-t-transparent animate-spin mx-auto"></div>
          <p className="text-sm text-on-surface-variant font-medium">Loading your cart...</p>
        </div>
      </div>
    );
  }

  // Calculate totals
  const subtotal = cart.reduce((acc, item) => acc + item.price * item.quantity, 0);
  const tax = subtotal * 0.05; // 5% GST
  const serviceCharge = subtotal * 0.05; // 5% Service Tax
  const grandTotal = subtotal + tax + serviceCharge;

  const handleBackToMenu = () => {
    if (tableSession) {
      router.push(`/menu?table=${tableSession.tableNumber}&token=${tableSession.qrToken}`);
    } else {
      router.push('/menu');
    }
  };

  const handleCheckout = () => {
    router.push('/checkout');
  };

  return (
    <div className="min-h-screen flex flex-col font-sans bg-surface pb-32">
      {/* TopAppBar */}
      <header className="fixed top-0 left-0 right-0 w-full z-50 bg-surface/90 backdrop-blur-md shadow-sm h-16 flex items-center px-4 max-w-md md:max-w-5xl mx-auto border-b border-outline-variant/10">
        <button
          onClick={handleBackToMenu}
          className="w-10 h-10 rounded-full flex items-center justify-center hover:bg-surface-container-high active:scale-90 transition-transform cursor-pointer"
        >
          <span className="material-symbols-outlined text-[20px] font-bold">arrow_back</span>
        </button>
        <h1 className="text-lg font-bold text-on-surface ml-2">Review Your Cart</h1>
        {tableSession && (
          <span className="text-[10px] uppercase font-bold tracking-wider bg-secondary-container text-on-secondary-container px-2 py-0.5 rounded-full ml-auto">
            Table {tableSession.tableNumber}
          </span>
        )}
      </header>

      {/* Cart Container */}
      <main className="pt-20 px-4 max-w-md md:max-w-5xl mx-auto w-full flex-1 flex flex-col">
        {cart.length === 0 ? (
          /* Empty State */
          <div className="flex-1 flex flex-col items-center justify-center py-20 space-y-6 text-center">
            <div className="w-20 h-20 bg-surface-container rounded-full flex items-center justify-center text-outline shadow-inner">
              <span className="material-symbols-outlined text-[42px]">shopping_cart</span>
            </div>
            <div className="space-y-2">
              <h2 className="text-xl font-bold text-on-surface">Your Cart is Empty</h2>
              <p className="text-sm text-on-surface-variant max-w-[240px] mx-auto leading-relaxed">
                Explore our digital menu, choose your favorite dishes, and customize them to your liking.
              </p>
            </div>
            <button
              onClick={handleBackToMenu}
              className="px-6 py-3 bg-primary text-on-primary rounded-xl text-sm font-bold shadow-md hover:bg-primary/95 active:scale-95 transition-all cursor-pointer"
            >
              Browse Our Menu
            </button>
          </div>
        ) : (
          /* Split Layout Container */
          <div className="flex flex-col md:flex-row gap-6 items-start justify-between w-full">
            
            {/* Left Column - Items List */}
            <div className="flex-1 w-full space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-xs text-on-surface-variant font-semibold tracking-wide uppercase">Items List</span>
                <button
                  onClick={clearCart}
                  className="text-xs text-error hover:underline font-semibold flex items-center gap-1 cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[16px]">delete_sweep</span>
                  Clear All
                </button>
              </div>

              <div className="space-y-3">
                {cart.map((item) => (
                  <div
                    key={`${item.id}-${item.notes || ''}`}
                    className="p-4 bg-surface-container-lowest rounded-2xl border border-outline-variant/60 shadow-sm flex gap-3 relative"
                  >
                    {/* Item Image */}
                    <div className="w-16 h-16 rounded-xl bg-surface-container-low overflow-hidden flex-shrink-0">
                      <img
                        className="w-full h-full object-cover"
                        alt={item.name}
                        src={item.image || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400'}
                      />
                    </div>

                    {/* Item Details */}
                    <div className="flex-1 min-w-0 space-y-1">
                      <div className="flex justify-between items-start gap-1">
                        <h4 className="font-bold text-sm text-on-surface truncate pr-6">{item.name}</h4>
                        <span className="text-sm font-bold text-primary">₹{(item.price * item.quantity).toFixed(2)}</span>
                      </div>
                      
                      {item.notes && (
                        <p className="text-[11px] text-on-surface-variant/75 italic leading-relaxed line-clamp-1 bg-surface-container/50 py-0.5 px-2 rounded inline-block">
                          {item.notes}
                        </p>
                      )}

                      <div className="flex justify-between items-center pt-2">
                        {/* Remove item button */}
                        <button
                          onClick={() => removeFromCart(item.id)}
                          className="text-xs text-on-surface-variant/60 hover:text-error flex items-center gap-0.5 cursor-pointer font-medium"
                        >
                          <span className="material-symbols-outlined text-[16px]">delete</span>
                          Remove
                        </button>

                        {/* Quantity picker */}
                        <div className="flex items-center gap-3 bg-surface-container rounded-full p-1">
                          <button
                            onClick={() => updateQuantity(item.id, item.quantity - 1)}
                            className="w-7 h-7 flex items-center justify-center rounded-full bg-surface-container-lowest text-primary shadow-sm active:scale-90 transition-transform cursor-pointer"
                          >
                            <span className="material-symbols-outlined text-[16px] font-bold">remove</span>
                          </button>
                          <span className="font-bold text-xs w-4 text-center">{item.quantity}</span>
                          <button
                            onClick={() => updateQuantity(item.id, item.quantity + 1)}
                            className="w-7 h-7 flex items-center justify-center rounded-full bg-primary text-on-primary shadow-sm active:scale-90 transition-transform cursor-pointer"
                          >
                            <span className="material-symbols-outlined text-[16px] font-bold">add</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Right Column - Bill Summary */}
            <div className="w-full md:w-80 space-y-4 bg-surface-container-low p-5 rounded-3xl border border-outline-variant/30 shadow-sm md:sticky md:top-24 flex-shrink-0">
              <h3 className="text-sm font-bold text-on-surface tracking-tight border-b border-outline-variant/20 pb-2">Bill Details</h3>
              <div className="space-y-2 text-xs font-semibold text-on-surface-variant">
                <div className="flex justify-between">
                  <span>Subtotal</span>
                  <span className="text-on-surface">₹{subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span>GST (5%)</span>
                  <span className="text-on-surface">₹{tax.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Service Tax (5%)</span>
                  <span className="text-on-surface">₹{serviceCharge.toFixed(2)}</span>
                </div>
                <div className="flex justify-between border-t border-outline-variant/30 pt-3 text-sm font-bold text-on-surface">
                  <span>Grand Total</span>
                  <span className="text-primary">₹{grandTotal.toFixed(2)}</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Sticky Bottom Checkout Action */}
      {cart.length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 w-full p-4 bg-surface/85 backdrop-blur-xl border-t border-outline-variant/25 z-40 max-w-md md:max-w-5xl mx-auto shadow-lg">
          <div className="flex gap-3">
            <button
              onClick={handleBackToMenu}
              className="flex-1 h-14 bg-surface-container border border-outline-variant text-on-surface rounded-xl font-bold active:scale-[0.98] transition-all cursor-pointer flex items-center justify-center gap-1.5 hover:bg-surface-container-high"
            >
              <span className="material-symbols-outlined text-[18px]">add</span>
              Add More
            </button>
            <button
              onClick={handleCheckout}
              className="flex-[2] h-14 bg-primary text-on-primary rounded-xl font-bold shadow-lg shadow-primary/20 active:scale-[0.98] transition-all cursor-pointer flex items-center justify-center gap-1.5 hover:opacity-90"
            >
              <span>Proceed to Checkout</span>
              <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
