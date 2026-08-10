require('dotenv').config({ quiet: true });
const { GoogleSpreadsheet } = require("google-spreadsheet");
const { JWT } = require("google-auth-library");
const axios = require("axios");
const CREDS = require("../../api-key.json"); 

async function getSpreadsheetAuth() {
  return new JWT({
    email: CREDS.client_email,
    key: CREDS.private_key,
    scopes: [
      'https://www.googleapis.com/auth/spreadsheets',
      'https://www.googleapis.com/auth/drive.readonly'
    ],
  });
}

async function getSpreadsheetDoc() {
  const auth = await getSpreadsheetAuth();
  const doc = new GoogleSpreadsheet(process.env.SPREADSHEET_ID, auth);
  await doc.loadInfo();
  return { doc, auth };
}

async function getWikiAuthRes() {
  const wikiName = process.env.WIKI_NAME;
  const authRes = await axios.post(`https://api.wikiwiki.jp/${wikiName}/auth`, {
    api_key_id: process.env.WIKI_ID,
    secret: process.env.WIKI_SECRET
  });
  if (authRes.data.status !== 'ok') {
    throw new Error('Wiki API authentication failed');
  }
  return authRes;
}

module.exports = {
  getSpreadsheetAuth,
  getSpreadsheetDoc,
  getWikiAuthRes
};
