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

var currentGuild = 0;

var exec = require('child_process').exec;

function exit() {
    releaseInput(currentGuild);
    currentGuild = 0;
    return "Exited Arbitrary Code Execution mode.";
}

function serialise(object) {
    let m = "";

    switch (typeof(object)) {
        case "object":
            if (Promise.resolve(object) == object) {
                m = "[unresolved promise]";
                break;
            } else {
                for (key in object) {
                    m += "`" + key + "`: " + typeof(object[key]) + "\n";
                }
            }
            break;
        case "array":
            m += "[\n";
            for (key in array) {
                m += "    `" + typeof(ojb   [key]) + "`\n";
            }
            m += "]"
            break;
        case "function":
            m = "```js\n" + String(object) + "```";
            break;
        default:
            m = String(object);
    }
    return m;
}

function processEval(message) {
    try {
        let forceOutput = false;
        let command = message.content;
        if (command.startsWith("$")) {
            command = command.substr(1);
            forceOutput = true;
        }
        let ret = eval(command);
        let type = typeof(ret);
        let m = serialise(ret);

        if (m == "") {
            m = "[no return value]";
        }

        if ((m.length > 500 || m.split("\n").length > 5) && !forceOutput) {
            m = "[" + type + " output suppressed]";
        }

        let splitOptions = {};
        if (m.startsWith("```js")) {
            splitOptions.append = "```";
            splitOptions.prepend = "```js\n";
        }

        message.channel.send(m, {
            split: splitOptions
        }).then(function(message) {
            if (Promise.resolve(ret) == ret) {
                ret.then(function() {
                    let edit = "[resolved promise:\n";
                    for (key in arguments) {
                        edit += "**" + key + "**:\n" + serialise(arguments[key]) + "\n";
                    }
                    edit += "\n]"

                    if ((edit.length > 500 || edit.split("\n").length > 5) && !forceOutput) {
                        edit = "[promise output suppressed]";
                    }

                    message.edit(edit);
                }).catch(function(err) {
                    message.edit("[promise: :large_orange_diamond: " + err.message + "]")  
                });
            }
        });
    } catch (err) {
        message.channel.send(":large_orange_diamond: " + err.message);
    }
}

function processCommand(message, isMod, command) {
    if (command == "exec") {
        if (message.author.id == "278805875978928128") {
            captureInput(processEval, message.guild.id, message.author.id);

            if (currentGuild != 0) {
                exit();
            }

            currentGuild = message.guild.id;
            message.reply("Welcome to Arbitrary Code Execution mode. Any messages from here on will be interpreted as code. To exit, use the `exit()` command.");
        } else {
            message.reply("Arbitrary code execution mode is reserved.");
        }
    }
}

module.exports = {
    name: "Evaluation",
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
                
            ],
            hiddenCommands: [
                "exec"
            ]
        }
    },
    acquireHelp: function(helpCmd) {
        var help = {};

        switch (helpCmd) {
            case "eval":
                help.title = prefix + "eval";
                help.usageText = prefix + "pic user";
                help.helpText = "Returns the user's profile picture";
                help.param1 = "A user to retrieve the profile picture";
        }

        return help;
    }
}