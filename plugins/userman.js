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

function processCommand(message, isMod, command) {
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

            var users = parseUser(user);
            if (users.length > 0) {
                uinfo(users[index], message.channel, message.guild);
            } else {
                throw new CommandError("No user found with that name");
            }

            return true;
        }
    }

    if (command == "uinfo") {
        uinfo(message.author, message.channel, message.member.guild);
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

        var users = parseUser(user);
        if (users.length > 0) {
            uinfo(users[index], message.channel);
        } else {
            throw new CommandError("No user found with that name");
        }

        return true;
    } else if (command == "find") {
        message.reply("Usage: `" + prefix + "find user`. For more information, `" + prefix + "help find`");
    } else if (command.startsWith("find ")) {
        var query = command.substr(5);
        var searchResults = parseUser(query);

        if (searchResults.length == 0) {
            throw new CommandError("No users found");
        } else {
            var reply = "Here's who I found.```";

            var currentNumber = 0;
            for (user of searchResults) {
                reply += parseInt(currentNumber) + ": " + user.tag + ": " + user.id + (user.bot ? " [BOT]" : "") + "\n";
                if (currentNumber == 9) {
                    reply += "\n----- " + parseInt(searchResults.length - currentNumber) + " more. -----\n";
                    reply += "Please narrow your query.";
                    break;
                }
                currentNumber++;
            }
            reply += "```";
            message.channel.send(reply);
        }
        return true;
    }
}

module.exports = {
    name: "Users",
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
                "uinfo",
                "find"
            ],
            modCommands: [
                
            ]
        }
    },
    acquireHelp: function(helpCmd) {
        var help = {};

        switch (helpCmd) {
            case "uinfo":
                help.title = prefix + "uinfo";
                help.usageText = prefix + "uinfo user";
                help.helpText = "Acquire information about a user";
                help.options = [
                    "--index [num] Zero based index of user to query"
                ]
                help.param1 = "- The user of which to acquire information";
                break;
            case "find":
                help.title = prefix + "find";
                help.usageText = prefix + "find user";
                help.helpText = "Finds a user and returns their ID";
                help.param1 = "The user you want to find.";
                help.remarks = "AstralMod will search for users from all connected servers."
                break;
        }

        return help;
    }
}