import React, { useState, useMemo } from 'react';
import { 
  Plus, 
  Search, 
  Trash2, 
  Edit, 
  Loader2, 
  TrendingUp, 
  Package, 
  ShoppingBag, 
  ArrowRight,
  Download,
  Copy,
  LayoutGrid,
  CheckCircle,
  AlertCircle,
  Maximize2,
  Star,
  ClipboardList,
  User as UserIcon,
  Settings
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ClothingItem, Order } from '../../core/types';
import { ProductForm } from './ProductForm';
import { CatalogService } from '../../services/api';

interface AdminDashboardProps {
  items: ClothingItem[];
  orders: Order[];
  onDeleteItem: (id: string) => void;
  onUpdateOrderStatus: (orderId: string, status: string) => void;
  isBulkDeleting: boolean;
  selectedProductIds: string[];
  setSelectedProductIds: React.Dispatch<React.SetStateAction<string[]>>;
  onBulkDeleteProducts: () => void;
  selectedOrderIds: string[];
  setSelectedOrderIds: React.Dispatch<React.SetStateAction<string[]>>;
  onBulkDeleteOrders: () => void;
  homepageSettings?: any;
  onUpdateHomepage?: (settings: any) => Promise<void>;
  sequentialItems: ClothingItem[];
  onAddItem: () => void;
  onEditItem: (item: ClothingItem) => void;
  onDeleteOrder: (id: string) => void;
  onExportInventory: () => void;
  onExportOrders: () => void;
  onMoveProduct: (item: ClothingItem, position: 'top' | 'bottom') => void;
}

export function AdminDashboard({
  items,
  orders,
  onDeleteItem,
  onUpdateOrderStatus,
  isBulkDeleting,
  selectedProductIds,
  setSelectedProductIds,
  onBulkDeleteProducts,
  selectedOrderIds,
  setSelectedOrderIds,
  onBulkDeleteOrders,
  homepageSettings,
  onUpdateHomepage,
  sequentialItems,
  onAddItem,
  onEditItem,
  onDeleteOrder,
  onExportInventory,
  onExportOrders,
  onMoveProduct
}: AdminDashboardProps) {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [inventoryView, setInventoryView] = useState<'grid' | 'table'>('table');
  const [adminSearchQuery, setAdminSearchQuery] = useState('');
  const [editingItem, setEditingItem] = useState<ClothingItem | null | undefined>(undefined);

  const toggleSelectOrder = (id: string) => {
    setSelectedOrderIds(prev => 
      prev.includes(id) ? prev.filter(oid => oid !== id) : [...prev, id]
    );
  };

  const toggleSelectAllOrders = () => {
    if (selectedOrderIds.length === orders.length) {
      setSelectedOrderIds([]);
    } else {
      setSelectedOrderIds(orders.map(o => o.id));
    }
  };

  const stats = useMemo(() => {
    const totalSales = orders.reduce((sum, o) => sum + (o.total_amount || 0), 0);
    const pendingOrders = orders.filter(o => o.status === 'pending').length;
    const totalProducts = items.length;
    const lowStock = items.filter(i => {
      const total = i.inventory.reduce((s, inv) => s + inv.quantity, 0);
      return total > 0 && total < 10;
    }).length;

    return { totalSales, pendingOrders, totalProducts, lowStock };
  }, [items, orders]);

  const nextProductCode = useMemo(() => {
    const lizCodes = items
      .map(i => i.product_code || '')
      .filter(code => code.startsWith('LIZ-'))
      .map(code => {
        const numPart = code.replace('LIZ-', '');
        return parseInt(numPart, 10);
      })
      .filter(num => !isNaN(num));
    
    const nextNum = lizCodes.length > 0 ? Math.max(...lizCodes) + 1 : 1;
    return `LIZ-${String(nextNum).padStart(3, '0')}`;
  }, [items]);

  const SidebarItem = ({ id, label, icon: Icon }: { id: string, label: string, icon?: any }) => (
    <button
      onClick={() => setActiveTab(id)}
      className={`w-full flex items-center gap-3 px-6 py-3 rounded-2xl transition-all ${
        activeTab === id 
          ? 'bg-[#ffeef6] text-[#c2185b] font-bold' 
          : 'text-neutral-500 hover:bg-neutral-50 dark:hover:bg-neutral-800'
      }`}
    >
      {Icon && <Icon className="w-5 h-5" />}
      <span className="text-sm">{label}</span>
    </button>
  );

  return (
    <div className="flex min-h-screen bg-[#f8f9fa] dark:bg-neutral-950">
      {/* Sidebar */}
      <div className="w-72 bg-white dark:bg-neutral-900 border-r dark:border-neutral-800 p-8 flex flex-col gap-8">
        <div>
          <h1 className="text-2xl font-black text-[#c2185b] tracking-tight">Dress Admin</h1>
          <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest mt-1">3 Piece Dress Store Dashboard</p>
        </div>

        <nav className="space-y-1">
          <SidebarItem id="dashboard" label="Dashboard" icon={LayoutGrid} />
          <SidebarItem id="inventory" label="All Dresses" icon={ShoppingBag} />
          <SidebarItem id="add-dress" label="Add New Dress" icon={Plus} />
          <SidebarItem id="settings" label="Categories" icon={Package} />
          <SidebarItem id="orders" label="Orders" icon={ClipboardList} />
          <SidebarItem id="customers" label="Customers" icon={UserIcon} />
          <SidebarItem id="settings-global" label="Settings" icon={Settings} />
        </nav>
      </div>

      {/* Main Content */}
      <div className="flex-1 p-12 overflow-y-auto">
        {editingItem !== undefined && (
          <ProductForm 
            item={editingItem}
            onSave={CatalogService.saveProduct}
            onClose={() => setEditingItem(undefined)}
            suggestedCode={nextProductCode}
          />
        )}

        <div className="flex justify-between items-start mb-12">
          <div>
            <h2 className="text-3xl font-black text-neutral-900 dark:text-white tracking-tight">Dress Management Panel</h2>
            <p className="text-neutral-500 dark:text-neutral-400 mt-1">Manage products, pricing, categories & stock easily.</p>
          </div>
          <Button 
            className="bg-[#c2185b] hover:bg-[#ad1457] text-white rounded-2xl px-8 h-14 font-black text-sm shadow-lg shadow-[#c2185b]/20"
            onClick={() => setActiveTab('add-dress')}
          >
            + Add New Dress
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-12">
          <Card className="rounded-3xl border-none shadow-sm dark:bg-neutral-900">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-bold text-neutral-400 uppercase tracking-widest">Total Dresses</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-4xl font-black text-neutral-900 dark:text-white">{stats.totalProducts}</div>
            </CardContent>
          </Card>
          <Card className="rounded-3xl border-none shadow-sm dark:bg-neutral-900">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-bold text-neutral-400 uppercase tracking-widest">Total Orders</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-4xl font-black text-neutral-900 dark:text-white">{orders.length}</div>
              <p className="text-[10px] text-neutral-400 font-bold mt-1 uppercase tracking-tight">
                Total: ৳{stats.totalSales.toLocaleString()}
              </p>
            </CardContent>
          </Card>
          <Card className="rounded-3xl border-none shadow-sm dark:bg-neutral-900">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-bold text-neutral-400 uppercase tracking-widest">Low Stock Items</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-4xl font-black text-neutral-900 dark:text-white">{stats.lowStock}</div>
            </CardContent>
          </Card>
          <Card className="rounded-3xl border-none shadow-sm dark:bg-neutral-900">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-bold text-neutral-400 uppercase tracking-widest">Revenue</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-4xl font-black text-neutral-900 dark:text-white flex items-baseline gap-1">
                <span className="text-2xl">৳</span>
                {stats.totalSales.toLocaleString()}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="bg-white dark:bg-neutral-900 rounded-[2.5rem] p-10 shadow-sm border dark:border-neutral-800">
          {activeTab === 'dashboard' && (
            <div className="space-y-8">
              <div className="flex justify-between items-center">
                <h3 className="text-xl font-black tracking-tight text-neutral-900 dark:text-white">Recent Activity</h3>
                <Button variant="ghost" className="text-neutral-400 hover:text-neutral-900 dark:hover:text-white">View All <ArrowRight className="w-4 h-4 ml-2" /></Button>
              </div>
              <p className="text-neutral-400 italic">Select a tab from the sidebar to manage specific sections.</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="p-8 bg-[#f8f9fa] dark:bg-neutral-800/50 rounded-3xl border border-dashed border-neutral-200 dark:border-neutral-700 flex flex-col items-center justify-center text-center gap-4">
                  <ShoppingBag className="w-12 h-12 text-[#c2185b] opacity-20" />
                  <h4 className="font-bold text-neutral-900 dark:text-white">Ready to scale?</h4>
                  <p className="text-sm text-neutral-500 max-w-xs">Your boutique is growing. Add your latest collection to stay ahead.</p>
                  <Button onClick={() => setActiveTab('add-dress')} className="rounded-xl bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 px-8">Create Product</Button>
                </div>
                <div className="p-8 bg-[#f8f9fa] dark:bg-neutral-800/50 rounded-3xl border border-dashed border-neutral-200 dark:border-neutral-700 flex flex-col items-center justify-center text-center gap-4">
                  <ClipboardList className="w-12 h-12 text-[#c2185b] opacity-20" />
                  <h4 className="font-bold text-neutral-900 dark:text-white">Order Management</h4>
                  <p className="text-sm text-neutral-500 max-w-xs">Review and process customer orders to ensure timely delivery.</p>
                  <Button onClick={() => setActiveTab('orders')} variant="outline" className="rounded-xl px-8 border-neutral-200 dark:border-neutral-700">Go to Orders</Button>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'add-dress' && (
            <div className="max-w-4xl">
              <div className="mb-8">
                <h3 className="text-2xl font-black tracking-tight text-neutral-900 dark:text-white">Add / Edit Dress</h3>
                <p className="text-neutral-500">Upload dress details, pricing, stock & pictures.</p>
              </div>
              
              <ProductForm 
                onSave={CatalogService.saveProduct}
                onClose={() => setActiveTab('inventory')}
                suggestedCode={nextProductCode}
              />
            </div>
          )}

          {activeTab === 'inventory' && (
            <>
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white dark:bg-neutral-900 p-6 rounded-[2rem] border dark:border-neutral-800 shadow-sm mb-8">
             <div className="relative w-full max-w-md">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
                <Input 
                  className="pl-12 h-12 bg-neutral-50 dark:bg-neutral-800 border-none rounded-2xl text-sm" 
                  placeholder="Filter by name or artifact ID..."
                  value={adminSearchQuery}
                  onChange={(e) => setAdminSearchQuery(e.target.value)}
                />
             </div>
             
             <div className="flex items-center gap-3 w-full md:w-auto">
               <Button 
                variant="outline" 
                className="rounded-xl h-10 px-6 font-bold text-xs border-neutral-200 dark:border-neutral-800 gap-2"
                onClick={() => setEditingItem(null)}
               >
                 <Plus className="w-4 h-4" />
                 Add Product
               </Button>

               <div className="flex bg-neutral-100 dark:bg-neutral-800 p-1 rounded-xl">
                 <Button 
                   variant={inventoryView === 'table' ? 'secondary' : 'ghost'} 
                   size="sm" 
                   className="h-8 rounded-lg text-xs font-bold"
                   onClick={() => setInventoryView('table')}
                 >
                   List
                 </Button>
                 <Button 
                   variant={inventoryView === 'grid' ? 'secondary' : 'ghost'} 
                   size="sm" 
                   className="h-8 rounded-lg text-xs font-bold"
                   onClick={() => setInventoryView('grid')}
                 >
                   Grid
                 </Button>
               </div>

               {selectedProductIds.length > 0 && (
                 <div className="flex items-center gap-2">
                   <Button 
                    variant="outline" 
                    className="rounded-xl h-10 px-4 font-bold text-xs border-emerald-200 text-emerald-600 bg-emerald-50 hover:bg-emerald-100"
                    onClick={async () => {
                      for (const id of selectedProductIds) {
                        const item = items.find(i => i.id === id);
                        if (item) {
                          const updatedInventory = item.inventory.map(inv => ({ ...inv, quantity: 10 }));
                          await CatalogService.saveProduct(id, { ...item, inventory: updatedInventory });
                        }
                      }
                      setSelectedProductIds([]);
                    }}
                   >
                     <CheckCircle className="w-4 h-4 mr-2" />
                     Set Available
                   </Button>
                   <Button 
                    variant="outline" 
                    className="rounded-xl h-10 px-4 font-bold text-xs border-red-200 text-red-600 bg-red-50 hover:bg-red-100"
                    onClick={async () => {
                      for (const id of selectedProductIds) {
                        const item = items.find(i => i.id === id);
                        if (item) {
                          const updatedInventory = item.inventory.map(inv => ({ ...inv, quantity: 0 }));
                          await CatalogService.saveProduct(id, { ...item, inventory: updatedInventory });
                        }
                      }
                      setSelectedProductIds([]);
                    }}
                   >
                     <AlertCircle className="w-4 h-4 mr-2" />
                     Set Sold Out
                   </Button>
                   <Button 
                    variant="destructive" 
                    className="rounded-xl h-10 px-6 font-bold text-xs"
                    onClick={onBulkDeleteProducts}
                   >
                     <Trash2 className="w-4 h-4 mr-2" />
                     Discard ({selectedProductIds.length})
                   </Button>
                 </div>
               )}
             </div>
          </div>

          {inventoryView === 'table' ? (
            <Card className="rounded-[2rem] border-none shadow-sm overflow-hidden bg-white dark:bg-neutral-900">
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="bg-neutral-50 dark:bg-neutral-800/50 border-b dark:border-neutral-800">
                      <th className="p-6 w-12 text-center">
                        <input 
                          type="checkbox"
                          checked={selectedProductIds.length === items.length && items.length > 0}
                          onChange={() => {
                            if (selectedProductIds.length === items.length) setSelectedProductIds([]);
                            else setSelectedProductIds(items.map(i => i.id));
                          }}
                          className="w-5 h-5 rounded-lg accent-neutral-900 cursor-pointer"
                        />
                      </th>
                      <th className="p-6 text-[10px] font-black uppercase text-neutral-400 tracking-[0.2em]">Product</th>
                      <th className="p-6 text-[10px] font-black uppercase text-neutral-400 tracking-[0.2em]">Category</th>
                      <th className="p-6 text-[10px] font-black uppercase text-neutral-400 tracking-[0.2em]">Price</th>
                      <th className="p-6 text-[10px] font-black uppercase text-neutral-400 tracking-[0.2em]">Stock Status</th>
                      <th className="p-6 text-[10px] font-black uppercase text-neutral-400 tracking-[0.2em] text-right">Operations</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y dark:divide-neutral-800">
                    {items
                      .filter(i => i.name.toLowerCase().includes(adminSearchQuery.toLowerCase()) || i.product_code?.toLowerCase().includes(adminSearchQuery.toLowerCase()))
                      .map((product) => {
                        const totalStock = product.inventory.reduce((sum, inv) => sum + inv.quantity, 0);
                        const isOutOfStock = totalStock <= 0;
                        const isLowStock = totalStock > 0 && totalStock < 10;

                        return (
                          <tr key={product.id} className="hover:bg-neutral-50 dark:hover:bg-neutral-800/20 transition-all group">
                            <td className="p-6 text-center">
                              <input 
                                type="checkbox"
                                checked={selectedProductIds.includes(product.id)}
                                onChange={() => {
                                  setSelectedProductIds(prev => 
                                    prev.includes(product.id) ? prev.filter(id => id !== product.id) : [...prev, product.id]
                                  );
                                }}
                                className="w-5 h-5 rounded-lg accent-neutral-900 cursor-pointer"
                              />
                            </td>
                            <td className="p-6">
                              <div className="flex items-center gap-4">
                                <div className="h-14 w-12 rounded-xl overflow-hidden bg-neutral-100">
                                  <img src={product.image} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                                </div>
                                <div>
                                  <div className="font-bold text-neutral-900 dark:text-white group-hover:text-amber-600 transition-colors">{product.name}</div>
                                  <div className="text-[10px] font-mono text-neutral-400 uppercase tracking-widest">{product.product_code}</div>
                                </div>
                              </div>
                            </td>
                            <td className="p-6">
                              <Badge variant="outline" className="text-[10px] font-bold rounded-lg border-neutral-100 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-800/50">
                                {product.category}
                              </Badge>
                            </td>
                            <td className="p-6 font-black text-neutral-900 dark:text-white">৳{product.price}</td>
                            <td className="p-6">
                              <div className="space-y-1.5">
                                <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-tight">
                                  <span className={isOutOfStock ? 'text-red-500' : isLowStock ? 'text-amber-500' : 'text-neutral-400'}>
                                    {totalStock} Available
                                  </span>
                                  {isOutOfStock && <Badge className="bg-red-500 text-white border-0 scale-75 origin-right">Out of Stock</Badge>}
                                  {isLowStock && !isOutOfStock && <Badge className="bg-amber-500 text-white border-0 scale-75 origin-right">Low Stock</Badge>}
                                </div>
                                <div className="w-full h-1.5 bg-neutral-100 dark:bg-neutral-800 rounded-full overflow-hidden">
                                  <div 
                                    className={`h-full transition-all duration-500 ${isOutOfStock ? 'bg-red-500' : isLowStock ? 'bg-amber-500' : 'bg-neutral-900 dark:bg-white'}`}
                                    style={{ width: `${Math.min(totalStock * 2, 100)}%` }}
                                  />
                                </div>
                              </div>
                            </td>
                            <td className="p-6 text-right">
                              <div className="flex justify-end gap-2">
                                <Button 
                                  variant="ghost" 
                                  size="icon" 
                                  className={`h-10 w-10 rounded-xl transition-all ${
                                    isOutOfStock 
                                      ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/40' 
                                      : 'bg-red-100 text-red-600 dark:bg-red-900/40'
                                  }`}
                                  title={isOutOfStock ? "Restock Item (10 each)" : "Set Sold Out"}
                                  onClick={async () => {
                                    const updatedInventory = product.inventory.map(inv => ({ 
                                      ...inv, 
                                      quantity: isOutOfStock ? 10 : 0 
                                    }));
                                    await CatalogService.saveProduct(product.id, { ...product, inventory: updatedInventory });
                                  }}
                                >
                                  {isOutOfStock ? <CheckCircle className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
                                </Button>
                                <Button 
                                  variant="ghost" 
                                  size="icon" 
                                  className="h-10 w-10 text-neutral-400 hover:text-neutral-900 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-xl"
                                  onClick={() => setEditingItem(product)}
                                >
                                  <Edit className="w-4 h-4" />
                                </Button>
                                <Button 
                                  variant="ghost" 
                                  size="icon" 
                                  className={`h-10 w-10 rounded-xl transition-all ${
                                    (homepageSettings?.highlight_product_ids || []).includes(product.id)
                                      ? 'bg-amber-100 text-amber-600 dark:bg-amber-900/40 dark:text-amber-400 shadow-sm'
                                      : 'text-neutral-400 hover:text-amber-500'
                                  }`}
                                  onClick={() => {
                                    const current = homepageSettings?.highlight_product_ids || [];
                                    const updated = current.includes(product.id) 
                                      ? current.filter((id: string) => id !== product.id)
                                      : [...current, product.id];
                                    onUpdateHomepage?.({ ...homepageSettings, highlight_product_ids: updated });
                                  }}
                                >
                                  <Star className={`w-4 h-4 ${ (homepageSettings?.highlight_product_ids || []).includes(product.id) ? 'fill-current' : ''}`} />
                                </Button>
                                <Button 
                                  variant="ghost" 
                                  size="icon" 
                                  className="h-10 w-10 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 rounded-xl"
                                  onClick={() => onDeleteItem(product.id)}
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                  </tbody>
                </table>
              </div>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {items
                .filter(i => i.name.toLowerCase().includes(adminSearchQuery.toLowerCase()) || i.product_code?.toLowerCase().includes(adminSearchQuery.toLowerCase()))
                .map((product) => (
                <Card key={product.id} className="rounded-3xl overflow-hidden border-neutral-100 dark:border-neutral-800 shadow-sm group bg-white dark:bg-neutral-900">
                  <div className="relative aspect-[4/3]">
                    <img src={product.image} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                    <div className="absolute top-4 left-4">
                      <input 
                        type="checkbox"
                        checked={selectedProductIds.includes(product.id)}
                        onChange={() => {
                          setSelectedProductIds(prev => 
                            prev.includes(product.id) ? prev.filter(id => id !== product.id) : [...prev, product.id]
                          );
                        }}
                        className="w-6 h-6 rounded-lg accent-neutral-900 cursor-pointer shadow-lg"
                      />
                    </div>
                  </div>
                  <CardContent className="p-6">
                    <div className="flex justify-between mb-4">
                      <div>
                        <h4 className="font-bold text-neutral-900 dark:text-white">{product.name}</h4>
                        <p className="text-[10px] font-mono text-neutral-400 uppercase tracking-widest">{product.product_code}</p>
                      </div>
                      <div className="text-right">
                        <div className="text-lg font-black dark:text-white">৳{product.price}</div>
                        <Badge variant="outline" className="text-[10px] font-mono">{product.category}</Badge>
                      </div>
                    </div>
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm" className="flex-1 rounded-xl h-10 font-bold" onClick={() => setEditingItem(product)}>
                          <Edit className="w-4 h-4 mr-2" />
                          Edit
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className={`h-10 w-10 rounded-xl transition-all ${
                            (homepageSettings?.highlight_product_ids || []).includes(product.id)
                              ? 'bg-amber-100 text-amber-600 dark:bg-amber-900/40 dark:text-amber-400 shadow-sm'
                              : 'text-neutral-400 hover:text-amber-500'
                          }`}
                          onClick={() => {
                            const current = homepageSettings?.highlight_product_ids || [];
                            const updated = current.includes(product.id) 
                              ? current.filter((id: string) => id !== product.id)
                              : [...current, product.id];
                            onUpdateHomepage?.({ ...homepageSettings, highlight_product_ids: updated });
                          }}
                        >
                          <Star className={`w-4 h-4 ${ (homepageSettings?.highlight_product_ids || []).includes(product.id) ? 'fill-current' : ''}`} />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-10 w-10 text-red-500 hover:bg-red-50 rounded-xl" onClick={() => onDeleteItem(product.id)}>
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </>
      )}

        {activeTab === 'orders' && (
            <div className="space-y-8">
              <div className="flex justify-between items-center">
                <h3 className="text-xl font-black tracking-tight text-neutral-900 dark:text-white">Order Management</h3>
                <Button variant="outline" className="rounded-xl gap-2" onClick={onExportOrders}>
                  <Download className="w-4 h-4" /> Export All
                </Button>
              </div>
              <Card className="rounded-[2rem] border-none shadow-sm overflow-hidden bg-white dark:bg-neutral-900">
                 <div className="overflow-x-auto">
                    <table className="w-full text-left">
                      <thead className="bg-[#f8f9fa] dark:bg-neutral-800/50">
                        <tr>
                          <th className="p-6">
                             <input 
                              type="checkbox"
                              checked={selectedOrderIds.length === orders.length && orders.length > 0}
                              onChange={toggleSelectAllOrders}
                              className="w-5 h-5 rounded-lg accent-[#c2185b]"
                             />
                          </th>
                          <th className="p-6 text-[10px] font-black uppercase text-neutral-400 tracking-[0.2em]">Customer</th>
                          <th className="p-6 text-[10px] font-black uppercase text-neutral-400 tracking-[0.2em]">Items</th>
                          <th className="p-6 text-[10px] font-black uppercase text-neutral-400 tracking-[0.2em]">Status</th>
                          <th className="p-6 text-[10px] font-black uppercase text-neutral-400 tracking-[0.2em]">Amount</th>
                          <th className="p-6 text-[10px] font-black uppercase text-neutral-400 tracking-[0.2em]">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y dark:divide-neutral-800">
                        {orders.map((order) => (
                          <tr key={order.id} className="hover:bg-[#f8f9fa] dark:hover:bg-neutral-800/20 transition-colors">
                            <td className="p-6">
                               <input 
                                 type="checkbox"
                                 checked={selectedOrderIds.includes(order.id)}
                                 onChange={() => toggleSelectOrder(order.id)}
                                 className="w-5 h-5 rounded-lg accent-[#c2185b]"
                               />
                            </td>
                            <td className="p-6">
                               <div className="font-bold dark:text-white">{order.customer_name}</div>
                               <div className="text-[10px] text-neutral-400 font-mono tracking-tight">{order.phone}</div>
                            </td>
                            <td className="p-6">
                               <div className="flex -space-x-2">
                                 {order.items?.slice(0, 3).map((item, idx) => (
                                   <div key={idx} className="h-10 w-10 rounded-xl overflow-hidden border-2 border-white dark:border-neutral-900 bg-neutral-100">
                                     <img src={item.image} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                                   </div>
                                 ))}
                                 {(order.items?.length || 0) > 3 && (
                                   <div className="h-10 w-10 rounded-xl bg-neutral-900 text-white flex items-center justify-center text-[10px] font-black border-2 border-white">
                                     +{(order.items?.length || 0) - 3}
                                   </div>
                                 )}
                               </div>
                            </td>
                            <td className="p-6">
                               <select 
                                value={order.status}
                                onChange={(e) => onUpdateOrderStatus(order.id, e.target.value)}
                                className="bg-neutral-100 dark:bg-neutral-800 text-[10px] font-black uppercase px-3 py-2 rounded-xl outline-none"
                               >
                                 <option value="pending">Pending</option>
                                 <option value="processing">Processing</option>
                                 <option value="shipped">Shipped</option>
                                 <option value="delivered">Delivered</option>
                                 <option value="cancelled">Cancelled</option>
                               </select>
                            </td>
                            <td className="p-6">
                               <div className="font-black dark:text-white">৳{(order.total_amount || 0).toLocaleString()}</div>
                            </td>
                            <td className="p-6">
                               <Button variant="ghost" size="icon" className="h-10 w-10 rounded-xl hover:bg-emerald-50 text-emerald-600">
                                 <Download className="w-4 h-4" />
                               </Button>
                               <Button 
                                variant="ghost" 
                                size="icon" 
                                className="h-10 w-10 rounded-xl hover:bg-red-50 text-red-600"
                                onClick={() => onDeleteOrder(order.id)}
                               >
                                 <Trash2 className="w-4 h-4" />
                               </Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                 </div>
              </Card>
            </div>
          )}

          {activeTab === 'settings-global' && (
            <div className="space-y-8">
               <h3 className="text-xl font-black tracking-tight text-neutral-900 dark:text-white">Shop Settings</h3>
               <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                 <div className="p-8 bg-[#f8f9fa] dark:bg-neutral-800/50 rounded-3xl space-y-4">
                   <h4 className="font-bold">System Operations</h4>
                   <div className="flex flex-col gap-3">
                     <Button variant="outline" className="justify-start rounded-xl h-12" onClick={onExportInventory}>
                       <Download className="w-4 h-4 mr-2" /> Export Inventory (XLSX)
                     </Button>
                     <Button variant="outline" className="justify-start rounded-xl h-12" onClick={onExportOrders}>
                       <Download className="w-4 h-4 mr-2" /> Export Orders (PDF)
                     </Button>
                   </div>
                 </div>
               </div>
            </div>
          )}

          {activeTab === 'settings' && (
          <Card className="rounded-[2.5rem] border-neutral-100 dark:border-neutral-800 shadow-sm overflow-hidden">
            <CardHeader className="p-8 pb-4">
              <CardTitle className="text-2xl font-black tracking-tighter">Homepage Curation</CardTitle>
              <CardDescription>Select which products to showcase on the front page.</CardDescription>
            </CardHeader>
            <CardContent className="p-8 pt-0 space-y-10">
              <div className="space-y-6">
                <div className="flex flex-col md:flex-row justify-between gap-4">
                  <h4 className="text-xs font-black uppercase tracking-widest text-neutral-400">Premium Highlights (Front Carousel)</h4>
                  <div className="relative w-full max-w-xs">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3 h-3 text-neutral-400" />
                    <Input 
                      placeholder="Find masterpieces to highlight..." 
                      className="pl-9 h-9 text-xs bg-neutral-50 dark:bg-neutral-800 border-none rounded-lg"
                      onChange={(e) => setAdminSearchQuery(e.target.value)}
                    />
                  </div>
                </div>
                
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                  {items
                    .filter(i => adminSearchQuery ? (i.name.toLowerCase().includes(adminSearchQuery.toLowerCase()) || i.product_code?.toLowerCase().includes(adminSearchQuery.toLowerCase())) : true)
                    .map(item => (
                    <button
                      key={item.id}
                      onClick={() => {
                        const current = homepageSettings?.highlight_product_ids || [];
                        const updated = current.includes(item.id) 
                          ? current.filter((id: string) => id !== item.id)
                          : [...current, item.id];
                        onUpdateHomepage?.({ ...homepageSettings, highlight_product_ids: updated });
                      }}
                      className={`relative aspect-square rounded-2xl overflow-hidden border-2 transition-all ${
                        (homepageSettings?.highlight_product_ids || []).includes(item.id)
                          ? 'border-neutral-900 dark:border-white ring-4 ring-neutral-900/10'
                          : 'border-transparent opacity-50 grayscale hover:opacity-100 hover:grayscale-0'
                      }`}
                    >
                      <img src={item.image} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                      {(homepageSettings?.highlight_product_ids || []).includes(item.id) && (
                        <div className="absolute top-2 right-2 bg-amber-500 rounded-full p-1 shadow-lg border-2 border-white">
                          <Star className="w-3 h-3 text-white fill-current" />
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-4">
                <h4 className="text-xs font-black uppercase tracking-widest text-neutral-400">Featured Collections Category</h4>
                <div className="flex flex-wrap gap-2">
                  {['3 pieces', 'COCO', 'ZAMZAM', 'Party dress', 'Silk', 'Linen', 'Cotton', 'Premium'].map(cat => (
                    <Button
                      key={cat}
                      variant={homepageSettings?.featured_category === cat ? 'default' : 'outline'}
                      className="rounded-full px-6 h-10 font-bold"
                      onClick={() => onUpdateHomepage?.({ ...homepageSettings, featured_category: cat })}
                    >
                      {cat}
                    </Button>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  </div>
);
}
