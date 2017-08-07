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

function processCommand(message, isMod, command) {
    if (isMod) {
        if (command.startsWith("rm ")) {
            var number = command.substr(3);
            var num = parseInt(number);
            if (num != number) {
                message.channel.send(":no_entry_sign: ERROR: That's not a number...");
            } else {
                num = num + 1; //Also remove the mod:rm command
                message.channel.bulkDelete(num).then(function () {
                    if (num == 2) {
                        message.channel.send(":white_check_mark: OK: I successfully deleted 1 message.");
                    } else if (num >= 99) {
                        message.channel.send(":no_entry_sign: ERROR: I am unable to delete more than 99 messages at one time.");
                    } else {
                        message.channel.send(":white_check_mark: OK: I successfully deleted " + number + " messages.");
                    }
                }).catch(function () {
                    if (num >= 99) {
                        message.channel.send(":no_entry_sign: ERROR: I am unable to delete more than 99 messages at one time.");
                    } else {
                        switch (Math.floor(Math.random() * 1000) % 3) {
                            case 0:
                                message.channel.send(':no_entry_sign: ERROR: That didn\'t work. You might want to try again.');
                                break;
                            case 1:
                                message.channel.send(':no_entry_sign: ERROR: Something\'s blocking us! You might want to try again.');
                                break;
                            case 2:
                                message.channel.send(':no_entry_sign: ERROR: Too much cosmic interference! You might want to try again.');
                                break;
                        }
                    }
                });
            }
        } else if (command == "panic") {
            message.channel.send('Panic Mode is coming soon. Stay Tuned!');
        } else if (command == "chnk") {
            message.channel.send("Usage: mod:chnk user. For more information, `mod:help chnk`.");
        } else if (command.startsWith("chnk ")) {
            
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
                help.title = "mod:rm";
                help.usageText = "mod:rm number";
                help.helpText = "Removes a number of messages";
                help.param1 = "The number of messages to remove";
                break;
            case "panic":
                help.title = "mod:panic";
                help.usageText = "mod:panic";
                help.helpText = "Switches on Panic Mode. In this mode, no one can send messages.";
                break;
            case "chnk":
                help.title = "mod:chnk";
                help.usageText = "mod:chnk user";
                help.helpText = "Sets a random nickname to user.";
                help.param1 = "- The User ID of the user to apply a new nickname to\n" +
                              "- Mention of the user to apply a new nickname to";
                break;
        }

        return help;
    }
}