const fs = require('fs')
const path = require('path')

function readCommands(directory, array) {
    const files = fs.readdirSync(directory)

    files.forEach(file => {
        const filePath = './'+path.join(directory, file)
        const fileStat = fs.statSync(filePath)

        if (fileStat.isDirectory()) {
            readCommands(filePath, array)
        } else if (file.endsWith('.js')) {
            const importedObject = require(filePath)
            array.push(importedObject)
        }
    })
    array.filter(i=> i.name && i.execute)
}

const folderPath = './commands'
const commands = []

readCommands(folderPath, commands)

console.log(commands)

module.exports.command_process = async (m, msg, sock) => {
  
  const mybot = require("./bot.js")
  const bot = {...sock, ...mybot}
  
  const {message, sender} = m 
  const {command, prefix, input} = message 
  
  if(!prefix) return
  const data = commands.filter(d=> d.name == command || d.alias?.includes(command))[0]
 if(!data) return
  data.execute({bot, message, sender, command, prefix, input, msg})
  
}