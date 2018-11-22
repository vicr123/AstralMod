/****************************************
 * 
 *   Miscellaneous: Plugin for AstralMod that contains miscellaneous commands
 *   Copyright (C) 2018 Victor Tran, John Tur
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
let translate;


function processCommand(message, isMod, command, options) {
    let $ = _[options.locale];

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
        } else if (units.toLowerCase() == "12h") {
            settings.users[message.author.id].timeunit = "12h";
            message.reply("Ok, we'll use 12 hours for your time from now on");
        } else if (units.toLowerCase() == "24h") {
            settings.users[message.author.id].timeunit = "24h";
            message.reply("Ok, we'll use 24 hours for your time from now on");
        } else {
            throw new UserInputError("Units need to be `metric`, `imperial`, `12h` or `24h`");
        }
    } else if (command == "sinfo") {
        let g = message.guild;
        let messageToEdit;
        sendPreloader($("SINFO_RETRIEVING_SERVER"), message.channel).then(function(message) {
            messageToEdit = message;
            return g.fetchMembers();
        }).then(function() {
            var embed = new Discord.RichEmbed("uinfo");
            embed.setAuthor(g.name, g.iconURL);
            embed.setColor("#00FF00");
            embed.setFooter($("SINFO_GUILDID", {id:g.id}));
            embed.setDescription($("SINFO_SERVER_INFORMATION"));
    
            {
                //let msg = "**" + tr("Server Created") + "** " + translator.localDate(g.createdAt, "default", true) + "\n";
                let msg = $("SINFO_SERVER_CREATED", {createdat:{date:g.createdAt, h24: options.h24}}) + "\n";
    
                if (g.joinedAt.getTime() == 0) {
                    msg += $("SINFO_AM_JOINED", {joinedat: $("SINFO_INVALID_JOIN_DATE")});
                } else {
                    msg += $("SINFO_AM_JOINED", {joinedat: {date:g.joinedAt, h24: options.h24}});
                }
    
                embed.addField($("SINFO_TIMESTAMPS"), msg);
            }
    
            {
                let botCount = g.members.filter(function(member) {
                    return member.user.bot;
                }).size;
                let msg;
                msg = $("SINFO_MEMBER_COUNT", {count: g.memberCount.toString()}); //Don't pluralise this; it'll look weird
                if (botCount > 0) {
                    msg += " " + $("SINFO_BOT_COUNT", {count:botCount});
                }
                msg += "\n";
                msg += $("SINFO_SERVER_OWNER", {owner:g.owner.user.tag}) + "\n";
    
                embed.addField($("SINFO_PEOPLE"), msg);
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
                msg += "\n + " + $("SINFO_SURPLUS_ROLES", {count: numSurplus});
    
                embed.addField($("SINFO_ROLES"), msg);
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
    
                embed.addField($("SINFO_ALERTS"), msg);
            }
    
            messageToEdit.edit(embed);
        });
    } else if (command.startsWith("calc ")) {
        let expr = command.substr(5);

        require('child_process').execFile("/usr/bin/thecalculator", [
            "-e",
            expr
        ], function(err, stdout, stderr) {
            let out = stdout.split("\n").filter(function(element) {
                if (element == "") {
                    return false;
                } else {
                    return true;
                }
            });

            if (err) {
                if (out.length == 1) {
                    message.reply(":large_orange_diamond: " + stdout);
                } else {
                    let embed = new Discord.RichEmbed("calculation");
                    embed.setAuthor("theCalculator", "https://vicr123.com/images/thecalculator.svg");
                    embed.setColor("#FF0000");
                    //embed.setFooter(tr("Guild ID:") + " " + g.id);
                    embed.setDescription(tr("Calculations"));
                    
                    for (let key in out) {
                        let parts = out[key].split(":");

                        if (key == out.length - 1) {
                            embed.addField(parts[0].trim(), ":large_orange_diamond: " + parts[1].trim(), true);
                        } else {
                            embed.addField(parts[0].trim(), parts[1].trim(), true);
                        }
                    }

                    message.reply("Here are your results", {embed: embed});
                }
            } else {
                if (out.length == 1) {
                    message.reply("The answer is " + stdout);
                } else {
                    let embed = new Discord.RichEmbed("calculation");
                    embed.setAuthor("theCalculator", "https://vicr123.com/images/thecalculator.svg");
                    embed.setColor("#00FF00");
                    //embed.setFooter(tr("Guild ID:") + " " + g.id);
                    embed.setDescription(tr("Calculations"));
                    
                    for (let key in out) {
                        let parts = out[key].split(":");
                        embed.addField(parts[0].trim(), parts[1].trim(), true);
                    }

                    message.reply("Here are your results", {embed: embed});
                }
            }
        });
    } else if (command.startsWith("tr ")) {
        sendPreloader("Translating...", message.channel).then(function(message) {
            let words = command.substr(3);
            let args = words.split(" ");
            
            let toLang = "en";
            let fromLang = "";
            for (let i = 0; i < args.length; i++) {
                let arg = args[i];
                if (arg.startsWith("--from=")) {
                    fromLang = arg.substr(7);
                    args.splice(i, 1);
                    i--;
                } else if (arg.startsWith("--to=")) {
                    toLang = arg.substr(5);
                    args.splice(i, 1);
                    i--;
                }
            }

            let sourceText = args.join(" ").trim();
            let doTranslate = function(fromLang, toLang) {
                let options = {};
                if (fromLang != "") options.from = fromLang;
                options.to = toLang;

                translate.translate(sourceText, options, function(err, res) {
                    let embed = new Discord.RichEmbed("translate");
                    embed.setAuthor("Translate");
                    embed.setColor("#00FF00");
                    //embed.setFooter(tr("Guild ID:") + " " + g.id);
                    embed.setTitle("Powered by Yandex.Translate");
                    embed.setURL("http://translate.yandex.com/");

                    embed.addField("Source Text (" + fromLang + ")", sourceText);
                    embed.addField("Translated Text (" + toLang + ")", res.text);

                    message.edit(embed);
                });
            }

            if (fromLang == "") {
                //Detect the language
                translate.detect(sourceText, function(err, res) {
                    doTranslate(res.lang, toLang);
                });
            } else {
                doTranslate(fromLang, toLang);
            }
        });
    }
}

module.exports = {
    name: "Miscellaneous",
    constructor: function(discordClient, commandEmitter, constants) {
        client = discordClient;
        consts = constants;
        translate = require('yandex-translate')(consts.keys.yandexKey);

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
                "sinfo",
                "calc",
                "tr"
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
                help.param1 = "Either `metric`, `imperial`, `24h`, or `12h`";
                break;
            case "sinfo":
                help.title = prefix + "sinfo";
                help.usageText = prefix + "sinfo";
                help.helpText = "Retrieves information about the current server";
                break;
            case "calc":
                help.title = prefix + "calc";
                help.usageText = prefix + "calc expression";
                help.helpText = "Invokes theCalculator and calculates an expression.";
                help.remarks = "Multiple expressions can be evaluated consecutively by seperating them with a colon.";
                break;
            case "tr":
                help.title = prefix + "tr";
                help.usageText = prefix + "tr [--from=language] [--to=language] phrase";
                help.helpText = "Translates a phrase between languages.";
                help.param1 = "The language to translate from. If ommitted, the language is automatically detected";
                help.param2 = "The language to translate to. If ommitted, defaults to English";
                help.param3 = "The phrase to translate";
                break;
        }

        return help;
    }
}