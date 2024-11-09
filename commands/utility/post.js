const { SlashCommandBuilder } = require("@discordjs/builders");
const {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
} = require("discord.js");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("post")
    .setDescription("Create a new post or edit an existing one"),
  async execute(interaction) {
    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId("create_post")
        .setLabel("Create New Post")
        .setStyle(ButtonStyle.Primary)
    );

    await interaction.reply({
      content: "What would you like to do?",
      components: [row],
      ephemeral: true,
    });

    const filter = (i) => i.user.id === interaction.user.id;
    const collector = interaction.channel.createMessageComponentCollector({
      filter,
      time: 15000,
    });

    collector.on("collect", async (i) => {
      collector.stop();
      if (i.customId === "create_post") {
        const selectMenu = new StringSelectMenuBuilder()
          .setCustomId("post_type")
          .setPlaceholder("Select post type")
          .addOptions(
            new StringSelectMenuOptionBuilder()
              .setLabel("Fangame Ad")
              .setValue("fangame_ad"),
            new StringSelectMenuOptionBuilder()
              .setLabel("Featured Submissions")
              .setValue("featured_submission")
          );

        const selectRow = new ActionRowBuilder().addComponents(selectMenu);

        await i.update({
          content: "Select the type of post:",
          components: [selectRow],
          ephemeral: true,
        });
      }
    });

    collector.on("end", (_, reason) => {
      if (reason === "time") {
        interaction.editReply({
          content: "You took too long to respond.",
          components: [],
          ephemeral: true,
        });
      }
    });

    const selectFilter = (selectInteraction) =>
      selectInteraction.user.id === interaction.user.id;
    const selectCollector = interaction.channel.createMessageComponentCollector(
      {
        filter: selectFilter,
        time: 15000,
      }
    );

    selectCollector.on("collect", async (selectInteraction) => {
      if (selectInteraction.customId === "post_type") {
        const postType = selectInteraction.values[0];

        const modal = new ModalBuilder()
          .setCustomId(`post_modal_${postType}`)
          .setTitle("Create New Post");

        const fangameName = new TextInputBuilder()
          .setCustomId("fangame_name")
          .setLabel("Fangame Name")
          .setStyle(TextInputStyle.Short)
          .setRequired(true);

        const description = new TextInputBuilder()
          .setCustomId("description")
          .setLabel("Description")
          .setStyle(TextInputStyle.Paragraph)
          .setRequired(true);

        const gameLink = new TextInputBuilder()
          .setCustomId("game_link")
          .setLabel("Game Link")
          .setStyle(TextInputStyle.Short)
          .setRequired(true);

        const discordServerLink = new TextInputBuilder()
          .setCustomId("discord_link")
          .setLabel("Discord Server Link")
          .setStyle(TextInputStyle.Short)
          .setRequired(false);

        const imageUrl = new TextInputBuilder()
          .setCustomId("image_url")
          .setLabel("Image URL")
          .setStyle(TextInputStyle.Short)
          .setRequired(false);

        const row1 = new ActionRowBuilder().addComponents(fangameName);
        const row2 = new ActionRowBuilder().addComponents(description);
        const row3 = new ActionRowBuilder().addComponents(gameLink);
        const row4 = new ActionRowBuilder().addComponents(discordServerLink);
        const row5 = new ActionRowBuilder().addComponents(imageUrl);

        modal.addComponents(row1, row2, row3, row4, row5);

        await selectInteraction.showModal(modal);
      }
    });
  },
};
