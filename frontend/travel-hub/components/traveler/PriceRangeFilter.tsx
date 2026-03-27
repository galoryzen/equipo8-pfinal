'use client';

import { useState } from 'react';

interface PriceRangeFilterProps {
  minPrice?: number;
  maxPrice?: number;
  onApply: (min: number | undefined, max: number | undefined) => void;
}

export default function PriceRangeFilter({ minPrice, maxPrice, onApply }: PriceRangeFilterProps) {
  const [range, setRange] = useState<[number, number]>([minPrice ?? 0, maxPrice ?? 1000]);
  const [error, setError] = useState<string | null>(null);

  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>, idx: 0 | 1) => {
    const val = Number(e.target.value);
    const next: [number, number] = [...range] as [number, number];
    next[idx] = val;
    setRange(next);
    setError(null);
  };

  const handleBlur = () => {
    if (range[0] > range[1]) {
      setError('Min cannot be greater than max');
      return;
    }
    setError(null);
    onApply(range[0] || undefined, range[1] || undefined);
  };

  const sliderPercent = (val: number) => (val / 2000) * 100;

  return (
    <div>
      <h3 className="font-semibold text-gray-900 mb-1">Price range</h3>
      <p className="text-xs text-gray-400 mb-4">Nightly prices before fees and taxes</p>

      {/* Custom range slider */}
      <div className="relative h-2 mb-6">
        <div className="absolute inset-0 bg-gray-200 rounded-full" />
        <div
          className="absolute h-full bg-blue-500 rounded-full"
          style={{
            left: `${sliderPercent(range[0])}%`,
            right: `${100 - sliderPercent(range[1])}%`,
          }}
        />
        <input
          type="range"
          min={0}
          max={2000}
          step={10}
          value={range[0]}
          onChange={(e) => handleSliderChange(e, 0)}
          onMouseUp={handleBlur}
          onTouchEnd={handleBlur}
          className="absolute inset-0 w-full appearance-none bg-transparent pointer-events-none [&::-webkit-slider-thumb]:pointer-events-auto [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:border-[3px] [&::-webkit-slider-thumb]:border-blue-500 [&::-webkit-slider-thumb]:shadow-sm [&::-webkit-slider-thumb]:cursor-pointer"
        />
        <input
          type="range"
          min={0}
          max={2000}
          step={10}
          value={range[1]}
          onChange={(e) => handleSliderChange(e, 1)}
          onMouseUp={handleBlur}
          onTouchEnd={handleBlur}
          className="absolute inset-0 w-full appearance-none bg-transparent pointer-events-none [&::-webkit-slider-thumb]:pointer-events-auto [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:border-[3px] [&::-webkit-slider-thumb]:border-blue-500 [&::-webkit-slider-thumb]:shadow-sm [&::-webkit-slider-thumb]:cursor-pointer"
        />
      </div>

      {/* Min / Max inputs */}
      <div className="flex gap-3">
        <div className="flex-1">
          <label className="block text-[10px] text-gray-400 mb-1">Min</label>
          <div className="flex items-center border border-gray-200 rounded-lg px-3 py-2">
            <span className="text-sm text-gray-400 mr-1">$</span>
            <input
              type="number"
              min={0}
              value={range[0]}
              onChange={(e) => handleSliderChange(e, 0)}
              onBlur={handleBlur}
              className="w-full text-sm bg-transparent outline-none"
            />
          </div>
        </div>
        <div className="flex-1">
          <label className="block text-[10px] text-gray-400 mb-1">Max</label>
          <div className="flex items-center border border-gray-200 rounded-lg px-3 py-2">
            <span className="text-sm text-gray-400 mr-1">$</span>
            <input
              type="number"
              min={0}
              value={range[1]}
              onChange={(e) => handleSliderChange(e, 1)}
              onBlur={handleBlur}
              className="w-full text-sm bg-transparent outline-none"
            />
            {range[1] >= 2000 && <span className="text-sm text-gray-400">+</span>}
          </div>
        </div>
      </div>

      {error && <p className="text-red-500 text-xs mt-2">{error}</p>}
    </div>
  );
}