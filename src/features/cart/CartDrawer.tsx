import { motion, AnimatePresence } from 'motion/react';
import { X, ShoppingBag, Trash2, Plus, Minus, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { CartItem } from '../../core/types';

interface CartDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  cart: CartItem[];
  onUpdateQuantity: (id: string, size: string, delta: number) => void;
  onRemove: (id: string, size: string) => void;
  onCheckout: () => void;
}

export function CartDrawer({ isOpen, onClose, cart, onUpdateQuantity, onRemove, onCheckout }: CartDrawerProps) {
  const total = cart.reduce((sum, item) => sum + (item.price * item.cartQuantity), 0);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60]"
          />
          <motion.div 
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            className="fixed top-0 right-0 h-full w-full max-w-md bg-white dark:bg-neutral-900 shadow-2xl z-[70] flex flex-col"
          >
            <div className="p-6 border-b border-neutral-100 dark:border-neutral-800 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-neutral-100 dark:bg-neutral-800 rounded-xl flex items-center justify-center">
                  <ShoppingBag className="w-5 h-5 text-neutral-900 dark:text-white" />
                </div>
                <div>
                  <h2 className="font-sans font-bold text-lg text-neutral-900 dark:text-white">Your Cart</h2>
                  <p className="text-[10px] font-mono text-neutral-400 uppercase tracking-widest">{cart.length} ITEMS</p>
                </div>
              </div>
              <Button variant="ghost" size="icon" onClick={onClose} className="rounded-xl">
                <X className="w-5 h-5 text-neutral-400" />
              </Button>
            </div>

            <ScrollArea className="flex-1 p-6">
              {cart.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center py-20">
                  <div className="w-20 h-20 bg-neutral-50 dark:bg-neutral-800/50 rounded-full flex items-center justify-center mb-6">
                    <ShoppingBag className="w-8 h-8 text-neutral-200 dark:text-neutral-700" />
                  </div>
                  <h3 className="font-sans font-bold text-neutral-900 dark:text-white mb-2">Cart is empty</h3>
                  <p className="text-sm text-neutral-500 dark:text-neutral-400 max-w-[200px]">
                    Looks like you haven't added any elegance to your cart yet.
                  </p>
                </div>
              ) : (
                <div className="space-y-6">
                  {cart.map((item) => (
                    <div key={`${item.id}-${item.selectedSize}`} className="group flex gap-4 bg-white dark:bg-neutral-900 rounded-xl">
                      <div className="w-24 h-32 rounded-xl overflow-hidden bg-neutral-100 flex-shrink-0">
                        <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                      </div>
                      <div className="flex-1 flex flex-col justify-between py-1">
                        <div>
                          <div className="flex justify-between items-start mb-1">
                            <h4 className="font-sans font-bold text-sm text-neutral-900 dark:text-white group-hover:text-neutral-600 transition-colors">
                              {item.name}
                            </h4>
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-6 w-6 text-neutral-300 hover:text-red-500 hover:bg-red-50"
                              onClick={() => onRemove(item.id, item.selectedSize)}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          </div>
                          <div className="flex items-center gap-2 mb-2">
                            <span className="text-[10px] font-mono text-neutral-400 uppercase tracking-widest">{item.product_code}</span>
                            <span className="w-1 h-1 rounded-full bg-neutral-200" />
                            <span className="text-[10px] font-sans font-bold text-neutral-900 dark:text-white">SIZE: {item.selectedSize}</span>
                          </div>
                        </div>
                        
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1 bg-neutral-50 dark:bg-neutral-800 rounded-lg p-1 border border-neutral-100 dark:border-neutral-700">
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="w-7 h-7 hover:bg-white dark:hover:bg-neutral-700 text-neutral-500 shadow-sm"
                              onClick={() => onUpdateQuantity(item.id, item.selectedSize, -1)}
                            >
                              <Minus className="w-3 h-3" />
                            </Button>
                            <span className="w-8 text-center text-xs font-mono font-bold text-neutral-900 dark:text-white">{item.cartQuantity}</span>
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="w-7 h-7 hover:bg-white dark:hover:bg-neutral-700 text-neutral-500 shadow-sm"
                              onClick={() => onUpdateQuantity(item.id, item.selectedSize, 1)}
                            >
                              <Plus className="w-3 h-3" />
                            </Button>
                          </div>
                          <p className="font-sans font-black text-neutral-900 dark:text-white tracking-tight">
                            ৳{item.price * item.cartQuantity}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>

            {cart.length > 0 && (
              <div className="p-6 bg-white dark:bg-neutral-900 border-t border-neutral-100 dark:border-neutral-800 shadow-2xl">
                <div className="space-y-3 mb-6">
                  <div className="flex justify-between text-sm text-neutral-500 dark:text-neutral-400">
                    <span>Subtotal</span>
                    <span className="font-mono">৳{total}</span>
                  </div>
                  <div className="flex justify-between text-sm text-neutral-500 dark:text-neutral-400">
                    <span>Delivery</span>
                    <span className="text-[10px] font-mono tracking-widest text-neutral-400">CALCULATED AT NEXT STEP</span>
                  </div>
                  <Separator className="dark:bg-neutral-800" />
                  <div className="flex justify-between items-center pt-2">
                    <span className="font-sans font-bold text-neutral-900 dark:text-white">Order Total</span>
                    <span className="text-2xl font-sans font-black text-neutral-900 dark:text-white tracking-tighter">৳{total}</span>
                  </div>
                </div>
                
                <Button 
                  className="w-full h-14 bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 hover:bg-neutral-800 dark:hover:bg-neutral-100 rounded-xl group transition-all duration-300" 
                  onClick={onCheckout}
                >
                  <span className="font-sans font-bold text-base mr-2">Secure Checkout</span>
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </Button>
                
                <p className="text-center text-[10px] text-neutral-400 mt-4 font-mono tracking-widest uppercase">
                  Free returns • Secure payment • Quality guaranteed
                </p>
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
