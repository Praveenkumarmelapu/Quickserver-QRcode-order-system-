'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useOrderStore } from '@/lib/store';

export default function CheckoutPage() {
  const router = useRouter();
  
  // Zustand State
  const cart = useOrderStore((state) => state.cart);
  const tableSession = useOrderStore((state) => state.tableSession);
  const clearCart = useOrderStore((state) => state.clearCart);
  const setActiveOrderId = useOrderStore((state) => state.setActiveOrderId);

  // Local Form State
  const [customerName, setCustomerName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [orderNotes, setOrderNotes] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'counter' | 'online'>('counter');
  
  // UI states
  const [mounted, setMounted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccessToast, setShowSuccessToast] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse space-y-4 text-center">
          <div className="w-10 h-10 rounded-full border-4 border-primary border-t-transparent animate-spin mx-auto"></div>
          <p className="text-sm text-on-surface-variant font-medium">Preparing checkout...</p>
        </div>
      </div>
    );
  }

  // Session checks
  if (!tableSession) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-4">
        <div className="bg-surface-container-lowest border border-error/20 p-8 rounded-2xl shadow-lg max-w-md w-full text-center space-y-4">
          <div className="w-16 h-16 bg-error-container text-error rounded-full flex items-center justify-center mx-auto">
            <span className="material-symbols-outlined text-[36px]" style={{ fontVariationSettings: "'FILL' 1" }}>error</span>
          </div>
          <h1 className="text-2xl font-bold text-on-surface">No Table Session</h1>
          <p className="text-on-surface-variant text-base leading-relaxed">
            You don't have an active table session. Please scan the QR code at your table to begin ordering.
          </p>
        </div>
      </div>
    );
  }

  if (cart.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-4">
        <div className="bg-surface-container-lowest border border-outline-variant/35 p-8 rounded-2xl shadow-lg max-w-md w-full text-center space-y-4">
          <div className="w-16 h-16 bg-surface-container text-outline rounded-full flex items-center justify-center mx-auto">
            <span className="material-symbols-outlined text-[36px]">shopping_cart</span>
          </div>
          <h1 className="text-2xl font-bold text-on-surface">Your Cart is Empty</h1>
          <p className="text-on-surface-variant text-base leading-relaxed">
            Please add items to your cart before proceeding to checkout.
          </p>
          <button
            onClick={() => router.push(`/menu?table=${tableSession.tableNumber}&token=${tableSession.qrToken}`)}
            className="w-full py-3 bg-primary text-on-primary rounded-xl text-sm font-bold shadow-md hover:bg-primary/95 active:scale-95 transition-all cursor-pointer"
          >
            Browse Menu
          </button>
        </div>
      </div>
    );
  }

  // Subtotal calculations
  const subtotal = cart.reduce((acc, item) => acc + item.price * item.quantity, 0);
  const gst = subtotal * 0.05; // 5% GST
  const serviceTax = subtotal * 0.05; // 5% Service Tax
  const totalTax = gst + serviceTax;
  const total = subtotal + totalTax;

  const handleBackToCart = () => {
    router.push('/cart');
  };

  const handlePlaceOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    setIsSubmitting(true);

    // Map cart items to API format
    const apiItems = cart.map(item => {
      // Append item notes and customer details if any
      let finalNotes = item.notes || '';
      if (orderNotes.trim() && finalNotes) {
        finalNotes += ` (General note: ${orderNotes.trim()})`;
      } else if (orderNotes.trim()) {
        finalNotes = orderNotes.trim();
      }
      
      // Store customer name & phone inside order items metadata/notes if necessary
      if (customerName.trim() || phoneNumber.trim()) {
        const contactInfo = `[Cust: ${customerName.trim() || 'Guest'}${phoneNumber.trim() ? `, Ph: ${phoneNumber.trim()}` : ''}]`;
        finalNotes = finalNotes ? `${contactInfo} ${finalNotes}` : contactInfo;
      }

      return {
        menuItemId: item.id,
        quantity: item.quantity,
        notes: finalNotes || null,
        price: item.price
      };
    });

    try {
      const response = await fetch('/api/orders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          tableId: tableSession.id,
          qrToken: tableSession.qrToken,
          items: apiItems,
          subtotal,
          tax: totalTax,
          total
        })
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || 'Failed to place order');
      }

      const createdOrder = await response.json();

      // Save order ID to device history to prevent leakage to subsequent table scans
      if (typeof window !== 'undefined') {
        try {
          const placedOrders = JSON.parse(localStorage.getItem('luxedine-placed-orders') || '[]');
          placedOrders.push(createdOrder.id);
          localStorage.setItem('luxedine-placed-orders', JSON.stringify(placedOrders));
        } catch (e) {
          console.error('Error writing placed order history:', e);
        }
      }

      clearCart();
      router.push(`/track/${createdOrder.id}`);

    } catch (err: any) {
      console.error(err);
      alert(err.message || 'Something went wrong while placing your order. Please try again.');
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col font-sans bg-surface pb-32">
      {/* TopAppBar */}
      <header className="fixed top-0 left-0 right-0 w-full z-50 bg-surface/90 backdrop-blur-md shadow-sm h-16 flex items-center px-4 max-w-md md:max-w-5xl mx-auto border-b border-outline-variant/10">
        <button
          onClick={handleBackToCart}
          className="w-10 h-10 rounded-full flex items-center justify-center hover:bg-surface-container-high active:scale-90 transition-transform cursor-pointer"
        >
          <span className="material-symbols-outlined text-[20px] font-bold">arrow_back</span>
        </button>
        <h1 className="text-lg font-bold text-on-surface ml-2">Checkout</h1>
        <span className="text-[10px] uppercase font-bold tracking-wider bg-secondary-container text-on-secondary-container px-2.5 py-0.5 rounded-full ml-auto">
          Table {tableSession.tableNumber}
        </span>
      </header>

      {/* Main Form container */}
      <main className="pt-20 px-4 max-w-md md:max-w-5xl mx-auto w-full flex-1 flex flex-col">
        <form onSubmit={handlePlaceOrder} className="w-full">
          <div className="flex flex-col md:flex-row gap-6 items-start justify-between w-full">
            
            {/* Left Column - Form Inputs */}
            <div className="flex-1 w-full space-y-6">
              {/* Identity fields */}
              <div className="space-y-3">
                <h3 className="text-xs font-bold text-on-surface uppercase tracking-wider px-1">Customer Info</h3>
                
                <div className="flex flex-col gap-1">
                  <label className="text-[11px] font-bold text-on-surface-variant uppercase tracking-wider px-1" htmlFor="customer_name">
                    Customer Name
                  </label>
                  <input
                    id="customer_name"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    className="w-full h-12 px-4 rounded-xl border border-outline-variant/65 bg-surface-container-lowest focus:ring-1 focus:ring-primary focus:border-primary transition-all outline-none text-sm placeholder:text-on-surface-variant/30"
                    placeholder="Enter your name"
                    type="text"
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-[11px] font-bold text-on-surface-variant uppercase tracking-wider px-1" htmlFor="phone_number">
                    Phone Number (Optional)
                  </label>
                  <input
                    id="phone_number"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    className="w-full h-12 px-4 rounded-xl border border-outline-variant/65 bg-surface-container-lowest focus:ring-1 focus:ring-primary focus:border-primary transition-all outline-none text-sm placeholder:text-on-surface-variant/30"
                    placeholder="E.g. +91 98765 43210"
                    type="tel"
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-[11px] font-bold text-on-surface-variant uppercase tracking-wider px-1" htmlFor="order_notes">
                    Allergies / Special Notes
                  </label>
                  <textarea
                    id="order_notes"
                    value={orderNotes}
                    onChange={(e) => setOrderNotes(e.target.value)}
                    className="w-full p-3 rounded-xl border border-outline-variant/65 bg-surface-container-lowest focus:ring-1 focus:ring-primary focus:border-primary transition-all outline-none text-sm placeholder:text-on-surface-variant/30 resize-none h-20"
                    placeholder="E.g. No spice, extra cutlery..."
                    rows={2}
                  />
                </div>
              </div>

              {/* Payment Method Selection */}
              <div className="space-y-2">
                <label className="text-[11px] font-bold text-on-surface-variant uppercase tracking-wider px-1">
                  Payment Method
                </label>
                <div className="grid grid-cols-1 gap-2.5">
                  {/* Counter */}
                  <label
                    onClick={() => setPaymentMethod('counter')}
                    className={`flex items-center p-4 rounded-2xl cursor-pointer transition-all border select-none active:scale-[0.98] ${
                      paymentMethod === 'counter'
                        ? 'bg-primary-container/10 border-primary border-2'
                        : 'bg-surface-container-lowest border-outline-variant/60 hover:bg-surface-container-low'
                    }`}
                  >
                    <div className="flex items-center gap-3 w-full">
                      <div className={`flex items-center justify-center w-10 h-10 rounded-full ${
                        paymentMethod === 'counter' ? 'bg-primary/20 text-primary' : 'bg-surface-container text-on-surface-variant'
                      }`}>
                        <span className="material-symbols-outlined text-[22px]">payments</span>
                      </div>
                      <div className="flex-1">
                        <p className={`text-sm font-bold ${paymentMethod === 'counter' ? 'text-primary' : 'text-on-surface'}`}>
                          Pay Later at Counter
                        </p>
                        <p className="text-[11px] text-on-surface-variant opacity-75">
                          Settle your bill after your meal
                        </p>
                      </div>
                      <span className={`material-symbols-outlined text-[20px] ${
                        paymentMethod === 'counter' ? 'text-primary font-bold' : 'text-outline-variant'
                      }`} style={paymentMethod === 'counter' ? { fontVariationSettings: "'FILL' 1" } : undefined}>
                        {paymentMethod === 'counter' ? 'check_circle' : 'radio_button_unchecked'}
                      </span>
                    </div>
                  </label>

                  {/* Online */}
                  <label
                    onClick={() => setPaymentMethod('online')}
                    className={`flex items-center p-4 rounded-2xl cursor-pointer transition-all border select-none active:scale-[0.98] ${
                      paymentMethod === 'online'
                        ? 'bg-primary-container/10 border-primary border-2'
                        : 'bg-surface-container-lowest border-outline-variant/60 hover:bg-surface-container-low'
                    }`}
                  >
                    <div className="flex items-center gap-3 w-full">
                      <div className={`flex items-center justify-center w-10 h-10 rounded-full ${
                        paymentMethod === 'online' ? 'bg-primary/20 text-primary' : 'bg-surface-container text-on-surface-variant'
                      }`}>
                        <span className="material-symbols-outlined text-[22px]">credit_card</span>
                      </div>
                      <div className="flex-1">
                        <p className={`text-sm font-bold ${paymentMethod === 'online' ? 'text-primary' : 'text-on-surface'}`}>
                          Online Payment
                        </p>
                        <p className="text-[11px] text-on-surface-variant opacity-75">
                          UPI, Card, Google Pay or NetBanking
                        </p>
                      </div>
                      <span className={`material-symbols-outlined text-[20px] ${
                        paymentMethod === 'online' ? 'text-primary font-bold' : 'text-outline-variant'
                      }`} style={paymentMethod === 'online' ? { fontVariationSettings: "'FILL' 1" } : undefined}>
                        {paymentMethod === 'online' ? 'check_circle' : 'radio_button_unchecked'}
                      </span>
                    </div>
                  </label>
                </div>
              </div>
            </div>

            {/* Right Column - Summary & Placement Actions */}
            <div className="w-full md:w-80 space-y-5 bg-surface-container-low p-5 rounded-3xl border border-outline-variant/30 shadow-sm md:sticky md:top-24 flex-shrink-0">
              
              {/* Table Badge Header */}
              <section className="text-center space-y-2">
                <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-primary-container text-on-primary-container shadow-md">
                  <span className="font-extrabold text-xl">{tableSession.tableNumber}</span>
                </div>
                <h2 className="text-sm font-bold text-on-surface">Confirm Table {tableSession.tableNumber} Order</h2>
                <p className="text-on-surface-variant text-[10px]">Verify details below to send to the kitchen</p>
              </section>

              {/* Bill Summary */}
              <div className="p-4 bg-surface-container-lowest rounded-2xl border border-outline-variant/20 space-y-2 text-xs font-semibold text-on-surface-variant">
                <div className="flex justify-between items-center">
                  <span>Subtotal</span>
                  <span className="text-on-surface">₹{subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span>Taxes & charges</span>
                  <span className="text-on-surface">₹{totalTax.toFixed(2)}</span>
                </div>
                <div className="pt-2 border-t border-outline-variant/30 flex justify-between items-center text-sm font-bold text-on-surface">
                  <span>Total</span>
                  <span className="text-primary text-base">₹{total.toFixed(2)}</span>
                </div>
              </div>

              {/* Place Order Button */}
              <div className="fixed bottom-0 left-0 right-0 w-full p-4 bg-surface/85 backdrop-blur-xl border-t border-outline-variant/25 z-40 max-w-md md:max-w-none md:relative md:bottom-auto md:left-auto md:right-auto md:p-0 md:bg-transparent md:border-t-0 md:shadow-none">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full h-14 bg-primary text-on-primary rounded-xl font-bold shadow-lg shadow-primary/20 active:scale-[0.98] hover:brightness-105 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? (
                    <>
                      <span className="material-symbols-outlined text-[20px] animate-spin">progress_activity</span>
                      <span>Placing Order...</span>
                    </>
                  ) : (
                    <>
                      <span>Place Order - ₹{total.toFixed(2)}</span>
                      <span className="material-symbols-outlined text-[20px]">restaurant</span>
                    </>
                  )}
                </button>
              </div>

            </div>
          </div>
        </form>
      </main>

      {/* Success Notification Modal */}
      {showSuccessToast && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-inverse-surface text-inverse-on-surface px-6 py-4 rounded-3xl shadow-2xl flex items-center gap-3 animate-bounce">
            <span className="material-symbols-outlined text-secondary-fixed text-[26px]">check_circle</span>
            <div>
              <p className="text-sm font-bold">Order Confirmed!</p>
              <p className="text-[10px] text-inverse-on-surface/80">Sending details to the kitchen...</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
