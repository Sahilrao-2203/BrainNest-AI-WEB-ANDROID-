import * as pdfjsLib from 'pdfjs-dist';

// Configure the worker to use unpkg CDN matching the installed version
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;

export const MAX_FILE_SIZE_MB = 10;
export const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;

export interface ProcessedAttachment {
  fileName: string;
  fileSize: string;
  fileType: 'pdf' | 'text' | 'image' | 'doc' | 'link';
  mimeType: string;
  content?: string; // Extracted text content for PDF, TXT, DOC, Code, or URL for link
  base64Data?: string; // Pure Base64 data string (for Gemini inlineData)
  previewUrl?: string; // Data URL or Blob URL for thumbnail/document preview
  objectUrl?: string; // Blob Object URL created for instant image/PDF preview
}

const BLOCKED_EXTENSIONS = ['.exe', '.bat', '.cmd', '.ps1', '.sh', '.bin', '.msi', '.jar', '.vbs'];

const TEXT_CODE_EXTENSIONS = [
  '.txt', '.js', '.ts', '.tsx', '.jsx', '.css', '.html', '.htm',
  '.json', '.xml', '.md', '.csv', '.env', '.config', '.py', '.c',
  '.cpp', '.h', '.hpp', '.java', '.sql', '.yaml', '.yml',
  '.ini', '.log', '.properties', '.gitignore', '.eslintrc', '.babelrc'
];

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function isFileExtensionBlocked(fileName: string): boolean {
  const lower = fileName.toLowerCase();
  return BLOCKED_EXTENSIONS.some((ext) => lower.endsWith(ext));
}

/**
 * Checks whether a given filename or mimeType represents a readable text or code file.
 */
export function isTextOrCodeFile(fileName: string, mimeType: string): boolean {
  const lower = fileName.toLowerCase();
  if (
    mimeType.startsWith('text/') ||
    mimeType.includes('javascript') ||
    mimeType.includes('json') ||
    mimeType.includes('xml')
  ) {
    return true;
  }
  return TEXT_CODE_EXTENSIONS.some((ext) => lower.endsWith(ext) || lower.includes(ext));
}

/**
 * Validates whether a given raw URL string is a valid http:// or https:// link.
 */
export function isValidStudyUrl(rawUrl: string): boolean {
  const trimmed = rawUrl.trim();
  if (!trimmed) return false;
  if (!trimmed.startsWith('http://') && !trimmed.startsWith('https://')) {
    return false;
  }
  try {
    const parsed = new URL(trimmed);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

/**
 * Processes a raw study URL into a ProcessedAttachment struct.
 */
export function processLinkUrl(rawUrl: string): ProcessedAttachment {
  const trimmed = rawUrl.trim();
  if (!isValidStudyUrl(trimmed)) {
    throw new Error('Please enter a valid URL starting with http:// or https://');
  }
  try {
    const parsed = new URL(trimmed);
    const domain = parsed.hostname.replace(/^www\./, '');
    return {
      fileName: domain || 'External Study Link',
      fileSize: 'Study Link',
      fileType: 'link',
      mimeType: 'text/uri-list',
      content: trimmed,
    };
  } catch {
    throw new Error('Please enter a valid URL.');
  }
}

/**
 * Returns a permanent, un-revoked image/document source URL string for an attachment.
 * Prefers persistent Data URLs (previewUrl / base64Data) or Blob URLs (objectUrl).
 */
export function getImageSource(attachment?: ProcessedAttachment | null): string {
  if (!attachment) return '';
  if (attachment.previewUrl) return attachment.previewUrl;
  if (attachment.base64Data) {
    return `data:${attachment.mimeType || 'image/png'};base64,${attachment.base64Data}`;
  }
  if (attachment.objectUrl) return attachment.objectUrl;
  return '';
}

/**
 * Revokes any active Object URL associated with an attachment to avoid memory leaks.
 */
export function revokeAttachmentObjectUrl(attachment?: ProcessedAttachment | null): void {
  if (attachment && attachment.objectUrl) {
    try {
      URL.revokeObjectURL(attachment.objectUrl);
    } catch (e) {
      // Ignore revocation errors
    }
  }
}

/**
 * Extracts readable ASCII & UTF-8 text strings from a PDF ArrayBuffer.
 */
async function extractTextFromPdfArrayBuffer(buffer: ArrayBuffer): Promise<string> {
  try {
    const loadingTask = pdfjsLib.getDocument({ data: new Uint8Array(buffer) });
    const pdf = await loadingTask.promise;
    const numPages = pdf.numPages;
    const pageTexts: string[] = [];

    for (let i = 1; i <= numPages; i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      const pageText = textContent.items
        .map((item: any) => item.str)
        .join(' ');
      pageTexts.push(pageText);
    }

    const fullText = pageTexts.join('\n').trim();
    return fullText.slice(0, 150000); // Cap to a large size to prevent truncating long syllabi
  } catch (error) {
    console.error('Error extracting text from PDF:', error);
    throw new Error('Unable to extract text from this PDF. Please try another PDF or add the subjects manually.');
  }
}

/**
 * Extracts readable XML text nodes from a DOCX / OpenXML document ArrayBuffer.
 */
function extractTextFromDocxArrayBuffer(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  const textDecoder = new TextDecoder('utf-8', { fatal: false });
  const rawString = textDecoder.decode(bytes);

  const textNodes = rawString.match(/<w:t[^>]*>([^<]+)<\/w:t>/g);
  if (textNodes && textNodes.length > 0) {
    return textNodes
      .map((node) => node.replace(/<[^>]+>/g, '').trim())
      .filter((t) => t.length > 0)
      .join(' ');
  }

  return 'Word Document (DOCX) attached.';
}

export async function processSelectedFile(file: File): Promise<ProcessedAttachment> {
  // 1. Extension check
  if (isFileExtensionBlocked(file.name)) {
    throw new Error(`File type rejected for security reasons (${file.name}). Executable files are not allowed.`);
  }

  // 2. Size check
  if (file.size > MAX_FILE_SIZE_BYTES) {
    throw new Error(`File is too large (${formatFileSize(file.size)}). Maximum allowed size is ${MAX_FILE_SIZE_MB} MB.`);
  }

  const fileName = file.name;
  const fileSize = formatFileSize(file.size);
  const mimeType = file.type || 'application/octet-stream';
  const lowerName = fileName.toLowerCase();

  // 3. Image Processing (PNG, JPG, JPEG, WEBP)
  if (mimeType.startsWith('image/') || /\.(png|jpg|jpeg|webp)$/i.test(lowerName)) {
    const objectUrl = URL.createObjectURL(file);

    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const dataUrl = reader.result as string;
        // Data URL format: "data:image/png;base64,iVBORw0KGgo..."
        const base64Data = dataUrl.split(',')[1] || '';
        resolve({
          fileName,
          fileSize,
          fileType: 'image',
          mimeType: mimeType.startsWith('image/') ? mimeType : `image/${lowerName.split('.').pop()}`,
          base64Data,
          previewUrl: dataUrl,
          objectUrl,
        });
      };
      reader.onerror = () => {
        URL.revokeObjectURL(objectUrl);
        reject(new Error('Failed to read image file.'));
      };
      reader.readAsDataURL(file);
    });
  }

  // 4. PDF Processing (.pdf)
  if (mimeType === 'application/pdf' || lowerName.endsWith('.pdf')) {
    const objectUrl = URL.createObjectURL(file);
    const buffer = await file.arrayBuffer();
    const extractedText = await extractTextFromPdfArrayBuffer(buffer);

    return {
      fileName,
      fileSize,
      fileType: 'pdf',
      mimeType: 'application/pdf',
      objectUrl,
      previewUrl: objectUrl,
      content: extractedText || `[PDF Document: ${fileName}]`,
    };
  }

  // 5. Text & Code File Processing (.txt, .js, .ts, .json, .css, .html, .md, .config, etc.)
  if (isTextOrCodeFile(fileName, mimeType)) {
    const textContent = await file.text();
    return {
      fileName,
      fileSize,
      fileType: 'text',
      mimeType: mimeType || 'text/plain',
      content: textContent.slice(0, 30000), // Cap at 30k chars for prompt efficiency
    };
  }

  // 6. DOC/DOCX Processing (.doc, .docx)
  if (
    mimeType.includes('msword') ||
    mimeType.includes('wordprocessingml') ||
    lowerName.endsWith('.doc') ||
    lowerName.endsWith('.docx')
  ) {
    const buffer = await file.arrayBuffer();
    const extractedText = extractTextFromDocxArrayBuffer(buffer);
    return {
      fileName,
      fileSize,
      fileType: 'doc',
      mimeType: mimeType || 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      content: extractedText || `[Word Document: ${fileName}]`,
    };
  }

  // Default fallback for unrecognized binary files (do NOT run file.text())
  return {
    fileName,
    fileSize,
    fileType: 'doc',
    mimeType,
  };
}
