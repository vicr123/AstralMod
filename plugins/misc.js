/****************************************
 * 
 *   Miscellaneous: Plugin for AstralMod that contains miscellaneous commands
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

var client;
var consts;
const Discord = require('discord.js');

function processCommand(message, isMod, command) {
    if (command.startsWith("pic ")) {
        var user = command.substr(4);
        var users = parseUser(user, message.guild);

        if (users.length == 0) {
            message.reply("No results");
        } else {
            message.reply(users[0].displayAvatarURL);
        }
    } else if (command.startsWith("setunit ")) {
        let units = command.substr(8);
        
        if (settings.users[message.author.id] == null) {
            settings.users[message.author.id] = {};
        }

        if (units.toLowerCase() == "metric") {
            settings.users[message.author.id].units = "metric";
            message.reply("Ok, we'll use the metric system for your units from now on");
        } else if (units.toLowerCase() == "imperial") {
            settings.users[message.author.id].units = "imperial";
            message.reply("Ok, we'll use the imperial system for your units from now on");
        } else {
            throw new UserInputError("Units need to be `metric` or `imperial`");
        }
    } else if (command == "sinfo") {
        let g = message.guild;
        let messageToEdit;
        sendPreloader("Retrieving server information...", message.channel).then(function(message) {
            messageToEdit = message;
            return g.fetchMembers();
        }).then(function() {
            var embed = new Discord.RichEmbed("uinfo");
            embed.setAuthor(g.name, g.iconURL);
            embed.setColor("#00FF00");
            embed.setFooter(tr("Guild ID:") + " " + g.id);
            embed.setDescription(tr("Server Information"));
    
            {
                let msg = "**" + tr("Server Created") + "** " + translator.localDate(g.createdAt, "default", true) + "\n";
    
                if (g.joinedAt.getTime() == 0) {
                    msg += "**" + tr("AstralMod Joined") + "** -∞... and beyond! Discord seems to be giving incorrect info... :(";
                } else {
                    msg += "**" + tr("AstralMod Joined") + "** " + translator.localDate(g.joinedAt, "default", true);
                }
    
                embed.addField(tr("Timestamps"), msg);
            }
    
            {
                let botCount = g.members.filter(function(member) {
                    return member.user.bot;
                }).size;
                let msg;
                msg = "**" + tr("Total Members") + "** " + g.memberCount + (botCount > 0 ? " (" + parseInt(botCount) + " bots)" : "") + "\n";
                msg += "**" + tr("Server Owner") + "** " + g.owner.user.tag + "\n";
    
                embed.addField(tr("People"), msg);
            }

            {
                let msg = "";
                let numCharacters = 0;
                let numSurplus = 0;
                for (let [id, role] of g.roles) {
                    if (numCharacters > 100) {
                        numSurplus++;
                    } else {
                        msg += role + " ";
                        numCharacters += role.name.length;
                    }
                }
                msg += "\n + " + parseInt(numSurplus) + " more";
    
                embed.addField(tr("Roles"), msg);
            }
    
            {
                let msg;
                switch (g.explicitContentFilter) {
                    case 0:
                        msg = "- This server does not filter explicit content.\n";
                        break;
                    case 1:
                        msg = "- This server prohibits explicit content, except in NSFW channels, unless you have a role.\n";
                        break;
                    case 2:
                        msg = "- This server prohibits explicit content, except in NSFW channels\n";
                }

                if (!g.me.hasPermission("ADMINISTRATOR")) {
                    msg += "- AstralMod is lacking the Administrator permission. Features and future functionality may be limited.\n";
                }
                if (!g.me.hasPermission("MANAGE_MESSAGES")) {
                    msg += "- AstralMod is lacking the Manage Messages permission. AstralMod will not be able to delete messages or control spam in this server.\n";
                }
                if (!g.me.hasPermission("KICK_MEMBERS")) {
                    msg += "- AstralMod is lacking the Kick permission. AstralMod will not be able to kick users in this server.\n";
                }
                if (!g.me.hasPermission("BAN_MEMBERS")) {
                    msg += "- AstralMod is lacking the Kick permission. AstralMod will not be able to ban users in this server.\n";
                }
                if (!g.me.hasPermission("MANAGE_NICKNAMES")) {
                    msg += "- AstralMod is lacking the Manage Nicknames permission. AstralMod will not be able to change nicknames in this server.\n";
                }
    
                embed.addField(tr("Alerts"), msg);
            }
    
            messageToEdit.edit(embed);
        });
    }
}

module.exports = {
    name: "Miscellaneous",
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
                "pic",
                "setunit",
                "sinfo"
            ],
            modCommands: [
                
            ]
        }
    },
    acquireHelp: function(helpCmd) {
        var help = {};

        switch (helpCmd) {
            case "pic":
                help.title = prefix + "pic";
                help.usageText = prefix + "pic user";
                help.helpText = "Returns the user's profile picture";
                help.param1 = "A user to retrieve the profile picture";
                break;
            case "setunit":
                help.title = prefix + "setunit";
                help.usageText = prefix + "setunit units";
                help.helpText = "Sets units used by AstralMod";
                help.param1 = "Either `metric` or `imperial`";
                break;
            case "sinfo":
                help.title = prefix + "sinfo";
                help.usageText = prefix + "sinfo";
                help.helpText = "Retrieves information about the current server";
                break;
        }

        return help;
    }
}