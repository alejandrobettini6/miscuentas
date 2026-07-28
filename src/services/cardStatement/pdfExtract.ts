import * as pdfjs from 'pdfjs-dist'
import pdfWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url'

pdfjs.GlobalWorkerOptions.workerSrc = pdfWorker

export type PdfExtractErrorCode =
  | 'PASSWORD_REQUIRED'
  | 'WRONG_PASSWORD'
  | 'INVALID_PDF'
  | 'EMPTY_TEXT'
  | 'UNKNOWN'

export class PdfExtractError extends Error {
  readonly code: PdfExtractErrorCode

  constructor(code: PdfExtractErrorCode, message: string) {
    super(message)
    this.name = 'PdfExtractError'
    this.code = code
  }
}

function mapPdfJsError(error: unknown): PdfExtractError {
  if (error instanceof PdfExtractError) return error
  const name =
    error && typeof error === 'object' && 'name' in error
      ? String((error as { name: unknown }).name)
      : ''
  const message =
    error instanceof Error ? error.message : 'No se pudo leer el PDF'

  if (name === 'PasswordException' || /password/i.test(message)) {
    if (/incorrect|wrong|invalid/i.test(message)) {
      return new PdfExtractError(
        'WRONG_PASSWORD',
        'Contraseña incorrecta',
      )
    }
    return new PdfExtractError(
      'PASSWORD_REQUIRED',
      'Este PDF está protegido. Ingresá la contraseña.',
    )
  }

  if (name === 'InvalidPDFException' || /invalid pdf/i.test(message)) {
    return new PdfExtractError('INVALID_PDF', 'El archivo no es un PDF válido')
  }

  return new PdfExtractError('UNKNOWN', message)
}

const Y_TOLERANCE = 2

/**
 * Rebuild reading-order lines from pdf.js text items using Y position.
 */
function linesFromTextContent(
  items: Array<{ str?: string; transform?: number[] }>,
): string[] {
  type Row = { y: number; parts: string[] }
  const rows: Row[] = []

  for (const item of items) {
    const str = item.str
    if (!str) continue
    const y = item.transform ? Math.round(item.transform[5]) : 0
    const last = rows[rows.length - 1]
    if (last && Math.abs(last.y - y) <= Y_TOLERANCE) {
      last.parts.push(str)
    } else {
      rows.push({ y, parts: [str] })
    }
  }

  return rows
    .map((row) => row.parts.join(' ').replace(/[ \t]+/g, ' ').trim())
    .filter(Boolean)
}

/**
 * Extract plain text from a PDF ArrayBuffer (client-side via pdf.js).
 * Password is optional for protected statements.
 * Lines are reconstructed by vertical position so statement rows stay intact.
 */
export async function extractPdfText(
  data: ArrayBuffer,
  password?: string,
): Promise<string> {
  try {
    const loadingTask = pdfjs.getDocument({
      data: new Uint8Array(data),
      password: password?.trim() || undefined,
      useSystemFonts: true,
    })
    const pdf = await loadingTask.promise
    const pageBlocks: string[] = []

    for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
      const page = await pdf.getPage(pageNum)
      const content = await page.getTextContent()
      const lines = linesFromTextContent(
        content.items as Array<{ str?: string; transform?: number[] }>,
      )
      pageBlocks.push(lines.join('\n'))
    }

    const text = pageBlocks.join('\n').replace(/\n{3,}/g, '\n\n').trim()

    if (!text) {
      throw new PdfExtractError(
        'EMPTY_TEXT',
        'No se pudo leer texto del PDF. ¿Es un escaneo? Solo se admiten PDFs con texto seleccionable.',
      )
    }

    return text
  } catch (error) {
    throw mapPdfJsError(error)
  }
}

export function pdfExtractErrorMessage(error: unknown): string {
  if (error instanceof PdfExtractError) return error.message
  if (error instanceof Error) return error.message
  return 'No se pudo leer el PDF'
}
