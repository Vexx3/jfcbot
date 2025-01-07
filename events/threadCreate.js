const { Events, ChannelType } = require("discord.js");

module.exports = {
  name: Events.ThreadCreate,
  async execute(thread) {
    if (thread.parent && thread.parent.type === ChannelType.GuildForum) {
      try {
        await thread.send(`
          - Consider reading <#1235076483064533012> to improve your question!
          - Explain what exactly your issue is.
          - Post the full error stack trace, not just the top part!
        `);
      } catch (error) {
        console.error(`Failed to send message in thread: ${error.message}`);
      }
    }
  },
};
