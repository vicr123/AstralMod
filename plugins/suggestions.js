/****************************************
 * 
 *   Suggestions: Plugin for AstralMod that lets users make suggestions
 *   Copyright (C) 2018 John Tur
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

var client;
var consts;
const Discord = require('discord.js');

function processCommand(message, isMod, command) {
    if(!command.startsWith("suggest")) return;

    if (settings.guilds[message.guild.id].suggestions == null) {
        message.reply("Suggestions are not enabled on this server.");
        return;
    }

    message.reply(":arrow_right: I've sent you a DM with further instructions.");
    message.author.send("Type in your suggestion here and send it to me as a message:").then(_ => {

        let collector = message.author.dmChannel.createMessageCollector(f => f.author.id == message.author.id);
        collector.on('collect', coll => {
            collector.stop();
            awaitUserConfirmation({
                title: "Sending suggestion",
                msg: `I've got your suggestion and will send it to ${message.guild.name}.`,
                msgOnSuccess: "Ok, I sent your suggestion.",
                msgOnFail: "Alright, scratch that.",
                channel: message.channel,
                author: message.author,
            }).then(() => {
                let embed = new Discord.RichEmbed();
                embed.setTitle("New Suggestion");
                embed.setColor("#79BAEC");
                embed.setDescription(coll.content);
                embed.setTimestamp();
                embed.setFooter("From " + message.author.username, message.author.avatarURL);
                message.guild.channels.get(settings.guilds[message.guild.id].suggestions).send(embed);
            }).catch(() => {
                message.reply("🚫 ERROR: That didn't work.");
            });
        });
    }).catch(err => log(err, logType.critical));
}

module.exports = {
    name: "Suggestions",
    constructor: function(discordClient, commandEmitter, constants) {
        client = discordClient;
        consts = constants;

        commandEmitter.on('processCommand', processCommand);
    },
    destructor: function(commandEmitter) {
        commandEmitter.removeListener('processCommand', processCommand);
    },
    availableCommands: {
        general: {
            commands: [
                "suggest"
            ],
            modCommands: [
                
            ],
            hiddenCommands: [

            ]
        }
    },
    acquireHelp: function(helpCmd, message) {
        var help = {};

        switch (helpCmd) {
            case "suggest":
                help.title = "am:suggest";
                help.usageText = "am:suggest";
                help.helpText = "Sends a suggestino to the server.";
                help.remarks = "";
                break;
        }

        return help;
    }
}
