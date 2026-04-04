export interface ClothingItem {
  id: string;
  name: string;
  category: string;
  price: number;
  original_price?: number;
  image: string;
  video_url?: string;
  images?: string[];
  description: string;
  display_order?: number;
  inventory: {
    size: string;
    quantity: number;
  }[];
}

export interface CartItem extends ClothingItem {
  selectedSize: 'S' | 'M' | 'L' | 'XL';
  cartQuantity: number;
}

export interface OrderItem {
  id: string;
  name: string;
  size: string;
  quantity: number;
  price: number;
  image: string;
}

export interface Order {
  id: string;
  customer_name: string;
  phone: string;
  address: string;
  delivery_location: 'inside' | 'outside';
  delivery_charge: number;
  total_amount: number;
  status: 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled';
  created_at: string;
  items: OrderItem[];
}
