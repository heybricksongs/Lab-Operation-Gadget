// ------------------------------
// ここから下準備
// ------------------------------

// envの読み込み
require("dotenv").config({ quiet: true });

// モジュールのインポート
const fs = require("fs");
const path = require("path");
const {
  Client,
  Collection,
  GatewayIntentBits,
  ActivityType,
  REST,
  Routes,
} = require("discord.js");

// クライアントオブジェクト作成
// intentsはどんな情報を受け取るか設定するやつ
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

// コマンドを保存するプロパティ
client.commands = new Collection();

// ここまで下準備
console.log("Bot準備開始");

// ------------------------------
// ここからコマンドの読み込み
// ------------------------------

// commandsフォルダの中にある「.js」で終わるファイルを検索
const foldersPath = path.join(process.cwd(), "commands");
const commandFiles = fs
  .readdirSync(foldersPath)
  .filter((file) => file.endsWith(".js")); 

// 見つけたファイルを読み込んで保存
for (const file of commandFiles) {
  const filePath = path.join(foldersPath, file);
  const module = require(filePath);
  client.commands.set(module.data.name, module);
}

// スラッシュコマンド処理
client.on("interactionCreate", async (interaction) => {
  // スラッシュコマンド以外なら無視
  console.log("コマンド呼び出し");
  if (!interaction.isChatInputCommand()) return;

  // コマンド検索
  const command = interaction.client.commands.get(interaction.commandName);
  if (!command) {
    return interaction.reply("このコマンドは存在しません。");
  }

  console.log("Command found:", interaction.commandName);

  // コマンド実行
  try {
    await command.execute(interaction);
  } catch (error) {
    console.error(error);
    const replyMethod = interaction.deferred || interaction.replied ? interaction.followUp : interaction.reply;
    await replyMethod.call(interaction, {
      content: "コマンドの実行中にエラーが発生しました。",
      ephemeral: true, // 実行した人にだけ見えるメッセージにする
    });
  }
});

// ここまでコマンドの読み込み


// ------------------------------
// ここからメッセージへの反応設定
// ------------------------------

// イベント検知(メッセージ)
client.on('messageCreate', message => {
  // 自身のメッセージや他のBotには反応しない
  if (message.author.bot) return;

  const responses = [
      'ピッ!!',
      'ピー',
      'ピピッ',
      'ビビ',
  ];

  // メッセージに「ログくん」が含まれている場合
  if (message.content.includes('ログくん')) {
      // 用意した言葉からランダムに選ぶ
      const randomIndex = Math.floor(Math.random() * responses.length);
      const randomResponse = responses[randomIndex];

      // ランダムに返信
      message.reply(randomResponse);
  }
});

// ------------------------------
// ここから起動時の処理
// ------------------------------

// イベント検知(準備完了)
client.on("clientReady", async () => {
  console.log(`${client.user.tag}準備完了`);
  
  // Botのステータスの設定
  client.user.setActivity({
    name: "Paradigm:Reboot",
    type: ActivityType.Playing,
  });

  // rebootで再起動した場合のみの処理
  if (fs.existsSync("./restart.json")) {
    const data = JSON.parse(fs.readFileSync("./restart.json", "utf8"));
    const channel = await client.channels.fetch(data.channelId);
    const timeTakenMs = Date.now() - data.timestamp;
    const timeTakenSec = (timeTakenMs / 1000).toFixed(1);
    let timeText = ` (${timeTakenSec}s)`;
    await channel.send(`再起動完了${timeText}`);
    // 記録ファイルを消去
    fs.unlinkSync("./restart.json");
  }

  // 起動時に最新のコマンドをDiscordに自動登録
  const commandsData = client.commands.map((cmd) => cmd.data.toJSON());
  const rest = new REST().setToken(process.env.DISCORD_BOT_TOKEN);

  try {
    await rest.put(
      Routes.applicationCommands(process.env.APPLICATION_ID),
      { body: commandsData }
    );
    console.log(`[INIT] ${commandsData.length}つのスラッシュコマンドを更新しました。`);
  } catch (error) {
    console.error(error);
  }
});


// トークンを使用しDiscordにログイン
client.login(process.env.DISCORD_BOT_TOKEN);
