const {
  Events,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} = require("discord.js");
const { CronJob } = require("cron");
const { request } = require("undici");

module.exports = {
  name: Events.ClientReady,
  once: true,
  execute(client) {
    console.log(`Ready! Logged in as ${client.user.tag}`);

    async function fetchFangameOfTheWeek() {
      const gameList = [
        12884807858, 15030142936, 4884399625, 10212412556, 6915126593,
        7062805182, 6985116641, 6640564884, 10822512138, 10283991824,
        14941540826, 9619455447, 12451919385, 14377924053, 7184682048,
        15464996550, 12244318727, 6209129635, 17655390153, 18386437234,
        8426160717, 18174616215,
      ];

      const randomGameID =
        gameList[Math.floor(Math.random() * gameList.length)];

      try {
        const universeResponse = await request(
          `https://apis.roblox.com/universes/v1/places/${randomGameID}/universe`
        );

        const universeData = await universeResponse.body.json();

        const universeId = universeData.universeId;

        if (!universeId) {
          throw new Error("Failed to get universe ID.");
        }

        const gameResponse = await request(
          `https://games.roblox.com/v1/games?universeIds=${universeId}`
        );
        const gameData = await gameResponse.body.json();
        const gameInfo = gameData.data[0];

        if (!gameInfo) {
          throw new Error("Failed to fetch game info.");
        }

        const iconResponse = await request(
          `https://thumbnails.roblox.com/v1/games/icons?universeIds=${universeId}&size=512x512&format=png&isCircular=false`
        );
        const iconData = await iconResponse.body.json();
        const iconUrl = iconData.data[0]?.imageUrl;

        const votesResponse = await request(
          `https://games.roblox.com/v1/games/votes?universeIds=${universeId}`
        );
        const votesData = await votesResponse.body.json();
        const upvotes = votesData.data[0]?.upVotes || 0;
        const downvotes = votesData.data[0]?.downVotes || 0;

        const totalVotes = upvotes + downvotes;
        const rating =
          totalVotes > 0 ? Math.round((upvotes / totalVotes) * 100) : 0;

        const creatorType = gameInfo.creator.type;
        const creatorId = gameInfo.creator.id;
        const creatorUrl =
          creatorType === "Group"
            ? `https://www.roblox.com/groups/${creatorId}`
            : `https://www.roblox.com/users/${creatorId}/profile`;

        const createdAt = `<t:${Math.floor(
          new Date(gameInfo.created).getTime() / 1000
        )}:R>`;
        const updatedAt = `<t:${Math.floor(
          new Date(gameInfo.updated).getTime() / 1000
        )}:R>`;

        const gameEmbed = new EmbedBuilder()
          .setTitle(gameInfo.name)
          .setAuthor({ name: gameInfo.creator.name, url: creatorUrl })
          .setDescription(gameInfo.description || "No description available.")
          .addFields(
            {
              name: "🌎 Visits",
              value: gameInfo.visits.toLocaleString(),
              inline: true,
            },
            {
              name: "❤️ Favorites",
              value: gameInfo.favoritedCount.toLocaleString(),
              inline: true,
            },
            {
              name: "👎 Upvotes",
              value: upvotes.toLocaleString(),
              inline: true,
            },
            {
              name: "👎 Downvotes",
              value: downvotes.toLocaleString(),
              inline: true,
            },
            { name: "⭐ Rating", value: `${rating}%`, inline: true },
            { name: "📅 Created", value: createdAt, inline: true },
            { name: "🔄 Last Updated", value: updatedAt, inline: true }
          )
          .setImage(iconUrl)
          .setColor("Random");

        const gameButton = new ButtonBuilder()
          .setLabel("Play Now")
          .setStyle(ButtonStyle.Link)
          .setURL(`https://www.roblox.com/games/${randomGameID}`)
          .setEmoji("🎮");

        const actionRow = new ActionRowBuilder().addComponents(gameButton);

        return {
          content: "🎉 Here's the Fangame of the Week! 🎮",
          embeds: [gameEmbed],
          components: [actionRow],
        };
      } catch (error) {
        console.error(error);
        throw new Error("There was an error fetching the game info.");
      }
    }

    const cronJob = new CronJob(
      "0 0 0 * * 7",
      async () => {
        const fangameEmbed = await fetchFangameOfTheWeek();
        const channel = await client.channels.fetch("1304389887063097354");
        channel.send(fangameEmbed);
      },
      null,
      true,
      "Asia/Manila"
    );
  },
};
