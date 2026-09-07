// sharp 0.35 ships declarations but omits them from its ESM exports map.
// Keep this narrow adapter until upstream exports its bundled declarations.
declare module "sharp" {
  interface Pipeline {
    metadata(): Promise<{ format?: string }>;
    rotate(): Pipeline;
    webp(options: { quality: number }): Pipeline;
    toBuffer(): Promise<Buffer>;
  }
  export default function sharp(input: Buffer, options: { limitInputPixels: number }): Pipeline;
}
