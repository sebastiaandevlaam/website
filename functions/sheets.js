// Google Sheets access shared by the donation and Operation Mitten writers.

function getSheetsClient() {
  const { google } = require('googleapis');
  const auth = new google.auth.GoogleAuth({
    credentials: JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON),
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });
  return google.sheets({ version: 'v4', auth });
}

async function appendSheetRows(sheets, spreadsheetId, rows) {
  const result = await sheets.spreadsheets.values.append({
    spreadsheetId,
    range: 'Sheet1!A1',
    valueInputOption: 'RAW',
    insertDataOption: 'INSERT_ROWS',
    requestBody: { values: rows },
  });

  // Formatting is cosmetic — a failure here must never cost us a submission
  // that is already safely in the sheet.
  try {
    await unboldRows(sheets, spreadsheetId, result.data.updates?.updatedRange);
  } catch (err) {
    console.error('Sheet formatting error (row was still written):', err);
  }

  return result;
}

// Sheets copies formatting from the row above when appending, so a bold
// header row makes row 2 bold, row 3 inherits from row 2, and every future
// row is bold forever. Clearing bold on what we just wrote breaks that chain
// at the first link, which also leaves the next append inheriting from a
// plain row.
async function unboldRows(sheets, spreadsheetId, updatedRange) {
  if (!updatedRange) return;

  // "Sheet1!A5:X6" -> rows 5..6. Titles may be quoted and contain '!', so
  // split on the last one.
  const a1 = updatedRange.slice(updatedRange.lastIndexOf('!') + 1);
  const rowNumbers = a1.match(/\d+/g);
  if (!rowNumbers || rowNumbers.length === 0) return;

  const firstRow = Number(rowNumbers[0]);
  const lastRow = Number(rowNumbers[rowNumbers.length - 1]);
  const sheetId = await getSheetGridId(sheets, spreadsheetId);

  await sheets.spreadsheets.batchUpdate({
    spreadsheetId,
    requestBody: {
      requests: [{
        repeatCell: {
          // Half-open and zero-based, so row 5 is index 4.
          range: { sheetId, startRowIndex: firstRow - 1, endRowIndex: lastRow },
          cell: { userEnteredFormat: { textFormat: { bold: false } } },
          fields: 'userEnteredFormat.textFormat.bold',
        },
      }],
    },
  });
}

// batchUpdate addresses tabs by numeric id, not name. Cached because a warm
// function instance writes many rows and the id never changes.
const sheetGridIds = new Map();
async function getSheetGridId(sheets, spreadsheetId, title = 'Sheet1') {
  const key = `${spreadsheetId}:${title}`;
  if (sheetGridIds.has(key)) return sheetGridIds.get(key);

  const meta = await sheets.spreadsheets.get({
    spreadsheetId,
    fields: 'sheets(properties(sheetId,title))',
  });
  const match = meta.data.sheets?.find(sheet => sheet.properties?.title === title);
  const gridId = match?.properties?.sheetId ?? 0;

  sheetGridIds.set(key, gridId);
  return gridId;
}

// 1 -> 'A', 19 -> 'S', 27 -> 'AA'
function columnLetter(index) {
  let letters = '';
  while (index > 0) {
    const remainder = (index - 1) % 26;
    letters = String.fromCharCode(65 + remainder) + letters;
    index = Math.floor((index - 1) / 26);
  }
  return letters;
}

// Writes the header row once if the sheet is still empty, so the first
// submission doesn't land in row 1 without column titles.
async function ensureHeaderRow(sheets, spreadsheetId, header) {
  const lastColumn = columnLetter(header.length);
  const existing = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: `Sheet1!A1:${lastColumn}1`,
  });
  if (!existing.data.values || existing.data.values.length === 0) {
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: 'Sheet1!A1',
      valueInputOption: 'RAW',
      requestBody: { values: [header] },
    });

    // Cosmetic, so never let it break the write that matters.
    try {
      await styleHeaderRow(sheets, spreadsheetId);
    } catch (err) {
      console.error('Header styling error (header was still written):', err);
    }
  }
}

// Bolds and freezes row 1 on a sheet we just created the header for, so a new
// sheet arrives readable without anyone styling it by hand. Existing sheets
// keep whatever styling they already have.
async function styleHeaderRow(sheets, spreadsheetId) {
  const sheetId = await getSheetGridId(sheets, spreadsheetId);
  await sheets.spreadsheets.batchUpdate({
    spreadsheetId,
    requestBody: {
      requests: [
        {
          repeatCell: {
            range: { sheetId, startRowIndex: 0, endRowIndex: 1 },
            cell: { userEnteredFormat: { textFormat: { bold: true } } },
            fields: 'userEnteredFormat.textFormat.bold',
          },
        },
        {
          updateSheetProperties: {
            properties: { sheetId, gridProperties: { frozenRowCount: 1 } },
            fields: 'gridProperties.frozenRowCount',
          },
        },
      ],
    },
  });
}

module.exports = {
  getSheetsClient,
  appendSheetRows,
  ensureHeaderRow,
  columnLetter,
  getSheetGridId,
  unboldRows,
};
