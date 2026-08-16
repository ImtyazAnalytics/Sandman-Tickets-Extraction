const SHEET_NAME = "Tickets";

/*
  Sandman Services → Google Sheets receiver.

  SETUP:
  1. Create a Google Sheet.
  2. Extensions → Apps Script.
  3. Paste this entire file.
  4. Set SHEETS_SECRET below to the SAME random secret that you will
     store in Vercel as GOOGLE_SHEETS_SECRET.
  5. Deploy → New deployment → Web app.
  6. Execute as: Me
  7. Who has access: Anyone
  8. Copy the Web App URL and save it in Vercel as GOOGLE_SHEETS_WEBAPP_URL.
*/

const SHEETS_SECRET = "REPLACE_WITH_YOUR_LONG_RANDOM_SECRET";

const HEADERS = [
  "Date",
  "Ticket #",
  "Shipper",
  "Customer",
  "Job #",
  "From",
  "Location",
  "Truck #",
  "Pit/Dump Vendor",
  "Pit Ticket #",
  "Driver",
  "Time Start",
  "Time Quit",
  "Time Type",
  "Material Type",
  "Quantity"
];

function doPost(e) {
  try {
    const body = JSON.parse(e.postData.contents || "{}");

    if (!body.secret || body.secret !== SHEETS_SECRET) {
      return jsonResponse({
        ok: false,
        error: "Unauthorized"
      });
    }

    const tickets = Array.isArray(body.tickets) ? body.tickets : [];
    if (!tickets.length) {
      return jsonResponse({
        ok: false,
        error: "No tickets received"
      });
    }

    const ss = SpreadsheetApp.getActiveSpreadsheet();
    let sheet = ss.getSheetByName(SHEET_NAME);

    if (!sheet) {
      sheet = ss.insertSheet(SHEET_NAME);
    }

    ensureHeaders(sheet);

    // Ticket # is column B and is treated as the duplicate key.
    const lastRow = sheet.getLastRow();
    const existingTickets = new Set();

    if (lastRow >= 2) {
      const values = sheet.getRange(2, 2, lastRow - 1, 1).getDisplayValues();
      values.forEach(r => {
        const ticket = normalizeTicketNumber(r[0]);
        if (ticket) existingTickets.add(ticket);
      });
    }

    const rowsToAdd = [];
    let duplicates = 0;

    tickets.forEach(ticket => {
      const ticketNo = normalizeTicketNumber(ticket["Ticket #"]);

      // Only run duplicate protection when Ticket # is present.
      if (ticketNo && existingTickets.has(ticketNo)) {
        duplicates++;
        return;
      }

      if (ticketNo) existingTickets.add(ticketNo);

      rowsToAdd.push(HEADERS.map(header => {
        const value = ticket[header];
        return value === null || value === undefined ? "" : String(value);
      }));
    });

    if (rowsToAdd.length) {
      sheet.getRange(
        sheet.getLastRow() + 1,
        1,
        rowsToAdd.length,
        HEADERS.length
      ).setValues(rowsToAdd);

      formatSheet(sheet);
    }

    return jsonResponse({
      ok: true,
      added: rowsToAdd.length,
      duplicates: duplicates
    });

  } catch (err) {
    return jsonResponse({
      ok: false,
      error: String(err && err.message ? err.message : err)
    });
  }
}

function ensureHeaders(sheet) {
  const current = sheet.getRange(1, 1, 1, HEADERS.length).getDisplayValues()[0];
  const correct = HEADERS.every((h, i) => current[i] === h);

  if (!correct) {
    sheet.getRange(1, 1, 1, HEADERS.length).setValues([HEADERS]);
    sheet.setFrozenRows(1);
  }
}

function formatSheet(sheet) {
  sheet.setFrozenRows(1);

  const header = sheet.getRange(1, 1, 1, HEADERS.length);
  header.setFontWeight("bold");
  header.setBackground("#17365D");
  header.setFontColor("#FFFFFF");
  header.setHorizontalAlignment("center");

  sheet.autoResizeColumns(1, HEADERS.length);

  // Keep identifier columns as plain text so leading zeros remain intact.
  const maxRows = Math.max(sheet.getLastRow() - 1, 1);
  sheet.getRange(2, 2, maxRows, 1).setNumberFormat("@");  // Ticket #
  sheet.getRange(2, 8, maxRows, 1).setNumberFormat("@");  // Truck #
  sheet.getRange(2, 10, maxRows, 1).setNumberFormat("@"); // Pit Ticket #
}

function normalizeTicketNumber(value) {
  return String(value || "").trim().toUpperCase();
}

function jsonResponse(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
