const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const { request } = require("undici");

const gameList = [
  12884807858, 15030142936, 4884399625, 10212412556, 6915126593, 7062805182,
  6985116641, 6640564884, 10822512138, 10283991824, 14941540826, 9619455447,
  12451919385, 14377924053, 7184682048, 15464996550, 12244318727, 6209129635,
  17655390153, 18386437234, 8426160717, 18174616215,
];

module.exports = {
  data: new SlashCommandBuilder()
    .setName("guessfangamename")
    .setDescription("Guess the name of a random fangame!"),

  async execute(interaction) {
    let streak = 0;

    const instructionEmbed = new EmbedBuilder()
      .setTitle("How to Play")
      .setDescription(
        `In this game, you'll be given a hint for a random fangame's name. 
        You need to guess the name of the game correctly within 20 seconds. 
        You'll have 3 lives, and each incorrect guess will cost you a life. 
        The game will continue until you either lose all your lives or correctly guess the name!`
      )
      .setColor("#2C2F33")
      .setFooter({ text: "Good luck!" });

    await interaction.reply({ embeds: [instructionEmbed] });

    setTimeout(() => {
      async function playRound(lives, isFirstRound = false) {
        const randomGameID =
          gameList[Math.floor(Math.random() * gameList.length)];

        try {
          const universeResponse = await request(
            `https://apis.roblox.com/universes/v1/places/${randomGameID}/universe`
          );
          const universeData = await universeResponse.body.json();
          const universeId = universeData.universeId;

          const gameResponse = await request(
            `https://games.roblox.com/v1/games?universeIds=${universeId}`
          );
          const gameData = await gameResponse.body.json();
          const gameInfo = gameData.data[0];

          const cleanGameName = gameInfo.name
            .replace(/[\(\[].*?[\)\]]/g, "")
            .replace(
              /[\u{1F600}-\u{1F64F}|\u{1F300}-\u{1F5FF}|\u{1F680}-\u{1F6FF}|\u{1F700}-\u{1F77F}|\u{1F780}-\u{1F7FF}|\u{1F800}-\u{1F8FF}|\u{1F900}-\u{1F9FF}|\u{1FA00}-\u{1FA6F}|\u{1FA70}-\u{1FAFF}|\u{2600}-\u{26FF}|\u{2700}-\u{27BF}]+/gu,
              ""
            )
            .replace(/[^\w\s]/g, "")
            .trim();

          const generateHint = (name) => {
            const nameArray = name.split("");
            const revealCount = Math.ceil(
              name.replace(/\s/g, "").length * 0.65
            );
            let revealedPositions = new Set();

            while (revealedPositions.size < revealCount) {
              const pos = Math.floor(Math.random() * name.length);
              if (nameArray[pos] !== " ") {
                revealedPositions.add(pos);
              }
            }

            return nameArray
              .map((char, index) =>
                char === " " ? " " : revealedPositions.has(index) ? char : "\\*"
              )
              .join("");
          };

          const hint = generateHint(cleanGameName);

          let livesEmojis = "";
          for (let i = 0; i < 3; i++) {
            livesEmojis += i < lives ? "❤️" : "🖤";
          }

          const gameEmbed = new EmbedBuilder()
            .setTitle("Guess the Fangame Name")
            .setDescription(`Lives: ${livesEmojis}\nHint: ${hint}`)
            .setFooter({ text: "Type your answer in the chat." })
            .setColor("#2C2F33");

          if (isFirstRound) {
            await interaction.followUp({ embeds: [gameEmbed] });
          } else {
            await interaction.followUp({ embeds: [gameEmbed] });
          }

          const filter = (m) => m.author.id === interaction.user.id;

          const collector = interaction.channel.createMessageCollector({
            filter,
            time: 20000,
          });

          collector.on("collect", async (response) => {
            collector.resetTimer();

            if (
              response.content.toLowerCase() === cleanGameName.toLowerCase()
            ) {
              streak++;
              await response.reply(
                `Correct! You guessed the fangame name. Streak: ${streak}`
              );
              collector.stop("correct");
              playRound(lives, false);
            } else {
              lives--;
              if (lives > 0) {
                await response.reply(
                  `Wrong guess! The game will proceed to the next round.`
                );
                collector.stop("incorrect");
                playRound(lives, false);
              } else {
                const streakMessage =
                  streak > 0 ? ` Your final streak was: ${streak}.` : "";
                await response.reply(
                  `Game over! The correct name was **${cleanGameName}**.${streakMessage}`
                );
                collector.stop("gameOver");
              }
            }
          });

          collector.on("end", async (_, reason) => {
            if (reason === "time" && lives > 0) {
              const streakMessage = streak > 0 ? ` Streak: ${streak}.` : "";
              await interaction.followUp({
                content: `${interaction.user}, you ran out of time! The correct name was **${cleanGameName}**. Please try again next time.${streakMessage}`,
              });
            }
          });
        } catch (error) {
          console.error(error);
          if (isFirstRound) {
            await interaction.reply({
              content: "There was an error fetching the game info.",
              ephemeral: true,
            });
          } else {
            await interaction.followUp({
              content: "There was an error fetching the game info.",
              ephemeral: true,
            });
          }
        }
      }

      playRound(3, true);
    }, 3000);
  },
};
