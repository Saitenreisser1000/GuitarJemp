function sanitizePdfText(input) {
  const s = String(input ?? '')
  let out = ''
  for (let i = 0; i < s.length; i += 1) {
    const code = s.charCodeAt(i)
    if (code >= 32 && code <= 126) out += s[i]
    else out += '?'
  }
  return out
}

function escapePdfText(input) {
  return sanitizePdfText(input)
    .replaceAll('\\', '\\\\')
    .replaceAll('(', '\\(')
    .replaceAll(')', '\\)')
}

function dateStamp() {
  const d = new Date()
  const yyyy = d.getFullYear()
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  const hh = String(d.getHours()).padStart(2, '0')
  const mi = String(d.getMinutes()).padStart(2, '0')
  return `${yyyy}-${mm}-${dd} ${hh}:${mi}`
}

function linesForClip(clip, { title = '' } = {}) {
  const safeTitle = sanitizePdfText(title || clip?.title || 'GuitarJemp Export')
  const notes = Array.isArray(clip?.notes) ? clip.notes : []
  const out = []

  out.push(`GuitarJemp PDF Export: ${safeTitle}`)
  out.push(`Created: ${dateStamp()}`)
  out.push(`Tempo: ${Number(clip?.tempo) || 120} BPM`)
  out.push(`Meter: ${Number(clip?.beatTop) || 4}/${Number(clip?.beatBottom) || 4}`)
  out.push(`Instrument: ${sanitizePdfText(clip?.instrumentType || 'guitar')}`)
  out.push(`Strings: ${Number(clip?.numStrings) || 6}`)
  out.push('')
  out.push('Notes')
  out.push('#  Grid   Len   Str  Fret  MIDI')

  if (!notes.length) {
    out.push('(no notes)')
    return out
  }

  for (let i = 0; i < notes.length; i += 1) {
    const n = notes[i]
    const idx = String(i + 1).padStart(2, ' ')
    const grid = (Number(n?.gridIndex) || 1).toFixed(2).padStart(6, ' ')
    const len = (Number(n?.lengthBlocks) || 1).toFixed(2).padStart(5, ' ')
    const string = String(Number(n?.string) || 1).padStart(3, ' ')
    const fret = String(Number(n?.fret) || 0).padStart(4, ' ')
    const midi = String(Number(n?.midi) || 0).padStart(4, ' ')
    out.push(`${idx} ${grid} ${len} ${string} ${fret} ${midi}`)
  }

  return out
}

function buildPageStream(lines) {
  const FONT_SIZE = 11
  const PAGE_HEIGHT = 842
  const MARGIN_LEFT = 48
  const MARGIN_TOP = 56
  const LINE_HEIGHT = 14
  const yStart = PAGE_HEIGHT - MARGIN_TOP

  let stream = 'BT\n'
  stream += `/F1 ${FONT_SIZE} Tf\n`
  stream += `1 0 0 1 ${MARGIN_LEFT} ${yStart} Tm\n`

  for (let i = 0; i < lines.length; i += 1) {
    if (i > 0) stream += `0 -${LINE_HEIGHT} Td\n`
    stream += `(${escapePdfText(lines[i])}) Tj\n`
  }

  stream += 'ET\n'
  return stream
}

function toPdfUint8Array(pdfText) {
  const bytes = new Uint8Array(pdfText.length)
  for (let i = 0; i < pdfText.length; i += 1) bytes[i] = pdfText.charCodeAt(i) & 0xff
  return bytes
}

export function toPdfBytes(clip, { title = '' } = {}) {
  const PAGE_HEIGHT = 842
  const MARGIN_TOP = 56
  const MARGIN_BOTTOM = 48
  const LINE_HEIGHT = 14
  const maxLinesPerPage = Math.max(
    8,
    Math.floor((PAGE_HEIGHT - MARGIN_TOP - MARGIN_BOTTOM) / LINE_HEIGHT),
  )

  const allLines = linesForClip(clip, { title })
  const pages = []
  for (let i = 0; i < allLines.length; i += maxLinesPerPage) {
    pages.push(allLines.slice(i, i + maxLinesPerPage))
  }
  if (!pages.length) pages.push(['GuitarJemp PDF Export'])

  const objects = new Map()
  let nextObj = 1

  const catalogObj = nextObj++
  const pagesObj = nextObj++
  const fontObj = nextObj++
  const pageObjs = []
  const contentObjs = []

  for (let i = 0; i < pages.length; i += 1) {
    pageObjs.push(nextObj++)
    contentObjs.push(nextObj++)
  }

  objects.set(catalogObj, `<< /Type /Catalog /Pages ${pagesObj} 0 R >>`)

  const kids = pageObjs.map((n) => `${n} 0 R`).join(' ')
  objects.set(pagesObj, `<< /Type /Pages /Count ${pageObjs.length} /Kids [ ${kids} ] >>`)

  objects.set(fontObj, '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>')

  for (let i = 0; i < pageObjs.length; i += 1) {
    const pageObj = pageObjs[i]
    const contentObj = contentObjs[i]
    objects.set(
      pageObj,
      `<< /Type /Page /Parent ${pagesObj} 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 ${fontObj} 0 R >> >> /Contents ${contentObj} 0 R >>`,
    )

    const stream = buildPageStream(pages[i])
    const len = stream.length
    objects.set(contentObj, `<< /Length ${len} >>\nstream\n${stream}endstream`)
  }

  let pdf = '%PDF-1.4\n%\xFF\xFF\xFF\xFF\n'
  const offsets = [0]

  for (let n = 1; n < nextObj; n += 1) {
    offsets[n] = pdf.length
    const body = objects.get(n) || '<< >>'
    pdf += `${n} 0 obj\n${body}\nendobj\n`
  }

  const xrefOffset = pdf.length
  pdf += `xref\n0 ${nextObj}\n`
  pdf += '0000000000 65535 f \n'
  for (let n = 1; n < nextObj; n += 1) {
    pdf += `${String(offsets[n]).padStart(10, '0')} 00000 n \n`
  }
  pdf += `trailer\n<< /Size ${nextObj} /Root ${catalogObj} 0 R >>\n`
  pdf += `startxref\n${xrefOffset}\n%%EOF`

  return toPdfUint8Array(pdf)
}
