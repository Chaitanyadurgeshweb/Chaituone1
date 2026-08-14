import ExcelJS from "exceljs";
import * as XLSX from "xlsx";

export interface NmsProcessResult {
  eligibleLocos: number;
  badLocos: number;
  totalTrials: number;
  skippedFiles: string[];
  ignoredGroupsCount: number;
  /** Distinct station codes seen in the section files that aren't in
   *  STATION_SECTION_MAP. For these rows the code falls back to using
   *  the upload folder name as the section, so these are worth reviewing —
   *  either the station list is missing that code, or it's a typo. */
  unmappedStations: string[];
}

// ---- Station code -> section mapping, sourced from the official Stations_list workbook ----
// Each key is a sheet name in that workbook (e.g. "ST-UBR"); this IS the section name
// used for grouping and displayed on Sheet3 -- no further translation is applied.
const STATION_SECTION_MAP: Record<string, string> = {
  // NR1
  'CPB': 'NR1', 'MGW': 'NR1', 'ON': 'NR1', 'SIC': 'NR1', 'AJ': 'NR1', 'JTU-AJ': 'NR1',
  'JTU': 'NR1', 'HRN': 'NR1', 'POF': 'NR1',
  // NR
  'OKA': 'NR', 'TKD': 'NR', 'JNC': 'NR', 'FDB': 'NR', 'FDN': 'NR', 'BVH': 'NR',
  'PYLA': 'NR', 'AST': 'NR', 'PH10': 'NR', 'PWL': 'NR',
  // VS-URN
  'VS': 'VS-URN', 'MPR': 'VS-URN', 'VRM': 'VS-URN', 'ITA': 'VS-URN', 'KSPR': 'VS-URN', 'MYG': 'VS-URN',
  'LKD': 'VS-URN', 'PLJ': 'VS-URN', 'VRE': 'VS-URN', 'NIU': 'VS-URN', 'CVJ': 'VS-URN', 'BH': 'VS-URN',
  'AKV-BH': 'VS-URN', 'AKV': 'VS-URN', 'PAO-AKV': 'VS-URN', 'PAO': 'VS-URN', 'KSB': 'VS-URN', 'KIM': 'VS-URN',
  'SYN': 'VS-URN', 'GTX': 'VS-URN', 'KSE': 'VS-URN', 'URN': 'VS-URN',
  // ST-UBR
  'ST': 'ST-UBR', 'UDN': 'ST-UBR', 'BHET': 'ST-UBR', 'SCH': 'ST-UBR', 'MRL': 'ST-UBR', 'NVS': 'ST-UBR',
  'VDH': 'ST-UBR', 'AML': 'ST-UBR', 'BIM': 'ST-UBR', 'DGI': 'ST-UBR', 'BL': 'ST-UBR', 'ATUL': 'ST-UBR',
  'PAD': 'ST-UBR', 'UVD': 'ST-UBR', 'VAPI-UVD': 'ST-UBR', 'VAPI': 'ST-UBR', 'KEB': 'ST-UBR', 'BLD': 'ST-UBR',
  'SJN-BLD': 'ST-UBR', 'SJN': 'ST-UBR', 'UBR': 'ST-UBR',
  // GVD-VR
  'GVD': 'GVD-VR', 'DRD-GVD': 'GVD-VR', 'DRD': 'GVD-VR', 'VGN-DRD': 'GVD-VR', 'VGN': 'GVD-VR', 'BOR': 'GVD-VR',
  'PLG-BOR': 'GVD-VR', 'PLG': 'GVD-VR', 'KLV': 'GVD-VR', 'SAH': 'GVD-VR', 'VTN': 'GVD-VR', 'VR': 'GVD-VR',
  // NAD-DHD-BIO
  'NAD': 'NAD-DHD-BIO', 'BRNA-NAD': 'NAD-DHD-BIO', 'BRNA': 'NAD-DHD-BIO', 'KUH': 'NAD-DHD-BIO', 'RNH-KUH': 'NAD-DHD-BIO', 'RNH': 'NAD-DHD-BIO',
  'BOD': 'NAD-DHD-BIO', 'RTME': 'NAD-DHD-BIO', 'RTM': 'NAD-DHD-BIO', 'RTD': 'NAD-DHD-BIO', 'MRN': 'NAD-DHD-BIO', 'BILDI-MRN': 'NAD-DHD-BIO',
  'BILDI': 'NAD-DHD-BIO', 'RTI': 'NAD-DHD-BIO', 'BOG-RTI': 'NAD-DHD-BIO', 'BOG': 'NAD-DHD-BIO', 'BMI': 'NAD-DHD-BIO', 'AGR': 'NAD-DHD-BIO',
  'PCN-AGR': 'NAD-DHD-BIO', 'PCN': 'NAD-DHD-BIO', 'BJG': 'NAD-DHD-BIO', 'THDR': 'NAD-DHD-BIO', 'MGN': 'NAD-DHD-BIO', 'ANAS-MGN': 'NAD-DHD-BIO',
  'ANAS': 'NAD-DHD-BIO', 'BIO': 'NAD-DHD-BIO', 'DHD-BIO': 'NAD-DHD-BIO',
  // DHD-KIZ
  'DHD': 'DHD-KIZ', 'RET': 'DHD-KIZ', 'JKT': 'DHD-KIZ', 'USRA': 'DHD-KIZ', 'MAM': 'DHD-KIZ', 'LMK-MAM': 'DHD-KIZ',
  'LMK': 'DHD-KIZ', 'PPD': 'DHD-KIZ', 'SAT-PPD': 'DHD-KIZ', 'SAT': 'DHD-KIZ', 'CCL': 'DHD-KIZ', 'KIZ': 'DHD-KIZ',
  // GDA-BRCY
  'GDA': 'GDA-BRCY', 'KRSA-GDA': 'GDA-BRCY', 'KRSA': 'GDA-BRCY', 'DRL-KRSA': 'GDA-BRCY', 'DRL': 'GDA-BRCY', 'BKRL': 'GDA-BRCY',
  'CPN': 'GDA-BRCY', 'SMLA-CPN': 'GDA-BRCY', 'SMLA': 'GDA-BRCY', 'PIO-SMLA': 'GDA-BRCY', 'PIO': 'GDA-BRCY', 'CYI': 'GDA-BRCY',
  'BRGY': 'GDA-BRCY', 'BRC': 'GDA-BRCY',
};

// ---- Helper functions ----
function cleanText(value: unknown): string {
  if (value === null || value === undefined) return "";
  return String(value).trim();
}

function normalizeLoco(value: unknown): string {
  const text = cleanText(value);
  if (text.endsWith(".0")) return text.slice(0, -2);
  return text;
}

function normalizeDirection(value: unknown): "Nominal" | "Reverse" | "" {
  const text = cleanText(value).toUpperCase();
  if (["NOM", "NOMINAL"].includes(text)) return "Nominal";
  if (["REV", "REVERSE"].includes(text)) return "Reverse";
  return "";
}

function normalizeHeader(value: unknown): string {
  return cleanText(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "");
}

export function normalizeDateText(value: unknown): string {
  if (!value) return "";
  if (value instanceof Date) {
    const day = String(value.getDate()).padStart(2, "0");
    const month = String(value.getMonth() + 1).padStart(2, "0");
    const year = String(value.getFullYear()).slice(-2);
    return `${day}/${month}/${year}`;
  }
  const text = cleanText(value);
  // D/M/Y (slash-separated), matching Python's "%d/%m/%y" and "%d/%m/%Y"
  let m = text.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);
  if (m) {
    const day = m[1].padStart(2, "0");
    const month = m[2].padStart(2, "0");
    const year = m[3].length === 2 ? m[3] : m[3].slice(-2);
    return `${day}/${month}/${year}`;
  }
  // Y-M-D (ISO), matching Python's "%Y-%m-%d"
  m = text.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (m) {
    const day = m[3].padStart(2, "0");
    const month = m[2].padStart(2, "0");
    const year = m[1].slice(-2);
    return `${day}/${month}/${year}`;
  }
  // D-M-Y (dash-separated), matching Python's "%d-%m-%y" and "%d-%m-%Y"
  m = text.match(/^(\d{1,2})-(\d{1,2})-(\d{2,4})$/);
  if (m) {
    const day = m[1].padStart(2, "0");
    const month = m[2].padStart(2, "0");
    const year = m[3].length === 2 ? m[3] : m[3].slice(-2);
    return `${day}/${month}/${year}`;
  }
  return text;
}

/**
 * Extracts a date from a raw cell value that may be a Date object,
 * a timestamp string ("2026-07-16 02:22:52"), or a plain date string.
 */
function extractDateFromTimestamp(value: unknown): string {
  if (!value) return "";
  if (value instanceof Date) {
    const day = String(value.getDate()).padStart(2, "0");
    const month = String(value.getMonth() + 1).padStart(2, "0");
    const year = String(value.getFullYear()).slice(-2);
    return `${day}/${month}/${year}`;
  }
  const text = cleanText(value);
  if (!text) return "";

  // Handle "YYYY-MM-DD HH:MM:SS" timestamp — take date part only
  const tsMatch = text.match(/^(\d{4}-\d{2}-\d{2})/);
  if (tsMatch) {
    const [y, mo, d] = tsMatch[1].split("-");
    return `${d}/${mo}/${y.slice(-2)}`;
  }

  // Fallback: try the standard normalizer
  return normalizeDateText(text);
}

function asFloat(value: unknown): number | null {
  if (value === null || value === undefined) return null;
  if (typeof value === "number") return value;
  const text = cleanText(value).replace(/%$/, "");
  const n = parseFloat(text);
  return isNaN(n) ? null : n;
}

function findColumn(headers: unknown[], options: string[]): number | null {
  const normalized = headers.map((h) => normalizeHeader(h));
  for (const option of options) {
    for (let i = 0; i < normalized.length; i++) {
      if (normalized[i] === option || normalized[i].includes(option)) {
        return i;
      }
    }
  }
  return null;
}

function locoSortKey(loco: string): number {
  const digits = loco.replace(/\D/g, "");
  return digits ? parseInt(digits, 10) : 0;
}

/**
 * Deep-clones a style value (fill/font/border/alignment).
 * ExcelJS can internally share the same style object reference across
 * multiple cells that were saved with identical formatting in the source
 * file. Assigning that reference directly to another cell (instead of
 * cloning it) means a later mutation — e.g. changing that cell's fill —
 * silently mutates every other cell still pointing at the same shared
 * object, corrupting unrelated pre-existing formatting. Always clone
 * before assigning to avoid this. (Mirrors why the Python source always
 * uses `copy()` when copying cell styles.)
 */
function cloneStyle<T>(value: T): T {
  if (value === null || value === undefined) return value;
  return JSON.parse(JSON.stringify(value));
}

/** Parse a normalised DD/MM/YY date string to a comparable Date (returns Date.max on failure). */
function parseDDMMYY(dateStr: string): Date {
  const m = dateStr.match(/^(\d{2})\/(\d{2})\/(\d{2})$/);
  if (!m) return new Date(8640000000000000);
  const year = parseInt(m[3], 10) + 2000;
  return new Date(year, parseInt(m[2], 10) - 1, parseInt(m[1], 10));
}

// ---- ExcelJS style constants ----
const RED_FILL: ExcelJS.Fill = {
  type: "pattern",
  pattern: "solid",
  fgColor: { argb: "FFFF0000" },
};
const GREEN_FILL: ExcelJS.Fill = {
  type: "pattern",
  pattern: "solid",
  fgColor: { argb: "FF92D050" },
};
const HEADER_FILL: ExcelJS.Fill = {
  type: "pattern",
  pattern: "solid",
  fgColor: { argb: "FFFFB6B6" },
};
const YELLOW_FILL: ExcelJS.Fill = {
  type: "pattern",
  pattern: "solid",
  fgColor: { argb: "FFFFFF00" },
};
const THIN_BORDER: Partial<ExcelJS.Borders> = {
  top: { style: "thin", color: { argb: "FFBFBFBF" } },
  bottom: { style: "thin", color: { argb: "FFBFBFBF" } },
  left: { style: "thin", color: { argb: "FFBFBFBF" } },
  right: { style: "thin", color: { argb: "FFBFBFBF" } },
};
const BLACK_BOLD_FONT: Partial<ExcelJS.Font> = {
  name: "Arial",
  size: 10,
  color: { argb: "FF000000" },
  bold: true,
};
const NORMAL_FONT: Partial<ExcelJS.Font> = {
  name: "Arial",
  size: 10,
  color: { argb: "FF000000" },
  bold: false,
};
const CENTER_ALIGN: Partial<ExcelJS.Alignment> = { horizontal: "center" };

function setResultCell(
  cell: ExcelJS.Cell,
  dateText: string,
  isBad: boolean
): void {
  // Cells that were saved with identical formatting in the source file can
  // share the SAME underlying style object/index inside ExcelJS's model —
  // even cells we've never touched. Mutating a cell's style in place while
  // it's still pointing at that shared object corrupts every other cell
  // still using it. Force this cell to fork its own independent style
  // object first, so nothing else is affected.
  cell.style = cloneStyle(cell.style);

  cell.value = dateText;
  cell.fill = cloneStyle(isBad ? RED_FILL : GREEN_FILL);
  cell.font = isBad
    ? { name: "Arial", size: 10, color: { argb: "FFFFFFFF" }, bold: true }
    : cloneStyle(NORMAL_FONT);
  cell.border = cloneStyle(THIN_BORDER) as ExcelJS.Borders;
  cell.alignment = cloneStyle(CENTER_ALIGN);
}

// ---- Read company map from buffer (SheetJS - handles .xls/.xlsx/.xlsm) ----
export function readCompanyMapFromBuffer(buffer: Buffer): Map<string, string> {
  let wb: XLSX.WorkBook;
  try {
    wb = XLSX.read(buffer, { type: "buffer" });
  } catch (err) {
    throw new Error(
      `Company Mapping File could not be read — it may be corrupted or not a valid Excel file (.xls/.xlsx/.xlsm). Try re-saving it from Excel and re-uploading. (${
        err instanceof Error ? err.message : String(err)
      })`
    );
  }
  const companyMap = new Map<string, string>();

  for (const sheetName of wb.SheetNames) {
    const sheet = wb.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json<unknown[]>(sheet, {
      header: 1,
      defval: null,
    }) as unknown[][];

    let headerRowIdx = -1;
    let companyCol = -1;
    let locoCol = -1;

    for (let i = 0; i < Math.min(20, rows.length); i++) {
      const row = rows[i];
      const pc = findColumn(row, ["company", "firm"]);
      const pl = findColumn(row, ["locoid", "loco"]);
      if (pc !== null && pl !== null) {
        headerRowIdx = i;
        companyCol = pc;
        locoCol = pl;
        break;
      }
    }

    if (headerRowIdx === -1) continue;

    for (let i = headerRowIdx + 1; i < rows.length; i++) {
      const row = rows[i];
      const loco = normalizeLoco(row[locoCol]);
      const company = cleanText(row[companyCol]);
      if (loco) companyMap.set(loco, company);
    }
  }

  return companyMap;
}

// ---- Read section files — auto-discovers dates from each row ----
export interface SectionFileInput {
  relativePath: string;
  data: Buffer;
}

export interface LocoDateResult {
  isBad: boolean;
  badSections: Set<string>;
}

// locoResults: loco → (date → { isBad, badSections })
export type LocoResults = Map<string, Map<string, LocoDateResult>>;

interface SectionResult {
  locoResults: LocoResults;
  allLocos: Set<string>;
  skippedFiles: string[];
  ignoredGroupsCount: number;
  unmappedStations: string[];
}

export function readSectionFilesFromBuffers(
  inputs: SectionFileInput[]
): SectionResult {
  // locoDataByDate: loco → date → (section|direction|station) → percentage
  const locoDataByDate = new Map<
    string,
    Map<string, Map<string, number | null>>
  >();
  const skippedFiles: string[] = [];
  const unmappedStations = new Set<string>();

  for (const input of inputs) {
    const { relativePath, data } = input;
    const fileName = relativePath.split(/[\\/]/).pop() ?? relativePath;
    if (fileName.startsWith("~$")) continue;
    if (!relativePath.match(/\.(xls|xlsx|xlsm)$/i)) continue;

    const parts = relativePath.split(/[\\/]/);
    // The upload folder name is now only a FALLBACK. The real section for
    // each row is resolved from its own station code against
    // STATION_SECTION_MAP below — see the row loop. This folder name is
    // only used if a row's station code isn't found in that map at all.
    const folderSection = parts.length >= 3 ? parts[1] : "default";

    try {
      const wb = XLSX.read(data, { type: "buffer", cellDates: true });

      for (const sheetName of wb.SheetNames) {
        const sheet = wb.Sheets[sheetName];
        const rows = XLSX.utils.sheet_to_json<unknown[]>(sheet, {
          header: 1,
          defval: null,
          raw: false,   // parse dates as strings via cellDates above
        }) as unknown[][];

        // Also do a raw parse to get Date objects for date cells
        const rawRows = XLSX.utils.sheet_to_json<unknown[]>(sheet, {
          header: 1,
          defval: null,
          raw: true,
        }) as unknown[][];

        let headerRowIdx = -1;
        let stationCol = -1,
          directionCol = -1,
          locoCol = -1,
          percentageCol = -1,
          dateCol = -1;

        for (let i = 0; i < Math.min(20, rows.length); i++) {
          const row = rows[i];
          const ps = findColumn(row, ["stationid", "stationcode", "station"]);
          const pd = findColumn(row, ["direction", "dir"]);
          const pl = findColumn(row, ["locoid", "loco"]);
          const pp = findColumn(row, ["percentage", "percent"]);
          const pdate = findColumn(row, ["from", "date", "trialdate"]);
          if (
            ps !== null &&
            pd !== null &&
            pl !== null &&
            pp !== null &&
            pdate !== null
          ) {
            headerRowIdx = i;
            stationCol = ps;
            directionCol = pd;
            locoCol = pl;
            percentageCol = pp;
            dateCol = pdate;
            break;
          }
        }

        if (headerRowIdx === -1) continue;

        for (let i = headerRowIdx + 1; i < rows.length; i++) {
          const row = rows[i];
          const rawRow = rawRows[i] ?? [];

          const loco = normalizeLoco(row[locoCol]);
          const station = cleanText(row[stationCol]).toUpperCase();
          const direction = normalizeDirection(row[directionCol]);
          const percentage = asFloat(row[percentageCol]);
          // Prefer raw value for date to catch Date objects
          const dateVal = extractDateFromTimestamp(rawRow[dateCol] ?? row[dateCol]);

          if (!loco || !station || !direction || !dateVal) continue;

          // Resolve this row's section from its station code (authoritative
          // source: the Stations_list workbook). Only fall back to the
          // upload folder name when the code isn't in the map at all, and
          // record it so it can be surfaced back to the user for review.
          let section = STATION_SECTION_MAP[station];
          if (!section) {
            section = folderSection;
            unmappedStations.add(station);
          }

          if (!locoDataByDate.has(loco)) locoDataByDate.set(loco, new Map());
          const byDate = locoDataByDate.get(loco)!;
          if (!byDate.has(dateVal)) byDate.set(dateVal, new Map());
          const byKey = byDate.get(dateVal)!;

          const key = `${section}|${direction}|${station}`;
          byKey.set(key, percentage);
        }
      }
    } catch (err) {
      skippedFiles.push(`${relativePath}: ${err}`);
    }
  }

  // Process each loco and each date
  const locoResults: LocoResults = new Map();
  const allLocos = new Set<string>(locoDataByDate.keys());
  // Python tracks ignored (section, direction) groups in a single dict shared
  // across all locos/dates, and reports len(ignored_groups) — i.e. the count
  // of DISTINCT groups ever under-travelled, not the number of occurrences.
  const ignoredGroupKeys = new Set<string>();

  for (const [loco, byDate] of locoDataByDate) {
    const dateMap = new Map<string, LocoDateResult>();

    for (const [dateVal, byKey] of byDate) {
      // Count travelled and bad stations per (section, direction) group
      const travelledCounts = new Map<string, number>();
      const badCounts = new Map<string, number>();

      for (const [key, percentage] of byKey) {
        const [sec, dir] = key.split("|");
        const groupKey = `${sec}|${dir}`;
        travelledCounts.set(groupKey, (travelledCounts.get(groupKey) ?? 0) + 1);
        if (percentage !== null && percentage < 90) {
          badCounts.set(groupKey, (badCounts.get(groupKey) ?? 0) + 1);
        }
      }

      // Eligible groups have more than 2 stations
      const eligibleGroups = new Set<string>(
        [...travelledCounts.entries()]
          .filter(([, c]) => c > 2)
          .map(([k]) => k)
      );

      // Track ignored (distinct) groups
      for (const [groupKey, c] of travelledCounts) {
        if (c <= 2) ignoredGroupKeys.add(groupKey);
      }

      let isBad = false;
      const badSections = new Set<string>();

      for (const [groupKey, badCount] of badCounts) {
        if (!eligibleGroups.has(groupKey)) continue;
        if (badCount > 3) {
          isBad = true;
          const [sec] = groupKey.split("|");
          badSections.add(sec);
        }
      }

      dateMap.set(dateVal, { isBad, badSections });
    }

    locoResults.set(loco, dateMap);
  }

  return {
    locoResults,
    allLocos,
    skippedFiles,
    ignoredGroupsCount: ignoredGroupKeys.size,
    unmappedStations: [...unmappedStations].sort(),
  };
}

// ---- Sheet2: locos not found in Sheet1 ----
function addSheet2Row(
  sheet: ExcelJS.Worksheet,
  loco: string,
  dateText: string,
  company: string,
  isBad: boolean
): void {
  for (let r = 2; r <= sheet.rowCount; r++) {
    if (
      normalizeLoco(sheet.getCell(r, 1).value) === normalizeLoco(loco) &&
      normalizeDateText(sheet.getCell(r, 2).value) === normalizeDateText(dateText)
    ) {
      return;
    }
  }

  let row = sheet.rowCount + 1;
  while (
    row > 1 &&
    !cleanText(sheet.getCell(row, 1).value) &&
    !cleanText(sheet.getCell(row, 2).value) &&
    !cleanText(sheet.getCell(row, 3).value)
  ) {
    row--;
  }
  row++;

  sheet.getCell(row, 1).value = loco;
  sheet.getCell(row, 3).value = company;
  setResultCell(sheet.getCell(row, 2), dateText, isBad);
  for (let c = 1; c <= 3; c++) {
    const cell = sheet.getCell(row, c);
    cell.style = cloneStyle(cell.style);
    cell.border = cloneStyle(THIN_BORDER) as ExcelJS.Borders;
    cell.alignment = cloneStyle(CENTER_ALIGN);
    if (!cell.font) cell.font = cloneStyle(NORMAL_FONT);
  }
}

// ---- Insert a date into Sheet1 row in chronological order ----
/**
 * Finds the correct column for `newDateText` in the given Sheet1 row,
 * shifting later dates one column to the right if needed.
 * Returns the column number where the date should be written.
 */
function insertDateInOrder(
  sheet1: ExcelJS.Worksheet,
  locoRow: number,
  headerRowNum: number,
  newDateText: string,
  startCol: number
): number {
  // Collect existing date cells in this row
  interface DateEntry { col: number; dateText: string; dateObj: Date }
  const existing: DateEntry[] = [];

  const row = sheet1.getRow(locoRow);
  row.eachCell({ includeEmpty: false }, (cell, colNum) => {
    if (colNum < startCol) return;
    const isMergeSlave =
      cell.isMerged &&
      (cell.type as number) === (ExcelJS.ValueType.Merge as number);
    if (isMergeSlave) return;
    const dt = normalizeDateText(cell.value);
    if (dt) existing.push({ col: colNum, dateText: dt, dateObj: parseDDMMYY(dt) });
  });

  // Already present — return its column (no-op for the caller)
  const newDateObj = parseDDMMYY(newDateText);
  for (const e of existing) {
    if (normalizeDateText(e.dateText) === newDateText) return e.col;
  }

  // Find insertion column (sorted chronologically)
  let insertCol = startCol;
  for (const e of existing) {
    if (newDateObj < e.dateObj) break;
    insertCol = e.col + 1;
  }

  // Shift entries at insertCol and beyond one column to the right
  if (existing.length > 0) {
    const lastCol = existing[existing.length - 1].col;
    for (let col = lastCol; col >= insertCol; col--) {
      const srcCell = sheet1.getCell(locoRow, col);
      const dstCell = sheet1.getCell(locoRow, col + 1);
      // Fork dstCell away from any style it may already share with other
      // cells before writing to it — see cloneStyle's comment above.
      dstCell.style = cloneStyle(dstCell.style);
      dstCell.value = srcCell.value;
      if (srcCell.style) {
        if (srcCell.fill) dstCell.fill = cloneStyle(srcCell.fill);
        if (srcCell.font) dstCell.font = cloneStyle(srcCell.font);
        if (srcCell.border) dstCell.border = cloneStyle(srcCell.border) as ExcelJS.Borders;
        if (srcCell.alignment) dstCell.alignment = cloneStyle(srcCell.alignment);
        if (srcCell.numFmt) dstCell.numFmt = srcCell.numFmt;
      }
      // Also shift the header row
      const srcHeader = sheet1.getCell(headerRowNum, col);
      const dstHeader = sheet1.getCell(headerRowNum, col + 1);
      dstHeader.style = cloneStyle(dstHeader.style);
      if (cleanText(srcHeader.value)) {
        dstHeader.value = srcHeader.value;
        if (srcHeader.fill) dstHeader.fill = cloneStyle(srcHeader.fill);
        if (srcHeader.font) dstHeader.font = cloneStyle(srcHeader.font);
        if (srcHeader.border) dstHeader.border = cloneStyle(srcHeader.border) as ExcelJS.Borders;
        if (srcHeader.alignment) dstHeader.alignment = cloneStyle(srcHeader.alignment);
      }
    }
  }

  // Write "Trial-N" header at insertCol if blank
  // Python's ensure_trial_header always uses `col - 1` literally (not
  // relative to start_col), so match that exactly for fidelity.
  const headerCell = sheet1.getCell(headerRowNum, insertCol);
  if (!cleanText(headerCell.value)) {
    headerCell.style = cloneStyle(headerCell.style);
    headerCell.value = `Trial-${insertCol - 1}`;
    headerCell.fill = cloneStyle(YELLOW_FILL);
    headerCell.font = cloneStyle(BLACK_BOLD_FONT);
    headerCell.border = cloneStyle(THIN_BORDER) as ExcelJS.Borders;
    headerCell.alignment = cloneStyle(CENTER_ALIGN);
  }

  return insertCol;
}

// ---- Sheet3: bad locos split by company (multi-date) ----
function rebuildSheet3MultiDate(
  wb: ExcelJS.Workbook,
  locoResults: LocoResults,
  companyMap: Map<string, string>
): void {
  const existing = wb.getWorksheet("Sheet3");
  if (existing) wb.removeWorksheet(existing.id);
  const sheet = wb.addWorksheet("Sheet3");

  sheet.mergeCells("A1:D1");
  const a1 = sheet.getCell("A1");
  a1.value = "MEDHA";
  a1.font = BLACK_BOLD_FONT;
  a1.alignment = CENTER_ALIGN;

  sheet.mergeCells("F1:I1");
  const f1 = sheet.getCell("F1");
  f1.value = "OTHER FIRMS";
  f1.font = BLACK_BOLD_FONT;
  f1.alignment = CENTER_ALIGN;

  const subHeaders = ["LOCO ID", "date", "company", "section"];
  for (const startCol of [1, 6]) {
    for (let offset = 0; offset < subHeaders.length; offset++) {
      const cell = sheet.getCell(2, startCol + offset);
      cell.value = subHeaders[offset];
      cell.fill = HEADER_FILL;
      cell.font = BLACK_BOLD_FONT;
      cell.border = THIN_BORDER as ExcelJS.Borders;
      cell.alignment = CENTER_ALIGN;
    }
  }

  let medhaRow = 3;
  let otherRow = 3;

  const sortedLocos = [...locoResults.keys()].sort(
    (a, b) => locoSortKey(a) - locoSortKey(b)
  );

  for (const loco of sortedLocos) {
    const company = companyMap.get(loco) ?? "";
    const isMedha = company.trim().toUpperCase() === "MEDHA";
    const dateMap = locoResults.get(loco)!;

    // Sort dates chronologically
    const sortedDates = [...dateMap.keys()].sort(
      (a, b) => parseDDMMYY(a).getTime() - parseDDMMYY(b).getTime()
    );

    for (const dateText of sortedDates) {
      const { isBad, badSections } = dateMap.get(dateText)!;
      if (!isBad) continue;

      const sortedSections = [...badSections].sort();
      for (const sectionName of sortedSections) {

        const row = isMedha ? medhaRow : otherRow;
        const startCol = isMedha ? 1 : 6;
        if (isMedha) medhaRow++;
        else otherRow++;

        const values = [loco, dateText, company, sectionName];
        for (let offset = 0; offset < values.length; offset++) {
          const cell = sheet.getCell(row, startCol + offset);
          cell.value = values[offset];
          cell.border = THIN_BORDER as ExcelJS.Borders;
          cell.font = NORMAL_FONT;
          cell.alignment = CENTER_ALIGN;
        }
        setResultCell(sheet.getCell(row, startCol + 1), dateText, true);
      }
    }
  }

  for (let c = 1; c <= 9; c++) {
    sheet.getColumn(c).width = c === 5 ? 3 : 14;
  }
}

// ---- Force Arial across the whole output workbook ----
// Cells the code writes itself already use Arial (see the style constants
// above), but cells copied verbatim from the uploaded Master Roster, or
// left untouched, keep whatever font that source file had. This pass runs
// last and rewrites every cell's font family to Arial, on every sheet,
// while preserving each cell's existing size/bold/italic/color/underline —
// so formatting intent survives, only the typeface changes.
function enforceArialFont(wb: ExcelJS.Workbook): void {
  for (const sheet of wb.worksheets) {
    sheet.eachRow({ includeEmpty: false }, (row) => {
      row.eachCell({ includeEmpty: false }, (cell) => {
        const existing = cell.font;
        cell.font = {
          ...cloneStyle(existing ?? {}),
          name: "Arial",
        };
      });
    });
  }
}

// ---- Main processing entry point ----
// Date is no longer a parameter — it is auto-extracted from section files.
export async function processNms(
  masterBuffer: Buffer,
  companyBuffer: Buffer,
  sectionFiles: SectionFileInput[]
): Promise<{ result: NmsProcessResult; outputBuffer: Buffer }> {
  const companyMap = readCompanyMapFromBuffer(companyBuffer);
  const { locoResults, allLocos, skippedFiles, ignoredGroupsCount, unmappedStations } =
    readSectionFilesFromBuffers(sectionFiles);

  const wb = new ExcelJS.Workbook();
  const masterArrayBuffer = masterBuffer.buffer.slice(
    masterBuffer.byteOffset,
    masterBuffer.byteOffset + masterBuffer.byteLength
  ) as ArrayBuffer;
  try {
    await wb.xlsx.load(masterArrayBuffer);
  } catch (err) {
    throw new Error(
      `Master Excel Roster could not be read as a .xlsx file. This usually means it's actually an old .xls file (or another format) saved with a .xlsx name, or the file got corrupted during upload. Open it in Excel and use "Save As" → "Excel Workbook (.xlsx)", then re-upload. (${
        err instanceof Error ? err.message : String(err)
      })`
    );
  }

  const sheet1 = wb.getWorksheet("Sheet1") ?? wb.worksheets[0];

  let headerRowNum = 1;
  let locoColNum = 1;

  for (let r = 1; r <= Math.min(sheet1.rowCount, 20); r++) {
    const row = sheet1.getRow(r);
    const cellValues: unknown[] = [];
    row.eachCell({ includeEmpty: true }, (cell, colNum) => {
      cellValues[colNum - 1] = cell.value;
    });
    const lc = findColumn(cellValues, ["locoid", "loco"]);
    if (lc !== null) {
      headerRowNum = r;
      locoColNum = lc + 1;
      break;
    }
  }

  // Build loco → row-number map
  const locoRowMap = new Map<string, number>();
  for (let r = headerRowNum + 1; r <= sheet1.rowCount; r++) {
    const loco = normalizeLoco(sheet1.getCell(r, locoColNum).value);
    if (loco) locoRowMap.set(loco, r);
  }

  // Ensure Sheet2
  let sheet2 = wb.getWorksheet("Sheet2");
  if (!sheet2) {
    if (wb.worksheets.length >= 2) {
      sheet2 = wb.worksheets[1];
      sheet2.name = "Sheet2";
    } else {
      sheet2 = wb.addWorksheet("Sheet2");
    }
  }

  const s2Headers = ["LOCO ID", "date", "company"];
  for (let c = 1; c <= 3; c++) {
    const cell = sheet2.getCell(1, c);
    cell.style = cloneStyle(cell.style);
    if (!cleanText(cell.value)) cell.value = s2Headers[c - 1];
    cell.fill = cloneStyle(HEADER_FILL);
    cell.font = cloneStyle(BLACK_BOLD_FONT);
    cell.border = cloneStyle(THIN_BORDER) as ExcelJS.Borders;
    cell.alignment = cloneStyle(CENTER_ALIGN);
  }

  // Process each loco across all its dates (sorted chronologically)
  const sortedLocos = [...allLocos].sort(
    (a, b) => locoSortKey(a) - locoSortKey(b)
  );

  let totalTrials = 0;

  for (const loco of sortedLocos) {
    const dateMap = locoResults.get(loco);
    if (!dateMap) continue;

    const sortedDates = [...dateMap.keys()].sort(
      (a, b) => parseDDMMYY(a).getTime() - parseDDMMYY(b).getTime()
    );

    const locoRow = locoRowMap.get(loco);

    for (const dateText of sortedDates) {
      const { isBad } = dateMap.get(dateText)!;
      totalTrials++;

      if (locoRow !== undefined) {
        // Insert date in chronological order
        const targetCol = insertDateInOrder(
          sheet1,
          locoRow,
          headerRowNum,
          dateText,
          locoColNum + 1
        );

        // Copy style from the previous trial cell if available
        if (targetCol > locoColNum + 1) {
          const prevCell = sheet1.getCell(locoRow, targetCol - 1);
          const prevIsMergeSlave =
            prevCell.isMerged &&
            (prevCell.type as number) === (ExcelJS.ValueType.Merge as number);
          if (!prevIsMergeSlave) {
            const targetCell = sheet1.getCell(locoRow, targetCol);
            targetCell.style = cloneStyle(targetCell.style);
            if (prevCell.font) targetCell.font = cloneStyle(prevCell.font);
            if (prevCell.border)
              targetCell.border = cloneStyle(prevCell.border) as ExcelJS.Borders;
            if (prevCell.alignment)
              targetCell.alignment = cloneStyle(prevCell.alignment);
            if (prevCell.numFmt) targetCell.numFmt = prevCell.numFmt;
          }
        }

        setResultCell(sheet1.getCell(locoRow, targetCol), dateText, isBad);
      } else {
        addSheet2Row(
          sheet2,
          loco,
          dateText,
          companyMap.get(loco) ?? "",
          isBad
        );
      }
    }
  }

  rebuildSheet3MultiDate(wb, locoResults, companyMap);

  enforceArialFont(wb);

  const buf = await wb.xlsx.writeBuffer();

  // Count bad locos across all dates
  let badLocosCount = 0;
  for (const [, dateMap] of locoResults) {
    for (const [, { isBad }] of dateMap) {
      if (isBad) {
        badLocosCount++;
        break; // count each loco once
      }
    }
  }

  return {
    result: {
      eligibleLocos: allLocos.size,
      badLocos: badLocosCount,
      totalTrials,
      skippedFiles,
      ignoredGroupsCount,
      unmappedStations,
    },
    outputBuffer: Buffer.from(buf as ArrayBuffer),
  };
}
