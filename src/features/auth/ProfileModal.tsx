import { motion, AnimatePresence } from 'motion/react';
import { X, User as UserIcon, LogOut, Package, FileText, Truck, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { Order, UserProfile, CartItem } from '../../core/types';

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  userProfile: UserProfile | null;
  userOrders: Order[];
  onLogout: () => void;
  onUpdateProfile: (updates: Partial<UserProfile>) => void;
  onDownloadInvoice: (order: Order) => void;
  onReorder: (order: Order) => void;
  onGoToShop: () => void;
}

export function ProfileModal({
  isOpen,
  onClose,
  userProfile,
  userOrders,
  onLogout,
  onUpdateProfile,
  onDownloadInvoice,
  onReorder,
  onGoToShop
}: ProfileModalProps) {
  const totalSpent = userOrders.reduce((acc, curr) => acc + (curr.total_amount || 0), 0);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-[80] bg-black/40 backdrop-blur-sm"
          />
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed right-0 top-0 z-[90] h-full w-full max-w-md bg-white dark:bg-neutral-900 shadow-2xl flex flex-col"
          >
            <div className="flex items-center justify-between border-b dark:border-neutral-800 p-6 shrink-0">
              <div className="flex items-center gap-3">
                <UserIcon className="h-5 w-5 text-emerald-600" />
                <h2 className="text-xl font-bold dark:text-white">My Account</h2>
              </div>
              <Button variant="ghost" size="icon" onClick={onClose}>
                <X className="h-5 w-5" />
              </Button>
            </div>

            <div className="flex-1 overflow-y-auto bg-neutral-50/30 dark:bg-neutral-900/40">
              <div className="p-6 space-y-10">
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-5 rounded-3xl bg-white dark:bg-neutral-900 border border-neutral-100 dark:border-neutral-800 shadow-sm transition-transform hover:scale-[1.02]">
                    <p className="text-[10px] font-black uppercase text-neutral-400 tracking-[0.2em] mb-2">Total Orders</p>
                    <div className="flex items-baseline gap-2">
                      <span className="text-3xl font-black text-emerald-600">{userOrders.length}</span>
                      <span className="text-[10px] font-black text-neutral-300 uppercase tracking-tighter">{userOrders.length === 1 ? 'Order' : 'Orders'}</span>
                    </div>
                  </div>
                  <div className="p-5 rounded-3xl bg-white dark:bg-neutral-900 border border-neutral-100 dark:border-neutral-800 shadow-sm transition-transform hover:scale-[1.02]">
                    <p className="text-[10px] font-black uppercase text-neutral-400 tracking-[0.2em] mb-2">Total Spent</p>
                    <p className="text-2xl font-black tracking-tighter dark:text-white">TK {totalSpent.toLocaleString()}</p>
                  </div>
                </div>

                <div className="space-y-6">
                  <div className="flex items-center justify-between px-1">
                    <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-neutral-400">Order History</h4>
                    <div className="flex-1 h-px bg-neutral-200 dark:bg-neutral-800 mx-4" />
                    <Badge variant="outline" className="text-[10px] font-black border-neutral-200 text-neutral-400">TRACKING</Badge>
                  </div>

                  {userOrders.length === 0 ? (
                    <div className="text-center py-20 px-8 bg-white dark:bg-neutral-900 border border-dashed border-neutral-200 dark:border-neutral-800 rounded-[2.5rem] shadow-inner">
                      <Package className="h-12 w-12 text-neutral-100 dark:text-neutral-800 mx-auto mb-4" />
                      <p className="text-xs font-black text-neutral-400 uppercase tracking-widest mb-6">No purchase history</p>
                      <Button
                        variant="outline"
                        className="rounded-full border-emerald-100 text-emerald-600 hover:bg-emerald-50 text-[10px] font-black uppercase tracking-widest h-10 px-6"
                        onClick={onGoToShop}
                      >
                        Discover Clothing
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-6">
                      {userOrders.map((order, orderIdx) => (
                        <motion.div
                          key={`${order.id}-${orderIdx}`}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: orderIdx * 0.1 }}
                          className="group p-6 rounded-[2rem] border border-neutral-100 dark:border-neutral-800 bg-white dark:bg-neutral-900 shadow-sm hover:shadow-xl transition-all relative overflow-hidden"
                        >
                          <div className="flex justify-between items-start mb-6">
                            <div className="space-y-1.5">
                              <div className="flex items-center gap-2">
                                <span className="text-[11px] font-mono font-black text-emerald-600 bg-emerald-50 dark:bg-emerald-950/30 px-3 py-1 rounded-full border border-emerald-100 dark:border-emerald-900/50">
                                  #{order.id.slice(-8).toUpperCase()}
                                </span>
                                <Badge
                                  className={`text-[9px] uppercase font-black px-2.5 py-0.5 border-none tracking-widest ${order.status === 'delivered' ? 'bg-emerald-500 text-white' :
                                      order.status === 'processing' ? 'bg-blue-500 text-white' :
                                        'bg-amber-400 text-white'
                                    }`}
                                >
                                  {order.status}
                                </Badge>
                              </div>
                              <p className="text-[10px] text-neutral-400 font-black uppercase tracking-tighter pl-1">
                                Ordered: {(() => {
                                  try {
                                    const date = (order.created_at as any)?.toDate ? (order.created_at as any).toDate() :
                                      order.created_at ? new Date(order.created_at) : new Date();
                                    return date.toLocaleDateString(undefined, { day: 'numeric', month: 'long', year: 'numeric' });
                                  } catch (e) {
                                    return 'Recent Purchase';
                                  }
                                })()}
                              </p>
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-10 w-10 p-0 rounded-2xl hover:bg-emerald-50 dark:hover:bg-emerald-950/30 group/btn transition-all active:scale-90"
                              onClick={() => onDownloadInvoice(order)}
                            >
                              <FileText className="h-5 w-5 text-emerald-600 transition-transform group-hover/btn:scale-110" />
                            </Button>
                          </div>

                          {order.items && order.items.length > 0 && (
                            <div className="space-y-4 mb-8">
                              {order.items.map((item, itemIdx) => (
                                <div key={`${order.id}-item-${itemIdx}`} className="flex gap-5 items-center group/item transition-transform hover:translate-x-1">
                                  <div className="h-20 w-16 rounded-2xl bg-neutral-100 dark:bg-neutral-800 overflow-hidden shrink-0 border dark:border-neutral-700 shadow-sm">
                                    <img src={item.image || 'https://placehold.co/400x500?text=Dress'} alt={item.name} className="h-full w-full object-cover transition-transform group-hover/item:scale-110" />
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <div className="flex justify-between items-start mb-2">
                                      <div className="space-y-0.5">
                                        <p className="text-sm font-black truncate text-neutral-900 dark:text-neutral-100 uppercase tracking-tight">{item.name || 'LIZ Dress'}</p>
                                        {item.product_code && <p className="text-[9px] font-mono font-bold text-neutral-400">CODE: {item.product_code}</p>}
                                      </div>
                                      <p className="text-sm font-mono font-black text-emerald-600">TK {Number(item.price || 0).toLocaleString()}</p>
                                    </div>
                                    <div className="flex gap-3">
                                      <span className="text-[9px] font-black uppercase text-neutral-500 bg-neutral-100 dark:bg-white/5 px-2.5 py-1 rounded-lg tracking-tighter border dark:border-white/10">Size: {item.size || 'N/A'}</span>
                                      <span className="text-[9px] font-black uppercase text-neutral-500 bg-neutral-100 dark:bg-white/5 px-2.5 py-1 rounded-lg tracking-tighter border dark:border-white/10">Qty: {item.quantity || 1}</span>
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}

                          <div className="p-5 rounded-2xl bg-neutral-50 dark:bg-neutral-800/30 border border-neutral-100 dark:border-neutral-800 mb-8 space-y-5">
                            <div className="grid grid-cols-2 gap-6">
                              <div className="space-y-1.5">
                                <p className="text-[9px] font-black text-neutral-400 uppercase tracking-widest flex items-center gap-1.5">
                                  <UserIcon className="h-3 w-3" /> Recipient
                                </p>
                                <p className="text-[11px] font-black dark:text-white truncate">{order.customer_name || 'Customer'}</p>
                                <p className="text-[10px] font-mono font-black text-emerald-600">{order.phone || '01XXXXXXXXX'}</p>
                              </div>
                              <div className="space-y-1.5 text-right">
                                <p className="text-[9px] font-black text-neutral-400 uppercase tracking-widest flex items-center justify-end gap-1.5">
                                  Delivery <Truck className="h-3 w-3" />
                                </p>
                                <p className="text-[10px] font-bold dark:text-neutral-300 capitalize">{order.delivery_location || 'Inside Dhaka'}</p>
                                <p className="text-[10px] font-mono font-black text-neutral-500">Charge: TK {Number(order.delivery_charge || 0).toLocaleString()}</p>
                              </div>
                            </div>
                            <div className="pt-4 border-t border-neutral-200/50 dark:border-neutral-700/50">
                              <p className="text-[9px] font-black text-neutral-400 uppercase tracking-widest mb-2">Shipping Destination</p>
                              <p className="text-xs font-bold text-neutral-600 dark:text-neutral-400 leading-relaxed italic pr-4">
                                "{order.address || 'Standard Address'}"
                              </p>
                            </div>
                          </div>

                          <div className="flex items-end justify-between pt-6 border-t border-dotted dark:border-neutral-800">
                            <div className="space-y-1">
                              <p className="text-[10px] font-black text-neutral-400 uppercase tracking-[0.2em] mb-1">Final Amount</p>
                              <p className="text-3xl font-black text-neutral-900 dark:text-white tracking-tighter leading-none">
                                TK {Number(order.total_amount || 0).toLocaleString()}
                              </p>
                            </div>
                            <Button
                              variant="outline"
                              className="rounded-2xl border-emerald-100 text-emerald-600 hover:bg-emerald-600 hover:text-white h-11 px-6 text-[10px] font-black uppercase tracking-[0.2em] shadow-sm transition-all hover:shadow-emerald-100 dark:hover:shadow-none hover:scale-105 active:scale-95"
                              onClick={() => onReorder(order)}
                            >
                              Buy Again
                            </Button>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="space-y-6 pt-10 border-t dark:border-neutral-800 pb-12">
                  <div className="flex items-center gap-3 px-1">
                    <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-neutral-400">Account Details</h4>
                  </div>

                  <div className="space-y-6 bg-white dark:bg-neutral-900 p-8 rounded-[2rem] border border-neutral-100 dark:border-neutral-800 shadow-sm">
                    <div className="space-y-2.5">
                      <label className="text-[10px] font-black uppercase tracking-[0.2em] text-neutral-400 ml-1">Contact Phone</label>
                      <Input
                        placeholder="01XXXXXXXXX"
                        defaultValue={userProfile?.phone || ''}
                        onBlur={(e) => onUpdateProfile({ phone: e.target.value })}
                        className="h-14 rounded-2xl bg-neutral-50 dark:bg-neutral-800/50 border-none px-5 font-mono font-black placeholder:text-neutral-300"
                      />
                    </div>
                    <div className="space-y-2.5">
                      <label className="text-[10px] font-black uppercase tracking-[0.2em] text-neutral-400 ml-1">Shipping Address</label>
                      <textarea
                        placeholder="Area, Road, House No..."
                        defaultValue={userProfile?.address || ''}
                        onBlur={(e) => onUpdateProfile({ address: e.target.value })}
                        className="flex min-h-[120px] w-full rounded-2xl border-none bg-neutral-50 dark:bg-neutral-800/50 px-5 py-4 text-sm font-bold text-neutral-700 dark:text-neutral-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 transition-all resize-none shadow-inner"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="p-6 border-t dark:border-neutral-800 bg-white dark:bg-neutral-900 shrink-0">
              <Button
                variant="outline"
                className="w-full h-14 rounded-2xl border-red-50 text-red-500 hover:bg-red-500 hover:text-white hover:border-red-500 font-black text-xs uppercase tracking-[0.2em] transition-all flex items-center justify-center gap-3 active:scale-95"
                onClick={onLogout}
              >
                <LogOut className="h-5 w-5" />
                Sign Out
              </Button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
