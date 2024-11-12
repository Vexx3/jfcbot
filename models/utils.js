const { EmbedBuilder } = require("discord.js");
const botconfig = require("./botconfig");
const userpoints = require("./userpoints");

const activeGames = new Map();

/**
 * Starts a game for a user, preventing multiple active games.
 * @param {string} userId - Discord user ID.
 * @param {string} gameType - The type of game (e.g., 'guessfangamename', 'trivia').
 * @returns {boolean} - Returns true if the game is successfully started, false if already active.
 */
function startGame(userId, gameType) {
  if (activeGames.has(userId)) return false;
  activeGames.set(userId, gameType);
  return true;
}

/**
 * Ends a game for a user.
 * @param {string} userId - Discord user ID.
 */
function endGame(userId) {
  activeGames.delete(userId);
}

/**
 * Updates the leaderboard for Guess Fangame Name game.
 * @param {object} channel - The Discord channel to post the leaderboard.
 */
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

module.exports = {
  updateLeaderboard,
  startGame,
  endGame,
};
