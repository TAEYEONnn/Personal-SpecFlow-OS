export type PdfPage = {
  pageNumber: number;
  text: string;
};

export type PdfExtractResult = {
  pages: PdfPage[];
  totalText: string;
  pageCount: number;
};

/**
 * Extracts plain text from a PDF buffer using regex-based parsing.
 * Reliable for text-based PDFs; returns empty strings for scanned/image PDFs.
 * For production, replace with a proper parser like pdfjs-dist.
 */
export function extractPdfText(buffer: Buffer): PdfExtractResult {
  const raw = buffer.toString("latin1");

  const pages: PdfPage[] = [];
  let pageNumber = 0;

  // Split on page boundaries (/Page objects or %%Page markers)
  const pageChunks = raw.split(/\/Type\s*\/Page\b/);

  for (let i = 1; i < pageChunks.length; i++) {
    pageNumber++;
    const chunk = pageChunks[i];
    const text = extractTextFromChunk(chunk);
    pages.push({ pageNumber, text: text.trim() });
  }

  // Fallback: if no page markers found, treat whole document as page 1
  if (pages.length === 0) {
    const text = extractTextFromChunk(raw);
    if (text.trim()) {
      pages.push({ pageNumber: 1, text: text.trim() });
    }
  }

  const totalText = pages.map((p) => p.text).join("\n\n");
  return { pages, totalText, pageCount: pages.length || 1 };
}

function extractTextFromChunk(chunk: string): string {
  const textParts: string[] = [];

  // Extract text between BT (Begin Text) and ET (End Text) markers
  const btEtRegex = /BT([\s\S]*?)ET/g;
  let match: RegExpExecArray | null;

  while ((match = btEtRegex.exec(chunk)) !== null) {
    const content = match[1];
    // Extract string literals: (text) or <hex>
    const strRegex = /\(([^)\\]*(?:\\.[^)\\]*)*)\)|<([0-9A-Fa-f\s]+)>/g;
    let strMatch: RegExpExecArray | null;

    while ((strMatch = strRegex.exec(content)) !== null) {
      if (strMatch[1] !== undefined) {
        // Parenthesis-enclosed string: unescape PDF escape sequences
        const decoded = strMatch[1]
          .replace(/\\n/g, "\n")
          .replace(/\\r/g, "\r")
          .replace(/\\t/g, "\t")
          .replace(/\\\(/g, "(")
          .replace(/\\\)/g, ")")
          .replace(/\\\\/g, "\\")
          .replace(/\\(\d{3})/g, (_, oct) => String.fromCharCode(parseInt(oct, 8)));
        textParts.push(decoded);
      } else if (strMatch[2] !== undefined) {
        // Hex-encoded string
        const hex = strMatch[2].replace(/\s/g, "");
        let hexDecoded = "";
        for (let i = 0; i < hex.length; i += 2) {
          hexDecoded += String.fromCharCode(parseInt(hex.slice(i, i + 2), 16));
        }
        textParts.push(hexDecoded);
      }
    }

    // Add space between text segments from Tj/TJ operators
    textParts.push(" ");
  }

  return textParts
    .join("")
    .replace(/\s+/g, " ")
    .replace(/[^\x20-\x7E가-힣ᄀ-ᇿ㄰-㆏]/g, " ")
    .trim();
}

/**
 * Formats PDF extraction result as source text with page markers.
 */
export function pdfResultToSourceText(result: PdfExtractResult): string {
  if (result.pages.length === 1) return result.totalText;
  return result.pages
    .map((p) => `--- 페이지 ${p.pageNumber} ---\n${p.text}`)
    .join("\n\n");
}
