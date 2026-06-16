import type { Input } from "./types/url";

export function getInput(content: Input): Input {
    const { url, provider } = content;
    return {
        url,
        provider
    }
}
