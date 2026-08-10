import React, { createContext, useContext, useState, useCallback, useMemo } from "react";

interface SelectionContextValue {
  selectedKeys: Set<string>;
  toggleSelect: (id: string) => void;
  selectAll: (ids: string[]) => void;
  clearSelection: () => void;
  isSelected: (id: string) => boolean;
  isAllSelected: (ids: string[]) => boolean;
  selectedCount: number;
}

const SelectionContext = createContext<SelectionContextValue | null>(null);

export function SelectionProvider({ children }: { children: React.ReactNode }) {
  const [selectedKeys, setSelectedKeys] = useState<Set<string>>(new Set());

  const toggleSelect = useCallback((id: string) => {
    setSelectedKeys((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const selectAll = useCallback((ids: string[]) => {
    setSelectedKeys((prev) => {
      const allPresent = ids.every((id) => prev.has(id));
      const next = new Set(prev);
      if (allPresent) {
        ids.forEach((id) => next.delete(id));
      } else {
        ids.forEach((id) => next.add(id));
      }
      return next;
    });
  }, []);

  const clearSelection = useCallback(() => {
    setSelectedKeys(new Set());
  }, []);

  const isSelected = useCallback(
    (id: string) => selectedKeys.has(id),
    [selectedKeys]
  );

  const isAllSelected = useCallback(
    (ids: string[]) => ids.length > 0 && ids.every((id) => selectedKeys.has(id)),
    [selectedKeys]
  );

  const value = useMemo(
    () => ({
      selectedKeys,
      toggleSelect,
      selectAll,
      clearSelection,
      isSelected,
      isAllSelected,
      selectedCount: selectedKeys.size,
    }),
    [selectedKeys, toggleSelect, selectAll, clearSelection, isSelected, isAllSelected]
  );

  return (
    <SelectionContext.Provider value={value}>
      {children}
    </SelectionContext.Provider>
  );
}

export function useSelection(): SelectionContextValue {
  const ctx = useContext(SelectionContext);
  if (!ctx) {
    throw new Error("useSelection must be used within a SelectionProvider");
  }
  return ctx;
}
