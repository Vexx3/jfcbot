const {
  SlashCommandBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  StringSelectMenuBuilder,
} = require("discord.js");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("post")
    .setDescription("Create or edit a post."),
  async execute(interaction) {
    const initialButtons = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId("edit_or_repost")
        .setLabel("Edit/Repost")
        .setStyle(ButtonStyle.Success),
      new ButtonBuilder()
        .setCustomId("create_new_post")
        .setLabel("Create New Post")
        .setStyle(ButtonStyle.Secondary)
    );

    await interaction.reply({
      content: "Choose an option:",
      components: [initialButtons],
      ephemeral: true,
    });

    const filter = (i) => i.user.id === interaction.user.id;
    const collector = interaction.channel.createMessageComponentCollector({
      filter,
      time: 60000,
    });

    collector.on("collect", async (i) => {
      if (i.customId === "create_new_post") {
        const postTypeMenu = new ActionRowBuilder().addComponents(
          new StringSelectMenuBuilder()
            .setCustomId("post_type_select")
            .setPlaceholder("Select post type")
            .addOptions(
              {
                label: "Fangame Ad",
                value: "fangame_ad",
                description: "Submit an ad for a fangame.",
              },
              {
                label: "Feature Submission",
                value: "featured_submission",
                description: "Submit a fangame for featured.",
              }
            )
        );

        await i.update({
          content: "Select the type of post you want to create:",
          components: [postTypeMenu],
          ephemeral: true,
        });
      } else if (i.customId === "post_type_select") {
        const modal = new ModalBuilder()
          .setCustomId("post_submission_modal")
          .setTitle("Post Submission")
          .addComponents(
            new ActionRowBuilder().addComponents(
              new TextInputBuilder()
                .setCustomId("fangame_name")
                .setLabel("Fangame Name")
                .setStyle(TextInputStyle.Short)
                .setRequired(true)
            ),
            new ActionRowBuilder().addComponents(
              new TextInputBuilder()
                .setCustomId("description")
                .setLabel("Description")
                .setStyle(TextInputStyle.Paragraph)
                .setRequired(true)
            ),
            new ActionRowBuilder().addComponents(
              new TextInputBuilder()
                .setCustomId("image_url")
                .setLabel("Image URL")
                .setStyle(TextInputStyle.Short)
                .setRequired(true)
            ),
            new ActionRowBuilder().addComponents(
              new TextInputBuilder()
                .setCustomId("thumbnail_url")
                .setLabel("Thumbnail URL")
                .setStyle(TextInputStyle.Short)
                .setRequired(true)
            ),
            new ActionRowBuilder().addComponents(
              new TextInputBuilder()
                .setCustomId("game_link")
                .setLabel("Roblox Game Link")
                .setStyle(TextInputStyle.Short)
                .setRequired(true)
            )
          );

        await i.showModal(modal);
      }
    });
  },
};
