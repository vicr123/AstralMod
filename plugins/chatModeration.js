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

function processCommand(message, isMod, command) {
    if (isMod) {
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
                        throw new CommandError("Catastrophic Failure");
                    } else {
                        message.channel.send(":large_orange_diamond: Only " + (messagesDeleted - 1) + " messages were deleted.");
                    }
                } else {
                    if (num == 2) {
                        message.channel.send(":white_check_mark: Deleted 1 message.");
                    } else {
                        message.channel.send(":white_check_mark: Deleted " + (messagesDeleted - 1) + " messages.");
                    }
                }
            }
            var failedDelete = function(err) {
                if (num >= 99) {
                    message.channel.send("", new Discord.RichEmbed({
                        fields: [
                            {
                                name: "Details",
                                value: "Only 99 messages can be deleted at once."
                            }
                        ],
                        title: "<:userexception:348796878709850114> User Input Error",
                        description: "AstralMod didn't understand what you were trying to say.",
                    }).setColor("#FF0000"));
                } else {
                    message.channel.send("", new Discord.RichEmbed({
                        fields: [
                            {
                                name: "Details",
                                value: "Catastrophic Failure"
                            }
                        ],
                        title: "<:userexception:348796878709850114> Command Error",
                        description: "AstralMod couldn't complete that command.",
                    }).setColor("#FF0000"));
                }
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
                        throw new CommandError("No user found with that name on this server");
                    }
                } else {
                    throw new CommandError("No user found with that name");
                }
            }

            if (num != numString && num != -1) {
                throw new UserInputError("Invalid number");
            } else if (user == "") {
                if (num == -1) {
                    throw new UserInputError("The \"all\" option can only be used when passing a user as the second argument");
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
                            message.channel.send(":no_entry_sign: No messages from that user found");
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
                    message.reply("Give us a minute to find " + (num - 1) + " messages from " + getUserString(userMember));
                } else {
                    message.reply("Give us a minute to find all the messages from " + getUserString(userMember) + " within the past day");
                }
            }
        } else if (command == "panic") {
            message.channel.send('Panic Mode is coming soon. Stay Tuned!');
        } else if (command == "chnk") {
            message.channel.send("Usage: mod:chnk user. For more information, `mod:help chnk`.");
        } else if (command.startsWith("chnk ")) {
            //message.reply("This command is not ready yet.");
            let userStr = command.substr(5);
            let users = parseUser(userStr);

            if (users.length == 0) {
                throw new UserInputError("Unknown User");
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
                throw new UserInputError("Unknown User");
            }

            if (user.highestRole.comparePositionTo(message.member.highestRole) >= 0) {
                throw new CommandError("You're not allowed to manage this user.");
            }

            let nick = "";
            let possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()_+[]{};':\",./<>?`~";

            for (var i = 0; i < Math.floor(Math.random() * 31) + 1; i++) {
                nick += possible.charAt(Math.floor(Math.random() * possible.length));
            }

            user.setNickname(nick);

            message.delete();
            message.channel.send(":abcd: I've changed the nickname of " + getUserString(user) + " to `" + nick.replace("`", "\`") + "`");
        }
    }
}

module.exports = {
    name: "Chat Moderation",
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
                
            ],
            modCommands: [
                "rm",
                "panic",
                "chnk"
            ]
        }
    },
    acquireHelp: function(helpCmd) {
        var help = {};

        switch (helpCmd) {
            case "rm":
                help.title = prefix + "rm";
                help.usageText = prefix + "rm number [user]";
                help.helpText = "Removes a number of messages";
                help.param1 = "The number of messages to remove, or `all` to remove up to 100 messages within the past day";
                help.param2 = "*Optional Parameter*\n" +
                              "The user to delete messages from";
                break;
            case "panic":
                help.title = prefix + "panic";
                help.usageText = prefix + "panic";
                help.helpText = "Switches on Panic Mode. In this mode, no one can send messages.";
                break;
            case "chnk":
                help.title = prefix + "chnk";
                help.usageText = prefix + "chnk user";
                help.helpText = "Sets a random nickname to user.";
                help.param1 = "- The User ID of the user to apply a new nickname to\n" +
                              "- Mention of the user to apply a new nickname to";
                break;
        }

        return help;
    }
}