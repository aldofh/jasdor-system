import { useState, useEffect } from 'react';
import {
  Dropdown,
  Label,
  SearchField,
  Toast,
  toast,
} from '@heroui/react';
import {
  IconAdjustmentsHorizontal,
  IconCheck,
  IconShoppingBag,
} from '@tabler/icons-react';
import { DEFAULT_STORE } from './data/defaultStore';
import type { MenuItem } from './types/catalog';
import type { CartItem } from './types/cart';
import { DeliveryHeader } from './components/DeliveryHeader';
import { CleanProductCard } from './components/CleanProductCard';
import { ProductDetailPage } from './components/ProductDetailPage';
import { CartStandalonePage } from './components/CartStandalonePage';
import { formatRupiah } from './utils/whatsapp';
import { AdminCatalogPage } from './components/AdminCatalogPage';
import { loadCatalog } from './services/catalogApi';
import type { StoreCatalog } from './types/store';

export default function App() {
  return window.location.pathname === '/admin'
    ? <AdminCatalogPage />
    : <CatalogPage />;
}

function CatalogPage() {
  const [store, setStore] = useState<StoreCatalog>(DEFAULT_STORE);
  const [catalogLoading, setCatalogLoading] = useState(true);
  const [catalogError, setCatalogError] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [sortBy, setSortBy] = useState<'default' | 'price-asc' | 'price-desc'>('default');

  // Modal & Drawer States
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [detailProduct, setDetailProduct] = useState<MenuItem | null>(null);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [favorites, setFavorites] = useState<string[]>([]);

  useEffect(() => {
    let active = true;
    loadCatalog(DEFAULT_STORE)
      .then((catalog) => {
        if (!active) return;
        setStore(catalog);
      })
      .catch((error: unknown) => {
        if (active) {
          setCatalogError(error instanceof Error ? error.message : 'Katalog gagal dimuat.');
        }
      })
      .finally(() => {
        if (active) setCatalogLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  // Integrasi Browser History: Tangani Tombol Back Bawaan HP / Browser
  useEffect(() => {
    const handlePopState = (event: PopStateEvent) => {
      const state = event.state;
      if (!state || state.view === 'home') {
        setDetailProduct(null);
        setIsCartOpen(false);
      } else if (state.view === 'cart') {
        setDetailProduct(null);
        setIsCartOpen(true);
      } else if (state.view === 'product') {
        const found = store.menus.find((m) => m.id === state.productId);
        if (found) {
          setDetailProduct(found);
          setIsCartOpen(false);
        }
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [store]);

  const openProductDetail = (item: MenuItem) => {
    window.history.pushState({ view: 'product', productId: item.id }, '', `#product-${item.id}`);
    setDetailProduct(item);
  };

  const closeProductDetail = () => {
    if (window.history.state?.view === 'product') {
      window.history.back();
    } else {
      setDetailProduct(null);
    }
  };

  const openCart = () => {
    window.history.pushState({ view: 'cart' }, '', '#cart');
    setIsCartOpen(true);
  };

  const closeCart = () => {
    if (window.history.state?.view === 'cart') {
      window.history.back();
    } else {
      setIsCartOpen(false);
    }
  };

  const categories = ['All', ...store.categories];

  const filteredMenus = store.menus
    .filter((item) => {
      const matchCategory =
        selectedCategory === 'All' || item.category === selectedCategory;
      const matchSearch =
        item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.description.toLowerCase().includes(searchQuery.toLowerCase());
      return matchCategory && matchSearch;
    })
    .sort((a, b) => {
      if (sortBy === 'price-asc') return a.basePrice - b.basePrice;
      if (sortBy === 'price-desc') return b.basePrice - a.basePrice;
      return 0;
    });

  const totalQuantity = cartItems.reduce((acc, item) => acc + item.quantity, 0);
  const subtotal = cartItems.reduce((acc, item) => acc + item.totalPrice, 0);

  const showToast = (title: string, description?: string) => {
    toast(title, {
      description,
      indicator: (
        <div className="w-8 h-8 rounded-xl bg-paper-frost text-pricing-blue border border-hairline flex items-center justify-center shrink-0">
          <IconShoppingBag size={17} stroke={2} />
        </div>
      ),
      variant: 'default',
      timeout: 2500,
    });
  };

  const handleAddToCart = (item: CartItem) => {
    setCartItems((prev) => [...prev, item]);
    showToast(`1x ${item.menuItem.name}`, 'Ditambahkan ke keranjang belanja');
  };

  const handleToggleFavorite = (id: string) => {
    setFavorites((prev) =>
      prev.includes(id) ? prev.filter((f) => f !== id) : [...prev, id]
    );
  };

  const handleRemoveItem = (id: string) => {
    setCartItems((prev) => prev.filter((item) => item.id !== id));
  };

  const handleClearCart = () => {
    setCartItems([]);
  };

  if (catalogLoading || catalogError) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gallery-white px-6 text-center">
        <div className="max-w-sm">
          <p className="font-semibold text-ink">
            {catalogLoading ? 'Memuat katalog…' : 'Katalog belum dapat dimuat'}
          </p>
          {catalogError && <p role="alert" className="mt-2 text-sm text-red-700">{catalogError}</p>}
          {catalogError && (
            <button type="button" onClick={() => window.location.reload()} className="mt-4 rounded-xl bg-ink px-4 py-2 text-sm font-medium text-white">
              Coba lagi
            </button>
          )}
        </div>
      </div>
    );
  }

  if (isCartOpen) {
    return (
      <>
        <Toast.Provider placement="top" />
        <CartStandalonePage
          onBack={closeCart}
          cartItems={cartItems}
          store={store}
          onRemoveItem={handleRemoveItem}
          onClearCart={handleClearCart}
        />
      </>
    );
  }
  if (detailProduct) {
    return (
      <>
        <Toast.Provider placement="top" />
        <ProductDetailPage
          item={detailProduct}
          onBack={closeProductDetail}
          onAddToCart={handleAddToCart}
          isFavorite={favorites.includes(detailProduct.id)}
          onToggleFavorite={handleToggleFavorite}
        />
      </>
    );
  }

  return (
    <>
      <Toast.Provider placement="top" />
      <div className="min-h-screen bg-gallery-white text-ink pb-20 font-sans antialiased">
        {/* App Shell Container Maksimal Mobile-First */}
        <div className="max-w-md mx-auto px-4 pt-3 space-y-4">
          {/* 1. Header Toko */}
          <DeliveryHeader
            store={store}
          />

          {/* 2. Search Bar Bersih: Paper Frost, Hairline & Dropdown Popover */}
          <div className="relative flex items-center gap-2">
            <SearchField
              value={searchQuery}
              onChange={setSearchQuery}
              className="flex-1"
              aria-label="Cari menu kopi atau makanan"
            >
              <SearchField.Group className="bg-paper-frost rounded-2xl border border-hairline h-10 px-3 flex items-center">
                <SearchField.SearchIcon className="text-steel mr-2 shrink-0" />
                <SearchField.Input
                  placeholder="Cari kopi, teh, camilan..."
                  className="text-sm bg-transparent border-0 placeholder:text-steel text-ink focus:outline-none flex-1 w-full"
                />
                <SearchField.ClearButton className="text-steel shrink-0" />
              </SearchField.Group>
            </SearchField>

            <Dropdown>
              <Dropdown.Trigger>
                <button
                  type="button"
                  className={`w-10 h-10 rounded-2xl flex items-center justify-center transition-colors shrink-0 border ${
                    sortBy !== 'default'
                      ? 'bg-pricing-blue text-gallery-white border-pricing-blue'
                      : 'bg-paper-frost text-ink border-hairline hover:bg-studio-mist'
                  }`}
                  aria-label="Filter dan sortir menu"
                >
                  <IconAdjustmentsHorizontal size={18} stroke={1.75} />
                </button>
              </Dropdown.Trigger>
              <Dropdown.Popover placement="bottom end">
                <Dropdown.Menu onAction={(key) => setSortBy(key as any)}>
                  <Dropdown.Item id="default" textValue="Default">
                    <div className="flex items-center justify-between w-full py-0.5 text-xs">
                      <Label className="font-medium text-ink">Rekomendasi</Label>
                      {sortBy === 'default' && <IconCheck size={14} className="text-pricing-blue" stroke={2.5} />}
                    </div>
                  </Dropdown.Item>
                  <Dropdown.Item id="price-asc" textValue="Termurah">
                    <div className="flex items-center justify-between w-full py-0.5 text-xs">
                      <Label className="font-medium text-ink">Harga Terendah</Label>
                      {sortBy === 'price-asc' && <IconCheck size={14} className="text-pricing-blue" stroke={2.5} />}
                    </div>
                  </Dropdown.Item>
                  <Dropdown.Item id="price-desc" textValue="Termahal">
                    <div className="flex items-center justify-between w-full py-0.5 text-xs">
                      <Label className="font-medium text-ink">Harga Tertinggi</Label>
                      {sortBy === 'price-desc' && <IconCheck size={14} className="text-pricing-blue" stroke={2.5} />}
                    </div>
                  </Dropdown.Item>
                </Dropdown.Menu>
              </Dropdown.Popover>
            </Dropdown>
          </div>

          {/* Clean Horizontal Scrollable Category Pills */}
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1 -mx-4 px-4">
            {categories.map((cat) => {
              const isActive = selectedCategory === cat;
              return (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-4 py-2 rounded-full text-xs font-semibold shrink-0 cursor-pointer border ${
                    isActive
                      ? 'bg-ink text-gallery-white border-ink shadow-xs'
                      : 'bg-paper-frost text-slate border-hairline hover:bg-studio-mist hover:text-ink'
                  }`}
                >
                  {cat === 'All' ? 'Semua Menu' : cat}
                </button>
              );
            })}
          </div>

          {/* 6. Grid Produk 2 Kolom Bersih */}
          <div className="grid grid-cols-2 gap-3 pt-1">
            {filteredMenus.map((item) => (
              <CleanProductCard
                key={item.id}
                item={item}
                isFavorite={favorites.includes(item.id)}
                onToggleFavorite={handleToggleFavorite}
                onSelect={(selected) => openProductDetail(selected)}
                onQuickAdd={(selected) => openProductDetail(selected)}
              />
            ))}
          </div>
        </div>

        {/* FAB Floating Cart Button */}
        {cartItems.length > 0 && (
          <div className="fixed bottom-6 right-6 z-40">
            <button
              type="button"
              onClick={openCart}
              className="group relative flex items-center gap-3 bg-ink text-gallery-white pl-4 pr-5 py-3.5 rounded-full shadow-2xl border border-hairline hover:bg-black transition-transform active:scale-95 cursor-pointer"
              aria-label="Buka keranjang belanja"
            >
              {/* Bag Icon dengan Badge Counter */}
              <div className="relative">
                <IconShoppingBag size={22} stroke={2} />
                <span className="absolute -top-2 -right-2.5 min-w-[20px] h-5 rounded-full bg-pricing-blue text-gallery-white text-[11px] font-bold flex items-center justify-center px-1 shadow-xs">
                  {totalQuantity}
                </span>
              </div>

              {/* Total Belanja */}
              <div className="text-left border-l border-slate/40 pl-3">
                <span className="text-[10px] text-control-gray block font-normal leading-none mb-0.5">
                  Total
                </span>
                <span className="text-sm font-semibold leading-none text-gallery-white">
                  {formatRupiah(subtotal)}
                </span>
              </div>
            </button>
          </div>
        )}

      </div>
    </>
  );
}
