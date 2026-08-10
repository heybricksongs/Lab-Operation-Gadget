require("dotenv").config({ quiet: true });
const { SlashCommandBuilder } = require("discord.js");
const axios = require("axios");
const { getWikiAuthRes } = require("./others/api.js");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("newsong")
    .setDescription("新規楽曲ページを作成")
    .addStringOption(option => option
      .setName('title')
      .setDescription('曲名を指定')
      .setRequired(true)
    ),

  async execute(interaction) {
    // 処理開始の応答を送信 (タイムアウト防止)
    await interaction.deferReply();

    // 入力された曲名を取得
    let songTitle = interaction.options.getString('title');
    
    // Wikiのページ名で使えない記号を全角文字に置換
    const replaceMap = { 
      '#': '＃', '&': '＆', '"': '”', '<': '＜',
      '>': '＞', '[': '［', ']': '］', '/': '／', ':': '：'
    };
    songTitle = songTitle.replace(/[#&"<>\[\]\/: ]/g, match => replaceMap[match] || match);
    const wikiName = process.env.WIKI_NAME;

    try {
      // Wiki APIの認証情報を取得
      const authRes = await getWikiAuthRes();
      const apiToken = authRes.data.token;
      const headers = { 'Authorization': `Bearer ${apiToken}` };

      // 対象ページのURLを生成
      const pageUrl = `https://api.wikiwiki.jp/${wikiName}/page/${encodeURIComponent(songTitle)}`;
      
      try { 
        // ページが既に存在するかどうかの確認
        await axios.get(pageUrl, { headers });
        // 存在する場合はエラーメッセージを出して処理を中断
        return await interaction.editReply(`[ERROR]:ページ「${songTitle}」は既に存在`);
      } catch (getErr) {
        // 404エラー(ページ未作成)以外の場合は予期せぬエラーとしてスロー
        if (getErr.response && getErr.response.status !== 404) {
          throw getErr;
        }
      }

      // 新規ページのひな形(テンプレート)を作成してWikiへ送信
      await axios.put(pageUrl, {
        source:
`//既に作成してあるページを参考にして下さい。
#cssbox("margin:auto;width:fit-content;"){{
//表組みに情報を追記しないでください。自動更新時消去されます。自動更新を止める方法は音ゲーwiki総合編集広場のパラリブチャンネルの固定にて

|CENTER:60|CENTER:10|CENTER:40|CENTER:40|CENTER:40|CENTER:|CENTER:30|c
|>|~ジャンル|>|>|>|>|?????|
|>|>|>|>|>|LEFT:~&size(20){${songTitle}};|BGCOLOR(#fff8fd):''&color(red){&size(15){&vote2(&#10084;&#65039;[0],notimestamp,notitle);};};''|
|>|~アーティスト|>|>|??????????|>|&attachref(楽曲ページテンプレート/roading.webp,200x200,>100);|
|>|~イラスト|>|>|??????????|>|~|
|>|~BPM|>|>|???|>|~|
|>|~演奏時間|>|>|?:??|>|~|
|>|~難易度|BGCOLOR(#40cafd):&color(white){''[DET]''};|BGCOLOR(#ff6b6c):&color(white){''[IVD]''};|BGCOLOR(#e988ff):&color(white){''[MSV]''};|>|~|
|>|~レベル|&color(#40cafd){''?''};|&color(#ff6b6c){''?''};|&color(#e988ff){''?''};|>|~|
|>|~譜面定数|&color(#40cafd){''??''};|&color(#ff6b6c){''???''};|&color(#e988ff){''???''};|>|~|
|>|~ノーツ数|&color(#40cafd){''???''};|&color(#ff6b6c){''????''};|&color(#e988ff){''????''};|>|~|
|~譜面&br;デザイン|BGCOLOR(#40cafd):&color(white){''[DET]''};|>|>|>|>|????????????????????|
|~|BGCOLOR(#ff6b6c):&color(white){''[IVD]''};|>|>|>|>|????????????????????|
|~|BGCOLOR(#e988ff):&color(white){''[MSV]''};|>|>|>|>|????????????????????|
|>|~収録アルバム|>|>|>|>|????????????????????|
|>|~実装日|>|>|>|>|ver.?.?(202?/??/??)|
|>|~解禁方法|>|>|>|>|????????????????????|

}}
//-オリジナル楽曲。
//-曲名は(〇〇語で)「」という意味。
//-「」から移植された。
//-「」へ移植されている。
//-「」にも収録されている。
//-BMSイベント「〇〇」参加作品、個人戦スコア部門〇位。(BGAあり)


//*歌詞 [#lyrics]
//#fold(展開){{
//--
//}}


*攻略 [#strategy]
//主観が入りすぎていない文章になっているかどうか更新前に確認。

//-''[全難易度共通]''
//--

-&color(#40cafd){''[DET]''};
//--

-&color(#ff6b6c){''[IVD]''};
//--

-&color(#e988ff){''[MSV]''};
//--

*MASSIVE譜面評価 [#vote]
全楽曲のMSV譜面定数は[[譜面定数一覧]]から。全譜面の難易度定数は[[全曲ソート表]]から。
この楽曲の譜面定数(Chart Constant)はページ上部で確認できます。
#vote2(詐称(実際の譜面定数よりも難しい)[0],適正(実際の譜面定数に見合っている)[0],逆詐称(実際の譜面定数よりも易しい)[0])

*プレイ動画 [#playvideo]
//-&color(#9400d3){''MSV''}; [All Decrypted 1,009,000pts] (-n)
//Player :
//CENTER:&youtube();

//*&color(orange){非};公式音源 [#NOFFsoundsource]
*公式音源 [#soundsource]

//-SoundCloud公式音源
//#soundcloud(000000000,visual)

//-YouTube公式音源
//CENTER:&youtube();



#br


***コメント [#comment]
#pcomment(,10,noname,above,below,reply)`
      }, { headers });

      // 作成完了のメッセージを送信
      await interaction.editReply(`[SUCCESS]:ページ「${songTitle}」を新規作成`);

    } catch (error) {
      // 処理全体の失敗時のエラー出力
      console.error(error);
      await interaction.editReply(`[ERROR]:${error.message}`);
    }
  },
};