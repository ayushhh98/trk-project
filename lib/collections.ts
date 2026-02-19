export const dedupeByKey = <T>(items: T[], keyFn: (item: T) => string | number | null | undefined): T[] => {
    const seen = new Set<string>();
    const result: T[] = [];
    for (const item of items) {
        const keyValue = keyFn(item);
        if (keyValue === null || keyValue === undefined) {
            result.push(item);
            continue;
        }
        const key = String(keyValue);
        if (seen.has(key)) continue;
        seen.add(key);
        result.push(item);
    }
    return result;
};

export const mergeUniqueByKey = <T>(
    preferred: T[],
    fallback: T[],
    keyFn: (item: T) => string | number | null | undefined
): T[] => {
    return dedupeByKey([...preferred, ...fallback], keyFn);
};
