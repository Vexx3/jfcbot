const {
  SlashCommandBuilder,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} = require("discord.js");
const { request } = require("undici");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("trivia")
    .setDescription("Starts a trivia game with a multiple choice question."),

  async execute(interaction) {
    const apiUrl = "https://opentdb.com/api.php?amount=1";

    try {
      const response = await request(apiUrl);
      const data = await response.body.json();

      if (data.response_code !== 0) {
        return interaction.reply({
          content: "Error fetching trivia question.",
          ephemeral: true,
        });
      }

      const questionData = data.results[0];
      const question = questionData.question;
      const correctAnswer = questionData.correct_answer;
      const answers = [...questionData.incorrect_answers, correctAnswer].sort(
        () => Math.random() - 0.5
      );
      const difficulty = questionData.difficulty;
      const category = questionData.category;

      const triviaEmbed = new EmbedBuilder()
        .setColor("#0099ff")
        .setTitle(question)
        .setDescription("*You have 10 seconds to answer*")
        .addFields(
          { name: "Difficulty", value: difficulty, inline: true },
          { name: "Category", value: category, inline: true }
        )
        .setTimestamp();

      const row = new ActionRowBuilder().addComponents(
        answers.map((answer, index) =>
          new ButtonBuilder()
            .setCustomId(`answer_${index}`)
            .setLabel(answer)
            .setStyle(ButtonStyle.Primary)
        )
      );

      await interaction.reply({ embeds: [triviaEmbed], components: [row] });

      const filter = (i) => i.user.id === interaction.user.id;

      const collector = interaction.channel.createMessageComponentCollector({
        filter,
        time: 10000,
      });

      let answered = false;

      collector.on("collect", async (i) => {
        if (answered) return;
        answered = true;

        const selectedAnswerIndex = i.customId.split("_")[1];
        const selectedAnswer = answers[selectedAnswerIndex];

        const updatedRow = new ActionRowBuilder().addComponents(
          answers.map((answer, index) => {
            let buttonStyle = ButtonStyle.Primary;
            if (answer === selectedAnswer) {
              buttonStyle = ButtonStyle.Danger;
            }
            if (answer === correctAnswer) {
              buttonStyle = ButtonStyle.Success;
            }
            return new ButtonBuilder()
              .setCustomId(`answer_${index}`)
              .setLabel(answer)
              .setStyle(
                answer === correctAnswer ? ButtonStyle.Success : buttonStyle
              )
              .setDisabled(true);
          })
        );

        await i.update({
          content:
            selectedAnswer === correctAnswer
              ? "Correct!"
              : `Incorrect! The correct answer was: ${correctAnswer}`,
          components: [updatedRow],
        });

        collector.stop();
      });

      collector.on("end", (_, reason) => {
        if (reason !== "collect" && !answered) {
          const updatedRow = new ActionRowBuilder().addComponents(
            answers.map((answer, index) =>
              new ButtonBuilder()
                .setCustomId(`answer_${index}`)
                .setLabel(answer)
                .setStyle(ButtonStyle.Secondary)
                .setDisabled(true)
            )
          );

          interaction.editReply({
            content: `Time's up! The correct answer was: ${correctAnswer}`,
            components: [updatedRow],
          });
        }
      });
    } catch (error) {
      console.error(error);
      return interaction.reply({
        content: "An error occurred while fetching the trivia question.",
        ephemeral: true,
      });
    }
  },
};
