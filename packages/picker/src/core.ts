import type { ImageInput, EdgeColors, RGBAColor } from './types';

/**
 * 加载图片
 */
function loadImage(content: string): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => resolve(img);
        img.onerror = () => reject(new Error(`Failed to load image: ${content.slice(0, 100)}...`));
        img.src = content;
    });
}

/**
 * 获取 Canvas 上指定坐标的像素颜色
 */
function getPixelColor(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number
): RGBAColor {
    const [r, g, b, a] = ctx.getImageData(Math.round(x), Math.round(y), 1, 1).data;
    return { r, g, b, a: a / 255 };
}

/**
 * 取图片四条边中间位置的颜色
 *
 * @param input - 图片输入，content 支持 base64 Data URL 或网络图片 URL
 * @returns 返回上、下、左、右四条边中间位置的颜色
 *
 * @example
 * ```ts
 * const colors = await pickEdgeColors({ content: 'https://example.com/image.png' });
 * console.log(colors.top);    // { r: 255, g: 0, b: 0, a: 1 }
 * console.log(colors.bottom); // { r: 0, g: 255, b: 0, a: 1 }
 * console.log(colors.left);   // { r: 0, g: 0, b: 255, a: 1 }
 * console.log(colors.right);  // { r: 255, g: 255, b: 0, a: 1 }
 * ```
 */
export async function pickEdgeColors(input: ImageInput): Promise<EdgeColors> {
    const img = await loadImage(input.content);

    // 创建 Canvas 并绘制图片
    const canvas = document.createElement('canvas');
    canvas.width = img.naturalWidth;
    canvas.height = img.naturalHeight;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });

    if (!ctx) {
        throw new Error('Failed to get 2D rendering context');
    }

    ctx.drawImage(img, 0, 0);

    const { width, height } = canvas;

    // 取四条边中间位置的像素颜色
    const top = getPixelColor(ctx, width / 2, 0);
    const bottom = getPixelColor(ctx, width / 2, height - 1);
    const left = getPixelColor(ctx, 0, height / 2);
    const right = getPixelColor(ctx, width - 1, height / 2);

    return { top, bottom, left, right };
}
