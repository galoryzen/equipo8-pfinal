'use client';

import { useState } from 'react';

interface SearchBarProps {
  initialCity?: string;
  initialCheckin?: string;
  initialCheckout?: string;
  initialGuests?: number;
  onSearch: (city: string, checkin: string, checkout: string, guests: number) => void;
}

export default function SearchBar({
  initialCity = '',
  initialCheckin = '',
  initialCheckout = '',
  initialGuests = 2,
  onSearch,
}: SearchBarProps) {
  const [city, setCity] = useState(initialCity);
  const [checkin, setCheckin] = useState(initialCheckin);
  const [checkout, setCheckout] = useState(initialCheckout);
  const [guests, setGuests] = useState(initialGuests);

  const handleSubmit = () => {
    onSearch(city, checkin, checkout, guests);
  };

  return (
    <div className="flex items-center bg-white rounded-full shadow-md border border-gray-200 px-2 py-2 max-w-3xl mx-auto">
      {/* WHERE */}
      <div className="flex-1 px-4 border-r border-gray-200">
        <label className="block text-[10px] font-semibold text-gray-400 uppercase tracking-wide">
          Where
        </label>
        <input
          type="text"
          placeholder="Search destination"
          value={city}
          onChange={(e) => setCity(e.target.value)}
          className="w-full text-sm text-gray-800 bg-transparent outline-none placeholder-gray-400"
        />
      </div>

      {/* WHEN */}
      <div className="flex-1 px-4 border-r border-gray-200">
        <label className="block text-[10px] font-semibold text-gray-400 uppercase tracking-wide">
          When
        </label>
        <div className="flex gap-1">
          <input
            type="date"
            value={checkin}
            onChange={(e) => setCheckin(e.target.value)}
            className="w-1/2 text-sm text-gray-800 bg-transparent outline-none"
          />
          <span className="text-gray-400 text-sm">-</span>
          <input
            type="date"
            value={checkout}
            onChange={(e) => setCheckout(e.target.value)}
            className="w-1/2 text-sm text-gray-800 bg-transparent outline-none"
          />
        </div>
      </div>

      {/* WHO */}
      <div className="flex-1 px-4">
        <label className="block text-[10px] font-semibold text-gray-400 uppercase tracking-wide">
          Who
        </label>
        <input
          type="number"
          min={1}
          max={20}
          value={guests}
          onChange={(e) => setGuests(Number(e.target.value))}
          className="w-full text-sm text-gray-800 bg-transparent outline-none"
        />
      </div>

      {/* Search button */}
      <button
        onClick={handleSubmit}
        className="ml-2 w-12 h-12 rounded-full bg-blue-500 hover:bg-blue-600 flex items-center justify-center text-white shrink-0 transition-colors cursor-pointer"
        aria-label="Search"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
          />
        </svg>
      </button>
    </div>
  );
}