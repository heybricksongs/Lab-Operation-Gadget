const { SlashCommandBuilder } = require("discord.js");
const { exec } = require("child_process");
const fs = require("fs"); // ファイル操作用モジュールの読み込み

module.exports = {
  data: new SlashCommandBuilder()
    .setName("reboot")
    .setDescription("Botを再起動"),
    
  async execute(interaction) {
    await interaction.reply("まもなく再起動するよ");

    // 再起動情報の保存 (チャンネルIDと開始時刻を記録)
    const restartData = {
      channelId: interaction.channelId,
      restarted: true,
      timestamp: Date.now(),
    };
    fs.writeFileSync("./restart.json", JSON.stringify(restartData));

    // 再起動
    exec("pm2 restart main.js");
  },
};