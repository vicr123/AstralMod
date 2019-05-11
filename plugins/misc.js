/****************************************
 * 
 *   Miscellaneous: Plugin for AstralMod that contains miscellaneous commands
 *   Copyright (C) 2019 Victor Tran, John Tur
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

function obtainPic(user, channel, $) {
    let embed = new Discord.RichEmbed();

    embed.setAuthor(user.tag, user.displayAvatarURL);
    embed.setTitle($("PIC_PROFILE_PICTURE"));
    embed.setImage(user.displayAvatarURL);
    embed.setColor(consts.colors.done);
    channel.send(embed);
}

function processCommand(message, isMod, command, options) {
    let $ = _[options.locale];

    if (command == "pic") {
        obtainPic(message.author, message.channel, $);
    } else if (command.startsWith("pic ")) {
        var user = command.substr(4);
        var users = parseUser(user, message.guild);

        if (users.length == 0) {
            message.reply($("PIC_NO_RESULTS"));
        } else {
            obtainPic(users[0], message.channel, $);
        }
    } else if (command.startsWith("setunit ")) {
        let units = command.substr(8);
        
        if (settings.users[message.author.id] == null) {
            settings.users[message.author.id] = {};
        }

        if (units.toLowerCase() === "metric") {
            settings.users[message.author.id].units = "metric";
            message.reply($("SETUNIT_METRIC"));
        } else if (units.toLowerCase() === "imperial") {
            settings.users[message.author.id].units = "imperial";
            message.reply($("SETUNIT_IMPERIAL"));
        } else if (units.toLowerCase() === "12" || units.toLowerCase() === "12h" || units.toLowerCase() === "12hr") {
            settings.users[message.author.id].timeunit = "12h";
            message.reply($("SETUNIT_12"));
        } else if (units.toLowerCase() === "24" || units.toLowerCase() === "24h" || units.toLowerCase() === "24hr") {
            settings.users[message.author.id].timeunit = "24h";
            message.reply($("SETUNIT_24"));
        } else {
            throw new UserInputError($("SETUNIT_INVALID_UNIT"));
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
            embed.setColor(consts.colors.info);
            embed.setFooter($("SINFO_GUILDID", {id:g.id}));
            embed.setDescription($("SINFO_SERVER_INFORMATION"));
            {
                //let msg = "**" + tr("Server Created") + "** " + translator.localDate(g.createdAt, "default", true) + "\n";
                let msg = $("SINFO_SERVER_CREATED", {createdat:{date:g.createdAt, h24: options.h24, offset: options.offset }}) + "\n";
    
                if (g.joinedAt.getTime() == 0) {
                    msg += $("SINFO_AM_JOINED", {joinedat: $("SINFO_INVALID_JOIN_DATE")});
                } else {
                    msg += $("SINFO_AM_JOINED", {joinedat: {date:g.joinedAt, h24: options.h24, offset: options.offset}});
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

                if (numSurplus > 0)
                    msg += "\n + " + $("SINFO_SURPLUS_ROLES", {count: numSurplus});
    
                embed.addField($("SINFO_ROLES"), msg);
            }
    
            {
                let msg;
                switch (g.explicitContentFilter) {
                    case 0:
                        msg = $("SINFO_NSFW_ALLOWED");
                        break;
                    case 1:
                        msg = $("SINFO_NSFW_ROLE_CHANNEL");
                        break;
                    case 2:
                        msg = $("SINFO_NSFW_CHANNEL");
                }

                if (!g.me.hasPermission("ADMINISTRATOR")) {
                    msg += $("SINFO_LACKPERM_ADMINISTRATOR");
                }
                if (!g.me.hasPermission("MANAGE_MESSAGES")) {
                    msg += $("SINFO_LACKPERM_MANAGE_MESSAGES");
                }
                if (!g.me.hasPermission("KICK_MEMBERS")) {
                    msg += $("SINFO_LACKPERM_KICK");
                }
                if (!g.me.hasPermission("BAN_MEMBERS")) {
                    msg += $("SINFO_LACKPERM_BAN");
                }
                if (!g.me.hasPermission("MANAGE_NICKNAMES")) {
                    msg += $("SINFO_LACKPERM_MANAGE_NICKNAME");
                }
    
                embed.addField($("SINFO_ALERTS"), msg);
            }
    
            messageToEdit.edit(embed);
        });
    } else if (command.startsWith("calc ")) {
        let expr = command.substr(5);

        let calcProcess;
        if (consts.config.calcProcess == null) {
            calcProcess = "/usr/bin/thecalculator";
        } else {
            calcProcess = consts.config.calcProcess;
        }

        require('child_process').execFile(calcProcess, [
            "-e",
            expr
        ], {
            env: {
                "LANG": options.locale,
                "LANGUAGE": options.locale
            }
        }, function(err, stdout, stderr) {
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
                    embed.setAuthor("theCalculator", "https://raw.githubusercontent.com/vicr123/contemporary-icons/master/apps/16/accessories-calculator.svg");
                    embed.setColor(consts.colors.done);
                    //embed.setFooter(tr("Guild ID:") + " " + g.id);
                    embed.setDescription($("CALC_DESC"));
                    
                    for (let key in out) {
                        let parts = out[key].split(":");

                        if (key == out.length - 1) {
                            embed.addField(parts[0].trim(), ":large_orange_diamond: " + parts[1].trim(), true);
                        } else {
                            embed.addField(parts[0].trim(), parts[1].trim(), true);
                        }
                    }

                    message.reply($("CALC_RESULTS"), {embed: embed});
                }
            } else {
                if (out.length == 1) {
                    message.reply($("CALC_ANSWER_IS") + " " + stdout);
                } else {
                    let embed = new Discord.RichEmbed("calculation");
                    embed.setAuthor("theCalculator", "https://vicr123.com/images/thecalculator.svg");
                    embed.setColor(consts.colors.done);
                    //embed.setFooter(tr("Guild ID:") + " " + g.id);
                    embed.setDescription($("CALC_DESC"));
                    
                    for (let key in out) {
                        let parts = out[key].split(":");
                        embed.addField(parts[0].trim(), parts[1].trim(), true);
                    }

                    message.reply($("CALC_RESULTS"), {embed: embed});
                }
            }
        });
    } else if (command.startsWith("graph ")) {
        let expr = command.substr(6);

        sendPreloader($("GRAPH_PLOTTING"), message.channel).then(messageToEdit => {
            let calcProcess;
            if (consts.config.calcProcess == null) {
                calcProcess = "/usr/bin/thecalculator";
            } else {
                calcProcess = consts.config.calcProcess;
            }

            let amArgs = expr.split(" ");

            let args = [
                "-g",
            ]

            let argDefs = [
                "--cx",
                "--cy",
                "--sx",
                "--sy"
            ];

            for (let arg of argDefs) {
                if (amArgs.includes(arg)) {
                    let argIndex = amArgs.indexOf(arg);
                    if (amArgs.length >= argIndex + 1) {
                        args.push(arg);
                        args.push(amArgs[argIndex + 1]);

                        amArgs.splice(argIndex, 2);
                    }
                }
            }

            args.push("--");
            args.push("500");
            args.push("500");

            for (let e of amArgs) {
                args.push(e);
            }

            require('child_process').execFile(calcProcess, args, {
                env: {
                    "LANG": options.locale,
                    "LANGUAGE": options.locale
                },
                encoding: "buffer"
            }, function(err, stdout, stderr) {
                if (err) {
                    messageToEdit.edit($("GRAPH_ERROR", {emoji: ":large_orange_diamond:"}));
                } else {
                    let embed = new Discord.RichEmbed();
                    embed.attachFile(new Discord.Attachment(stdout, "graph.png"));
                    embed.setAuthor("theCalculator", "https://vicr123.com/images/thecalculator.svg");
                    embed.setColor(consts.colors.none);
                    embed.setDescription($("GRAPH_DESC"));
                    embed.setImage("attachment://graph.png");
                    message.reply($("GRAPH_RESULTS"), {embed: embed}).then(function(message) {
                        messageToEdit.delete();
                    });
                }
            });
        });
        
    } else if (command == "tr") {
        let embed = new Discord.RichEmbed();
        embed.setColor(consts.colors.done);
        let str = ""

        translate.getLanguages({ui: options.locale.substring(0, 2)}, (err, res) => {
            let counter = 0;
            for (let [locale, lang] of Object.entries(res.langs).sort((f, s) => f[1].localeCompare(s[1]))){
                str += `\`${locale}\` — ${lang}\n`
                counter++;
                if (counter == 31) {
                    embed.addField("‍", str, true)
                    counter = 0;
                    str = "";
                }
            }

            embed.fields[embed.fields.length - 1].value += str;

            embed.fields[0].name = $("TRANSLATE_AVAILABLE_LANGUAGES")
            message.channel.send(embed);    
        })

    } else if (command.startsWith("tr ")) {
        sendPreloader($("TRANSLATE_TRANSLATING"), message.channel).then(function(message) {
            let words = command.substr(3);
            let args = words.split(" ");
            
            let toLang = options.locale.substring(0, 2);
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
                        try {
                            let embed = new Discord.RichEmbed();
                            if (res.code != 200) {
                                embed.setColor(consts.colors.fail);
                                embed.setTitle($("TRANSLATE_ERROR_TITLE"));
                                embed.setDescription($("TRANSLATE_ERROR_DESCRIPTION")),
                                embed.addField($("TRANSLATE_ERROR_DETAILS"), res.message);
    
                                message.edit(embed);
                                return;
                            }
    
                            embed.setAuthor($("TRANSLATE_TITLE"));
                            embed.setColor(consts.colors.done);
                            //embed.setFooter(tr("Guild ID:") + " " + g.id);
                            embed.setTitle($("TRANSLATE_POWERED_BY"));
                            embed.setURL("http://translate.yandex.com/");
    
                            embed.addField($("TRANSLATE_SOURCE", {fromLang: fromLang}), sourceText + "‍");
                            embed.addField($("TRANSLATE_TRANSLATED", {toLang: toLang}), res.text + "‍");
    
                            message.edit(embed);    
                        } catch (err) {
                            let embed = new Discord.RichEmbed();
                            embed.setColor(consts.colors.fail);
                            embed.setTitle($("TRANSLATE_ERROR_TITLE"));
                            embed.setDescription($("TRANSLATE_ERROR_DESCRIPTION")),
                            embed.addField($("TRANSLATE_ERROR_DETAILS"), err.message);

                            message.edit(embed);
                        }
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
    translatableName: "TITLE_MISC",
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
                "graph",
                "tr"
            ],
            modCommands: [
                
            ]
        }
    },
    acquireHelp: function(helpCmd, message, h$) {
        var help = {};

        switch (helpCmd) {
            case "pic":
                help.title = prefix(message.guild.id) + "pic";
                help.usageText = prefix(message.guild.id) + "pic user";
                help.helpText = h$("PIC_HELPTEXT");
                help.param1 = h$("PIC_PARAM1");
                break;
            case "setunit":
                help.title = prefix(message.guild.id) + "setunit";
                help.usageText = prefix(message.guild.id) + "setunit units";
                help.helpText = h$("SETUNIT_HELPTEXT");
                help.param1 = h$("SETUNIT_PARAM1");
                help.remarks = h$("SETUNIT_REMARKS", {prefix: prefix(message.guild.id)});
                break;
            case "sinfo":
                help.title = prefix(message.guild.id) + "sinfo";
                help.usageText = prefix(message.guild.id) + "sinfo";
                help.helpText = h$("SINFO_HELPTEXT");
                break;
            case "calc":
                help.title = prefix(message.guild.id) + "calc";
                help.usageText = prefix(message.guild.id) + "calc expression";
                help.helpText = h$("CALC_HELPTEXT");
                help.remarks = h$("CALC_REMARKS");
                break;
            case "graph":
                help.title = prefix(message.guild.id) + "graph";
                help.usageText = prefix(message.guild.id) + "graph expressions...";
                help.helpText = h$("GRAPH_HELPTEXT");
                help.remarks = h$("GRAPH_REMARKS");
                help.availableOptions = h$("GRAPH_AVAILABLEOPTIONS");
                break;
            case "tr":
                help.title = prefix(message.guild.id) + "tr";
                help.usageText = prefix(message.guild.id) + "tr [--from=language] [--to=language] phrase";
                help.helpText = h$("TR_HELPTEXT");
                help.param1 = h$("TR_PARAM1");
                help.param2 = h$("TR_PARAM2");
                help.param3 = h$("TR_PARAM3");
                break;
        }
        return help;
    }
}