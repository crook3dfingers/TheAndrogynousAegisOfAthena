//**************************************
//***********SETUP STUFF****************
//**************************************
// Load data from .env file
import dotenv from 'dotenv'
dotenv.config()
export const DISCORD_TOKEN = process.env.DISCORD_TOKEN
export const LOGGER_LEVEL = process.env.LOGGER_LEVEL
const DO_NOT_REPLY = process.env.DO_NOT_REPLY === "true"

import config from 'config'
import { Client, Intents } from 'discord.js'
import { createLogger, transports } from 'winston'
import { text } from 'alex'

const profaneHelptext = (found) => "Be careful with `" + found + "`, it's profane in some cases"
const insensitiveHelptext = (found) => "`" + found + "` may be insensitive, use a more sensitive alternative instead"

// Parameters to change alex default configs
const probabilityOfResponse = config.has('probabilityOfResponse') ? config.get('probabilityOfResponse') : 1
const approvedChannels = config.has('approvedChannels') ? config.get('approvedChannels') : []
const exemptUsers = config.has('exemptUsers') ? config.get('exemptUsers') : []
const usersNeedingTraining = config.has('usersNeedingTraining') ? config.get('usersNeedingTraining') : []
const additionalDenies = config.has('additionalDenies') ? buildAdditionalDenies(config.get('additionalDenies')) : []
const allowList = config.has('allowList') ? config.get('allowList') : []
const alexDefaultConfig = config.has('alexDefaultConfig') ? config.get('alexDefaultConfig') : null

// Configure logger settings
const logger = createLogger({
    level: LOGGER_LEVEL,
    transports: [new transports.Console()],
})

// Initialize Discord Bot
const client = new Client({
   intents: [Intents.FLAGS.GUILDS, Intents.FLAGS.GUILD_MESSAGES],
   autorun: true
})

client.on('ready', () => {
    logger.info(`Logged in as: ${client.user.tag}`)
    exemptUsers.push(`${client.user.username}`)
    logger.debug('exemptUsers: ' + exemptUsers)
})

client.login(DISCORD_TOKEN)

// Wait for newly created messages, and process accordingly
client.on('messageCreate', processMessage)

function buildAdditionalDenies(denies) {
    const additionalDenies = []
    for (const [key, value] of Object.entries(denies)) {
        var helptext = profaneHelptext
        if (value === 'insensitive') {
            helptext = insensitiveHelptext
        }

        additionalDenies.push({
            find: key,
            helptext: helptext
        })
    }
    
    return additionalDenies
}

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
    if (approvedChannels.indexOf(message.channel.name) === -1) {
        // This channel is not approved for the bot, so do not process the message.
        return
    }

    const username = message.author.username
    logger.debug('user: ' + username)
    
    if (exemptUsers.indexOf(username) > -1) {
        // This user is exempt, so do not process the message.
        return
    }

    const content = message.content

    let reply = sendThroughAlex(username, content, alexDefaultConfig)
    reply += sendThroughCrook3d(content, additionalDenies)
    
    if (DO_NOT_REPLY) {
        logger.debug('DO_NOT_REPLY set to true, NOT REPLYING, but this would be the reply: ' + reply)
    } else if (reply.length > 0) {
        logger.debug('reply: ' + reply)
        message.reply(reply)
        .catch(logger.error)
    }
}
