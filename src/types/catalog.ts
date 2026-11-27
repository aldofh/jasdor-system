export interface MenuOption {
  id: string;
  name: string;
  priceDelta: number; // 0 jika gratis, atau +Rp5.000 dll
}

export interface MenuOptionGroup {
  id: string;
  name: string; // misal: "Ukuran", "Level Gula", "Level Es", "Topping"
  required: boolean;
  type: 'radio' | 'checkbox';
  options: MenuOption[];
}

export interface MenuItem {
  id: string;
  name: string;
  description: string;
  basePrice: number;
  imageUrl: string;
  category: string;
  isAvailable: boolean;
  optionGroups?: MenuOptionGroup[];
}
