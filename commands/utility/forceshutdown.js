const { SlashCommandBuilder, PermissionFlagsBits } = require("discord.js");
const { exec } = require("child_process");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("forceshutdown")
    .setDescription("Forcefully shuts down the bot.")
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
  async execute(interaction) {
    const allowedUsers = ["744621880035770558"];
    if (!allowedUsers.includes(interaction.user.id)) {
      return interaction.reply({
        content: "You do not have permission to use this command.",
        ephemeral: true,
      });
    }

    await interaction.reply("Shutting down the bot... Please wait.");

    exec('pm2 stop "JFC Bot"', (error, _, stderr) => {
      if (error) {
        console.error(`Error shutting down bot: ${error.message}`);
      }

      if (stderr) {
        console.warn(`PM2 stderr: ${stderr}`);
      }
    });
  },
};
