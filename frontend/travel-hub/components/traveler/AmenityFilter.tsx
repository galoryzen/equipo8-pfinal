'use client';

import { useState } from 'react';

import type { AmenitySummary } from '@/app/lib/types/catalog';

interface AmenityFilterProps {
  amenities: AmenitySummary[];
  selected: string[];
  onChange: (selected: string[]) => void;
}

export default function AmenityFilter({ amenities, selected, onChange }: AmenityFilterProps) {
  const [showAll, setShowAll] = useState(false);
  const visible = showAll ? amenities : amenities.slice(0, 4);

  const handleToggle = (code: string) => {
    if (selected.includes(code)) {
      onChange(selected.filter((c) => c !== code));
    } else {
      onChange([...selected, code]);
    }
  };

  return (
    <div>
      <h3 className="font-semibold text-gray-900 mb-3">Amenities</h3>
      <div className="flex flex-col gap-2">
        {visible.map((a) => (
          <button key={a.code} type="button" onClick={() => handleToggle(a.code)} className="flex items-center gap-3 cursor-pointer group">
            <div
              className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-colors ${
                selected.includes(a.code)
                  ? 'bg-blue-500 border-blue-500'
                  : 'border-gray-300 group-hover:border-gray-400'
              }`}
            >
              {selected.includes(a.code) && (
                <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                </svg>
              )}
            </div>
            <span className="text-sm text-gray-700">{a.name}</span>
          </button>
        ))}
      </div>
      {amenities.length > 4 && (
        <button
          onClick={() => setShowAll(!showAll)}
          className="text-blue-500 text-sm mt-2 hover:underline cursor-pointer"
        >
          {showAll ? 'Show less' : 'Show more'}
        </button>
      )}
    </div>
  );
}