import { useState, useEffect } from 'react';
import type { CartItem, CustomerProfile, OrderPayload } from '../types/cart';
import type { MenuItem, MenuOption } from '../types/catalog';
import { DEFAULT_STORE } from '../data/defaultStore';
import { constructWhatsAppMessage, buildWhatsAppUrl, generateOrderId } from '../utils/whatsapp';

const CART_STORAGE_KEY = 'jasdor_cart';
const CUSTOMER_STORAGE_KEY = 'jasdor_customer_profile';

const DEFAULT_CUSTOMER: CustomerProfile = {
  name: '',
  phone: '',
  deliveryMethod: 'delivery',
  address: '',
  landmark: '',
  googleMapsUrl: '',
};

export function useCartManager() {
  const [cartItems, setCartItems] = useState<CartItem[]>(() => {
    try {
      const saved = localStorage.getItem(CART_STORAGE_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [customer, setCustomer] = useState<CustomerProfile>(() => {
    try {
      const saved = localStorage.getItem(CUSTOMER_STORAGE_KEY);
      return saved ? { ...DEFAULT_CUSTOMER, ...JSON.parse(saved) } : DEFAULT_CUSTOMER;
    } catch {
      return DEFAULT_CUSTOMER;
    }
  });

  // Simpan keranjang otomatis ke localStorage
  useEffect(() => {
    localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cartItems));
  }, [cartItems]);

  // Simpan profil pembeli otomatis
  useEffect(() => {
    localStorage.setItem(CUSTOMER_STORAGE_KEY, JSON.stringify(customer));
  }, [customer]);

  // Tambah item ke keranjang
  const addToCart = (
    menuItem: MenuItem,
    selectedOptions: { groupId: string; groupName: string; option: MenuOption }[],
    quantity: number = 1,
    notes: string = ''
  ) => {
    const optionsArray = selectedOptions.map((o) => ({
      groupId: o.groupId,
      groupName: o.groupName,
      optionId: o.option.id,
      optionName: o.option.name,
      priceDelta: o.option.priceDelta,
    }));

    const unitPrice =
      menuItem.basePrice + optionsArray.reduce((acc, curr) => acc + curr.priceDelta, 0);

    // Buat unique ID berdasarkan menu ID + kombinasi opsi yang dipilih
    const optionsSignature = optionsArray
      .map((o) => `${o.groupId}:${o.optionId}`)
      .sort()
      .join('|');
    const itemUniqueId = `${menuItem.id}-${optionsSignature}-${notes.trim()}`;

    setCartItems((prev) => {
      const existingIndex = prev.findIndex((item) => item.id === itemUniqueId);
      if (existingIndex > -1) {
        const updated = [...prev];
        const current = updated[existingIndex];
        const newQty = current.quantity + quantity;
        updated[existingIndex] = {
          ...current,
          quantity: newQty,
          totalPrice: current.unitPrice * newQty,
        };
        return updated;
      }

      const newItem: CartItem = {
        id: itemUniqueId,
        menuItem,
        quantity,
        selectedOptions: optionsArray,
        notes: notes.trim(),
        unitPrice,
        totalPrice: unitPrice * quantity,
      };
      return [...prev, newItem];
    });
  };

  // Update kuantitas item
  const updateQuantity = (itemId: string, delta: number) => {
    setCartItems((prev) =>
      prev
        .map((item) => {
          if (item.id === itemId) {
            const newQty = item.quantity + delta;
            return newQty > 0
              ? { ...item, quantity: newQty, totalPrice: item.unitPrice * newQty }
              : null;
          }
          return item;
        })
        .filter((item): item is CartItem => item !== null)
    );
  };

  // Hapus item dari keranjang
  const removeFromCart = (itemId: string) => {
    setCartItems((prev) => prev.filter((item) => item.id !== itemId));
  };

  // Kosongkan keranjang
  const clearCart = () => setCartItems([]);

  // Hitung total subtotal
  const subtotal = cartItems.reduce((acc, item) => acc + item.totalPrice, 0);
  const deliveryFee = 0; // MVP: ditentukan penjual di chat
  const total = subtotal + deliveryFee;

  // Generate URL WhatsApp untuk checkout
  const checkoutWhatsAppUrl = (): string | null => {
    if (cartItems.length === 0) return null;

    const now = new Date();
    const createdAt = now.toLocaleString('id-ID', {
      dateStyle: 'medium',
      timeStyle: 'short',
    });

    const payload: OrderPayload = {
      orderId: generateOrderId(DEFAULT_STORE.slug),
      storeId: DEFAULT_STORE.id,
      storeName: DEFAULT_STORE.name,
      whatsappNumber: DEFAULT_STORE.whatsappNumber,
      items: cartItems,
      subtotal,
      deliveryFee,
      total,
      customer,
      createdAt,
    };

    const message = constructWhatsAppMessage(payload);
    return buildWhatsAppUrl(DEFAULT_STORE.whatsappNumber, message);
  };

  return {
    store: DEFAULT_STORE,
    cartItems,
    addToCart,
    updateQuantity,
    removeFromCart,
    clearCart,
    subtotal,
    deliveryFee,
    total,
    customer,
    updateCustomer: (data: Partial<CustomerProfile>) =>
      setCustomer((prev) => ({ ...prev, ...data })),
    checkoutWhatsAppUrl,
  };
}
