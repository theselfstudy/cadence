"use client";

import type { Medicine, MedicineCategory } from "@/types";

interface MedicineItemProps {
  medicine: Medicine;
  onRemove: () => void;
  onUpdate: (updated: Partial<Medicine>) => void;
}

export function MedicineItem({ medicine, onRemove }: MedicineItemProps) {
  // Color mapping for medicine tags
  const tagColors: Record<MedicineCategory, string> = {
    bowel: "bg-app-plumb/20 text-app-plumb",
    symptom: "bg-app-teal/20 text-app-teal",
    period: "bg-app-red/20 text-app-red",
    other: "bg-app-taupe/30 text-app-charcoal",
  };

  return (
    <div className="p-3 bg-app-cream rounded-lg border border-app-border">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <span className="font-medium text-app-charcoal">{medicine.name}</span>
            {medicine.dosage && (
              <span className="text-sm text-app-gray">({medicine.dosage})</span>
            )}
            {medicine.timeSensitive && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-app-taupe/20 text-app-taupe">
                ⏰ Time-sensitive
              </span>
            )}
          </div>
          <div className="flex flex-wrap gap-1">
            {medicine.categories.map((cat) => (
              <span
                key={cat}
                className={`text-xs px-2 py-0.5 rounded-full ${tagColors[cat]}`}
              >
                {cat.charAt(0).toUpperCase() + cat.slice(1)}
              </span>
            ))}
          </div>
        </div>
        <button
          type="button"
          onClick={onRemove}
          className="text-app-gray hover:text-app-red transition-colors"
        >
          ✕
        </button>
      </div>
    </div>
  );
}