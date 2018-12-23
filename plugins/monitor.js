/****************************************
 *
 *   Monitor: Plugin for AstralMod that gives monitoring information about AstralMod
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
const moment = require('moment');

var pingMessage = null;
var pingDate = null;

function processCommand(message, isMod, command, options) {
    let $ = _[options.locale];
    if (command == "uptime") {
        message.reply($("UPTIME", {emoji: ":clock4:", time: { duration: moment.duration(client.uptime, "milliseconds"), settings: {trim: false} }}));
    } else if (command == "settingssize") {
        let stats;
        try {
            stats = fs.statSync("settings.json");
        } catch(err) { } // ignored

        message.reply($("SETTINGSSIZE", {bytes: stats["size"] == undefined ? JSON.stringify(settings).length * 2 : stats["size"]}));
    }
}

module.exports = {
    name: "Monitor",
    translatableName: "TITLE_MONITOR",
    constructor: function(discordClient, commandEmitter, constants) {
        client = discordClient;
        consts = constants;

        //commandEmitter.on('startup', startup);
        commandEmitter.on('processCommand', processCommand);
    },
    destructor: function(commandEmitter) {
        //commandEmitter.removeListener('startup', startup);
        commandEmitter.removeListener('processCommand', processCommand);
    },
    availableCommands: {
        general: {
            commands: [
                "uptime",
                "settingssize"
            ]
        }
    },
    acquireHelp: function(helpCmd, message, h$) {
        var help = {};

        switch (helpCmd) {
            case "uptime":
                help.title = prefix(message.guild.id) + "uptime";
                help.helpText = h$("UPTIME_HELPTEXT");
                break;
            case "settingssize":
                help.title = prefix(message.guild.id) + "settingssize";
                help.helpText = h$("SETTINGSSIZE_HELPTEXT");
                break;
        }

        return help;
    }
}
