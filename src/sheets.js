const { GoogleSpreadsheet } = require("google-spreadsheet");
const { HEADER_BG, HEADER_FG } = require("./config");

function getGoogleCredsFromEnv() {
  const b64 = process.env.GOOGLE_CREDS_B64;
  if (!b64) {
    throw new Error("Missing env GOOGLE_CREDS_B64 (base64 of credentials.json).");
  }

  const creds = JSON.parse(Buffer.from(b64, "base64").toString("utf8"));

  if (typeof creds.private_key === "string") {
    creds.private_key = creds.private_key.replace(/\\n/g, "\n");
  }

  return creds;
}

async function getSheet(title, headers) {
  const doc = new GoogleSpreadsheet(process.env.SHEET_ID);
  const creds = getGoogleCredsFromEnv();

  await doc.useServiceAccountAuth({
    client_email: creds.client_email,
    private_key: creds.private_key,
  });
  await doc.loadInfo();

  let sheet = doc.sheetsByTitle[title];

  if (!sheet) {
    sheet = await doc.addSheet({ title, headerValues: headers });
  } else {
    await sheet.loadHeaderRow();
    const hasExpectedHeaders = sheet.headerValues?.join("|") === headers.join("|");
    if (!hasExpectedHeaders) await sheet.setHeaderRow(headers);
  }

  const lastColLetter = String.fromCharCode(65 + headers.length - 1);
  await sheet.loadCells(`A1:${lastColLetter}1`);

  for (let i = 0; i < headers.length; i++) {
    const cell = sheet.getCell(0, i);
    cell.textFormat = { foregroundColor: HEADER_FG, bold: true };
    cell.backgroundColor = HEADER_BG;
    cell.horizontalAlignment = "CENTER";
  }

  await sheet.saveUpdatedCells();
  return sheet;
}

module.exports = {
  getSheet,
};
