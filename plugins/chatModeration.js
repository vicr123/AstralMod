/****************************************
 * 
 *   Chat Moderation: Plugin for AstralMod that moderates chat
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

function processCommand(message, isMod, command, options) {
    let $ = _[options.locale];
    if (isMod) {
        let blockId = message.channel.id;
        if (command.indexOf("--serverwide") != -1) {
            command = command.replace("--serverwide", "").trim();
            blockId = "guild";
        }

        if (command.startsWith("rm ")) {
            var num;
            var numString;
            var user = "";
            var args = command.substr(3);
            var split = args.indexOf(" ");

            var successfulDelete = function(messages) {
                var messagesDeleted = messages.size;

                if (messages.size != num && num != -1) {
                    if (messagesDeleted == 1) {
                        throw new CommandError($("RM_ITS_A_CATASTROPHE"));
                    } else {
                        message.channel.send($("RM_DELETED_FEWER", {count: messagesDeleted - 1, emoji: ":large_orange_diamond:"}));
                    }
                } else {
                    message.channel.send($("RM_DELETED", {count: messagesDeleted - 1, emoji:":white_check_mark:"}));
                }
            }

            var failedDelete = function(err) {
                let embed = new Discord.RichEmbed;
                embed.setColor("#EC7979");

                if (num >= 99) {
                    embed.addField($("ERROR_DETAILS"), $("RM_TOO_HIGH"));
                    embed.setTitle(getEmoji("userexception") + " " + $("ERROR_USER_INPUT"));
                    embed.setDescription($("ERROR_NOT_UNDERSTAND"));
                } else {
                    embed.setTitle(getEmoji("exception") + " " + $("ERROR_INTERNAL"));
                    embed.setDescription($("ERROR_INTERNAL_DESCRIPTION"));
                }
                
                message.channel.send(embed);
            }

            if (split == -1) {
                numString = args;

                if (numString == "all") {
                    num = -1;
                } else {
                    num = parseInt(numString);
                }
            } else {
                numString = args.substr(0, split);
                if (numString == "all") {
                    num = -1;
                } else {
                    num = parseInt(numString);
                }

                var userString = args.substr(split + 1);
                
                var users = parseUser(userString, message.guild);
                if (users.length > 0) {
                    user = null;

                    //Filter out members
                    for (var i = 0; i < users.length; i++) {
                        if (message.guild.members.has(users[i].id)) {
                            user = users[i].id;
                            i = users.length;
                        }
                    }

                    if (user == null) {
                        throw new CommandError($("RM_NO_USER"));
                    }
                } else {
                    throw new CommandError($("RM_NO_USER"));
                }
            }

            if (num != numString && num != -1) {
                throw new UserInputError($("RM_NAN"));
            } else if (user == "") {
                if (num == -1) {
                    throw new UserInputError($("RM_ALL_ABOUT"));
                } else {
                    num = num + 1; //Also remove the mod:rm command
                    message.channel.bulkDelete(num, true).then(successfulDelete).catch(failedDelete);
                }
            } else {
                if (num != -1) {
                    num = num + 1; //Also remove the mod:rm command
                }

                var messagesToDelete = [
                    message
                ]
                var userMember = message.guild.member(user);

                //Search for the previous num messages from user
                var messagesFound = 0;
                var forceStop = false;
                
                function nextBatch(allMessages) {
                    for (let [id, message] of allMessages) {
                        if (message.author.id == user) {
                            messagesToDelete.push(message);
                            messagesFound++;
    
                            if (messagesFound == num - 1) {
                                break;
                            }
                            if (messagesFound == 100) {
                                forceStop = true;
                                break;
                            }
                        }
                        lastMessage = id;

                        if (message.createdAt.getTime() - new Date().getTime() > 86400000) {
                            forceStop = true;
                            break;
                        }
                    }

                    if (messagesFound == num - 1 || forceStop || allMessages.size == 0) {
                        if (messagesFound.length == 0) {
                            message.channel.send($("RM_DELETED_NONE", {emoji: ":no_entry_sign:"}));
                        } else {
                            message.channel.bulkDelete(messagesToDelete, true).then(successfulDelete).catch(failedDelete);
                        }
                    } else {
                        message.channel.fetchMessages({limit: 50, before: lastMessage}).then(nextBatch).catch(function() {
                            message.channel.bulkDelete(messagesToDelete, true).then(successfulDelete).catch(failedDelete);
                        });
                    }
                }

                message.channel.fetchMessages({limit: 50, before: message.id}).then(nextBatch).catch(failedDelete);

                if (num != -1) {
                    message.reply($("RM_ALL_DOWNLOADING", {count: num - 1, user: getUserString(userMember)}));
                } else {
                    message.reply($("RM_ALL_DOWNLOADING_ALL", {user: getUserString(userMember)}));
                }
            }
        } else if (command == "chnk") {
            message.channel.send($("CHNK_ABOUT", {prefix: prefix(message.guild.id)}));
        } else if (command.startsWith("chnk ")) {
            //message.reply("This command is not ready yet.");
            let userStr = command.substr(5);
            let users = parseUser(userStr);

            if (users.length == 0) {
                throw new UserInputError($("CHNK_USER_NOT_FOUND"));
            }

            //Filter out members
            let user = null;
            for (var i = 0; i < users.length; i++) {
                if (message.guild.members.has(users[i].id)) {
                    user = message.guild.members.get(users[i].id);
                    i = users.length;
                }
            }

            if (user == null) {
                throw new UserInputError($("CHNK_USER_NOT_FOUND"));
            }

            if (user.highestRole.comparePositionTo(message.member.highestRole) >= 0) {
                throw new CommandError($("CHNK_MISSING_USER_PERMISSION"));
            }

            let nick = "";
            let possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()_+[]{};':\",./<>?`~";

            for (var i = 0; i < Math.floor(Math.random() * 31) + 1; i++) {
                nick += possible.charAt(Math.floor(Math.random() * possible.length));
            }

            user.setNickname(nick).then(() => { 
                message.delete();
                message.channel.send($("CHNK_SUCCESS", {emoji: ":abcd:", user: getUserString(user), name: nick.replace("`", "\`")}));    
            }).catch(() => message.reply($("CHNK_MISSING_BOT_PERMISSION", {user: getUserString(user)})));

        } else if (command == "block") {
            settings.guilds[message.guild.id].blocked[blockId].push("all");
            
            if (blockId == "guild") {
                message.channel.send($("BLOCK_ALL_BLOCKED_SERVER"));
            } else {
                message.channel.send($("BLOCK_ALL_BLOCKED_CHANNEL"));
            }
        } else if (command.startsWith("block ")) {
            let c = command.substr(6).trim().toLowerCase();

            if (c.indexOf(" ") != -1) {
                message.reply($("BLOCK_ABOUT"));
                return;
            }

            if (c == "block") {
                message.reply($("BLOCK_CANT_BLOCK_THIS"));
                return;
            }

            if (c == "unblock") {
                message.reply($("BLOCK_CANT_BLOCK_UNBLOCK"));
                return;
            }

            if (c == "log" && [settings.guilds[message.guild.id].chatLogs, 
                               settings.guilds[message.guild.id].botWarnings, 
                               settings.guilds[message.guild.id].memberAlerts].includes(message.channel.id)) {
                message.reply($("BLOCK_LOG_ALREADY_BLOCKED_IN_LOG_CHANNELS"));
                return;
            }

            if (blockId == "guild" && c == "spam") {
                message.reply($("BLOCK_CANT_BLOCK_SPAMCTL_SERVERWIDE", {prefix: prefix(message.guild.id)}));
                return;
            }

            if (blockId == "guild" && c == "log") {
                message.reply($("BLOCK_CANT_BLOCK_LOGS_SERVERWIDE", {prefix: prefix(message.guild.id)}));
                return;
            }

            if (settings.guilds[message.guild.id].blocked[blockId].includes(c)) {
                if (blockId == "guild") {
                    message.reply($("BLOCK_COMMAND_ALREADY_DISABLED_SERVER", {command: `\`${c}\``}));
                }
                if (c == "spam") {
                    message.reply($("BLOCK_SPAMCTL_ALREADY_DISABLED_CHANNEL"));
                } else if (c == "log") { 
                    message.reply($("BLOCK_LOG_ALREADY_DISABLED_CHANNEL"));
                } else {
                    message.reply($("BLOCK_COMMAND_ALREADY_DISABLED_CHANNEL", {command: `\`${c}\``}));
                }

                return;
            }

            settings.guilds[message.guild.id].blocked[blockId].push(c);

            if (blockId == "guild") {
                message.reply($("BLOCK_COMMAND_BLOCKED_SERVER", {command: `\`${c}\``}));
            } else {
                if (c == "spam") {
                    message.reply($("BLOCK_SPAMCTL_BLOCKED_CHANNEL"));
                } else if (c == "log") { 
                    message.reply($("BLOCK_LOG_BLOCKED_CHANNEL"));
                } else {
                    message.reply($("BLOCK_COMMAND_BLOCKED_CHANNEL", {command: `\`${c}\``}));
                }
            }
        } else if (command == "unblock") {
            settings.guilds[message.guild.id].blocked[blockId] = [];
            if (blockId == "guild")
                message.reply($("UNBLOCK_ALL_UNBLOCKED_SERVER"));
            else
                message.reply($("UNBLOCK_ALL_UNBLOCKED_CHANNEL"));
        } else if (command.startsWith("unblock ")) {
            let c = command.substr(8).trim().toLowerCase();

            if (c.indexOf(" ") != -1) {
                message.reply($("UNBLOCK_ABOUT"));
                return;
            }

            if (c == "log" && [settings.guilds[message.guild.id].chatLogs, 
                               settings.guilds[message.guild.id].botWarnings, 
                               settings.guilds[message.guild.id].memberAlerts].includes(message.channel.id)) {
                message.reply($("UNBLOCK_CANT_UNBLOCK_LOG_IN_LOG_CHANNELS"));
                return;
            }

            if (blockId == "guild" && c == "spam") {
                message.reply($("UNBLOCK_CANT_UNBLOCK_SPAMCTL_SERVERWIDE", {prefix: prefix(message.guild.id)}));
                return;
            }

            if (blockId == "guild" && c == "log") {
                message.reply($("UNBLOCK_CANT_UNBLOCK_LOGS_SERVERWIDE", {prefix: prefix(message.guild.id)}));
                return;
            }

            if (settings.guilds[message.guild.id].blocked[blockId].indexOf(c) == -1) {
                if (c == "spam") {
                    message.reply($("UNBLOCK_SPAMCTL_ALREADY_ENABLED_CHANNEL"));
                } else if (c == "log") { 
                    message.reply($("UNBLOCK_LOG_ALREADY_ENABLED_CHANNEL"));
                } else {
                    message.reply($("UNBLOCK_COMMAND_ALREADY_ENABLED_CHANNEL", {command: `\`${c}\``}));
                }    
                    return;
            }

            settings.guilds[message.guild.id].blocked[blockId].splice(settings.guilds[message.guild.id].blocked[blockId].indexOf(c), 1);

            if (blockId == "guild") {
                message.reply($("UNBLOCK_COMMAND_UNBLOCKED_SERVER", {command: `\`${c}\``}));
            } else {
                if (c == "spam") {
                    message.reply($("UNBLOCK_SPAMCTL_UNBLOCKED_CHANNEL"));
                } else if (c == "log") { 
                    message.reply($("UNBLOCK_LOG_UNBLOCKED_CHANNEL"));
                } else {
                    message.reply($("UNBLOCK_COMMAND_UNBLOCKED_CHANNEL", {command: `\`${c}\``}));
                }
            }
        }
    }
}

module.exports = {
    name: "Chat Moderation",
    translatableName: "TITLE_CHAT_MODERATION",
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
            modCommands: [
                "rm",
                "chnk",
                "block",
                "unblock"
            ],
        }
    },
    acquireHelp: function(helpCmd, message, h$) {
        var help = {};

        switch (helpCmd) {
            case "rm":
                help.title = prefix(message.guild.id) + "rm";
                help.usageText = prefix(message.guild.id) + "rm number [user]";
                help.helpText = h$("RM_HELPTEXT");
                help.param1 = h$("RM_PARAM1");
                help.param2 = h$("RM_PARAM2");
                break;
            case "chnk":
                help.title = prefix(message.guild.id) + "chnk";
                help.usageText = prefix(message.guild.id) + "chnk user";
                help.helpText = h$("CHNK_HELPTEXT");
                help.param1 = h$("CHNK_PARAM1");
                break;
            case "block":
                help.title = prefix(message.guild.id) + "block";
                help.usageText = prefix(message.guild.id) + "block [feature]";
                help.helpText = h$("BLOCK_HELPTEXT");
                help.param1 = h$("BLOCK_PARAM1");
                help.remarks = h$("BLOCK_REMARKS");
                help.availableOptions = h$("BLOCK_AVAILABLEOPTIONS");
                break;
            case "unblock":
                help.title = prefix(message.guild.id) + "unblock";
                help.usageText = prefix(message.guild.id) + "unblock [feature]";
                help.helpText = h$("UNBLOCK_HELPTEXT");
                help.param1 = h$("UNBLOCK_PARAM1");
                help.remarks = h$("UNBLOCK_REMARKS", {prefix: prefix(message.guild.id)});
                help.availableOptions = h$("UNBLOCK_AVAILABLEOPTIONS");
                break;
        }

        return help;
    }
}