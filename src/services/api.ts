import { 
  db, 
  collection, 
  doc, 
  getDoc,
  getDocs, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  setDoc,
  onSnapshot, 
  query, 
  orderBy, 
  where,
  serverTimestamp,
  handleFirestoreError,
  OperationType,
} from '../core/firebase';
import { ClothingItem, Order, HomepageSettings, UserProfile } from '../core/types';

export const CatalogService = {
  subscribeToProducts: (callback: (items: ClothingItem[]) => void) => {
    const path = 'products';
    const q = query(collection(db, path), orderBy('display_order', 'asc'));
    return onSnapshot(q, (snapshot) => {
      const itemsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ClothingItem));
      callback(itemsData);
    }, (error) => handleFirestoreError(error, OperationType.GET, path));
  },

  updateInventory: async (itemId: string, size: string, newQuantity: number) => {
    const path = `products/${itemId}`;
    const productRef = doc(db, 'products', itemId);
    try {
      const pDoc = await getDoc(productRef);
      if (pDoc.exists()) {
        const pData = pDoc.data() as ClothingItem;
        const newInventory = pData.inventory.map(inv => 
          inv.size === size ? { ...inv, quantity: newQuantity } : inv
        );
        await updateDoc(productRef, { 
          inventory: newInventory,
          updated_at: serverTimestamp()
        });
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, path);
    }
  },

  deleteProduct: async (id: string) => {
    const path = `products/${id}`;
    try {
      await deleteDoc(doc(db, 'products', id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, path);
    }
  },

  saveProduct: async (id: string | null, data: any) => {
    const path = id ? `products/${id}` : 'products';
    try {
      if (id) {
        await updateDoc(doc(db, 'products', id), {
          ...data,
          updated_at: serverTimestamp()
        });
      } else {
        await addDoc(collection(db, 'products'), {
          ...data,
          created_at: serverTimestamp(),
          updated_at: serverTimestamp()
        });
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, path);
    }
  }
};

export const OrderService = {
  subscribeToOrders: (callback: (orders: Order[]) => void) => {
    const path = 'orders';
    const q = query(collection(db, path), orderBy('created_at', 'desc'));
    return onSnapshot(q, (snapshot) => {
      const ordersData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Order));
      callback(ordersData);
    }, (error) => handleFirestoreError(error, OperationType.GET, path));
  },

  createOrder: async (orderData: any) => {
    const path = 'orders';
    try {
      const docRef = await addDoc(collection(db, path), {
        ...orderData,
        created_at: serverTimestamp(),
        updated_at: serverTimestamp(),
        status: 'pending'
      });
      return docRef.id;
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, path);
    }
  },

  updateOrderStatus: async (orderId: string, status: string) => {
    const path = `orders/${orderId}`;
    try {
      await updateDoc(doc(db, 'orders', orderId), { status, updated_at: serverTimestamp() });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, path);
    }
  },

  deleteOrder: async (orderId: string) => {
    const path = `orders/${orderId}`;
    try {
      await deleteDoc(doc(db, 'orders', orderId));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, path);
    }
  }
};

export const ProfileService = {
  getProfile: async (uid: string) => {
    const path = `userProfiles/${uid}`;
    try {
      const profileDoc = await getDoc(doc(db, 'userProfiles', uid));
      return profileDoc.exists() ? (profileDoc.data() as UserProfile) : null;
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, path);
    }
  },

  saveProfile: async (uid: string, profile: Partial<UserProfile>) => {
    const path = `userProfiles/${uid}`;
    try {
      await setDoc(doc(db, 'userProfiles', uid), profile, { merge: true });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, path);
    }
  }
};

export const SettingsService = {
  subscribeToSettings: (callback: (settings: HomepageSettings) => void) => {
    const path = 'settings/homepage';
    return onSnapshot(doc(db, 'settings', 'homepage'), (doc) => {
      if (doc.exists()) {
        callback(doc.data() as HomepageSettings);
      }
    }, (error) => handleFirestoreError(error, OperationType.GET, path));
  },

  updateSettings: async (settings: HomepageSettings) => {
    const path = 'settings/homepage';
    try {
      await setDoc(doc(db, 'settings', 'homepage'), settings);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, path);
    }
  }
};
