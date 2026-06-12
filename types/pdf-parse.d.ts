declare module "pdf-parse/lib/pdf-parse.js" {
  type PdfParseResult = {
    numpages: number;
    numrender: number;
    info: Record<string, unknown>;
    metadata: Record<string, unknown> | null;
    text: string;
    version: string;
  };

  function pdfParse(buffer: Buffer | Uint8Array): Promise<PdfParseResult>;
  export default pdfParse;
}
