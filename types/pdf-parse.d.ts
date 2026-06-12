declare module "pdf-parse" {
  type PdfParseResult = {
    text: string;
    numpages?: number;
    info?: Record<string, unknown>;
    metadata?: Record<string, unknown>;
  };

  function pdfParse(dataBuffer: Buffer): Promise<PdfParseResult>;
  export = pdfParse;
}
