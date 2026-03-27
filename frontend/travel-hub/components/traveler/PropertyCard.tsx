'use client';

import type { PropertySummary } from '@/app/lib/types/catalog';

interface PropertyCardProps {
  property: PropertySummary;
}

function formatReviewCount(count: number): string {
  if (count >= 1000) return `${(count / 1000).toFixed(1)}k reviews`;
  return `${count} reviews`;
}

export default function PropertyCard({ property }: PropertyCardProps) {
  return (
    <div className="bg-white rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-shadow border border-gray-100">
      {/* Image */}
      <div className="relative h-52 bg-gray-200">
        {property.image ? (
          <img
            src={property.image.url}
            alt={property.image.caption ?? property.name}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-400">
            No image
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-4">
        {/* Name + Rating */}
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-semibold text-gray-900 text-lg leading-tight line-clamp-2">
            {property.name}
          </h3>
          {property.rating_avg != null && (
            <div className="shrink-0 text-right">
              <span className="inline-flex items-center gap-1 text-sm font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-md">
                {Number(property.rating_avg).toFixed(1)}
                <svg className="w-3.5 h-3.5 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                </svg>
              </span>
              <p className="text-[11px] text-gray-400">
                {formatReviewCount(property.review_count)}
              </p>
            </div>
          )}
        </div>

        {/* Location */}
        <p className="text-sm text-gray-500 mb-2 -mt-4 flex items-center gap-1">
          <svg className="w-3 h-3 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
            <path
              fillRule="evenodd"
              d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z"
              clipRule="evenodd"
            />
          </svg>
          {property.city.name}, {property.city.country}
        </p>

        {/* Amenities */}
        {property.amenities.length > 0 && (
          <div className="flex flex-wrap gap-x-3 gap-y-1 mb-3">
            {property.amenities.slice(0, 3).map((amenity) => (
              <span key={amenity.code} className="text-xs text-gray-500">
                {amenity.name}
              </span>
            ))}
          </div>
        )}

        {/* Price */}
        {property.min_price != null && (
          <div className="flex items-baseline justify-end gap-1 mt-auto">
            <span className="text-xl font-bold text-gray-900">
              ${property.min_price.toLocaleString()}
            </span>
            <span className="text-sm text-gray-500">/ night</span>
          </div>
        )}
      </div>
    </div>
  );
}
