const {
  Events,
  Collection,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
} = require("discord.js");

const tempData = {};

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
      const action = interaction.customId.split("_").slice(0, 2).join("_");
      const postType = interaction.customId.split("_").slice(2).join("_");

      if (action === "accept_post") {
        await interaction.deferUpdate();

        await interaction.message.edit({
          components: [],
        });

        const userData = tempData[interaction.user.id];

        if (!userData) {
          return interaction.followUp({
            content:
              "There was an error retrieving your submission data. Please ensure you submitted the form properly.",
            ephemeral: true,
          });
        }

        const {
          fangameName,
          description,
          gameLink,
          discordLink,
          imageUrl,
          submitterId,
        } = userData;

        const channelId =
          postType === "fangame_ad"
            ? "896422693669322762"
            : "896422951975530526";

        const reviewChannel = interaction.client.channels.cache.get(channelId);

        const embed = new EmbedBuilder()
          .setTitle(fangameName)
          .setDescription(description)
          .addFields(
            { name: "Game Link", value: gameLink },
            { name: "Discord Server Link", value: discordLink }
          )
          .setTimestamp()
          .setFooter({
            text: `${interaction.user.username}`,
            iconURL: interaction.user.displayAvatarURL(),
          });

        if (imageUrl && imageUrl.startsWith("http")) {
          embed.setImage(imageUrl);
        }

        await reviewChannel.send({
          content: `<@${submitterId}>`,
          embeds: [embed],
        });
      } else if (action === "reject_post") {
        await interaction.deferUpdate();

        await interaction.message.edit({
          components: [],
        });

        try {
          await interaction.user.send({
            content:
              "Your post has been rejected by the moderators. Please ensure it meets the guidelines and has the correct inputs and try again.",
          });
        } catch (error) {
          console.error("Failed to send rejection DM:", error);
        }

        delete tempData[interaction.user.id];
      }
    } else if (interaction.isStringSelectMenu()) {
      // respond to the select menu
    } else if (interaction.isModalSubmit()) {
      const action = interaction.customId.split("_").slice(0, 2).join("_");

      if (action === "post_modal") {
        const fangameName =
          interaction.fields.getTextInputValue("fangame_name");
        const description = interaction.fields.getTextInputValue("description");
        const gameLink = interaction.fields.getTextInputValue("game_link");
        const discordLink =
          interaction.fields.getTextInputValue("discord_link");
        const imageUrl = interaction.fields.getTextInputValue("image_url");

        const postType = interaction.customId.split("_").slice(2).join("_");

        tempData[interaction.user.id] = {
          fangameName,
          description,
          gameLink,
          discordLink,
          imageUrl,
          submitterId: interaction.user.id,
        };

        const embed = new EmbedBuilder()
          .setTitle(fangameName)
          .setDescription(description)
          .addFields(
            { name: "Game Link", value: gameLink },
            { name: "Discord Server Link", value: discordLink }
          )
          .setTimestamp()
          .setFooter({
            text: `${interaction.user.username}`,
            iconURL: interaction.user.displayAvatarURL(),
          });

        if (
          imageUrl &&
          typeof imageUrl === "string" &&
          imageUrl.startsWith("http")
        ) {
          embed.setImage(imageUrl);
        }

        const reviewChannel = interaction.client.channels.cache.get(
          "1143711190565003364"
        );
        const acceptRejectRow = new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId(`accept_post_${postType}`)
            .setLabel("Accept")
            .setStyle(ButtonStyle.Success),
          new ButtonBuilder()
            .setCustomId(`reject_post_${postType}`)
            .setLabel("Reject")
            .setStyle(ButtonStyle.Danger)
        );

        await reviewChannel.send({
          content: "New Post for Review:",
          embeds: [embed],
          components: [acceptRejectRow],
        });

        await interaction.reply({
          content: "Your post has been submitted for review.",
          ephemeral: true,
        });
      }
    }
  },
};
