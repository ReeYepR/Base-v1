module.exports = {
  name: "ping",
  execute: ({bot, message}) => bot.sendMessage(message.jId, {text: "*Pong!!*"})
}