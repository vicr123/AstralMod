/****************************************
 *
 *   Time: Plugin for AstralMod that contains time functions
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

const Discord = require('discord.js');
const moment = require('moment');
const YQL = require('yql');
var client;
var consts;

var activeTimers = [];

function utcOffsetFromTimezone(location) {
    switch (location) {
        case "sst":
            return -11;
        case "ckt":
        case "hast":
        case "taht":
            return -10;
        case "akst":
        case "hadt":
            return -9;
        case "pst":
        case "akdt":
            return -8;
        case "mst":
        case "pdt":
            return -7;
        case "cst":
        case "mdt":
            return -6;
        case "cdt":
        case "est":
            return -5;
        case "clt":
        case "cost":
        case "ect":
        case "edt":
            return -4;
        case "brt":
        case "clst":
            return -3;
        case "uyst":
            return -2;
        case "brst":
            return -1;
        case "utc":
        case "gmt":
            return 0;
        case "bst":
        case "cet":
        case "ist":
        case "met":
        case "wat":
            return 1;
        case "cat":
        case "cest":
        case "eet":
        case "ist":
        case "sast":
        case "wast":
            return 2;
        case "ast":
        case "eat":
        case "eest":
        case "fet":
        case "idt":
        case "iot":
        case "msk":
        case "trt":
            return 3;
        case "irst":
            return 3.5;
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
        case "aft":
        case "irdt":
            return 4.5;
        case "mawt":
        case "mvt":
        case "orat":
        case "pkt":
        case "tft":
        case "tmt":
        case "uzt":
        case "yekt":
            return 5;
        case "ist":
        case "slst":
            return 5.5;
        case "npt":
            return 5.75;
        case "bst":
        case "btt":
        case "kgt":
        case "omst":
        case "vost":
            return 6;
        case "cct":
        case "mmt":
            return 6.5;
        case "cxt":
        case "davt":
        case "hovt":
        case "novt":
        case "ict":
        case "krat":
        case "tha":
        case "wit":
            return 7;
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
        case "eit":
        case "jst":
        case "kst":
        case "yakt":
            return 9;
        case "acst":
            return 9.5;
        case "aest":
        case "chst":
        case "ddut":
        case "pgt":
        case "vlat":
            return 10;
        case "acdt":
        case "lhst":
            return 10.5;
        case "aedt":
        case "lhst":
        case "mist":
        case "nct":
        case "sbt":
        case "vut":
            return 11;
        case "fjt":
        case "mht":
        case "nzst":
            return 12;
        case "nzdt":
        case "tkt":
        case "tot":
            return 13;
        default:
            return undefined;
    }
}

function getTime(location, member, $) {
    return new Promise(function(resolve, reject) {
        if (!isNaN(parseFloat(location)) && (-14 < parseFloat(location) & parseFloat(location) < 14)) { //Check for a manually specified UTC offset
            resolve({
                offset: parseFloat(location),
                location: $("TIME_UTC", )
            })
        }

        if (utcOffsetFromTimezone(location) !== undefined) { //Check for a UTC offset and a UTC named timezone first
            resolve({
                offset: utcOffsetFromTimezone(location),
                location: location.toUpperCase()
            });
            return;
        }

        let returnUserWeather = function(user) {
            if (settings.users[user.id] == null || settings.users[user.id].timezone == null) {
                reject($("TIME_TIMEZONE_NOT_SET", {user: user.username, prefix: prefix(member.guild.id)}));
            } else {
                resolve({
                    offset: settings.users[user.id].timezone,
                    location: getUserString(user)
                });
            }
        };

        if (location == "") {
            returnUserWeather(member.user);
            return;
        }

        let userParseResult = parseUser(location.trim(), member.guild);
        if (userParseResult.length > 0) {
            returnUserWeather(userParseResult[0]);
            return;
        }

        //Now we check Yahoo
        let query = new YQL("select * from weather.forecast where woeid in (select woeid from geo.places(1) where text=\"" + location + "\")");
        query.exec(function(err, data) {
            if (err || data.query.results === null || Object.keys(data.query.results.channel).length === 1) {
                reject($("TIME_LOCATION_NOT_FOUND"));
                return;
            }

            //We have a good location
            let dat = data.query.results.channel;
            resolve({
                location: dat.location.city + ", " + dat.location.country,
                offset: utcOffsetFromTimezone(dat.item.pubDate.substring(dat.item.pubDate.lastIndexOf(" ") + 1).toLowerCase())
            });
        });
    })
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
    var date = moment()
    for (key in settings.users) {
        var userSetting = settings.users[key];
        if (userSetting != null) {
            if (userSetting.timers != null) {
                for (index in userSetting.timers) {
                    var timer = userSetting.timers[index];
                    if (timer.timeout < date) {
                        let $ = _[userSetting.locale];

                        var embed = new Discord.RichEmbed();

                        embed.setTitle($("TIMER_ELAPSED_TITLE", {emoji: ":alarm_clock:"}));
                        embed.setColor("#FED266");

                        if (timer.reason == "") {
                            embed.setDescription($("TIMER_ELAPSED_DESCRIPTION", {ping: `<@${timer.author}>`}));
                        } else {
                            embed.setDescription($("TIMER_ELAPSED_DESCRIPITION_WITH_REASON", {ping: `<@${timer.author}>`}));
                            embed.addField($("TIMER_ELAPSED_REASON_TITLE"), timer.reason, false);
                        }


                        embed.addField($("TIMER_ELAPSED_TIMEOUT_DATE_TITLE"), $("SPECIAL_DATETIME", {time: {date: timer.timeout, h24: userSetting.h24, offset: userSetting.timezone}}), false);
                        embed.setFooter($("TIMER_ELAPSED_FOOTER", {prefix: prefix(timer.channel == undefined ? undefined : client.channels.get(timer.channel).guild.id)}));

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

async function processCommand(message, isMod, command, options) {
    let $ = _[options.locale];
    if (command.startsWith("settz ")) {
        var utcOffset;
        var location = command.substr(6);

        getTime(location, message.member, $).then(obj => {
            var userSettings = settings.users[message.author.id];

            if (userSettings == null) {
                userSettings = {};
            }
            
            userSettings.timezone = obj.offset;
    
            settings.users[message.author.id] = userSettings;
            
             message.reply($("SETTZ_TIMEZONE_SET", {offset: obj.offset}));
        }).catch(() => {
            message.reply($("SETTZ_INVALID_TIMEZONE"))
        });
        
    } else if (command == "settz") {
        message.reply($("SETTZ_ABOUT", {prefix: prefix(message.guild.id)}));
    } else if (command == "timer") {
        message.reply($("TIMER_HOWTO", {prefix: prefix(message.guild.id)}))
    } else if (command.startsWith("timer ")) {
        var time;
        var indexOfFirstSplit = command.indexOf(" ", 6);
        var reason = "";

        if (indexOfFirstSplit == -1) {
            time = command.substr(6);
        } else {
            time = command.substr(6, indexOfFirstSplit - 6);
            reason = message.content.substr(indexOfFirstSplit + prefix(message.guild.id).length).trim();
        }

        var seconds = parseTime(time);

        if (isNaN(seconds)) {
            throw new UserInputError($("TIMER_INVALID"));
        } else {
            var embed = new Discord.RichEmbed();

            embed.setTitle($("TIMER_SET_TITLE", {emoji: ":alarm_clock:"}));
            embed.setColor("#FED266");
            embed.setDescription($("TIMER_SET_DESCRIPTION"));
            embed.addField($("TIMER_SET_DURATION"), $("TIMER_SET_DURATION_CONTENT", {duration: {duration: moment.duration(moment().diff(moment().add(seconds, 'seconds')))}, timeout: {date: moment().add(seconds, 'seconds'), offset: options.offset, h24: options.h24}}), false);

            if (reason != "") {
                embed.addField($("TIMER_SET_REASON"), reason, false);
            }

            if (!isMod) {
                embed.addField($("TIMER_SET_ALERT"), $("TIMER_SET_ALERT_DESCRIPTION"));
            }
            message.channel.send("", {embed: embed});

            var endDate = moment().add(seconds, 'seconds');

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
        embed.setColor("#FED266");
        embed.setTitle($("TIMERS_TITLE", {emoji: ":alarm_clock:"}));
        embed.setDescription($("TIMERS_DESCRIPTION"))
        for (index in userSetting.timers) {
            var timer = userSetting.timers[index];

            var field = "";
            field += $("TIMERS_ELAPSE", {duration: {duration: moment.duration(moment().diff(timer.timeout))}}) + "\n";
            field +=  $("TIMERS_TIMEOUT_DATE", {timeout: {date: timer.timeout, h24: options.h24, offset: options.offset}}) + "\n";

            if (timer.reason == "") {
                field += $("TIMERS_REASON", {reason: $("TIMERS_NO_REASON")});
            } else {
                field += $("TIMERS_REASON", {reason: timer.reason});
            }

            field += "\n"

            if (timer.isChannelUser) {
                field += $("TIMERS_CHANNEL", {reason: $("TIMERS_DM")});
            } else {
                field += $("TIMERS_CHANNEL", {reason: `<#${timer.channel}>`});
            }

            embed.addField($("TIMERS_HEADER", {index: parseInt(index) + 1}), field);
        }

        message.channel.send("", {embed: embed});
    } else if (command.startsWith("rmtimer ")) {
        var timerToRemove = command.substr(8);
        var index = parseInt(timerToRemove) - 1;

        if (isNaN(index)) {
            message.reply($("RMTIMER_ABOUT", {prefix: prefix(message.guild.id)}));
            return;
        }

        if (settings.users[message.author.id] == null) {
            message.reply($("RMTIMER_NO_TIMERS"));
            return;
        }

        if (settings.users[message.author.id].timers == null) {
            message.reply($("RMTIMER_NO_TIMERS"));
            return;
        }

        if (settings.users[message.author.id].timers.length == 0) {
            message.reply($("RMTIMER_NO_TIMERS"));
            return;
        }

        if (settings.users[message.author.id].timers.length <= index) {
            message.reply($("RMTIMER_INVALID_INDEX"));
            return;
        }

        settings.users[message.author.id].timers.splice(index, 1);
        message.reply($("RMTIMER_SUCCESS", {prefix: prefix(message.guild.id)}));
    } else if (command.startsWith("time")) {
        let location = command.replace("time", "").trim();
        let messageToEdit;

        sendPreloader($("TIME_PREPARING"), message.channel).then(mte => {
            let messageToEdit = mte;
            getTime(location, message.member, $).then(function(timeDescriptor) {
                let time = moment.utc();
                messageToEdit.edit($("TIME_RESPONSE", {
                    clockEmote: getClockEmoji(time.toDate()),
                    request: timeDescriptor.location,
                    time: {
                        date: time,
                        h24: options.h24,
                        offset: timeDescriptor.offset
                    }
                }));
            }).catch(err => {
                let embed = new Discord.RichEmbed;
                embed.setTitle($("TIME_ERROR", {emoji: ":clock10:"}));
                embed.setDescription($("TIME_ERROR_NOT_RETRIEVED"));
                embed.setColor("#EC7979");
                embed.addField($("TIME_ERROR_DETAILS"), err);

                messageToEdit.edit(embed);
            });
        }).catch(err => {
            let embed = new Discord.RichEmbed;
            embed.setTitle($("TIME_ERROR", {emoji: ":clock10:"}));
            embed.setDescription($("TIME_ERROR_NOT_RETRIEVED"));
            embed.setColor("#EC7979");
            embed.addField($("ERROR_DETAILS"), err);

            messageToEdit.edit(embed);
        });
    }
}

var pollTimer;
module.exports = {
    name: "Time",
    translatableName: "TITLE_TIME",
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
    acquireHelp: function(helpCmd, message, h$) {
        var help = {};

        switch (helpCmd) {
            case "time":
                help.title = prefix(message.guild.id) + "time";
                help.usageText = prefix(message.guild.id) + "time tz";
                help.helpText = h$("TIME_HELPTEXT");
                help.param1 = h$("TIME_PARAM1");
                break;
            case "settz":
                help.title = prefix(message.guild.id) + "settz";
                help.usageText = prefix(message.guild.id) + "settz timezone";
                help.helpText = h$("SETTZ_HELPTEXT");
                help.param1 = h$("SETTZ_PARAM1");
                help.remarks = h$("SETTZ_REMARKS");
                break;
            case "timer":
                help.title = prefix(message.guild.id) + "timer";
                help.usageText = prefix(message.guild.id) + "timer time [rem]";
                help.helpText = h$("TIMER_HELPTEXT");
                help.param1 = h$("TIMER_PARAM1");
                help.param2 = h$("TIMER_PARAM2");
                break;
            case "timers":
                help.title = prefix(message.guild.id) + "timer";
                help.helpText = h$("TIMERS_HELPTEXT");
                break;
            case "rmtimer":
                help.title = prefix(message.guild.id) + "rmtimer";
                help.usageText = prefix(message.guild.id) + "rmtimer index";
                help.helpText = h$("RMTIMER_HELPTEXT");
                help.param1 = h$("RMTIMER_PARAM1", {prefix: prefix(message.guild.id)});
                break;
        }

        return help;
    },
    utcOffsetFromTimezone: utcOffsetFromTimezone
}
