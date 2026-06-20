const NAMED_ENTITIES: Record<string, string> = {
    '&amp;': '&',
    '&lt;': '<',
    '&gt;': '>',
    '&quot;': '"',
    '&apos;': "'",
};

function codePointToChar(codePoint: number, fallback: string): string {
    if (
        codePoint < 0 ||
        codePoint > 0x10ffff ||
        (codePoint >= 0xd800 && codePoint <= 0xdfff)
    ) {
        return fallback;
    }

    try {
        return String.fromCodePoint(codePoint);
    } catch {
        return fallback;
    }
}

/** 将 QQ 音乐返回的 HTML 实体（如 &#127925;）解码为 Unicode 字符（如 emoji）。 */
export function decodeHtmlEntities(text: string): string {
    if (!text) return '';

    return text
        .replace(/&#x([0-9a-f]+);/gi, (match, hex: string) =>
            codePointToChar(Number.parseInt(hex, 16), match),
        )
        .replace(/&#(\d+);/g, (match, dec: string) =>
            codePointToChar(Number.parseInt(dec, 10), match),
        )
        .replace(/&(?:amp|lt|gt|quot|apos);/g, (match) => NAMED_ENTITIES[match] ?? match);
}
