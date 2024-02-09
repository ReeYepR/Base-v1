module.exports = {
  name: "cat", alias: ["kucing"],
  execute: async ({bot, message, msg, sender}) => {
    return await bot.sendImage(message.jId, "https://cataas.com/cat", `*Hai @${sender.id.slice(0,-15)}, Ini dia foto kucing yang anda minta.*`, [sender.id], msg)
  }
}