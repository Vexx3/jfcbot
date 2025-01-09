const {
  Events,
  Collection,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  codeBlock,
} = require("discord.js");
const { request } = require("undici");

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

      if (interaction.customId === "submit_post") {
        const userData = tempData[interaction.user.id];

        if (!userData) {
          return interaction.reply({
            content: "There was an error retrieving your submission data.",
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
          postType,
        } = userData;

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

        const moderatorActionRow = new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId(`accept_post_${postType}`)
            .setLabel("Accept")
            .setStyle(ButtonStyle.Success),
          new ButtonBuilder()
            .setCustomId(`reject_post`)
            .setLabel("Reject")
            .setStyle(ButtonStyle.Danger)
        );

        const reviewChannel = interaction.client.channels.cache.get(
          "1143711190565003364"
        );

        await reviewChannel.send({
          content: `<@${submitterId}> has submitted a new post for review.`,
          embeds: [embed],
          components: [moderatorActionRow],
        });

        delete tempData[interaction.user.id];

        await interaction.update({
          content: "Your post has been submitted for review.",
          components: [],
          ephemeral: true,
        });
      } else if (interaction.customId === "edit_post") {
        const userData = tempData[interaction.user.id];
        if (!userData) {
          return interaction.reply({
            content: "There was an error retrieving your submission data.",
            ephemeral: true,
          });
        }

        const {
          fangameName,
          description,
          gameLink,
          discordLink,
          imageUrl,
          postType,
        } = userData;

        const modal = new ModalBuilder()
          .setCustomId(`post_modal_${postType}`)
          .setTitle("Edit Your Post");

        const fangameNameInput = new TextInputBuilder()
          .setCustomId("fangame_name")
          .setLabel("Fangame Name")
          .setStyle(TextInputStyle.Short)
          .setValue(fangameName)
          .setRequired(true);

        const descriptionInput = new TextInputBuilder()
          .setCustomId("description")
          .setLabel("Description")
          .setStyle(TextInputStyle.Paragraph)
          .setValue(description)
          .setRequired(true);

        const gameLinkInput = new TextInputBuilder()
          .setCustomId("game_link")
          .setLabel("Game Link")
          .setStyle(TextInputStyle.Short)
          .setValue(gameLink)
          .setRequired(true);

        const discordLinkInput = new TextInputBuilder()
          .setCustomId("discord_link")
          .setLabel("Discord Server Link")
          .setStyle(TextInputStyle.Short)
          .setValue(discordLink)
          .setRequired(false);

        const imageUrlInput = new TextInputBuilder()
          .setCustomId("image_url")
          .setLabel("Image URL")
          .setStyle(TextInputStyle.Short)
          .setValue(imageUrl)
          .setRequired(false);

        const row1 = new ActionRowBuilder().addComponents(fangameNameInput);
        const row2 = new ActionRowBuilder().addComponents(descriptionInput);
        const row3 = new ActionRowBuilder().addComponents(gameLinkInput);
        const row4 = new ActionRowBuilder().addComponents(discordLinkInput);
        const row5 = new ActionRowBuilder().addComponents(imageUrlInput);

        modal.addComponents(row1, row2, row3, row4, row5);

        await interaction.showModal(modal);
      } else if (action === "accept_post") {
        const postType = interaction.customId.split("_").slice(2).join("_");

        const channelId =
          postType === "fangame_ad"
            ? "896422693669322762"
            : "896422951975530526";
        const targetChannel = interaction.client.channels.cache.get(channelId);

        const embed = interaction.message.embeds[0];

        await targetChannel.send({ embeds: [embed] });
        await interaction.update({
          content: "Post accepted and sent to the respective channel.",
          components: [],
        });
      } else if (action === "reject_post") {
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
          postType,
        };

        const embed = new EmbedBuilder()
          .setTitle(fangameName)
          .setDescription(description)
          .addFields(
            { name: "Game Link", value: gameLink },
            { name: "Discord Server Link", value: discordLink || "N/A" }
          )
          .setTimestamp()
          .setFooter({
            text: `${interaction.user.username}`,
            iconURL: interaction.user.displayAvatarURL(),
          });

        if (imageUrl && imageUrl.startsWith("http")) {
          embed.setImage(imageUrl);
        }

        const previewRow = new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId("submit_post")
            .setLabel("Submit")
            .setStyle(ButtonStyle.Success),
          new ButtonBuilder()
            .setCustomId("edit_post")
            .setLabel("Edit")
            .setStyle(ButtonStyle.Secondary)
        );

        await interaction.update({
          content:
            "Here is a preview of your post. Would you like to submit it?",
          embeds: [embed],
          components: [previewRow],
          ephemeral: true,
        });
      } else if (interaction.customId === "runCodeModal") {
        const language = interaction.fields
          .getTextInputValue("language")
          .toLowerCase();
        const code = interaction.fields.getTextInputValue("code");

        await interaction.deferReply();

        try {
          const requestBody = {
            sandbox: language,
            command: "run",
            files: {
              "": code,
            },
          };

          const response = await request("https://api.codapi.org/v1/exec", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify(requestBody),
          });

          const responseData = await response.body.json();

          const { stdout, stderr, duration } = responseData;

          const formattedCode = codeBlock(language, code);
          const output = stderr
            ? codeBlock(stderr)
            : stdout
            ? codeBlock(stdout)
            : "No output was generated.";

          const embed = new EmbedBuilder()
            .setTitle("Code Execution")
            .setDescription(
              `**Input**\n${formattedCode}\n` + `**Output**\n${output}`
            )
            .setFooter({
              text: `Language: ${language} | Execution Time: ${duration}ms`,
            })
            .setColor(stderr ? "Red" : "Green");

          await interaction.editReply({ embeds: [embed] });
        } catch (err) {
          console.error(err);

          await interaction.editReply({
            content:
              "An unexpected error occurred while trying to execute your code. Please try again later.",
          });
        }
      }
    }
  },
};
