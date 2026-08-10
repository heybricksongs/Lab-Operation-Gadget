const { SlashCommandBuilder, ActionRowBuilder, StringSelectMenuBuilder, AttachmentBuilder } = require("discord.js");
const { getSpreadsheetDoc } = require("./others/api.js");
const { parseSongData } = require("./others/songParser.js");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("tablegenerate")
    .setDescription("シートの行番号から表組みを返します")
    .addStringOption(opt => opt.setName('rows').setDescription('行番号(入力方法: 1,3,15 or 3-8)').setRequired(true)),

  async execute(interaction) {
    // 処理開始の応答を送信 (タイムアウト防止)
    const response = await interaction.deferReply();
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
      // スプレッドシートの認証とドキュメントの読み込み
      const { doc } = await getSpreadsheetDoc();
      console.log(`認証完了`);

      // 楽曲データ用とアルバムデータ用のシートを取得
      const rows = await doc.sheetsByIndex[0].getRows(); 
      const albumRows = await doc.sheetsByIndex[1].getRows();

      // 出力形式を選択するプルダウンメニューの作成
      const selectMenu = new StringSelectMenuBuilder()
        .setCustomId('table_type_select')
        .setPlaceholder('出力形式')
        .addOptions(
          { label: '楽曲一覧', value: 'SO', description: '楽曲一覧の表組み' },
          { label: 'コンポーザー一覧(新規版)', value: 'CN', description: 'packに色がついているバージョン' },
          { label: 'コンポーザー一覧(現在版)', value: 'CO', description: '現在の書式' },
          { label: '譜面定数一覧(ジャケット)', value: 'CC', description: 'ジャケットのref書式' },
          { label: 'SHOP用', value: 'SH', description: 'スプシから読める情報のみ埋め込み' },
          { label: '過去コラボ一覧', value: 'CL', description: 'スプシから読める情報のみ埋め込み' },
          { label: '段位用', value: 'DA', description: '事前に4曲の行番号を入れてください' },
        );
      const row = new ActionRowBuilder().addComponents(selectMenu);
      
      // 作成したメニューをDiscordへ送信
      await interaction.editReply({
        content: `出力形式`,
        components: [row]
      });
      
      // メニューの選択を待機するコレクターの設定 (10分間)
      const collector = response.createMessageComponentCollector({ time: 600000 });
      
      // ユーザーがメニューを選択した時の処理
      collector.on('collect', async i => {
        // 選択操作の完了を通知
        await i.deferUpdate();
        
        let resultText = "";
        const selectedType = i.values[0];
        let DAN = 0;
      
        const firstTargetRow = rows[rowNumbers[0] - 2];
        
        // ヘッダー(表の先頭部分)の設定
        if (selectedType === 'SO') {
          // 「迷いの旅」アルバム専用の特別ヘッダー分岐
          if (firstTargetRow && firstTargetRow._rawData[21] === "迷いの旅") {
            resultText += `|1|50||COLOR(#40cafd):CENTER:|COLOR(#ff6b6c):CENTER:|COLOR(#e988ff):CENTER:|COLOR(#ff9731):CENTER:|1|CENTER:1|c\n|~ |~&color(#dcdcd6){____};|~曲名&br;アーティスト|>|>|>|>|~&color(black){難易度};|~&tategaki{解放Lv.};|h\n|~|~|~|~&tategaki{&color(#40cafd){ＤＥＴ};};|~&tategaki{&color(#ff6b6c){ＩＶＤ};};|~&tategaki{&color(#e988ff){ＭＳＶ};};|~&tategaki{&color(#ff9731){ＲＢＴ};};|~ |~|\n`;
          } else {  
            resultText += `|1|50||COLOR(#40cafd):CENTER:|COLOR(#ff6b6c):CENTER:|COLOR(#e988ff):CENTER:|COLOR(#ff9731):CENTER:|1|c\n|~ |~&color(#dcdcd6){____};|~曲名&br;アーティスト|>|>|>|>|~&color(black){難易度};|h\n|~|~|~|~&tategaki{&color(#40cafd){ＤＥＴ};};|~&tategaki{&color(#ff6b6c){ＩＶＤ};};|~&tategaki{&color(#e988ff){ＭＳＶ};};|~&tategaki{&color(#ff9731){ＲＢＴ};};|~ |\n`;
          }
        } else if (selectedType === 'CN' || selectedType === 'CO') {
          // 'CN' と 'CO' は同じヘッダーを使用するため統合
          resultText += `|LEFT:|CENTER:|LEFT:200|1|c\n|CENTER:~song|~pack|CENTER:~備考|~ |h\n`;
        }

        // 指定された行の数だけループして表の中身を作成
        for (const rowNumber of rowNumbers) {
          const targetRow = rows[rowNumber - 2];
          if (!targetRow) continue;

          // 楽曲データの抽出/変換
          const songData = parseSongData(targetRow, albumRows);
          const { songTitle, pageTitle, imageName, TCF, ORIGINAL, OTHER, COMPOSER, ALBUM, COLORCODE, ANCHOR, CRYSTAL, CAPTION } = songData;
          const { genDETLV, genIVDLV, genMSVLV, genRBTLV, cleanVERSION, ORI } = songData;
          
          const CTC = songData.CTCLV ? "BGCOLOR(silver):" : "";
          
          // 曲名表示の共通フォーマット
          const displayTitle = TCF ? `${songTitle}>${pageTitle}` : songTitle;

          // 出力形式ごとのデータ整形と追加
          if (selectedType === 'SO') {
            if (ALBUM === "迷いの旅") {
              resultText += `|${ORI}|&attachref(${pageTitle}/${imageName});|[[${displayTitle}]]|${genDETLV}|${genIVDLV}|${genMSVLV}|${genRBTLV}|${CTC}|''${OTHER}''|\n|~|~|${COMPOSER}|~|~|~|~|~|~|\n`;
            } else {
              resultText += `|${ORI}|&attachref(${pageTitle}/${imageName});|[[${displayTitle}]]|${genDETLV}|${genIVDLV}|${genMSVLV}|${genRBTLV}|${CTC}|\n|~|~|${COMPOSER}|~|~|~|~|~|\n`;
            }
          } else if (selectedType === 'CN') {
            resultText += `|[[${displayTitle}]]|[[&color(#${COLORCODE}){${ALBUM}};>アルバム順#${ANCHOR}]]|||\n`;
          } else if (selectedType === 'CO') {
            resultText += `|[[${displayTitle}]]|${ALBUM}|||\n`;
          } else if (selectedType === 'CC') {
            resultText += `[[&attachref(${pageTitle}/${imageName},nolink,75x75);>${pageTitle}]]\n`;
          } else if (selectedType === 'SH') {
            resultText += `|[[&color(#${COLORCODE}){${ALBUM}};>アルバム順#${ANCHOR}]]|曲数|曲数|&color(deepskyblue){''${CRYSTAL}''};|探索レベル|スキン|\n`;
          } else if (selectedType === 'CL') {
            resultText += `|移植先|&attachref(${pageTitle}/${imageName});|[[${displayTitle}]]|${cleanVERSION} ???コラボ|[[${ALBUM}>アルバム順#${ANCHOR}]]|コラボ側収録場所||\n`;
          } else if (selectedType === 'DA') {
            DAN++;
            const NUM = ["ST", "ND", "RD", "TH"][DAN - 1] || "";
            resultText += `|&size(18){''${DAN}''};&size(15){''${NUM}''};|&attachref(${pageTitle}/${imageName});|[[${displayTitle}]]|BGCOLOR(#e988ff):&color(white){[MSV]};|[[${CAPTION}&br;&color(#${COLORCODE}){${ALBUM}};>アルバム順#${ANCHOR}]]|\n|~|~|${COMPOSER}|&color(#e988ff){''${songData.MSVLV}''};|~|\n`;
          }
        }

        // 文字数制限(2000文字)を超えた場合はテキストファイルとして送信
        if (resultText.length > 1900) {
          const buffer = Buffer.from(resultText, 'utf-8');
          const attachment = new AttachmentBuilder(buffer, { name: 'generated_table.txt' });
          await i.editReply({ 
            content: `文字数が多すぎたのでファイルにしました`, 
            files: [attachment], 
            components: [row] 
          });
        } else {
          // 制限内であればそのままメッセージとして送信
          await i.editReply({ 
            content: `\n\`\`\`\n${resultText}\n\`\`\``, 
            components: [row],
            files: [] 
          });
        }
      });

      // タイムアウト(10分経過)時の処理
      collector.on('end', () => {
        // メニューのボタンを非表示にして終了を通知
        interaction.editReply({ content: 'タイムアウト:再度コマンドを打ってね', components: [] }).catch(() => {});
      });

    } catch (error) {
      // 処理全体の失敗時のエラー出力
      console.error(error);
      await interaction.editReply(`エラー: ${error.message}`);
    }
  },
};