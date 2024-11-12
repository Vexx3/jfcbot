const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const { request } = require("undici");
const userpoints = require("../../models/userpoints");
const gameList = require("../../models/gameList");
const { updateLeaderboard, startGame, endGame } = require("../../models/utils");

module.exports = {
  cooldown: 2,
  data: new SlashCommandBuilder()
    .setName("guessfangamename")
    .setDescription("Guess the name of a random fangame!"),

  async execute(interaction) {
    const userId = interaction.user.id;

    if (!startGame(userId, "guessfangamename")) {
      return interaction.reply({
        content: "Hold up there, You're already playing this game!",
        ephemeral: true,
      });
    }

    let streak = 0;
    let collector;

    const instructionEmbed = new EmbedBuilder()
      .setTitle("How to Play")
      .setDescription(
        `**Guess the Name**: You'll get a clue based on a fangame's name. Make a guess!
        **3 Lives**: 3 wrong guesses, and you're out.
        **20 Seconds**: That’s all the time you get per guess.
        **Score**: Get it right, earn points, and up your streak!
        
        **Pro Tip**: There are **${gameList.length} fangames**.`
      )
      .setColor("#2C2F33");

    await interaction.reply({ embeds: [instructionEmbed] });

    setTimeout(() => {
      async function playRound(lives) {
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
            .replace(/\s+/g, " ")
            .trim();

          const generateHint = (name) => {
            const nameArray = name.split("");
            const revealCount = Math.ceil(name.replace(/\s/g, "").length * 0.7);
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

          await interaction.followUp({ embeds: [gameEmbed] });

          const filter = (m) => m.author.id === interaction.user.id;
          collector = interaction.channel.createMessageCollector({
            filter,
            time: 20000,
            max: 1,
          });

          collector.on("collect", async (response) => {
            collector.resetTimer();

            if (
              response.content.toLowerCase() === cleanGameName.toLowerCase()
            ) {
              streak++;
              const newPoints = await addPoints(interaction.user.id);

              await response.reply(
                `That's correct!\nStreak: ${streak}\nTotal Points: ${newPoints}`
              );

              const leaderboardChannel = interaction.guild.channels.cache.get(
                "1305353309863022705"
              );
              if (leaderboardChannel)
                await updateLeaderboard(leaderboardChannel);

              collector.stop("correct");
              playRound(lives);
            } else {
              lives--;
              if (lives > 0) {
                await response.reply(
                  `Oops, that’s not it! The correct answer was **${cleanGameName}**.\nLet's keep going!`
                );
                collector.stop("incorrect");
                playRound(lives);
              } else {
                const streakMessage =
                  streak > 0 ? `Final streak: ${streak}.` : "";
                await response.reply(
                  `>>> Game over! You gave it a solid shot.\nThe correct answer was **${cleanGameName}**.\n${streakMessage} Better luck next time!`
                );
                collector.stop("gameOver");
                endGame(userId);
              }
            }
          });

          collector.on("end", async (_, reason) => {
            if (reason === "time" && lives > 0) {
              const streakMessage = streak > 0 ? `Streak: ${streak}.` : "";
              await interaction.followUp({
                content: `>>> ${interaction.user}, too slow! Please try again next time.\n${streakMessage}`,
              });
              endGame(userId);
            }
          });
        } catch (error) {
          console.error(error);
          await interaction.followUp({
            content:
              "There was an error fetching the game info. Continuing the game...",
            ephemeral: true,
          });
          playRound(lives);
        }
      }

      playRound(3);
    }, 3000);
  },
};

async function addPoints(userId, points = 1) {
  const user = await userpoints.findOneAndUpdate(
    { userId },
    { $inc: { points } },
    { new: true, upsert: true }
  );
  return user.points;
}
