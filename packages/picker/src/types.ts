export interface ImageInput {
    /** 图片内容，支持 base64 Data URL 或网络图片 URL */
    content: string;
}

export interface RGBAColor {
    r: number;
    g: number;
    b: number;
    a: number;
}

export interface EdgeColors {
    top: RGBAColor;
    bottom: RGBAColor;
    left: RGBAColor;
    right: RGBAColor;
}