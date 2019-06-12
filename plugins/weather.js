/****************************************
 * 
 *   Weather: Plugin for AstralMod that contains weather functions
 *   Copyright (C) 2019 Victor Tran, John Tur, zBlake and lempamo
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
const Canvas = require('canvas');
const fs = require('fs');
const nominatim = require("nominatim-geocoder");
const yrnoModule = require("yr.no-forecast");
var client;
var consts;
    
const geocoder = new nominatim();
const yrno = yrnoModule({
    version: "1.9"
});

let sunnyImage, moonyImage, cloudyImage, thunderImage, rainImage, windImage, fogImage, humidImage, pressureImage, sunriseImage, sunsetImage, compassImage, snowImage, rainsnowImage, questionImage, unavailImage;


function getDataFromCode(code, ctx, $) {
    log("code: " + code.toString(), logType.debug);

    let dark = false;
    if (code.includes("Dark_")) {
        dark = true;
        code = code.replace("Dark_", "");
    }

    code = code.replace("Sun", "")

    const codes = {
        "": { //This is Sun, but we replaced Sun with empty string to avoid having to deal with duplicates.
            textKey: "WEATHER_COND_SUN",
            background: "clear",
            icon: sunnyImage
        },
        "LightCloud": {
            textKey: "WEATHER_COND_LIGHTCLOUD",
            background: "clear",
            icon: cloudyImage
        },
        "PartlyCloud": {
            textKey: "WEATHER_COND_PARTCLOUD",
            background: "clear",
            icon: cloudyImage
        },
        "Cloud": {
            textKey: "WEATHER_COND_CLOUD",
            background: "cloud",
            icon: cloudyImage
        },
        "LightRain": {
            textKey: "WEATHER_CONT_LIGHTRAIN",
            background: "cloud",
            icon: rainImage
        },
        "LightRainThunder": {
            textKey: "WEATHER_CONT_LIGHTRAINTHUNDER",
            background: "cloud",
            icon: rainImage
        },
        "HeavySleet": {
            textKey: "WEATHER_COND_HEAVYSLEET",
            background: "cloud",
            icon: rainsnowImage
        },
        "HeavySleetThunder": {
            textKey: "WEATHER_COND_HEAVYSLEETTHUNDER",
            background: "cloud",
            icon: rainsnowImage
        },
        "Sleet": {
            textKey: "WEATHER_COND_SLEET",
            background: "cloud",
            icon: rainsnowImage
        },
        "SleetThunder": {
            textKey: "WEATHER_COND_SLEETTHUNDER",
            background: "cloud",
            icon: rainsnowImage
        },
        "LightSleet": {
            textKey: "WEATHER_COND_LIGHTSLEET",
            background: "cloud",
            icon: rainsnowImage
        },
        "LightSleetThunder": {
            textKey: "WEATHER_COND_LIGHTSLEETTHUNDER",
            background: "cloud",
            icon: rainsnowImage
        },
        "LightSnow": {
            textKey: "WEATHER_COND_LIGHTSNOW",
            background: "cloud",
            icon: snowImage
        },
        "LightSnowThunder": {
            textKey: "WEATHER_COND_LIGHTSNOWTHUNDER",
            background: "cloud",
            icon: snowImage
        },
        "Snow": {
            textKey: "WEATHER_COND_SNOW",
            background: "cloud",
            icon: snowImage
        },
        "HeavySnow": {
            textKey: "WEATHER_COND_HEAVYSNOW",
            background: "cloud",
            icon: snowImage
        },
        "HeavySnowThunder": {
            textKey: "WEATHER_COND_HEAVYSNOWTHUNDER",
            background: "cloud",
            icon: snowImage
        },
        "SnowThunder": {
            textKey: "WEATHER_COND_SNOWTHUNDER",
            background: "cloud",
            icon: snowImage
        },
        "Rain": {
            textKey: "WEATHER_COND_RAIN",
            background: "cloud",
            icon: rainImage
        },
        "RainThunder": {
            textKey: "WEATHER_COND_RAINTHUNDER",
            background: "cloud",
            icon: rainImage
        },
        "Fog": {
            textKey: "WEATHER_COND_FOG",
            background: "cloud",
            icon: fogImage
        },
        "Drizzle": {
            textKey: "WEATHER_COND_DRIZZLE",
            background: "cloud",
            icon: rainImage
        },
        "DrizzleThunder": {
            textKey: "WEATHER_COND_DRIZZLETHUNDER",
            background: "cloud",
            icon: rainImage
        },
    }


    if (codes.hasOwnProperty(code)) {
        if (dark) {
            let c = codes[code];
            c.background = "night";
            return c;
        }

        return codes[code];
    } else {
        return {
            textKey: "WEATHER_COND_UNKNOWN",
            background: "cloud",
            icon: questionImage
        };
    }
}

function sendCurrentWeather(message, location, type, options, user = "", skiiness = false) {
    let $ = _[options.locale];
    sendPreloader($("WEATHER_PREPARING"), message.channel).then(messageToEdit => {

        let locationPromise;
        if (type == "location") {
            //Call the geocoder to find the coordinates
            locationPromise = geocoder.search({
                q: location
            }).then(function(response) {
                //TODO: Check if the response is null
                if (response.length == 0) {
                    throw new Error("No location");
                }

                return Promise.resolve({
                    lat: response[0].lat,
                    lon: response[0].lon,
                    loc: response[0].display_name
                });
            });
        } else if (type = "id") {
            if (typeof location == "object") {
                locationPromise = Promise.resolve(location);
            } else {
                //Return an error
                let embed = new Discord.RichEmbed;
                embed.setTitle($("WEATHER_ERROR", {emoji: ":thunder_cloud_rain:"}));
                embed.setDescription($("WEATHER_ERROR_NOT_RETRIEVED"));
                embed.setColor(consts.colors.fail);
                embed.addField($("WEATHER_ERROR_DETAILS"), "reset id needed");
                embed.addField($("WEATHER_ERROR_TRY_THIS"), $("WEATHER_ERROR_TRY_THIS_DESCRIPTION", {prefix: prefix(message.guild.id)}));

                messageToEdit.edit(embed);
                return;
            }
        }

        var canvas = new Canvas(500, 410);
        var ctx = canvas.getContext('2d');
        let locString;

        locationPromise.then(function(locinfo) {
            locString = locinfo.loc.trim();
            return yrno.getWeather({
                lat: locinfo.lat,
                lon: locinfo.lon
            });
        }).then(function(weather) {
            return weather.getForecastForTime(weather.getFirstDateInPayload()).then(function(currentWeather) {
                if (currentWeather == null) {
                    currentWeather = {};
                }                

                let display;
                if (currentWeather.hasOwnProperty("icon")) {
                    display = getDataFromCode(currentWeather.icon, ctx, $);
                } else {
                    display = getDataFromCode("unknown", ctx, $);
                }

                let fill;
                const fills = {
                    "clear": {
                        primary: "rgb(120, 200, 255)",
                        secondary: "rgb(50, 180, 255)",
                        pen: "black"
                    },
                    "cloud": {
                        primary: "rgb(200, 200, 200)",
                        secondary: "rgb(170, 170, 170)",
                        pen: "black"
                    },
                    "night": {

                    }
                }

                fill = fills[display.background];

                let tempUnit = "°C";
                let speedUnit = "km/h";

                ctx.fillStyle = fill.primary;
                ctx.fillRect(0, 0, 350, 410);

                ctx.fillStyle = fill.secondary;
                ctx.fillRect(350, 0, 150, 410);

                ctx.font = "20px Contemporary";
                ctx.fillStyle = fill.pen;

                let currentWeatherText = $("WEATHER_CURRENT_WEATHER");
                if (user != "") {
                    currentWeatherText += " - " + user;
                }

                let currentWeatherWidth = ctx.measureText(currentWeatherText);
                if (currentWeatherWidth.width > 325) {
                    let textCanvas = new Canvas(currentWeatherWidth.width, 30);
                    let txtCtx = textCanvas.getContext('2d');
                    txtCtx.font = "20px Contemporary";
                    txtCtx.fillStyle = fill.pen;
                    txtCtx.fillText(currentWeatherText, 0, 20);

                    ctx.drawImage(textCanvas, 10, 10, 325, 30);
                } else {
                    ctx.fillText(currentWeatherText, (350 / 2) - (currentWeatherWidth.width / 2), 30);
                }

                //Draw 'as of' info
                ctx.font = "14px Contemporary";

                let pubDate
                
                if (currentWeather.hasOwnProperty("from")) {
                    pubDate = $("WEATHER_DATE_UPDATED", {updated:{date:moment(currentWeather.from), h24:options.h24}});
                } else {
                    pubDate = $("WEATHER_DATE_UPDATED", {updated: "Never"});
                }

                let dateWidth = ctx.measureText(pubDate);
                if (dateWidth.width > 325) {
                    let textCanvas = new Canvas(dateWidth.width, 50);
                    let txtCtx = textCanvas.getContext('2d');
                    txtCtx.font = "14px Contemporary";
                    txtCtx.fillStyle = fill.pen;
                    txtCtx.fillText(pubDate, 0, 20);

                    ctx.drawImage(textCanvas, 10, 30, 325, 50);
                } else {
                    ctx.fillText(pubDate, (350 / 2) - (dateWidth.width / 2), 50);
                }

                //Image goes between 100-200px y
                ctx.drawImage(display.icon, 100, 60);

                let locPart1;
                let locPart2;
                if (locString.includes(", ")) {
                    locPart1 = locString.substr(0, locString.indexOf(", "));
                    locPart2 = locString.substr(locString.indexOf(", ") + 2);
                }

                ctx.font = "bold 20px Contemporary";
                ctx.fillStyle = fill.pen;
                let lp1 = ctx.measureText(locPart1);
                if (lp1.width > 325) {
                    let textCanvas = new Canvas(lp1.width, 50);
                    let txtCtx = textCanvas.getContext('2d');
                    txtCtx.font = "bold 20px Contemporary";
                    txtCtx.fillStyle = fill.pen;
                    txtCtx.fillText(locPart1, 0, 40);

                    ctx.drawImage(textCanvas, 13, 180, 325, 50);
                } else {
                    ctx.fillText(locPart1, 175 - lp1.width / 2, 228);
                }

                ctx.font = "12px Contemporary";
                ctx.fillStyle = fill.pen;
                let lp2 = ctx.measureText(locPart2);
                if (lp2.width > 325) {
                    let textCanvas = new Canvas(lp2.width, 20);
                    let txtCtx = textCanvas.getContext('2d');
                    txtCtx.font = "12px Contemporary";
                    txtCtx.fillStyle = display.text;
                    txtCtx.fillText(locPart2, 0, 20);

                    ctx.drawImage(textCanvas, 13, 225, 325, 20);
                } else {
                    ctx.fillText(locPart2, 175 - lp2.width / 2, 245);
                }

                ctx.font = "40px Contemporary";
                let conditionWidth = ctx.measureText($(display.textKey));
                if (conditionWidth.width > 325) {
                    let textCanvas = new Canvas(conditionWidth.width, 50);
                    let txtCtx = textCanvas.getContext('2d');
                    txtCtx.font = "light 40px Contemporary";
                    txtCtx.fillStyle = fill.pen;
                    txtCtx.fillText($(display.textKey), 0, 40);

                    ctx.drawImage(textCanvas, 13, 240, 325, 50);
                } else {
                    ctx.fillText($(display.textKey), 175 - conditionWidth.width / 2, 280);
                }

                ctx.font = "30px Contemporary";
                let currentTemp = (currentWeather.hasOwnProperty("temperature") ? currentWeather.temperature.value : "---") + tempUnit;
                let tempWidth = ctx.measureText(currentTemp);
                ctx.fillText(currentTemp, 175 - tempWidth.width / 2, 315);


                //Draw wind info
                //met.no gives us the info in meters per second
                let windSpeed;

                if (currentWeather.hasOwnProperty("windSpeed")) {
                    let mps = parseFloat(currentWeather.windSpeed.mps);
                    if (options.imperial) {
                        //Change to miles per hour
                        windSpeed = (mps * 2.237).toFixed(1);
                    } else {
                        //Change to kilometers per hour
                        windSpeed = (mps * (1/1000) / (1/3600)).toFixed(1);
                    }
                } else {
                    windSpeed = "---";
                }

                ctx.drawImage(windImage, 50, 330, 20, 20);
                ctx.font = "14px Contemporary";
                let currentWind = windSpeed + " " + speedUnit;
                ctx.fillText(currentWind, 77, 345);

                //Draw humidity info
                ctx.drawImage(humidImage, 50, 355, 20, 20);
                let currentHumid = (currentWeather.hasOwnProperty("humidity") ? currentWeather.humidity.value : "---") + "%";
                ctx.fillText(currentHumid, 77, 370);

                //Draw pressure info
                ctx.drawImage(pressureImage, 50, 380, 20, 20);
                let currentPressure = (currentWeather.hasOwnProperty("pressure") ? currentWeather.pressure.value + " " + currentWeather.pressure.unit : "---"); //pressureResult.toFixed(sigPlaces) + " " + pressureUnit;
                ctx.fillText(currentPressure, 77, 395);

                //Draw wind speed
                ctx.drawImage(compassImage, 200, 330, 20, 20);
                if (currentWeather.hasOwnProperty("windDirection")) {
                    let compass = parseFloat(currentWeather.windDirection.deg);
                    let cardinal;
                    if (compass < 22) {
                        cardinal = "N";
                    } else if (compass < 67) {
                        cardinal = "NE";
                    } else if (compass < 112) {
                        cardinal = "E";
                    } else if (compass < 157) {
                        cardinal = "SE";
                    } else if (compass < 202) {
                        cardinal = "S";
                    } else if (compass < 247) {
                        cardinal = "SW";
                    } else if (compass < 292) {
                        cardinal = "W";
                    } else if (compass < 337) {
                        cardinal = "NW";
                    } else {
                        cardinal = "N";
                    }
                    ctx.fillText(compass + "° (" + cardinal + ")", 227, 345);
                } else {
                    ctx.fillText("---", 227, 345);
                }

                //Draw sunrise info
                ctx.drawImage(sunriseImage, 200, 355, 20, 20);
                //let sunriseTime = moment(data.query.results.channel.astronomy.sunrise, "h:m a");
                //ctx.fillText($("SPECIAL_STIME", {time: {date: sunriseTime, h24:options.h24}}), 227, 370);

                //Draw sunset info
                ctx.drawImage(sunsetImage, 200, 380, 20, 20);
                //let sunsetTime = moment(data.query.results.channel.astronomy.sunset, "h:m a");
                //ctx.fillText($("SPECIAL_STIME", {time: {date: sunsetTime, h24:options.h24}}), 227, 395);

                ctx.fillText("---", 227, 370);
                ctx.fillText("---", 227, 395);

                ctx.beginPath();
                ctx.strokeStyle = fill.pen;
                ctx.moveTo(350, 0);
                ctx.lineTo(350, 410);
                ctx.stroke();

                return weather.getFiveDaySummary();
            }).then(function(fiveDaySummary) {
                let current = 0;
                for (key in fiveDaySummary) {
                    let data = fiveDaySummary[key];
                    current++;
                    if (current > 5) {
                        break;
                    }

                    let display;
                    if (data.hasOwnProperty("icon")) {
                        display = getDataFromCode(data.icon, ctx, $);
                    } else {
                        display = getDataFromCode("unknown", ctx, $);
                    }

                    ctx.font = "20px Contemporary";

                    if (current == 1) {
                        dayText = $("WEATHER_TODAY").toUpperCase();
                    } else {
                        let day = moment(data.from);
                        if (options.locale.startsWith("zh")) {
                            dayText = day.locale("zh-cn").format("ddd");
                        } else {
                            dayText = day.locale(options.locale).format("ddd");
                        }
                    }
                    let dayWidth = ctx.measureText(dayText);
                    
                    if (dayWidth.width > 72) {
                        let textCanvas = new Canvas(dayWidth.width, dayWidth.emHeightAscent + dayWidth.emHeightDescent);
                        let txtCtx = textCanvas.getContext('2d');
                        txtCtx.font = "20px Contemporary";
                        txtCtx.fillStyle = ctx.fillStyle;
                        txtCtx.fillText(dayText, 0, 20);

                        ctx.rotate(-Math.PI / 2);
                        ctx.drawImage(textCanvas, -current * 82 + 5, 372 - dayWidth.emHeightAscent, 72, dayWidth.emHeightAscent + dayWidth.emHeightDescent);
                        ctx.rotate(Math.PI / 2);
                    } else {
                        let y = (current - 1) * 82 + 41 + (dayWidth.width / 2);
                        ctx.rotate(-Math.PI / 2);
                        ctx.fillText(dayText, -y, 372);
                        ctx.rotate(Math.PI / 2);
                    }

                    //Draw image
                    ctx.drawImage(display.icon, 380, (current - 1) * 82 + 9, 64, 64);

                    //Draw temperatures
                    ctx.fillText((data.hasOwnProperty("maxTemperature") ? parseFloat(data.maxTemperature.value).toFixed() : "---") + "°", 450, (current - 1) * 82 + 30);
                    ctx.fillText((data.hasOwnProperty("minTemperature") ? parseFloat(data.minTemperature.value).toFixed() : "---") + "°", 450, (current - 1) * 82 + 60);

                    ctx.beginPath();
                    ctx.moveTo(350, current * 82);
                    ctx.lineTo(500, current * 82);
                    ctx.stroke();
                }

                return Promise.resolve();
            });
        }).then(function() {
            //Send the required information

            let e = new Discord.RichEmbed();
            e.setColor(consts.colors.none);
            e.attachFile(new Discord.Attachment(canvas.toBuffer(), "weather.png"));
            e.setImage("attachment://weather.png");
            //e.setThumbnail("https://poweredby.yahoo.com/white_retina.png");
            e.setTitle($("WEATHER_TITLE"));
            //e.setURL(data.query.results.channel.link);
            // e.setColor(display.arr);
            e.setFooter(getRandom($("WEATHER_PLEASE_PRINT"),
                                $("WEATHER_TEAR_PERFORATED_LINE"),
                                $("WEATHER_SO_MANY_DEGREES"),
                                $("WEATHER_LONGER_DAYS")));
            message.channel.send(e).then(function() {
                messageToEdit.delete();
            });
        }).catch(function(err) {
            messageToEdit.edit(":large_orange_diamond: No dice :(");
        });
    });
}

function processCommand(message, isMod, command, options) {
    let unit = options.imperial ? "f" : "c";
    let time = options.h24 ? "24" : "12";
    let $ = _[options.locale];

    let skiiness = (command.indexOf("--skiiness") != -1)
    command = command.replace("--skiiness", "");
    command = command.trim();


    if (command.startsWith("weather ")) {
        var location = command.substr(8);

        if (command.indexOf("--user") == -1) {
            sendCurrentWeather(message, location, "location", options, "", skiiness);
        } else {
            location = location.replace("--user", "").trim();
            var users = parseUser(location, message.guild);
    
            if (users.length > 0) {
                if (settings.users.hasOwnProperty(users[0].id)) {
                    var userObject = settings.users[users[0].id];
                    if (userObject != null) {
                        if (userObject.hasOwnProperty("location")) {
                            sendCurrentWeather(message, userObject.location, "id", options, users[0].tag, skiiness);
                            return;
                        }
                    }
                }
                throw new UserInputError($("WEATHER_ERROR_UNSET_LOCATION", {user: users[0].username, prefix: prefix(message.guild.id)}));
            } else {
                throw new CommandError($("WEATHER_USER_NOT_FOUND"));
            }
        }
    } else if (command == "weather") {
        if (settings.users[message.author.id] == null) {
            settings.users[message.author.id] = {};
        }

        if (settings.users[message.author.id].location == null) {
            throw new UserInputError($("WEATHER_ERROR_UNSET_LOCATION", {user: message.author.username, prefix: prefix(message.guild.id)}));
        } else {
            sendCurrentWeather(message, settings.users[message.author.id].location, "id", options, message.author.tag, skiiness);
        }
    } else if (command.startsWith("setloc ")) {
        var location = command.substr(7);
        if (location == "") {
            message.reply($("SETLOC_ABOUT"));
        } else {
            geocoder.search({
                q: location
            }).then(function(response) {
                if (response == undefined || response.length < 1) {
                    throw new UserInputError($("SETLOC_CITY_NOT_FOUND"));
                }

                var userSettings = settings.users[message.author.id];
                    
                if (userSettings == null) {
                    userSettings = {};
                }

                userSettings.location = {
                    lat: response[0].lat,
                    lon: response[0].lon,
                    loc: response[0].display_name
                };

                message.reply($("SETLOC_CITY_SET", {place: response[0].display_name, lat: response[0].lat, long: response[0].lon}))
            });
        }
    } else if (command == "setloc") {
        let embed = new Discord.RichEmbed;
        embed.setColor(consts.colors.fail);
        embed.setTitle("Weather Unavailable");
        embed.setDescription("The weather command is unavailable in AstralMod 3.0. It will be coming back in AstralMod 3.1.");
        embed.setFooter("We sincerely apologise for the inconvenience.");

        message.channel.send(embed);
    }
}

module.exports = {
    name: "Weather",
    translatableName: "TITLE_WEATHER",
    constructor: function(discordClient, commandEmitter, constants) {
        client = discordClient;
        consts = constants;

        sunnyImage = new Canvas.Image();
        fs.readFile("./plugins/images/sunny.png", function(err, data) {
            sunnyImage.src = data;
        });

        moonyImage = new Canvas.Image();
        fs.readFile("./plugins/images/moony.png", function(err, data) {
            moonyImage.src = data;
        });

        cloudyImage = new Canvas.Image();
        fs.readFile("./plugins/images/cloudy.png", function(err, data) {
            cloudyImage.src = data;
        });


        thunderImage = new Canvas.Image();
        fs.readFile("./plugins/images/thunder.png", function(err, data) {
            thunderImage.src = data;
        });

        rainImage = new Canvas.Image();
        fs.readFile("./plugins/images/rain.png", function(err, data) {
            rainImage.src = data;
        });

        windImage = new Canvas.Image();
        fs.readFile("./plugins/images/wind.png", function(err, data) {
            windImage.src = data;
        });

        fogImage = new Canvas.Image();
        fs.readFile("./plugins/images/fog.png", function(err, data) {
            fogImage.src = data;
        });
        
        pressureImage = new Canvas.Image();
        fs.readFile("./plugins/images/pressure.png", function(err, data) {
            pressureImage.src = data;
        });

        humidImage = new Canvas.Image();
        fs.readFile("./plugins/images/humidity.png", function(err, data) {
            humidImage.src = data;
        });

        sunsetImage = new Canvas.Image();
        fs.readFile("./plugins/images/sunset.png", function(err, data) {
            sunsetImage.src = data;
        });

        sunriseImage = new Canvas.Image();
        fs.readFile("./plugins/images/sunrise.png", function(err, data) {
            sunriseImage.src = data;
        });

        compassImage = new Canvas.Image();
        fs.readFile("./plugins/images/compass.png", function(err, data) {
            compassImage.src = data;
        });

        snowImage = new Canvas.Image();
        fs.readFile("./plugins/images/snow.png", function(err, data) {
            snowImage.src = data;
        });

        rainsnowImage = new Canvas.Image();
        fs.readFile("./plugins/images/rainsnow.png", function(err, data) {
            rainsnowImage.src = data;
        });

        questionImage = new Canvas.Image();
        fs.readFile("./plugins/images/question.png", function(err, data) {
            questionImage.src = data;
        });

        unavailImage = new Canvas.Image();
        fs.readFile("./plugins/images/unavail.png", function(err, data) {
            unavailImage.src = data;
        });

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
    acquireHelp: function(helpCmd, message, h$) {
        var help = {};

        switch (helpCmd) {
            case "weather":
                help.title = prefix(message.guild.id) + "weather";
                help.usageText = prefix(message.guild.id) + "weather [options] [location]";
                help.helpText = h$("WEATHER_HELPTEXT");
                help.param1 = h$("WEATHER_PARAM1");
                help.availableOptions = h$("WEATHER_AVAILABLEOPTIONS");
                help.remarks = h$("WEATHER_REMARKS", {prefix: prefix(message.guild.id)});
                break;
            case "setloc":
                help.title = prefix(message.guild.id) + "setloc";
                help.usageText = prefix(message.guild.id) + "setloc [location]";
                help.helpText = h$("SETLOC_HELPTEXT");
                help.param1 = h$("SETLOC_PARAM1");
                help.remarks = h$("SETLOC_REMARKS");
                break;
        }

        return help;
    }
}