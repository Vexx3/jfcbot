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
      const gameList = {
        12884807858: "Flam's Rooms of Stupidity: Remade",
        15030142936: "An0nymous' Cool Steeples",
        4884399625: "The Challenge Towers",
        10212412556: "The Neat Districts",
        6915126593: "Voki's Towers of Insanity",
        7062805182: "Cris' Rooms of Rushed",
        6985116641: "Vibewater's Redundant Edifices",
        6640564884: "Cris's Towers of Madness",
        10822512138: "Bacon's Towers of Categories",
        10283991824: "Caleb's Soul Crushing Domain",
        14941540826: "TowerRush!",
        9619455447: "Acry's Crazy Columns",
        12451919385: "egg's painful neats",
        14377924053: "The Classic Tower Archive",
        7184682048: "Kirk's Towers of Nonsense",
        15464996550: "Tango's Towers of Cursed",
        12244318727: "Detective's Towers of Doom",
        6209129635: "Yoi's Towers of Hell",
        17655390153: "Kiddie's Towers of Hell: Reborn",
        18386437234: "lask's towers of dread.",
        8426160717: "Kosta's Mini Tower Mayhem!",
        18174616215: "NEATs 4 Anarchists",
      };

      const gameKeys = Object.keys(gameList);
      const randomGameID =
        gameKeys[Math.floor(Math.random() * gameKeys.length)];

      try {
        const universeResponse = await request(
          `https://apis.roblox.com/universes/v1/places/${randomGameID}/universe`
        );
        const universeId = universeResponse.body.universeId;

        if (!universeId) {
          throw new Error("Failed to get universe ID.");
        }

        const gameResponse = await request(
          `https://games.roblox.com/v1/games?universeIds=${universeId}`
        );
        const gameInfo = gameResponse.body.data[0];

        if (!gameInfo) {
          throw new Error("Failed to fetch game info.");
        }

        const iconResponse = await request(
          `https://thumbnails.roblox.com/v1/games/icons?universeIds=${universeId}&size=512x512&format=png&isCircular=false`
        );
        const iconUrl = iconResponse.body.data[0].imageUrl;

        const votesResponse = await request(
          `https://games.roblox.com/v1/games/votes?universeIds=${universeId}`
        );
        const upvotes = votesResponse.body.data[0].upVotes || 0;
        const downvotes = votesResponse.body.data[0].downVotes || 0;

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
      "0 0 6 * * sun",
      async () => {
        const fangameEmbed = await fetchFangameOfTheWeek();
        const channel = await client.channels.fetch("1304389887063097354");
        channel.send(fangameEmbed);
      },
      null,
      true,
      "UTC"
    );
  },
};
