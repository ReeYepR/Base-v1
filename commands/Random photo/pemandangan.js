module.exports = {
  name: "view", alias: ["pemandangan"],
  execute: async ({bot, message, msg, sender}) => {
    const link = ["https://picsum.photos/200", "https://picsum.photos/200/300"][Math.floor(Math.random()* 2)]
    return await bot.sendImage(message.jId, link, `*Hai @${sender.id.slice(0,-15)}, Ini dia foto yang anda minta.*`, [sender.id], msg)
  }
}