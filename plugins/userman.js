/****************************************
 * 
 *   User Management: Plugin for AstralMod that gives information about users
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

const moment = require('moment');

//Variables for the deal command
/*var actionMember = {};
var actioningMember = {};
var actionStage = {};
var actionToPerform = {};*/
var actions = {};

function pollBans() {
    var date = new Date().getTime();
    for (key in settings.guilds) {
        let guildSetting = settings.guilds[key];
        if (guildSetting != null) {
            if (guildSetting.tempbans != null) {
                for (index in guildSetting.tempbans) {
                    let tempban = guildSetting.tempbans[index];
                    if (tempban.timeout < date) {
                        try {
                            let $$ = _[settings.guilds[key].locale];
                            //Unban user
                            client.guilds.get(key).unban(tempban.user, $$("GUILD_TEMPBAN_LIFTED_REASON"));

                            //Notify server staff
                            client.channels.get(guildSetting.botWarnings).send($$("GUILD_TEMPBAN_LIFTED", {emoji: ":asterisk:", user: `<@${tempban.user}>`}));
                        } catch (err) {
                            //Couldn't unban user
                        }

                        settings.guilds[key].tempbans.splice(index, 1);
                    }
                }
            }
        }
    }
}

let dealMessage = null;

function processDeal(message) {
    let $ = _[settings.users[message.author.id].locale];

    //Handle the deal command
    dealMessage.clearReactions();

    var msg = message.content;
    var member = actions[message.guild.id].actionMember;
    if (actions[message.guild.id].actionStage == 0) { //Select Action
        if (msg.toLowerCase() == $("DEAL_CANCEL").toLowerCase()) { //Cancel Action
            message.channel.send($("DEAL_CANCELLED", {emoji: ":gear:"}));
            member = null;
            actions[message.guild.id] = null;
            releaseInput(message.guild.id);
        } else if ((msg.toLowerCase() == $("DEAL_INTERROGATE_TEXT") || msg.toLowerCase() == $("DEAL_INTERROGATE_ABBREVIATION")) && ((consts.bnb && message.guild.id == consts.bnb.id) || (consts.wow && message.guild.id == consts.wow.id))) {
            if ((consts.bnb && message.guild.id == consts.bnb.id)) {
                member.addRole(member.guild.roles.get(consts.bnb.interrogationRole));
            } else if ((consts.wow && message.guild.id == consts.wow.id)) {
                member.addRole(member.guild.roles.get(consts.wow.interrogationRole));
            } 
            
            member.setVoiceChannel(member.guild.channels.get(member.guild.afkChannelID));
            message.channel.send($("DEAL_INTERROGATED", {emoji: ":gear:", user: getUserString(member)}));
            member = null;
            actions[message.guild.id] = null;
            releaseInput(message.guild.id);
        } else if ((msg.toLowerCase() == $("DEAL_JAIL_TEXT") || msg.toLowerCase() == $("DEAL_JAIL_ABBREVIATION")) && ((consts.bnb && message.guild.id == consts.bnb.id))) { //WoW has no jail
            if ((consts.bnb && message.guild.id == consts.bnb.id)) {
                member.addRole(member.guild.roles.get(consts.bnb.jailRole));
            }

            member.setVoiceChannel(member.guild.channels.get(member.guild.afkChannelID));
            message.channel.send($("DEAL_JAILED", {emoji: ":gear:", user: getUserString(member)}));
            member = null;
            actions[message.guild.id] = null;
            releaseInput(message.guild.id);
        } else if ((msg.toLowerCase() == $("DEAL_MUTE_TEXT") || msg.toLowerCase() == $("DEAL_MUTE_ABBREVIATION")) && ((consts.bnb && message.guild.id == consts.bnb.id) || (consts.wow && message.guild.id == consts.wow.id))) {
            var roleId;
            if ((consts.bnb && message.guild.id == consts.bnb.id)) {
                roleId = consts.bnb.jailRole;
            } else if ((consts.wow && message.guild.id == consts.wow.id)) {
                roleId = "431965501355327500";
            }
            
            if (member.roles.get(roleId)) {
                member.removeRole(member.roles.get(roleId));
                message.channel.send($("DEAL_UNMUTED", {emoji: ":gear:", user: getUserString(member)}));
                member = null;
                actions[message.guild.id] = null;
                releaseInput(message.guild.id);
            } else {
                member.addRole(member.guild.roles.get(roleId));
                message.channel.send($("DEAL_MUTED", {emoji: ":gear:", user: getUserString(member)}));
                member = null;
                actions[message.guild.id] = null;
                releaseInput(message.guild.id);
            }
        } else if ((msg.toLowerCase() == $("DEAL_KICK_TEXT") || msg.toLowerCase() == $("DEAL_KICK_ABBREVIATION"))) {
            actions[message.guild.id].actionStage = 1;
            message.channel.send($("DEAL_KICK_REASON", {emoji: ":gear:", user: getUserString(member)}));
            actions[message.guild.id].actionToPerform = "kick";
        } else if ((msg.toLowerCase() == $("DEAL_BAN_TEXT") || msg.toLowerCase() == $("DEAL_BAN_ABBREVIATION"))) {
            actions[message.guild.id].actionStage = 1;
            message.channel.send($("DEAL_BAN_REASON", {emoji: ":gear:", user: getUserString(member)}));
            actions[message.guild.id].actionToPerform = "ban";
        } else if ((msg.toLowerCase() == $("DEAL_NICK_TEXT") || msg.toLowerCase() == $("DEAL_NICK_ABBREVIATION"))) {
            actions[message.guild.id].actionStage = 1;
            message.channel.send($("DEAL_NICK_NAME", {emoji: ":gear:", user: getUserString(member)}));
            actions[message.guild.id].actionToPerform = "nick";
        } else if ((msg.toLowerCase() == $("DEAL_TEMPBAN_TEXT") || msg.toLowerCase() == $("DEAL_TEMPBAN_ABBREVIATION"))) {
            actions[message.guild.id].actionStage = 1;
            message.channel.send($("DEAL_TEMPBAN_TIME", {emoji: ":gear:", user: getUserString(member)}));
            actions[message.guild.id].actionToPerform = "tempban";
        } else {
            message.channel.send($("DEAL_UNKNOWN_COMMAND", {emoji: ":gear:"}));
            member = null;
            actions[message.guild.id] = null;
            releaseInput(message.guild.id);
        }
        message.delete().catch(function() {
                logPromiseRejection(message, "messageDelete");
        });
    } else if (actions[message.guild.id].actionStage == 1) {
        if (msg.toLowerCase() == $("DEAL_CANCEL").toLowerCase()) {
            message.channel.send($("DEAL_CANCELLED", {emoji: ":gear:"}));
            member = null;
            actions[message.guild.id] = null;
            releaseInput(message.guild.id);
        } else if (actions[message.guild.id].actionToPerform == "kick") {
            let kickFunction = function() {
                member.kick(msg).then(function(member) {
                    message.channel.send($("DEAL_KICK_SUCCESS", {emoji: ":gear:", user: getUserString(member)}));
                    member = null;
                    actions[message.guild.id] = null;
                    releaseInput(message.guild.id);
                }).catch(function() {
                    message.channel.send($("DEAL_KICK_FAILED", {emoji: ":gear:", user: getUserString(member)}));
                    member = null;
                    actions[message.guild.id] = null;
                    releaseInput(message.guild.id);
                });
            }

            member.send($("DEAL_KICK_MESSAGE", {emoji: ":arrow_backward:", guild: `**${message.guild.name}**`, reason: `\`\`\`${msg}\`\`\``, smiley: ":slight_smile:"}))
                .then(kickFunction).catch(kickFunction);
        } else if (actions[message.guild.id].actionToPerform == "ban") {
            if (banDescriptor[message.guild.id] == null) {
                banDescriptor[message.guild.id] = {};
            }

            banDescriptor[message.guild.id][member.user.id] = {
                author: message.author,
                reason: msg
            };

            let banFunction = function() {
                member.ban(msg).then(function(member) {
                    message.channel.send($("DEAL_BAN_SUCCESS", {emoji: ":gear:", user: getUserString(member)}));
                    member = null;
                    actions[message.guild.id] = null;
                    releaseInput(message.guild.id);
                }).catch(function() {
                    message.channel.send($("DEAL_BAN_FAILED", {emoji: ":gear:", user: getUserString(member)}));
                    member = null;
                    actions[message.guild.id] = null;
                    releaseInput(message.guild.id);
                });
            }

            member.send($("DEAL_BAN_MESSAGE", {emoji: ":rewind:", guild: `**${message.guild.name}**`, reason: `\`\`\`${msg}\`\`\``, smiley: ":slight_smile:"}))
                .then(banFunction).catch(banFunction);
        } else if (actions[message.guild.id].actionToPerform == "tempban") {
            let timeToParse = msg.toLowerCase();
            var time = parseTime(timeToParse);
            if (isNaN(time)) {
                message.channel.send($("DEAL_TEMPBAN_TIME_INVALID", {emoji: ":gear:"}));                
            } else {
                var endDate = moment().add(time, 'seconds')
                actions[message.guild.id].time = endDate;
                actions[message.guild.id].actionStage = 2;
                message.channel.send($("DEAL_TEMPBAN_REASON", {emoji: ":gear:", user: getUserString(member), duration: {duration: moment.duration(moment().diff(endDate))}, enddate: {date: endDate}}));
            }
        } else if (actions[message.guild.id].actionToPerform == "nick") {
            if (msg.toLowerCase() == "clear") {
                msg = "";
            }

            member.setNickname(msg).then(function(member) {
                message.channel.send($("DEAL_NICK_SUCCESS", {emoji: ":gear:", user: getUserString(member)}));
                member = null;
                actions[message.guild.id] = null;
                releaseInput(message.guild.id);
            }).catch(function() {
                message.channel.send($("DEAL_NICK_FAILED", {emoji: ":gear:", user: getUserString(member)}));
                member = null;
                actions[message.guild.id] = null;
                releaseInput(message.guild.id);
            });
        }
        message.delete().catch(function() {
            logPromiseRejection(message, "messageDelete");
        });
    } else if (actions[message.guild.id].actionStage == 2) {
        if (msg.toLowerCase() == $("DEAL_CANCEL").toLowerCase()) {
            message.channel.send($("DEAL_CANCELLED", {emoji: ":gear:"}));
            member = null;
            actions[message.guild.id] = null;
            releaseInput(message.guild.id);
        } else if (actions[message.guild.id].actionToPerform == "tempban") {
            //Send a message to member
            let banFunction = function() {
                member.ban(msg).then(function(member) {
                    let banObject = {
                        timeout: actions[message.guild.id].time,
                        user: member.user.id
                    };

                    if (settings.guilds[message.guild.id].tempbans == null) {
                        settings.guilds[message.guild.id].tempbans = [];
                    }
        
                    settings.guilds[message.guild.id].tempbans.push(banObject);

                    message.channel.send($("DEAL_TEMPBAN_SUCCESS", {emoji: ":gear:", user: getUserString(member)}));
                    member = null;
                    actions[message.guild.id] = null;
                    releaseInput(message.guild.id);
                }).catch(function() {
                    message.channel.send($("DEAL_TEMPBAN_FAILED", {emoji: ":gear:", user: getUserString(member)}));
                    member = null;
                    actions[message.guild.id] = null;
                    releaseInput(message.guild.id);
                });
            }
            member.send($("DEAL_TEMPBAN_MESSAGE", {emoji: ":rewind:", guild: `**${message.guild.name}**`, reason: `\`\`\`${msg}\`\`\``, smiley: ":slight_smile:", duration: {duration: moment.duration(moment().diff(actions[message.guild.id].time))}, enddate: {offset: settings.users[member.id].timezone, date: moment(actions[message.guild.id].time)}}))
                .then(banFunction).catch(banFunction);
        }
    }

    if (actions[message.guild.id] != null) {
        actions[message.guild.id].actionMember = member;
    }
}

function processCommand(message, isMod, command, options) {
    let locale = options.locale;
    let $ = _[options.locale];

    if (isMod) {
        if (command.startsWith("uinfo ")) {
            var user = command.substr(6);

            var index = 0;
            if (user.indexOf("--index") != -1) {
                //Extract index
                var indexArg = user.indexOf("--index");
                var number = user.indexOf(" ", indexArg);
                var numberEnd = user.indexOf(" ", number + 1);
                if (numberEnd == -1) {
                    numberEnd = user.length;
                }
                var ind = user.substring(number + 1, numberEnd);
                index = parseInt(ind);

                if (isNaN(index)) {
                    throw new UserInputError("Parameter index is not a number");
                }

                //Remove parameter from string
                if (numberEnd == user.length) {
                    user = user.substr(0, indexArg).trim();
                } else {
                    user = user.substr(0, indexArg) + user.substr(numberEnd + 1).trim();
                }
            }

            var users = parseUser(user, message.guild);
            if (users.length > 0) {
                uinfo(users[index], message.channel, locale, options.offset, options.h24, message.guild);
            } else {
                throw new CommandError("No user found with that name");
            }

            return true;
        }
    }

    if (command == "uinfo") {
        uinfo(message.author, message.channel, locale, options.offset, options.h24, message.member.guild);
        return true;
    } else if (command.startsWith("uinfo ")) {
        var user = command.substr(6);

        var index = 0;
        if (user.indexOf("--index") != -1) {
            //Extract index
            var indexArg = user.indexOf("--index");
            var number = user.indexOf(" ", indexArg);
            var numberEnd = user.indexOf(" ", number + 1);
            if (numberEnd == -1) {
                numberEnd = user.length;
            }
            var ind = user.substring(number + 1, numberEnd);
            index = parseInt(ind);

            if (isNaN(index)) {
                throw new UserInputError("Parameter index is not a number");
            }

            //Remove parameter from string
            if (numberEnd == user.length) {
                user = user.substr(0, indexArg).trim();
            } else {
                user = user.substr(0, indexArg) + user.substr(numberEnd + 1).trim();
            }
        }

        var users = parseUser(user, message.guild);
        if (users.length > 0) {
            uinfo(users[index], message.channel, locale, options.offset, options.h24);
        } else {
            throw new CommandError("No user found with that name");
            }

        return true;
    } else if (command == "find") {
        message.reply($("FIND_USAGE"));
    } else if (command.startsWith("find ")) {
        var query = command.substr(5);

        if (query == "my phone") {
            message.channel.send(getRandom($("FIND_IN_YOUR_POCKET"),
                                           $("FIND_ON_THE_TABLE"),
                                           $("FIND_AT_WORK"),
                                           $("FIND_RUN_OVER"),
                                           $("FIND_IN_BAG"),
                                           $("FIND_IN_BETWEEN_COUCH_CUSIONS")));
            return;
        } else if (query == "my iphone") {
            message.channel.send("https://icloud.com/#find");
            return;
        } else if (query == "my android" || query == "my android phone") {
            message.channel.send("https://www.google.com/android/find");
            return;
        } else if (query == "my keys") {
            message.channel.send(getRandom($("FIND_IN_BETWEEN_COUCH_CUSIONS", {emoji: ":couch:"}),
                                           $("FIND_ON_A_KEYRING", {emoji: ":key:"}),
                                           $("FIND_UNDER_THE_MATTRESS", {emoji: ":bed:"}),
                                           $("FIND_UNDER_FRONT_DOOR_MAT", {emoji: ":door:"}),
                                           $("FIND_IN_A_KEYHOLE", {emoji: ":door:"})));
            return;
        } else if (query == "victor something to do" || query == "me something to do" || query == "a cure for boredom") {
            message.channel.send(getRandom($("FIND_BOATING", {emoji: ":sailboat:"}),
                                           $("FIND_SKIING", {emoji: ":skier:"}),
                                           $("FIND_CODDING", {emoji: ":computer:"}),
                                           $("FIND_WALKING", {emoji: ":walking:"}),
                                           $("FIND_SINGING", {emoji: ":singer:"}),
                                           $("FIND_EATING_SUSHI", {emoji: ":sushi:"}),
                                           $("FIND_INSULTING_TATSUMAKI", {emoji: ":snake:"}),
                                           $("FIND_PLUCKING_FLOWERS", {emoji: ":sunflower:"})));
            return;
        }

        var searchResults = parseUser(query, message.guild);

        if (searchResults.length == 0) {
            throw new CommandError($("FIND_NO_USERS_FOUND"));
        } else {
            var reply = $("FIND_FOUND_PEOPLE") + "```";

            var currentNumber = 1;
            for (user of searchResults) {
                reply += parseInt(currentNumber) + ": " + user.tag + ": " + user.id + (user.bot ? ` [${$("FIND_BOT_TAG")}]` : "") + "\n";
                if (currentNumber == 10) {
                    reply += "\n" + $("FIND_FOUND_MORE", {amount: parseInt(searchResults.length - currentNumber) }) + "\n";
                    reply += $("FIND_NARROW_QUERY");
                    break;
                }
                currentNumber++;
            }
            reply += "```";
            message.channel.send(reply);
        }
        return true;
    } else if (command.startsWith("fetchuser ")) {
        var user = command.substr(10);
        client.fetchUser(user).then(function(dUser) {
            message.reply($("FETCHUSER_SUCCESS", {user: dUser.tag}));
        }).catch(function() {
            message.reply($("FETCHUSER_FAILURE"));
        });
        return true;
    } else if (command.startsWith("deal ") || command.startsWith("manage ")) {
        if (actions[message.guild.id] != null) {
            message.channel.send($("DEAL_ALREADY_DEALING", {emoji: ":no_entry_sign:", user: getUserString(actions[message.guild.id].actioningMember)}));
        } else {
            if (command.startsWith("deal")) {
                command = command.substr(5);
            } else if (command.startsWith("manage")) {
                command = command.substr(7);
            }
            var memberID = command.replace("<", "").replace(">", "").replace("@", "").replace("!", "");

            var users = parseUser(memberID, message.guild);
            if (users.length > 0) {
                var user = null;

                //Filter out members
                for (var i = 0; i < users.length; i++) {
                    if (message.guild.members.has(users[i].id)) {
                        user = users[i].id;
                        i = users.length;
                    }
                }

                if (user == null) {
                    throw new CommandError($("DEAL_USER_NOT_FOUND"));
                } else {
                    var member = message.guild.member(user);
                    if (member == null) {
                        throw new CommandError($("DEAL_INTERNAL_ERROR"));
                    } else {
                        if (member.highestRole.comparePositionTo(message.member.highestRole) >= 0) {
                            throw new CommandError($("DEAL_NO_PERMISSIONS"));
                        } else {
                            var canDoActions = false;
                            var msg = $("DEAL_STRING", 
                            {
                                emoji: ":gear:", 
                                user: getUserString(member),
                                cancel: `\`${$("DEAL_CANCEL")}\` `,
                                kick: (() => { 
                                    if (member.kickable) {
                                        canDoActions = true;
                                        return `\`${$("DEAL_KICK")}\` `;
                                    }
                                    return ""
                                })(),
                                ban: (() => { 
                                    if (member.bannable) {
                                        canDoActions = true;
                                        return `\`${$("DEAL_BAN")}\` `;
                                    }
                                    return ""
                                })(),
                                tempban: (() => { 
                                    if (member.bannable) {
                                        canDoActions = true;
                                        return `\`${$("DEAL_TEMPBAN")}\` `;
                                    }
                                    return ""
                                })(),
                                nick: (() => { 
                                    if (message.guild.me.highestRole.comparePositionTo(member.highestRole) > 0 && message.guild.me.hasPermission("MANAGE_NICKNAMES")) {
                                        canDoActions = true;
                                        return `\`${$("DEAL_NICK")}\` `;
                                    }
                                    return ""
                                })(),
                                
                                //TODO: Replace these with options
                                //Maybe for AM 3.1 :)

                                interrogate: (() => { 
                                    if (member.manageable && ((consts.wow && message.guild.id == consts.wow.id) || (consts.bnb && message.guild.id == consts.bnb.id))) {
                                        canDoActions = true;
                                        return `\`${$("DEAL_INTERROGATE")}\` `;
                                    }
                                    return ""
                                })(),
                                jail: (() => { 
                                    if (member.manageable && (consts.bnb && message.guild.id == consts.bnb.id)) {
                                        canDoActions = true;
                                        return `\`${$("DEAL_JAIL")}\` `;
                                    }
                                    return ""
                                })(),
                                mute: (() => { 
                                    if (member.manageable && ((consts.wow && message.guild.id == consts.wow.id) || (consts.bnb && message.guild.id == consts.bnb.id))) {
                                        canDoActions = true;
                                        return `\`${$("DEAL_MUTE")}\` `;
                                    }
                                    return ""
                                })(),

                            })
                            
                            if (canDoActions) {
                                let messageAuthor = message.author.id;
                                actions[message.guild.id] = {};
                                actions[message.guild.id].actionMember = member;
                                actions[message.guild.id].actioningMember = message.author;
                                actions[message.guild.id].actionStage = 0;
                                message.channel.send(msg).then(function(message) {
                                    dealMessage = message;
                                    captureInput(processDeal, message.guild.id, messageAuthor);
                                });
                            } else {
                                throw new CommandError($("DEAL_NO_ACTIONS"));
                            }
                        }
                    }
                }
            } else {
                throw new CommandError("No user found with that name");
            }
        }
        message.delete().catch(function() {
            logPromiseRejection(message, "messageDelete");
        });
        return true;
    }
}

var pollBan;
module.exports = {
    name: "Users",
    translatableName: "TITLE_USER",
    constructor: function(discordClient, commandEmitter, constants) {
        client = discordClient;
        consts = constants;

        commandEmitter.on('processCommand', processCommand);
        
        pollBan = setInterval(pollBans, 1000)
    },
    destructor: function(commandEmitter) {
        commandEmitter.removeListener('processCommand', processCommand);

        clearInterval(pollBans);
    },
    availableCommands: {
        general: {
            commands: [
                "uinfo",
                "find",
                "fetchuser"
            ],
            modCommands: [
                "deal"
            ]
        }
    },
    acquireHelp: function(helpCmd, message, h$) {
        var help = {};

        switch (helpCmd) {
            case "uinfo":
                help.title = prefix(message.guild.id) + "uinfo";
                help.usageText = prefix(message.guild.id) + "uinfo user";
                help.helpText = h$("UINFO_HELPTEXT");
                help.availableOptions = h$("UINFO_OPTION1");
                help.param1 = h$("UINFO_PARAM1");
                break;
            case "fetchuser":
                help.title = prefix(message.guild.id) + "fetchuser";
                help.usageText = prefix(message.guild.id) + "fetchuser [ID]";
                help.helpText = h$("FETCHUSER_HELPTEXT");
                help.param1 = h$("FETCHUSER_PARAM1");
                help.remarks = h$("FETCHUSER_REMARKS")
                break;
            case "find":
                help.title = prefix(message.guild.id) + "find";
                help.usageText = prefix(message.guild.id) + "find user";
                help.helpText = h$("FIND_HELPTEXT");
                help.param1 = h$("FIND_PARAM1");
                help.remarks = h$("FIND_REMARKS")
                break;
            case "deal":
                help.title = prefix(message.guild.id) + "deal";
                help.usageText = prefix(message.guild.id) + "deal user";
                help.helpText = h$("DEAL_HELPTEXT");
                help.param1 = h$("DEAL_PARAM1");
                break;
        }

        return help;
    }
}
