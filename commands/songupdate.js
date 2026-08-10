const { SlashCommandBuilder } = require("discord.js");
const axios = require("axios");
const { getSpreadsheetDoc, getWikiAuthRes } = require("./others/api.js");
const { parseSongData } = require("./others/songParser.js");
const { imageupload } = require("./others/imageupload.js");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("songupdate")
    .setDescription("シートの行番号からWikiの該当ページを更新するよ")
    .addStringOption(opt => opt.setName('rows').setDescription('行番号(入力方法: 1,3,15 or 3-8)').setRequired(true)),

  async execute(interaction) {
    // 処理開始の応答を送信 (タイムアウト防止)
    await interaction.deferReply();
    const input = interaction.options.getString('rows');
    let rowNumbers = [];

    // 入力された行番号の形式を判定して配列化
    if (input.includes('-')) {
      const [start, end] = input.split('-').map(Number);
      for (let i = start; i <= end; i++) rowNumbers.push(i);
    } else {
      rowNumbers = input.split(',').map(s => Number(s.trim()));
    }

    try {
      // スプレッドシートとWiki APIの認証情報を取得
      const { doc, auth } = await getSpreadsheetDoc();
      const authRes = await getWikiAuthRes();
      console.log(`認証完了`);

      // 楽曲データ用とアルバムデータ用のシートを取得
      const sheet = doc.sheetsByIndex[0];
      const rows = await sheet.getRows();
      const albumSheet = doc.sheetsByIndex[1];
      const albumRows = await albumSheet.getRows();

      const results = [];
      const apiToken = authRes.data.token;
      const headers = { 'Authorization': `Bearer ${apiToken}`, 'Content-Type': 'application/json' };
      const wikiName = process.env.WIKI_NAME;

      // 指定された行の数だけループしてWiki更新処理を実行
      for (const rowNumber of rowNumbers) {
        let currentSongTitle = "不明";
        try {
          // 対象行のデータを取得
          const targetRow = rows[rowNumber - 2];
          if (!targetRow) {
            console.log(`[エラー]${rowNumber}行: ${currentSongTitle} データが見つかりません`);
            results.push(`[エラー]${rowNumber}行: ${currentSongTitle} データが見つかりません`);
            continue;
          }

          // 共通モジュールを使用して楽曲データをパース(抽出・変換)
          const songData = parseSongData(targetRow, albumRows);
          currentSongTitle = songData.songTitle;
          console.log(`[読込]${rowNumber}行: ${currentSongTitle} パース完了`);

          // 現在処理中の楽曲をDiscordに進捗として送信
          await interaction.editReply(`更新中...\n\n【これまでの進捗】\n${results.join('\n')}\n\n 現在処理中: [読込]${rowNumber}行: ${currentSongTitle} ...`);

          // アルバム情報が2枚目のシートに存在しない場合の警告とスキップ
          if (!songData.CAPTION && songData.ALBUM) {
             console.log(`[警告]${rowNumber}行: ${currentSongTitle} アルバム「${songData.ALBUM}」が2枚目のシートに見つかりません`);
             results.push(`[警告]${rowNumber}行: ${currentSongTitle} アルバム「${songData.ALBUM}」が見つかりません`);
             continue; 
          }

          // Wikiから既存のページ情報を取得
          const pageUrl = `https://api.wikiwiki.jp/${wikiName}/page/${encodeURIComponent(songData.pageTitle)}`;
          let pageRes;
          try {
            pageRes = await axios.get(pageUrl, { headers });
          } catch (error) {
            console.log(`[エラー]${rowNumber}行: ${currentSongTitle} Wiki情報取得失敗`);
            results.push(`[エラー]${rowNumber}行: ${currentSongTitle} Wiki情報取得失敗`);
            continue;
          }

          let content = pageRes.data.source;
          
          // 自動更新停止タグが含まれている場合は更新をスキップ
          if (content.includes('//自動更新停止')) {
            console.log(`[スキップ]${rowNumber}行: ${currentSongTitle} 自動更新停止タグを検出`);
            results.push(`[スキップ]${rowNumber}行: ${currentSongTitle} (表:回避)`);
            continue;
          } 
          
          let originalContent = content;
          
          // TITLEタグが未設定の場合に追加
          if (songData.TCF && !content.includes('TITLE:')) {
            content = `TITLE:${songData.songTitle}\n${content}`;
            console.log(`[追加]${rowNumber}行: ${currentSongTitle} TITLEタグを追加`);
          }

          // 現在のWikiページから「いいね数」を抽出して保持
          const voteMatch = content.match(/&vote2\(&#10084;&#65039;\[(\d+)\]/);
          const voteValue = voteMatch ? Number(voteMatch[1]) : 0;
          console.log(`[取得]${rowNumber}行: ${currentSongTitle} いいね数(${voteValue})`);

          let newTable = "";
          let VERSION = songData.VERSION_RAW;

          // RBT譜面とCTC譜面の有無による表組みフォーマットの条件分岐
          if (!songData.RBTCC && !songData.CTCLV) {
            // MSVのノーツデザイナーがDET・IVDと異なるかどうかの判定
            if (!(songData.DETCT == songData.IVDCT && songData.IVDCT == songData.MSVCT)){
              console.log(`[判定]${rowNumber}行: ${currentSongTitle} MSV通常`);
              // 通常の3譜面用フォーマットを生成
              newTable = `|CENTER:60|CENTER:10|CENTER:|CENTER:|CENTER:|c
|>|>|>|>|&attachref(${songData.pageTitle}/${songData.imageName},500x500);|
|>|~ジャンル|>|>|${songData.GENRE}|
|>|>|>|LEFT:~&size(20){${songData.TABLESONGNAME}};|BGCOLOR(#fff8fd):''&color(red){&size(15){&vote2(&#10084;&#65039;[${voteValue}],notimestamp,notitle);};};''|
|>|~アーティスト|>|>|${songData.COMPOSER}|
|>|~イラスト|>|>|${songData.ILL}|
|>|~BPM|>|>|${songData.BPM}|
|>|~演奏時間|>|>|${songData.LEN}|
|>|~難易度|BGCOLOR(#40cafd):&color(white){''[DET]''};|BGCOLOR(#ff6b6c):&color(white){''[IVD]''};|BGCOLOR(#e988ff):&color(white){''[MSV]''};|
|>|~レベル|&color(#40cafd){''${songData.DETLV}''};|&color(#ff6b6c){''${songData.IVDLV}''};|&color(#e988ff){''${songData.MSVLV}''};|
|>|~譜面定数|&color(#40cafd){''${songData.DETCC}''};|&color(#ff6b6c){''${songData.IVDCC}''};|&color(#e988ff){''${songData.MSVCC}''};|
|>|~ノーツ数|&color(#40cafd){''${songData.DETNT}''};|&color(#ff6b6c){''${songData.IVDNT}''};|&color(#e988ff){''${songData.MSVNT}''};|
|~譜面&br;デザイン|BGCOLOR(#40cafd):&color(white){''[DET]''};|>|>|${songData.DETCT}|
|~|BGCOLOR(#ff6b6c):&color(white){''[IVD]''};|>|>|${songData.IVDCT}|
|~|BGCOLOR(#e988ff):&color(white){''[MSV]''};|>|>|${songData.MSVCT}|
|>|~収録アルバム|>|>|[[${songData.INCLUDEDALBUM}]]|
|>|~実装日|>|>|${VERSION}|
|>|~解禁方法|>|>|${songData.UNLOCK}|
`
            } else {
              console.log(`[判定]${rowNumber}行: ${currentSongTitle} MSVALL`);
              // 3譜面すべて同じノーツデザイナーの場合のフォーマットを生成
              newTable = `|CENTER:60|CENTER:10|CENTER:|CENTER:|CENTER:|c
|>|>|>|>|&attachref(${songData.pageTitle}/${songData.imageName},500x500);|
|>|~ジャンル|>|>|${songData.GENRE}|
|>|>|>|LEFT:~&size(20){${songData.TABLESONGNAME}};|BGCOLOR(#fff8fd):''&color(red){&size(15){&vote2(&#10084;&#65039;[${voteValue}],notimestamp,notitle);};};''|
|>|~アーティスト|>|>|${songData.COMPOSER}|
|>|~イラスト|>|>|${songData.ILL}|
|>|~BPM|>|>|${songData.BPM}|
|>|~演奏時間|>|>|${songData.LEN}|
|>|~難易度|BGCOLOR(#40cafd):&color(white){''[DET]''};|BGCOLOR(#ff6b6c):&color(white){''[IVD]''};|BGCOLOR(#e988ff):&color(white){''[MSV]''};|
|>|~レベル|&color(#40cafd){''${songData.DETLV}''};|&color(#ff6b6c){''${songData.IVDLV}''};|&color(#e988ff){''${songData.MSVLV}''};|
|>|~譜面定数|&color(#40cafd){''${songData.DETCC}''};|&color(#ff6b6c){''${songData.IVDCC}''};|&color(#e988ff){''${songData.MSVCC}''};|
|>|~ノーツ数|&color(#40cafd){''${songData.DETNT}''};|&color(#ff6b6c){''${songData.IVDNT}''};|&color(#e988ff){''${songData.MSVNT}''};|
|~譜面&br;デザイン|BGCOLOR(silver):&color(white){''[ALL]''};|>|>|${songData.DETCT}|
|>|~収録アルバム|>|>|[[${songData.INCLUDEDALBUM}]]|
|>|~実装日|>|>|${VERSION}|
|>|~解禁方法|>|>|${songData.UNLOCK}|
`
            }
          } else if (songData.RBTCC && !songData.CTCLV) {
            console.log(`[判定]${rowNumber}行: ${currentSongTitle} RBT`);
            // RBT譜面が存在する場合のフォーマットを生成
            if (songData.VERSIONB) {
               VERSION = `${songData.VERSIONA}|\n|>|~|BGCOLOR(#ff9731):&color(white){''[RBT]''};|>|>|${songData.VERSIONB}`;
            }
            newTable = `|CENTER:60|CENTER:10|CENTER:|CENTER:|CENTER:|CENTER:|c
|>|>|>|>|>|&attachref(${songData.pageTitle}/${songData.imageName},500x500);|
|>|~ジャンル|>|>|>|${songData.GENRE}|
|>|>|>|>|LEFT:~&size(20){${songData.TABLESONGNAME}};|BGCOLOR(#fff8fd):''&color(red){&size(15){&vote2(&#10084;&#65039;[${voteValue}],notimestamp,notitle);};};''|
|>|~アーティスト|>|>|>|${songData.COMPOSER}|
|>|~イラスト|>|>|>|${songData.ILL}|
|>|~BPM|>|>|>|${songData.BPM}|
|>|~演奏時間|>|>|>|${songData.LEN}|
|>|~難易度|BGCOLOR(#40cafd):&color(white){''[DET]''};|BGCOLOR(#ff6b6c):&color(white){''[IVD]''};|BGCOLOR(#e988ff):&color(white){''[MSV]''};|BGCOLOR(#ff9731):&color(white){''[RBT]''};|
|>|~レベル|&color(#40cafd){''${songData.DETLV}''};|&color(#ff6b6c){''${songData.IVDLV}''};|&color(#e988ff){''${songData.MSVLV}''};|&color(#ff9731){''${songData.RBTLV}''};|
|>|~譜面定数|&color(#40cafd){''${songData.DETCC}''};|&color(#ff6b6c){''${songData.IVDCC}''};|&color(#e988ff){''${songData.MSVCC}''};|&color(#ff9731){''${songData.RBTCC}''};|
|>|~ノーツ数|&color(#40cafd){''${songData.DETNT}''};|&color(#ff6b6c){''${songData.IVDNT}''};|&color(#e988ff){''${songData.MSVNT}''};|&color(#ff9731){''${songData.RBTNT}''};|
|~譜面&br;デザイン|BGCOLOR(#40cafd):&color(white){''[DET]''};|>|>|>|${songData.DETCT}|
|~|BGCOLOR(#ff6b6c):&color(white){''[IVD]''};|>|>|>|${songData.IVDCT}|
|~|BGCOLOR(#e988ff):&color(white){''[MSV]''};|>|>|>|${songData.MSVCT}|
|~|BGCOLOR(#ff9731):&color(white){''[RBT]''};|>|>|>|${songData.RBTCT}|
|>|~収録アルバム|>|>|>|[[${songData.INCLUDEDALBUM}]]|
|>|~実装日|>|>|>|${VERSION}|
|>|~解禁方法|>|>|>|${songData.UNLOCK}|
`
          } else if (!songData.RBTCC && songData.CTCLV) {
            console.log(`[判定]${rowNumber}行: ${currentSongTitle} CTC`);
            // CTC譜面が存在する場合のフォーマットを生成
            if (songData.VERSIONB) {
               VERSION = `${songData.VERSIONA}|\n|>|~|BGCOLOR(#c0c0c0):&color(white){''[CTC]''};|>|>|${songData.VERSIONB}`;
            }
            newTable = `|CENTER:60|CENTER:10|CENTER:|CENTER:|CENTER:|CENTER:|c
|>|>|>|>|>|&attachref(${songData.pageTitle}/${songData.imageName},500x500);|
|>|~ジャンル|>|>|>|${songData.GENRE}|
|>|>|>|>|LEFT:~&size(20){${songData.TABLESONGNAME}};|BGCOLOR(#fff8fd):''&color(red){&size(15){&vote2(&#10084;&#65039;[${voteValue}],notimestamp,notitle);};};''|
|>|~アーティスト|>|>|>|${songData.COMPOSER}|
|>|~イラスト|>|>|>|${songData.ILL}|
|>|~BPM|>|>|>|${songData.BPM}|
|>|~演奏時間|>|>|>|${songData.LEN}|
|>|~難易度|BGCOLOR(#40cafd):&color(white){''[DET]''};|BGCOLOR(#ff6b6c):&color(white){''[IVD]''};|BGCOLOR(#e988ff):&color(white){''[MSV]''};|BGCOLOR(#c0c0c0):&color(white){''[CTC]''};|
|>|~レベル|&color(#40cafd){''${songData.DETLV}''};|&color(#ff6b6c){''${songData.IVDLV}''};|&color(#e988ff){''${songData.MSVLV}''};|&color(#c0c0c0){''${songData.CTCLV}''};|
|>|~譜面定数|&color(#40cafd){''${songData.DETCC}''};|&color(#ff6b6c){''${songData.IVDCC}''};|&color(#e988ff){''${songData.MSVCC}''};|&color(#c0c0c0){''-''};|
|>|~ノーツ数|&color(#40cafd){''${songData.DETNT}''};|&color(#ff6b6c){''${songData.IVDNT}''};|&color(#e988ff){''${songData.MSVNT}''};|&color(#c0c0c0){''${songData.CTCNT}''};|
|~譜面&br;デザイン|BGCOLOR(#40cafd):&color(white){''[DET]''};|>|>|>|${songData.DETCT}|
|~|BGCOLOR(#ff6b6c):&color(white){''[IVD]''};|>|>|>|${songData.IVDCT}|
|~|BGCOLOR(#e988ff):&color(white){''[MSV]''};|>|>|>|${songData.MSVCT}|
|~|BGCOLOR(#c0c0c0):&color(white){''[CTC]''};|>|>|>|${songData.CTCCT}|
|>|~収録アルバム|>|>|>|[[${songData.INCLUDEDALBUM}]]|
|>|~実装日|>|>|>|${VERSION}|
|>|~解禁方法|>|>|>|${songData.UNLOCK}|
`
          } else {
            console.log(`[判定]${rowNumber}行: ${currentSongTitle} RBT&CTC`);
            // RBT譜面とCTC譜面の両方が存在する場合のフォーマットを生成
            if (songData.VERSIONB && !songData.VERSIONC) {
              VERSION = `${songData.VERSIONA}|\n|>|~|BGCOLOR(#ff9731):&color(white){''[RBT]''};|>|>|>|${songData.VERSIONB}`;
            } else if (!songData.VERSIONB && songData.VERSIONC) {
              VERSION = `${songData.VERSIONA}|\n|>|~|BGCOLOR(#c0c0c0):&color(white){''[CTC]''};|>|>|>|${songData.VERSIONC}`;
            } else {
              VERSION = `${songData.VERSIONA}|\n|>|~|BGCOLOR(#ff9731):&color(white){''[RBT]''};|>|>|>|${songData.VERSIONB}|\n|>|~|BGCOLOR(#c0c0c0):&color(white){''[CTC]''};|>|>|>|${songData.VERSIONC}`;
            }
            newTable = `|CENTER:60|CENTER:10|CENTER:|CENTER:|CENTER:|CENTER:|CENTER:|c
|>|>|>|>|>|>|&attachref(${songData.pageTitle}/${songData.imageName},500x500);|
|>|~ジャンル|>|>|>|>|${songData.GENRE}|
|>|>|>|>|>|LEFT:~&size(20){${songData.TABLESONGNAME}};|BGCOLOR(#fff8fd):''&color(red){&size(15){&vote2(&#10084;&#65039;[${voteValue}],notimestamp,notitle);};};''|
|>|~アーティスト|>|>|>|>|${songData.COMPOSER}|
|>|~イラスト|>|>|>|>|${songData.ILL}|
|>|~BPM|>|>|>|>|${songData.BPM}|
|>|~演奏時間|>|>|>|>|${songData.LEN}|
|>|~難易度|BGCOLOR(#40cafd):&color(white){''[DET]''};|BGCOLOR(#ff6b6c):&color(white){''[IVD]''};|BGCOLOR(#e988ff):&color(white){''[MSV]''};|BGCOLOR(#ff9731):&color(white){''[RBT]''};|BGCOLOR(#c0c0c0):&color(white){''[CTC]''};|
|>|~レベル|&color(#40cafd){''${songData.DETLV}''};|&color(#ff6b6c){''${songData.IVDLV}''};|&color(#e988ff){''${songData.MSVLV}''};|&color(#ff9731){''${songData.RBTLV}''};|&color(#c0c0c0){''${songData.CTCLV}''};|
|>|~譜面定数|&color(#40cafd){''${songData.DETCC}''};|&color(#ff6b6c){''${songData.IVDCC}''};|&color(#e988ff){''${songData.MSVCC}''};|&color(#ff9731){''${songData.RBTCC}''};|&color(#c0c0c0){''-''};|
|>|~ノーツ数|&color(#40cafd){''${songData.DETNT}''};|&color(#ff6b6c){''${songData.IVDNT}''};|&color(#e988ff){''${songData.MSVNT}''};|&color(#ff9731){''${songData.RBTNT}''};|&color(#c0c0c0){''${songData.CTCNT}''};|
|~譜面&br;デザイン|BGCOLOR(#40cafd):&color(white){''[DET]''};|>|>|>|>|${songData.DETCT}|
|~|BGCOLOR(#ff6b6c):&color(white){''[IVD]''};|>|>|>|>|${songData.IVDCT}|
|~|BGCOLOR(#e988ff):&color(white){''[MSV]''};|>|>|>|>|${songData.MSVCT}|
|~|BGCOLOR(#ff9731):&color(white){''[RBT]''};|>|>|>|>|${songData.RBTCT}|
|~|BGCOLOR(#c0c0c0):&color(white){''[CTC]''};|>|>|>|>|${songData.CTCCT}|
|>|~収録アルバム|>|>|>|>|[[${songData.INCLUDEDALBUM}]]|
|>|~実装日|>|>|>|>|${VERSION}|
|>|~解禁方法|>|>|>|>|${songData.UNLOCK}|
`
          }

          const cssHeader = '#cssbox("margin:auto;width:fit-content;"){{';
          const cssFooter = '}}';

          // 表組みを囲むCSSボックスがあるかどうかの判定と追加
          let finalTable = content.includes(cssHeader) 
              ? newTable 
              : `${cssHeader}\n${newTable}${cssFooter}\n`;

          // 古い表組みを正規表現で新しい表組みに置換
          const tableRegex = /(^[ \t]*\|.*(?:\n|$))+/m;
          
          let newContent = content;
          if (tableRegex.test(content)) {
              newContent = content.replace(tableRegex, finalTable);
          }

          let tableStatusStr = "維持";
          
          // TITLEタグの追加や表組みに変化があった場合のみWikiのページ内容を更新して保存
          if (newContent !== originalContent) {
            await axios.put(pageUrl, { source: newContent }, { headers });
            tableStatusStr = "更新";
            console.log(`[完了]${rowNumber}行: ${currentSongTitle} ページ更新完了`);
          } else {
            console.log(`[スキップ]${rowNumber}行: ${currentSongTitle} ページ内容に変更なし`);
          }

          // ジャケット画像が存在するか確認してWikiへアップロード
          const imageResult = await imageupload({
            pageUrl,
            imageName: songData.imageName,
            headers,
            auth,
            apiToken
          });
          console.log(`[完了]${rowNumber}行: ${currentSongTitle} 画像チェック完了`);
          
          results.push(`[成功]${rowNumber}行: ${currentSongTitle} (表:${tableStatusStr} / 画像:${imageResult.statusText})`);
          
          // API制限を回避するための待機(1秒間)
          await new Promise(resolve => setTimeout(resolve, 1000));
        } catch (err) {
          // 個別楽曲の処理失敗時のエラー出力
          console.error(`[エラー]${rowNumber}行: ${currentSongTitle} ${err.message}`);
          results.push(`[エラー]${rowNumber}行: ${currentSongTitle} 予期せぬエラー (${err.message})`);
        }
      }

      // 全ての処理が完了したことを通知
      await interaction.editReply({ 
        content: `更新完了\n${results.join('\n')}` 
      });
    } catch (error) {
      // 処理全体の失敗時のエラー出力
      console.error(error);
      await interaction.editReply(`エラー: ${error.message}`);
    }
  },
};