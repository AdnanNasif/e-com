import { useState, useEffect } from 'react';
import { CartItem, ClothingItem } from '../../core/types';

export function useCart() {
  const [cart, setCart] = useState<CartItem[]>(() => {
    const saved = localStorage.getItem('cart');
    return saved ? JSON.parse(saved) : [];
  });

  useEffect(() => {
    localStorage.setItem('cart', JSON.stringify(cart));
  }, [cart]);

  const addToCart = (item: ClothingItem, size: string) => {
    const existing = cart.find(i => i.id === item.id && i.selectedSize === size);
    if (existing) {
      setCart(cart.map(i => 
        (i.id === item.id && i.selectedSize === size) 
          ? { ...i, cartQuantity: i.cartQuantity + 1 } 
          : i
      ));
    } else {
      setCart([...cart, { ...item, selectedSize: size as any, cartQuantity: 1 }]);
    }
  };

  const removeFromCart = (id: string, size: string) => {
    setCart(cart.filter(i => !(i.id === id && i.selectedSize === size)));
  };

  const updateQuantity = (id: string, size: string, delta: number) => {
    setCart(cart.map(i => {
      if (i.id === id && i.selectedSize === size) {
        const newQty = Math.max(1, i.cartQuantity + delta);
        return { ...i, cartQuantity: newQty };
      }
      return i;
    }));
  };

  const clearCart = () => setCart([]);

  const cartTotal = cart.reduce((sum, item) => sum + (item.price * item.cartQuantity), 0);

  return { cart, addToCart, removeFromCart, updateQuantity, clearCart, cartTotal };
}
