const { EmbedBuilder } = require("discord.js");
const botconfig = require("./botconfig");
const userpoints = require("./userpoints")

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
};
