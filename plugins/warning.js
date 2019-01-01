/****************************************
 *
 *   Warnings: Plugin for AstralMod that manages warnings
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

const Discord = require('discord.js');
const moment = require('moment');
var client;
var consts;

var currentWarnings = {};

function processResponse(message) {
    releaseInput(message.guild.id);

    var tracker = currentWarnings[message.guild.id];
    currentWarnings[message.guild.id] = null;
    let $ = _[settings.users[tracker.warner.id].locale]

    if (message.content.toLowerCase() == "cancel") {
        message.channel.send($("WARN_CANCEL", {emoji: ":gear:"}));
    } else {
        var warnings = settings.guilds[message.guild.id].warnings;
        if (warnings == null) {
            warnings = {}
        }

        var userWarnings = warnings[tracker.user.id];
        if (userWarnings == null) {
            userWarnings = [];
        }

        var warningObject = {
            reason: message.content,
            warner: tracker.warner.id,
            timestamp: moment.utc()
        }
        userWarnings.push(warningObject);

        warnings[tracker.user.id] = userWarnings;
        settings.guilds[message.guild.id].warnings = warnings;
        message.channel.send(_[settings.users[tracker.user.id].locale]("WARN_WARNED", {warnee: `<@${tracker.user.id}>`, warner: getUserString(tracker.warner), warning: message.content, count: userWarnings.length}))
    }
    message.delete();
}

function processCommand(message, isMod, command, options) {
    let $ = _[options.locale];
    if (isMod) {
        if (command.startsWith("warn ")) {
            var user = command.substr(5);

            if (currentWarnings[message.guild.id] == null) {
                var users = parseUser(user, message.guild);
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
                        throw new CommandError($("WARN_NO_USER_FOUND"));
                    } else {
                        var member = message.guild.member(user);
                        captureInput(processResponse, message.guild.id, message.author.id);

                        var tracker = {
                            user: member,
                            warner: message.member
                        }
                        currentWarnings[message.guild.id] = tracker;

                        message.channel.send($("WARN_ENTER_REASON", {user: getUserString(client.users.get(user)), emoji: ":gear:"}));
                    }
                } else {
                    throw new CommandError($("WARN_NO_USER_FOUND"));
                }
            } else {
                
                throw new CommandError($("WARN_ALREADY_WARNING", {user: getUserString(currentWarnings[message.guild.id].warner)}));
            }
        } else if (command.startsWith("lswarn ")) {
            var user = command.substr(7);
            var users = parseUser(user, message.guild);
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
                    throw new CommandError($("LSWARN_COULDNT_FIND_USER"));
                } else {
                    var warnings = settings.guilds[message.guild.id].warnings;
                    if (warnings == null) {
                        warnings = {}
                    }

                    var userWarnings = warnings[user];
                    if (userWarnings == null) {
                        userWarnings = [];
                    }

                    if (userWarnings.length == 0) {
                        message.reply($("LSWARN_NO_WARNINGS", {user: getUserString(message.guild.member(user))}));
                        return;
                    }

                    var embed = new Discord.RichEmbed();
                    embed.setColor("#3C3C96");
                    embed.setTitle($("LSWARN_TITLE"));
                    embed.setDescription($("LSWARN_DESCRIPTION"))
                    for (index in userWarnings) {
                        var warning = userWarnings[index];

                        var warner = warning.warner;
                        if (message.guild.members.has(warning.warner)) {
                            warner = message.guild.member(warning.warner);
                        }

                        embed.addField($("LSWARN_WARNING_TITLE", {index: (parseInt(index) + 1)}), $("LSWARN_WARNING_INFO", {warning: warning.reason, timestamp: {date: warning.timestamp, h24: options.h24, offset: options.offset}, warner: warner, interpolation: {escapeValue: false}}), true);
                    }

                    message.channel.send("", {embed: embed});
                }
            } else {
                throw new CommandError($("LSWARN_COULDNT_FIND_USER"));
            }
        } else if (command.startsWith("rmwarn ")) {
            var args = command.substr(7);
            var split = args.indexOf(" ");
            var id = args.substr(0, split);
            var user = args.substr(split + 1);

            id = parseInt(id) - 1;

            if (isNaN(id)) {
                message.reply($("RMWARN_ABOUT", {prefix: prefix(message.guild.id)}));
                return;
            }

            var users = parseUser(user, message.guild);
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
                    throw new CommandError($("RMWARN_NO_USER_FOUND"));
                } else {
                    var warnings = settings.guilds[message.guild.id].warnings;
                    if (warnings == null) {
                        warnings = {}
                    }

                    var userWarnings = warnings[user];
                    if (userWarnings == null) {
                        userWarnings = [];
                    }

                    if (userWarnings.length == 0) {
                        throw new UserInputError($("RMWARN_NO_WARNINGS", {user: getUserString(message.guild.member(user))}));
                    }

                    if (userWarnings.length <= id) {
                        throw new UserInputError($("RMWARN_INVALID_INDEX", {user: getUserString(message.guild.member(user))}));
                    }

                    if (id < 0) {
                        throw new UserInputError($("RMWARN_INVALID_INDEX", {user: getUserString(message.guild.member(user))}));
                    }        

                    userWarnings.splice(id, 1);
                    message.channel.send($("RMWARN_SUCCESS", {emoji: ":gear:", prefix: prefix(message.guild.id)}));

                    warnings[user] = userWarnings;
                    settings.guilds[message.guild.id].warnings = warnings;
                }
            } else {
                throw new CommandError($("RMWARN_NO_USER_FOUND"));
            }
        }
    }

    if (command == "lswarn") {
        var user = message.author.id;
        var warnings = settings.guilds[message.guild.id].warnings;
        if (warnings == null) {
            warnings = {}
        }

        var userWarnings = warnings[user];
        if (userWarnings == null) {
            userWarnings = [];
        }

        if (userWarnings.length == 0) {
            message.reply($("LSWARN_NO_WARNINGS", {user: getUserString(message.guild.member(user))}));
            return;
        }

        var embed = new Discord.RichEmbed();
        embed.setColor("#3C3C96");
        embed.setTitle($("LSWARN_TITLE"));
        embed.setDescription($("LSWARN_DESCRIPTION"));
        for (index in userWarnings) {
            var warning = userWarnings[index];

            var warner = warning.warner;
            if (message.guild.members.has(warning.warner)) {
                warner = message.guild.member(warning.warner);
            }

            embed.addField("Warning #" + (parseInt(index) + 1), $("LSWARN_WARNING_INFO", {warning: warning.reason, timestamp: {date: warning.timestamp, h24: options.h24, offset: options.offset}, warner: warner, interpolation: {escapeValue: false}}), true);
        }

        message.channel.send("", {embed: embed});
    }
}

module.exports = {
    name: "Warning",
    translatableName: "TITLE_WARN",
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
                "lswarn"
            ],
            modCommands: [
                "warn",
                "rmwarn"
            ]
        }
    },
    acquireHelp: function(helpCmd, message, h$) {
        var help = {};

        switch (helpCmd) {
            case "warn":
                help.title = prefix(message.guild.id) + "warn";
                help.usageText = prefix(message.guild.id) + "warn [user]";
                help.helpText = h$("WARN_HELPTEXT");
                help.param1 = h$("WARN_PARAM1");
                break;
            case "lswarn":
                help.title = prefix(message.guild.id) + "lswarn";
                help.usageText = prefix(message.guild.id) + "lswarn [user]";
                help.helpText = h$("LSWARN_HELPTEXT");
                help.param1 = h$("LSWARN_PARAM1");
                break;
            case "rmwarn":
                help.title = prefix(message.guild.id) + "rmwarn";
                help.usageText = prefix(message.guild.id) + "rmwarn [#id] [user]";
                help.helpText = h$("RMWARN_HELPTEXT");
                help.param1 = h$("RMWARN_PARAM1");
                help.param2 = h$("RMWARN_PARAM2");
                break;
        }

        return help;
    }
}
