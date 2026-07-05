'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface Category {
  id: string;
  name: string;
}

interface MenuItem {
  id: string;
  categoryId: string;
  name: string;
  description: string;
  image: string | null;
  price: number;
  isVeg: boolean;
  available: boolean;
  category: Category;
}

interface MenuManagementClientProps {
  initialCategories: Category[];
  initialMenuItems: MenuItem[];
}

export default function MenuManagementClient({
  initialCategories,
  initialMenuItems,
}: MenuManagementClientProps) {
  const router = useRouter();

  // State
  const [categories, setCategories] = useState<Category[]>(initialCategories);
  const [menuItems, setMenuItems] = useState<MenuItem[]>(initialMenuItems);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  
  // Modals state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);

  // Form states
  const [formName, setFormName] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formPrice, setFormPrice] = useState('');
  const [formCategoryId, setFormCategoryId] = useState('');
  const [formIsVeg, setFormIsVeg] = useState(true);
  const [formAvailable, setFormAvailable] = useState(true);
  const [formImage, setFormImage] = useState('');
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const handleCreateCategoryPrompt = async () => {
    const name = prompt("Enter the name of the new category:");
    if (!name || !name.trim()) return;

    try {
      const res = await fetch('/api/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim() }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Failed to create category');
      }

      const newCategory = await res.json();
      setCategories((prev) => [...prev, newCategory].sort((a, b) => a.name.localeCompare(b.name)));
      setFormCategoryId(newCategory.id);
      setToastMessage(`Category "${newCategory.name}" created successfully!`);
    } catch (err: any) {
      console.error(err);
      alert(err.message || 'Failed to create category. It may already exist.');
    }
  };

  const handleDeleteCategoryClick = async () => {
    if (!formCategoryId) {
      alert("No category selected.");
      return;
    }
    const catToDelete = categories.find(c => c.id === formCategoryId);
    if (!catToDelete) return;

    const confirmed = confirm(
      `⚠️ WARNING: Are you sure you want to delete the category "${catToDelete.name}"?\n\nDeleting this category will permanently delete ALL menu items belonging to it! This action cannot be undone.`
    );
    if (!confirmed) return;

    try {
      const res = await fetch(`/api/categories?id=${formCategoryId}`, {
        method: 'DELETE',
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Failed to delete category');
      }

      setCategories((prev) => prev.filter((c) => c.id !== formCategoryId));
      setToastMessage(`Category "${catToDelete.name}" and its menu items deleted successfully.`);
      router.refresh();
    } catch (err: any) {
      console.error(err);
      alert(err.message || 'Failed to delete category.');
    }
  };

  // Sync category select default
  useEffect(() => {
    if (categories.length > 0) {
      setFormCategoryId(categories[0].id);
    }
  }, [categories]);

  // Toast timer
  useEffect(() => {
    if (toastMessage) {
      const timer = setTimeout(() => setToastMessage(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [toastMessage]);

  const resetForm = () => {
    setFormName('');
    setFormDescription('');
    setFormPrice('');
    if (categories.length > 0) {
      setFormCategoryId(categories[0].id);
    }
    setFormIsVeg(true);
    setFormAvailable(true);
    setFormImage('');
  };

  const handleOpenAddModal = () => {
    resetForm();
    setIsAddModalOpen(true);
  };

  const handleOpenEditModal = (item: MenuItem) => {
    setEditingItem(item);
    setFormName(item.name);
    setFormDescription(item.description);
    setFormPrice(item.price.toString());
    setFormCategoryId(item.categoryId);
    setFormIsVeg(item.isVeg);
    setFormAvailable(item.available);
    setFormImage(item.image || '');
  };

  // Add Action
  const handleAddItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;
    setIsSubmitting(true);

    try {
      const res = await fetch('/api/admin/menu', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formName,
          description: formDescription,
          price: parseFloat(formPrice),
          categoryId: formCategoryId,
          isVeg: formIsVeg,
          available: formAvailable,
          image: formImage.trim() || null,
        }),
      });

      if (!res.ok) {
        throw new Error('Failed to create item');
      }

      const created = await res.json();
      setMenuItems((prev) => [created, ...prev]);
      setIsAddModalOpen(false);
      resetForm();
      setToastMessage(`"${created.name}" created successfully!`);
    } catch (err) {
      console.error(err);
      alert('Error creating menu item. Please verify your fields.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Edit Action
  const handleEditItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem || isSubmitting) return;
    setIsSubmitting(true);

    try {
      const res = await fetch(`/api/admin/menu/${editingItem.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formName,
          description: formDescription,
          price: parseFloat(formPrice),
          categoryId: formCategoryId,
          isVeg: formIsVeg,
          available: formAvailable,
          image: formImage.trim() || null,
        }),
      });

      if (!res.ok) {
        throw new Error('Failed to update item');
      }

      const updated = await res.json();
      setMenuItems((prev) => prev.map((item) => (item.id === updated.id ? updated : item)));
      setEditingItem(null);
      resetForm();
      setToastMessage(`"${updated.name}" updated successfully!`);
    } catch (err) {
      console.error(err);
      alert('Error updating menu item.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Delete Action
  const handleDeleteItem = async (itemId: string, name: string) => {
    if (!confirm(`Are you sure you want to delete "${name}"?`)) return;

    try {
      const res = await fetch(`/api/admin/menu/${itemId}`, {
        method: 'DELETE',
      });

      if (!res.ok) {
        throw new Error('Failed to delete item');
      }

      setMenuItems((prev) => prev.filter((item) => item.id !== itemId));
      setToastMessage(`"${name}" deleted.`);
    } catch (err) {
      console.error(err);
      alert('Failed to delete item.');
    }
  };

  // Toggle Availability directly
  const handleToggleAvailable = async (item: MenuItem) => {
    const updatedStatus = !item.available;
    try {
      // Optimistic update
      setMenuItems((prev) =>
        prev.map((i) => (i.id === item.id ? { ...i, available: updatedStatus } : i))
      );

      const res = await fetch(`/api/admin/menu/${item.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ available: updatedStatus }),
      });

      if (!res.ok) {
        throw new Error('Failed to update availability');
      }
    } catch (err) {
      console.error(err);
      // Revert status
      setMenuItems((prev) =>
        prev.map((i) => (i.id === item.id ? { ...i, available: item.available } : i))
      );
      alert('Failed to update availability.');
    }
  };

  // Filters
  const filteredItems = menuItems.filter((item) => {
    const matchesSearch =
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'All' || item.category.name === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;
  const totalPages = Math.ceil(filteredItems.length / itemsPerPage) || 1;

  useEffect(() => {
    // Reset to page 1 on filter or search changes
    setCurrentPage(1);
  }, [searchQuery, selectedCategory]);

  const currentItems = filteredItems.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  return (
    <div className="flex-1 flex flex-col p-4 md:p-6 space-y-6">
      {/* Switch Toggle styles injected locally */}
      <style dangerouslySetInnerHTML={{__html: `
        .switch {
          position: relative;
          display: inline-block;
          width: 44px;
          height: 24px;
        }
        .switch input { opacity: 0; width: 0; height: 0; }
        .slider {
          position: absolute;
          cursor: pointer;
          top: 0; left: 0; right: 0; bottom: 0;
          background-color: #e1bfb5;
          transition: .4s;
          border-radius: 24px;
        }
        .slider:before {
          position: absolute;
          content: "";
          height: 18px;
          width: 18px;
          left: 3px;
          bottom: 3px;
          background-color: white;
          transition: .4s;
          border-radius: 50%;
        }
        input:checked + .slider { background-color: #ff6b35; }
        input:checked + .slider:before { transform: translateX(20px); }
      `}} />

      {/* Header */}
      <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 shrink-0 mt-16 md:mt-0">
        <div>
          <h1 className="text-2xl font-black text-on-surface tracking-tight">Menu Editor</h1>
          <p className="text-xs text-on-surface-variant font-medium mt-0.5 font-sans">
            Add, update, or remove dishes from the digital menu in real-time
          </p>
        </div>
        <button
          onClick={handleOpenAddModal}
          className="bg-primary text-on-primary hover:opacity-90 active:scale-95 px-5 py-2.5 rounded-xl flex items-center gap-2 text-xs font-bold transition-all cursor-pointer shadow-md"
        >
          <span className="material-symbols-outlined text-[18px]">add_circle</span>
          <span>Add New Dish</span>
        </button>
      </header>

      {/* Filters & Search bar */}
      <section className="flex flex-col md:flex-row gap-3">
        {/* Search */}
        <div className="relative flex-grow">
          <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant/60 text-[20px]">
            search
          </span>
          <input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full h-11 bg-surface-container-low border border-outline-variant/40 rounded-xl pl-11 pr-4 text-xs font-semibold focus:ring-1 focus:ring-primary focus:border-primary outline-none transition-all placeholder:text-on-surface-variant/40"
            placeholder="Search items by name or keywords..."
            type="text"
          />
        </div>

        {/* Category selector */}
        <select
          value={selectedCategory}
          onChange={(e) => setSelectedCategory(e.target.value)}
          className="h-11 bg-surface-container-low border border-outline-variant/40 rounded-xl px-4 text-xs font-bold outline-none focus:ring-1 focus:ring-primary focus:border-primary transition-all cursor-pointer text-on-surface"
        >
          <option value="All">All Categories</option>
          {categories.map((cat) => (
            <option key={cat.id} value={cat.name}>
              {cat.name}
            </option>
          ))}
        </select>
      </section>

      {/* Data Table */}
      <section className="flex-grow overflow-hidden flex flex-col">
        {filteredItems.length === 0 ? (
          <div className="text-center py-20 bg-surface-container-lowest border border-outline-variant/30 rounded-3xl space-y-3 shadow-sm flex-grow flex flex-col justify-center items-center">
            <span className="material-symbols-outlined text-outline text-[48px]">no_meals</span>
            <h3 className="text-sm font-bold text-on-surface">No Menu Items Found</h3>
            <p className="text-xs text-on-surface-variant max-w-[240px] mx-auto leading-relaxed">
              Create a new dish or adjust your filters to see items.
            </p>
          </div>
        ) : (
          <div className="bg-surface-container-lowest rounded-xl shadow-sm overflow-hidden border border-outline-variant flex flex-col flex-grow">
            <div className="overflow-x-auto flex-grow custom-scrollbar">
              <table className="w-full text-left border-collapse min-w-[640px]">
                <thead>
                  <tr className="bg-surface-container border-b border-outline-variant">
                    <th className="px-5 py-4 text-[10px] font-bold text-on-surface-variant uppercase tracking-wider">Image</th>
                    <th className="px-5 py-4 text-[10px] font-bold text-on-surface-variant uppercase tracking-wider">Name</th>
                    <th className="px-5 py-4 text-[10px] font-bold text-on-surface-variant uppercase tracking-wider">Category</th>
                    <th className="px-5 py-4 text-[10px] font-bold text-on-surface-variant uppercase tracking-wider">Price</th>
                    <th className="px-5 py-4 text-[10px] font-bold text-on-surface-variant uppercase tracking-wider text-center">Status</th>
                    <th className="px-5 py-4 text-[10px] font-bold text-on-surface-variant uppercase tracking-wider text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-outline-variant">
                  {currentItems.map((item) => (
                    <tr key={item.id} className="hover:bg-surface-container-low transition-colors group">
                      {/* Image */}
                      <td className="px-5 py-3 whitespace-nowrap">
                        <div className="w-12 h-12 rounded-lg bg-surface-variant overflow-hidden border border-outline-variant/30 relative">
                          <img
                            className={`w-full h-full object-cover ${!item.available ? 'grayscale opacity-60' : ''}`}
                            alt={item.name}
                            src={item.image || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=100'}
                          />
                          {/* Veg/Non-veg Dot */}
                          <div className="absolute top-1 left-1 bg-white/95 rounded p-[2px] shadow-sm flex items-center justify-center">
                            <span className={`w-2 h-2 rounded-full flex items-center justify-center border-[1px] ${
                              item.isVeg ? 'border-green-600' : 'border-red-600'
                            }`}>
                              <span className={`w-1 h-1 rounded-full ${item.isVeg ? 'bg-green-600' : 'bg-red-600'}`} />
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Name */}
                      <td className="px-5 py-3 whitespace-nowrap">
                        <p className="font-bold text-sm text-on-background line-clamp-1">{item.name}</p>
                        <p className="text-[10px] text-on-surface-variant font-medium max-w-[200px] truncate">{item.description}</p>
                      </td>

                      {/* Category */}
                      <td className="px-5 py-3 whitespace-nowrap">
                        <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-extrabold uppercase tracking-wider ${
                          item.category.name === 'Starters' ? 'bg-surface-container-high text-on-surface-variant' :
                          item.category.name === 'Main Course' ? 'bg-secondary-container text-on-secondary-container' :
                          item.category.name === 'Desserts' ? 'bg-tertiary-container/20 text-tertiary' :
                          'bg-primary-container/10 text-primary'
                        }`}>
                          {item.category.name}
                        </span>
                      </td>

                      {/* Price */}
                      <td className="px-5 py-3 whitespace-nowrap font-extrabold text-sm text-primary">
                        ₹{item.price.toFixed(2)}
                      </td>

                      {/* Toggle status switch */}
                      <td className="px-5 py-3 whitespace-nowrap text-center">
                        <label className="switch">
                          <input
                            type="checkbox"
                            checked={item.available}
                            onChange={() => handleToggleAvailable(item)}
                          />
                          <span className="slider"></span>
                        </label>
                      </td>

                      {/* Edit/Delete Actions */}
                      <td className="px-5 py-3 whitespace-nowrap text-right space-x-2">
                        <button
                          onClick={() => handleOpenEditModal(item)}
                          className="p-1.5 rounded-full hover:bg-surface-container-high text-on-surface-variant hover:text-primary transition-colors cursor-pointer active:scale-90"
                          title="Edit Dish"
                        >
                          <span className="material-symbols-outlined text-[18px]">edit</span>
                        </button>
                        <button
                          onClick={() => handleDeleteItem(item.id, item.name)}
                          className="p-1.5 rounded-full hover:bg-error-container/20 text-on-surface-variant hover:text-error transition-colors cursor-pointer active:scale-90"
                          title="Delete Dish"
                        >
                          <span className="material-symbols-outlined text-[18px]">delete</span>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            <div className="bg-surface-container px-5 py-3.5 flex items-center justify-between border-t border-outline-variant flex-shrink-0">
              <button
                onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
                disabled={currentPage === 1}
                className="flex items-center gap-1 text-on-surface-variant hover:text-primary disabled:opacity-40 transition-colors font-bold text-xs cursor-pointer"
              >
                <span className="material-symbols-outlined text-[16px]">chevron_left</span>
                <span>Previous</span>
              </button>
              
              <div className="flex items-center gap-1">
                {Array.from({ length: totalPages }).map((_, i) => {
                  const pg = i + 1;
                  const isCurrent = pg === currentPage;
                  return (
                    <button
                      key={pg}
                      onClick={() => setCurrentPage(pg)}
                      className={`w-7 h-7 rounded-full text-xs font-bold transition-all cursor-pointer ${
                        isCurrent 
                          ? 'bg-primary text-on-primary shadow-sm' 
                          : 'hover:bg-surface-container-high text-on-surface-variant'
                      }`}
                    >
                      {pg}
                    </button>
                  );
                })}
              </div>

              <button
                onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
                disabled={currentPage === totalPages}
                className="flex items-center gap-1 text-on-surface-variant hover:text-primary disabled:opacity-40 transition-colors font-bold text-xs cursor-pointer"
              >
                <span>Next</span>
                <span className="material-symbols-outlined text-[16px]">chevron_right</span>
              </button>
            </div>
          </div>
        )}
      </section>

      {/* Add / Edit Dish Modal */}
      {(isAddModalOpen || editingItem) && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-surface-container-lowest border border-outline-variant/30 rounded-3xl p-6 shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto no-scrollbar space-y-4">
            <div className="flex justify-between items-center pb-2 border-b border-outline-variant/20">
              <h3 className="text-base font-extrabold text-on-surface">
                {editingItem ? 'Edit Menu Item' : 'Add New Menu Item'}
              </h3>
              <button
                onClick={() => {
                  setIsAddModalOpen(false);
                  setEditingItem(null);
                }}
                className="text-on-surface-variant hover:text-on-surface"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            <form onSubmit={editingItem ? handleEditItem : handleAddItem} className="space-y-4 text-xs font-semibold text-on-surface-variant">
              {/* Name */}
              <div className="space-y-1">
                <label className="text-[10px] uppercase tracking-wider px-1">Dish Name</label>
                <input
                  type="text"
                  required
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className="w-full h-11 px-3 bg-surface border border-outline-variant/50 rounded-xl outline-none focus:ring-1 focus:ring-primary focus:border-primary text-xs text-on-surface font-medium placeholder:text-on-surface-variant/30"
                  placeholder="E.g. Truffle Ribeye Steak"
                />
              </div>

              {/* Category */}
              <div className="space-y-1">
                <div className="flex justify-between items-center px-1">
                  <label className="text-[10px] uppercase tracking-wider">Category</label>
                  <div className="flex gap-2.5">
                    <button
                      type="button"
                      onClick={handleCreateCategoryPrompt}
                      className="text-[10px] text-primary hover:underline font-bold flex items-center gap-0.5 cursor-pointer bg-transparent border-none outline-none"
                    >
                      <span className="material-symbols-outlined text-[12px] font-bold">add</span>
                      <span>Create</span>
                    </button>
                    {categories.length > 0 && (
                      <button
                        type="button"
                        onClick={handleDeleteCategoryClick}
                        className="text-[10px] text-error hover:underline font-bold flex items-center gap-0.5 cursor-pointer bg-transparent border-none outline-none"
                      >
                        <span className="material-symbols-outlined text-[12px] font-bold">delete</span>
                        <span>Delete</span>
                      </button>
                    )}
                  </div>
                </div>
                <select
                  value={formCategoryId}
                  onChange={(e) => setFormCategoryId(e.target.value)}
                  className="w-full h-11 px-3 bg-surface border border-outline-variant/50 rounded-xl outline-none focus:ring-1 focus:ring-primary focus:border-primary text-xs font-bold text-on-surface cursor-pointer"
                >
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Price & Image Grid */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] uppercase tracking-wider px-1">Price (₹)</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={formPrice}
                    onChange={(e) => setFormPrice(e.target.value)}
                    className="w-full h-11 px-3 bg-surface border border-outline-variant/50 rounded-xl outline-none focus:ring-1 focus:ring-primary focus:border-primary text-xs text-on-surface font-medium placeholder:text-on-surface-variant/30"
                    placeholder="0.00"
                  />
                </div>

                <div className="space-y-1 font-bold">
                  <label className="text-[10px] uppercase tracking-wider px-1">Diet Type</label>
                  <select
                    value={formIsVeg ? 'veg' : 'nonveg'}
                    onChange={(e) => setFormIsVeg(e.target.value === 'veg')}
                    className="w-full h-11 px-3 bg-surface border border-outline-variant/50 rounded-xl outline-none focus:ring-1 focus:ring-primary focus:border-primary text-xs text-on-surface cursor-pointer"
                  >
                    <option value="veg">Vegetarian (Veg)</option>
                    <option value="nonveg">Non-Vegetarian</option>
                  </select>
                </div>
              </div>

              {/* Description */}
              <div className="space-y-1">
                <label className="text-[10px] uppercase tracking-wider px-1">Description</label>
                <textarea
                  required
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  className="w-full p-3 bg-surface border border-outline-variant/50 rounded-xl outline-none focus:ring-1 focus:ring-primary focus:border-primary text-xs text-on-surface font-medium placeholder:text-on-surface-variant/30 h-16 resize-none"
                  placeholder="Brief recipe details, garnishing..."
                />
              </div>

              {/* Image URL */}
              <div className="space-y-1">
                <label className="text-[10px] uppercase tracking-wider px-1">Image URL (Optional)</label>
                <input
                  type="url"
                  value={formImage}
                  onChange={(e) => setFormImage(e.target.value)}
                  className="w-full h-11 px-3 bg-surface border border-outline-variant/50 rounded-xl outline-none focus:ring-1 focus:ring-primary focus:border-primary text-xs text-on-surface font-medium placeholder:text-on-surface-variant/30"
                  placeholder="https://..."
                />
              </div>

              {/* Available Checkbox */}
              <div className="pt-1 flex items-center px-1 font-bold">
                <label className="flex items-center cursor-pointer group">
                  <input
                    type="checkbox"
                    checked={formAvailable}
                    onChange={(e) => setFormAvailable(e.target.checked)}
                    className="rounded border-outline-variant text-primary focus:ring-primary w-4.5 h-4.5 mr-2 accent-primary cursor-pointer"
                  />
                  <span className="text-on-surface-variant group-hover:text-on-surface transition-colors font-medium">
                    Dish is available in stock immediately
                  </span>
                </label>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => {
                    setIsAddModalOpen(false);
                    setEditingItem(null);
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
                  {isSubmitting ? 'Saving...' : 'Save Dish Details'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Floating Status Notification Toast */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 bg-inverse-surface text-inverse-on-surface px-5 py-3 rounded-2xl text-xs font-bold shadow-xl z-50 animate-bounce">
          {toastMessage}
        </div>
      )}
    </div>
  );
}
