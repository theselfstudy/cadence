"use client";

import { useState } from "react";
import type { ProductOption, CustomProduct } from "@/types";
import { existsCaseInsensitive, findSimilarItems } from "@/lib/stringUtils";

interface CustomProductSectionProps {
  product: ProductOption;
  customProducts: CustomProduct[];
  onUpdate: (products: CustomProduct[]) => void;
}

export function CustomProductSection({ product, customProducts, onUpdate }: CustomProductSectionProps) {
  const [newProductName, setNewProductName] = useState("");
  const [warning, setWarning] = useState<string | null>(null);
  
  const maxProducts = product.maxCustomProducts ?? 5;
  const canAddMore = customProducts.length < maxProducts;
  const existingNames = customProducts.map((p) => p.name);

  const handleInputChange = (value: string) => {
    setNewProductName(value);
    setWarning(null);

    if (value.trim()) {
      // Check for similar existing items (fuzzy match)
      const similar = findSimilarItems(value.trim(), existingNames);
      if (similar.length > 0 && !existsCaseInsensitive(value.trim(), existingNames)) {
        setWarning(`Did you mean "${similar[0]}"?`);
      }
    }
  };

  const handleAdd = () => {
    if (!newProductName.trim() || !canAddMore) return;

    // Case-insensitive duplicate check
    if (existsCaseInsensitive(newProductName.trim(), existingNames)) {
      setWarning("This product already exists.");
      return;
    }

    const newProduct: CustomProduct = {
      id: Date.now().toString(),
      name: newProductName.trim(),
    };
    onUpdate([...customProducts, newProduct]);
    setNewProductName("");
    setWarning(null);
  };

  const handleRemove = (id: string) => {
    onUpdate(customProducts.filter((p) => p.id !== id));
  };

  return (
    <div className="p-4 bg-app-cream rounded-lg">
      <p className="text-sm font-medium text-app-charcoal mb-2">
        Your {product.label} products:
      </p>
      <p className="text-xs text-app-gray mb-3">
        Add specific products you use (up to {maxProducts})
      </p>

      {customProducts.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-4">
          {customProducts.map((cp) => (
            <div
              key={cp.id}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-sm font-medium bg-app-red opacity-85 text-white"
            >
              {cp.name}
              <button
                type="button"
                onClick={() => handleRemove(cp.id)}
                className="ml-1 hover:text-app-cream"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}

      {canAddMore && (
        <div className="space-y-2">
          <div className="flex gap-2">
            <input
              type="text"
              value={newProductName}
              onChange={(e) => handleInputChange(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleAdd()}
              placeholder={`e.g., ${
                product.type === "cup"
                  ? "Saalt Soft, Lena Cup"
                  : product.type === "disc"
                  ? "Hello Disc, Flex Disc"
                  : "Brand name..."
              }`}
              className="flex-1 px-4 py-2 rounded-lg border border-app-border bg-app-white focus:outline-none focus:ring-2 focus:ring-app-red"
            />
            <button
              type="button"
              onClick={handleAdd}
              className="px-6 py-2 rounded-lg bg-app-red opacity-85 text-white font-medium hover:opacity-75 transition-opacity"
            >
              + Add
            </button>
          </div>
          {warning && (
            <p className="text-xs text-app-taupe">{warning}</p>
          )}
        </div>
      )}

      {!canAddMore && (
        <p className="text-xs text-app-gray italic">
          Maximum of {maxProducts} products reached
        </p>
      )}
    </div>
  );
}