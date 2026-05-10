import { motion, AnimatePresence } from 'motion/react';
import { ArrowRight, CheckCircle2, TrendingUp, ShoppingBag } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { ClothingItem } from '../../core/types';

interface CollectionProps {
  items: ClothingItem[];
  filteredItems: ClothingItem[];
  highlightItems: ClothingItem[];
  currentHighlightIdx: number;
  selectedCategory: string;
  setSelectedCategory: (cat: string) => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  priceFilter: string;
  setPriceFilter: (filter: any) => void;
  stockFilter: string;
  setStockFilter: (filter: any) => void;
  sortBy: string;
  setSortBy: (sort: any) => void;
  onProductClick: (item: ClothingItem) => void;
  onAddToCart: (item: ClothingItem, size: string) => void;
}

export function Collection({
  items,
  filteredItems,
  highlightItems,
  currentHighlightIdx,
  selectedCategory,
  setSelectedCategory,
  searchQuery,
  setSearchQuery,
  priceFilter,
  setPriceFilter,
  stockFilter,
  setStockFilter,
  sortBy,
  setSortBy,
  onProductClick,
  onAddToCart
}: CollectionProps) {
  return (
    <div className="space-y-12">
      {selectedCategory === 'All' && searchQuery === '' && (
        <div className="space-y-20 mb-20 animate-in fade-in slide-in-from-bottom-4 duration-1000">
          {/* Highlight Section */}
          <section>
            <div className="flex items-center justify-between mb-8">
              <div className="space-y-1">
                <h2 className="text-2xl font-black text-neutral-900 dark:text-foreground tracking-tight uppercase">Premium Highlights</h2>
                <p className="text-[10px] font-black uppercase tracking-[0.3em] text-neutral-400 dark:text-muted-foreground">Curated by Liz Lifestyle</p>
              </div>
              <div className="h-[2px] flex-1 bg-neutral-100 dark:bg-neutral-800 mx-8 hidden md:block" />
              <div className="flex items-center gap-2">
                <div className="text-[9px] font-black uppercase text-neutral-400 dark:text-muted-foreground mr-2">Rotating Selection</div>
                <div className="flex gap-1">
                  {highlightItems.map((_, i) => (
                    <div
                      key={i}
                      className={`h-1.5 w-1.5 rounded-full transition-all duration-500 ${i === currentHighlightIdx ? 'bg-neutral-900 dark:bg-white w-4' : 'bg-neutral-200 dark:bg-neutral-800'}`}
                    />
                  ))}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
              <div className="md:col-span-3">
                <AnimatePresence mode="wait">
                  {(() => {
                    const item = highlightItems[currentHighlightIdx];
                    if (!item) return (
                      <div className="aspect-21/9 bg-neutral-50 dark:bg-neutral-900 rounded-3xl border-2 border-dashed border-neutral-100 dark:border-neutral-800 flex items-center justify-center">
                        <p className="text-sm font-black text-neutral-300 uppercase tracking-widest">Select Highlight In Admin</p>
                      </div>
                    );

                    return (
                      <motion.div
                        key={item.id}
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        className="relative aspect-4/5 md:aspect-auto md:h-[500px] rounded-3xl overflow-hidden cursor-pointer group shadow-2xl bg-neutral-100 dark:bg-neutral-800"
                        onClick={() => onProductClick(item)}
                      >
                        <img 
                          src={item.image || 'https://via.placeholder.com/800x1000?text=No+Image'} 
                          alt={item.category} 
                          className="h-full w-full object-contain md:object-cover md:object-top transition-transform duration-2000 group-hover:scale-105" 
                          referrerPolicy="no-referrer" 
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = 'https://via.placeholder.com/800x1000?text=Image+Load+Error';
                          }}
                        />
                        <div className="absolute inset-0 bg-linear-to-t md:bg-linear-to-r from-black/80 via-black/20 to-transparent" />
                        <div className="absolute bottom-0 left-0 p-6 md:p-12 space-y-3 md:space-y-4 w-full">
                          <div className="inline-flex">
                            <span className="px-3 py-1 bg-white text-neutral-900 text-[10px] font-mono font-black uppercase tracking-widest rounded-full shadow-lg">
                              Exclusive Dress: {item.product_code}
                            </span>
                          </div>
                          <h3 className="text-2xl md:text-5xl font-black text-white uppercase tracking-tighter leading-tight md:leading-none">
                            {item.category}
                          </h3>
                          <p className="text-white/80 text-xs md:text-sm max-w-md line-clamp-2">
                            {item.description}
                          </p>
                          <div className="flex items-center gap-4 md:gap-6 pt-2 md:pt-4">
                            <div className="flex flex-col">
                              {item.original_price && item.original_price > item.price && (
                                <span className="text-sm md:text-base text-white/50 line-through font-bold">TK {item.original_price.toLocaleString()}</span>
                              )}
                              <p className="text-2xl md:text-5xl font-black text-white flex items-center gap-3">
                                TK {item.price.toLocaleString()}
                                {item.original_price && item.original_price > item.price && (
                                  <span className="bg-red-500 text-white text-[11px] md:text-sm px-2.5 py-1 rounded-full font-black animate-pulse">
                                    {Math.round(((item.original_price - item.price) / item.original_price) * 100)}% OFF
                                  </span>
                                )}
                              </p>
                            </div>
                            <Button className="bg-white text-neutral-900 hover:bg-neutral-100 font-black rounded-xl px-6 md:px-8 h-10 md:h-12 uppercase tracking-widest text-[10px] md:text-xs">
                              View Details
                            </Button>
                          </div>
                        </div>
                        <div className="absolute top-8 right-8">
                          <Badge className="bg-white/10 backdrop-blur-md border-white/20 text-white font-black px-4 py-2 text-xs animate-pulse">
                            NOW TRENDING
                          </Badge>
                        </div>
                      </motion.div>
                    );
                  })()}
                </AnimatePresence>
              </div>

              <div className="md:col-span-2 grid grid-cols-2 gap-4">
                {highlightItems.filter((_, i) => i !== currentHighlightIdx).slice(0, 4).map((item) => (
                  <motion.div
                    key={item.id}
                    whileHover={{ y: -4 }}
                    onClick={() => onProductClick(item)}
                    className="group relative aspect-3/4 overflow-hidden rounded-3xl bg-neutral-50 dark:bg-neutral-900 cursor-pointer shadow-sm hover:shadow-xl transition-all duration-500"
                  >
                    <img 
                      src={item.image || 'https://via.placeholder.com/400x500?text=No+Image'} 
                      alt={item.category} 
                      className="h-full w-full object-cover object-top transition-transform duration-700 group-hover:scale-105" 
                      referrerPolicy="no-referrer" 
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = 'https://via.placeholder.com/400x500?text=Error';
                      }}
                    />
                    <div className="absolute inset-0 bg-linear-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                    <div className="absolute bottom-0 left-0 right-0 p-4 translate-y-2 group-hover:translate-y-0 opacity-0 group-hover:opacity-100 transition-all duration-300">
                      <p className="text-[8px] font-mono font-black text-white/80 mb-1">{item.product_code}</p>
                      <div className="flex items-center justify-between text-white">
                        <p className="text-[10px] font-black uppercase line-clamp-1">{item.category}</p>
                        <div className="text-right">
                          <p className="text-[13px] font-black">TK {item.price}</p>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          </section>

          {/* In-Stock Collection Section */}
          <section>
            <div className="flex items-center justify-between mb-8">
              <div className="space-y-1">
                <h2 className="text-2xl font-black text-neutral-900 dark:text-foreground tracking-tight uppercase">Available Now</h2>
                <p className="text-[10px] font-black uppercase tracking-[0.3em] text-neutral-400 dark:text-muted-foreground">All in-stock collections</p>
              </div>
              <Button
                variant="ghost"
                onClick={() => setSelectedCategory('All')}
                className="text-[10px] font-black uppercase tracking-widest hover:bg-neutral-900 dark:hover:bg-neutral-100 hover:text-white dark:hover:text-neutral-900 transition-all gap-2"
              >
                Browse Catalog <ArrowRight className="h-4 w-4" />
              </Button>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              {items
                .filter(i => i.inventory.some(inv => inv.quantity > 0))
                .sort((a, b) => (b.display_order || 0) - (a.display_order || 0))
                .slice(0, 8)
                .map((item) => (
                  <div
                    key={item.id}
                    className="group cursor-pointer space-y-4"
                    onClick={() => onProductClick(item)}
                  >
                    <div className="relative aspect-3/4 overflow-hidden rounded-3xl bg-neutral-50 dark:bg-neutral-900 shadow-sm transition-all duration-500 hover:shadow-xl group-hover:-translate-y-1">
                      <img 
                        src={item.image || 'https://via.placeholder.com/400x500?text=No+Image'} 
                        alt={item.category} 
                        className="h-full w-full object-cover object-top transition-transform duration-700 group-hover:scale-105" 
                        referrerPolicy="no-referrer" 
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = 'https://via.placeholder.com/400x500?text=Error';
                        }}
                      />
                      <div className="absolute top-3 left-3 z-20">
                        <span className="inline-block px-3 py-1 bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 text-[10px] font-mono font-black uppercase rounded-lg shadow-2xl">
                          {item.product_code}
                        </span>
                      </div>
                    </div>
                    <div className="px-2">
                       <h4 className="text-sm font-bold text-neutral-900 dark:text-foreground line-clamp-1 uppercase">{item.category}</h4>
                       <p className="text-lg font-black text-neutral-900 dark:text-foreground">TK {item.price.toLocaleString()}</p>
                    </div>
                  </div>
                ))}
            </div>
          </section>
        </div>
      )}

      {/* Product Grid and Filters */}
      <div className="space-y-8">
        <div className="flex flex-col md:flex-row gap-4 p-4 bg-neutral-50 dark:bg-neutral-900 rounded-2xl border border-neutral-100 dark:border-neutral-800">
          <div className="flex-1 flex flex-wrap gap-3">
            <select
              value={priceFilter}
              onChange={(e) => setPriceFilter(e.target.value)}
              className="h-10 px-3 py-1 bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl text-xs font-bold dark:text-white outline-none"
            >
              <option value="all">Any Price</option>
              <option value="under1000">Under TK 1,000</option>
              <option value="1000-3000">TK 1,000 - TK 3,000</option>
              <option value="over3000">Over TK 3,000</option>
            </select>
            <select
              value={stockFilter}
              onChange={(e) => setStockFilter(e.target.value)}
              className="h-10 px-3 py-1 bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl text-xs font-bold dark:text-white outline-none"
            >
              <option value="all">All Items</option>
              <option value="instock">In Stock Only</option>
            </select>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="h-10 px-3 py-1 bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl text-xs font-bold dark:text-white outline-none"
            >
              <option value="newest">Latest Arrivals</option>
              <option value="priceLow">Price: Low to High</option>
              <option value="priceHigh">Price: High to Low</option>
            </select>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setPriceFilter('all');
              setStockFilter('all');
              setSortBy('newest');
              setSearchQuery('');
              setSelectedCategory('All');
            }}
            className="text-[9px] font-black uppercase tracking-widest h-10 px-4 hover:bg-neutral-900 dark:hover:bg-white hover:text-white dark:hover:text-neutral-900 transition-all rounded-xl"
          >
            Clear Filters
          </Button>
        </div>

        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          <AnimatePresence mode="popLayout">
            {filteredItems.map((item) => (
              <motion.div
                key={item.id}
                layout
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.2 }}
                onClick={() => onProductClick(item)}
              >
                <Card className="group overflow-hidden border-none shadow-sm transition-all hover:shadow-md cursor-pointer dark:bg-neutral-900">
                  <div className="relative aspect-4/5 overflow-hidden bg-neutral-50 dark:bg-neutral-800">
                    <img 
                      src={item.image || 'https://via.placeholder.com/400x500?text=No+Image'} 
                      alt={item.name} 
                      className="h-full w-full object-contain transition-transform duration-500 group-hover:scale-105" 
                      referrerPolicy="no-referrer" 
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = 'https://via.placeholder.com/400x500?text=Error';
                      }}
                    />
                    <div className="absolute left-3 top-3 flex flex-col gap-2">
                       <Badge className="bg-white/90 dark:bg-neutral-800 text-neutral-900 dark:text-white shadow-sm font-black uppercase tracking-widest text-[8px] border-none">
                         {item.category}
                       </Badge>
                    </div>
                  </div>
                  <CardHeader className="p-4 pb-0 space-y-1">
                    <CardTitle className="text-sm font-black line-clamp-1 dark:text-white uppercase tracking-tight">{item.category}</CardTitle>
                    <div className="flex justify-between items-baseline">
                       <span className="text-lg font-black text-neutral-900 dark:text-white">TK {item.price.toLocaleString()}</span>
                    </div>
                  </CardHeader>
                  <CardContent className="p-4 pt-4">
                    <div className="flex flex-wrap gap-2">
                      {item.inventory.map((inv) => (
                        <span key={inv.size} className={`px-2 py-1 text-[8px] font-black rounded border ${inv.quantity > 0 ? 'border-neutral-200 dark:border-neutral-700 dark:text-neutral-400' : 'opacity-20 line-through'}`}>
                          {inv.size}
                        </span>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
