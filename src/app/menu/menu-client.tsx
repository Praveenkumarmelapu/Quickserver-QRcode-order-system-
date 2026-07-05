'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useOrderStore, CartItem } from '@/lib/store';

interface MenuItem {
  id: string;
  categoryId: string;
  name: string;
  description: string;
  image: string | null;
  price: number;
  isVeg: boolean;
  available: boolean;
}

interface Category {
  id: string;
  name: string;
  items: MenuItem[];
}

interface MenuClientProps {
  initialCategories: Category[];
  specialItem: MenuItem | null;
  verifiedTable?: {
    id: string;
    tableNumber: number;
    capacity: number;
    qrToken: string;
  } | null;
}

export default function MenuClient({ initialCategories, specialItem, verifiedTable }: MenuClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Zustand State
  const cart = useOrderStore((state) => state.cart);
  const tableSession = useOrderStore((state) => state.tableSession);
  const setTableSession = useOrderStore((state) => state.setTableSession);
  const addToCart = useOrderStore((state) => state.addToCart);
  const activeOrderId = useOrderStore((state) => state.activeOrderId);

  // Component Local State
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('All');
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [showAssistanceModal, setShowAssistanceModal] = useState(false);
  const [assistanceSent, setAssistanceSent] = useState(false);
  const [requestType, setRequestType] = useState<'waiter' | 'bill'>('waiter');

  // Billing states
  const [showBillModal, setShowBillModal] = useState(false);
  const [billOrders, setBillOrders] = useState<any[]>([]);
  const [loadingBill, setLoadingBill] = useState(false);

  // Fetch bill orders
  useEffect(() => {
    if (showBillModal && tableSession) {
      const fetchActiveBill = async () => {
        setLoadingBill(true);
        try {
          const res = await fetch(`/api/orders?tableId=${tableSession.id}&active=true`);
          if (res.ok) {
            const data = await res.json();
            setBillOrders(data);
          }
        } catch (e) {
          console.error('Error fetching active bill:', e);
        } finally {
          setLoadingBill(false);
        }
      };
      fetchActiveBill();
    }
  }, [showBillModal, tableSession]);

  // Aggregate items from all active orders
  const activeBillItems = billOrders.reduce((acc: any[], order: any) => {
    order.orderItems.forEach((oi: any) => {
      const existing = acc.find(
        (item) => item.menuItem.id === oi.menuItem.id && (item.notes || '') === (oi.notes || '')
      );
      if (existing) {
        existing.quantity += oi.quantity;
      } else {
        acc.push({
          menuItem: oi.menuItem,
          quantity: oi.quantity,
          price: oi.price,
          notes: oi.notes,
        });
      }
    });
    return acc;
  }, []);

  const billSubtotal = activeBillItems.reduce((acc, item) => acc + item.price * item.quantity, 0);
  const billTax = billSubtotal * 0.05; // 5% CGST
  const billServiceCharge = billSubtotal * 0.05; // 5% Service Tax
  const billTotal = billSubtotal + billTax + billServiceCharge;

  // Verify and sync table session from URL query parameters if available
  useEffect(() => {
    const tableNum = searchParams.get('table');
    const token = searchParams.get('token');

    if (tableNum && token) {
      const needsUpdate = !tableSession || 
                          tableSession.qrToken !== token || 
                          tableSession.id.startsWith('url-table-');
      if (needsUpdate) {
        if (verifiedTable) {
          setTableSession(verifiedTable);
        } else {
          setTableSession({
            id: `url-table-${tableNum}`,
            tableNumber: parseInt(tableNum, 10),
            capacity: 4,
            qrToken: token,
          });
        }
      }
    }
  }, [searchParams, tableSession, setTableSession, verifiedTable]);

  // Toast Timer
  useEffect(() => {
    if (toastMessage) {
      const timer = setTimeout(() => {
        setToastMessage(null);
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [toastMessage]);

  // Calculate cart metrics
  const totalItems = cart.reduce((acc, item) => acc + item.quantity, 0);
  const totalPrice = cart.reduce((acc, item) => acc + item.price * item.quantity, 0);

  // Handle immediate direct add to cart
  const handleQuickAdd = (e: React.MouseEvent, item: MenuItem) => {
    e.stopPropagation(); // Prevent card click redirect
    addToCart(
      {
        id: item.id,
        name: item.name,
        price: item.price,
        image: item.image,
        isVeg: item.isVeg,
      },
      1
    );
    setToastMessage(`Added "${item.name}" to cart!`);
  };

  // Handle category chip click
  const handleCategoryClick = (catName: string) => {
    setActiveCategory(catName);
    if (catName !== 'All') {
      const element = document.getElementById(`category-${catName}`);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    } else {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  // Handle Request Assistance API calls
  const triggerAssistance = async () => {
    if (!tableSession) {
      alert("Invalid table session. Please scan your table QR code.");
      return;
    }

    try {
      const endpoint = requestType === 'waiter' ? '/api/request-waiter' : '/api/request-bill';
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tableId: tableSession.id,
          qrToken: tableSession.qrToken
        })
      });

      if (response.ok) {
        setAssistanceSent(true);
        setTimeout(() => {
          setShowAssistanceModal(false);
          setAssistanceSent(false);
        }, 2000);
      } else {
        alert("Request failed. Please notify the staff directly.");
      }
    } catch (e) {
      console.error(e);
      alert("Network error. Please try again.");
    }
  };

  // Filter Categories and Items based on Search Query
  const getFilteredMenu = () => {
    if (!searchQuery) {
      if (activeCategory === 'All') return initialCategories;
      return initialCategories.filter(cat => cat.name === activeCategory);
    }

    const query = searchQuery.toLowerCase();
    return initialCategories
      .map(cat => {
        const filteredItems = cat.items.filter(
          item =>
            item.name.toLowerCase().includes(query) ||
            item.description.toLowerCase().includes(query)
        );
        return { ...cat, items: filteredItems };
      })
      .filter(cat => cat.items.length > 0);
  };

  const filteredCategories = getFilteredMenu();

  return (
    <div className="bg-surface text-on-surface min-h-screen pb-56 print:bg-white print:text-black print:p-0 print:pb-0">
      {/* TopAppBar */}
      <header className="fixed top-0 left-0 right-0 w-full z-50 bg-surface/90 backdrop-blur-md shadow-sm h-16 flex justify-between items-center px-4 max-w-md md:max-w-5xl mx-auto border-b border-outline-variant/10 print:hidden">
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 rounded-full bg-primary-container flex items-center justify-center overflow-hidden border border-outline-variant/30">
            <span className="material-symbols-outlined text-on-primary-container text-[24px]" style={{ fontVariationSettings: "'FILL' 1" }}>
              restaurant
            </span>
          </div>
          <h1 className="text-xl text-primary font-extrabold tracking-tight">LuxeDine</h1>
          {tableSession && (
            <span className="text-[10px] uppercase font-bold tracking-wider bg-secondary-container text-on-secondary-container px-2 py-0.5 rounded-full ml-1">
              Table {tableSession.tableNumber}
            </span>
          )}
        </div>
        <div className="flex gap-2">
          <button 
            onClick={() => { setRequestType('waiter'); setShowAssistanceModal(true); }}
            className="w-10 h-10 rounded-full flex items-center justify-center hover:bg-surface-container-high transition-colors active:scale-95 duration-150 border border-outline-variant/30 bg-surface-container-lowest"
            title="Call Waiter"
          >
            <span className="material-symbols-outlined text-on-surface-variant text-[22px]">spatial_audio</span>
          </button>
          <button 
            onClick={() => { setShowBillModal(true); }}
            className="w-10 h-10 rounded-full flex items-center justify-center hover:bg-surface-container-high transition-colors active:scale-95 duration-150 border border-outline-variant/30 bg-surface-container-lowest print:hidden"
            title="Request Bill"
          >
            <span className="material-symbols-outlined text-primary text-[22px]" style={{ fontVariationSettings: "'FILL' 1" }}>payments</span>
          </button>
        </div>
      </header>

      {/* Main Container (Mobile centered, desktop grid) */}
      <main className="pt-20 px-4 space-y-6 max-w-md md:max-w-5xl mx-auto print:hidden">
        {/* Search Bar */}
        <div className="relative group">
          <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
            <span className="material-symbols-outlined text-outline">search</span>
          </div>
          <input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-surface-container-low border border-outline-variant rounded-xl py-3 pl-12 pr-12 text-sm focus:ring-2 focus:ring-primary focus:border-transparent transition-all outline-none"
            placeholder="Search for dishes, categories..."
            type="text"
          />
          {searchQuery && (
            <button 
              onClick={() => setSearchQuery('')}
              className="absolute inset-y-0 right-4 flex items-center text-outline hover:text-on-surface"
            >
              <span className="material-symbols-outlined text-[18px]">close</span>
            </button>
          )}
        </div>

        {/* Category Chips (Horizontal Scroll) */}
        <div className="flex gap-2 overflow-x-auto no-scrollbar py-2 -mx-4 px-4 sticky top-16 bg-surface z-40">
          <button
            onClick={() => handleCategoryClick('All')}
            className={`px-4 py-2 rounded-full text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
              activeCategory === 'All'
                ? 'active-chip'
                : 'bg-surface-container border border-outline-variant hover:bg-surface-container-high'
            }`}
          >
            All
          </button>
          {initialCategories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => handleCategoryClick(cat.name)}
              className={`px-4 py-2 rounded-full text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                activeCategory === cat.name
                  ? 'active-chip'
                  : 'bg-surface-container border border-outline-variant hover:bg-surface-container-high'
              }`}
            >
              {cat.name}
            </button>
          ))}
        </div>

        {/* Featured Banner: Today's Special */}
        {!searchQuery && specialItem && (
          <section
            onClick={() => router.push(`/menu/${specialItem.id}`)}
            className="relative h-48 rounded-2xl overflow-hidden shadow-md group cursor-pointer"
          >
            <div
              className="absolute inset-0 bg-cover bg-center transition-transform duration-700 group-hover:scale-105"
              style={{
                backgroundImage: `url('${specialItem.image || 'https://images.unsplash.com/photo-1544025162-d76694265947?w=600'}')`,
              }}
            ></div>
            <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-transparent"></div>
            <div className="absolute bottom-4 left-4 right-4">
              <span className="bg-primary text-white text-[9px] uppercase font-bold px-2 py-0.5 rounded-md tracking-wider mb-2 inline-block">
                Today's Special
              </span>
              <h2 className="text-white text-lg font-bold">{specialItem.name}</h2>
              <p className="text-white/80 text-xs line-clamp-1 mt-0.5">{specialItem.description}</p>
            </div>
            <div className="absolute top-4 right-4 bg-white/20 backdrop-blur-md px-3 py-1 rounded-full text-white font-bold text-xs">
              ₹{specialItem.price.toFixed(2)}
            </div>
          </section>
        )}

        {/* Menu Grid by Categories */}
        <div className="space-y-8">
          {filteredCategories.length === 0 ? (
            <div className="text-center py-12 space-y-2">
              <span className="material-symbols-outlined text-outline text-[48px]">no_meals</span>
              <h3 className="text-base font-bold text-on-surface">No dishes found</h3>
              <p className="text-on-surface-variant text-xs max-w-[200px] mx-auto">
                We couldn't find anything matching your search. Try checking spelling or search another item.
              </p>
            </div>
          ) : (
            filteredCategories.map((category) => (
              <section key={category.id} id={`category-${category.name}`} className="space-y-3 scroll-mt-28">
                <div className="flex justify-between items-center border-b border-outline-variant/20 pb-2">
                  <h3 className="text-lg font-bold text-on-surface tracking-tight">{category.name}</h3>
                  <span className="text-xs text-on-surface-variant opacity-60 font-semibold">
                    {category.items.length} {category.items.length === 1 ? 'item' : 'items'}
                  </span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {category.items.map((item) => (
                    <div
                      key={item.id}
                      onClick={() => router.push(`/menu/${item.id}`)}
                      className="bg-surface-container-lowest rounded-2xl overflow-hidden shadow-sm border border-outline-variant/60 group hover:shadow-md transition-all cursor-pointer"
                    >
                      <div className="flex h-32">
                        {/* Food Image */}
                        <div className="w-1/3 relative bg-surface-container-low flex-shrink-0">
                          <img
                            className="h-full w-full object-cover"
                            alt={item.name}
                            src={item.image || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400'}
                          />
                          {/* Veg/Non-Veg Badge */}
                          <div className="absolute top-2 left-2 bg-white/90 rounded-md p-0.5 shadow-sm flex items-center justify-center">
                            <span
                              className={`w-3.5 h-3.5 rounded-full flex items-center justify-center border-2 ${
                                item.isVeg
                                  ? 'border-green-600 bg-green-100'
                                  : 'border-red-600 bg-red-100'
                              }`}
                            >
                              <span className={`w-1.5 h-1.5 rounded-full ${item.isVeg ? 'bg-green-600' : 'bg-red-600'}`} />
                            </span>
                          </div>
                        </div>

                        {/* Food Details */}
                        <div className="w-2/3 p-3 flex flex-col justify-between">
                          <div>
                            <div className="flex justify-between items-start gap-1">
                              <h4 className="font-semibold text-sm text-on-surface group-hover:text-primary transition-colors line-clamp-1">
                                {item.name}
                              </h4>
                              <div className="flex items-center gap-0.5 flex-shrink-0 text-amber-500">
                                <span className="material-symbols-outlined text-[14px]" style={{ fontVariationSettings: "'FILL' 1" }}>
                                  star
                                </span>
                                <span className="text-[10px] font-bold text-on-surface">4.8</span>
                              </div>
                            </div>
                            <p className="text-on-surface-variant text-xs line-clamp-2 mt-1 leading-relaxed">
                              {item.description}
                            </p>
                          </div>
                          <div className="flex justify-between items-center mt-1">
                            <span className="text-primary font-bold text-base">₹{item.price.toFixed(2)}</span>
                            <button
                              onClick={(e) => handleQuickAdd(e, item)}
                              className="bg-primary-container text-on-primary-container px-4 py-1.5 rounded-full text-xs font-bold active:scale-90 transition-transform hover:bg-primary hover:text-white cursor-pointer"
                            >
                              Add
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            ))
          )}
        </div>
      </main>

      {/* Floating Bottom Cart Bar */}
      {totalItems > 0 && (
        <div className="fixed bottom-24 left-0 right-0 w-full p-4 bg-surface/85 backdrop-blur-xl border-t border-outline-variant/30 z-40 max-w-md md:max-w-5xl mx-auto shadow-lg print:hidden">
          <button
            onClick={() => router.push('/cart')}
            className="w-full h-14 bg-primary text-on-primary rounded-xl font-bold shadow-lg shadow-primary/25 active:scale-[0.98] transition-all flex items-center justify-between px-5 cursor-pointer"
          >
            <div className="flex items-center gap-2.5">
              <span className="material-symbols-outlined text-[22px]">shopping_bag</span>
              <span className="text-sm font-semibold">{totalItems} {totalItems === 1 ? 'Item' : 'Items'}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-base font-bold">₹{totalPrice.toFixed(2)}</span>
              <span className="text-xs font-normal opacity-85">View Cart</span>
              <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
            </div>
          </button>
        </div>
      )}

      {/* BottomNavBar */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 flex justify-around items-center h-20 px-2 pb-2 bg-surface-container rounded-t-xl shadow-lg border-t border-outline-variant/30 max-w-md md:max-w-5xl mx-auto print:hidden">
        <button 
          onClick={() => handleCategoryClick('All')}
          className="flex flex-col items-center justify-center bg-primary-container text-on-primary-container rounded-full px-4 py-1.5 transition-all shadow-sm cursor-pointer"
        >
          <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>restaurant_menu</span>
          <span className="text-[10px] font-bold mt-0.5">Menu</span>
        </button>
        <button 
          onClick={() => router.push('/cart')}
          className="flex flex-col items-center justify-center text-on-surface-variant hover:bg-surface-container-high px-4 py-1 rounded-full transition-all active:scale-90 cursor-pointer"
        >
          <span className="material-symbols-outlined">shopping_cart</span>
          <span className="text-[10px] font-bold mt-0.5">Cart</span>
        </button>
        <button 
          onClick={() => {
            if (activeOrderId) {
              router.push(`/track/${activeOrderId}`);
            } else {
              setToastMessage("No active orders found to track.");
            }
          }}
          className={`flex flex-col items-center justify-center text-on-surface-variant hover:bg-surface-container-high px-4 py-1 rounded-full transition-all active:scale-90 cursor-pointer ${
            !activeOrderId ? 'opacity-40' : ''
          }`}
        >
          <span className="material-symbols-outlined">receipt_long</span>
          <span className="text-[10px] font-bold mt-0.5">Orders</span>
        </button>
        <button 
          onClick={() => router.push('/help')}
          className="flex flex-col items-center justify-center text-on-surface-variant hover:bg-surface-container-high px-4 py-1 rounded-full transition-all active:scale-90 cursor-pointer"
        >
          <span className="material-symbols-outlined">support_agent</span>
          <span className="text-[10px] font-bold mt-0.5">Help</span>
        </button>
      </nav>

      {/* Bill Invoice Modal */}
      {showBillModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm print:relative print:bg-white print:p-0 print:inset-auto print:z-0">
          <div className="bg-surface-container-lowest border border-outline-variant/30 rounded-3xl p-6 shadow-xl max-w-sm w-full text-center space-y-4 print:border-none print:shadow-none print:p-0 print:bg-white">
            
            {/* Header */}
            <div className="flex justify-between items-center pb-2 border-b border-outline-variant/20 print:border-neutral-200">
              <h3 className="text-base font-extrabold text-on-surface print:text-black">LuxeDine Table Receipt</h3>
              <button
                onClick={() => setShowBillModal(false)}
                className="text-on-surface-variant hover:text-on-surface print:hidden"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            {loadingBill ? (
              <div className="py-8 space-y-3 print:hidden">
                <div className="w-8 h-8 rounded-full border-4 border-primary border-t-transparent animate-spin mx-auto"></div>
                <p className="text-xs text-on-surface-variant">Generating your bill...</p>
              </div>
            ) : activeBillItems.length === 0 ? (
              <div className="py-8 text-center space-y-2">
                <span className="material-symbols-outlined text-outline text-[40px]">receipt_long</span>
                <p className="text-sm font-bold text-on-surface">No Active Orders</p>
                <p className="text-xs text-on-surface-variant max-w-[200px] mx-auto">
                  You haven't placed any orders for Table {tableSession?.tableNumber} yet.
                </p>
              </div>
            ) : (
              <div className="space-y-4 text-left">
                {/* Meta details */}
                <div className="text-[10px] text-on-surface-variant space-y-0.5 border-b border-dashed border-outline-variant/40 pb-2 print:text-neutral-600 print:border-neutral-200">
                  <p><strong>Table:</strong> Table {tableSession?.tableNumber}</p>
                  <p><strong>Date:</strong> {new Date().toLocaleDateString()} {new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</p>
                  <p className="font-mono"><strong>Session:</strong> {tableSession?.id.slice(-8).toUpperCase()}</p>
                </div>

                {/* Items List */}
                <div className="space-y-2 max-h-48 overflow-y-auto no-scrollbar py-1 border-b border-dashed border-outline-variant/40 print:max-h-none print:overflow-visible print:border-neutral-200 print:text-black">
                  <div className="grid grid-cols-12 text-[10px] uppercase font-bold text-on-surface-variant tracking-wider pb-1 border-b border-outline-variant/10 print:text-black">
                    <span className="col-span-7">Item</span>
                    <span className="col-span-2 text-center">Qty</span>
                    <span className="col-span-3 text-right">Total</span>
                  </div>
                  {activeBillItems.map((item, idx) => (
                    <div key={idx} className="grid grid-cols-12 text-xs font-semibold py-1 items-start text-on-surface print:text-black">
                      <div className="col-span-7 pr-2">
                        <p className="truncate font-bold">{item.menuItem.name}</p>
                        {item.notes && <p className="text-[9px] text-on-surface-variant/80 italic leading-none truncate">{item.notes}</p>}
                      </div>
                      <span className="col-span-2 text-center">{item.quantity}</span>
                      <span className="col-span-3 text-right">₹{(item.price * item.quantity).toFixed(2)}</span>
                    </div>
                  ))}
                </div>

                {/* Calculations block */}
                <div className="space-y-1 text-xs font-semibold text-on-surface-variant print:text-neutral-700">
                  <div className="flex justify-between">
                    <span>Subtotal</span>
                    <span className="text-on-surface print:text-black">₹{billSubtotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>CGST (5%)</span>
                    <span className="text-on-surface print:text-black">₹{billTax.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Service Tax (5%)</span>
                    <span className="text-on-surface print:text-black">₹{billServiceCharge.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between border-t border-outline-variant/30 pt-2 text-sm font-bold text-on-surface print:text-black print:border-neutral-200">
                    <span>Grand Total</span>
                    <span className="text-primary text-base print:text-black">₹{billTotal.toFixed(2)}</span>
                  </div>
                </div>

                {/* Printable receipt decoration */}
                <div className="hidden print:block text-center text-[10px] text-neutral-400 pt-6">
                  <p>Thank you for dining with us!</p>
                  <p>LuxeDine POS Smart Service</p>
                </div>

                {/* Interactive action buttons */}
                <div className="flex gap-2.5 pt-2 print:hidden">
                  <button
                    onClick={() => window.print()}
                    className="flex-1 h-12 border border-outline-variant text-on-surface rounded-xl font-bold active:scale-95 transition-all text-xs flex items-center justify-center gap-1.5 hover:bg-surface-container-high"
                  >
                    <span className="material-symbols-outlined text-[18px]">print</span>
                    Print Bill
                  </button>
                  <button
                    onClick={async () => {
                      // Request waiter for payment (sends standard POST to request-bill)
                      try {
                        const response = await fetch('/api/request-bill', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({
                            tableId: tableSession?.id,
                            qrToken: tableSession?.qrToken
                          })
                        });
                        if (response.ok) {
                          setToastMessage('Payment notification sent. Staff will bring the bill card.');
                          setShowBillModal(false);
                        } else {
                          alert('Failed to alert staff. Please wave to a waiter.');
                        }
                      } catch (e) {
                        console.error(e);
                        alert('Network issue alerting staff.');
                      }
                    }}
                    className="flex-[2] h-12 bg-primary text-on-primary rounded-xl font-bold shadow-lg shadow-primary/20 active:scale-95 transition-all text-xs flex items-center justify-center gap-1.5 hover:opacity-90 animate-pulse"
                  >
                    <span className="material-symbols-outlined text-[18px]">payments</span>
                    Request Checkout
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Assistance Request Modal */}
      {showAssistanceModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm print:hidden">
          <div className="bg-surface-container-lowest rounded-3xl p-6 shadow-xl max-w-xs w-full text-center space-y-4 border border-outline-variant/30">
            {assistanceSent ? (
              <>
                <div className="w-14 h-14 bg-secondary-container text-on-secondary-container rounded-full flex items-center justify-center mx-auto">
                  <span className="material-symbols-outlined text-[32px]">check_circle</span>
                </div>
                <h3 className="text-lg font-bold text-on-surface">Request Sent</h3>
                <p className="text-xs text-on-surface-variant">
                  Staff has been notified. Someone will be at Table {tableSession?.tableNumber} shortly.
                </p>
              </>
            ) : (
              <>
                <div className="w-14 h-14 bg-primary-container text-on-primary-container rounded-full flex items-center justify-center mx-auto">
                  <span className="material-symbols-outlined text-[30px]">
                    {requestType === 'waiter' ? 'spatial_audio' : 'payments'}
                  </span>
                </div>
                <h3 className="text-lg font-bold text-on-surface">
                  {requestType === 'waiter' ? 'Call Waiter Assistance?' : 'Request Final Bill?'}
                </h3>
                <p className="text-xs text-on-surface-variant leading-relaxed">
                  {requestType === 'waiter' 
                    ? `Request a waiter to come to Table ${tableSession?.tableNumber || ''} for assistance.` 
                    : `Alert staff that you are ready to receive the bill at Table ${tableSession?.tableNumber || ''}.`
                  }
                </p>
                <div className="flex gap-3 pt-2">
                  <button
                    onClick={() => setShowAssistanceModal(false)}
                    className="flex-1 py-2.5 rounded-xl border border-outline-variant text-xs font-bold hover:bg-surface-container-low cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={triggerAssistance}
                    className="flex-1 py-2.5 rounded-xl bg-primary text-on-primary text-xs font-bold hover:opacity-90 active:scale-95 transition-all cursor-pointer"
                  >
                    Confirm
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Shimmer Notification Toast */}
      {toastMessage && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 bg-inverse-surface text-inverse-on-surface px-5 py-2.5 rounded-full text-xs font-medium shadow-md transition-opacity pointer-events-none z-[60] animate-pulse print:hidden">
          {toastMessage}
        </div>
      )}
    </div>
  );
}
