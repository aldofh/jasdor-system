import type { BrandInfo } from '../data/mockBrands';

interface CatalogResponse {
  brands: BrandInfo[] | null;
}

async function requestCatalog(
  path: string,
  init?: RequestInit,
): Promise<BrandInfo[]> {
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
  if (!Array.isArray(data.brands)) {
    throw new Error('Data katalog dari server tidak valid.');
  }
  return data.brands;
}

export async function loadCatalog(seed: BrandInfo[]): Promise<BrandInfo[]> {
  const response = await fetch('/api/catalog');
  if (!response.ok) {
    throw new Error(`Gagal memuat katalog (HTTP ${response.status}).`);
  }

  const data = (await response.json()) as CatalogResponse;
  if (Array.isArray(data.brands)) return data.brands;

  return requestCatalog('/api/catalog/seed', {
    method: 'POST',
    body: JSON.stringify({ brands: seed }),
  });
}

export function saveCatalog(brands: BrandInfo[]): Promise<BrandInfo[]> {
  return requestCatalog('/api/catalog', {
    method: 'PUT',
    body: JSON.stringify({ brands }),
  });
}
