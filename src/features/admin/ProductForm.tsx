import React, { useState, useEffect, useRef } from 'react';
import { X, Save, Upload, Loader2, Plus, Trash2, ImagePlus } from 'lucide-react';
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
}

export function ProductForm({ item, onSave, onClose }: ProductFormProps) {
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
    inventory: [
      { size: 'S', quantity: 10 },
      { size: 'M', quantity: 10 },
      { size: 'L', quantity: 10 },
      { size: 'XL', quantity: 10 },
    ]
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
    }
  }, [item]);

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
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-2xl bg-white dark:bg-neutral-900 rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        <div className="p-8 border-b dark:border-neutral-800 flex justify-between items-center bg-neutral-50 dark:bg-neutral-800/50">
          <div>
            <h2 className="text-2xl font-black tracking-tighter dark:text-white">
              {item ? 'Refine Creation' : 'New Masterpiece'}
            </h2>
            <p className="text-xs text-neutral-500 font-sans">Enter the details of your premium apparel.</p>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose} className="rounded-full">
            <X className="w-5 h-5" />
          </Button>
        </div>

        <ScrollArea className="flex-1">
          <form id="product-form" onSubmit={handleSubmit} className="p-8 space-y-6">
            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-neutral-400">Creation Name</label>
                <Input 
                  required
                  value={formData.name}
                  onChange={e => setFormData({...formData, name: e.target.value})}
                  className="rounded-xl h-12 bg-neutral-50 dark:bg-neutral-800 border-none"
                  placeholder="e.g. Signature Silk T-Shirt"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-neutral-400">Product Code</label>
                <Input 
                  required
                  value={formData.product_code}
                  onChange={e => setFormData({...formData, product_code: e.target.value})}
                  className="rounded-xl h-12 bg-neutral-50 dark:bg-neutral-800 border-none"
                  placeholder="e.g. LIZ-24-001"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-neutral-400">Price (BDT)</label>
                <Input 
                  type="number"
                  required
                  value={formData.price}
                  onChange={e => setFormData({...formData, price: Number(e.target.value)})}
                  className="rounded-xl h-12 bg-neutral-50 dark:bg-neutral-800 border-none font-mono"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-neutral-400">Original Price (optional)</label>
                <Input 
                  type="number"
                  value={formData.original_price}
                  onChange={e => setFormData({...formData, original_price: Number(e.target.value)})}
                  className="rounded-xl h-12 bg-neutral-50 dark:bg-neutral-800 border-none font-mono"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-neutral-400">Visual Identity</label>
              <div className="flex gap-4">
                <div className="flex-1 space-y-2">
                  <Input 
                    required
                    value={formData.image}
                    onChange={e => setFormData({...formData, image: e.target.value})}
                    className="rounded-xl h-12 bg-neutral-50 dark:bg-neutral-800 border-none"
                    placeholder="Image URL (Unsplash/Direct)"
                  />
                </div>
                <div className="relative">
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleImageUpload}
                    className="hidden"
                    accept="image/*"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploading}
                    className="h-12 rounded-xl px-6 border-neutral-200 dark:border-neutral-800 gap-2 font-bold whitespace-nowrap"
                  >
                    {uploading ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <ImagePlus className="w-4 h-4" />
                    )}
                    {uploading ? 'Uploading...' : 'Local Upload'}
                  </Button>
                </div>
              </div>
              {formData.image && (
                <div className="mt-4 relative aspect-video rounded-2xl overflow-hidden border border-neutral-100 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-800/20">
                  <img src={formData.image} className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
                  <Badge className="absolute bottom-4 left-4 bg-white/20 backdrop-blur-md border-white/20 text-white font-mono text-[10px]">
                    PREVIEW
                  </Badge>
                </div>
              )}
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-neutral-400">Description</label>
              <textarea 
                required
                value={formData.description}
                onChange={e => setFormData({...formData, description: e.target.value})}
                className="w-full rounded-xl p-4 bg-neutral-50 dark:bg-neutral-800 border-none min-h-[100px] text-sm focus:ring-2 focus:ring-neutral-200 outline-none"
                placeholder="Describe the elegance..."
              />
            </div>

            <div className="space-y-4">
              <label className="text-[10px] font-black uppercase tracking-widest text-neutral-400">Precision Inventory</label>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {formData.inventory.map((inv, idx) => (
                  <div key={inv.size} className="p-4 bg-neutral-50 dark:bg-neutral-800 rounded-2xl">
                    <span className="text-[10px] font-black block mb-2">{inv.size}</span>
                    <Input 
                      type="number"
                      value={inv.quantity}
                      onChange={e => updateInventory(idx, Number(e.target.value))}
                      className="h-8 bg-white dark:bg-neutral-900 border-none rounded-lg text-center font-mono text-xs"
                    />
                  </div>
                ))}
              </div>
            </div>
          </form>
        </ScrollArea>

        <div className="p-8 border-t dark:border-neutral-800 flex gap-4">
          <Button variant="outline" className="flex-1 rounded-xl h-12 font-bold" onClick={onClose}>
            Cancel
          </Button>
          <Button className="flex-1 rounded-xl h-12 bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 font-bold" type="submit" form="product-form" disabled={loading}>
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5 mr-2" />}
            Save Creation
          </Button>
        </div>
      </div>
    </div>
  );
}
