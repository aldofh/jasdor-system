import type { MenuItem } from './catalog';

export interface StoreCatalog {
  id: string;
  name: string;
  slug: string;
  logoUrl: string;
  whatsappNumber: string;
  categories: string[];
  menus: MenuItem[];
}
