// A one-page, text-only PDF writer. Enough for a receipt: a heading, a rule
// and label/value lines in Helvetica. No library, so nothing is added to the
// bundle. Text is limited to Latin-1 (anything else prints as "?").

const PAGE_WIDTH = 595; // A4, points
const PAGE_HEIGHT = 842;
const MARGIN = 56;

function latin1(text) {
  return String(text ?? "")
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/[–—]/g, "-")
    .replace(/[^\x20-\xff]/g, "?");
}

function escapePdf(text) {
  return latin1(text).replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
}

function toBytes(text) {
  const bytes = new Uint8Array(text.length);
  for (let i = 0; i < text.length; i += 1) bytes[i] = text.charCodeAt(i) & 0xff;
  return bytes;
}

/** Breaks a long value across lines so it stays inside the margins (about 88 characters at 10pt). */
function wrap(text, width = 88) {
  const words = latin1(text).split(/\s+/);
  const lines = [];
  let line = "";
  for (const word of words) {
    if ((line + " " + word).trim().length > width) {
      if (line) lines.push(line);
      line = word;
    } else {
      line = (line + " " + word).trim();
    }
  }
  if (line) lines.push(line);
  return lines.length ? lines : [""];
}

/**
 * @param {{ title: string, subtitle?: string, rows: Array<[string, string]>, footer?: string }} doc
 * @returns {Blob} application/pdf
 */
export function buildPdf({ title, subtitle, rows, footer }) {
  const ops = [];
  let y = PAGE_HEIGHT - MARGIN;
  const text = (value, size, bold = false, x = MARGIN, gray = 0) => {
    ops.push(`BT /${bold ? "F2" : "F1"} ${size} Tf ${gray} g ${x} ${y} Td (${escapePdf(value)}) Tj ET`);
  };

  text(title, 18, true);
  y -= 22;
  if (subtitle) {
    text(subtitle, 11, false, MARGIN, 0.35);
    y -= 18;
  }
  ops.push(`0.75 G 0.8 w ${MARGIN} ${y} m ${PAGE_WIDTH - MARGIN} ${y} l S`);
  y -= 28;

  for (const [label, value] of rows) {
    text(label.toUpperCase(), 8, true, MARGIN, 0.4);
    y -= 14;
    for (const line of wrap(value || "-")) {
      text(line, 11);
      y -= 15;
    }
    y -= 8;
    if (y < MARGIN + 40) break;
  }

  if (footer) {
    y = MARGIN;
    text(footer, 8, false, MARGIN, 0.45);
  }

  const content = ops.join("\n");
  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${PAGE_WIDTH} ${PAGE_HEIGHT}] /Resources << /Font << /F1 4 0 R /F2 5 0 R >> >> /Contents 6 0 R >>`,
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>",
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>",
    `<< /Length ${content.length} >>\nstream\n${content}\nendstream`,
  ];

  let out = "%PDF-1.4\n";
  const offsets = [];
  objects.forEach((body, index) => {
    offsets.push(out.length);
    out += `${index + 1} 0 obj\n${body}\nendobj\n`;
  });
  const xrefAt = out.length;
  out += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  offsets.forEach((offset) => {
    out += `${String(offset).padStart(10, "0")} 00000 n \n`;
  });
  out += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefAt}\n%%EOF\n`;

  return new Blob([toBytes(out)], { type: "application/pdf" });
}

/** Saves a Blob as a file download. */
export function downloadBlob(blob, fileName) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
