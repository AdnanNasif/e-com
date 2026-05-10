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
  Star
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
  const [activeTab, setActiveTab] = useState('inventory');
  const [adminSearchQuery, setAdminSearchQuery] = useState('');
  const [editingItem, setEditingItem] = useState<ClothingItem | null | undefined>(undefined);

  const stats = useMemo(() => {
    const totalSales = orders.reduce((sum, o) => sum + (o.total_amount || 0), 0);
    const pendingOrders = orders.filter(o => o.status === 'pending').length;
    const totalProducts = items.length;
    const outOfStock = items.filter(i => i.inventory.every(inv => inv.quantity <= 0)).length;

    return { totalSales, pendingOrders, totalProducts, outOfStock };
  }, [items, orders]);

  return (
    <div className="max-w-7xl mx-auto px-4 py-12">
      {editingItem !== undefined && (
        <ProductForm 
          item={editingItem}
          onSave={CatalogService.saveProduct}
          onClose={() => setEditingItem(undefined)}
        />
      )}

      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-12">
        <div>
          <h1 className="text-4xl font-sans font-black text-neutral-900 dark:text-white tracking-tighter mb-2">
            Control Center
          </h1>
          <p className="text-neutral-500 dark:text-neutral-400 font-sans text-sm">
            Manage your boutique inventory and monitor luxury orders.
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Button 
            variant="outline"
            className="rounded-xl h-12 px-6 border-neutral-200 dark:border-neutral-800 font-bold gap-2"
            onClick={onExportInventory}
          >
            <Download className="w-4 h-4" />
            Export Catalog
          </Button>
          <Button 
            variant="outline"
            className="rounded-xl h-12 px-6 border-neutral-200 dark:border-neutral-800 font-bold gap-2"
            onClick={onExportOrders}
          >
            <Download className="w-4 h-4" />
            Export Orders
          </Button>
          <Button 
            className="rounded-xl h-12 px-6 bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 font-bold"
            onClick={() => setEditingItem(null)}
          >
            <Plus className="w-5 h-5 mr-2" />
            New Creation
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-12">
        <Card className="rounded-3xl border-neutral-100 dark:border-neutral-800 shadow-sm hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-[10px] font-black uppercase text-neutral-400 tracking-widest">Revenue</CardTitle>
            <TrendingUp className="w-4 h-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-black tracking-tighter dark:text-white">৳{stats.totalSales.toLocaleString()}</div>
            <p className="text-[10px] text-emerald-500 font-bold mt-1 uppercase tracking-tight">↑ 12.5% vs last month</p>
          </CardContent>
        </Card>
        <Card className="rounded-3xl border-neutral-100 dark:border-neutral-800 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-[10px] font-black uppercase text-neutral-400 tracking-widest">Active Orders</CardTitle>
            <ShoppingBag className="w-4 h-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-black tracking-tighter dark:text-white">{stats.pendingOrders}</div>
            <p className="text-[10px] text-amber-500 font-bold mt-1 uppercase tracking-tight">Awaiting processing</p>
          </CardContent>
        </Card>
        <Card className="rounded-3xl border-neutral-100 dark:border-neutral-800 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-[10px] font-black uppercase text-neutral-400 tracking-widest">Creations</CardTitle>
            <Package className="w-4 h-4 text-neutral-900 dark:text-white" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-black tracking-tighter dark:text-white">{stats.totalProducts}</div>
            <p className="text-[10px] text-neutral-500 font-bold mt-1 uppercase tracking-tight">Managed in list</p>
          </CardContent>
        </Card>
        <Card className="rounded-3xl border-neutral-100 dark:border-neutral-800 shadow-sm bg-red-50 dark:bg-red-950/20">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-[10px] font-black uppercase text-red-500 tracking-widest">Shortage</CardTitle>
            <AlertCircle className="w-4 h-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-black tracking-tighter text-red-600">{stats.outOfStock}</div>
            <p className="text-[10px] text-red-500 font-bold mt-1 uppercase tracking-tight">Items out of stock</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="inventory" className="space-y-8" onValueChange={setActiveTab}>
        <TabsList className="bg-neutral-100 dark:bg-neutral-800 p-1 rounded-2xl">
          <TabsTrigger value="inventory" className="rounded-xl px-12 data-[state=active]:bg-white dark:data-[state=active]:bg-neutral-900 dark:text-neutral-400 dark:data-[state=active]:text-white">
            Inventory
          </TabsTrigger>
          <TabsTrigger value="orders" className="rounded-xl px-12 data-[state=active]:bg-white dark:data-[state=active]:bg-neutral-900 dark:text-neutral-400 dark:data-[state=active]:text-white">
            Orders
          </TabsTrigger>
          <TabsTrigger value="settings" className="rounded-xl px-12 data-[state=active]:bg-white dark:data-[state=active]:bg-neutral-900 dark:text-neutral-400 dark:data-[state=active]:text-white">
            Homepage Settings
          </TabsTrigger>
        </TabsList>

        <TabsContent value="inventory" className="space-y-6">
          <div className="flex justify-between items-center bg-white dark:bg-neutral-900 p-4 rounded-2xl border dark:border-neutral-800">
             <div className="relative w-full max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
                <Input 
                  className="pl-10 h-11 bg-neutral-50 dark:bg-neutral-800 border-none rounded-xl" 
                  placeholder="Search masterpieces..."
                  value={adminSearchQuery}
                  onChange={(e) => setAdminSearchQuery(e.target.value)}
                />
             </div>
             {selectedProductIds.length > 0 && (
               <Button 
                variant="destructive" 
                className="rounded-xl h-11 px-6 font-bold"
                onClick={onBulkDeleteProducts}
               >
                 <Trash2 className="w-4 h-4 mr-2" />
                 Delete Selected ({selectedProductIds.length})
               </Button>
             )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {items
              .filter(i => i.name.toLowerCase().includes(adminSearchQuery.toLowerCase()) || i.product_code?.toLowerCase().includes(adminSearchQuery.toLowerCase()))
              .map((product) => (
              <Card key={product.id} className="rounded-3xl overflow-hidden border-neutral-100 dark:border-neutral-800 shadow-sm group">
                <div className="relative aspect-[4/3]">
                  <img src={product.image} className="w-full h-full object-cover" />
                  <div className="absolute top-4 left-4">
                    <input 
                      type="checkbox"
                      checked={selectedProductIds.includes(product.id)}
                      onChange={() => {
                        setSelectedProductIds(prev => 
                          prev.includes(product.id) ? prev.filter(id => id !== product.id) : [...prev, product.id]
                        );
                      }}
                      className="w-6 h-6 rounded-lg accent-neutral-900"
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
                        title="Toggle Premium Highlight"
                      >
                        <Star className={`w-4 h-4 ${ (homepageSettings?.highlight_product_ids || []).includes(product.id) ? 'fill-current' : ''}`} />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-10 w-10 text-neutral-400 hover:text-neutral-900 rounded-xl" onClick={() => onMoveProduct(product, 'top')} title="Move to Top">
                        <Maximize2 className="w-4 h-4 rotate-45" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-10 w-10 text-red-500 hover:bg-red-50 rounded-xl" onClick={() => onDeleteItem(product.id)}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="orders">
          <Card className="rounded-3xl border-neutral-100 dark:border-neutral-800 shadow-sm overflow-hidden">
             <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead className="bg-neutral-50 dark:bg-neutral-800/50">
                    <tr>
                      <th className="p-6">
                         <input 
                          type="checkbox"
                          checked={selectedOrderIds.length === orders.length && orders.length > 0}
                          onChange={() => {
                            if (selectedOrderIds.length === orders.length) setSelectedOrderIds([]);
                            else setSelectedOrderIds(orders.map(o => o.id));
                          }}
                          className="w-5 h-5 rounded-lg accent-neutral-900"
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
                      <tr key={order.id} className="hover:bg-neutral-50 dark:hover:bg-neutral-800/20 transition-colors">
                        <td className="p-6">
                           <input 
                             type="checkbox"
                             checked={selectedOrderIds.includes(order.id)}
                             onChange={() => {
                               setSelectedOrderIds(prev => 
                                 prev.includes(order.id) ? prev.filter(id => id !== order.id) : [...prev, order.id]
                               );
                             }}
                             className="w-5 h-5 rounded-lg accent-neutral-900"
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
                                 <img src={item.image} className="w-full h-full object-cover" />
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
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
             </div>
          </Card>
        </TabsContent>
        <TabsContent value="settings" className="space-y-8">
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
                      <img src={item.image} className="w-full h-full object-cover" />
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
                  {['Coco', 'Zamzam', 'Silk', 'Linen', 'Cotton'].map(cat => (
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
        </TabsContent>
      </Tabs>
    </div>
  );
}
