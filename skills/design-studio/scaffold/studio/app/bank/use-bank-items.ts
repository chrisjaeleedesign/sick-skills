"use client";

import { useState, useCallback } from "react";
import type { BankItemData } from "./bank-item";

export function useBankItems() {
  const [items, setItems] = useState<BankItemData[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchItems = useCallback(async (params: Record<string, string> = {}) => {
    setLoading(true);
    try {
      const qs = new URLSearchParams({ view: "bank", ...params }).toString();
      const data = await fetch(`/api/entries?${qs}`).then(r => r.json());
      setItems(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Failed to fetch entries:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  return { items, setItems, loading, fetchItems };
}
