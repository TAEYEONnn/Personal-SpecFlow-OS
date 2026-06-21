export const MAX_FILE_BYTES = 10 * 1024 * 1024; // 10MB (PDFs can be larger)
export const MAX_SOURCE_CHARS = 100_000;
const ALLOWED_EXTENSIONS = [".txt", ".md", ".pdf"];

type SourceInput = {
  text: string;
  fileName?: string;
  fileSize?: number;
};

export function validateSourceInput(input: SourceInput) {
  const text = input.text.trim();

  if (!text) {
    throw new Error("업무 내용을 입력해 주세요.");
  }
  if (text.length > MAX_SOURCE_CHARS) {
    throw new Error("업무 내용은 100,000자 이하여야 합니다.");
  }
  if (input.fileSize && input.fileSize > MAX_FILE_BYTES) {
    throw new Error("파일 크기는 10MB 이하여야 합니다.");
  }
  if (
    input.fileName &&
    !ALLOWED_EXTENSIONS.some((extension) =>
      input.fileName?.toLowerCase().endsWith(extension),
    )
  ) {
    throw new Error("TXT, MD 또는 PDF 파일만 업로드할 수 있습니다.");
  }

  return { text };
}
