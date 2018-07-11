/****************************************
 *
 *   Flags: Plugin for AstralMod that contains flagging commands
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
const Discord = require('discord.js');

function unembed(embed) {
    let embedString = "";
    if (embed.author) embedString += `**${embed.author.name}**\n`;
    if (embed.title) embedString += `**${embed.title}**\n`;
    if (embed.description) embedString += `${embed.description}\n`;
    for (let i in embed.fields) {
        embedString += `\n**${embed.fields[i].name}**\n${embed.fields[i].value}\n`
    }
    if (embed.footer) embedString += `\n${embed.footer.text}`
    return embedString || "Empty embed"; //returns a string
}

function menu(options) { //direction, fetchOptions
    const message = options.message;
    const embed = new Discord.RichEmbed();
    embed.setTitle("Portably pin a message");
    embed.setDescription("Select a message to pin");
    embed.setColor("#00C000");

    currentMessage = message;
    let embedContent = "";

    if (message.content) embedContent = message.content;
    if (message.embeds.length) embedContent = `\`Embed\`\n${unembed(message.embeds[0])}` //Unembed the first embed
    if (message.attachments.size > 0) {
        for (let [key, attachment] of message.attachments) {
            if (attachment.height != null) {
                if (embedContent == "") embedContent += "`Image`\n";
                embed.setImage(attachment.proxyURL);
                break;
            }
        }
        if (embedContent == "") embedContent = "`Nontextual Content`"
        embed.setFooter(message.attachments.size + " attachments");
    }

    if (!embedContent) {
        if (options.direction) return menu(options.direction, options); //attempt to move if a direction was specified
        throw new UserInputError("Cannot pin this message. Please specify another message."); //throw an error if no direction was given
    } else {
        embed.addField(message.author.tag, embedContent.length > 1020 ? `${embedContent.substr(0, 1021)}...` : embedContent);
        return embed; //return the final embed to send or edit
    }
}

function processCommand(message, isMod, command) {
    if (command.startsWith("pin ")) {
        let flaggingMessage;
        let currentMessage;
        let author = message.author.id;
        let number = command.substr(4);
        if (isNaN(number)) throw new UserInputError("Invalid number");
        number = parseInt(number);
        if (number > 50 || number < 1) throw new UserInputError("Specify a number between 1 and 50");

        message.delete().then(function(message) {
            return message.channel.fetchMessages({ limit: number })
        }).then(function(messages) { //after collecting messages
            currentMessage = messages.array()[number - 1]
            let message = messages.array()[number - 1]
            message.channel.send(menu({ message, number })).then(function(flaggingMessage) { //reactions
                flaggingMessage.react("⬆").then(flaggingMessage.react("⬇")).then(flaggingMessage.react("📌")).then(flaggingMessage.react("🚫"));

                const move = function(direction) {
                    message.channel.fetchMessages(direction == "down" ? { limit: 1, after: currentMessage.id } :
                     { limit: 1, before: currentMessage.id }).then(function(messages) {
                        if (!messages.size || currentMessage.id == flaggingMessage.id) return;
                        let message = messages.first();
                        currentMessage = message;
                        flaggingMessage.edit(menu({ direction, message }))
                    });
                }

                const callReactions = function(message) {
                    return message.awaitReactions(function(reaction) {
                        if (reaction.count > 1 && reaction.users.has(author)) return true;
                        return false;
                    }, {
                        max: 1
                    })
                }

                const reactionCollectionFunction = function(reactions) {
                    let reaction = reactions.first();
                    let currentUser;
                    for (let [id, user] of reaction.users) {
                        if (id != client.user.id) {
                            reaction.remove(user);
                            currentUser = user;
                        }
                    }

                    let continueReactions = true;
                    if (reaction.emoji.name == "⬆") {
                        move("up")
                    } else if (reaction.emoji.name == "⬇") {
                        move("down")
                    } else if (reaction.emoji.name == "📌") {
                        continueReactions = false;
                        let embed = menu({ message: currentMessage })
                        embed.setTitle("Portably pin a message");
                        embed.setDescription("This message has been portably pinned.");
                        embed.setColor("#00C000");
                        flaggingMessage.edit(embed)

                        //Pin the message
                        if (!settings.users[author]) settings.users[author] = {};
                        if (!settings.users[author].flags) settings.users[author].flags = [];
                        let flagObject = { channel: currentMessage.channel.id, message: currentMessage.id }
                        settings.users[author].flags.push(flagObject);

                    } else if (reaction.emoji.name == "🚫") {
                        continueReactions = false;
                        let embed = new Discord.RichEmbed();
                        embed.setTitle("Portably pin a message");
                        embed.setDescription("Message pinning cancelled.");
                        embed.setColor("#00C000");
                        flaggingMessage.edit(embed);
                    }

                    if (continueReactions) {
                        callReactions(flaggingMessage).then(reactionCollectionFunction);
                    } else {
                        flaggingMessage.clearReactions();
                    }
                }

                return callReactions(flaggingMessage).then(reactionCollectionFunction);
            }).catch(function(err) {
                message.channel.send(`${err.message}\n${err.stack}`);
            });
        });
    } else if (command == "pin") {
        return message.reply("To pin a message, you'll need to specify which one to pin. For more information, type `" + prefix + "help pin`.");
    } else if (command.startsWith("pins")) {
        let number = command.substr(5);
        let nsfw = message.channel.nsfw;

        //Get flags
        let flagArray = settings.users[message.author.id].flags;
        if (!flagArray) {
            let embed = new Discord.RichEmbed;
            embed.setTitle("No Pins");
            embed.setDescription("You haven't pinned any messages. To pin a message, use `" + prefix + "pin`.");
            return message.channel.send(embed);
        }

        if (number.startsWith("--image")) {
            let pinNumber = number.substr(8);
            //Retrieve image
            let embed = new Discord.RichEmbed;
            embed.setTitle(":pushpin: Portable Pin #" + pinNumber);
            embed.setColor("#00C000");
            pinNumber = parseInt(pinNumber);

            if (pinNumber > flagArray.length || pinNumber < 0) throw new UserInputError("Invalid Page.");
            let flagItem = flagArray[pinNumber - 1];
            let channel = client.channels.get(flagItem.channel);
            if (!channel) throw new CommandError("Can't find channel");
            if (channel.nsfw && !nsfw) throw new CommandError("Pin in NSFW channel. View pins in NSFW channel to see pin.");

            channel.fetchMessage(flagItem.message).then(function(fMessage) {
                let flagMessage = fMessage.content + "\n";

                if (settings.guilds[channel.guild.id].echoOffensive) flagMessage = filterOffensive(fMessage.content) + "\n";
                if (fMessage.content == "") {
                    if (fMessage.attachments.size > 0) {
                        for (let [key, attachment] of fMessage.attachments) {
                            if (attachment.height != null) {
                                if (fMessage.content == "") flagMessage = "Image";
                                embed.setImage(attachment.proxyURL);
                                break;
                            }
                        }
                        embed.setFooter(fMessage.attachments.size + " attachments");
                    }
                }
                if (flagMessage.trim() != "") embed.addField(fMessage.author.tag, flagMessage.substr(0, 1000));
                if (fMessage.attachments.size > 0) {
                    let attachments = "";
                    for (let [key, attachment] of fMessage.attachments) {
                        attachments += "[" + attachment.filename + "](" + attachment.url + ")\n";
                    }
                    embed.addField("Attachments", attachments);
                }

                message.channel.send(embed);
            }).catch(function() {
                embed.addField("Error", "Can't find message");
                message.channel.send(embed);
            });
            return;
        }
        if (isNaN(number) || number == "") number = 1;
        let embed = new Discord.RichEmbed;
        embed.setTitle(":pushpin: Portable Pins");
        embed.setDescription("Here are all the messages you've pinned");
        embed.setColor("#00C000");

        if (number > (flagArray.length / 5) + 1) throw new UserInputError("Invalid Page.");

        let fullPages = Math.floor((flagArray.length / 5) + 1);
        if (fullPages == 1) {
            embed.setFooter("To pin a message, use the " + prefix + "pin command");
        } else {
            embed.setFooter("Page " + number + "/" + fullPages + ". To see another page, use " + prefix + "pins [number]");
        }

        number--;

        let getMessageNumber = function(i) {
            if (i >= (flagArray.length > 5 * number + 5 ? 5 * number + 5 : flagArray.length)) return message.channel.send(embed);
            let flagItem = flagArray[i];
            let channel = client.channels.get(flagItem.channel);
            if (!channel) {
                embed.addField("Pin #" + (i + 1), "Can't find channel");
                getMessageNumber(++i);
                return;
            }

            if (channel.nsfw && !nsfw) {
                embed.addField("Pin #" + (i + 1), "Pin in NSFW channel. View pins in NSFW channel to see pin.");
                getMessageNumber(++i);
                return;
            }

            channel.fetchMessage(flagItem.message).then(function(message) {
                let flagMessage = message.content + "\n";

                if (settings.guilds[channel.guild.id].echoOffensive) flagMessage = filterOffensive(message.content) + "\n";
                if (message.content == "") {
                    for (let [key, attachment] of message.attachments) {
                        if (attachment.height != null) {
                            if (message.content == "") flagMessage = "`Image`\nUse `" + prefix + "pins --image " + (i + 1) + "` to view.\n";
                            break;
                        }
                    }
                }

                flagMessage += "     - *" + message.author.tag + "* in " + message.channel;
                embed.addField("Pin #" + (i + 1), flagMessage.substr(0, 1000));
                getMessageNumber(++i);
            }).catch(function() {
                embed.addField("Pin #" + (i + 1), "Can't find message");
                getMessageNumber(++i);
            });
        };
        getMessageNumber(5 * number);
    } else if (command.startsWith("unpin ")) {
        var unflagging = command.substr(6);
        var index = parseInt(unflagging) - 1;

        if (isNaN(index)) return message.reply("Usage: `" + prefix + "unpin id`. For the `id` parameter, use `" + prefix + "pins`. For more information, type `" + prefix + "help unpin`");
        if (settings.users[message.author.id] == null) return message.reply("You have no portable pins.");
        if (settings.users[message.author.id].flags == null) return message.reply("You have no portable pins.");
        if (settings.users[message.author.id].flags.length == 0) return message.reply("You have no portable pins.");
        if (settings.users[message.author.id].flags.length <= index) return message.reply("You don't have that many pinned messages.");

        settings.users[message.author.id].flags.splice(index, 1);
        message.reply("That message has been unpinned.");
    }
}

module.exports = {
    name: "Portable Pins",
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
                "pin",
                "pins",
                "unpin"
            ],
            modCommands: [

            ]
        }
    },
    acquireHelp: function(helpCmd) {
        var help = {};

        switch (helpCmd) {
            case "pin":
                help.title = prefix + "pin";
                help.usageText = prefix + "pin message";
                help.helpText = "Portably pin a message for reference";
                help.param1 = "The message to pin; 1 for the last message sent in this channel, 2 for the second last message, etc.";
                help.remarks = "AstralMod pins messages by taking the message ID and channel ID. If the message is deleted or if the channel is deleted, the message will not be retrievable."
                break;
            case "pins":
                help.title = prefix + "pins";
                help.usageText = prefix + "pins [number]";
                help.helpText = "Show pinned messages";
                help.param2 = "*Optional Parameter*\n" +
                    "The page number you wish to view";
                break;
            case "unpin":
                help.title = prefix + "unpin";
                help.usageText = prefix + "unpin id";
                help.helpText = "Unpins a messge";
                help.param1 = "The pin # to unpin. To get pin numbers, use `" + prefix + "pins`";
        }

        return help;
    }
}
