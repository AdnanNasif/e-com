import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, 
  ShoppingBag, 
  ChevronLeft, 
  ChevronRight, 
  Zap, 
  SquarePen, 
  MessageCircle,
  Plus,
  Minus
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ClothingItem } from '../../core/types';

interface ProductDetailsProps {
  item: ClothingItem | null;
  isOpen?: boolean;
  onClose?: () => void;
  onAddToCart: (item: ClothingItem, size: string, quantity: number) => void;
  onBuyNow: (item: ClothingItem, size: string, quantity: number) => void;
  activeImageIdx: number;
  setActiveImageIdx: (idx: number) => void;
  isFullPage?: boolean;
}

export function ProductDetails({ 
  item, 
  isOpen = true, 
  onClose, 
  onAddToCart,
  onBuyNow,
  activeImageIdx,
  setActiveImageIdx,
  isFullPage = false
}: ProductDetailsProps) {
  const [selectedSize, setSelectedSize] = useState<string | null>(null);
  const [quantity, setQuantity] = useState(1);

  if (!item) return null;

  const images = item.images && item.images.length > 0 ? item.images : [item.image];
  const currentImage = images[activeImageIdx] || item.image;

  const totalStock = item.inventory.reduce((acc, curr) => acc + curr.quantity, 0);
  const selectedInventory = item.inventory.find(inv => inv.size === selectedSize);
  const maxStock = selectedInventory ? selectedInventory.quantity : totalStock;

  const handleDecrement = () => setQuantity(prev => Math.max(1, prev - 1));
  const handleIncrement = () => setQuantity(prev => Math.min(maxStock, prev + 1));

  const content = (
    <motion.div
      initial={isFullPage ? { opacity: 0 } : { scale: 0.95, opacity: 0, y: 20 }}
      animate={isFullPage ? { opacity: 1 } : { scale: 1, opacity: 1, y: 0 }}
      exit={isFullPage ? { opacity: 0 } : { scale: 0.95, opacity: 0, y: 20 }}
      className={`relative w-full ${isFullPage ? '' : 'max-w-6xl bg-white dark:bg-neutral-900 rounded-[1.5rem] shadow-2xl overflow-hidden h-full max-h-[90vh]'} flex flex-col md:flex-row`}
    >
      {/* Close Button - only show if modal */}
      {!isFullPage && onClose && (
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={onClose}
          className="absolute right-4 top-4 z-10 bg-white/80 dark:bg-neutral-800/80 hover:bg-white dark:hover:bg-neutral-700 backdrop-blur-md rounded-full shadow-sm"
        >
          <X className="w-5 h-5" />
        </Button>
      )}

      {/* Left Side: Image Gallery */}
      <div className={`${isFullPage ? 'md:w-1/2' : 'md:w-[45%]'} bg-neutral-100 dark:bg-neutral-800 relative flex flex-col min-h-[400px]`}>
        <div className="relative flex-1 overflow-hidden group">
          <img 
            src={currentImage} 
            alt={item.name} 
            className="w-full h-full object-cover"
            referrerPolicy="no-referrer"
          />
          
          {/* Navigation Arrows */}
          {images.length > 1 && (
            <>
              <button 
                onClick={() => setActiveImageIdx((activeImageIdx - 1 + images.length) % images.length)}
                className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/90 flex items-center justify-center shadow-md hover:bg-white transition-colors"
              >
                <ChevronLeft className="w-6 h-6 text-neutral-600" />
              </button>
              <button 
                onClick={() => setActiveImageIdx((activeImageIdx + 1) % images.length)}
                className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/90 flex items-center justify-center shadow-md hover:bg-white transition-colors"
              >
                <ChevronRight className="w-6 h-6 text-neutral-600" />
              </button>
            </>
          )}
        </div>

        {/* Thumbnails */}
        {images.length > 1 && (
          <div className="p-4 flex gap-2 overflow-x-auto bg-white dark:bg-neutral-900 border-t dark:border-neutral-800">
            {images.map((img, idx) => (
              <button
                key={idx}
                onClick={() => setActiveImageIdx(idx)}
                className={`w-16 h-20 rounded-md overflow-hidden border-2 flex-shrink-0 transition-all ${
                  activeImageIdx === idx ? 'border-[#c2185b]' : 'border-transparent'
                }`}
              >
                <img src={img} className="w-full h-full object-cover" alt={`Thumbnail ${idx + 1}`} referrerPolicy="no-referrer" />
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Right Side: Details */}
      <ScrollArea className="flex-1">
        <div className="p-6 md:p-10 space-y-6">
          <div className="space-y-4">
            <h2 className="text-3xl font-bold tracking-tight text-neutral-900 dark:text-white uppercase leading-none">
              {item.name}
            </h2>
            <div className="flex items-baseline gap-4 pt-2">
              <div className="flex items-baseline gap-2">
                <span className="text-sm font-bold text-neutral-500 group-hover:text-red-500 transition-colors">TK.</span>
                <span className={`text-5xl font-black tracking-tighter ${item.original_price && item.original_price > item.price ? 'text-red-600 dark:text-red-400' : 'text-[#1a237e] dark:text-white'}`}>
                  {item.price}
                </span>
              </div>
              {item.original_price && item.original_price > item.price && (
                <span className="text-xl text-neutral-400 line-through font-mono">
                  ৳{item.original_price}
                </span>
              )}
            </div>
          </div>

          <div className="space-y-6 py-4">
            {/* Size Selection */}
            <div className="flex items-center gap-4">
              <span className="text-[10px] font-black uppercase text-neutral-400 tracking-widest min-w-[70px]">Size:</span>
              <div className="flex flex-wrap gap-2">
                {item.inventory.map((inv) => (
                  <button
                    key={inv.size}
                    disabled={inv.quantity === 0}
                    onClick={() => {
                      setSelectedSize(inv.size);
                      setQuantity(1);
                    }}
                    className={`
                      px-4 py-1.5 rounded-full border text-[11px] font-black transition-all
                      ${selectedSize === inv.size 
                        ? 'bg-black text-white border-black' 
                        : inv.quantity > 0 
                          ? 'bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white border-neutral-200 dark:border-neutral-700 hover:border-black' 
                          : 'bg-neutral-50 dark:bg-neutral-900 text-neutral-300 border-neutral-100 dark:border-neutral-800 cursor-not-allowed'}
                    `}
                  >
                    {inv.size}
                  </button>
                ))}
              </div>
            </div>

            {/* Category */}
            <div className="flex items-center gap-4">
              <span className="text-[10px] font-black uppercase text-neutral-400 tracking-widest min-w-[70px]">Category:</span>
              <span className="text-[11px] font-black text-neutral-800 dark:text-white uppercase">
                {item.category}
              </span>
            </div>

            {/* Stock */}
            <div className="flex items-center gap-4">
              <span className="text-[10px] font-black uppercase text-neutral-400 tracking-widest min-w-[70px]">Stock:</span>
              <span className="text-[11px] font-black text-[#9c27b0] uppercase">
                {maxStock} IN STOCK
              </span>
            </div>
          </div>

          <div className="h-px bg-neutral-100 dark:bg-neutral-800" />

          {/* Quantity & Actions */}
          <div className="space-y-6 pt-2">
            <div className="flex items-center h-10 w-32 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 overflow-hidden">
              <button 
                onClick={handleDecrement}
                className="flex-1 flex items-center justify-center hover:bg-neutral-50 dark:hover:bg-neutral-700 transition-colors"
              >
                <Minus className="w-4 h-4 text-neutral-500" />
              </button>
              <div className="w-10 text-center font-bold text-sm text-neutral-900 dark:text-white border-x border-neutral-200 dark:border-neutral-700">
                {quantity}
              </div>
              <button 
                onClick={handleIncrement}
                className="flex-1 flex items-center justify-center hover:bg-neutral-50 dark:hover:bg-neutral-700 transition-colors"
              >
                <Plus className="w-4 h-4 text-neutral-500" />
              </button>
            </div>

            <div className="flex flex-wrap gap-3">
              <Button 
                onClick={() => selectedSize && onAddToCart(item, selectedSize, quantity)}
                disabled={!selectedSize}
                className="bg-[#e91e63] hover:bg-[#d81b60] text-white rounded-lg h-10 px-6 font-bold flex items-center gap-2"
              >
                <ShoppingBag className="w-4 h-4" />
                ADD TO CART
              </Button>
              <Button 
                onClick={() => selectedSize && onBuyNow(item, selectedSize, quantity)}
                disabled={!selectedSize}
                className="bg-[#880e4f] hover:bg-[#6a0b3e] text-white rounded-lg h-10 px-6 font-bold flex items-center gap-2"
              >
                <Zap className="w-4 h-4" />
                BUY NOW
              </Button>
              <Button 
                variant="outline"
                className="bg-[#1a237e] hover:bg-[#0d164f] text-white border-none rounded-lg h-10 px-6 font-bold flex items-center gap-2"
              >
                <SquarePen className="w-4 h-4" />
                CUSTOMER REVIEW
              </Button>
              <Button 
                className="bg-black hover:bg-neutral-800 text-white rounded-lg h-10 px-6 font-bold flex items-center gap-2"
              >
                <MessageCircle className="w-4 h-4" />
                CONTACT US
              </Button>
            </div>
          </div>

          {/* Narrative Section (Additional Details) */}
          <div className="pt-8 border-t dark:border-neutral-800 space-y-4">
            <h3 className="text-sm font-black uppercase tracking-wider text-neutral-900 dark:text-white">Product Description</h3>
            <p className="text-sm text-neutral-500 dark:text-neutral-400 leading-relaxed font-medium">
              {item.description}
            </p>
          </div>
        </div>
      </ScrollArea>
    </motion.div>
  );

  if (isFullPage) {
    return content;
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 md:p-8 overflow-hidden">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
          />
          {content}
        </div>
      )}
    </AnimatePresence>
  );
}

