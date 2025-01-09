const {
  SlashCommandBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ActionRowBuilder,
} = require("discord.js");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("runcode")
    .setDescription("Run a code snippet and get the output."),
  async execute(interaction) {
    const modal = new ModalBuilder()
      .setCustomId("runCodeModal")
      .setTitle("Run Code");

    const languageInput = new TextInputBuilder()
      .setCustomId("language")
      .setLabel("Language")
      .setPlaceholder("e.g., javascript, python, c++")
      .setStyle(TextInputStyle.Short)
      .setRequired(true);

    const codeInput = new TextInputBuilder()
      .setCustomId("code")
      .setLabel("Code Snippet")
      .setPlaceholder("Write your code here...")
      .setStyle(TextInputStyle.Paragraph)
      .setRequired(true);

    const languageRow = new ActionRowBuilder().addComponents(languageInput);
    const codeRow = new ActionRowBuilder().addComponents(codeInput);
    modal.addComponents(languageRow, codeRow);

    await interaction.showModal(modal);
  },
};
