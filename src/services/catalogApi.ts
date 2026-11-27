import type { StoreCatalog } from '../types/store';

interface CatalogResponse {
  store: StoreCatalog | null;
}

async function requestCatalog(
  path: string,
  init?: RequestInit,
): Promise<StoreCatalog> {
  const response = await fetch(path, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...init?.headers,
    },
  });

  if (!response.ok) {
    throw new Error(`Gagal mengakses katalog (HTTP ${response.status}).`);
  }

  const data = (await response.json()) as CatalogResponse;
  if (!data.store || !Array.isArray(data.store.menus)) {
    throw new Error('Data katalog dari server tidak valid.');
  }
  return data.store;
}

export async function loadCatalog(seed: StoreCatalog): Promise<StoreCatalog> {
  const response = await fetch('/api/catalog');
  if (!response.ok) {
    throw new Error(`Gagal memuat katalog (HTTP ${response.status}).`);
  }

  const data = (await response.json()) as CatalogResponse;
  if (data.store) return data.store;

  return requestCatalog('/api/catalog/seed', {
    method: 'POST',
    body: JSON.stringify({ store: seed }),
  });
}

export function saveCatalog(store: StoreCatalog): Promise<StoreCatalog> {
  return requestCatalog('/api/catalog', {
    method: 'PUT',
    body: JSON.stringify({ store }),
  });
}
