'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { playNotificationSound, unlockAudio } from '@/lib/sounds';

interface Table {
  id: string;
  tableNumber: number;
  capacity: number;
  status: string;
  qrToken: string;
}

interface OrderItem {
  id: string;
  quantity: number;
  price: number;
  menuItem: {
    id: string;
    name: string;
    image: string | null;
  };
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

interface WaiterRequest {
  id: string;
  tableId: string;
  type: 'ASSISTANCE' | 'BILL';
  resolved: boolean;
  createdAt: string;
  table: Table;
}

interface DashboardClientProps {
  initialOrders: any[];
  initialTables: any[];
  initialRequests: any[];
}

export default function DashboardClient({
  initialOrders,
  initialTables,
  initialRequests,
}: DashboardClientProps) {
  const router = useRouter();

  // Component State
  const [orders, setOrders] = useState<Order[]>(initialOrders);
  const [tables, setTables] = useState<Table[]>(initialTables);
  const [requests, setRequests] = useState<WaiterRequest[]>(initialRequests);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [salesPeriod, setSalesPeriod] = useState<'today' | 'weekly'>('today');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [modalType, setModalType] = useState<'revenue' | 'orders' | 'tables' | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterPeriod, setFilterPeriod] = useState<'today' | 'weekly' | 'monthly' | 'custom' | 'all'>('all');
  const [customStartDate, setCustomStartDate] = useState<string>('');
  const [customEndDate, setCustomEndDate] = useState<string>('');

  const ordersRef = useRef<Order[]>(orders);
  const requestsRef = useRef<WaiterRequest[]>(requests);

  useEffect(() => {
    ordersRef.current = orders;
  }, [orders]);

  useEffect(() => {
    requestsRef.current = requests;
  }, [requests]);

  const handleOpenHistoryModal = (type: 'revenue' | 'orders' | 'tables') => {
    setModalType(type);
    setSearchQuery('');
    setFilterPeriod('all');
    setCustomStartDate('');
    setCustomEndDate('');
  };

  const handleCloseHistoryModal = () => {
    setModalType(null);
  };

  const downloadRevenueCSV = (period: 'today' | 'weekly' | 'monthly' | 'custom' | 'all') => {
    const now = new Date();
    const filtered = completedOrders.filter(order => {
      const date = new Date(order.createdAt);
      if (period === 'today') {
        return date.toDateString() === now.toDateString();
      }
      if (period === 'weekly') {
        const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        return date >= oneWeekAgo;
      }
      if (period === 'monthly') {
        const oneMonthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        return date >= oneMonthAgo;
      }
      if (period === 'custom') {
        if (customStartDate) {
          const start = new Date(customStartDate);
          start.setHours(0, 0, 0, 0);
          if (date < start) return false;
        }
        if (customEndDate) {
          const end = new Date(customEndDate);
          end.setHours(23, 59, 59, 999);
          if (date > end) return false;
        }
      }
      return true; // all
    });

    const csvHeaders = ['Order ID', 'Table Number', 'Date', 'Time', 'Items Ordered', 'Total Amount (INR)'];
    const csvRows = filtered.map(order => {
      const orderDate = new Date(order.createdAt);
      const formattedDate = orderDate.toLocaleDateString(undefined, { dateStyle: 'medium' });
      const formattedTime = orderDate.toLocaleTimeString(undefined, { timeStyle: 'short' });
      const itemsList = order.orderItems.map(item => `${item.quantity}x ${item.menuItem.name}`).join('; ');
      
      return [
        `LD-${order.id.slice(-6).toUpperCase()}`,
        `Table ${order.table.tableNumber}`,
        formattedDate,
        formattedTime,
        `"${itemsList}"`,
        order.total.toFixed(2)
      ];
    });

    const csvContent = [
      csvHeaders.join(','),
      ...csvRows.map(row => row.join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `LuxeDine_Revenue_${period}_${now.toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Calculations
  const completedOrders = orders.filter((o) => o.status === 'COMPLETED');
  const revenue = completedOrders.reduce((acc, o) => acc + o.total, 0);
  
  const activeOrdersCount = orders.filter(
    (o) => o.status !== 'COMPLETED'
  ).length;
  
  const activeTablesCount = tables.filter(
    (t) => t.status === 'OCCUPIED' || t.status === 'BILLING'
  ).length;

  const activeOrdersList = orders.filter((o) => o.status !== 'COMPLETED').slice(0, 5);

  // Filter completed orders based on period and search query
  const filteredCompletedOrders = completedOrders.filter(order => {
    // 1. Filter by period
    const now = new Date();
    const date = new Date(order.createdAt);
    if (filterPeriod === 'today') {
      if (date.toDateString() !== now.toDateString()) return false;
    } else if (filterPeriod === 'weekly') {
      const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      if (date < oneWeekAgo) return false;
    } else if (filterPeriod === 'monthly') {
      const oneMonthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      if (date < oneMonthAgo) return false;
    } else if (filterPeriod === 'custom') {
      if (customStartDate) {
        const start = new Date(customStartDate);
        start.setHours(0, 0, 0, 0);
        if (date < start) return false;
      }
      if (customEndDate) {
        const end = new Date(customEndDate);
        end.setHours(23, 59, 59, 999);
        if (date > end) return false;
      }
    }

    // 2. Filter by search query
    const q = searchQuery.toLowerCase().trim();
    if (!q) return true;
    
    const matchesTable = `table ${order.table.tableNumber}`.includes(q) || order.table.tableNumber.toString() === q;
    const matchesItem = order.orderItems.some(item => item.menuItem.name.toLowerCase().includes(q));
    const matchesId = order.id.toLowerCase().includes(q);
    
    return matchesTable || matchesItem || matchesId;
  });

  const modalFilteredRevenue = filteredCompletedOrders.reduce((acc, o) => acc + o.total, 0);

  const syncDashboardData = async () => {
    try {
      const [ordersRes, tablesRes, requestsRes] = await Promise.all([
        fetch('/api/admin/orders'),
        fetch('/api/admin/tables'),
        fetch('/api/request-waiter')
      ]);

      if (ordersRes.ok && tablesRes.ok && requestsRes.ok) {
        const [ordersData, tablesData, requestsData] = await Promise.all([
          ordersRes.json(),
          tablesRes.json(),
          requestsRes.json()
        ]);

        // Detect and play sound for new pending orders
        const currentIds = new Set(ordersRef.current.map(o => o.id));
        const hasNewPending = ordersData.some((o: any) => !currentIds.has(o.id) && o.status === 'PENDING');
        if (hasNewPending) {
          playNotificationSound('newOrder');
        }

        // Detect and play sound for new active assistance/bill requests
        const currentReqIds = new Set(requestsRef.current.map(r => r.id));
        const hasNewReq = requestsData.some((r: any) => !currentReqIds.has(r.id) && !r.resolved);
        if (hasNewReq) {
          playNotificationSound('serviceRequest');
        }

        setOrders(ordersData);
        setTables(tablesData);
        setRequests(requestsData);
      }
    } catch (e) {
      console.error('Failed to sync background admin dashboard:', e);
    }
  };

  // Unlock audio, request notification permission, and set up live-event listener + polling
  useEffect(() => {
    const handleClick = () => { unlockAudio(); };
    document.addEventListener('click', handleClick, { once: false });

    const handleTouch = () => { unlockAudio(); };
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
            playNotificationSound('newOrder');
            setOrders((prev) => {
              if (prev.some((o) => o.id === data.id)) return prev;
              return [data, ...prev];
            });
            setTables((prev) =>
              prev.map((t) => (t.id === data.tableId ? { ...t, status: 'OCCUPIED' } : t))
            );
            setToastMessage(`🔔 New Order — Table ${data.table.tableNumber}!`);

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
            setOrders((prev) => prev.map((o) => (o.id === data.id ? data : o)));
            if (data.status === 'COMPLETED') {
              playNotificationSound('orderComplete');
              setTables((prev) =>
                prev.map((t) => (t.id === data.tableId ? { ...t, status: 'AVAILABLE' } : t))
              );
            }
          } else if (type === 'ASSISTANCE_REQUEST' || type === 'BILL_REQUEST') {
            playNotificationSound('serviceRequest');
            setRequests((prev) => {
              if (prev.some((r) => r.id === data.id)) return prev;
              return [...prev, data];
            });
            setTables((prev) =>
              prev.map((t) =>
                t.id === data.tableId
                  ? { ...t, status: data.type === 'BILL' ? 'BILLING' : t.status }
                  : t
              )
            );
            setToastMessage(`🔴 Table ${data.table.tableNumber} — ${data.type} Request!`);

            // Send native browser notification (handles background state)
            if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
              new Notification(`🔴 Service Request — Table ${data.table.tableNumber}`, {
                body: `${data.type === 'BILL' ? 'Requested Bill' : 'Needs Assistance'}`,
                icon: '/favicon.ico',
                tag: `request-${data.id}`
              });
            }
          } else if (type === 'ASSISTANCE_RESOLVED') {
            setRequests((prev) => prev.filter((r) => r.id !== data.id));
          }
        } catch (err) {
          console.error('Error parsing admin SSE event:', err);
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

    // Start client polling fallback for Vercel/serverless environments
    const pollInterval = setInterval(() => {
      syncDashboardData();
    }, 5000); // sync every 5 seconds

    // Re-sync and reconnect when tab returns to foreground
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        syncDashboardData();
        connectSSE();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      if (eventSource) eventSource.close();
      if (reconnectTimeout) clearTimeout(reconnectTimeout);
      clearInterval(pollInterval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      document.removeEventListener('click', handleClick);
    };
  }, []);

  // Toast timer
  useEffect(() => {
    if (toastMessage) {
      const timer = setTimeout(() => setToastMessage(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [toastMessage]);

  // Handle Request Resolution
  const handleResolveRequest = async (requestId: string) => {
    try {
      const res = await fetch('/api/request-waiter', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ id: requestId, resolved: true }),
      });

      if (!res.ok) {
        throw new Error('Failed to resolve request');
      }

      setRequests((prev) => prev.filter((r) => r.id !== requestId));
      setToastMessage('Assistance request resolved successfully.');
    } catch (err) {
      console.error(err);
      alert('Failed to resolve request. Please try again.');
    }
  };

  // Helper for customer name generation
  const getCustomerName = (tableNumber: number, orderId: string) => {
    const names = ["John Doe", "Alice Smith", "Mike King", "Ben White", "Emma Wilson", "Robert Taylor", "Sophia Jones", "James Green"];
    const charCodeSum = orderId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return names[charCodeSum % names.length];
  };

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase();
  };

  // Manual refetch trigger for Refresh button
  const handleRefresh = async () => {
    if (isRefreshing) return;
    setIsRefreshing(true);
    try {
      const [ordersRes, tablesRes, requestsRes] = await Promise.all([
        fetch('/api/admin/orders'),
        fetch('/api/admin/tables'),
        fetch('/api/request-waiter')
      ]);

      if (ordersRes.ok && tablesRes.ok && requestsRes.ok) {
        const [ordersData, tablesData, requestsData] = await Promise.all([
          ordersRes.json(),
          tablesRes.json(),
          requestsRes.json()
        ]);
        setOrders(ordersData);
        setTables(tablesData);
        setRequests(requestsData);
        setToastMessage('Dashboard statistics successfully synced.');
      } else {
        setToastMessage('Failed to sync. Server returned error.');
      }
    } catch (e) {
      console.error(e);
      setToastMessage('Network issue syncing dashboard data.');
    } finally {
      setIsRefreshing(false);
    }
  };

  // Group orders dynamically by selected period (hourly or weekly)
  const getSalesData = () => {
    if (salesPeriod === 'today') {
      const counts = [0, 0, 0, 0, 0, 0, 0, 0];
      const labels = ['8 AM', '10 AM', '12 PM', '2 PM', '4 PM', '6 PM', '8 PM', '10 PM'];
      orders.forEach(o => {
        const orderDate = new Date(o.createdAt);
        const today = new Date();
        if (orderDate.toDateString() !== today.toDateString()) return;

        const hour = orderDate.getHours();
        let index = 0;
        if (hour >= 22) index = 7;      // 10 PM
        else if (hour >= 20) index = 6; // 8 PM
        else if (hour >= 18) index = 5; // 6 PM
        else if (hour >= 16) index = 4; // 4 PM
        else if (hour >= 14) index = 3; // 2 PM
        else if (hour >= 12) index = 2; // 12 PM
        else if (hour >= 10) index = 1; // 10 AM
        else index = 0;                 // 8 AM
        counts[index] += o.total;
      });

      const hasData = counts.some(c => c > 0);
      return {
        values: hasData ? counts : [80, 180, 320, 240, 480, 560, 380, 120],
        labels
      };
    } else {
      const values = [0, 0, 0, 0, 0, 0, 0];
      const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
      const labels: string[] = [];
      const today = new Date();

      for (let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setDate(today.getDate() - i);
        labels.push(days[d.getDay()]);
      }

      orders.forEach(o => {
        const orderDate = new Date(o.createdAt);
        const diffTime = today.getTime() - orderDate.getTime();
        const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
        if (diffDays >= 0 && diffDays < 7) {
          const labelIndex = 6 - diffDays;
          if (labelIndex >= 0 && labelIndex < 7) {
            values[labelIndex] += o.total;
          }
        }
      });

      const hasData = values.some(v => v > 0);
      return {
        values: hasData ? values : [1200, 1800, 1500, 2200, 3100, 2800, 3400],
        labels
      };
    }
  };

  const { values: salesChartValues, labels: chartLabels } = getSalesData();

  // Calculate dynamic average prep time (12 mins base + 3 mins per preparing order)
  const preparingOrdersCount = orders.filter(o => o.status === 'PREPARING').length;
  const avgPrepTime = 12 + preparingOrdersCount * 3;

  // Calculate top sold items dynamically
  const itemCounts: Record<string, { name: string; count: number; total: number; image: string | null }> = {};
  orders.forEach(o => {
    o.orderItems.forEach(item => {
      const id = item.menuItem.id;
      if (!itemCounts[id]) {
        itemCounts[id] = { name: item.menuItem.name, count: 0, total: 0, image: item.menuItem.image };
      }
      itemCounts[id].count += item.quantity;
      itemCounts[id].total += item.price * item.quantity;
    });
  });

  const sortedTopItems = Object.values(itemCounts)
    .sort((a, b) => b.count - a.count)
    .slice(0, 3);

  const topItems = sortedTopItems.length > 0 ? sortedTopItems : [
    { name: "Truffle Wagyu Burger", count: 42, total: 1176, image: "https://lh3.googleusercontent.com/aida-public/AB6AXuC2-rViNp8Y-IllIjFrSyhCeTubKBQ2o7wHU8zISEdoHUuCjTxOGIhiA0Mak2cJ2_oPSAOoaGGPkn9eGY4BJ8sLr7yOxEOda7oFTVTIVs1_aW37rAIjOZP7kHe5OXHnXxSklzpXLcRY1rnLRwUZ_nV2MZybX-Oi_jMBAxXepbkj8GbHN_2iep1UT8TFy2pUePbBvF0IW9O_un_WYUp24AQvIzX_yI9m6443Hs02XoeJP5KZ6xayK7j1jeUVIytF5EYp534RRe9ogkc" },
    { name: "Parmesan Truffle Fries", count: 28, total: 336, image: "https://lh3.googleusercontent.com/aida-public/AB6AXuDSGB3KjWolUuILf1xWA1x6d42A5E7HjwFAfe8EZ5DMg_rVr3cEPBR0MRO4eGgIytEaqcJ13rhAazUi_CZ1NH9pkktI81y6MzuzbnSR5yjot_0Y1dVfzFswAq4iEocMJmO9pB_u5aQhg3a6DIWiY1aH7wOQ5v3b5X7qe0ZHApMzFkqovhXuiNQQEOzTIjYXLK6sGxUxFenguUp40tqpP8KSCbjF1ZsBIlxq6NS9tMiv12DgtFRXJAxbGGyNwF9tbBCY5DyqRan6LAU" },
    { name: "Classic Old Fashioned", count: 56, total: 728, image: "https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?w=600&auto=format&fit=crop&q=60" }
  ];

  const getRequestDetails = (type: string) => {
    switch (type) {
      case 'BILL':
        return { label: 'Requested Bill', bg: 'bg-primary text-white', border: 'bg-primary-container/5 border-primary/20' };
      case 'WATER':
        return { label: 'Requested Water', bg: 'bg-blue-600 text-white', border: 'bg-blue-500/5 border-blue-500/20' };
      case 'CLEAN':
        return { label: 'Clean Table Request', bg: 'bg-error text-white', border: 'bg-error/5 border-error/20' };
      case 'SUPPORT':
        return { label: 'Support Requested', bg: 'bg-purple-600 text-white', border: 'bg-purple-500/5 border-purple-500/20' };
      case 'WAITER':
        return { label: 'Called Waiter', bg: 'bg-tertiary text-white', border: 'bg-tertiary/5 border-tertiary/20' };
      default:
        return { label: 'Needs Assistance', bg: 'bg-tertiary text-white', border: 'bg-tertiary/5 border-tertiary/20' };
    }
  };

  return (
    <div className="flex-1 flex flex-col p-4 md:p-6 space-y-6">
      {/* Header */}
      <header className="flex justify-between items-center h-16 shrink-0 mt-16 md:mt-0">
        <div>
          <h1 className="text-2xl font-black text-on-surface tracking-tight">Dashboard</h1>
          <p className="text-xs text-on-surface-variant font-medium mt-0.5">
            LuxeDine Point-of-Sale & Live Operations Analytics
          </p>
        </div>
        <button
          onClick={handleRefresh}
          disabled={isRefreshing}
          className="bg-surface-container border border-outline-variant/30 text-on-surface hover:bg-surface-container-high px-4 py-2.5 rounded-xl flex items-center gap-2 text-xs font-bold transition-all cursor-pointer shadow-sm disabled:opacity-55"
        >
          <span className={`material-symbols-outlined text-[18px] ${isRefreshing ? 'animate-spin' : ''}`}>refresh</span>
          <span>{isRefreshing ? 'Syncing...' : 'Refresh Data'}</span>
        </button>
      </header>

      {/* KPI Section */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Revenue */}
        <div 
          onClick={() => handleOpenHistoryModal('revenue')}
          className="bg-surface-container-lowest border border-outline-variant rounded-xl p-5 shadow-sm hover:shadow-md hover:border-primary/45 transition-all cursor-pointer select-none"
        >
          <div className="flex justify-between items-start mb-3">
            <span className="material-symbols-outlined text-primary text-2xl">payments</span>
            <span className="text-secondary text-[10px] font-bold bg-secondary-container/20 px-2 py-0.5 rounded-full">+12%</span>
          </div>
          <p className="text-on-surface-variant text-[10px] uppercase font-bold tracking-wider">Revenue (Click to view)</p>
          <h3 className="text-2xl font-black text-on-surface mt-0.5">₹{revenue.toFixed(2)}</h3>
        </div>

        {/* Completed Orders */}
        <div 
          onClick={() => handleOpenHistoryModal('orders')}
          className="bg-surface-container-lowest border border-outline-variant rounded-xl p-5 shadow-sm hover:shadow-md hover:border-primary/45 transition-all cursor-pointer select-none"
        >
          <div className="flex justify-between items-start mb-3">
            <span className="material-symbols-outlined text-tertiary text-2xl">shopping_bag</span>
            <span className="text-secondary text-[10px] font-bold bg-secondary-container/20 px-2 py-0.5 rounded-full">+5%</span>
          </div>
          <p className="text-on-surface-variant text-[10px] uppercase font-bold tracking-wider">Orders (Click to view)</p>
          <h3 className="text-2xl font-black text-on-surface mt-0.5">{completedOrders.length}</h3>
        </div>

        {/* Active Tables */}
        <div 
          onClick={() => handleOpenHistoryModal('tables')}
          className="bg-surface-container-lowest border border-outline-variant rounded-xl p-5 shadow-sm hover:shadow-md hover:border-primary/45 transition-all cursor-pointer select-none"
        >
          <div className="flex justify-between items-start mb-3">
            <span className="material-symbols-outlined text-secondary text-2xl">table_restaurant</span>
            <span className="text-on-surface-variant text-[10px] font-bold bg-surface-container-high px-2 py-0.5 rounded-full">
              {tables.length > 0 ? Math.round((activeTablesCount / tables.length) * 100) : 0}%
            </span>
          </div>
          <p className="text-on-surface-variant text-[10px] uppercase font-bold tracking-wider">Active Tables (Click to view)</p>
          <h3 className="text-2xl font-black text-on-surface mt-0.5">{activeTablesCount} / {tables.length}</h3>
        </div>

        {/* Prep Time */}
        <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex justify-between items-start mb-3">
            <span className="material-symbols-outlined text-error text-2xl">timer</span>
            <span className="text-error text-[10px] font-bold bg-error-container/20 px-2 py-0.5 rounded-full">-2m</span>
          </div>
          <p className="text-on-surface-variant text-[10px] uppercase font-bold tracking-wider">Avg. Prep Time</p>
          <h3 className="text-2xl font-black text-on-surface mt-0.5">{avgPrepTime}m</h3>
        </div>
      </section>

      {/* Middle Layout Panel (Sales Chart & Top Menu Items) */}
      <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Sales Overview Chart */}
        <div className="lg:col-span-2 bg-surface-container-lowest border border-outline-variant rounded-xl p-5 shadow-sm relative overflow-hidden">
          <div className="flex justify-between items-center mb-6 relative z-10">
            <div className="flex items-center gap-2.5">
              <h2 className="text-sm font-extrabold uppercase tracking-wider text-on-surface">Sales Overview</h2>
              <div className="flex items-center gap-1 bg-emerald-500/10 text-emerald-600 px-2 py-0.5 rounded-full text-[9px] font-black tracking-wide uppercase select-none border border-emerald-500/20">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                <span>Realtime Live</span>
              </div>
            </div>
            <select 
              value={salesPeriod}
              onChange={(e) => setSalesPeriod(e.target.value as 'today' | 'weekly')}
              className="bg-surface-container-low border-none rounded-lg text-xs font-bold px-3 py-1.5 focus:ring-0 outline-none text-on-surface cursor-pointer"
            >
              <option value="today">Today</option>
              <option value="weekly">Weekly</option>
            </select>
          </div>
          
          <div className="h-[200px] flex items-end justify-between gap-3 px-2 pt-4 relative">
            {/* Gridlines in background */}
            <div className="absolute inset-x-0 bottom-[28px] top-6 flex flex-col justify-between pointer-events-none opacity-20 z-0">
              <div className="border-b border-dashed border-outline-variant w-full"></div>
              <div className="border-b border-dashed border-outline-variant w-full"></div>
              <div className="border-b border-dashed border-outline-variant w-full"></div>
              <div className="border-b border-dashed border-outline-variant w-full"></div>
            </div>

            {salesChartValues.map((val, idx) => {
              const maxVal = Math.max(...salesChartValues) || 1;
              const heightPct = (val / maxVal) * 100;
              return (
                <div key={idx} className="h-full flex-grow flex flex-col justify-end items-center group relative z-10">
                  {/* Tooltip on hover */}
                  <span className="absolute -top-6 text-[9px] font-black bg-inverse-surface text-inverse-on-surface px-1.5 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap shadow-sm pointer-events-none z-20">
                    ₹{val.toFixed(0)}
                  </span>
                  <div 
                    className="w-full rounded-t-lg transition-all duration-500 ease-out hover:scale-x-[1.03] hover:shadow-lg hover:shadow-primary/30 cursor-pointer shadow-inner"
                    style={{ 
                      height: `${Math.max(heightPct, 5)}%`,
                      background: `linear-gradient(to top, var(--color-primary), var(--color-primary-container))`
                    }}
                  ></div>
                  <span className="text-[10px] text-on-surface-variant font-bold mt-2 select-none">{chartLabels[idx]}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Top Menu Items */}
        <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-5 shadow-sm flex flex-col justify-between">
          <h2 className="text-sm font-extrabold uppercase tracking-wider text-on-surface mb-4">Top Menu Items</h2>
          <div className="space-y-4">
            {topItems.map((item, idx) => (
              <div key={idx} className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-lg bg-surface-container overflow-hidden flex-shrink-0 border border-outline-variant/30">
                  <img 
                    alt={item.name} 
                    className="w-full h-full object-cover" 
                    src={item.image || "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=100&auto=format&fit=crop&q=60"}
                  />
                </div>
                <div className="flex-grow min-w-0">
                  <p className="font-bold text-xs text-on-surface truncate">{item.name}</p>
                  <p className="text-[10px] text-on-surface-variant font-medium">{item.count} Sold Today</p>
                </div>
                <span className="font-extrabold text-xs text-primary">₹{item.total.toFixed(2)}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Bottom Layout Panel (Customer Alerts & Active Queue) */}
      <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Customer Assistance Alerts */}
        <div className="lg:col-span-1 bg-surface-container-lowest border border-outline-variant rounded-xl p-5 flex flex-col h-[400px]">
          <div className="flex items-center justify-between pb-3 border-b border-outline-variant/20 mb-3 flex-shrink-0">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-error animate-ping"></span>
              <h2 className="text-xs font-bold text-on-surface uppercase tracking-wider">Customer Alerts</h2>
            </div>
            <span className="bg-error-container text-on-error-container text-[9px] font-bold px-2 py-0.5 rounded-full">
              {requests.length} Active
            </span>
          </div>

          {/* Requests List */}
          <div className="flex-1 overflow-y-auto no-scrollbar space-y-3 pr-1">
            {requests.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-center text-on-surface-variant/40 space-y-2">
                <span className="material-symbols-outlined text-[36px]">notifications_off</span>
                <p className="text-xs font-semibold">No alerts active</p>
              </div>
            ) : (
              requests.map((request) => {
                const details = getRequestDetails(request.type);
                return (
                  <div
                    key={request.id}
                    className={`p-3 rounded-2xl border flex flex-col gap-2.5 relative transition-all ${details.border}`}
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex items-center gap-2">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-extrabold shadow-sm ${details.bg}`}>
                          {request.table.tableNumber}
                        </div>
                        <div>
                          <h4 className="text-xs font-bold text-on-surface">Table {request.table.tableNumber}</h4>
                          <p className="text-[9px] text-on-surface-variant font-medium">
                            {details.label}
                          </p>
                        </div>
                      </div>
                    <span className="text-[9px] text-on-surface-variant font-medium">
                      {new Date(request.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>

                  <button
                    onClick={() => handleResolveRequest(request.id)}
                    className="w-full py-1.5 bg-surface-container-highest hover:bg-surface-container-high text-on-surface rounded-lg text-[9px] font-bold transition-all active:scale-95 cursor-pointer flex items-center justify-center gap-1 border border-outline-variant/30"
                  >
                    <span className="material-symbols-outlined text-[12px]">done</span>
                    <span>Mark Resolved</span>
                  </button>
                </div>
              )})
            )}
          </div>
        </div>

        {/* Active Prep Queue */}
        <div className="lg:col-span-2 bg-surface-container-lowest border border-outline-variant rounded-xl p-5 flex flex-col h-[400px]">
          <div className="flex items-center justify-between pb-3 border-b border-outline-variant/20 mb-3 flex-shrink-0">
            <h2 className="text-xs font-bold text-on-surface uppercase tracking-wider">Active Prep Queue</h2>
            <span className="bg-surface-container-high text-on-surface-variant text-[9px] font-bold px-2.5 py-0.5 rounded-full">
              {activeOrdersCount} Pending
            </span>
          </div>

          {/* Active Orders List */}
          <div className="flex-grow overflow-y-auto no-scrollbar space-y-3 pr-1">
            {activeOrdersList.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-center text-on-surface-variant/40 space-y-2">
                <span className="material-symbols-outlined text-[36px]">receipt_long</span>
                <p className="text-xs font-semibold">Prep queue is empty</p>
              </div>
            ) : (
              activeOrdersList.map((order) => (
                <div
                  key={order.id}
                  className="p-3.5 bg-surface-container-low border border-outline-variant/30 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm hover:shadow transition-shadow"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-extrabold text-on-surface bg-surface-container-lowest border border-outline-variant/40 px-2 py-0.5 rounded">
                        Table {order.table.tableNumber}
                      </span>
                      <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${
                        order.status === 'PENDING' ? 'bg-amber-100 text-amber-800' :
                        order.status === 'ACCEPTED' ? 'bg-blue-100 text-blue-800' :
                        order.status === 'PREPARING' ? 'bg-orange-100 text-orange-800' : 'bg-green-100 text-green-800'
                      }`}>
                        {order.status}
                      </span>
                    </div>
                    <div className="text-[11px] font-bold text-on-surface mt-1">
                      {order.orderItems.map((item) => (
                        <span key={item.id} className="inline-block mr-2">
                          {item.quantity}x {item.menuItem.name}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="flex items-center justify-between sm:justify-end gap-4 border-t sm:border-t-0 pt-2 sm:pt-0 border-outline-variant/10">
                    <div className="text-right">
                      <span className="text-[9px] text-on-surface-variant block font-medium">Order Total</span>
                      <span className="text-primary font-bold text-xs">₹{order.total.toFixed(2)}</span>
                    </div>
                    <button
                      onClick={() => router.push(`/kitchen`)}
                      className="px-3.5 py-1.5 bg-primary-container text-on-primary-container hover:bg-primary hover:text-white rounded-lg text-[10px] font-extrabold transition-all cursor-pointer shadow-sm active:scale-95"
                    >
                      Manage
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </section>

      {/* Floating Status Notification Toast */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 bg-inverse-surface text-inverse-on-surface px-5 py-3 rounded-2xl text-xs font-bold shadow-xl z-50 animate-bounce">
          {toastMessage}
        </div>
      )}

      {/* Past Orders & Revenue History Modal */}
      {(modalType === 'revenue' || modalType === 'orders') && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 transition-all duration-300">
          <div className="bg-surface-container-lowest border border-outline-variant/30 w-full max-w-2xl rounded-3xl shadow-2xl flex flex-col max-h-[80vh] overflow-hidden animate-scale-in-straight">
            {/* Modal Header */}
            <div className="p-6 border-b border-outline-variant/20 flex justify-between items-start">
              <div>
                <h3 className="text-lg font-black text-on-surface tracking-tight">
                  {modalType === 'revenue' ? 'Revenue History Breakdown' : 'Completed Orders History'}
                </h3>
                <p className="text-xs text-on-surface-variant font-medium mt-1">
                  {modalType === 'revenue' 
                    ? `Filtered Revenue: ₹${modalFilteredRevenue.toFixed(2)} across ${filteredCompletedOrders.length} completed orders`
                    : `Showing ${filteredCompletedOrders.length} completed orders`
                  }
                </p>
              </div>
              <button 
                onClick={handleCloseHistoryModal}
                className="w-8 h-8 rounded-full flex items-center justify-center bg-surface-container hover:bg-surface-container-high text-on-surface transition-colors cursor-pointer border border-outline-variant/20"
              >
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>

            {/* In-Modal Period Filters & Export Button */}
            <div className="p-4 bg-surface-container-low border-b border-outline-variant/20 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-[16px] text-on-surface-variant select-none">calendar_today</span>
                    <span className="text-[11px] font-extrabold text-on-surface-variant uppercase tracking-wider select-none">Period:</span>
                  </div>
                  <div className="flex gap-1.5 flex-wrap">
                    {(['today', 'weekly', 'monthly', 'custom', 'all'] as const).map((period) => (
                      <button
                        key={period}
                        onClick={() => setFilterPeriod(period)}
                        className={`px-3 py-1.5 rounded-lg text-[10px] font-black border transition-all cursor-pointer shadow-sm ${
                          filterPeriod === period
                            ? 'bg-primary text-white border-primary'
                            : 'bg-surface hover:bg-surface-container border-outline-variant/30 text-on-surface'
                        }`}
                      >
                        {period === 'today' ? 'Today' : period === 'weekly' ? 'Weekly' : period === 'monthly' ? 'Monthly' : period === 'custom' ? 'Custom Range' : 'All-Time'}
                      </button>
                    ))}
                  </div>
                </div>
                <button
                  onClick={() => downloadRevenueCSV(filterPeriod)}
                  className="px-3 py-1.5 bg-primary/10 hover:bg-primary/20 text-primary border border-primary/20 rounded-lg text-[10px] font-black transition-colors cursor-pointer flex items-center gap-1 shadow-sm"
                >
                  <span className="material-symbols-outlined text-[14px]">download</span>
                  <span>Export CSV</span>
                </button>
              </div>

              {/* Custom Date Picker Inputs */}
              {filterPeriod === 'custom' && (
                <div className="flex flex-wrap items-center gap-4 bg-surface p-3.5 rounded-2xl border border-outline-variant/20">
                  <div className="flex items-center gap-2">
                    <label className="text-[10px] font-extrabold text-on-surface-variant uppercase tracking-wider">From:</label>
                    <input
                      type="date"
                      value={customStartDate}
                      onChange={(e) => setCustomStartDate(e.target.value)}
                      className="bg-surface-container-low border border-outline-variant/30 rounded-lg text-[11px] font-bold px-2 py-1 outline-none text-on-surface focus:border-primary focus:ring-1 focus:ring-primary"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <label className="text-[10px] font-extrabold text-on-surface-variant uppercase tracking-wider">To:</label>
                    <input
                      type="date"
                      value={customEndDate}
                      onChange={(e) => setCustomEndDate(e.target.value)}
                      className="bg-surface-container-low border border-outline-variant/30 rounded-lg text-[11px] font-bold px-2 py-1 outline-none text-on-surface focus:border-primary focus:ring-1 focus:ring-primary"
                    />
                  </div>
                  {(customStartDate || customEndDate) && (
                    <button
                      onClick={() => {
                        setCustomStartDate('');
                        setCustomEndDate('');
                      }}
                      className="px-2.5 py-1 bg-surface-container text-on-surface-variant hover:text-on-surface text-[10px] font-bold rounded-lg border border-outline-variant/30 cursor-pointer"
                    >
                      Clear Dates
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Search filter */}
            <div className="p-4 bg-surface-container-low/50 border-b border-outline-variant/20 flex gap-2">
              <div className="relative flex-grow">
                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant/50 text-[18px]">
                  search
                </span>
                <input
                  type="text"
                  placeholder="Search by table number, dish name, or order ID..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-4 py-2.5 bg-surface border border-outline-variant/50 rounded-xl text-xs font-semibold focus:ring-1 focus:ring-primary focus:border-primary outline-none text-on-surface placeholder:text-on-surface-variant/40 transition-all"
                />
              </div>
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="px-3 py-2 bg-surface-container text-on-surface-variant hover:text-on-surface text-xs font-bold rounded-xl border border-outline-variant/30 cursor-pointer"
                >
                  Clear
                </button>
              )}
            </div>

            {/* Orders List */}
            <div className="flex-grow overflow-y-auto p-6 space-y-4 no-scrollbar">
              {filteredCompletedOrders.length === 0 ? (
                <div className="text-center py-16 space-y-3 text-on-surface-variant/50">
                  <span className="material-symbols-outlined text-[48px]">receipt_long</span>
                  <h4 className="text-sm font-bold text-on-surface">No completed orders found</h4>
                  <p className="text-xs max-w-xs mx-auto">
                    {searchQuery 
                      ? "Try searching for a different table number or item name."
                      : "Completed orders will be logged here once marked complete in the live kitchen."
                    }
                  </p>
                </div>
              ) : (
                filteredCompletedOrders.map((order) => (
                  <div 
                    key={order.id} 
                    className="p-4 bg-surface-container-low border border-outline-variant/20 rounded-2xl space-y-3 hover:border-primary/20 transition-colors"
                  >
                    <div className="flex justify-between items-start">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-extrabold text-on-surface bg-surface-container-lowest border border-outline-variant/40 px-2 py-0.5 rounded">
                            Table {order.table.tableNumber}
                          </span>
                          <span className="text-[9px] font-bold text-neutral-400">
                            #LD-{order.id.slice(-6).toUpperCase()}
                          </span>
                          <span className="text-[9px] font-extrabold bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 px-2 py-0.5 rounded-full uppercase tracking-wider">
                            COMPLETED
                          </span>
                        </div>
                        <p className="text-[10px] text-on-surface-variant font-medium">
                          {new Date(order.createdAt).toLocaleString(undefined, { 
                            dateStyle: 'medium', 
                            timeStyle: 'short' 
                          })}
                        </p>
                      </div>
                      <div className="text-right">
                        <span className="text-[9px] text-on-surface-variant font-medium block">Total Amount</span>
                        <span className="text-primary font-black text-sm">₹{order.total.toFixed(2)}</span>
                      </div>
                    </div>

                    {/* Order Items List */}
                    <div className="border-t border-outline-variant/10 pt-2 space-y-1.5">
                      {order.orderItems.map((item) => (
                        <div key={item.id} className="flex justify-between items-center text-xs font-semibold text-on-surface">
                          <span>
                            {item.quantity}x <span className="text-on-surface-variant">{item.menuItem.name}</span>
                          </span>
                          <span className="text-on-surface-variant font-bold">
                            ₹{(item.price * item.quantity).toFixed(2)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Active Tables Modal */}
      {modalType === 'tables' && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 transition-all duration-300">
          <div className="bg-surface-container-lowest border border-outline-variant/30 w-full max-w-2xl rounded-3xl shadow-2xl flex flex-col max-h-[80vh] overflow-hidden animate-scale-in-straight">
            {/* Modal Header */}
            <div className="p-6 border-b border-outline-variant/20 flex justify-between items-start">
              <div>
                <h3 className="text-lg font-black text-on-surface tracking-tight">Active Tables</h3>
                <p className="text-xs text-on-surface-variant font-medium mt-1">
                  Currently {activeTablesCount} occupied or billing tables out of {tables.length} total tables.
                </p>
              </div>
              <button 
                onClick={handleCloseHistoryModal}
                className="w-8 h-8 rounded-full flex items-center justify-center bg-surface-container hover:bg-surface-container-high text-on-surface transition-colors cursor-pointer border border-outline-variant/20"
              >
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>

            {/* Modal Body */}
            <div className="flex-grow overflow-y-auto p-6 space-y-4 no-scrollbar">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {tables.map((table) => {
                  const isActive = table.status === 'OCCUPIED' || table.status === 'BILLING';
                  // Find active orders for this table
                  const tableActiveOrders = orders.filter(
                    (o) => o.table.id === table.id && o.status !== 'COMPLETED'
                  );

                  return (
                    <div 
                      key={table.id}
                      className={`p-4 rounded-2xl border transition-all flex flex-col justify-between ${
                        table.status === 'BILLING' 
                          ? 'bg-amber-500/5 border-amber-500/30' 
                          : table.status === 'OCCUPIED'
                          ? 'bg-primary/5 border-primary/30'
                          : 'bg-surface-container-low border-outline-variant/20 opacity-70'
                      }`}
                    >
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <span className="text-xs font-black text-on-surface">Table {table.tableNumber}</span>
                          <span className="text-[10px] text-on-surface-variant block">Capacity: {table.capacity} people</span>
                        </div>
                        <span className={`text-[9px] font-extrabold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                          table.status === 'BILLING'
                            ? 'bg-amber-500/20 text-amber-500'
                            : table.status === 'OCCUPIED'
                            ? 'bg-primary/20 text-primary'
                            : 'bg-surface-container-high text-on-surface-variant'
                        }`}>
                          {table.status}
                        </span>
                      </div>

                      {isActive && tableActiveOrders.length > 0 ? (
                        <div className="border-t border-outline-variant/10 pt-2 mt-2 space-y-1">
                          <span className="text-[9px] text-on-surface-variant font-bold block">Active Orders:</span>
                          {tableActiveOrders.map(o => (
                            <div key={o.id} className="flex justify-between text-[11px] font-semibold text-on-surface">
                              <span className="truncate max-w-[120px]">
                                {o.orderItems.map(i => `${i.quantity}x ${i.menuItem.name}`).join(', ')}
                              </span>
                              <span className="text-primary font-bold">₹{o.total.toFixed(2)}</span>
                            </div>
                          ))}
                        </div>
                      ) : isActive ? (
                        <p className="text-[10px] text-on-surface-variant italic mt-2">No active orders placed yet</p>
                      ) : (
                        <p className="text-[10px] text-on-surface-variant italic mt-2">Table is empty</p>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Modal Footer / Direct link */}
            <div className="p-4 bg-surface-container-low/50 border-t border-outline-variant/20 flex justify-end">
              <button
                onClick={() => {
                  handleCloseHistoryModal();
                  router.push('/admin/tables');
                }}
                className="px-4 py-2.5 bg-primary text-white hover:bg-primary/90 font-bold text-xs rounded-xl flex items-center gap-1.5 shadow transition-all cursor-pointer"
              >
                <span className="material-symbols-outlined text-[16px]">table_restaurant</span>
                <span>Go to Tables Management</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
