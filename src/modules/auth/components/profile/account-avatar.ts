export function initialsForName(name?: string | null) {
  const value = name?.trim();
  if (!value) return '?';
  return value
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('') || '?';
}

export function colorForId(id?: string | null) {
  const palette = ['#0f766e', '#2563eb', '#7c3aed', '#be123c', '#b45309', '#047857'];
  const source = id || 'user';
  let hash = 0;
  for (let i = 0; i < source.length; i += 1) {
    hash = (hash * 31 + source.charCodeAt(i)) >>> 0;
  }
  return palette[hash % palette.length];
}

