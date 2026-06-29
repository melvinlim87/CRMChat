declare module "pdf-parse/lib/pdf-parse.js" {
  interface PDFData {
    text: string;
    numpages: number;
    info: unknown;
  }
  function pdfParse(buffer: Buffer | Uint8Array): Promise<PDFData>;
  export default pdfParse;
}
