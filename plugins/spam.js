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

function newMessage(message, options) {
    var checkSpam = true;
    let $ = _[options.locale];
    let $$ = _[options.glocale];

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

        if (message.content.startsWith("jx:") || message.content.startsWith("jxr:")) {
            checkSpam = false;
        }

        if (settings.guilds[message.guild.id].blocked[message.channel.id].indexOf("spam") != -1 || settings.guilds[message.guild.id].blocked.guild.indexOf("spam") != -1) {
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

         /** @type{String} */
        var messageText = message.content.toLowerCase();
        var regex = messageText.match(/<a?:.+:\d+>/g);

        if (messageText.length > 4 & regex != null && messageText.replace(regex[0], "").length > 4) { // Ignore custom emoji and short messages
            if (lastMessagesOfUser.includes(messageText)) {
                spamCountingUser++;

                if (nonSpamCountingUser > 0) {
                    nonSpamCountingUser--;
                }

                if (spamCountingUser >= 4) {
                    if (spamCountingUser == 10) {
                        if (client.channels.has(settings.guilds[message.guild.id].botWarnings)) {
                            client.channels.get(settings.guilds[message.guild.id].botWarnings).send($$("SPAM_GUILD_WARNING", {emoji: ":red_circle:", author: "<@" + message.author.id + ">", channel: message.channel.name, interpolation: {escapeValue: false}}));
                        } else {
                            log("Bot Warnings channel " + settings.guilds[message.guild.id].botWarnings + " not found", logType.critical);
                        }
                        message.reply($("SPAM_ENOUGH", {warningNo: spamCountingUser.toString()}));
                    } else if (spamCountingUser > 10) {

                    } else {
                        message.reply($("SPAM_WARNING", {warningNo: spamCountingUser.toString()}));
                    }
                    message.delete().catch(function() {
                        logPromiseRejection(message, "messageDelete");
                    });
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

function processCommand(message, isMod, command, options) {
    let $ = _[options.locale];
    if (isMod) {
        if (command.startsWith("spamctl ")) {
            var isOn = command.substr(8);
            if (isOn.toLowerCase() == $("SPAMCTL_ON_TEXT").toLowerCase()) {
                settings.guilds[message.guild.id].spamCtl = true;
                message.reply($("SPAMCTL_ON"));
                if (isOn.toLowerCase() == $("SPAMCTL_OFF_TEXT").toLowerCase()) {
                    settings.guilds[message.guild.id].spamCtl = false;
                message.reply($("SPAMCTL_OFF"));
            } else {
                message.reply($("SPAMCTL_ABOUT"));
            }
        } else if (command == "spamctl") {
            let replyStr;
            if (settings.guilds[message.guild.id].spamCtl) {
                replyStr = $("SPAMCTL_CURRENTLY_ON");
            } else {
                replyStr = $("SPAMCTL_CURRENTLY_OFF");
            }
            replyStr += "\n" + $("SPAMCTL_ABOUT", {prefix: prefix(message.guild.id)});
            message.reply(replyStr);
        }
    }

    if (command == "spamdata") {
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

        var embed = new Discord.RichEmbed;
        embed.setAuthor(message.member.displayName, message.author.displayAvatarURL);
        embed.addField($("SPAMDATA_DATA_TITLE"), `${$("SPAMDATA_DETECTED")} ${spamCountingUser}\n${$("SPAMDATA_FORGIVENESS")} ${nonSpamCountingUser}`, true);
        embed.setColor(consts.colors.info);

        message.reply($("SPAMDATA_TITLE"), {embed: embed});
    }
}

module.exports = {
    name: "Spam",
    translatableName: "TITLE_SPAM",
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
    acquireHelp: function(helpCmd, message, h$) {
        var help = {};
        let $ = _[settings.users[message.author.id].locale];

        switch (helpCmd) {
            case "spamctl":
                help.title = prefix(message.guild.id) + "spamctl";
                help.usageText = prefix(message.guild.id) + `spamctl ${$("SPAMCTL_ON_TEXT")}|${$("SPAMCTL_OFF_TEXT")}`;
                help.helpText = h$("SPAMCTL_HELPTEXT");
                help.param1 = h$("SPAMCTL_PARAM1");
                break;
            case "spamdata":
                help.title = prefix(message.guild.id) + "spamdata";
                help.helpText = h$("SPAMDATA_HELPTEXT");
                break;
        }

        return help;
    }
}
