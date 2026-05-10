import { motion, AnimatePresence } from 'motion/react';
import { X, ShoppingBag, Truck, CheckCircle2, ChevronLeft, ChevronRight, Maximize2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ClothingItem } from '../../core/types';

interface ProductDetailsProps {
  item: ClothingItem | null;
  isOpen: boolean;
  onClose: () => void;
  onAddToCart: (item: ClothingItem, size: string) => void;
  activeImageIdx: number;
  setActiveImageIdx: (idx: number) => void;
}

export function ProductDetails({ 
  item, 
  isOpen, 
  onClose, 
  onAddToCart,
  activeImageIdx,
  setActiveImageIdx
}: ProductDetailsProps) {
  if (!item) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 md:p-8">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/80 backdrop-blur-md"
          />
          <motion.div
            initial={{ scale: 0.9, opacity: 0, y: 30 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 30 }}
            className="relative w-full max-w-5xl bg-white dark:bg-neutral-900 rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col md:flex-row h-full max-h-[850px]"
          >
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={onClose}
              className="absolute right-6 top-6 z-10 bg-white/20 hover:bg-white/40 backdrop-blur-md text-white md:text-neutral-900 dark:text-white rounded-full group transition-all"
            >
              <X className="w-5 h-5 group-hover:rotate-90 transition-transform" />
            </Button>

            <div className="md:w-1/2 h-80 md:h-auto bg-neutral-100 dark:bg-neutral-800 relative group">
              <img src={item.image} alt={item.name} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
              <div className="absolute inset-0 bg-black/5" />
            </div>

            <ScrollArea className="md:w-1/2 h-full">
              <div className="p-8 md:p-12 space-y-8">
                <div>
                  <div className="flex items-center gap-3 mb-4">
                    <Badge className="bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 border-none uppercase text-[10px] tracking-widest px-4 font-black">
                      {item.category}
                    </Badge>
                    <span className="text-[10px] font-mono font-bold text-neutral-400 uppercase tracking-[0.2em]">
                      SKU: {item.product_code || 'PENDING'}
                    </span>
                  </div>
                  <h2 className="text-4xl font-sans font-black text-neutral-900 dark:text-white tracking-tighter leading-tight mb-4">
                    {item.name}
                  </h2>
                  <div className="flex items-baseline gap-4">
                    <span className="text-3xl font-sans font-black text-neutral-900 dark:text-white tracking-tighter">
                      ৳{item.price}
                    </span>
                    {item.original_price && item.original_price > item.price && (
                      <span className="text-lg text-neutral-400 line-through font-mono">
                        ৳{item.original_price}
                      </span>
                    )}
                  </div>
                </div>

                <div className="p-6 bg-neutral-50 dark:bg-neutral-800/50 rounded-2xl border border-neutral-100 dark:border-neutral-700">
                  <p className="text-sm text-neutral-600 dark:text-neutral-300 leading-relaxed italic">
                    "{item.description}"
                  </p>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <label className="text-[10px] font-black uppercase tracking-[0.2em] text-neutral-400">Select Precision Size</label>
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    {item.inventory.map((inv) => (
                      <Button
                        key={inv.size}
                        variant="outline"
                        disabled={inv.quantity === 0}
                        onClick={() => onAddToCart(item, inv.size)}
                        className={`h-12 border-neutral-100 dark:border-neutral-700 rounded-xl font-mono text-[11px] font-black tracking-widest hover:border-neutral-900 dark:hover:border-white transition-all
                          ${inv.quantity === 0 ? 'opacity-20 bg-neutral-50' : 'bg-white dark:bg-neutral-900 shadow-sm'}
                        `}
                      >
                        {inv.size}
                      </Button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-6 pt-4">
                  <div className="flex items-center gap-4 group cursor-default">
                    <div className="w-12 h-12 rounded-2xl bg-emerald-50 dark:bg-emerald-950/30 flex items-center justify-center text-emerald-600 transition-transform group-hover:scale-110">
                      <Truck className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-widest text-neutral-400">Delivery</p>
                      <p className="text-xs font-bold text-neutral-900 dark:text-white">Fast Worldwide</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 group cursor-default">
                    <div className="w-12 h-12 rounded-2xl bg-blue-50 dark:bg-blue-950/30 flex items-center justify-center text-blue-600 transition-transform group-hover:scale-110">
                      <CheckCircle2 className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-widest text-neutral-400">Authentic</p>
                      <p className="text-xs font-bold text-neutral-900 dark:text-white">Quality Assured</p>
                    </div>
                  </div>
                </div>
              </div>
            </ScrollArea>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
