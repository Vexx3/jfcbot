const {
  Events,
  Collection,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} = require("discord.js");

module.exports = {
  name: Events.InteractionCreate,
  async execute(interaction) {
    if (interaction.isChatInputCommand()) {
      const command = interaction.client.commands.get(interaction.commandName);

      if (!command) {
        console.error(
          `No command matching ${interaction.commandName} was found.`
        );
        return;
      }

      const { cooldowns } = interaction.client;

      if (!cooldowns.has(command.data.name)) {
        cooldowns.set(command.data.name, new Collection());
      }

      const now = Date.now();
      const timestamps = cooldowns.get(command.data.name);
      const defaultCooldownDuration = 3;
      const cooldownAmount =
        (command.cooldown ?? defaultCooldownDuration) * 1000;

      if (timestamps.has(interaction.user.id)) {
        const expirationTime =
          timestamps.get(interaction.user.id) + cooldownAmount;

        if (now < expirationTime) {
          const expiredTimestamp = Math.round(expirationTime / 1000);
          return interaction.reply({
            content: `Please wait, you are on a cooldown for \`${command.data.name}\`. You can use it again <t:${expiredTimestamp}:R>.`,
            ephemeral: true,
          });
        }
      }

      timestamps.set(interaction.user.id, now);
      setTimeout(() => timestamps.delete(interaction.user.id), cooldownAmount);

      try {
        await command.execute(interaction);
      } catch (error) {
        console.error(error);
        if (interaction.replied || interaction.deferred) {
          await interaction.followUp({
            content: "There was an error while executing this command!",
            ephemeral: true,
          });
        } else {
          await interaction.reply({
            content: "There was an error while executing this command!",
            ephemeral: true,
          });
        }
      }
    } else if (interaction.isAutocomplete()) {
      const command = interaction.client.commands.get(interaction.commandName);

      if (!command) {
        console.error(
          `No command matching ${interaction.commandName} was found.`
        );
        return;
      }

      try {
        await command.autocomplete(interaction);
      } catch (error) {
        console.error(error);
      }
    } else if (interaction.isButton()) {
      // respond to the button
      if (interaction.customId === "edit_or_repost") {
        await interaction.reply({
          content: 'You selected "Edit/Repost".',
          ephemeral: true,
        });
      } else if (interaction.customId === "create_new_post") {
        await interaction.reply({
          content: 'You selected "Create New Post". Please choose a post type.',
          ephemeral: true,
        });
      } else if (interaction.customId === "submit_for_review") {
        const reviewChannelId = "1143711190565003364";
        const reviewChannel = await interaction.client.channels.fetch(
          reviewChannelId
        );

        const { fangameName, description, imageUrl, thumbnailUrl, gameLink } =
          interaction.message.embeds[0].data.fields;

        const modButtons = new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId("accept_post")
            .setLabel("Accept")
            .setStyle(ButtonStyle.Success),
          new ButtonBuilder()
            .setCustomId("reject_post")
            .setLabel("Reject")
            .setStyle(ButtonStyle.Danger)
        );

        await reviewChannel.send({
          content: `**New Submission for Review**\n\n**Fangame Name:** ${fangameName.value}\n**Description:** ${description.value}\n**Image URL:** ${imageUrl.value}\n**Thumbnail URL:** ${thumbnailUrl.value}\n**Game Link:** ${gameLink.value}`,
          components: [modButtons],
        });

        await interaction.update({
          content: "Your post has been submitted for review!",
          components: [],
          ephemeral: true,
        });
      } else if (interaction.customId === "accept_post") {
        const postType = interaction.message.content.includes("Fangame Ad")
          ? "fangame_ad"
          : "featured_submission";
        const acceptedChannelId =
          postType === "fangame_ad"
            ? "896422693669322762"
            : "896422951975530526";
        const acceptedChannel = await interaction.client.channels.fetch(
          acceptedChannelId
        );

        await acceptedChannel.send({
          content: interaction.message.content,
          components: [],
        });

        await interaction.update({
          content: "Post has been accepted and published!",
          components: [],
        });
      } else if (interaction.customId === "reject_post") {
        await interaction.update({
          content: "Post has been rejected.",
          components: [],
        });
      }
    } else if (interaction.isStringSelectMenu()) {
      // respond to the select menu
      if (interaction.customId === "post_type_select") {
        const selectedValue = interaction.values[0];
        await interaction.reply({
          content: `You selected "${
            selectedValue === "fangame_ad"
              ? "Fangame Ad"
              : "Featured Submission"
          }". Please provide the details.`,
          ephemeral: true,
        });
      }
    } else if (interaction.isModalSubmit()) {
      // respond to the modal submit
      if (interaction.customId === "post_submission_modal") {
        const fangameName =
          interaction.fields.getTextInputValue("fangame_name");
        const description = interaction.fields.getTextInputValue("description");
        const imageUrl = interaction.fields.getTextInputValue("image_url");
        const thumbnailUrl =
          interaction.fields.getTextInputValue("thumbnail_url");
        const gameLink = interaction.fields.getTextInputValue("game_link");

        const reviewButtons = new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId("submit_for_review")
            .setLabel("Submit for Review")
            .setStyle(ButtonStyle.Success)
        );

        await interaction.reply({
          content: `**Review Your Post Details**\n\n**Fangame Name:** ${fangameName}\n**Description:** ${description}\n**Image URL:** ${imageUrl}\n**Thumbnail URL:** ${thumbnailUrl}\n**Game Link:** ${gameLink}`,
          components: [reviewButtons],
          ephemeral: true,
        });
      }
    }
  },
};
