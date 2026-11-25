const XLSX = require('xlsx');

/**
 * Parses an Excel buffer preserving exact sheet names, exact headers,
 * exact row order, and exact cell string values without altering casing or names.
 */
const parseExcelBuffer = (buffer) => {
  const workbook = XLSX.read(buffer, {
    type: 'buffer',
    raw: false,
    cellText: true,
    cellDates: false,
  });

  const sheets = workbook.SheetNames.map((sheetName) => {
    const worksheet = workbook.Sheets[sheetName];
    const matrix = XLSX.utils.sheet_to_json(worksheet, {
      header: 1,
      defval: '',
      blankrows: false,
      raw: false,
    });

    if (!matrix || matrix.length === 0) {
      return {
        sheetName,
        headers: [],
        rows: [],
        rowCount: 0,
        columnCount: 0,
      };
    }

    // Determine max column count across all rows so no trailing columns are dropped
    const maxCols = matrix.reduce((max, row) => Math.max(max, Array.isArray(row) ? row.length : 0), 0);

    const rawHeaderRow = Array.isArray(matrix[0]) ? matrix[0] : [];
    const headers = Array.from({ length: maxCols }, (_, idx) => {
      const val = rawHeaderRow[idx];
      return val === undefined || val === null ? '' : String(val);
    });

    const rows = matrix.slice(1).map((row) => {
      const arr = Array.isArray(row) ? row : [];
      return Array.from({ length: maxCols }, (_, idx) => {
        const val = arr[idx];
        return val === undefined || val === null ? '' : String(val);
      });
    });

    return {
      sheetName,
      headers,
      rows,
      rowCount: rows.length,
      columnCount: maxCols,
    };
  });

  const totalRows = sheets.reduce((sum, s) => sum + s.rowCount, 0);

  // Auto-detect best default sheet and class column
  const firstPopulatedSheet = sheets.find((s) => s.columnCount > 0) || sheets[0] || null;
  let defaultSheetName = firstPopulatedSheet ? firstPopulatedSheet.sheetName : '';
  let defaultClassColIdx = 0;

  if (firstPopulatedSheet && firstPopulatedSheet.headers.length > 0) {
    const classHeaderRegex = /^(class|class[_\s-]?name|classes|label|labels|category|categories|object[_\s-]?class)$/i;
    const partialClassRegex = /(class|label|category)/i;

    let matchIdx = firstPopulatedSheet.headers.findIndex((h) => classHeaderRegex.test(h.trim()));
    if (matchIdx === -1) {
      matchIdx = firstPopulatedSheet.headers.findIndex((h) => partialClassRegex.test(h.trim()));
    }
    defaultClassColIdx = matchIdx !== -1 ? matchIdx : 0;
  }

  return {
    sheets,
    totalRows,
    defaultSheetName,
    defaultClassColIdx,
  };
};

/**
 * Extracts class names from a given sheet and column index in exact original order
 * without modifying original class names or values.
 */
const extractClassesFromSheet = (sheet, columnIndex = 0, preserveDuplicates = false, includeHeader = false) => {
  if (!sheet) return [];
  const colIdx = Number(columnIndex) || 0;
  const sourceValues = [];

  if (includeHeader && sheet.headers && sheet.headers[colIdx] !== undefined) {
    sourceValues.push(sheet.headers[colIdx]);
  }

  for (const row of sheet.rows || []) {
    if (Array.isArray(row) && row[colIdx] !== undefined && row[colIdx] !== null) {
      sourceValues.push(String(row[colIdx]));
    }
  }

  const classes = [];
  const seen = new Set();

  for (const rawVal of sourceValues) {
    // Only ignore completely empty cells; never modify or trim original non-empty class string
    if (rawVal === '') continue;

    if (preserveDuplicates) {
      classes.push(rawVal);
    } else if (!seen.has(rawVal)) {
      seen.add(rawVal);
      classes.push(rawVal);
    }
  }

  return classes;
};

module.exports = {
  parseExcelBuffer,
  extractClassesFromSheet,
};
