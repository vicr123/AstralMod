/****************************************
 * 
 *   Suggestions: Plugin for AstralMod that lets users make server suggestions
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

function processCommand(message, isMod, command, options) {
    let $ = _[options.locale];
    let $$ = _[options.glocale];
    if(!command.startsWith("suggest")) return;

    if (settings.guilds[message.guild.id].suggestions == null) {
        message.reply($("SUGGEST_NOT_ENABLED"));
        return;
    }

    message.reply($("SUGGEST_FURTHER_INSTRUCTIONS", {emoji: ":arrow_right:"}));
    message.author.send($("SUGGEST_INSTRUCTIONS")).then(_ => {
        let collector = message.author.dmChannel.createMessageCollector(f => f.author.id == message.author.id);
        collector.on('collect', coll => {
            collector.stop();
            awaitUserConfirmation({
                title: $("SUGGEST_CONFIRMATION_TITLE"),
                msg: $("SUGGEST_CONFIRMATION_MESSAGE",  {guild: message.guild.name}),
                msgOnSuccess: $("SUGGEST_CONFIRMATION_SUCCESS"),
                msgOnFail: $("SUGGEST_CONFIRMATION_CANCEL"),
                channel: message.author.dmChannel,
                author: message.author,
                time: 10,
                locale: options.locale,
                doNotClear: true
            }).then(() => {
                let embed = new Discord.RichEmbed();
                embed.setAuthor($$("SUGGEST_SUGGESTION_TITLE", {user: message.author.username}), message.author.avatarURL);
                embed.setColor("#79BAEC");
                embed.setDescription(coll.content);
                embed.setTimestamp();
                message.guild.channels.get(settings.guilds[message.guild.id].suggestions).send(embed);
            }).catch((err) => {
                log(err, logType.warning);
                message.author.dmChannel.send($("SUGGEST_SUGGESTION_ERROR", {emoji: ":no_entry_sign:"}));
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
                help.helpText = "Sends a suggestion to the server.";
                break;
        }

        return help;
    }
}
