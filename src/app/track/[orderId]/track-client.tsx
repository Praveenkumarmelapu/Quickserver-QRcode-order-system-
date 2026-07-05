'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useOrderStore } from '@/lib/store';
import { playNotificationSound, unlockAudio } from '@/lib/sounds';

interface MenuItem {
  id: string;
  name: string;
  price: number;
}

interface OrderItem {
  id: string;
  quantity: number;
  notes: string | null;
  price: number;
  menuItem: MenuItem;
}

interface Table {
  id: string;
  tableNumber: number;
  qrToken: string;
}

interface Order {
  id: string;
  tableId: string;
  status: 'PENDING' | 'ACCEPTED' | 'PREPARING' | 'READY' | 'SERVED' | 'COMPLETED';
  subtotal: number;
  tax: number;
  total: number;
  createdAt: string | Date;
  table: Table;
  orderItems: OrderItem[];
}

export default function TrackClient({ initialOrder }: { initialOrder: any }) {
  const router = useRouter();
  const [order, setOrder] = useState<Order>(initialOrder);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const tableSession = useOrderStore((state) => state.tableSession);
  const [selectedOrderId, setSelectedOrderId] = useState<string>(initialOrder.id);
  const [sessionOrders, setSessionOrders] = useState<Order[]>([]);

  // Fetch all orders for this table session
  useEffect(() => {
    const fetchSessionOrders = async () => {
      const tableId = tableSession?.id || order.tableId;
      if (!tableId) return;
      try {
        const res = await fetch(`/api/orders?tableId=${tableId}`);
        if (res.ok) {
          const data = await res.json();
          // Filter to show orders from this table session (placed in the last 6 hours)
          const sixHoursAgo = new Date(Date.now() - 6 * 60 * 60 * 1000);
          const recentOrders = data.filter((o: any) => new Date(o.createdAt) >= sixHoursAgo);
          setSessionOrders(recentOrders);
        }
      } catch (err) {
        console.error('Failed to fetch session orders:', err);
      }
    };
    fetchSessionOrders();
    const interval = setInterval(fetchSessionOrders, 6000); // refresh list of session orders every 6 seconds
    return () => clearInterval(interval);
  }, [tableSession?.id, order.tableId]);

  // Fetch order details when selected order changes
  useEffect(() => {
    if (selectedOrderId === order.id) return;
    const fetchSelectedOrder = async () => {
      try {
        const res = await fetch(`/api/orders/${selectedOrderId}`);
        if (res.ok) {
          const data = await res.json();
          setOrder(data);
        }
      } catch (err) {
        console.error('Failed to fetch selected order:', err);
      }
    };
    fetchSelectedOrder();
  }, [selectedOrderId, order.id]);

  const handleCallWaiter = async () => {
    const tableId = tableSession?.id || order.tableId;
    const qrToken = tableSession?.qrToken || order.table?.qrToken;
    const tableNumber = tableSession?.tableNumber || order.table?.tableNumber;

    if (!tableId || !qrToken) {
      alert('Unable to identify your table. Please scan the QR code again.');
      return;
    }

    try {
      const response = await fetch('/api/request-waiter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tableId, qrToken, requestType: 'Waiter' })
      });
      if (response.ok) {
        setToastMessage(`Staff notified. Waiter is coming to Table ${tableNumber}.`);
      } else {
        alert('Failed to contact staff. Please raise your hand for a waiter.');
      }
    } catch (e) {
      console.error(e);
      alert('Network issue contacting staff. Please call a waiter in person.');
    }
  };

  const orderStatusRef = useRef<string>(order.status);
  useEffect(() => {
    orderStatusRef.current = order.status;
  }, [order.status]);

  // Connect to SSE and polling fallback for real-time order status updates
  useEffect(() => {
    let eventSource: EventSource | null = null;
    let pollInterval: NodeJS.Timeout | null = null;

    const handleClick = () => { unlockAudio(); };
    document.addEventListener('click', handleClick, { once: false });

    const handleTouch = () => {
      unlockAudio();
    };
    document.addEventListener('touchstart', handleTouch, { once: true });

    const setupSSE = () => {
      try {
        eventSource = new EventSource('/api/live-events');

        eventSource.onmessage = (event) => {
          try {
            const parsed = JSON.parse(event.data);
            if (
              (parsed.type === 'ORDER_STATUS_UPDATED' || parsed.type === 'NEW_ORDER') &&
              parsed.data?.id === selectedOrderId
            ) {
              if (parsed.data.status !== orderStatusRef.current) {
                setOrder(parsed.data);
                // Play notification sound for status changes
                if (parsed.data.status === 'READY' || parsed.data.status === 'SERVED') {
                  playNotificationSound('orderComplete');
                } else {
                  playNotificationSound('statusUpdate');
                }
                setToastMessage(`Order status updated to: ${parsed.data.status}`);
              }
            }
          } catch (err) {
            console.error('Error parsing SSE event data:', err);
          }
        };

        eventSource.onerror = (err) => {
          console.warn('SSE connection error. Retrying...', err);
          eventSource?.close();
        };
      } catch (err) {
        console.error('SSE setup error:', err);
      }
    };

    const startPolling = () => {
      pollInterval = setInterval(async () => {
        try {
          const res = await fetch(`/api/orders/${selectedOrderId}`);
          if (res.ok) {
            const data = await res.json();
            if (data.status !== orderStatusRef.current) {
              setOrder(data);
              // Play notification sound for status changes
              if (data.status === 'READY' || data.status === 'SERVED') {
                playNotificationSound('orderComplete');
              } else {
                playNotificationSound('statusUpdate');
              }
              setToastMessage(`Order status updated to: ${data.status}`);
            }
          }
        } catch (err) {
          console.error('Polling error:', err);
        }
      }, 6000); // Poll every 6 seconds
    };

    setupSSE();
    startPolling(); // Run polling by default as fallback for serverless hosting

    return () => {
      if (eventSource) eventSource.close();
      if (pollInterval) clearInterval(pollInterval);
      document.removeEventListener('click', handleClick);
    };
  }, [selectedOrderId]);

  // Toast timer
  useEffect(() => {
    if (toastMessage) {
      const timer = setTimeout(() => setToastMessage(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [toastMessage]);

  const handleBackToMenu = () => {
    if (tableSession) {
      router.push(`/menu?table=${tableSession.tableNumber}&token=${tableSession.qrToken}`);
    } else if (order.table) {
      router.push(`/menu?table=${order.table.tableNumber}&token=${order.table.qrToken}`);
    } else {
      router.push('/menu');
    }
  };

  // Helper to map status to timeline values
  const getStatusProgress = (status: Order['status']) => {
    switch (status) {
      case 'PENDING': return { percent: '10%', index: 0 };
      case 'ACCEPTED': return { percent: '35%', index: 1 };
      case 'PREPARING': return { percent: '60%', index: 2 };
      case 'READY': return { percent: '85%', index: 3 };
      case 'SERVED':
      case 'COMPLETED': return { percent: '100%', index: 4 };
      default: return { percent: '0%', index: -1 };
    }
  };

  const { percent: progressHeight, index: activeIndex } = getStatusProgress(order.status);

  // Status descriptive labels
  const steps = [
    { title: 'Order Placed', desc: 'Received and awaiting kitchen response', icon: 'check_circle' },
    { title: 'Order Accepted', desc: 'Chef confirmed and starting prep', icon: 'thumb_up' },
    { title: 'Preparing Food', desc: 'Crafting your gourmet meal with care', icon: 'restaurant' },
    { title: 'Ready for Service', desc: 'Finished and ready for table delivery', icon: 'room_service' },
    { title: 'Served & Enjoyed', desc: 'Deliciously served. Enjoy your meal!', icon: 'flatware' }
  ];

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
        <h1 className="text-lg font-bold text-on-surface ml-2">Track Order</h1>
        <span className="text-[10px] uppercase font-bold tracking-wider bg-secondary-container text-on-secondary-container px-2.5 py-0.5 rounded-full ml-auto">
          Table {order.table?.tableNumber || ''}
        </span>
      </header>

      {/* Main Content */}
      <main className="pt-20 px-4 max-w-md md:max-w-5xl mx-auto w-full flex flex-col md:flex-row gap-6 items-start">
        
        {/* Left Column - Progress stepper and helper buttons */}
        <div className="flex-1 w-full space-y-6">
          
          {/* Status Header */}
          <section className="bg-surface-container-lowest border border-outline-variant/20 p-5 rounded-2xl shadow-sm space-y-3 mt-2">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-on-surface">Order #LD-{order.id.slice(-6).toUpperCase()}</h2>
                <p className="text-[11px] text-on-surface-variant/80">
                  Placed on {new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
              <span className={`px-3.5 py-1 text-[10px] font-bold tracking-wider uppercase rounded-full flex items-center gap-1.5 ${
                order.status === 'PENDING' ? 'bg-amber-100 text-amber-800' :
                order.status === 'ACCEPTED' ? 'bg-blue-100 text-blue-800' :
                order.status === 'PREPARING' ? 'bg-orange-100 text-orange-800 animate-pulse' :
                order.status === 'READY' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
              }`}>
                <span className={`w-1.5 h-1.5 rounded-full ${
                  order.status === 'PENDING' ? 'bg-amber-600' :
                  order.status === 'ACCEPTED' ? 'bg-blue-600' :
                  order.status === 'PREPARING' ? 'bg-orange-600 animate-ping' :
                  order.status === 'READY' ? 'bg-green-600' : 'bg-gray-600'
                }`}></span>
                {order.status}
              </span>
            </div>

            <div className="text-xs text-on-surface-variant font-medium pt-1">
              {order.status === 'PENDING' && <span>Awaiting chef confirmation...</span>}
              {order.status === 'ACCEPTED' && <span>Your order is accepted. Preparation will start soon.</span>}
              {order.status === 'PREPARING' && <span>Kitchen is preparing your dishes. Est: <strong className="text-primary">10-15 mins</strong></span>}
              {order.status === 'READY' && <span className="text-secondary">Your food is ready! The server is bringing it to your table.</span>}
              {(order.status === 'SERVED' || order.status === 'COMPLETED') && <span className="text-secondary">Enjoy your meal! Let us know if you need anything else.</span>}
            </div>
          </section>

          {/* Timeline (Stitch design system) */}
          <section className="bg-surface-container-lowest rounded-2xl p-6 shadow-sm border border-outline-variant/30 relative">
            <div className="flex flex-col gap-8 relative">
              {/* Vertical Progress Line */}
              <div className="absolute left-[15px] top-4 bottom-4 w-[3px] bg-surface-container-highest rounded-full overflow-hidden">
                <div 
                  className="absolute top-0 left-0 w-full bg-primary transition-all duration-1000 ease-out" 
                  style={{ height: progressHeight }}
                ></div>
              </div>

              {/* Steps Mapping */}
              {steps.map((step, idx) => {
                const isCompleted = idx < activeIndex;
                const isActive = idx === activeIndex;
                const isUpcoming = idx > activeIndex;

                return (
                  <div key={idx} className={`flex items-start gap-4 transition-all duration-300 ${isUpcoming ? 'opacity-45' : 'opacity-100'}`}>
                    {/* Step bubble icon */}
                    <div className={`z-10 w-8 h-8 rounded-full flex items-center justify-center transition-all ${
                      isCompleted ? 'bg-primary text-on-primary shadow-sm' :
                      isActive ? 'bg-primary-container text-on-primary-container border-4 border-white shadow-md animate-pulse' :
                      'bg-surface-container-highest text-on-surface-variant'
                    }`}>
                      <span className="material-symbols-outlined text-[16px]" style={{ fontVariationSettings: isCompleted || isActive ? "'FILL' 1" : undefined }}>
                        {isCompleted ? 'check_circle' : step.icon}
                      </span>
                    </div>

                    {/* Step text info */}
                    <div className="flex-1 space-y-0.5 pt-0.5">
                      <h3 className={`text-sm font-bold tracking-tight ${isActive ? 'text-primary' : 'text-on-surface'}`}>
                        {step.title}
                      </h3>
                      <p className="text-[11px] text-on-surface-variant font-medium">
                        {step.desc}
                      </p>

                      {/* Preparation detail sub-progress bar */}
                      {isActive && idx === 2 && (
                        <div className="mt-2 h-1.5 w-full bg-surface-container-high rounded-full overflow-hidden">
                          <div className="h-full bg-primary-container bg-opacity-70 animate-pulse bg-[linear-gradient(45deg,rgba(255,255,255,0.15)_25%,transparent_25%,transparent_50%,rgba(255,255,255,0.15)_50%,rgba(255,255,255,0.15)_75%,transparent_75%,transparent)] bg-[length:1rem_1rem]" style={{ width: '65%' }}></div>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          {/* Support Buttons */}
          <button
            onClick={handleCallWaiter}
            className="w-full h-14 bg-surface-container border border-outline-variant text-on-surface rounded-xl font-bold active:scale-[0.98] transition-all flex items-center justify-center gap-2 hover:bg-surface-container-high cursor-pointer border-outline-variant/35 shadow-sm"
          >
            <span className="material-symbols-outlined text-[20px]">support_agent</span>
            <span>Call Waiter to Table</span>
          </button>
        </div>

        {/* Right Column - Order Items summary & Session Orders list */}
        <div className="w-full md:w-80 space-y-5 flex-shrink-0 md:sticky md:top-24">
          {sessionOrders.length > 1 && (
            <div className="space-y-2">
              <h3 className="text-sm font-bold text-on-surface uppercase tracking-wider px-1">Your Orders (Select to track)</h3>
              <div className="flex flex-col gap-2">
                {sessionOrders.map((o) => {
                  const isSelected = o.id === selectedOrderId;
                  return (
                    <button
                      key={o.id}
                      onClick={() => setSelectedOrderId(o.id)}
                      className={`w-full text-left p-3.5 rounded-2xl border text-xs flex flex-col gap-1.5 transition-all active:scale-[0.98] cursor-pointer shadow-sm ${
                        isSelected
                          ? 'border-primary bg-primary/5 text-primary'
                          : 'border-outline-variant/30 bg-surface-container-lowest text-on-surface hover:bg-surface-container-low'
                      }`}
                    >
                      <div className="flex justify-between items-center w-full">
                        <span className="font-extrabold text-[12px]">#LD-{o.id.slice(-6).toUpperCase()}</span>
                        <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider ${
                          o.status === 'PENDING' ? 'bg-amber-100 text-amber-800' :
                          o.status === 'ACCEPTED' ? 'bg-blue-100 text-blue-800' :
                          o.status === 'PREPARING' ? 'bg-orange-100 text-orange-800' :
                          o.status === 'READY' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                        }`}>
                          {o.status}
                        </span>
                      </div>
                      <div className="flex justify-between items-center text-[10px] text-on-surface-variant font-medium">
                        <span>{new Date(o.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        <span className="font-extrabold text-primary">₹{o.total.toFixed(2)}</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          <h3 className="text-sm font-bold text-on-surface uppercase tracking-wider px-1">Order Details</h3>
          <div className="bg-surface-container-lowest rounded-2xl border border-outline-variant/35 overflow-hidden shadow-sm">
            <div className="divide-y divide-outline-variant/20">
              {order.orderItems.map((item) => (
                <div key={item.id} className="p-4 flex gap-3 items-center">
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-center">
                      <h4 className="text-sm font-bold text-on-surface truncate">{item.menuItem.name}</h4>
                      <span className="text-xs font-semibold text-on-surface-variant">{item.quantity}x</span>
                    </div>
                    {item.notes && (
                      <p className="text-[11px] text-on-surface-variant/75 italic mt-1 leading-relaxed">
                        Note: {item.notes}
                      </p>
                    )}
                  </div>
                  <span className="text-sm font-bold text-primary ml-auto">₹{(item.price * item.quantity).toFixed(2)}</span>
                </div>
              ))}
            </div>

            <div className="p-4 bg-surface-container-low border-t border-outline-variant/25 space-y-1.5 text-xs font-semibold text-on-surface-variant">
              <div className="flex justify-between">
                <span>Subtotal</span>
                <span className="text-on-surface">₹{order.subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span>Taxes & Fees</span>
                <span className="text-on-surface">₹{order.tax.toFixed(2)}</span>
              </div>
              <div className="flex justify-between border-t border-outline-variant/30 pt-2 text-sm font-bold text-on-surface">
                <span>Paid Total</span>
                <span className="text-primary">₹{order.total.toFixed(2)}</span>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* BottomNavBar */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 flex justify-around items-center h-20 px-2 pb-2 bg-surface-container rounded-t-xl shadow-lg border-t border-outline-variant/30 max-w-md md:max-w-5xl mx-auto">
        <button 
          onClick={handleBackToMenu}
          className="flex flex-col items-center justify-center text-on-surface-variant hover:bg-surface-container-high px-4 py-1 rounded-full transition-all active:scale-90 cursor-pointer"
        >
          <span className="material-symbols-outlined">restaurant_menu</span>
          <span className="text-[10px] font-bold mt-0.5">Menu</span>
        </button>
        <button 
          onClick={() => router.push('/cart')}
          className="flex flex-col items-center justify-center text-on-surface-variant hover:bg-surface-container-high px-4 py-1 rounded-full transition-all active:scale-90 cursor-pointer"
        >
          <span className="material-symbols-outlined">shopping_cart</span>
          <span className="text-[10px] font-bold mt-0.5">Cart</span>
        </button>
        <div 
          className="flex flex-col items-center justify-center bg-primary-container text-on-primary-container rounded-full px-4 py-1.5 transition-all shadow-sm"
        >
          <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>receipt_long</span>
          <span className="text-[10px] font-bold mt-0.5">Orders</span>
        </div>
        <button 
          onClick={() => router.push('/help')}
          className="flex flex-col items-center justify-center text-on-surface-variant hover:bg-surface-container-high px-4 py-1 rounded-full transition-all active:scale-90 cursor-pointer"
        >
          <span className="material-symbols-outlined">support_agent</span>
          <span className="text-[10px] font-bold mt-0.5">Help</span>
        </button>
      </nav>

      {/* Floating Status Notification Toast */}
      {toastMessage && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 bg-inverse-surface text-inverse-on-surface px-5 py-3 rounded-full text-xs font-semibold shadow-lg z-[100] animate-bounce">
          {toastMessage}
        </div>
      )}
    </div>
  );
}
