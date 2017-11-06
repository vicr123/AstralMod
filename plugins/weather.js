/****************************************
 * 
 *   Weather: Plugin for AstralMod that contains weather functions
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
const owm = require('openweathermap-js');
var keys = require('../keys.js');
var client;
var consts;

function getDescription(id) {
    switch (id) {
        case 200:
        case 201:
        case 210:
        case 230:
        case 231:
        case 960:
        case 211:
            return "thunderstorms";
        case 202:
        case 212:
        case 221:
        case 232:
            return "heavy thunderstorms";
        case 300:
        case 301:
        case 310:
        case 311:
        case 313:
        case 321:
        case 501:
        case 501:
        case 521:
        case 531:
        case 616:
        case 621:
            return "rain";
        case 500:
        case 520:
        case 615:
        case 620:
            return "light rain";
        case 314:
        case 302:
        case 312:
        case 502:
        case 502:
        case 504:
        case 522:
        case 622:
            return "heavy rain"
        case 600:
        case 601:
        case 602:
            return "snow";
        case 611:
        case 612:
            return "sleet"
        case 701:
        case 711:
        case 721:
        case 741:
        case 771:
            return "fog";
        case 731:
        case 751:
            return "sand";
        case 761:
            return "dust";
        case 762:
            return "volcanic ash";
        case 781:
        case 900:
            return "a tornado";
        case 800:
            return "clear, immaculate skies";
        case 801:
        case 802:
            return "clear skies"; //Yes, there is a difference.
        case 803:
        case 804:
            return "clouds"
        case 901:
        case 961:
            return "a tropical storm";
        case 902:
        case 962:
            return "a hurricane";
        case 903:
            return "cold conditions;";
        case 904:
            return "hot conditions";
        case 905:
        case 956:
            return "windy conditions";
        case 906:
            return "hail";
        case 957:
        case 958:
        case 959:
            return "extreme wind";
        case 955:
        case 954:
        case 953:
        case 952:
            return "breezy conditions"
        case 951:
            return "calm winds";
        default:
            return "Weather condition #" + parseInt(id);
    }
}

function sendCurrentWeather(message, location, type, user = "") {
    owm.current({
        appid: keys.owmKey,
        location: location,
        cityID: location,
        method: type,
        format: 'JSON',
        accuracy: 'accurate',
        units: 'metric'
    }, function(err, data) {
        try {
            if (err) {
                message.channel.send("Catastrophic Failure");
            } else {
                let embed = new Discord.RichEmbed();
                embed.setTitle("Weather in " + data.name + ", " + data.sys.country + (user != "" ? " @ " + user : ""));
                embed.setColor("#00FF00");

                let desc = [];
                for (key in data.weather) {
                    let info = data.weather[key];
                    desc.push(getDescription(info.id));
                }

                let overview = "Right now, in " + data.name + ", it's " + parseInt(data.main.temp) + "°C with " + desc.join(", ") + ". The wind is blowing at " + parseFloat(data.wind.speed) + "km/h";
                if (!isNaN(parseInt(data.wind.deg))) {
                    overview += " at a bearing of " + parseInt(data.wind.deg) + "°"
                }
                overview += ".";
                embed.addField("Overview", overview);
                
                embed.setFooter("Data provided by OpenWeatherMap");

                message.channel.send(embed);
            }
        } catch (err) {
            message.channel.send("Catastrophic Failure");
        }
    });
}

function processCommand(message, isMod, command) {
    if (command.startsWith("weather ")) {
        var location = command.substr(8);

        if (command.indexOf("--user") == -1) {
            sendCurrentWeather(message, location, "name");
        } else {
            location = location.replace("--user", "").trim();
            var users = parseUser(location, message.guild);
    
            if (users.length > 0) {
                if (settings.users.hasOwnProperty(users[0].id)) {
                    var userObject = settings.users[users[0].id];
                    if (userObject != null) {
                        if (userObject.hasOwnProperty("location")) {
                            sendCurrentWeather(message, userObject.location, "cityID", users[0].tag);
                            return;
                        }
                    }
                }
                throw new UserInputError(users[0].username + " has not yet set their location. Go and bug 'em to `" + prefix + "setloc` quickly!");
            } else {
                throw new CommandError("No user found with that name");
            }
        }
    } else if (command == "weather") {
        if (settings.users[message.author.id] == null) {
            settings.users[message.author.id] = {};
        }

        if (settings.users[message.author.id].location == null) {
            throw new CommandError("Unknown location. Please set your location with `" + prefix + "setloc`");
        } else {
            sendCurrentWeather(message, settings.users[message.author.id].location, "cityID", message.author.tag);
        }
    } else if (command.startsWith("setloc ")) {
        var location = command.substr(7);

        if (location == "") {
            message.reply("Usage: `" + prefix + "setloc [your location]`. For more information, `" + prefix + "help setloc`");
        } else {
            owm.current({
                appid: keys.owmKey,
                location: location,
                method: 'name',
                format: 'JSON',
                accuracy: 'accurate',
                units: 'metric'
            }, function(err, data) {
                try {
                    if (err) {
                        throw new CommandError("Unknown City");
                    } else {
                        var userSettings = settings.users[message.author.id];
                        
                        if (userSettings == null) {
                            userSettings = {};
                        }
                        userSettings.location = data.id;
            
                        settings.users[message.author.id] = userSettings;
            
                        let lat, lon;
                        if (data.coord.lat == 0) {
                            lat = "0°";
                        } else if (data.coord.lat < 0) {
                            lat = Math.abs(data.coord.lat) + "° S";
                        } else {
                            lat = Math.abs(data.coord.lat) + "° N";
                        }

                        if (data.coord.lon == 0) {
                            lon = "0°";
                        } else if (data.coord.lon < 0) {
                            lon = Math.abs(data.coord.lon) + "° W";
                        } else {
                            lon = Math.abs(data.coord.lon) + "° E";
                        }
                        
                        message.reply("Your location is now " + data.name + ", " + data.sys.country + " (" + lat + ", " + lon + ")");
                    }
                } catch (err) {
                    message.channel.send("Catastrophic Failure");
                }
            });
        }
    } else if (command == "setloc") {
        message.reply("Usage: `" + prefix + "setloc [your location]`. For more information, `" + prefix + "help setloc`");
    }
}

module.exports = {
    name: "Weather",
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
                "weather",
                "setloc"
            ],
            modCommands: [
                
            ]
        }
    },
    acquireHelp: function(helpCmd) {
        var help = {};

        switch (helpCmd) {
            case "weather":
                help.title = prefix + "weather";
                help.usageText = prefix + "weather [location]";
                help.helpText = "Returns the weather at [location]";
                help.param1 = "- A location\n" +
                              "- A user whose location is known to AstralMod\n";
                break;
            case "setloc":
                help.title = prefix + "setloc";
                help.usageText = prefix + "setloc [location]";
                help.helpText = "Sets your location to [location]";
                help.param1 = "- A location";
                help.remarks = "By using this command, your location will be available to anyone who asks AstralMod. To reduce privacy concerns, it's a good idea to enter the name of a large city near you or a city slightly offset from your actual location.";
                break;
        }

        return help;
    }
}