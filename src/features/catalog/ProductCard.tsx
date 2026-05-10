import React from 'react';
import { motion } from 'motion/react';
import { ShoppingBag, Star, Maximize2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ClothingItem } from '../../core/types';

interface ProductCardProps {
  item: ClothingItem;
  onClick: (item: ClothingItem) => void;
  onAddToCart: (item: ClothingItem, size: string) => void;
}

export const ProductCard: React.FC<ProductCardProps> = ({ item, onClick, onAddToCart }) => {
  const isOutOfStock = item.inventory.every(inv => inv.quantity <= 0);

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -8 }}
      className="group bg-white dark:bg-neutral-800 rounded-2xl overflow-hidden border border-neutral-100 dark:border-neutral-700 shadow-sm hover:shadow-xl transition-all duration-500"
    >
      <div 
        className="relative aspect-[3/4] overflow-hidden cursor-pointer"
        onClick={() => onClick(item)}
      >
        <img 
          src={item.image} 
          alt={item.name}
          className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
        />
        <div className="absolute inset-0 bg-black/5 group-hover:bg-black/20 transition-colors duration-500" />
        
        <div className="absolute top-4 left-4 flex flex-col gap-2">
          {item.category && (
            <Badge className="bg-white/90 dark:bg-neutral-900/90 backdrop-blur-md text-neutral-900 dark:text-white border-none shadow-sm uppercase text-[10px] tracking-wider px-3">
              {item.category}
            </Badge>
          )}
          {item.original_price && item.original_price > item.price && (
            <Badge className="bg-red-500 text-white border-none shadow-sm text-[10px] tracking-wider px-3">
              SALE
            </Badge>
          )}
        </div>

        <div className="absolute bottom-4 right-4 flex flex-col gap-2 opacity-0 translate-y-4 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-300">
          <Button size="icon" className="rounded-full bg-white/90 dark:bg-neutral-900/90 backdrop-blur-md text-neutral-900 dark:text-white hover:bg-white dark:hover:bg-neutral-800 border-none shadow-lg">
            <Maximize2 className="w-4 h-4" />
          </Button>
        </div>

        {isOutOfStock && (
          <div className="absolute inset-0 bg-white/60 dark:bg-neutral-900/60 backdrop-blur-[2px] flex items-center justify-center">
            <Badge variant="outline" className="bg-white dark:bg-neutral-900 border-neutral-900 dark:border-white text-neutral-900 dark:text-white font-mono font-bold tracking-[0.2em] px-4 py-2">
              OUT OF STOCK
            </Badge>
          </div>
        )}
      </div>

      <div className="p-5">
        <div className="flex justify-between items-start gap-2 mb-2">
          <div>
            <h3 className="font-sans font-bold text-neutral-900 dark:text-white tracking-tight leading-tight group-hover:text-neutral-600 dark:group-hover:text-neutral-300 transition-colors">
              {item.name}
            </h3>
            <p className="text-[10px] font-mono text-neutral-400 dark:text-neutral-500 uppercase tracking-widest mt-1">
              {item.product_code || 'CODE_PENDING'}
            </p>
          </div>
          <div className="flex items-center gap-1">
            <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
            <span className="text-[11px] font-bold text-neutral-900 dark:text-white">4.9</span>
          </div>
        </div>

        <div className="flex items-center justify-between mt-4">
          <div className="flex flex-col">
            {item.original_price && item.original_price > item.price && (
              <span className="text-[10px] text-neutral-400 line-through font-mono">
                ৳{item.original_price}
              </span>
            )}
            <span className="text-lg font-sans font-black text-neutral-900 dark:text-white tracking-tighter">
              ৳{item.price}
            </span>
          </div>
          
          <Button 
            size="sm" 
            className="rounded-full bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 hover:bg-neutral-800 dark:hover:bg-neutral-100 px-4 h-9"
            disabled={isOutOfStock}
            onClick={(e) => {
              e.stopPropagation();
              // Default to first available size or unstitched if available
              const defaultSize = item.inventory.find(i => i.quantity > 0)?.size || 'Unstitched';
              onAddToCart(item, defaultSize);
            }}
          >
            <ShoppingBag className="w-4 h-4 mr-2" />
            Add
          </Button>
        </div>
      </div>
    </motion.div>
  );
}
