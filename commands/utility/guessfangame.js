const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const { request } = require("undici");
const userpoints = require("../../models/userpoints");
const botconfig = require("../../models/botconfig");
const { gameList } = require("../../models/utils");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("guessfangamename")
    .setDescription("Guess the name of a random fangame!"),

  async execute(interaction) {
    let streak = 0;

    const instructionEmbed = new EmbedBuilder()
      .setTitle("How to Play")
      .setDescription(
        `How to play:
    
        1. **Guess the Name**: You will be given a hint based on the name of a random fangame.
        2. **3 Lives**: You have 3 lives. Every time you make a wrong guess, you will lose 1 life.
        3. **Time Limit**: You have 20 seconds to make each guess. Be quick!
        4. **Correct Answer**: If you guess the name correctly, you earn points and your streak increases!
        5. **Game Over**: If you run out of lives or time, the game will end, but your points and streak will still be counted.
        6. **Total Games**: There are a total of **${gameList.length} fangames** available to guess. Can you identify them all?
    
        You will see a randomly selected fangame's name, with some characters hidden as clues. Type your guess as quickly as possible to gain points and extend your streak!`
      )
      .setColor("#2C2F33");

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
              const newPoints = await addPoints(interaction.user.id);

              await response.reply(
                `Correct! You guessed the fangame name.\nStreak: ${streak}\nTotal Points: ${newPoints}`
              );

              const leaderboardChannel = interaction.guild.channels.cache.get(
                "1305353309863022705"
              );
              if (leaderboardChannel)
                await updateLeaderboard(leaderboardChannel);

              collector.stop("correct");
              playRound(lives, false);
            } else {
              lives--;
              if (lives > 0) {
                await response.reply(
                  `Wrong guess! The correct name was **${cleanGameName}**.\nThe game will proceed to the next round.`
                );
                collector.stop("incorrect");
                playRound(lives, false);
              } else {
                const streakMessage =
                  streak > 0 ? `Your final streak was: ${streak}.` : "";
                await response.reply(
                  `Game over! The correct name was **${cleanGameName}**.\n${streakMessage}`
                );
                collector.stop("gameOver");
              }
            }
          });

          collector.on("end", async (_, reason) => {
            if (reason === "time" && lives > 0) {
              const streakMessage = streak > 0 ? `Streak: ${streak}.` : "";
              await interaction.followUp({
                content: `${interaction.user}, you ran out of time! The correct name was **${cleanGameName}**. Please try again next time.\n${streakMessage}`,
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

async function addPoints(userId, points = 1) {
  const user = await userpoints.findOneAndUpdate(
    { userId },
    { $inc: { points } },
    { new: true, upsert: true }
  );
  return user.points;
}

async function updateLeaderboard(channel) {
  const topUsers = await userpoints
    .find()
    .sort({ points: -1 })
    .limit(100)
    .exec();

  const lastUpdated = Math.floor(Date.now() / 1000);

  const leaderboardEmbed = new EmbedBuilder()
    .setTitle("Guess Fangame Name Leaderboard")
    .setDescription(
      topUsers
        .map(
          (user, index) =>
            `${index + 1}. <@${user.userId}> - ${user.points} points`
        )
        .join("\n")
    )
    .setColor("#FFD700");

  let config = await botconfig.findOne();
  if (!config) {
    config = new botconfig();
    await config.save();
  }

  if (config.leaderboardMessageId) {
    try {
      const leaderboardMessage = await channel.messages.fetch(
        config.leaderboardMessageId
      );
      await leaderboardMessage.edit({
        content: `**Last updated:** <t:${lastUpdated}:f>`,
        embeds: [leaderboardEmbed],
      });
    } catch (error) {
      console.log("Leaderboard message not found. Sending a new message.");
      const newMessage = await channel.send({
        content: `**Last updated:** <t:${lastUpdated}:f>`,
        embeds: [leaderboardEmbed],
      });
      config.leaderboardMessageId = newMessage.id;
      await config.save();
    }
  } else {
    const newMessage = await channel.send({
      content: `**Last updated:** <t:${lastUpdated}:f>`,
      embeds: [leaderboardEmbed],
    });
    config.leaderboardMessageId = newMessage.id;
    await config.save();
  }
}
