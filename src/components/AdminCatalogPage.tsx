import { useEffect, useMemo, useState, type FormEvent, type ChangeEvent } from 'react';
import { IconArrowLeft, IconDeviceFloppy, IconPencil, IconPlus, IconTrash } from '@tabler/icons-react';
import { DEFAULT_STORE } from '../data/defaultStore';
import type { MenuItem } from '../types/catalog';
import type { StoreCatalog } from '../types/store';
import { formatRupiah } from '../utils/whatsapp';
import { loadCatalog, saveCatalog } from '../services/catalogApi';

type MenuForm = Pick<
  MenuItem,
  'name' | 'description' | 'basePrice' | 'imageUrl' | 'category' | 'isAvailable'
>;

const EMPTY_FORM: MenuForm = {
  name: '',
  description: '',
  basePrice: 0,
  imageUrl: '',
  category: '',
  isAvailable: true,
};

const MAX_IMAGE_SIZE = 1024 * 1024;

function isAllowedImageSource(value: string): boolean {
  return /^(https?:\/\/|\/|data:image\/)/i.test(value);
}

export function AdminCatalogPage() {
  const [store, setStore] = useState<StoreCatalog | null>(null);
  const [form, setForm] = useState<MenuForm>(EMPTY_FORM);
  const [editingMenuId, setEditingMenuId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [notice, setNotice] = useState('');

  useEffect(() => {
    let active = true;
    loadCatalog(DEFAULT_STORE)
      .then((catalog) => {
        if (!active) return;
        setStore(catalog);
      })
      .catch((error: unknown) => {
        if (active) {
          setErrorMessage(error instanceof Error ? error.message : 'Katalog gagal dimuat.');
        }
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  const categories = useMemo(
    () => store?.categories ?? [],
    [store],
  );

  const resetForm = () => {
    setForm({ ...EMPTY_FORM, category: categories[0] ?? '' });
    setEditingMenuId(null);
  };

  const startEditing = (item: MenuItem) => {
    setEditingMenuId(item.id);
    setForm({
      name: item.name,
      description: item.description,
      basePrice: item.basePrice,
      imageUrl: item.imageUrl,
      category: item.category,
      isAvailable: item.isAvailable,
    });
    setErrorMessage('');
    setNotice('');
  };

  const persistCatalog = async (updated: StoreCatalog, successMessage: string): Promise<boolean> => {
    setIsSaving(true);
    setErrorMessage('');
    setNotice('');
    try {
      const saved = await saveCatalog(updated);
      setStore(saved);
      setNotice(successMessage);
      return true;
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Perubahan gagal disimpan.');
      return false;
    } finally {
      setIsSaving(false);
    }
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!store) return;

    const name = form.name.trim();
    const imageUrl = form.imageUrl.trim();
    const category = form.category.trim();
    if (!name || !category || !imageUrl || !isAllowedImageSource(imageUrl)) {
      setErrorMessage('Isi nama, kategori, dan gambar dengan URL http(s), path lokal, atau unggahan gambar.');
      return;
    }
    if (!Number.isFinite(form.basePrice) || form.basePrice < 0) {
      setErrorMessage('Harga harus berupa angka nol atau lebih.');
      return;
    }

    const menu: MenuItem = {
      id: editingMenuId ?? `menu-${crypto.randomUUID()}`,
      name,
      description: form.description.trim(),
      basePrice: Math.round(form.basePrice),
      imageUrl,
      category,
      isAvailable: form.isAvailable,
      ...(editingMenuId
        ? { optionGroups: store.menus.find((item) => item.id === editingMenuId)?.optionGroups }
        : {}),
    };
    const updated: StoreCatalog = {
      ...store,
      categories: store.categories.includes(category)
        ? store.categories
        : [...store.categories, category],
      menus: editingMenuId
        ? store.menus.map((item) => item.id === editingMenuId ? menu : item)
        : [...store.menus, menu],
    };
    const saved = await persistCatalog(updated, editingMenuId ? 'Menu berhasil diperbarui.' : 'Menu berhasil ditambahkan.');
    if (saved) resetForm();
  };

  const handleDelete = async (item: MenuItem) => {
    if (!store || !window.confirm(`Hapus "${item.name}" dari katalog?`)) return;
    const updated = {
      ...store,
      menus: store.menus.filter((menu) => menu.id !== item.id),
    };
    await persistCatalog(updated, 'Menu berhasil dihapus.');
    if (editingMenuId === item.id) resetForm();
  };

  const handleImageUpload = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setErrorMessage('Pilih file gambar yang valid.');
      event.target.value = '';
      return;
    }
    if (file.size > MAX_IMAGE_SIZE) {
      setErrorMessage('Ukuran gambar maksimal 1 MB.');
      event.target.value = '';
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setForm((current) => ({ ...current, imageUrl: reader.result as string }));
        setErrorMessage('');
      }
    };
    reader.onerror = () => setErrorMessage('Gambar gagal dibaca. Coba pilih file lain.');
    reader.readAsDataURL(file);
  };

  return (
    <main className="min-h-screen bg-studio-mist text-ink p-4 sm:p-8">
      <div className="mx-auto max-w-6xl">
        <header className="mb-6 flex items-center justify-between gap-4">
          <div>
            <a href="/" className="mb-3 inline-flex items-center gap-1 text-sm text-slate hover:text-ink">
              <IconArrowLeft size={17} /> Kembali ke katalog
            </a>
            <h1 className="text-2xl font-bold">Admin Katalog</h1>
            <p className="mt-1 text-sm text-slate">Kelola produk yang tampil di halaman pelanggan.</p>
          </div>
        </header>

        {isLoading ? (
          <p role="status" className="rounded-2xl bg-white p-6">Memuat katalog…</p>
        ) : errorMessage && !store ? (
          <div role="alert" className="rounded-2xl border border-red-200 bg-white p-6 text-red-700">{errorMessage}</div>
        ) : (
          <>
            {errorMessage && <p role="alert" className="mb-4 rounded-xl bg-red-50 p-3 text-sm text-red-700">{errorMessage}</p>}
            {notice && <p role="status" className="mb-4 rounded-xl bg-emerald-50 p-3 text-sm text-emerald-800">{notice}</p>}

            <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1.3fr)_minmax(320px,0.7fr)]">
              <section className="rounded-2xl border border-hairline bg-white p-4 sm:p-6">
                <div className="mb-4 flex items-center justify-between">
                  <div>
                    <h2 className="text-lg font-semibold">Katalog {store?.name}</h2>
                    <p className="text-sm text-slate">{store?.menus.length ?? 0} menu</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => { resetForm(); setErrorMessage(''); setNotice(''); }}
                    className="inline-flex items-center gap-2 rounded-xl bg-ink px-3 py-2 text-sm font-medium text-white hover:bg-slate"
                  >
                    <IconPlus size={17} /> Tambah menu
                  </button>
                </div>
                <div className="divide-y divide-hairline">
                  {store?.menus.map((item) => (
                    <article key={item.id} className="flex items-center gap-3 py-3">
                      <img src={item.imageUrl} alt="" className="h-16 w-16 rounded-xl border border-hairline bg-paper-frost object-cover" />
                      <div className="min-w-0 flex-1">
                        <h3 className="truncate font-semibold">{item.name}</h3>
                        <p className="text-sm text-slate">{item.category} · {formatRupiah(item.basePrice)}</p>
                        <p className={`text-xs ${item.isAvailable ? 'text-emerald-700' : 'text-amber-700'}`}>
                          {item.isAvailable ? 'Tersedia' : 'Tidak tersedia'}
                        </p>
                      </div>
                      <button type="button" onClick={() => startEditing(item)} aria-label={`Edit ${item.name}`} className="rounded-lg p-2 text-slate hover:bg-paper-frost hover:text-ink">
                        <IconPencil size={18} />
                      </button>
                      <button type="button" onClick={() => void handleDelete(item)} aria-label={`Hapus ${item.name}`} className="rounded-lg p-2 text-red-600 hover:bg-red-50">
                        <IconTrash size={18} />
                      </button>
                    </article>
                  ))}
                  {store?.menus.length === 0 && <p className="py-8 text-center text-sm text-slate">Belum ada menu untuk toko ini.</p>}
                </div>
              </section>

              <section className="rounded-2xl border border-hairline bg-white p-4 sm:p-6">
                <h2 className="mb-4 text-lg font-semibold">{editingMenuId ? 'Edit menu' : 'Tambah menu'}</h2>
                <form className="grid gap-4" onSubmit={(event) => void handleSubmit(event)}>
                  <label className="grid gap-1.5 text-sm font-medium">
                    Nama menu
                    <input required maxLength={100} value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} className="rounded-xl border border-hairline px-3 py-2.5 font-normal" placeholder="Contoh: Es Kopi Susu" />
                  </label>

                  <label className="grid gap-1.5 text-sm font-medium">
                    Deskripsi
                    <textarea value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} rows={3} className="resize-y rounded-xl border border-hairline px-3 py-2.5 font-normal" placeholder="Deskripsi singkat menu" />
                  </label>

                  <div className="grid grid-cols-2 gap-3">
                    <label className="grid gap-1.5 text-sm font-medium">
                      Harga (Rp)
                      <input required type="number" min="0" step="500" value={form.basePrice} onChange={(event) => setForm({ ...form, basePrice: Number(event.target.value) })} className="min-w-0 rounded-xl border border-hairline px-3 py-2.5 font-normal" />
                    </label>
                    <label className="grid gap-1.5 text-sm font-medium">
                      Kategori
                      <input required list="catalog-categories" value={form.category} onChange={(event) => setForm({ ...form, category: event.target.value })} className="min-w-0 rounded-xl border border-hairline px-3 py-2.5 font-normal" placeholder="Coffee" />
                      <datalist id="catalog-categories">{categories.map((category) => <option key={category} value={category} />)}</datalist>
                    </label>
                  </div>

                  <label className="grid gap-1.5 text-sm font-medium">
                    Gambar (URL)
                    <input value={form.imageUrl.startsWith('data:image/') ? '' : form.imageUrl} onChange={(event) => setForm({ ...form, imageUrl: event.target.value })} className="rounded-xl border border-hairline px-3 py-2.5 font-normal" placeholder="https://... atau /images/..." />
                  </label>
                  <label className="grid gap-1.5 text-sm font-medium">
                    Atau unggah gambar (maks. 1 MB)
                    <input type="file" accept="image/*" onChange={handleImageUpload} className="w-full text-sm font-normal file:mr-3 file:rounded-lg file:border-0 file:bg-paper-frost file:px-3 file:py-2" />
                  </label>
                  {form.imageUrl && isAllowedImageSource(form.imageUrl) && (
                    <img src={form.imageUrl} alt="Pratinjau gambar menu" className="h-36 w-full rounded-xl border border-hairline bg-paper-frost object-contain" />
                  )}
                  <label className="flex items-center gap-2 text-sm">
                    <input type="checkbox" checked={form.isAvailable} onChange={(event) => setForm({ ...form, isAvailable: event.target.checked })} className="h-4 w-4 accent-ink" />
                    Tersedia untuk dipesan
                  </label>
                  <div className="flex gap-2">
                    <button disabled={isSaving} type="submit" className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-ink px-4 py-2.5 font-medium text-white disabled:opacity-60">
                      <IconDeviceFloppy size={18} /> {isSaving ? 'Menyimpan…' : editingMenuId ? 'Simpan perubahan' : 'Tambah menu'}
                    </button>
                    {editingMenuId && <button type="button" onClick={resetForm} className="rounded-xl border border-hairline px-4 py-2.5">Batal</button>}
                  </div>
                </form>
              </section>
            </div>
          </>
        )}
      </div>
    </main>
  );
}
