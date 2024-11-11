const { SlashCommandBuilder, PermissionFlagsBits } = require("discord.js");
const { exec } = require("child_process");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("forcestart")
    .setDescription("Force start or restart the bot.")
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
  async execute(interaction) {
    const allowedUsers = ["744621880035770558"];
    if (!allowedUsers.includes(interaction.user.id)) {
      return interaction.reply({
        content: "You do not have permission to use this command.",
        ephemeral: true,
      });
    }

    await interaction.reply("Restarting the bot... Please wait.");

    exec('pm2 restart "JFC Bot"', (error, _, stderr) => {
      if (error) {
        console.error(`Error restarting bot: ${error}`);
      }

      if (stderr) {
        console.warn(`PM2 stderr: ${stderr}`);
      }
    });
  },
};
