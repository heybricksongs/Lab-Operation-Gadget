const { google } = require("googleapis");
const axios = require("axios");


// Wikiの添付ファイルを確認し、存在しない場合はGoogle Driveからアップロード
async function imageupload({ pageUrl, imageName, headers, auth, apiToken }) {
  let fileExists = false;
  let statusText = "不明";
try{
  try {
    // Wikiにファイルが存在するか確認
    await axios.get(`${pageUrl}/attachment/${encodeURIComponent(imageName)}`, { headers });
    fileExists = true;
    statusText = "既存";
    console.log(`ジャケット添付を確認したよ`);
  } catch (fileError) {
    if (fileError.response && fileError.response.status === 404) {
      fileExists = false;
      console.log(`ジャケット添付なし。新規アップロードを実行するよ`);
    } else {
      throw fileError;
    }
  }

  if (!fileExists) {
    // ドライブにファイルが置いてあるか検索
    const drive = google.drive({ version: 'v3', auth });
    const folderId = process.env.DRIVE_ID;
    const escapedImageName = imageName.replace(/'/g, "\\'");
    const driveRes = await drive.files.list({
      q: `name = '${escapedImageName}' and '${folderId}' in parents and trashed = false`,
      fields: 'files(id, name)'
    });

  if (driveRes.data.files.length > 0) {
      // ドライブからファイル取得
      const fileId = driveRes.data.files[0].id;
      const imgRes = await drive.files.get(
        { fileId, alt: 'media' },
        { responseType: 'arraybuffer' }
      );

      // Wikiへアップロード
      await axios.put(`${pageUrl}/attachment`, {
        filename: imageName,
        data: Buffer.from(imgRes.data).toString('base64')
      }, {
        headers: {
          'Authorization': `Bearer ${apiToken}`,
          'Content-Type': 'application/json'
        }
      });

      statusText = "新規";
      console.log(`${imageName} のアップロードできた`);
    } else {
      statusText = "画像無し";
      console.log('\x1b[31m%s\x1b[0m', '⚠️ Google Driveにジャケットがないよ');
    }
    }
    return { statusText };
} catch (error) {
    if (error.response) {
      console.error("Server Error Data:", error.response.data);
    }
    console.error("Error Message:", error.message);
    return { statusText: "エラー" };
}
}

module.exports = { imageupload };