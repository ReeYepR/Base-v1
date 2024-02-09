const {
  default: makeWASock,
  useMultiFileAuthState
} = require("@whiskeysockets/baileys")
const readline = require("readline")
const Pino = require("pino")
const {inspect} = require("util")
require("./cmd-process.js")
require("colors")

let prefixList = ["!"]

const pairing = process.argv.includes("--pairing")

const question = text =>
  new Promise(resolve => {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    })
    rl.question(text, answer => {
      resolve(answer)
      rl.close()
    })
  })

module.exports.start = start

async function start() {
  console.log("Memulai bot...".green)
  const auth = await useMultiFileAuthState("sessions")
  let sock = makeWASock({
    printQRInTerminal: !pairing,
    browser: ["Chrome (Linux)", "", ""],
    auth: auth.state,
    logger: Pino({ level: "silent" })
  })
  if (pairing && !sock.authState.creds.registered) {
    const nomor = await question("Masukkan nomor bot WhatsApp anda: +")
    setTimeout(async function () {
      const pairingCode = await sock.requestPairingCode(nomor)
      console.log("Pairing code anda: ", pairingCode)
    }, 3000)
  }
  sock.ev.on("creds.update", auth.saveCreds)
  sock.ev.on("connection.update", ({ connection }) => {
    if (connection === "close") start()
  })
  sock.ev.on("messages.upsert", async ({messages})=>{
    const msg = messages[0]
    const m = createMessage(msg)
    
    // Log Message
    console.log("Mentah : ".bgRed.white.bold, "\n", inspect(msg,null,10).green)
    console.log("Matang : ".bgRed.white.bold, "\n", m)
    
    const {command_process} = require("./cmd-process.js")
    
    await command_process(m, msg, sock)
    
  })
}

function createMessage(msg) {
  const m = {}
  
  if(!msg.message) return {message: {}, sender: {}}
  
  const getTextMsg = (x) => x.conversation || x.extendedTextMessage?.text || x.imageMessage?.caption || x.vidioMessage?.caption || x.documentWithCaptionMessage?.message?.documentMessage?.caption || x.reactionMessage?.text || ""
  
  // Message
  m.message = {}
  m.message.text = getTextMsg(msg.message)
  m.message.jId = msg.key?.remoteJid == "status@broadcast"?msg.key.participant:msg.key?.remoteJid
  m.message.isGroup = m.message.jId.endsWith("@g.us")
  m.message.prefix = prefixList.find(i=>m.message.text?.startsWith(i))
  m.message.command = m.message.text?.split(" ")[0].replace(m.message.prefix, "")
  m.message.input = m.message.text?.replace(m.message.prefix+m.message.command+" ", "")
  
  // Sender
  m.sender = {}
  m.sender.id = msg.key?.participant || msg.key?.remoteJid
  m.sender.name = msg.pushName
  
  if(msg.message?.extendedTextMessage?.contextInfo?.quotedMessage) {
    // Message Quoted
    m.message.quoted = {}
    m.message.quoted.text = getTextMsg(msg.message?.extendedTextMessage?.contextInfo?.quotedMessage)
  
    // Sender quoted
    m.sender.quoted = {id: msg.message?.extendedTextMessage?.contextInfo?.participant}
  }
  
  
  return m
}