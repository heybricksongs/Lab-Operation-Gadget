const { SlashCommandBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('ping')
    .setDescription('応答時間を返すよ'),
  
  async execute(interaction) {
    try {
      const startTime = Date.now();
      await interaction.deferReply();
      const ping = Date.now() - startTime;
      await interaction.followUp(`${ping}ms`);
    } catch (error) {
      console.error(error);
      await interaction.followUp('エラー');
    }
  },
};