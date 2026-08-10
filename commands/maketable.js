const { SlashCommandBuilder } = require("discord.js");
const { getSpreadsheetDoc } = require("./others/api.js");
const { parseSongData } = require("./others/songParser.js");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("maketable")
    .setDescription("シートの行番号からwikiの表組みを返します(旧簡易コマンド)")
    .addStringOption(opt => opt.setName('rows').setDescription('行番号(入力方法: 1,3,15 or 3-8)').setRequired(true)),

  async execute(interaction) {
    // 処理開始の応答を送信 (タイムアウト防止)
    await interaction.deferReply();
    const input = interaction.options.getString('rows');
    let rowNumbers = [];

    // 行番号の指定形式を判定して配列化
    if (input.includes('-')) {
      const [start, end] = input.split('-').map(Number);
      for (let i = start; i <= end; i++) rowNumbers.push(i);
    } else {
      rowNumbers = input.split(',').map(s => Number(s.trim()));
    }

    try {
      // スプレッドシートの認証およびドキュメントの読み込み
      const { doc } = await getSpreadsheetDoc();
      console.log(`認証・読み込み完了`);

      // 楽曲データ用とアルバムデータ用のシートを取得
      const sheet = doc.sheetsByIndex[0];
      const rows = await sheet.getRows();
      const albumSheet = doc.sheetsByIndex[1];
      const albumRows = await albumSheet.getRows();

      // 指定された行の数だけ処理を実行
      for (const rowNumber of rowNumbers) {
        let currentSongTitle = "不明";
        try {
          // 対象行のデータを取得
          const targetRow = rows[rowNumber - 2];
          if (!targetRow) {
            await interaction.followUp(`行 ${rowNumber}: 見つかりません`);
            continue;
          }

          // 共通モジュールを使用して楽曲データをパース(抽出・変換)
          const songData = parseSongData(targetRow, albumRows);
          currentSongTitle = songData.songTitle;
          console.log(`[読込]${rowNumber}行: ${currentSongTitle} パース完了`);
          
          // アルバム情報が2枚目のシートに存在しない場合の警告
          if (!songData.CAPTION && songData.ALBUM) {
             await interaction.followUp(`[警告]${rowNumber}行: ${currentSongTitle} アルバム「${songData.ALBUM}」が2枚目のシートに見つかりません`);
          }

          const voteValue = 0;
          let VERSION = songData.VERSION_RAW;

          // RBT譜面とCTC譜面の有無による表組みフォーマットの条件分岐
          if (!songData.RBTCC && !songData.CTCLV){
            // MSVのノーツデザイナーがDET・IVDと異なるかどうかの判定
            if (!(songData.DETCT == songData.IVDCT && songData.IVDCT == songData.MSVCT)){
              console.log(`[判定]${rowNumber}行: ${currentSongTitle} MSV通常`);
              // 通常の3譜面用フォーマットを送信
              await interaction.followUp(`\`\`\`|CENTER:60|CENTER:10|CENTER:|CENTER:|CENTER:|c
|>|>|>|>|&attachref(${songData.pageTitle}/${songData.imageName},500x500);|
|>|~ジャンル|>|>|${songData.GENRE}|
|>|>|>|LEFT:~&size(20){${songData.TABLESONGNAME}};|BGCOLOR(#fff8fd):''&color(red){&size(15){&vote2(&#10084;&#65039;[${voteValue}],notimestamp,notitle);};};''|
|>|~アーティスト|>|>|${songData.COMPOSER}|
|>|~イラスト|>|>|${songData.ILL}|
|>|~BPM|>|>|${songData.BPM}|
|>|~演奏時間|>|>|${songData.LEN}|
|>|~難易度|BGCOLOR(#40cafd):&color(white){''[DET]''};|BGCOLOR(#ff6b6c):&color(white){''[IVD]''};|BGCOLOR(#e988ff):&color(white){''[MSV]''};|
|>|~レベル|&color(#40cafd){''${songData.DETLV}''};|&color(#ff6b6c){''${songData.IVDLV}''};|&color(#e988ff){''${songData.MSVLV}''};|
|>|~譜定数|&color(#40cafd){''${songData.DETCC}''};|&color(#ff6b6c){''${songData.IVDCC}''};|&color(#e988ff){''${songData.MSVCC}''};|
|>|~ノーツ数|&color(#40cafd){''${songData.DETNT}''};|&color(#ff6b6c){''${songData.IVDNT}''};|&color(#e988ff){''${songData.MSVNT}''};|
|~譜面&br;デザイン|BGCOLOR(#40cafd):&color(white){''[DET]''};|>|>|${songData.DETCT}|
|~|BGCOLOR(#ff6b6c):&color(white){''[IVD]''};|>|>|${songData.IVDCT}|
|~|BGCOLOR(#e988ff):&color(white){''[MSV]''};|>|>|${songData.MSVCT}|
|>|~収録アルバム|>|>|[[${songData.INCLUDEDALBUM}]]|
|>|~実装日|>|>|${VERSION}|
|>|~解禁方法|>|>|${songData.UNLOCK}|
\`\`\``);
            } else {
              console.log(`[判定]${rowNumber}行: ${currentSongTitle} MSVALL`);
              // 3譜面すべて同じノーツデザイナーの場合のフォーマットを送信
              await interaction.followUp(`\`\`\`|CENTER:60|CENTER:10|CENTER:|CENTER:|CENTER:|c
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
\`\`\``);
            }
          } else if (songData.RBTCC && !songData.CTCLV) {
            console.log(`[判定]${rowNumber}行: ${currentSongTitle} RBT`);
            // RBT譜面が存在する場合のフォーマットを送信
            if (songData.VERSIONB) {
               VERSION = `${songData.VERSIONA}|\n|>|~|BGCOLOR(#ff9731):&color(white){''[RBT]''};|>|>|${songData.VERSIONB}`;
            }
            await interaction.followUp(`\`\`\`|CENTER:60|CENTER:10|CENTER:|CENTER:|CENTER:|CENTER:|c
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
\`\`\``);
          } else if (!songData.RBTCC && songData.CTCLV) {
            console.log(`[判定]${rowNumber}行: ${currentSongTitle} CTC`);
            // CTC譜面が存在する場合のフォーマットを送信
            if (songData.VERSIONB) {
               VERSION = `${songData.VERSIONA}|\n|>|~|BGCOLOR(#c0c0c0):&color(white){''[CTC]''};|>|>|${songData.VERSIONB}`;
            }
            await interaction.followUp(`\`\`\`|CENTER:60|CENTER:10|CENTER:|CENTER:|CENTER:|CENTER:|c
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
\`\`\``);
          } else {
            console.log(`[判定]${rowNumber}行: ${currentSongTitle} RBT&CTC`);
            // RBT譜面とCTC譜面の両方が存在する場合のフォーマットを送信
            if (songData.VERSIONB && !songData.VERSIONC) {
              VERSION = `${songData.VERSIONA}|\n|>|~|BGCOLOR(#ff9731):&color(white){''[RBT]''};|>|>|>|${songData.VERSIONB}`;
            } else if (!songData.VERSIONB && songData.VERSIONC) {
              VERSION = `${songData.VERSIONA}|\n|>|~|BGCOLOR(#c0c0c0):&color(white){''[CTC]''};|>|>|>|${songData.VERSIONC}`;
            } else {
              VERSION = `${songData.VERSIONA}|\n|>|~|BGCOLOR(#ff9731):&color(white){''[RBT]''};|>|>|>|${songData.VERSIONB}|\n|>|~|BGCOLOR(#c0c0c0):&color(white){''[CTC]''};|>|>|>|${songData.VERSIONC}`;
            }
            await interaction.followUp(`\`\`\`|CENTER:60|CENTER:10|CENTER:|CENTER:|CENTER:|CENTER:|CENTER:|c
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
\`\`\``);
          }
        } catch (err) {
          // 個別楽曲の処理失敗時のエラー出力
          console.error(`[エラー]${rowNumber}行: ${currentSongTitle} ${err.message}`);
          await interaction.followUp(`[エラー]${rowNumber}行: ${currentSongTitle} 予期せぬエラー (${err.message})`);
        }
      }
    } catch (error) {
      // 処理全体の失敗時のエラー出力
      console.error(error);
      await interaction.editReply(`[ERROR] - ${error.message}`);
    }
  },
};