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

function processCommand(message, isMod, command) {
    if (command.startsWith("pic ")) {
        var user = command.substr(4);
        var users = parseUser(user, message.guild);

        if (users.length == 0) {
            message.reply("No results");
        } else {
            message.reply(users[0].displayAvatarURL);
        }
    } else if (command.startsWith("setunit ")) {
        let units = command.substr(8);
        
        if (settings.users[message.author.id] == null) {
            settings.users[message.author.id] = {};
        }

        if (units.toLowerCase() == "metric") {
            settings.users[message.author.id].units = "metric";
            message.reply("Ok, we'll use the metric system for your units from now on");
        } else if (units.toLowerCase() == "imperial") {
            settings.users[message.author.id].units = "imperial";
            message.reply("Ok, we'll use the imperial system for your units from now on");
        } else {
            throw new UserInputError("Units need to be `metric` or `imperial`");
        }
    }
}

module.exports = {
    name: "Miscellaneous",
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
                "pic",
                "setunit"
            ],
            modCommands: [
                
            ]
        }
    },
    acquireHelp: function(helpCmd) {
        var help = {};

        switch (helpCmd) {
            case "pic":
                help.title = prefix + "pic";
                help.usageText = prefix + "pic user";
                help.helpText = "Returns the user's profile picture";
                help.param1 = "A user to retrieve the profile picture";
            case "setunit":
                help.title = prefix + "setunit";
                help.usageText = prefix + "setunit units";
                help.helpText = "Sets units used by AstralMod";
                help.param1 = "Either `metric` or `imperial`";
        }

        return help;
    }
}