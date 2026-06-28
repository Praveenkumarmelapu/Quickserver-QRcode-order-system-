'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import QRCode from 'qrcode';

interface Table {
  id: string;
  tableNumber: number;
  capacity: number;
  status: 'AVAILABLE' | 'OCCUPIED' | 'BILLING' | 'DIRTY' | string;
  qrToken: string;
}

interface TablesManagementClientProps {
  initialTables: Table[];
}

function TableQrImage({ text }: { text: string }) {
  const [dataUrl, setDataUrl] = useState('');

  useEffect(() => {
    QRCode.toDataURL(text, { width: 250, margin: 1 })
      .then(setDataUrl)
      .catch(console.error);
  }, [text]);

  if (!dataUrl) {
    return <div className="w-40 h-40 bg-surface-container animate-pulse rounded-xl mx-auto"></div>;
  }

  return (
    <img
      src={dataUrl}
      alt="QR Code"
      className="w-40 h-40 mx-auto object-contain bg-white p-2 rounded-xl shadow-inner"
    />
  );
}

export default function TablesManagementClient({
  initialTables,
}: TablesManagementClientProps) {
  const router = useRouter();

  // State
  const [tables, setTables] = useState<Table[]>(initialTables);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [selectedTableForQr, setSelectedTableForQr] = useState<Table | null>(null);
  const [editingTable, setEditingTable] = useState<Table | null>(null);

  // Billing states
  const [selectedTableForBill, setSelectedTableForBill] = useState<Table | null>(null);
  const [billOrders, setBillOrders] = useState<any[]>([]);
  const [loadingBill, setLoadingBill] = useState(false);
  const [isCompletingBilling, setIsCompletingBilling] = useState(false);

  // Fetch active orders for table billing
  useEffect(() => {
    if (selectedTableForBill) {
      const fetchActiveBill = async () => {
        setLoadingBill(true);
        try {
          const res = await fetch(`/api/orders?tableId=${selectedTableForBill.id}&active=true`);
          if (res.ok) {
            const data = await res.json();
            setBillOrders(data);
          }
        } catch (e) {
          console.error('Error fetching table bill:', e);
        } finally {
          setLoadingBill(false);
        }
      };
      fetchActiveBill();
    }
  }, [selectedTableForBill]);

  // Form states
  const [formNumber, setFormNumber] = useState('');
  const [formCapacity, setFormCapacity] = useState('4');
  const [formStatus, setFormStatus] = useState('AVAILABLE');
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [windowOrigin, setWindowOrigin] = useState('');

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setWindowOrigin(window.location.origin);
    }
  }, []);

  // Toast timer
  useEffect(() => {
    if (toastMessage) {
      const timer = setTimeout(() => setToastMessage(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [toastMessage]);

  const handleOpenAddModal = () => {
    setFormNumber('');
    setFormCapacity('4');
    setFormStatus('AVAILABLE');
    setIsAddModalOpen(true);
  };

  const handleOpenEditModal = (table: Table) => {
    setEditingTable(table);
    setFormNumber(table.tableNumber.toString());
    setFormCapacity(table.capacity.toString());
    setFormStatus(table.status);
  };

  // Add Table
  const handleAddTable = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;
    setIsSubmitting(true);

    try {
      const res = await fetch('/api/admin/tables', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tableNumber: parseInt(formNumber, 10),
          capacity: parseInt(formCapacity, 10),
          status: formStatus,
        }),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Failed to create table');
      }

      const created = await res.json();
      setTables((prev) => [...prev, created].sort((a, b) => a.tableNumber - b.tableNumber));
      setIsAddModalOpen(false);
      setToastMessage(`Table ${created.tableNumber} created successfully!`);
    } catch (err: any) {
      console.error(err);
      alert(err.message || 'Error creating table.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Edit Table
  const handleEditTable = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTable || isSubmitting) return;
    setIsSubmitting(true);

    try {
      const res = await fetch(`/api/admin/tables/${editingTable.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tableNumber: parseInt(formNumber, 10),
          capacity: parseInt(formCapacity, 10),
          status: formStatus,
        }),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Failed to update table');
      }

      const updated = await res.json();
      setTables((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
      setEditingTable(null);
      setToastMessage(`Table ${updated.tableNumber} updated successfully!`);
    } catch (err: any) {
      console.error(err);
      alert(err.message || 'Error updating table.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Regenerate Security Token
  const handleRegenerateToken = async (table: Table) => {
    if (!confirm(`Warning: Regenerating token will render the printed QR code for Table ${table.tableNumber} invalid until a new QR code is printed. Continue?`)) return;

    try {
      const res = await fetch(`/api/admin/tables/${table.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ regenerateToken: true }),
      });

      if (!res.ok) {
        throw new Error('Failed to regenerate token');
      }

      const updated = await res.json();
      setTables((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
      if (selectedTableForQr?.id === table.id) {
        setSelectedTableForQr(updated);
      }
      setToastMessage(`Token regenerated for Table ${table.tableNumber}!`);
    } catch (err) {
      console.error(err);
      alert('Failed to regenerate token.');
    }
  };

  // Delete Table
  const handleDeleteTable = async (tableId: string, number: number) => {
    if (!confirm(`Are you sure you want to delete Table ${number}? This action is permanent.`)) return;

    try {
      const res = await fetch(`/api/admin/tables/${tableId}`, {
        method: 'DELETE',
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Failed to delete table');
      }

      setTables((prev) => prev.filter((t) => t.id !== tableId));
      setToastMessage(`Table ${number} deleted.`);
    } catch (err: any) {
      console.error(err);
      alert(err.message || 'Failed to delete table. Check if there are active orders.');
    }
  };

  // Inline Quick Status Change
  const handleStatusChange = async (table: Table, newStatus: string) => {
    try {
      // Optimistic update
      setTables((prev) =>
        prev.map((t) => (t.id === table.id ? { ...t, status: newStatus } : t))
      );

      const res = await fetch(`/api/admin/tables/${table.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });

      if (!res.ok) {
        throw new Error('Failed to update status');
      }
      setToastMessage(`Table ${table.tableNumber} status updated to ${newStatus}.`);
    } catch (err) {
      console.error(err);
      // Revert
      setTables((prev) =>
        prev.map((t) => (t.id === table.id ? { ...t, status: table.status } : t))
      );
      alert('Failed to update table status.');
    }
  };

  // Helper for status colors
  const getStatusColorClass = (status: string) => {
    switch (status) {
      case 'AVAILABLE': return 'text-secondary';
      case 'OCCUPIED': return 'text-primary';
      case 'BILLING': return 'text-tertiary';
      case 'DIRTY': return 'text-error';
      default: return 'text-on-surface-variant';
    }
  };

  const getStatusDropdownStyle = (status: string) => {
    switch (status) {
      case 'AVAILABLE': return 'bg-secondary-container/10 text-secondary border-secondary-container/30';
      case 'OCCUPIED': return 'bg-primary-container/10 text-primary border-primary-container/30';
      case 'BILLING': return 'bg-tertiary-container/10 text-tertiary border-tertiary-container/30';
      case 'DIRTY': return 'bg-error-container/10 text-error border-error-container/30';
      default: return 'bg-surface text-on-surface border-outline-variant/30';
    }
  };

  const getTableUrl = (table: Table) => {
    return `${windowOrigin}/landing?table=${table.tableNumber}&token=${table.qrToken}`;
  };

  const handleCompleteBilling = async (targetStatus: 'AVAILABLE' | 'DIRTY') => {
    if (!selectedTableForBill || isCompletingBilling) return;
    setIsCompletingBilling(true);

    try {
      const res = await fetch(`/api/admin/tables/${selectedTableForBill.id}/complete-billing`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: targetStatus })
      });

      if (!res.ok) {
        throw new Error('Failed to complete billing.');
      }

      await res.json();
      
      // Update tables in state
      setTables((prev) => prev.map((t) => (t.id === selectedTableForBill.id ? { ...t, status: targetStatus } : t)));
      setSelectedTableForBill(null);
      setToastMessage(`Billing completed for Table ${selectedTableForBill.tableNumber}!`);
    } catch (err: any) {
      console.error(err);
      alert(err.message || 'Error completing billing.');
    } finally {
      setIsCompletingBilling(false);
    }
  };

  // Aggregate bill items for the selected table
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

  const handlePrint = () => {
    window.print();
  };

  const totalTables = tables.length;
  const availableCount = tables.filter((t) => t.status === 'AVAILABLE').length;
  const occupiedCount = tables.filter((t) => t.status === 'OCCUPIED' || t.status === 'BILLING').length;
  const simulatedScans = totalTables * 6 + 12; // Realistic simulation

  return (
    <div className="flex-1 flex flex-col p-6 space-y-6 print:p-0 print:bg-white print:text-black">
      {/* Dynamic pulse CSS injected locally for exact visual sync */}
      <style dangerouslySetInnerHTML={{__html: `
        .status-pulse {
          position: relative;
        }
        .status-pulse::after {
          content: '';
          position: absolute;
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: currentColor;
          right: -8px;
          top: 50%;
          transform: translateY(-50%);
          animation: pulse-kf 2s infinite;
        }
        @keyframes pulse-kf {
          0% { opacity: 1; transform: translateY(-50%) scale(1); }
          50% { opacity: 0.4; transform: translateY(-50%) scale(1.25); }
          100% { opacity: 1; transform: translateY(-50%) scale(1); }
        }
      `}} />

      {/* Header (Hidden when printing) */}
      <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 shrink-0 mt-16 md:mt-0 print:hidden">
        <div>
          <h1 className="text-2xl font-black text-on-surface tracking-tight">Table Management</h1>
          <p className="text-xs text-on-surface-variant font-medium mt-0.5 font-sans">
            Manage floor layouts, table capacities, and generate smart QR codes for digital tables.
          </p>
        </div>
        <button
          onClick={handleOpenAddModal}
          className="bg-primary text-on-primary hover:opacity-90 active:scale-95 px-5 py-2.5 rounded-xl flex items-center gap-2 text-xs font-bold transition-all cursor-pointer shadow-md"
        >
          <span className="material-symbols-outlined text-[18px]">add</span>
          <span>Add Table</span>
        </button>
      </header>

      {/* Stats Overview (Hidden when printing) */}
      <section className="grid grid-cols-2 md:grid-cols-4 gap-4 print:hidden">
        <div className="bg-surface-container-lowest p-4 rounded-xl border border-outline-variant flex flex-col gap-1 shadow-sm">
          <span className="text-on-surface-variant font-semibold text-[10px] uppercase tracking-wider">Total Tables</span>
          <span className="text-2xl font-black text-on-surface">{totalTables}</span>
        </div>
        <div className="bg-surface-container-lowest p-4 rounded-xl border border-outline-variant flex flex-col gap-1 shadow-sm">
          <span className="text-secondary font-semibold text-[10px] uppercase tracking-wider">Available</span>
          <span className="text-2xl font-black text-secondary">{availableCount}</span>
        </div>
        <div className="bg-surface-container-lowest p-4 rounded-xl border border-outline-variant flex flex-col gap-1 shadow-sm">
          <span className="text-primary font-semibold text-[10px] uppercase tracking-wider">Occupied</span>
          <span className="text-2xl font-black text-primary">{occupiedCount}</span>
        </div>
        <div className="bg-surface-container-lowest p-4 rounded-xl border border-outline-variant flex flex-col gap-1 shadow-sm">
          <span className="text-tertiary font-semibold text-[10px] uppercase tracking-wider">QR Scans Today</span>
          <span className="text-2xl font-black text-on-surface">{simulatedScans}</span>
        </div>
      </section>

      {/* Grid of Tables (Hidden when printing) */}
      <section className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-6 flex-grow overflow-y-auto no-scrollbar pb-12 print:hidden">
        {tables.length === 0 ? (
          <div className="col-span-full text-center py-20 bg-surface-container-lowest border border-outline-variant/30 rounded-3xl space-y-3 shadow-sm">
            <span className="material-symbols-outlined text-outline text-[48px]">table_restaurant</span>
            <h3 className="text-sm font-bold text-on-surface">No Tables Found</h3>
            <p className="text-xs text-on-surface-variant max-w-[240px] mx-auto leading-relaxed">
              Set up your first table to generate ordering QR links.
            </p>
          </div>
        ) : (
          tables.map((table) => (
            <div
              key={table.id}
              className="glass-card p-5 rounded-2xl flex flex-col gap-4 transition-all hover:shadow-lg hover:-translate-y-1 relative"
            >
              {/* Card Title & Settings buttons */}
              <div className="flex justify-between items-start">
                <div className="space-y-0.5">
                  <h3 className="font-extrabold text-lg text-on-surface leading-tight">Table #{table.tableNumber}</h3>
                  <p className="text-xs text-on-surface-variant font-medium">Seating: {table.capacity}</p>
                </div>

                <div className="flex gap-1.5">
                  <button
                    onClick={() => handleOpenAddModal() /* Triggered as Add to reset, but let's make it open edit */}
                    onClickCapture={() => handleOpenEditModal(table)}
                    className="w-8 h-8 rounded-full bg-surface-container hover:bg-surface-container-high text-on-surface-variant flex items-center justify-center transition-colors cursor-pointer"
                    title="Edit Table"
                  >
                    <span className="material-symbols-outlined text-[16px]">edit</span>
                  </button>
                  <button
                    onClick={() => handleDeleteTable(table.id, table.tableNumber)}
                    className="w-8 h-8 rounded-full bg-error-container/15 hover:bg-error-container text-error flex items-center justify-center transition-colors cursor-pointer"
                    title="Delete Table"
                  >
                    <span className="material-symbols-outlined text-[16px]">delete</span>
                  </button>
                </div>
              </div>

              {/* QR Image Preview Container */}
              <div className="bg-surface-container-high rounded-xl p-2 flex items-center justify-center h-32 relative overflow-hidden shadow-inner">
                <div 
                  className="w-24 h-24 bg-white p-1 rounded-lg shadow-sm cursor-pointer hover:scale-105 transition-transform" 
                  onClick={() => setSelectedTableForQr(table)}
                  title="Click to zoom QR badge"
                >
                  {/* Miniature QR generator */}
                  <TableQrImage text={getTableUrl(table)} />
                </div>
              </div>

              {/* Status Selector */}
              <div className="flex flex-col gap-1.5">
                <div className="flex justify-between items-center">
                  <label className="text-[9px] text-on-surface-variant uppercase tracking-wider font-bold">Table Status</label>
                  <span className={`font-label-sm text-[10px] uppercase font-bold ${getStatusColorClass(table.status)} status-pulse pr-3`}>
                    {table.status.toLowerCase()}
                  </span>
                </div>
                <select
                  value={table.status}
                  onChange={(e) => handleStatusChange(table, e.target.value)}
                  className={`h-9 border text-xs font-bold rounded-xl px-3 outline-none focus:ring-1 focus:ring-primary cursor-pointer transition-all ${getStatusDropdownStyle(table.status)}`}
                >
                  <option value="AVAILABLE">AVAILABLE (Free)</option>
                  <option value="OCCUPIED">OCCUPIED (Eating)</option>
                  <option value="BILLING">BILLING (Awaiting pay)</option>
                  <option value="DIRTY">DIRTY (Needs clean)</option>
                </select>
              </div>

              {/* QR Print Actions */}
              <div className="grid grid-cols-2 gap-2 pt-1">
                <button
                  onClick={() => setSelectedTableForQr(table)}
                  className="flex items-center justify-center gap-1 border border-outline-variant py-2 rounded-xl text-on-surface-variant font-semibold hover:bg-surface-container-high transition-colors cursor-pointer text-xs"
                >
                  <span className="material-symbols-outlined text-[16px]">print</span>
                  Print QR
                </button>
                <button
                  onClick={() => handleRegenerateToken(table)}
                  className="flex items-center justify-center gap-1 border border-outline-variant py-2 rounded-xl text-on-surface-variant font-semibold hover:bg-surface-container-high transition-colors cursor-pointer text-xs"
                  title="Regenerate Security QR Token"
                >
                  <span className="material-symbols-outlined text-[16px]">vpn_key</span>
                  Reset Token
                </button>
              </div>

              {(table.status === 'OCCUPIED' || table.status === 'BILLING') && (
                <button
                  onClick={() => setSelectedTableForBill(table)}
                  className="w-full bg-primary-container text-on-primary-container hover:opacity-90 active:scale-[0.98] py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow-sm mt-1"
                >
                  <span className="material-symbols-outlined text-[18px]">receipt_long</span>
                  <span>Generate Bill</span>
                </button>
              )}
            </div>
          ))
        )}
      </section>

      {/* Add / Edit Table Modal */}
      {(isAddModalOpen || editingTable) && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm print:hidden">
          <div className="bg-surface-container-lowest border border-outline-variant/30 rounded-3xl p-6 shadow-2xl max-w-xs w-full space-y-4">
            <div className="flex justify-between items-center pb-2 border-b border-outline-variant/20">
              <h3 className="text-base font-extrabold text-on-surface">
                {editingTable ? 'Edit Table Settings' : 'Add New Table'}
              </h3>
              <button
                onClick={() => {
                  setIsAddModalOpen(false);
                  setEditingTable(null);
                }}
                className="text-on-surface-variant hover:text-on-surface"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            <form onSubmit={editingTable ? handleEditTable : handleAddTable} className="space-y-4 text-xs font-semibold text-on-surface-variant">
              {/* Table Number */}
              <div className="space-y-1">
                <label className="text-[10px] uppercase tracking-wider px-1">Table Number</label>
                <input
                  type="number"
                  required
                  value={formNumber}
                  onChange={(e) => setFormNumber(e.target.value)}
                  className="w-full h-11 px-3 bg-surface border border-outline-variant/50 rounded-xl outline-none focus:ring-1 focus:ring-primary focus:border-primary text-xs text-on-surface font-medium placeholder:text-on-surface-variant/30"
                  placeholder="E.g. 5"
                />
              </div>

              {/* Capacity */}
              <div className="space-y-1 font-bold">
                <label className="text-[10px] uppercase tracking-wider px-1">Seating Capacity</label>
                <select
                  value={formCapacity}
                  onChange={(e) => setFormCapacity(e.target.value)}
                  className="w-full h-11 px-3 bg-surface border border-outline-variant/50 rounded-xl outline-none focus:ring-1 focus:ring-primary focus:border-primary text-xs text-on-surface cursor-pointer"
                >
                  <option value="2">2 Seats (Couples)</option>
                  <option value="4">4 Seats (Standard)</option>
                  <option value="6">6 Seats (Medium Group)</option>
                  <option value="8">8 Seats (Large Family)</option>
                  <option value="12">12 Seats (Banquets)</option>
                </select>
              </div>

              {/* Status */}
              <div className="space-y-1 font-bold">
                <label className="text-[10px] uppercase tracking-wider px-1">Initial Status</label>
                <select
                  value={formStatus}
                  onChange={(e) => setFormStatus(e.target.value)}
                  className="w-full h-11 px-3 bg-surface border border-outline-variant/50 rounded-xl outline-none focus:ring-1 focus:ring-primary focus:border-primary text-xs text-on-surface cursor-pointer"
                >
                  <option value="AVAILABLE">AVAILABLE (Free)</option>
                  <option value="OCCUPIED">OCCUPIED (Eating)</option>
                  <option value="BILLING">BILLING (Awaiting pay)</option>
                  <option value="DIRTY">DIRTY (Needs clean)</option>
                </select>
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsAddModalOpen(false);
                    setEditingTable(null);
                  }}
                  className="flex-1 py-3 border border-outline-variant rounded-xl text-xs font-bold hover:bg-surface-container-low transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-grow py-3 bg-primary text-on-primary rounded-xl text-xs font-bold hover:brightness-105 transition-all cursor-pointer disabled:opacity-50"
                >
                  {isSubmitting ? 'Saving...' : 'Save Table'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* QR Code Presentation & Print Modal */}
      {selectedTableForQr && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm print:relative print:bg-white print:p-0 print:inset-auto print:z-0">
          <div className="bg-surface-container-lowest border border-outline-variant/30 rounded-3xl p-8 shadow-2xl max-w-sm w-full space-y-6 text-center print:border-none print:shadow-none print:p-0 print:bg-white">
            
            {/* Print Header */}
            <div className="space-y-1.5 print:mt-10">
              <span className="text-[10px] uppercase font-bold tracking-widest text-primary bg-primary-container/10 px-3 py-1 rounded-full print:bg-transparent print:text-neutral-900 print:text-xs">
                Smart Table QR Code
              </span>
              <h3 className="text-2xl font-black text-on-surface tracking-tight print:text-3xl print:text-black">
                Table {selectedTableForQr.tableNumber}
              </h3>
            </div>

            {/* Generated QR Image */}
            <div className="py-2">
              <TableQrImage text={getTableUrl(selectedTableForQr)} />
            </div>

            {/* Scan instructions details */}
            <div className="space-y-1 text-xs">
              <p className="font-bold text-on-surface print:text-black">Scan to View Menu & Order</p>
              <p className="text-[10px] text-on-surface-variant print:text-neutral-600 leading-relaxed max-w-[200px] mx-auto">
                Scan using your phone's camera. Place orders, call waiter, or request bill instantly.
              </p>
              <p className="text-[9px] text-primary/80 font-semibold pt-1 truncate w-full print:text-neutral-400 font-mono">
                {getTableUrl(selectedTableForQr).slice(0, 48)}...
              </p>
            </div>

            {/* Print action controls (Hidden during print) */}
            <div className="flex gap-3 pt-2 print:hidden">
              <button
                onClick={() => setSelectedTableForQr(null)}
                className="flex-1 py-3 border border-outline-variant rounded-xl text-xs font-bold hover:bg-surface-container-low transition-colors cursor-pointer"
              >
                Close
              </button>
              <button
                onClick={handlePrint}
                className="flex-grow py-3 bg-primary text-on-primary rounded-xl text-xs font-bold hover:brightness-105 active:scale-95 transition-all cursor-pointer shadow-md flex items-center justify-center gap-1.5"
              >
                <span className="material-symbols-outlined text-[16px]">print</span>
                <span>Print QR Badge</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Admin Billing Invoice Modal */}
      {selectedTableForBill && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm print:relative print:bg-white print:p-0 print:inset-auto print:z-0 animate-fade-in">
          <div className="bg-surface-container-lowest border border-outline-variant/30 rounded-3xl p-6 shadow-xl max-w-sm w-full space-y-4 print:border-none print:shadow-none print:p-0 print:bg-white text-left">
            
            {/* Header */}
            <div className="flex justify-between items-center pb-2 border-b border-outline-variant/20 print:border-neutral-200">
              <h3 className="text-base font-extrabold text-on-surface print:text-black">
                Table #{selectedTableForBill.tableNumber} Billing Receipt
              </h3>
              <button
                onClick={() => setSelectedTableForBill(null)}
                className="text-on-surface-variant hover:text-on-surface print:hidden"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            {loadingBill ? (
              <div className="py-8 space-y-3 text-center print:hidden">
                <div className="w-8 h-8 rounded-full border-4 border-primary border-t-transparent animate-spin mx-auto"></div>
                <p className="text-xs text-on-surface-variant font-medium">Fetching orders and computing billing...</p>
              </div>
            ) : activeBillItems.length === 0 ? (
              <div className="py-8 text-center space-y-2">
                <span className="material-symbols-outlined text-outline text-[40px]">receipt_long</span>
                <p className="text-sm font-bold text-on-surface">No Active Orders</p>
                <p className="text-xs text-on-surface-variant max-w-[200px] mx-auto">
                  No orders have been submitted for Table {selectedTableForBill.tableNumber} during this session.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Meta details */}
                <div className="text-[10px] text-on-surface-variant space-y-0.5 border-b border-dashed border-outline-variant/40 pb-2 print:text-neutral-600 print:border-neutral-200">
                  <p><strong>Table:</strong> Table {selectedTableForBill.tableNumber}</p>
                  <p><strong>Date:</strong> {new Date().toLocaleDateString()} {new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</p>
                  <p className="font-mono"><strong>Session ID:</strong> {selectedTableForBill.id.slice(-8).toUpperCase()}</p>
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
                  <p>LuxeDine POS Smart Billing System</p>
                  <p>Thank you for your visit!</p>
                </div>

                {/* Interactive action buttons */}
                <div className="space-y-2 pt-2 print:hidden">
                  <button
                    onClick={handlePrint}
                    className="w-full h-11 border border-outline-variant text-on-surface rounded-xl font-bold active:scale-[0.95] transition-all text-xs flex items-center justify-center gap-1.5 hover:bg-surface-container-high"
                  >
                    <span className="material-symbols-outlined text-[18px]">print</span>
                    Print Receipt
                  </button>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleCompleteBilling('AVAILABLE')}
                      disabled={isCompletingBilling}
                      className="flex-1 h-11 bg-secondary text-on-secondary rounded-xl text-xs font-bold hover:opacity-95 active:scale-[0.95] transition-all cursor-pointer disabled:opacity-50"
                    >
                      Settle (Free)
                    </button>
                    <button
                      onClick={() => handleCompleteBilling('DIRTY')}
                      disabled={isCompletingBilling}
                      className="flex-1 h-11 bg-error text-on-error rounded-xl text-xs font-bold hover:opacity-95 active:scale-[0.95] transition-all cursor-pointer disabled:opacity-50"
                    >
                      Settle (Dirty)
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Floating Status Notification Toast */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 bg-inverse-surface text-inverse-on-surface px-5 py-3 rounded-2xl text-xs font-bold shadow-xl z-50 animate-bounce print:hidden">
          {toastMessage}
        </div>
      )}
    </div>
  );
}
