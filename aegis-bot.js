//**************************************
//***********SETUP STUFF****************
//**************************************
// Load token from .env file
import dotenv from 'dotenv'
dotenv.config()
export const DISCORD_TOKEN = process.env.DISCORD_TOKEN

import { Client, Intents } from 'discord.js'
import { createLogger, transports } from 'winston'
import { text } from 'alex'

// Parameters to change alex default configs
const probabilityOfResponse = 0.5
const exemptUsers = ['The Androgynous Aegis of Athena']
const usersNeedingTraining = ['Justin']
const additionalDenies = [{
    find: 'justin',
    helptext: (found) => "Be careful with `" + found + "`, it's profane in some cases"
}]
const allowList = ['just']
const alexDefaultConfig = {
    "noBinary": true,
    "profanitySureness": 1
}

// Configure logger settings
const logger = createLogger({
    level: 'debug',
    transports: [new transports.Console()],
})

// Initialize Discord Bot
const client = new Client({
   intents: [Intents.FLAGS.GUILDS, Intents.FLAGS.GUILD_MESSAGES],
   autorun: true
})

client.on('ready', () => {
    logger.info(`Logged in as: ${client.user.tag}`)
})

client.login(DISCORD_TOKEN)

// Wait for newly created messages, and process accordingly
client.on('messageCreate', processMessage)

function buildReply(msgs) {
    let reply = ''

    for (let i=0; i<msgs.length; i++) {
        let msg = msgs[i].message
        let include = true

        for (var j=0; j< allowList.length; j++) {
            let start = msg.search(new RegExp("\\b" + allowList[i] + "\\b", "i"))
            if (start > -1) {
                include = false
                break;
            }
        }

        if (include) {
            reply += msgs[i].message + "\n"
        }
    }

    return reply
}

function shouldCheckContent(username) {
    let checkContent

    if (usersNeedingTraining.indexOf(username) > -1) {
        // This user needs extra training
        checkContent = true
    } else {
        let num = Math.random()
        logger.debug("Probnum: " + num)
        checkContent = !!probabilityOfResponse && num <= probabilityOfResponse
    }

    return checkContent
}

function sendThroughAlex(username, content, config) { 
    if (shouldCheckContent(username)) {
        return buildReply(text(content, config).messages)
    } else {
        return ''
    }
}

function sendThroughCrook3d(content, denyList) {
    const messages = []

    for (var i = 0; i < denyList.length; i++) {
        let deny = denyList[i]
        let start = content.search(new RegExp("\\b" + deny.find + "\\b", "i"))
        if (start > -1) {
            messages.push({"message":deny.helptext(content.substring(start, start + deny.find.length))})
        }
    }

    return buildReply(messages)
}

function processMessage(message) {
    const username = message.author.username
    logger.debug('user: ' + username)
    
    if (exemptUsers.indexOf(username) > -1) {
        // This user is exempt, so do not process the message.
        return;
    }

    const content = message.content

    let reply = sendThroughAlex(username, content, alexDefaultConfig)
    reply += sendThroughCrook3d(content, additionalDenies)
    logger.debug('reply: ' + reply)
    
    if (reply.length > 0) {
        message.reply(reply)
        .catch(logger.error)
    }
}
