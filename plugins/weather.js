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
const YQL = require('yql');
var keys = require('../keys.js');
var client;
var consts;

function getBGFromCode(code) {
    switch (code) {
        case 32:
        case 34:
            return "images/dayclearw.png";
        case 0:
        case 1: 
        case 2:
        case 3:
        case 4:
            return "images/nightcloudw.png";
    }
}

function sendCurrentWeather(message, location, type, user = "") {
    var query = new YQL("select * from weather.forecast where woeid="+location+" and u=\"c\"");
    
    query.exec(function(err, data) {
        try {
            if (err) {
                throw new CommandError(err);
            } else {
                var C = require('canvas');
                var canvas = new C(500, 400);
                var ctx = canvas.getContext('2d');
                var drawing = true;
                var bg = getBGFromCode(data.query.results.channel.item.condition.code);
                
                var image = new C.Image();
                image.onload = function(){
                    ctx.drawImage(image, 0, 0);
                    drawing = false;
                };
                image.src = bg;
                while (drawing){};
                
                ctx.font = "18px Contemporary";
                ctx.fillStyle = "white";
                ctx.fillText(data.query.results.channel.item.condition.text);

                message.channel.send(new Discord.Attachment(canvas.toBuffer()));
            }
        } catch (err) {
            message.channel.send(err.toString());
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
            var query = new YQL("select * from geo.places where text=\""+ location +"\"");
            
            query.exec(function(err, data) {
                try {
                    if (err) {
                        throw new CommandError("Unknown City");
                    } else {
                        var userSettings = settings.users[message.author.id];
                        
                        if (userSettings == null) {
                            userSettings = {};
                        }
                        var place;
                        if (data.query.results.place[0] != null) place = data.query.results.place[0];
                        else place = data.query.results.place;
                        
                        userSettings.location = place.woeid;
            
                        settings.users[message.author.id] = userSettings;
                        
                        log(place);
                        
                        message.reply(tr("Your location is now $[1], $[2] ($[3], $[4]).", place.name, place.country.code, place.centroid.latitude, place.centroid.longitude));
                    }
                } catch (err) {
                    message.channel.send(err.toString());
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