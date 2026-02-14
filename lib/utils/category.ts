interface CategoryNameSource {
  displayName?: string;
  code?: string;
}

export function buildCategoryNameCandidates(source: CategoryNameSource): string[] {
  const candidates = [source.displayName, source.code]
    .map((value) => value?.trim())
    .filter((value): value is string => Boolean(value));

  return Array.from(new Set(candidates));
}
