import type { Input, Output } from './types/url';

export function getInput(input: Input): Output {
    return { content: input.url };
}
