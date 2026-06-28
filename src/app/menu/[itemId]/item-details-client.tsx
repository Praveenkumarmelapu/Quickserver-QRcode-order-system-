'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useOrderStore } from '@/lib/store';

interface MenuItem {
  id: string;
  name: string;
  description: string;
  image: string | null;
  price: number;
  isVeg: boolean;
  available: boolean;
  category: {
    name: string;
  };
}

export default function ItemDetailsClient({ item }: { item: MenuItem }) {
  const router = useRouter();
  const addToCart = useOrderStore((state) => state.addToCart);
  const tableSession = useOrderStore((state) => state.tableSession);

  // Custom Local State
  const [quantity, setQuantity] = useState(1);
  const [specialInstructions, setSpecialInstructions] = useState('');
  const [showToast, setShowToast] = useState(false);
  const [animatingOut, setAnimatingOut] = useState(false);

  // Add-ons list
  const [addons, setAddons] = useState([
    { id: 'addon-1', name: 'Extra Cheese', price: 1.50, checked: false },
    { id: 'addon-2', name: 'Premium Avocado Slices', price: 2.50, checked: false },
    { id: 'addon-3', name: 'Double Portion Sauce', price: 1.00, checked: false },
  ]);

  const handleAddonClick = (index: number) => {
    const updated = [...addons];
    updated[index].checked = !updated[index].checked;
    setAddons(updated);
  };

  const handleQtyChange = (val: number) => {
    setQuantity((prev) => Math.max(1, prev + val));
  };

  // Calculate prices
  const addonsCost = addons
    .filter((a) => a.checked)
    .reduce((acc, a) => acc + a.price, 0);
  const singleItemTotal = item.price + addonsCost;
  const grandTotal = singleItemTotal * quantity;

  // Add to cart submit
  const handleAddToCart = () => {
    const selectedAddons = addons.filter((a) => a.checked).map((a) => a.name);
    
    // Construct order notes (Add-ons + Special instructions)
    let finalNotes = '';
    if (selectedAddons.length > 0) {
      finalNotes += `[Add-ons: ${selectedAddons.join(', ')}] `;
    }
    if (specialInstructions.trim()) {
      finalNotes += specialInstructions.trim();
    }

    addToCart(
      {
        id: item.id,
        name: item.name,
        price: singleItemTotal, // Item price + addons price
        image: item.image,
        isVeg: item.isVeg,
      },
      quantity,
      finalNotes || undefined
    );

    setShowToast(true);
    setAnimatingOut(true);

    setTimeout(() => {
      // Go back to the menu with table session context
      if (tableSession) {
        router.push(`/menu?table=${tableSession.tableNumber}&token=${tableSession.qrToken}`);
      } else {
        router.push('/menu');
      }
    }, 1200);
  };

  const handleBack = () => {
    if (tableSession) {
      router.push(`/menu?table=${tableSession.tableNumber}&token=${tableSession.qrToken}`);
    } else {
      router.push('/menu');
    }
  };

  return (
    <div className={`min-h-screen flex flex-col font-sans bg-surface relative transition-opacity duration-300 ${animatingOut ? 'opacity-90' : 'opacity-100'}`}>
      
      {/* Top Navigation Bar */}
      <header className="fixed top-0 left-0 right-0 w-full z-50 bg-surface/90 backdrop-blur-md shadow-sm h-16 flex items-center px-4 max-w-md md:max-w-5xl mx-auto border-b border-outline-variant/10">
        <button
          onClick={handleBack}
          className="w-10 h-10 rounded-full flex items-center justify-center hover:bg-surface-container-high active:scale-90 transition-transform cursor-pointer"
        >
          <span className="material-symbols-outlined text-[20px] font-bold">arrow_back</span>
        </button>
        <h1 className="text-sm font-bold text-on-surface ml-2 truncate">Dish Details</h1>
      </header>

      {/* Responsive Splitted Layout */}
      <main className="pt-20 px-4 max-w-md md:max-w-5xl mx-auto w-full flex flex-col md:flex-row gap-6">
        
        {/* Left Column - Image container */}
        <div className="w-full md:w-1/2 h-64 md:h-[380px] md:sticky md:top-24 rounded-3xl overflow-hidden bg-surface-container-low flex-shrink-0 shadow-sm border border-outline-variant/20">
          <img
            className="w-full h-full object-cover"
            alt={item.name}
            src={item.image || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=600'}
          />
        </div>

        {/* Right Column - Customisation and pricing forms */}
        <div className="flex-1 space-y-6 pb-28 md:pb-8">
          
          {/* Title and Rating Bar */}
          <div className="space-y-3">
            <div className="flex justify-between items-start gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span
                    className={`w-3.5 h-3.5 rounded-full flex items-center justify-center border-2 ${
                      item.isVeg ? 'border-green-600 bg-green-100' : 'border-red-600 bg-red-100'
                    }`}
                  >
                    <span className={`w-1.5 h-1.5 rounded-full ${item.isVeg ? 'bg-green-600' : 'bg-red-600'}`} />
                  </span>
                  <span className="text-xs font-semibold text-on-surface-variant uppercase tracking-wider">
                    {item.category.name}
                  </span>
                </div>
                <h1 className="text-2xl font-bold text-on-surface leading-tight">{item.name}</h1>
              </div>
              
              <div className="bg-primary-fixed text-on-primary-fixed px-3 py-1.5 rounded-xl font-bold text-lg whitespace-nowrap">
                ₹{item.price.toFixed(2)}
              </div>
            </div>

            <div className="flex items-center gap-1.5 text-amber-500 text-sm">
              <span className="material-symbols-outlined text-[18px]" style={{ fontVariationSettings: "'FILL' 1" }}>
                star
              </span>
              <span className="font-bold text-on-surface">4.9</span>
              <span className="text-on-surface-variant font-normal text-xs">(120+ Reviews)</span>
            </div>
          </div>

          {/* Description */}
          <section className="border-t border-outline-variant/20 pt-4">
            <p className="text-sm text-on-surface-variant leading-relaxed">
              {item.description}
            </p>
          </section>

          {/* Quantity Selector */}
          <section className="flex items-center justify-between py-4 border-y border-outline-variant/30">
            <span className="text-sm font-bold text-on-surface">Select Quantity</span>
            <div className="flex items-center gap-6 bg-surface-container rounded-full p-1.5">
              <button
                onClick={() => handleQtyChange(-1)}
                className="w-10 h-10 flex items-center justify-center rounded-full bg-surface-container-lowest text-primary shadow-sm active:scale-90 transition-transform cursor-pointer"
              >
                <span className="material-symbols-outlined text-[20px]">remove</span>
              </button>
              <span className="font-bold text-lg w-6 text-center">{quantity}</span>
              <button
                onClick={() => handleQtyChange(1)}
                className="w-10 h-10 flex items-center justify-center rounded-full bg-primary text-on-primary shadow-sm active:scale-90 transition-transform cursor-pointer"
              >
                <span className="material-symbols-outlined text-[20px]">add</span>
              </button>
            </div>
          </section>

          {/* Customise / Add-ons */}
          <section className="space-y-3">
            <h3 className="text-base font-bold text-on-surface">Customise Your Order</h3>
            <div className="space-y-2">
              {addons.map((addon, index) => (
                <label
                  key={addon.id}
                  onClick={() => handleAddonClick(index)}
                  className={`flex items-center justify-between p-4 rounded-xl border transition-all cursor-pointer select-none active:bg-surface-container ${
                    addon.checked
                      ? 'bg-surface-container-low border-primary/40'
                      : 'bg-surface-container-low border-transparent hover:border-outline-variant/30'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
                      addon.checked ? 'bg-primary border-primary text-white' : 'border-outline'
                    }`}>
                      {addon.checked && (
                        <span className="material-symbols-outlined text-[14px] font-bold">check</span>
                      )}
                    </div>
                    <span className="text-sm text-on-surface font-medium">{addon.name}</span>
                  </div>
                  <span className="text-xs font-semibold text-on-surface-variant">+₹{addon.price.toFixed(2)}</span>
                </label>
              ))}
            </div>
          </section>

          {/* Special Instructions */}
          <section className="space-y-3">
            <h3 className="text-base font-bold text-on-surface">Special Instructions</h3>
            <textarea
              value={specialInstructions}
              onChange={(e) => setSpecialInstructions(e.target.value)}
              className="w-full h-24 p-3 rounded-xl bg-surface-container-low border border-outline-variant/30 focus:border-primary focus:ring-1 focus:ring-primary text-sm placeholder:text-on-surface-variant/40 resize-none outline-none transition-all"
              placeholder="E.g. No onions, extra spicy, etc."
            ></textarea>
          </section>
        </div>
      </main>

      {/* Sticky Bottom Add-to-Cart Bar */}
      <div className="fixed bottom-0 left-0 right-0 w-full p-4 bg-surface/80 backdrop-blur-xl border-t border-outline-variant/20 z-40 max-w-md md:max-w-5xl mx-auto shadow-lg">
        <button
          onClick={handleAddToCart}
          className="w-full h-16 bg-primary text-on-primary rounded-xl font-bold shadow-lg shadow-primary/20 active:scale-[0.98] transition-all flex items-center justify-center gap-3 hover:bg-primary-container hover:text-on-primary-container cursor-pointer"
        >
          <span className="material-symbols-outlined text-[22px]">shopping_bag</span>
          <span>Add to Cart - ₹{grandTotal.toFixed(2)}</span>
        </button>
      </div>

      {/* Toast Notification */}
      {showToast && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 bg-inverse-surface text-inverse-on-surface px-6 py-3 rounded-full text-xs font-semibold shadow-lg z-50 animate-bounce">
          Added to cart successfully! Redirecting...
        </div>
      )}
    </div>
  );
}
