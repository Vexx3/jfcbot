const { SlashCommandBuilder, PermissionsBitField } = require("discord.js");
const { updateLeaderboard } = require("../../models/utils");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("forcerefresh")
    .setDescription("Force refresh the leaderboard.")
    .setDefaultMemberPermissions(PermissionsBitField.Administrator),

  async execute(interaction) {
    const leaderboardChannelId = "1305353309863022705";
    const leaderboardChannel =
      interaction.guild.channels.cache.get(leaderboardChannelId);

    if (!leaderboardChannel) {
      return interaction.reply({
        content: "Leaderboard channel not found.",
        ephemeral: true,
      });
    }

    try {
      await updateLeaderboard(leaderboardChannel);
      await interaction.reply("Leaderboard has been refreshed successfully.");
    } catch (error) {
      console.error(error);
      await interaction.reply({
        content: "An error occurred while refreshing the leaderboard.",
        ephemeral: true,
      });
    }
  },
};
