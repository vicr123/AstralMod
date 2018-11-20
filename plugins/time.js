/****************************************
 *
 *   Time: Plugin for AstralMod that contains time functions
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

var activeTimers = [];

function utcOffsetFromTimezone(location) {
    switch (location) {
        case "sst":
            return -11;
            break;
        case "ckt":
        case "hast":
        case "taht":
            return -10;
            break;
        case "akst":
        case "hadt":
            return -9;
            break;
        case "pst":
        case "akdt":
            return -8;
            break;
        case "mst":
        case "pdt":
            return -7;
            break;
        case "cst":
        case "mdt":
            return -6;
            break;
        case "cdt":
        case "est":
            return -5;
            break;
        case "clt":
        case "cost":
        case "ect":
        case "edt":
            return -4;
            break;
        case "brazil":
        case "brt":
        case "clst":
            return -3;
            break;
        case "uyst":
            return -2;
            break;
        case "brst":
            return -1;
            break;
        case "utc":
        case "gmt":
        case "england":
        case "london":
        case "denmark":
        case "portugal":
        case "spain":
            return 0;
            break;
        case "amsterdam":
        case "austria":
        case "belgium":
        case "berlin":
        case "france":
        case "germany":
        case "italy":
        case "malta":
        case "netherlands":
        case "paris":
        case "rome":
        case "sweden":
        case "switzerland":
        case "vatican":
        case "bst":
        case "cet":
        case "ist":
        case "met":
        case "wat":
            return 1;
            break;
        case "cat":
        case "cest":
        case "eet":
        case "ist":
        case "sast":
        case "wast":
            return 2;
            break;
        case "ast":
        case "eat":
        case "eest":
        case "fet":
        case "idt":
        case "iot":
        case "msk":
        case "trt":
            return 3;
            break;
        case "irst":
            return 3.5;
            break;
        case "amt":
        case "azt":
        case "get":
        case "gst":
        case "mut":
        case "ret":
        case "samt":
        case "sct":
        case "volt":
            return 4;
            break;
        case "aft":
        case "irdt":
            return 4.5;
            break;
        case "mawt":
        case "mvt":
        case "orat":
        case "pkt":
        case "tft":
        case "tmt":
        case "uzt":
        case "yekt":
            return 5;
            break;
        case "ist":
        case "slst":
            return 5.5;
            break;
        case "npt":
            return 5.75;
            break;
        case "bst":
        case "btt":
        case "kgt":
        case "omst":
        case "vost":
            return 6;
            break;
        case "cct":
        case "mmt":
            return 6.5;
            break;
        case "cxt":
        case "davt":
        case "hovt":
        case "iict":
        case "krat":
        case "tha":
        case "wit":
            return 7;
            break;
        case "awst":
        case "bdt":
        case "chot":
        case "cit":
        case "cst":
        case "hkt":
        case "irkt":
        case "mst":
        case "pht":
        case "sgt":
        case "wst":
            return 8;
            break;
        case "eit":
        case "jst":
        case "kst":
        case "yakt":
            return 9;
            break;
        case "acst":
            return 9.5;
            break;
        case "sydney":
        case "aest":
        case "chst":
        case "ddut":
        case "pgt":
        case "vlat":
            return 10;
            break;
        case "acdt":
        case "lhst":
            return 10.5;
            break;
        case "aedt":
        case "lhst":
        case "mist":
        case "nct":
        case "sbt":
        case "vut":
            return 11;
            break;
        case "fjt":
        case "mht":
        case "nzst":
            return 12;
            break;
        case "nzdt":
        case "tkt":
        case "tot":
            return 13;
        default:
            return -3000;
    }
}

function getClockEmoji(date = new Date()) {
    var hour = date.getHours();
    if (hour > 11) {
        hour -= 12;
    }
    if (hour == 0) {
        hour = 12;
    }

    var firstPart = ":clock" + parseInt(hour);
    var secondPart = ":";

    var min = date.getMinutes();
    if (min > 45) {
        firstPart = ":clock" + parseInt(hour + 1);
        if (hour == 12) {
            firstPart = ":clock1";
        }
    } else if (min > 15) {
        secondPart = "30:";
    }
    return firstPart + secondPart;
}

function pollTimers() {
    var date = new Date().getTime();
    for (key in settings.users) {
        var userSetting = settings.users[key];
        if (userSetting != null) {
            if (userSetting.timers != null) {
                for (index in userSetting.timers) {
                    var timer = userSetting.timers[index];
                    if (timer.timeout < date) {
                        var embed = new Discord.RichEmbed();

                        embed.setTitle(":alarm_clock: Timer Elapsed");
                        embed.setColor("#FFC000");

                        if (timer.reason == "") {
                            embed.setDescription("<@" + timer.author + "> I've been told to ping you.");
                        } else {
                            embed.setDescription("<@" + timer.author + "> I've been told to remind you about this.");
                            embed.addField("Reason", timer.reason, false);
                        }

                        embed.addField("Timeout Date", new Date().toUTCString(), false);
                        embed.setFooter("To see all your timers, use " + prefix + "timers.");

                        try {
                            if (timer.isChannelUser) {
                                client.users.get(timer.channel).send("", {embed: embed});
                            } else {
                                client.channels.get(timer.channel).send("<@" + timer.author + ">", {embed: embed});
                            }
                        } catch (err) {
                            //Couldn't send timer
                        }

                        settings.users[key].timers.splice(index, 1);
                    }
                }
            }
        }
    }
}

function processCommand(message, isMod, command) {
    if (command.startsWith("settz ")) {
        var utcOffset;
        var location = command.substr(6);

        utcOffset = parseFloat(location);
        if (isNaN(utcOffset)) {
            utcOffset = utcOffsetFromTimezone(location);
        }

        if (isNaN(utcOffset) || utcOffset < -14 || utcOffset > 14) {
            message.reply("Usage: `" + prefix + "settz [your timezone]`. For more information, `" + prefix + "help settz`");
        } else {
            var userSettings = settings.users[message.author.id];

            if (userSettings == null) {
                userSettings = {};
            }
            userSettings.timezone = utcOffset;

            settings.users[message.author.id] = userSettings;

            if (isNaN(parseFloat(utcOffset))) {
                throw new UserInputError("Invalid Timezone");
            } else {
                message.reply("Your timezone is now UTC " + parseFloat(utcOffset));
            }
        }
    } else if (command == "settz") {
        message.reply("Usage: `" + prefix + "settz [UTC offset]`. For more information, `" + prefix + "help settz`");
    } else if (command.startsWith("timer ")) {
        var time;
        var indexOfFirstSplit = command.indexOf(" ", 6);
        var reason = "";

        if (indexOfFirstSplit == -1) {
            time = command.substr(6);
        } else {
            time = command.substr(6, indexOfFirstSplit - 6);
            reason = message.content.substr(indexOfFirstSplit + prefix.length).trim();
        }

        var seconds = parseTime(time);

        if (isNaN(seconds)) {
            throw new UserInputError("Invalid length of time.");
        } else {
            var embed = new Discord.RichEmbed();

            embed.setTitle(":alarm_clock: Timer Set");
            embed.setColor("#FFC000");
            embed.setDescription("Ok, I'll set that timer now.");
            embed.addField("Duration", seconds + " seconds.", false);

            if (reason != "") {
                embed.addField("Reason", reason, false);
            }

            if (!isMod) {
                embed.addField("Alert", "Since you're not a moderator, I'll DM you the timer. Make sure that you allow DMs from this server, or you won't receive it.");
            }
            message.channel.send("", {embed: embed});

            var endDate = new Date().getTime() + seconds * 1000;

            var timerObject = {
                reason: reason,
                timeout: endDate,
                channel: isMod ? message.channel.id : message.author.id,
                isChannelUser: !isMod,
                author: message.author.id
            }

            if (settings.users[message.author.id] == null) {
                settings.users[message.author.id] = {};
            }

            if (settings.users[message.author.id].timers == null) {
                settings.users[message.author.id].timers = [];
            }

            settings.users[message.author.id].timers.push(timerObject);
        }
    } else if (command.startsWith("timers")) {
        var hourType = settings.users[message.author.id].timeunit === undefined ? "24h" : settings.users[message.author.id].timeunit;
        let setHour = false;
        for (const param of command.split(" ")) {
            if (param === "--12") {
                setHour = true;
                hourType = "12h"
            } else if (param === "--24") {
                setHour = true;
                hourType = "24h"
            }
        }

        var userSetting = settings.users[message.author.id];

        if (userSetting == null) {
            message.reply("You have no timers.");
            return;
        }

        if (userSetting.timers == null) {
            message.reply("You have no timers.");
            return;
        }

        if (userSetting.timers.length == 0) {
            message.reply("You have no timers.");
            return;
        }

        var embed = new Discord.RichEmbed();
        embed.setColor("#FFC000");
        embed.setTitle(":alarm_clock: Running Timers");
        embed.setDescription("Timers that AstralMod is currently keeping track of for you")
        for (index in userSetting.timers) {
            var timer = userSetting.timers[index];

            var field = "";
            field += "This timer will elapse in about " + moment.duration(timer.timeout - new Date().getTime()).humanize() + "\n";
            let time = moment(timer.timeout);
            field += "**Timeout date:** " + time.format("dddd, MMMM GG,") + " at " + time.format(hourType === "24h" ? "HH:mm" : "h:mm A") + "\n";

            if (timer.reason == "") {
                field += "**Reason:** No reason was provided\n";
            } else {
                field += "**Reason:** " + timer.reason + "\n";
            }

            if (timer.isChannelUser) {
                field += "**Channel:** A DM will be sent";
            } else {
                field += "**Channel:** <#" + timer.channel + ">";
            }

            embed.addField("Timer #" + parseInt(index), field);
        }

        message.channel.send("", {embed: embed});
    } else if (command.startsWith("rmtimer ")) {
        var timerToRemove = command.substr(8);
        var index = parseInt(timerToRemove);

        if (isNaN(index)) {
            message.reply("Usage: `" + prefix + "rmtimer index`. For the `index` parameter, use `" + prefix + "timers`. For more information, `" + prefix + "help rmtimer`");
            return;
        }

        if (settings.users[message.author.id] == null) {
            message.reply("You have no timers.");
            return;
        }

        if (settings.users[message.author.id].timers == null) {
            message.reply("You have no timers.");
            return;
        }

        if (settings.users[message.author.id].timers.length == 0) {
            message.reply("You have no timers.");
            return;
        }

        if (settings.users[message.author.id].timers.length <= index) {
            message.reply("You don't have that many timers.");
            return;
        }

        settings.users[message.author.id].timers.splice(index, 1);
        message.reply("That timer has been deleted. For new timer indices, use `" + prefix + "timers`.");
    } else if (command.startsWith("time")) {
        var hourType = settings.users[message.author.id].timeunit === undefined ? "24h" : settings.users[message.author.id].timeunit;
        let setHour = false;
        for (const param of command.split(" ")) {
            if (param === "--12") {
                setHour = true;
                hourType = "12h"
            } else if (param === "--24") {
                setHour = true;
                hourType = "24h"
            }
        }

        command = command.replace("--12", "").replace("--24", "").trim();

        let user = command.replace("time", "").trim();
        let tz = undefined;

        if (utcOffsetFromTimezone(user) !== -3000) {
            tz = utcOffsetFromTimezone(user);
            user = user.toUpperCase();
        }


        if (tz === undefined) {
            if (user == 0) { // if it's nothing, including whitespace or undefined or whatever
                user = message.author;
            } else {
                user = parseUser(user.trim(), message.guild)[0];
            }

            if (user == null || settings.users[user.id] == null || !settings.users.hasOwnProperty(user.id) || !settings.users[user.id].hasOwnProperty("timezone")) {
                if(tz !== undefined) {
                    throw new UserInputError(user.username + " has not yet set their timezone. Go and bug 'em to `" + prefix + "settz` quickly!");
                } else {
                    throw new UserInputError("That is not a valid time zone.");
                }
            }
        }

        tz = tz === undefined ? settings.users[user.id].timezone : tz;

        let time = moment().utcOffset(tz);

        message.channel.send(getClockEmoji(moment().toDate()) + " **" + (user["username"] === undefined ? user : user.username) + "** (" + time.format("Z") + "): " + time.format("dddd, MMMM GG,") + " at " + time.format(hourType === "24h" ? "HH:mm" : "h:mm A"));

    }
}

var pollTimer;
module.exports = {
    name: "Time",
    constructor: function(discordClient, commandEmitter, constants) {
        client = discordClient;
        consts = constants;

        commandEmitter.on('processCommand', processCommand);

        pollTimer = setInterval(pollTimers, 1000)
    },
    destructor: function(commandEmitter) {
        commandEmitter.removeListener('processCommand', processCommand);

        clearInterval(pollTimer);
    },
    availableCommands: {
        general: {
            commands: [
                "time",
                "settz",
                "timer",
                "timers",
                "rmtimer"
            ],
            modCommands: [

            ]
        }
    },
    acquireHelp: function(helpCmd) {
        var help = {};

        switch (helpCmd) {
            case "time":
                help.title = prefix + "time";
                help.usageText = prefix + "time tz";
                help.helpText = "Returns the time at tz";
                help.param1 = "- A UTC Offset\n" +
                              "- A timezone code known to AstralMod\n" +
                              "- A user known to AstralMod";
                break;
            case "settz":
                help.title = prefix + "settz";
                help.usageText = prefix + "settz timezone";
                help.helpText = "Sets your timezone to timezone";
                help.param1 = "- A UTC Offset detailing your timezone\n"
                              "- A timezone code known to AstralMod representing your timezone\n";
                help.remarks = "By using this command, your timezone will be available to anyone who asks AstralMod.";
                break;
            case "timer":
                help.title = prefix + "timer";
                help.usageText = prefix + "timer time [rem]";
                help.helpText = "Sets a timer for the amount of time specified in time";
                help.param1 = "- A number, in minutes\n"
                              "- A number followed by either `s`, `m`, `h`.\n";
                help.param2 = "*Optional Parameter*\n" +
                              "Text to be sent when timer expires";
                break;
            case "timers":
                help.title = prefix + "timer";
                help.helpText = "Lists your current timers";
                break;
            case "rmtimer":
                help.title = prefix + "rmtimer";
                help.usageText = prefix + "rmtimer index";
                help.helpText = "Removes the timer at index";
                help.param1 = "Index of the timer you wish to remove. This can be obtained with `" + prefix + "timers`";
                break;
        }

        return help;
    },
    utcOffsetFromTimezone: utcOffsetFromTimezone
}
