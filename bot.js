const {
  default: makeWASock,
  useMultiFileAuthState,
  downloadMediaMessage
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

let sock

async function start() {
  console.log("Memulai bot...".green)
  const auth = await useMultiFileAuthState("sessions")
  sock = makeWASock({
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
  const mapType = (type, msgObj) => {
    if(type === "conversation" || type === "extendedTextMessage") return "text"
    if (type === "imageMessage") return "image"
    if (type === "videoMessage") return msgObj.videoMessage?.gifPlayback ? "gif" : "video"
    if (type === "audioMessage") return msgObj.audioMessage?.ptt ? "vn" : "audio"
    if (type === "documentMessage") return "document"
    if (type === "reactionMessage") return "reaction"
    if (type === "stickerMessage") return "sticker"
    if (type === "reactionMessage") return "reaction"
    if (type === "listMessage") return "list"
    return type
  }
  const filterTypes = ["senderKeyDistributionMessage", "messageContextInfo"]
  
  
  // Message
  m.message = {}
  m.message.text = getTextMsg(msg.message)
  m.message.type = mapType(Object.keys(msg.message).filter(t=>!filterTypes.includes(t))[0], msg)
  m.message.jId = msg.key?.remoteJid == "status@broadcast"?msg.key.participant:msg.key?.remoteJid
  m.message.baileys = msg
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
    m.message.quoted.type = mapType(Object.keys(msg.message?.extendedTextMessage?.contextInfo?.quotedMessage).filter(t=>!filterTypes.includes(t))[0], msg.message?.extendedTextMessage?.contextInfo?.quotedMessage)
  
    // Sender quoted
    m.sender.quoted = {id: msg.message?.extendedTextMessage?.contextInfo?.participant}
  }
  
  
  return m
}

async function sendText (jId, text, mentions, quoted) {
  return createMessage(await sock.sendMessage(jId, {text, mentions}, {quoted}))
}
module.exports.sendText = sendText

async function sendImage (jId, url, caption, mentions, quoted) {
  return createMessage(await sock.sendMessage(jId, {image: {url}, caption, mentions}, {quoted}))
}
module.exports.sendImage = sendImage

async function sendVidio (jId, url, caption, mentions, quoted) {
  return createMessage(await sock.sendMessage(jId, {vidio: {url}, caption, mentions}, {quoted}))
}
module.exports.sendVidio = sendVidio

async function sendContact (jId, data, mentions, quoted) {
  const list = []
  for(const id of data) {
    list.push({
      display: id.name,
      vcard: "BEGIN:VCARD\n"
            + "VERSION:3.0\n" 
            + "FN:"+id.name+"\n"
            + "TEL;type=CELL;type=VOICE;waid="+id.number+":+"+id.number+"\n"
            + "END:VCARD"
    })
  }
  return createMessage(await sock.sendMessage(jId, {contacts: {name: `${list.length} Contact`, contacts: list}}))
}
module.exports.sendContact = sendContact

async function sendAudio (jId, url, mimetype, quoted) {
  const content = getUpload(url)
  return createMessage(await sock.sendMessage(jId, {audio: content, mimetype}, {quoted}))
}
module.exports.sendAudio = sendAudio

function downloadMedia(m, type) {
  return downloadMediaMessage(m, type, {}, {reuploadRequest:sock.updateMediaMessage})
}
module.exports.downloadMedia = downloadMedia

async function sendSticker (jId, data, quoted) {
  return createMessage(await sock.sendMessage(jId, {sticker: data}, {quoted}))
}

function getUpload (input) {
  if (input instanceof Buffer) return input
  if (typeof input === "string") return {url:input}
  if (
    input instanceof ReadableStream || 
    input.constructor.name === "Transform" ||
    input.constructor.name === "Sharp" ||
    input.constructor.name === "IncomingMessage"
  ) return {stream:input}
  throw "Tipe upload tidak diketahui"
}