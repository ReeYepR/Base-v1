module.exports = {
  name: "ping",
  execute: async ({bot, message, msg}) => {
    return await bot.sendText(message.jId, "*Pong!!*", null, msg)
  }
}