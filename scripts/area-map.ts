// Shared area taxonomy + best-effort category -> area mapping (no side effects).

export const AREA_NAMES = [
  "Interior",
  "Exterior/Outdoor",
  "Structural",
  "Land/Legal",
  "Miscellaneous",
] as const;

// Maps a legacy category name to one of the five focused areas.
export function categoryToArea(categoryName: string): string {
  const n = categoryName.toLowerCase();
  if (/(foundation|roof|framing|slab|structure|civil)/.test(n))
    return "Structural";
  if (/plaster/.test(n)) return "Exterior/Outdoor";
  if (/(landscap|elevation|exterior|outdoor|gutter|shelt)/.test(n))
    return "Exterior/Outdoor";
  if (/electric/.test(n)) return "Interior";
  if (/(plumb|water|motor|tanker|sanitary)/.test(n)) return "Interior";
  if (/furniture/.test(n)) return "Interior";
  if (/(window|door|fixture|tile|interior|floor|paint)/.test(n))
    return "Interior";
  if (/(land|property tax|legal|permit|survey|registration|stamp|notar)/.test(n))
    return "Land/Legal";
  return "Miscellaneous";
}
