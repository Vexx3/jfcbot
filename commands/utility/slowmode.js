const {
  SlashCommandBuilder,
  PermissionsBitField,
  ChannelType,
} = require("discord.js");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("slowmode")
    .setDescription(
      "Manage slowmode settings for a specified channel or the current channel."
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("set")
        .setDescription(
          "Sets slowmode for a specified channel or the current channel."
        )
        .addIntegerOption((option) =>
          option
            .setName("seconds")
            .setDescription("The number of seconds for slowmode.")
            .setRequired(true)
            .setMinValue(1)
            .setMaxValue(21600)
        )
        .addChannelOption((option) =>
          option
            .setName("channel")
            .setDescription("The channel to set slowmode for.")
            .setRequired(false)
        )
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("disable")
        .setDescription(
          "Disables slowmode for a specified channel or the current channel."
        )
        .addChannelOption((option) =>
          option
            .setName("channel")
            .setDescription("The channel to disable slowmode for.")
            .setRequired(false)
        )
    ),

  async execute(interaction) {
    const subcommand = interaction.options.getSubcommand();
    const channel =
      interaction.options.getChannel("channel") || interaction.channel;

    if (channel.type !== ChannelType.GuildText) {
      return interaction.reply({
        content: "You can only manage slowmode for text channels.",
        ephemeral: true,
      });
    }

    if (
      !interaction.guild.members.me.permissions.has(
        PermissionsBitField.Flags.ManageChannels
      )
    ) {
      return interaction.reply({
        content: "I do not have permission to manage channels!",
        ephemeral: true,
      });
    }

    if (
      !interaction.member.permissions.has(
        PermissionsBitField.Flags.ManageChannels
      )
    ) {
      return interaction.reply({
        content: "You do not have permission to manage channels!",
        ephemeral: true,
      });
    }

    try {
      if (subcommand === "set") {
        const seconds = interaction.options.getInteger("seconds");
        await channel.setRateLimitPerUser(seconds);
        return interaction.reply({
          content: `Slowmode has been set to ${seconds} seconds in <#${channel.id}>!`,
        });
      } else if (subcommand === "disable") {
        await channel.setRateLimitPerUser(0);
        return interaction.reply({
          content: `Slowmode has been disabled in <#${channel.id}>!`,
        });
      }
    } catch (error) {
      console.error(error);
      return interaction.reply({
        content: "An error occurred while managing slowmode.",
        ephemeral: true,
      });
    }
  },
};
