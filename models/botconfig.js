const mongoose = require("mongoose");

const botConfigSchema = new mongoose.Schema({
  leaderboardMessageId: { type: String, default: null },
});

module.exports = mongoose.model("BotConfig", botConfigSchema);
