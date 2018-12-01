/****************************************
 * 
 *   Retrieve Settings: Plugin for AstralMod that sends the settings
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
const zlib = require('zlib');

function processCommand(message, isMod, command, options) {
    let $ = _[options.locale];
    if (command.startsWith("retrsettings")) {
        if (message.author.id === global.botOwner.id && command.indexOf("--user") == -1) {
            sendPreloader($("RETRSETTINGS_COMPRESSING_SETTINGS"), message.channel).then(function(messageToEdit) {
                //Compress the settings with gzip to save space
                zlib.gzip(JSON.stringify(settings), function(error, result) {
                    if (error) {
                        messageToEdit.edit($("RETRSETTINGS_PROBLEM_COMPRESSING"));
                    } else {
                        message.author.send($("RETRSETTINGS_COMPRESSING_SUCCESS"), {
                            files: [
                                {
                                    attachment: result,
                                    name: "settings.json.gz"
                                }
                            ]
                        });
                        messageToEdit.edit($("RETRSETTINGS_CHECK_FOR_COMPRESSIONS", {emoji: ":arrow_left:"}));
                    }
                });
            });
        } else {
            if (settings.users[message.author.id] == undefined) { 
                message.reply($("RETRSETTINGS_NO_SETTINGS"));
                return;
            }

            sendPreloader($("RETRSETTINGS_PREPARING_SETTINGS"), message.channel).then(function(messageToEdit) {
                message.author.send($("RETRSETTINGS_SETTINGS_RETRIEVED"), {
                    files: [
                        {
                            attachment: Buffer.from(JSON.stringify(settings.users[message.author.id], null, 4), "utf8"),
                            name: "settings.json"
                        }
                    ]
                });
                messageToEdit.edit($("RETRSETTINGS_CHECK_FOR_SETTINGS", {emoji: ":arrow_left:"}));
            });
        }
    }
}

module.exports = {
    name: "Settings Retrieval",
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
                "retrsettings"
            ],
            modCommands: [
                
            ],
            hiddenCommands: [
            ]
        }
    },
    acquireHelp: function(helpCmd, message) {
        var help = {};

        switch (helpCmd) {
            case "retrsettings":
                help.title = "am:retrsettings";
                help.usageText = "am:retrsettings";
                help.helpText = "Sends you your settings file in AstralMod's format";
                break;
        }

        return help;
    }
}
