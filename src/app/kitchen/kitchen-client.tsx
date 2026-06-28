'use client';

import { useState, useEffect } from 'react';
import { signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';

interface MenuItem {
  name: string;
  isVeg: boolean;
}

interface OrderItem {
  id: string;
  quantity: number;
  notes: string | null;
  price: number;
  menuItem: MenuItem;
}

interface Table {
  tableNumber: number;
}

interface Order {
  id: string;
  status: 'PENDING' | 'ACCEPTED' | 'PREPARING' | 'READY' | 'SERVED' | 'COMPLETED';
  subtotal: number;
  tax: number;
  total: number;
  createdAt: string;
  table: Table;
  orderItems: OrderItem[];
}

interface KitchenClientProps {
  initialOrders: any[];
  user: any;
}

export default function KitchenClient({ initialOrders, user }: KitchenClientProps) {
  const router = useRouter();
  const [orders, setOrders] = useState<Order[]>(initialOrders);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [mobileTab, setMobileTab] = useState<'new' | 'preparing' | 'ready'>('new');
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Sync active orders when coming to foreground or on manual sync
  const syncActiveOrders = async () => {
    try {
      const res = await fetch('/api/orders?active=true');
      if (res.ok) {
        const data = await res.json();
        // Kitchen wants oldest orders first (asc by createdAt)
        const sorted = data.sort((a: any, b: any) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
        setOrders(sorted);
      }
    } catch (err) {
      console.error('Failed to sync active kitchen orders:', err);
    }
  };

  // Unlock audio on first user interaction, request notification permission, and set up live-event listener
  useEffect(() => {
    let playSound: any = null;
    import('@/lib/sounds').then((mod) => {
      playSound = mod.playNotificationSound;
      // Unlock audio context on any user click
      const handleClick = () => { mod.unlockAudio(); };
      document.addEventListener('click', handleClick, { once: false });
      return () => document.removeEventListener('click', handleClick);
    });

    // Also unlock on first touch (mobile)
    const handleTouch = () => {
      import('@/lib/sounds').then((mod) => mod.unlockAudio());
    };
    document.addEventListener('touchstart', handleTouch, { once: true });

    // Request notification permission for background tab support
    if (typeof window !== 'undefined' && 'Notification' in window) {
      if (Notification.permission === 'default') {
        Notification.requestPermission();
      }
    }

    let eventSource: EventSource | null = null;
    let reconnectTimeout: NodeJS.Timeout | null = null;

    const connectSSE = () => {
      if (eventSource) eventSource.close();
      
      eventSource = new EventSource('/api/live-events');

      eventSource.onmessage = (event) => {
        try {
          const parsed = JSON.parse(event.data);
          const { type, data } = parsed;

          if (type === 'NEW_ORDER') {
            setOrders((prev) => {
              if (prev.some((o) => o.id === data.id)) return prev;
              return [...prev, data];
            });
            setToastMessage(`🔔 New Order Received — Table ${data.table.tableNumber}!`);
            setMobileTab('new');

            // Send native browser notification (handles background state)
            if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
              const itemSummary = data.orderItems.map((item: any) => `${item.quantity}x ${item.menuItem.name}`).join(', ');
              new Notification(`🔔 New Order — Table ${data.table.tableNumber}`, {
                body: itemSummary,
                icon: '/favicon.ico',
                tag: `order-${data.id}`
              });
            }
          } else if (type === 'ORDER_STATUS_UPDATED') {
            // Play sound if order reverted back to pending (kitchen needs to know)
            if (data.status === 'PENDING' && playSound) {
              playSound('statusUpdate');
            }
            setOrders((prev) => {
              if (data.status === 'COMPLETED') {
                return prev.filter((o) => o.id !== data.id);
              }
              return prev.map((o) => (o.id === data.id ? data : o));
            });
          }
        } catch (err) {
          console.error('Error parsing kitchen SSE event:', err);
        }
      };

      eventSource.onerror = () => {
        console.warn('SSE disconnected. Reconnecting in 3s...');
        if (eventSource) eventSource.close();
        if (reconnectTimeout) clearTimeout(reconnectTimeout);
        reconnectTimeout = setTimeout(connectSSE, 3000);
      };
    };

    connectSSE();

    // Re-sync and reconnect when browser tab visibility changes (returns to foreground)
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        syncActiveOrders();
        connectSSE();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      if (eventSource) eventSource.close();
      if (reconnectTimeout) clearTimeout(reconnectTimeout);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  // Repeating chime for pending orders (Zomato/Swiggy style alert until accepted)
  useEffect(() => {
    const hasPendingOrders = orders.some(o => o.status === 'PENDING');
    if (!hasPendingOrders) return;

    let playSound: any = null;
    let soundInterval: NodeJS.Timeout | null = null;

    import('@/lib/sounds').then((mod) => {
      playSound = mod.playNotificationSound;
      
      // Play immediately
      playSound('newOrder');
      
      // Repeat every 4 seconds
      soundInterval = setInterval(() => {
        playSound('newOrder');
      }, 4000);
    });

    return () => {
      if (soundInterval) clearInterval(soundInterval);
    };
  }, [orders]);

  // Toast timer
  useEffect(() => {
    if (toastMessage) {
      const timer = setTimeout(() => setToastMessage(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [toastMessage]);

  const handleUpdateStatus = async (orderId: string, newStatus: string) => {
    try {
      const res = await fetch(`/api/orders/${orderId}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: newStatus }),
      });

      if (!res.ok) {
        throw new Error('Failed to update status');
      }
      
      const updated = await res.json();
      setOrders((prev) => {
        if (newStatus === 'COMPLETED') {
          return prev.filter((o) => o.id !== orderId);
        }
        return prev.map((o) => (o.id === orderId ? updated : o));
      });
      setToastMessage(`Order status updated to: ${newStatus}`);
    } catch (err) {
      console.error(err);
      alert('Failed to update status. Please try again.');
    }
  };

  const handleLogout = async () => {
    await signOut({ callbackUrl: '/auth/login' });
  };

  // Helper to compute minutes ago
  const getMinutesAgo = (createdAtStr: string) => {
    const elapsedMs = Date.now() - new Date(createdAtStr).getTime();
    const minutes = Math.floor(elapsedMs / 60000);
    if (minutes <= 0) return 'Just now';
    return `${minutes}m ago`;
  };

  // Columns segmentation
  const newOrders = orders.filter((o) => o.status === 'PENDING');
  const preparingOrders = orders.filter((o) => o.status === 'ACCEPTED' || o.status === 'PREPARING');
  const readyOrders = orders.filter((o) => o.status === 'READY' || o.status === 'SERVED');

  // Reusable Order Card component
  const renderOrderCard = (order: Order, column: 'new' | 'preparing' | 'ready') => (
    <div
      key={order.id}
      className={`bg-neutral-900 border p-4 rounded-2xl shadow-lg space-y-3 transition-all ${
        column === 'preparing'
          ? 'border-l-4 border-l-primary-container border-y border-r border-neutral-800 relative overflow-hidden'
          : 'border-neutral-800 hover:border-primary-container/30'
      }`}
    >
      {/* Cooking pulse bar for preparing */}
      {column === 'preparing' && (
        <div className="absolute top-0 left-0 w-full h-[2px] bg-neutral-800">
          <div className="h-full bg-primary-container animate-pulse" style={{ width: '65%' }}></div>
        </div>
      )}

      <div className={`flex justify-between items-start ${column === 'preparing' ? 'pt-1' : ''}`}>
        <div>
          <h4 className="text-base font-extrabold text-white">Table {order.table.tableNumber}</h4>
          <p className="text-[10px] text-neutral-500 font-bold uppercase tracking-wider mt-0.5">
            Order #LD-{order.id.slice(-6).toUpperCase()}
          </p>
        </div>
        <div className="text-right">
          {column === 'preparing' ? (
            <div className="flex items-center gap-1 text-primary-container font-extrabold text-xs">
              <span className="material-symbols-outlined text-[14px] animate-spin">progress_activity</span>
              <span>{getMinutesAgo(order.createdAt)}</span>
            </div>
          ) : column === 'ready' ? (
            <span className="text-neutral-400 text-xs font-semibold">Ready</span>
          ) : (
            <span className="text-primary-container font-extrabold text-xs block">
              {getMinutesAgo(order.createdAt)}
            </span>
          )}
        </div>
      </div>

      <div className="space-y-1.5 border-t border-b border-neutral-800 py-2 text-xs text-neutral-200">
        {order.orderItems.map((item) => (
          <div key={item.id} className="flex justify-between items-start gap-2">
            <span className="font-bold text-white">{item.quantity}x {item.menuItem.name}</span>
            {item.notes && (
              <span className="text-[10px] text-amber-400 italic bg-amber-400/5 px-1.5 py-0.5 rounded text-right max-w-[150px] truncate">
                {item.notes}
              </span>
            )}
          </div>
        ))}
      </div>

      {/* Action Buttons */}
      {column === 'new' && (
        <button
          onClick={() => handleUpdateStatus(order.id, 'ACCEPTED')}
          className="w-full h-10 bg-primary-container text-on-primary-container rounded-xl text-xs font-bold hover:brightness-105 active:scale-[0.98] transition-all cursor-pointer flex items-center justify-center gap-1.5"
        >
          <span className="material-symbols-outlined text-[16px]">check_circle</span>
          <span>Accept Order</span>
        </button>
      )}
      {column === 'preparing' && (
        <div className="flex gap-2">
          <button
            onClick={() => handleUpdateStatus(order.id, 'PENDING')}
            className="flex-1 h-9 bg-neutral-800 hover:bg-neutral-750 text-neutral-300 rounded-xl text-[10px] font-bold transition-all cursor-pointer"
          >
            Revert
          </button>
          {order.status === 'ACCEPTED' ? (
            <button
              onClick={() => handleUpdateStatus(order.id, 'PREPARING')}
              className="flex-[2] h-9 bg-primary-container text-on-primary-container rounded-xl text-xs font-bold hover:brightness-105 active:scale-[0.98] transition-all cursor-pointer flex items-center justify-center gap-1.5"
            >
              <span className="material-symbols-outlined text-[16px]">restaurant</span>
              <span>Start Preparing</span>
            </button>
          ) : (
            <button
              onClick={() => handleUpdateStatus(order.id, 'READY')}
              className="flex-[2] h-9 bg-emerald-600 text-white rounded-xl text-xs font-bold hover:bg-emerald-500 active:scale-[0.98] transition-all cursor-pointer flex items-center justify-center gap-1"
            >
              <span className="material-symbols-outlined text-[16px]">check_circle</span>
              <span>Mark Ready</span>
            </button>
          )}
        </div>
      )}
      {column === 'ready' && (
        <div className="flex gap-2">
          <button
            onClick={() => handleUpdateStatus(order.id, 'PREPARING')}
            className="flex-1 h-9 bg-neutral-800 hover:bg-neutral-750 text-neutral-300 rounded-xl text-[10px] font-bold transition-all cursor-pointer"
          >
            Re-prep
          </button>
          <button
            onClick={() => handleUpdateStatus(order.id, 'COMPLETED')}
            className="flex-[2] h-9 bg-neutral-100 text-neutral-950 rounded-xl text-xs font-extrabold hover:bg-neutral-200 active:scale-[0.98] transition-all cursor-pointer flex items-center justify-center gap-1"
          >
            <span className="material-symbols-outlined text-[16px] font-bold">done_all</span>
            <span>Complete Order</span>
          </button>
        </div>
      )}
    </div>
  );

  const renderColumn = (title: string, icon: string, dotColor: string, orderList: Order[], columnType: 'new' | 'preparing' | 'ready', emptyIcon: string, emptyText: string) => (
    <div className="flex flex-col bg-neutral-950/40 rounded-3xl p-4 border border-neutral-800/60 overflow-hidden h-full">
      <div className="flex items-center justify-between mb-4 pb-2 border-b border-neutral-800">
        <div className="flex items-center gap-2">
          {columnType === 'new' ? (
            <>
              <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-ping"></span>
              <span className="w-2.5 h-2.5 rounded-full bg-red-500 absolute"></span>
            </>
          ) : (
            <span className={`w-2.5 h-2.5 rounded-full ${dotColor}`}></span>
          )}
          <h3 className="font-bold text-sm tracking-tight text-white ml-1">{title}</h3>
        </div>
        <span className="bg-neutral-800 text-neutral-300 px-2 py-0.5 rounded-md text-[10px] font-bold">
          {orderList.length}
        </span>
      </div>

      <div className="flex-1 overflow-y-auto no-scrollbar space-y-4 pb-6">
        {orderList.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center text-neutral-500 space-y-2">
            <span className="material-symbols-outlined text-[36px]">{emptyIcon}</span>
            <p className="text-xs font-medium">{emptyText}</p>
          </div>
        ) : (
          orderList.map((order) => renderOrderCard(order, columnType))
        )}
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-neutral-900 text-neutral-100 font-sans flex overflow-hidden">
      {/* Mobile Overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/60 z-40 md:hidden" onClick={() => setSidebarOpen(false)}></div>
      )}

      {/* Sidebar Navigation - hidden on mobile, collapsible via hamburger */}
      <aside className={`
        fixed md:relative z-50 w-64 bg-neutral-950 border-r border-neutral-800 flex flex-col py-6 shrink-0 h-full
        transition-transform duration-300
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0
      `}>
        <div className="px-6 mb-8">
          <div className="flex items-center gap-2 mb-4">
            <span className="material-symbols-outlined text-[32px] text-primary-container" style={{ fontVariationSettings: "'FILL' 1" }}>
              restaurant
            </span>
            <span className="text-xl font-extrabold text-white tracking-tight">LuxeDine</span>
          </div>
          
          <div className="mt-4 flex items-center gap-3 bg-neutral-900/60 p-3 rounded-2xl border border-neutral-800/80">
            <div className="w-10 h-10 rounded-full bg-primary-container text-on-primary-container font-extrabold flex items-center justify-center shadow-inner">
              {user?.name?.slice(0, 2).toUpperCase() || 'KT'}
            </div>
            <div>
              <p className="text-xs font-bold text-neutral-100 line-clamp-1">{user?.name || 'Kitchen Staff'}</p>
              <p className="text-[10px] text-neutral-400 font-medium uppercase tracking-wider">{user?.role || 'KITCHEN'}</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 space-y-1">
          {user?.role === 'ADMIN' && (
            <button
              onClick={() => router.push('/admin/dashboard')}
              className="w-full flex items-center gap-3 text-neutral-400 px-6 py-3 hover:bg-neutral-800/40 hover:text-white transition-all cursor-pointer font-semibold text-sm text-left"
            >
              <span className="material-symbols-outlined text-[20px]">dashboard</span>
              <span>Admin Dashboard</span>
            </button>
          )}
          
          <button
            onClick={() => { router.push('/kitchen'); setSidebarOpen(false); }}
            className="w-full flex items-center gap-3 bg-primary-container/10 border-l-4 border-primary-container text-white px-5 py-3 transition-all cursor-pointer font-bold text-sm text-left"
          >
            <span className="material-symbols-outlined text-[20px] text-primary-container" style={{ fontVariationSettings: "'FILL' 1" }}>
              pending_actions
            </span>
            <span>Live Kitchen Board</span>
          </button>
        </nav>

        <div className="mt-auto px-4 space-y-4">
          <div className="p-4 bg-neutral-900 rounded-xl flex items-center justify-between border border-neutral-800">
            <div>
              <p className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider">Kitchen Status</p>
              <p className="text-emerald-400 text-xs font-bold uppercase mt-0.5">Online</p>
            </div>
            <div className="w-3 h-3 rounded-full bg-emerald-500 animate-pulse"></div>
          </div>

          <button
            onClick={handleLogout}
            className="w-full h-11 bg-neutral-800 hover:bg-red-950 hover:text-red-300 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer border border-neutral-700/50"
          >
            <span className="material-symbols-outlined text-[16px]">logout</span>
            <span>Logout Staff</span>
          </button>
        </div>
      </aside>

      {/* Main Board view */}
      <main className="flex-1 p-3 md:p-6 flex flex-col overflow-hidden bg-neutral-900 min-w-0">
        {/* Header */}
        <header className="flex justify-between items-center mb-4 md:mb-6 gap-3">
          {/* Mobile hamburger */}
          <button
            onClick={() => setSidebarOpen(true)}
            className="md:hidden w-10 h-10 bg-neutral-800 rounded-xl flex items-center justify-center text-neutral-300 border border-neutral-700/50 shrink-0"
          >
            <span className="material-symbols-outlined">menu</span>
          </button>

          <div className="min-w-0">
            <h2 className="text-lg md:text-2xl font-bold text-white tracking-tight truncate">Kitchen Live Orders</h2>
            <p className="text-[10px] md:text-xs text-neutral-400 mt-0.5 font-medium">
              Managing {orders.length} active orders
            </p>
          </div>
          <div className="flex gap-2 md:gap-3 shrink-0">
            <button
              onClick={() => router.refresh()}
              className="bg-neutral-800 hover:bg-neutral-700 text-white px-3 md:px-4 py-2 md:py-2.5 rounded-xl flex items-center gap-1.5 md:gap-2 text-[10px] md:text-xs font-bold transition-all border border-neutral-700/50 cursor-pointer"
            >
              <span className="material-symbols-outlined text-[16px] md:text-[18px]">refresh</span>
              <span className="hidden sm:inline">Sync</span>
            </button>
            <div className="bg-primary-container text-on-primary-container px-3 md:px-4 py-2 md:py-2.5 rounded-xl font-extrabold text-[10px] md:text-xs flex items-center gap-1.5 md:gap-2 shadow-lg">
              <span className="material-symbols-outlined text-[16px] md:text-[18px]" style={{ fontVariationSettings: "'FILL' 1" }}>timer</span>
              <span className="hidden sm:inline">Average Wait: 12m</span>
              <span className="sm:hidden">12m</span>
            </div>
          </div>
        </header>

        {/* Mobile Tab Selector - visible only on small screens */}
        <div className="flex md:hidden gap-2 mb-4 overflow-x-auto no-scrollbar pb-1">
          <button
            onClick={() => setMobileTab('new')}
            className={`kitchen-tab ${mobileTab === 'new' ? 'kitchen-tab-active' : 'kitchen-tab-inactive'} flex items-center gap-1.5`}
          >
            <span className="w-2 h-2 rounded-full bg-red-500"></span>
            New ({newOrders.length})
          </button>
          <button
            onClick={() => setMobileTab('preparing')}
            className={`kitchen-tab ${mobileTab === 'preparing' ? 'kitchen-tab-active' : 'kitchen-tab-inactive'} flex items-center gap-1.5`}
          >
            <span className="w-2 h-2 rounded-full bg-amber-500"></span>
            Cooking ({preparingOrders.length})
          </button>
          <button
            onClick={() => setMobileTab('ready')}
            className={`kitchen-tab ${mobileTab === 'ready' ? 'kitchen-tab-active' : 'kitchen-tab-inactive'} flex items-center gap-1.5`}
          >
            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
            Ready ({readyOrders.length})
          </button>
        </div>

        {/* Desktop: Kanban Board Grid (3 columns) */}
        <div className="hidden md:grid grid-cols-3 gap-6 flex-1 overflow-hidden">
          {renderColumn('New Orders', 'receipt', 'bg-red-500', newOrders, 'new', 'receipt', 'No pending orders')}
          {renderColumn('Preparing', 'soup_kitchen', 'bg-amber-500 animate-pulse', preparingOrders, 'preparing', 'soup_kitchen', 'Nothing cooking right now')}
          {renderColumn('Ready for Pickup', 'check_circle', 'bg-emerald-500', readyOrders, 'ready', 'check_circle', 'No dishes waiting service')}
        </div>

        {/* Mobile: Single Column View (tab-switched) */}
        <div className="md:hidden flex-1 overflow-hidden">
          {mobileTab === 'new' && renderColumn('New Orders', 'receipt', 'bg-red-500', newOrders, 'new', 'receipt', 'No pending orders')}
          {mobileTab === 'preparing' && renderColumn('Preparing', 'soup_kitchen', 'bg-amber-500 animate-pulse', preparingOrders, 'preparing', 'soup_kitchen', 'Nothing cooking right now')}
          {mobileTab === 'ready' && renderColumn('Ready for Pickup', 'check_circle', 'bg-emerald-500', readyOrders, 'ready', 'check_circle', 'No dishes waiting service')}
        </div>
      </main>

      {/* Floating Status Notification Toast */}
      {toastMessage && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 md:left-auto md:translate-x-0 md:right-6 bg-emerald-500 text-white px-5 py-3 rounded-2xl text-xs font-bold shadow-xl z-50 animate-bounce max-w-[90vw] text-center">
          {toastMessage}
        </div>
      )}
    </div>
  );
}
