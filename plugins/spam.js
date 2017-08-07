/****************************************
 * 
 *   Spam: Plugin for AstralMod that filters spam
 *   Copyright (C) 2017 Victor Tran
 *
 *   This program is free software: you can redistribute it and/or modify
 *   it under the terms of the GNU General Public License as published by
 *   the Free Software Foundation, either version 3 of the License, or
 *   (at your option) any later version.
 *
 *   This program is distributed in the hope that it will be useful,
 *   but WITHOUT ANY WARRANTY; without even the implied warranty of
 *   MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 *   GNU General Public License for more details.
 *
 *   You should have received a copy of the GNU General Public License
 *   along with this program.  If not, see <http://www.gnu.org/licenses/>.
 * 
 * *************************************/

const Discord = require("discord.js");

var client;
var consts;

var spamObject = {
    lastMessages: {},
    spamCounting: {},
    nonSpamCounting: {}
};

function startup() {

}

function newMessage(message) {
    var checkSpam = true;
    
    if (settings.guilds[message.guild.id] == null || typeof settings.guilds[message.guild.id] == "undefined") {
        checkSpam = false;
    } else {
        if (settings.guilds[message.guild.id].spamCtl != null) {
            if (settings.guilds[message.guild.id].spamCtl == false) {
                checkSpam = false;
            }
        }
        
        if (settings.guilds[message.guild.id].requiresConfig == true) {
            checkSpam = false;
        }
        
        if (message.author.bot) {
            checkSpam = false;
        }
    }
    
    if (checkSpam) {
        //Spam filtering enabled for this server

        /** @type{Array} */
        var lastMessagesOfUser = spamObject.lastMessages[message.author.id];
        if (lastMessagesOfUser == null) {
            lastMessagesOfUser = [];
        }

        /** @type{Number} */
        var spamCountingUser = spamObject.spamCounting[message.author.id];
        if (spamCountingUser == null) {
            spamCountingUser = 0;
        }

        /** @type{Number} */
        var nonSpamCountingUser = spamObject.nonSpamCounting[message.author.id];
        if (nonSpamCountingUser == null) {
            nonSpamCountingUser = 0;
        }

        var messageText = message.content.toLowerCase();
        if (messageText.length > 3 && messageText != "okay" && messageText != "yeah") {
            if (lastMessagesOfUser.includes(messageText)) {
                spamCountingUser++;

                if (nonSpamCountingUser > 0) {
                    nonSpamCountingUser--;
                }

                if (spamCountingUser >= 3) {
                    if (spamCountingUser == 10) {
                        if (client.channels.has(settings.guilds[message.guild.id].botWarnings)) {
                            client.channels.get(settings.guilds[message.guild.id].botWarnings).send(":red_circle: <@" + message.author.id + "> was spamming on " + message.channel.name + ".");
                        } else {
                            log("Bot Warnings channel " + settings.guilds[message.guild.id].botWarnings + " not found", logType.critical);
                        }
                        message.reply("I've told you way too many times. The staff have been informed. (#" + spamCountingUser + ")");
                    } else if (spamCountingUser > 10) {
                        
                    } else {
                        message.reply("Y'know, we don't appreciate it when you spam. (#" + spamCountingUser + ")");
                    }
                    message.delete();
                }
            } else {
                //Add last message to array
                lastMessagesOfUser.push(messageText);

                //Remove 11th message if there is one
                if (lastMessagesOfUser.length > 10) {
                    lastMessagesOfUser.splice(0, 1);
                }

                nonSpamCountingUser++;
            }
            
            if (nonSpamCountingUser == 10) {
                spamCountingUser = 0;
                nonSpamCountingUser = 0;
            }
        }

        //Set Variables
        spamObject.lastMessages[message.author.id] = lastMessagesOfUser;
        spamObject.spamCounting[message.author.id] = spamCountingUser;
        spamObject.nonSpamCounting[message.author.id] = nonSpamCountingUser;
    }
}

function processCommand(message, isMod, command) {
    if (isMod) {
        if (command.startsWith("spamctl ")) {
            var isOn = command.substr(8);
            if (isOn == "on") {
                settings.guilds[message.guild.id].spamCtl = true;
                message.reply("Spam filtering is now on for this server.");
            } else if (isOn == "off") {
                settings.guilds[message.guild.id].spamCtl = false;
                message.reply("Spam filtering is now off for this server.");
            } else {
                message.reply("Usage: `am:spamctl on|off`\nFor more information, `am:help spamctl`");
            }
        } else if (command == "spamctl") {
                message.reply("Usage: `am:spamctl on|off`\nFor more information, `am:help spamctl`");
        }
    }

    if (command == "spamdata") {
        message.channel.startTyping();

        /** @type{Array} */
        var lastMessagesOfUser = spamObject.lastMessages[message.author.id];
        if (lastMessagesOfUser == null) {
            lastMessagesOfUser = [];
        }

        /** @type{Number} */
        var spamCountingUser = spamObject.spamCounting[message.author.id];
        if (spamCountingUser == null) {
            spamCountingUser = 0;
        }

        /** @type{Number} */
        var nonSpamCountingUser = spamObject.nonSpamCounting[message.author.id];
        if (nonSpamCountingUser == null) {
            nonSpamCountingUser = 0;
        }

        var embed = new Discord.RichEmbed();
        embed.setAuthor(message.member.displayName, message.author.displayAvatarURL);

        embed.addField("Anger Levels", "Spam Detected: " + spamCountingUser + "\nSpam Forgiveness: " + nonSpamCountingUser, true);

        message.reply("Here's how close I am to getting annoyed at you:", { embed: embed}).then(function() {
            message.channel.stopTyping();
        });
    }
}

module.exports = {
    name: "Spam",
    constructor: function(discordClient, commandEmitter, constants) {
        client = discordClient;
        consts = constants;

        commandEmitter.on('startup', startup);
        commandEmitter.on('newMessage', newMessage);
        commandEmitter.on('processCommand', processCommand);
    },
    destructor: function(commandEmitter) {
        commandEmitter.removeListener('startup', startup);
        commandEmitter.removeListener('newMessage', newMessage);
        commandEmitter.removeListener('processCommand', processCommand);
    },
    availableCommands: {
        general: {
            modCommands: [
                "spamctl"
            ],
            commands: [
                "spamdata"
            ]
        }
    },
    acquireHelp: function(helpCmd) {
        var help = {};

        switch (helpCmd) {
            case "spamctl":
                help.title = "mod:spamctl";
                help.usageText = "mod:spamctl on|off";
                help.helpText = "Switches spam control on this server";
                help.param1 = "Either `on` or `off`.";
                break;
            case "spamdata":
                help.title = "am:spamdata";
                help.helpText = "Queries spam data for current user";
                break;
        }

        return help;
    }
}