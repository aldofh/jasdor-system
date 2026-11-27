import React from 'react';
import { Chip } from '@heroui/react';
import type { StoreCatalog } from '../types/store';

interface DeliveryHeaderProps {
  store: StoreCatalog;
  ownerName?: string;
}

export const DeliveryHeader: React.FC<DeliveryHeaderProps> = ({
  store,
  ownerName = 'Ketoprak Was Was',
}) => {
  const displayName = store.name;

  return (
    <div className="flex items-center justify-between py-1.5">
      <div className="flex items-center gap-3 text-left min-w-0">
        {/* Store icon / avatar */}
        <div className="w-11 h-11 rounded-2xl bg-gallery-white border border-hairline p-1.5 flex items-center justify-center shrink-0 shadow-2xs">
          <img
            src={store.logoUrl || '/images/kopi-kenangan-cup.png'}
            alt={displayName}
            className="w-full h-full object-contain"
          />
        </div>

        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-slate font-medium">
              {ownerName}
            </span>
            <Chip size="sm" variant="secondary" className="h-4.5 px-2 text-[10px] font-semibold text-pricing-blue bg-paper-frost border border-hairline">
              Buka
            </Chip>
          </div>
          <h2 className="font-semibold text-ink text-lg tracking-tight truncate leading-tight mt-0.5">
            {displayName}
          </h2>
        </div>
      </div>
    </div>
  );
};
