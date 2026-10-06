/**
 * Minimal RFC 4180 parser: quoted fields, escaped quotes (""), commas and
 * newlines inside quotes, CRLF line endings and a leading BOM. Fully blank
 * lines are dropped. Returns raw strings; typing happens in the validator.
 */
export class CsvSyntaxError extends Error {}

export function parseCsv(text: string): string[][] {
  const input = text.charCodeAt(0) === 0xfeff ? text.slice(1) : text;

  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;
  let line = 1;

  const endField = () => {
    row.push(field);
    field = "";
  };

  const endRow = () => {
    endField();

    if (row.some((value) => value.trim() !== "")) {
      rows.push(row);
    }

    row = [];
  };

  for (let i = 0; i < input.length; i++) {
    const char = input[i];

    if (inQuotes) {
      if (char === '"') {
        if (input[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        if (char === "\n") line++;
        field += char;
      }
      continue;
    }

    if (char === '"' && field.trim() === "") {
      field = "";
      inQuotes = true;
    } else if (char === ",") {
      endField();
    } else if (char === "\n" || char === "\r") {
      if (char === "\r" && input[i + 1] === "\n") i++;
      endRow();
      line++;
    } else {
      field += char;
    }
  }

  if (inQuotes) {
    throw new CsvSyntaxError(`Unclosed quoted field starting near line ${line}.`);
  }

  if (field !== "" || row.length > 0) {
    endRow();
  }

  return rows;
}
