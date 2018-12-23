/****************************************
 * 
 *   User Management: Plugin for AstralMod that gives information about users
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
                            //Unban user
                            client.guilds.get(key).unban(tempban.user, "Temporary Ban lifted");

                            //Notify server staff
                            client.channels.get(guildSetting.botWarnings).send(":asterisk: <@" + tempban.user + ">'s temporary ban has been lifted.");
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
    //Handle the deal command
    dealMessage.clearReactions();

    var msg = message.content;
    var member = actions[message.guild.id].actionMember;
    if (actions[message.guild.id].actionStage == 0) { //Select Action
        if (msg.toLowerCase() == "cancel") { //Cancel Action
            message.channel.send(':gear: Cancelled. Exiting action menu.');
            member = null;
            actions[message.guild.id] = null;
            releaseInput(message.guild.id);
        } else if ((msg.toLowerCase() == "interrogate" || msg.toLowerCase() == "i") && (message.guild.id == consts.bnb.id || message.guild.id == 287937616685301762 || message.guild.id == 305039436490735627)) {
            if (message.guild.id == consts.bnb.id) {
                member.addRole(member.guild.roles.get(consts.bnb.interrogationRole));
            } else if (message.guild.id == 287937616685301762) {
                member.addRole(member.guild.roles.get("319847521440497666"));
            } else if (message.guild.id == 305039436490735627) {
                member.addRole(member.guild.roles.get("326250571692769281"));
            }
            member.setVoiceChannel(member.guild.channels.get(member.guild.afkChannelID));
            message.channel.send(':gear: ' + getUserString(member) + " has been placed in interrogation.");
            member = null;
            actions[message.guild.id] = null;
            releaseInput(message.guild.id);
        } else if ((msg.toLowerCase() == "jail" || msg.toLowerCase() == "j") && (message.guild.id == consts.bnb.id || message.guild.id == 263368501928919040 || message.guild.id == 305039436490735627)) {
            if (message.guild.id == consts.bnb.id) {
                member.addRole(member.guild.roles.get(consts.bnb.jailRole));
            } else if (message.guild.id == 305039436490735627) {
                member.addRole(member.guild.roles.get("310196007919157250"));
            } else {
                member.addRole(member.guild.roles.get("267731524734943233"));
            }
            member.setVoiceChannel(member.guild.channels.get(member.guild.afkChannelID));
            message.channel.send(':gear: ' + getUserString(member) + " has been placed in jail.");
            member = null;
            actions[message.guild.id] = null;
            releaseInput(message.guild.id);
        } else if ((msg.toLowerCase() == "mute" || msg.toLowerCase() == "m") && (message.guild.id == consts.bnb.id || message.guild.id == 305039436490735627)) {
            var roleId;
            if (message.guild.id == consts.bnb.id) {
                roleId = consts.bnb.jailRole;
            } else if (message.guild.id == 305039436490735627) {
                roleId = "309883481024888842";
            }
            
            if (member.roles.get(roleId)) {
                member.removeRole(member.roles.get(roleId));
                message.channel.send(':gear: ' + getUserString(member) + " has been removed from time out.");
                member = null;
                actions[message.guild.id] = null;
                releaseInput(message.guild.id);
            } else {
                member.addRole(member.guild.roles.get(roleId));
                message.channel.send(':gear: ' + getUserString(member) + " has been placed on time out.");
                member = null;
                actions[message.guild.id] = null;
                releaseInput(message.guild.id);
            }
        } else if (msg.toLowerCase() == "kick" || msg.toLowerCase() == "k") {
            actions[message.guild.id].actionStage = 1;
            message.channel.send(":gear: Enter reason for kicking " + getUserString(member) + " or `cancel`.");
            actions[message.guild.id].actionToPerform = "kick";
        } else if (msg.toLowerCase() == "ban" || msg.toLowerCase() == "b") {
            actions[message.guild.id].actionStage = 1;
            message.channel.send(":gear: Enter reason for banning " + getUserString(member) + " or `cancel`.");
            actions[message.guild.id].actionToPerform = "ban";
        } else if (msg.toLowerCase() == "nick" || msg.toLowerCase == "nickname" || msg.toLowerCase() == "n") {
            actions[message.guild.id].actionStage = 1;
            message.channel.send(":gear: Enter new nickname for " + getUserString(member) + ". Alternatively type `clear` or `cancel`.");
            actions[message.guild.id].actionToPerform = "nick";
        } else if (msg.toLowerCase() == "tempban" || msg.toLowerCase() == "t") {
            actions[message.guild.id].actionStage = 1;
            message.channel.send(":gear: Enter time to ban " + getUserString(member) + " for, or `cancel`.");
            actions[message.guild.id].actionToPerform = "tempban";
        } else {
            message.channel.send(':gear: Unknown command. Exiting action menu.');
            member = null;
            actions[message.guild.id] = null;
            releaseInput(message.guild.id);
        }
        message.delete().catch(function() {
                logPromiseRejection(message, "messageDelete");
        });
    } else if (actions[message.guild.id].actionStage == 1) {
        if (msg.toLowerCase() == "cancel") {
            message.channel.send(':gear: Cancelled. Exiting action menu.');
            member = null;
            actions[message.guild.id] = null;
            releaseInput(message.guild.id);
        } else if (actions[message.guild.id].actionToPerform == "kick") {
            let kickFunction = function() {
                member.kick(msg).then(function(member) {
                    message.channel.send(':gear: ' + getUserString(member) + " has been kicked from the server.");
                    member = null;
                    actions[message.guild.id] = null;
                    releaseInput(message.guild.id);
                }).catch(function() {
                    message.channel.send(':gear: ' + getUserString(member) + " couldn't be kicked from the server. Exiting action menu");
                    member = null;
                    actions[message.guild.id] = null;
                    releaseInput(message.guild.id);
                });
            }

            member.send(":arrow_backward: You have been kicked from **" + message.guild.name + "** for the following reason:```\n" + msg + "```" + 
                getRandom("Come back once you've grown up.",
                          "You may re-enter, but it may be a good idea to step back for a bit.") + " :slight_smile:")
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
                    message.channel.send(':gear: ' + getUserString(member) + " has been banned from the server.");
                    member = null;
                    actions[message.guild.id] = null;
                    releaseInput(message.guild.id);
                }).catch(function() {
                    message.channel.send(':gear: ' + getUserString(member) + " couldn't be banned from the server. Exiting action menu.");
                    member = null;
                    actions[message.guild.id] = null;
                    releaseInput(message.guild.id);
                });
            }

            member.send(":rewind: You have been banned from **" + message.guild.name + "** for the following reason:```\n" + msg + "```Have a good day, and we hope never to see you again. :slight_smile:")
                .then(banFunction).catch(banFunction);
        } else if (actions[message.guild.id].actionToPerform == "tempban") {
            let timeToParse = msg.toLowerCase();
            let time = parseTime(timeToParse);
            if (isNaN(time)) {
                message.channel.send(":gear: You'll need to supply a time for this user to be banned for. For example, `5d` for five days, or `30m` for 30 minutes. Alternatively, type `cancel` to cancel the temporary ban.");                
            } else {
                let endDate = new Date().getTime() + time * 1000;
                actions[message.guild.id].time = endDate;
                actions[message.guild.id].actionStage = 2;
                message.channel.send(":gear: Enter reason for temporarily banning " + getUserString(member) + " for " + parseInt(time) + " seconds until " + new Date(endDate).toUTCString() + ", or `cancel`.");
            }
        } else if (actions[message.guild.id].actionToPerform == "nick") {
            if (msg.toLowerCase() == "clear") {
                msg = "";
            }
            
            member.setNickname(msg).then(function(member) {
                message.channel.send(':gear: ' + getUserString(member) + " has changed their nickname.");
                member = null;
                actions[message.guild.id] = null;
                releaseInput(message.guild.id);
            }).catch(function() {
                message.channel.send(':gear: ' + getUserString(member) + " couldn't have their nickname changed. Exiting action menu.");
                member = null;
                actions[message.guild.id] = null;
                releaseInput(message.guild.id);
            });
        }
        message.delete().catch(function() {
            logPromiseRejection(message, "messageDelete");
        });
    } else if (actions[message.guild.id].actionStage == 2) {
        if (msg.toLowerCase() == "cancel") {
            message.channel.send(':gear: Cancelled. Exiting action menu.');
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

                    message.channel.send(':gear: ' + getUserString(member) + " has been banned from the server. This ban will be lifted at " + new Date(actions[message.guild.id].time).toUTCString() + ".");
                    member = null;
                    actions[message.guild.id] = null;
                    releaseInput(message.guild.id);
                }).catch(function() {
                    message.channel.send(':gear: ' + getUserString(member) + " couldn't be banned from the server. Exiting action menu");
                    member = null;
                    actions[message.guild.id] = null;
                    releaseInput(message.guild.id);
                });
            }
            member.send(":rewind: You have been temporarily banned from **" + message.guild.name + "** for the following reason:```\n" + msg + "```Your ban will be lifted on " + new Date(actions[message.guild.id].time).toUTCString() + ". Have a good day. :slight_smile:")
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
            message.channel.send(':no_entry_sign: ERROR: ' + getUserString(actions[message.guild.id].actioningMember) + " is already managing another user.");
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
                    throw new CommandError("No user found with that name on this server");
                } else {
                    var member = message.guild.member(user);
                    if (member == null) {
                        throw new CommandError("An internal error was encountered.");
                    } else {
                        if (member.highestRole.comparePositionTo(message.member.highestRole) >= 0) {
                            throw new CommandError("You're not allowed to manage this user.");
                        } else {
                            var canDoActions = false;
                            var msg = ':gear: ' + getUserString(member) + ": `cancel` ";
                            let reactions = ["🇨"];
                            if (member.kickable) {
                                msg += '`(k)ick` ';
                                canDoActions = true;
                                reactions.push("🇰");
                            }
                            
                            if (member.bannable) {
                                msg += '`(b)an` `(t)empban` ';
                                canDoActions = true;
                                reactions.push("🇧");
                                reactions.push("🇹");
                            }

                            if (!member.highestRole.comparePositionTo(message.guild.me.highestRole) >= 0 && message.guild.me.hasPermission("MANAGE_NICKNAMES")) {
                                msg += '`(n)ick` ';
                                canDoActions = true;
                                reactions.push("🇳");
                            }
                            
                            if (message.guild.id == 287937616685301762 || message.guild.id == consts.bnb.id) {
                                msg += "`(i)nterrogate` ";
                                canDoActions = true;
                            }
                            
                            if (message.guild.id == consts.bnb.id || message.guild.id == 263368501928919040) {
                                msg += "`(j)ail` ";
                                canDoActions = true;
                            }
                            
                            if (message.guild.id == consts.bnb.id) {
                                msg += "`(m)ute` ";
                                canDoActions = true;
                            }
                            
                            if (canDoActions) {
                                let messageAuthor = message.author.id;
                                actions[message.guild.id] = {};
                                actions[message.guild.id].actionMember = member;
                                actions[message.guild.id].actioningMember = message.author;
                                actions[message.guild.id].actionStage = 0;
                                message.channel.send(msg).then(function(message) {
                                    dealMessage = message;
                                    captureInput(processDeal, message.guild.id, messageAuthor);

                                    for (reaction in reactions) {
                                        message.react(reactions[reaction]);
                                    }
                                    
                                    message.awaitReactions(function(reaction) {
                                        if (reaction.count > 1 && reaction.users.has(messageAuthor)) {
                                            return true;
                                        }
                                        return false;
                                    }, {
                                        max: 1
                                    }).then(function(reactions) {
                                        message.clearReactions();

                                        let msg = {};
                                        let reaction = reactions.first();
                                        if (reaction.emoji.name == "🇨") {
                                            msg.content = "c";
                                        } else if (reaction.emoji.name == "🇰") {
                                            msg.content = "k";
                                        } else if (reaction.emoji.name == "🇧") {
                                            msg.content = "b";
                                        } else if (reaction.emoji.name == "🇹") {
                                            msg.content = "t";
                                        } else if (reaction.emoji.name == "🇳") {
                                            msg.content = "n";
                                        }
                                        msg.guild = message.guild;
                                        msg.channel = message.channel;
                                        msg.delete = function() {
                                            return new Promise(function(resolve, reject) {
                                                resolve();
                                            });
                                        }
                                        processDeal(msg);
                                    });
                                });
                            } else {
                                throw new CommandError("No actions can be perfomed on this user.");
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
    acquireHelp: function(helpCmd, message) {
        var help = {};

        switch (helpCmd) {
            case "uinfo":
                help.title = prefix(message.guild.id) + "uinfo";
                help.usageText = prefix(message.guild.id) + "uinfo user";
                help.helpText = h$("UINFO_HELPTEXT");
                help.options = [
                    h$("UINFO_OPTION1")
                ]
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
