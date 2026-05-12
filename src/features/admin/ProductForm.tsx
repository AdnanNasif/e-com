import React, { useState, useEffect, useRef } from 'react';
import { X, Save, Upload, Loader2, Plus, Minus, Trash2, ImagePlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ClothingItem } from '../../core/types';
import { uploadToCloudinary } from '../../lib/cloudinary';

interface ProductFormProps {
  item?: ClothingItem | null;
  onSave: (id: string | null, data: any) => Promise<void>;
  onClose: () => void;
  suggestedCode?: string;
}

export function ProductForm({ item, onSave, onClose, suggestedCode }: ProductFormProps) {
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [formData, setFormData] = useState({
    name: '',
    price: 0,
    original_price: 0,
    description: '',
    category: 'Premium',
    image: '',
    product_code: '',
    display_order: 0,
    inventory: []
  });

  useEffect(() => {
    if (item) {
      setFormData({
        name: item.name,
        price: item.price,
        original_price: item.original_price || 0,
        description: item.description,
        category: item.category,
        image: item.image,
        product_code: item.product_code || '',
        display_order: item.display_order || 0,
        inventory: item.inventory
      });
    } else {
      setFormData({
        name: '',
        price: 0,
        original_price: 0,
        description: '',
        category: 'Premium',
        image: '',
        product_code: suggestedCode || '',
        display_order: 0,
        inventory: []
      });
    }
  }, [item, suggestedCode]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await onSave(item ? item.id : null, formData);
      onClose();
    } catch (error) {
      console.error('Error saving product:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateInventory = (index: number, quantity: number) => {
    const newInv = [...formData.inventory];
    newInv[index].quantity = quantity;
    setFormData({ ...formData, inventory: newInv });
  };

  const addSize = (size: string) => {
    if (formData.inventory.some(inv => inv.size === size)) return;
    setFormData({
      ...formData,
      inventory: [...formData.inventory, { size, quantity: 0 }]
    });
  };

  const removeSize = (index: number) => {
    const newInv = [...formData.inventory];
    newInv.splice(index, 1);
    setFormData({ ...formData, inventory: newInv });
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const url = await uploadToCloudinary(file);
      setFormData(prev => ({ ...prev, image: url }));
    } catch (error) {
      console.error('Upload error:', error);
      alert(error instanceof Error ? error.message : 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className={`space-y-12 ${!item ? '' : 'fixed inset-0 z-[60] flex items-center justify-center p-4'}`}>
      {item && <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />}
      <div className={`${item ? 'relative w-full max-w-4xl bg-white dark:bg-neutral-900 rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]' : 'w-full'}`}>
        {item && (
          <div className="p-8 border-b dark:border-neutral-800 flex justify-between items-center bg-neutral-50 dark:bg-neutral-800/50">
            <div>
              <h2 className="text-2xl font-black tracking-tighter dark:text-white">Edit Dress</h2>
              <p className="text-xs text-neutral-500 font-sans">Modify your signature creation.</p>
            </div>
            <Button variant="ghost" size="icon" onClick={onClose} className="rounded-full h-10 w-10">
              <X className="w-5 h-5" />
            </Button>
          </div>
        )}

        <div className={`${item ? 'overflow-y-auto p-8' : ''}`}>
          <form id="product-form" onSubmit={handleSubmit} className="space-y-8 text-white">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* Row 1: Name & Product Code */}
              <div className="space-y-4 text-neutral-900">
                <label className="text-sm font-bold dark:text-white flex items-center gap-2">
                  Dress Name
                </label>
                <Input 
                  required
                  value={formData.name}
                  onChange={e => setFormData({...formData, name: e.target.value})}
                  className="rounded-2xl h-14 bg-[#f8f9fa] dark:bg-neutral-800 border-neutral-200 dark:border-neutral-700 px-6"
                  placeholder="Enter dress name"
                />
              </div>
              <div className="space-y-4 text-neutral-900">
                <label className="text-sm font-bold dark:text-white flex items-center gap-2">
                  Product Code
                </label>
                <Input 
                  required
                  value={formData.product_code}
                  onChange={e => setFormData({...formData, product_code: e.target.value})}
                  className="rounded-2xl h-14 bg-[#f8f9fa] dark:bg-neutral-800 border-neutral-200 dark:border-neutral-700 px-6 font-mono"
                  placeholder="e.g. SKU-101"
                />
              </div>

              {/* Row 2: Regular Price & Offer Price */}
              <div className="space-y-4 text-neutral-900">
                <label className="text-sm font-bold dark:text-white flex items-center gap-2">
                  Regular Price (৳)
                </label>
                <Input 
                  type="number"
                  value={formData.original_price}
                  onChange={e => setFormData({...formData, original_price: Number(e.target.value)})}
                  className="rounded-2xl h-14 bg-[#f8f9fa] dark:bg-neutral-800 border-neutral-200 dark:border-neutral-700 px-6"
                  placeholder="e.g. 5000"
                />
              </div>
              <div className="space-y-4 text-neutral-900">
                <label className="text-sm font-bold dark:text-white flex items-center gap-2">
                  Offer Price (৳)
                </label>
                <Input 
                  type="number"
                  required
                  value={formData.price}
                  onChange={e => setFormData({...formData, price: Number(e.target.value)})}
                  className="rounded-2xl h-14 bg-neutral-900 text-white border-none px-6 font-black"
                  placeholder="e.g. 4500"
                />
              </div>

              {/* Row 3: Category & Stock Quantity (Status) */}
              <div className="space-y-4 text-neutral-900">
                <label className="text-sm font-bold dark:text-white flex items-center gap-2">
                  Category
                </label>
                <select 
                  value={formData.category}
                  onChange={e => setFormData({...formData, category: e.target.value})}
                  className="w-full rounded-2xl h-14 bg-[#f8f9fa] dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 px-6 appearance-none dark:text-white"
                >
                  {['3 pieces', 'COCO', 'ZAMZAM', 'Party dress', 'Silk', 'Linen', 'Cotton', 'Premium'].map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-4 text-neutral-900">
                <label className="text-sm font-bold dark:text-white flex items-center gap-2">
                  Total Stock (Calculated)
                </label>
                <div className="rounded-2xl h-14 bg-[#f8f9fa] dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 px-6 flex items-center dark:text-white font-mono">
                  {formData.inventory.reduce((acc, curr) => acc + curr.quantity, 0)} Units Available
                </div>
              </div>
            </div>

            {/* Row 4: Size and its quantity */}
            <div className="space-y-4">
              <label className="text-sm font-bold text-neutral-900 dark:text-white flex items-center gap-2">
                Sizes & Quantities
              </label>
              <div className="grid grid-cols-2 md:grid-cols-6 gap-4 p-6 bg-[#f8f9fa] dark:bg-neutral-800 rounded-3xl border border-neutral-200 dark:border-neutral-700">
                {['S', 'M', 'L', 'XL', 'Unstitched', 'Freesize'].map(s => {
                  const inv = formData.inventory.find(i => i.size === s);
                  const isSelected = !!inv;
                  return (
                    <div key={s} className={`flex flex-col gap-2 p-3 rounded-2xl transition-all ${isSelected ? 'bg-white dark:bg-neutral-900 shadow-sm border border-neutral-100 dark:border-neutral-700' : 'opacity-40'}`}>
                      <div className="flex justify-between items-center px-1">
                        <span className="text-xs font-black text-neutral-900 dark:text-white uppercase">{s}</span>
                        <input 
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => isSelected ? removeSize(formData.inventory.findIndex(i => i.size === s)) : addSize(s)}
                          className="w-4 h-4 rounded accent-neutral-900"
                        />
                      </div>
                      {isSelected && (
                        <Input 
                          type="number"
                          min="0"
                          value={inv.quantity}
                          onChange={e => {
                            const idx = formData.inventory.findIndex(i => i.size === s);
                            updateInventory(idx, Math.max(0, Number(e.target.value)));
                          }}
                          className="h-8 border-none bg-neutral-50 dark:bg-neutral-800 text-center font-mono text-xs dark:text-white"
                        />
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Row 5: Visuals */}
            <div className="space-y-4">
              <label className="text-sm font-bold text-neutral-900 dark:text-white flex items-center gap-2">
                Product Image
              </label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div 
                  className="aspect-video bg-[#f8f9fa] dark:bg-neutral-800 border-2 border-dashed border-neutral-200 dark:border-neutral-700 rounded-[2rem] flex flex-col items-center justify-center cursor-pointer hover:bg-neutral-50 dark:hover:bg-neutral-700 transition-all gap-4"
                  onClick={() => fileInputRef.current?.click()}
                >
                  {uploading ? (
                    <Loader2 className="w-10 h-10 animate-spin text-[#c2185b]" />
                  ) : (
                    <>
                      <Upload className="w-10 h-10 text-neutral-300" />
                      <div className="text-center">
                        <p className="text-xs font-bold text-neutral-500">Click to upload product image</p>
                        <p className="text-[10px] text-neutral-400">PNG, JPG or WEBP (Max 5MB)</p>
                      </div>
                    </>
                  )}
                  <input type="file" ref={fileInputRef} onChange={handleImageUpload} className="hidden" accept="image/*" />
                </div>
                {formData.image && (
                  <div className="aspect-video rounded-[2rem] overflow-hidden border border-neutral-200 dark:border-neutral-700">
                    <img src={formData.image} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                  </div>
                )}
              </div>
            </div>

            {/* Row 6: Description */}
            <div className="space-y-4">
              <label className="text-sm font-bold text-neutral-900 dark:text-white flex items-center gap-2">
                Product Description
              </label>
              <textarea 
                required
                value={formData.description}
                onChange={e => setFormData({...formData, description: e.target.value})}
                className="w-full rounded-[2rem] p-8 bg-[#f8f9fa] dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 min-h-[150px] text-neutral-900 dark:text-white text-sm focus:ring-0 outline-none"
                placeholder="Share the story behind this creation..."
              />
            </div>

            <div className="flex justify-start">
              <Button 
                className="bg-[#c2185b] hover:bg-[#ad1457] text-white rounded-2xl px-12 h-14 font-black shadow-lg shadow-[#c2185b]/20"
                type="submit"
                disabled={loading || uploading}
              >
                {loading ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : <Save className="w-5 h-5 mr-2" />}
                {item ? 'Update Dress' : 'Save Dress'}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
