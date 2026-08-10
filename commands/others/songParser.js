function parseSongData(targetRow, albumRows) {
  // Extract all fields
  const songTitle = targetRow._rawData[0]; //正規曲名
  const TABLESONGNAME = (songTitle || "").replaceAll('|', '&#124;');
  const COMPOSER = targetRow._rawData[1] || "";
  const GENRE = targetRow._rawData[2] || "";
  const BPM = targetRow._rawData[3] || "";
  const ILL = targetRow._rawData[4] || "";
  const LEN = targetRow._rawData[5] || "";
  
  const DETCC = targetRow._rawData[6] || "";
  const DETNT = targetRow._rawData[7] || "";
  const DETCT = (targetRow._rawData[8] || "").replaceAll('|', '&#124;');
  
  const IVDCC = targetRow._rawData[9] || "";
  const IVDNT = targetRow._rawData[10] || "";
  const IVDCT = (targetRow._rawData[11] || "").replaceAll('|', '&#124;');
  
  const MSVCC = targetRow._rawData[12] || "";
  const MSVNT = targetRow._rawData[13] || "";
  const MSVCT = (targetRow._rawData[14] || "").replaceAll('|', '&#124;');
  
  const RBTCC = (targetRow._rawData[15] || "").replaceAll('|', '&#124;');
  const RBTNT = targetRow._rawData[16] || "";
  const RBTCT = (targetRow._rawData[17] || "").replaceAll('|', '&#124;');
  
  const CTCLV = targetRow._rawData[18] || "";
  const CTCNT = targetRow._rawData[19] || "";
  const CTCCT = (targetRow._rawData[20] || "").replaceAll('|', '&#124;');
  
  const ALBUM = targetRow._rawData[21] || "";
  const VERSION_RAW = targetRow._rawData[22] || "";
  const ORIGINAL = targetRow._rawData[23] || "";
  const OTHER = targetRow._rawData[24] || "";
  
  // Page Title Conversion
  const replaceMap = { '#': '＃', '&': '＆', '"': '”', '<': '＜', '>': '＞', '[': '［', ']': '］', '/': '／', ':': '：', ',': '，' };
  let pageTitle = songTitle.replace(/[#&"<>\[\]\/:, ]/g, m => replaceMap[m] || m);
  
  // Image Name Conversion
  const replaceMap2 = {'\\': '＼', '/': '／', ':': '：', '*': '＊', '?': '？', '"': '”', '<': '＜', '>': '＞', '|': '｜', ',': '，' };
  let safeImageName = songTitle.replace(/[\\/:,*?"<>|]/g, m => replaceMap2[m]);
  
  // Exceptions
  if (songTitle === "OMG") {
    if (COMPOSER === "Halv") {
      safeImageName = "OMG(H)";
    } else {
      safeImageName = "OMG(T)";
      pageTitle = "OMG【TAKUMI3】";
    }
  } else if (songTitle === "Alexandrite") {
    if (COMPOSER === "onoken") {
      safeImageName = "Alexandrite(C)";
      pageTitle = "Alexandrite【cytusII】";
    } else {
      safeImageName = "Alexandrite(A)";
    }
  } else if (songTitle === "Cipher:/2&//<|0") {
    safeImageName = "CipherVIRUS";
    pageTitle = "CipherVIRUS";
  } else if (songTitle === "恶修女——永火熔铸 (feat. 黑泽诺亚NOIR)") {
    safeImageName = "恶修女——永火熔铸";
  }
  
  const TCF = (pageTitle !== songTitle);
  const imageName = `${safeImageName}.webp`;
  
  // Level Calculation
  const calcLevel = (ccValue) => {
    const cc = Number(ccValue);
    if (isNaN(cc) || ccValue === "" || ccValue === null) return '?';
    const int = Math.floor(cc);
    return (cc >= 13.0 && (cc % 1).toFixed(1) >= 0.6) ? `${int}+` : `${int}`;
  };
  
  const calcLevelForGenerate = (ccValue) => {
    const cc = Number(ccValue);
    if (isNaN(cc) || ccValue === "" || ccValue === null) return '?';
    const int = Math.floor(cc);
    let levelText = (cc >= 13.0 && (cc % 1).toFixed(1) >= 0.6) ? `${int}+` : `${int}`;
    if (cc >= 17.0) {
      return `&color(red,yellow){''${levelText}''};`;
    } else if (cc >= 16.6) {
      return `&color(,yellow){''${levelText}''};`;
    } else if (cc >= 16.0) {
      return `''${levelText}''`;
    }
    return levelText;
  };
  
  const DETLV = calcLevel(DETCC);
  const IVDLV = calcLevel(IVDCC);
  const MSVLV = calcLevel(MSVCC);
  const RBTLV = RBTCC ? calcLevel(RBTCC) : "-";
  
  const genDETLV = calcLevelForGenerate(DETCC);
  const genIVDLV = calcLevelForGenerate(IVDCC);
  const genMSVLV = calcLevelForGenerate(MSVCC);
  const genRBTLV = RBTCC ? calcLevelForGenerate(RBTCC) : "-";
  
  // Album Info
  let CAPTION = "", COLORCODE = "", ANCHOR = "", CRYSTAL = "", INCLUDEDALBUM = "";
  if (albumRows) {
    const albumRow = albumRows.find(r => r._rawData[0] === ALBUM);
    if (albumRow) {
      CAPTION = albumRow._rawData[1] || "";
      COLORCODE = albumRow._rawData[2] || "";
      ANCHOR = albumRow._rawData[3] || "";
      CRYSTAL = albumRow._rawData[4] || "";
      INCLUDEDALBUM = `${CAPTION}  &color(#${COLORCODE}){${ALBUM}};>アルバム順#${ANCHOR}`;
    }
  }
  
  // Unlock Text
  let UNLOCK = "";
  const sOTHER = String(OTHER || "");
  
  if (sOTHER === 'TOP') {
    UNLOCK = '上記で解説';
  } else if (COLORCODE === '1a92bb') {
    if (sOTHER.includes('/')) {
      const STORYparts = sOTHER.split('/').map(s => s.trim());
      const STORYpartsA = STORYparts[0];
      const STORYpartsB = STORYparts[1];
      if (STORYpartsA.startsWith('P')) {
        UNLOCK = `${CAPTION.replaceAll(':', '')}(Part ${STORYpartsA[1]})の探索レベルが${STORYpartsB}に到達`;
      } else {
        UNLOCK = `${CAPTION.replaceAll(':', '')}の探索レベルが${STORYpartsA}に到達/データ粒子&color(darkorange){${STORYpartsB}};と交換`;
      }
    } else if (/^\d+(\.\d+)?$/.test(sOTHER)) {
      UNLOCK = `${CAPTION.replaceAll(':', '')}の探索レベルが${OTHER}に到達`;
    } else {
      UNLOCK = OTHER;
    }
  } else if (ALBUM === 'カオス信号(結晶)') {
    UNLOCK = `活性結晶&color(deepskyblue){${CRYSTAL}};で購入`;
  } else if (sOTHER === '-') {
    UNLOCK = `活性結晶&color(deepskyblue){${CRYSTAL}};でアルバム「&color(#${COLORCODE}){${ALBUM}};」を購入`;
  } else if (sOTHER.startsWith('V')) {
    const volCRYSTAL = (CRYSTAL || "").split('/').map(s => s.trim());
    UNLOCK = `活性結晶&color(deepskyblue){${volCRYSTAL[sOTHER[1]-1]}};でアルバム「&color(#${COLORCODE}){${ALBUM} vol.${sOTHER[1]}};」を購入`;
  } else if (sOTHER.startsWith('P')) {
    const volCRYSTAL = (CRYSTAL || "").split('/').map(s => s.trim());
    const index = sOTHER[1] === 'A' ? 0 : 1;
    UNLOCK = `活性結晶&color(deepskyblue){${volCRYSTAL[index] || volCRYSTAL[0]}};でアルバム「&color(#${COLORCODE}){${ALBUM} Phase.${sOTHER[1]}};」を購入`;
  } else if (ALBUM === '迷いの旅') {
    UNLOCK = `合計探索レベルが${sOTHER}に到達`;
  } else if (/^\d+?$/.test(sOTHER)) {
    UNLOCK = `SHOPでデータ粒子&color(darkorange){''${sOTHER}''};と交換`;
  } else {
    UNLOCK = OTHER;
  }
  
  // Version Split
  const splitVersion = (versionStr) => {
    const parts = (versionStr || "").split(',').map(s => s.trim());
    return {
      VERSIONA: parts[0] || "",
      VERSIONB: parts[1] || "",
      VERSIONC: parts[2] || ""
    };
  };
  const { VERSIONA, VERSIONB, VERSIONC } = splitVersion(VERSION_RAW);
  
  // Table Generate Specific Version logic (remove parens)
  let cleanVERSION = VERSION_RAW;
  if (cleanVERSION.includes('(')) {
    const p = cleanVERSION.split('(');
    cleanVERSION = p.pop().replace(')', '');
  }

  // Original Color Code for tablegenerate
  let ORI = "";
  if(ORIGINAL === "Original") ORI = "BGCOLOR(darkorange):";
  else if(ORIGINAL === "Collab" || ORIGINAL === "Original.Ver") ORI = "BGCOLOR(darkblue):";

  return {
    songTitle, TABLESONGNAME, COMPOSER, GENRE, BPM, ILL, LEN, 
    DETCC, DETNT, DETCT, IVDCC, IVDNT, IVDCT, MSVCC, MSVNT, MSVCT, 
    RBTCC, RBTNT, RBTCT, CTCLV, CTCNT, CTCCT, 
    ALBUM, VERSION_RAW, ORIGINAL, OTHER,
    pageTitle, safeImageName, imageName, TCF,
    DETLV, IVDLV, MSVLV, RBTLV,
    genDETLV, genIVDLV, genMSVLV, genRBTLV,
    CAPTION, COLORCODE, ANCHOR, CRYSTAL, INCLUDEDALBUM,
    UNLOCK,
    VERSIONA, VERSIONB, VERSIONC, cleanVERSION, ORI
  };
}

module.exports = { parseSongData };
