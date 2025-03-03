export interface ConvertRequest {
  markdown: string;
  filename?: string;
}

export interface ConvertResponse {
  url: string;
  filename: string;
  expiresAt: string;
}

export interface StorageOptions {
  bucket: R2Bucket;
  expirySeconds: number;
}

export interface DocxGeneratorOptions {
  margins?: {
    top?: number;
    right?: number;
    bottom?: number;
    left?: number;
  };
  defaultFontSize?: number;
  defaultFontFamily?: string;
}

export interface MarkdownParserOptions {
  html?: boolean;
  linkify?: boolean;
  typographer?: boolean;
  breaks?: boolean;
}
