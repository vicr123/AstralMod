/****************************************
 *
 *   Flags: Plugin for AstralMod that contains flagging commands
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
const Discord = require('discord.js');

let ignoredMessages = [];

setInterval(() => { 
    ignoredMessages.length = 0;
    log("Cleared ignored messages list", logType.debug);
}, 300000)

function menu(options, $, user) { //direction, fetchOptions
    const message = options.message;
    const embed = new Discord.RichEmbed();
    embed.setTitle($("PINS_TITLE"));
    embed.setDescription($("PINS_DESCRIPTION"));
    embed.setColor("#81EC79");

    embed.setFooter($("PINS_FOOTER", {user: user.username}), user.avatarURL);



    currentMessage = message;
    let embedContent = "";

    if (message.content) embedContent = message.content;
    if (message.embeds.length) embedContent = $("PINS_CONTENT_WITH_EMBED", {embedcontent: unembed(message.embeds[0])}); //Unembed the first embed
    if (message.attachments.size > 0) {
        for (let [key, attachment] of message.attachments) {
            if (attachment.height != null) {
                if (embedContent == "") embedContent += "`" + $("PINS_IMAGE") + "`" + "\n";
                embed.setImage(attachment.proxyURL);
                break;
            }
        }
        if (embedContent == "")
            embedContent = $("PINS_NONTEXTUAL_CONTENT");

        if (ignoredMessages.includes(message.id))
            embedContent = "*" + $("PINS_MESSAGE_UNPINNABLE") + "*";

            embed.setFooter($("PINS_FOOTER_ATTACHMENTS", {user: user.username, count: message.attachments.size}), user.avatarURL);
        }

    if (!embedContent || ignoredMessages.includes(message.id)) {
        if (options.direction) return menu(options.direction, $, user); //attempt to move if a direction was specified
        throw new UserInputError($("PINS_MESSAGE_UNPINNABLE")); //throw an error if no direction was given
    } else {
        embed.addField(message.author.tag, embedContent.length > 1020 ? `${embedContent.substr(0, 1021)}...` : embedContent);
        return embed; //return the final embed to send or edit
    }
}

function processCommand(message, isMod, command, options) {
    let origmessage = message;
    let $ = _[options.locale];
    if (command.startsWith("pin ")) {
        let currentMessage;
        let author = message.author.id;
        let number = command.substr(4) || 2;
        if (isNaN(number)) throw new UserInputError($("PINS_INVALID_ENTRY"));
        let int = parseInt(number);
        let id = 0;
        if (int < 1) throw new UserInputError($("PINS_INVALID_ENTRY_RANGE"));
        if (number.length > 8) { id = number; int = 1; }

        message.delete().then(async function(message) {
            if (id > 50)
                return [await message.channel.fetchMessage(number)];
            return (await message.channel.fetchMessages({ limit: int })).array()
        }).then(function(messages) { //after collecting messages
            currentMessage = messages[int - 1]
            let message = messages[int - 1]
            message.channel.send(menu({ message, int }, $, origmessage.author)).then(function(flaggingMessage) {
                ignoredMessages.push(flaggingMessage.id); //reactions
                flaggingMessage.react("⬆").then(flaggingMessage.react("⬇")).then(flaggingMessage.react(consts.config.pinToPinEmoji)).then(flaggingMessage.react("🚫"));

                const move = function(direction) {
                    if (currentMessage.id == flaggingMessage.id) return;
                    message.channel.fetchMessages(direction == "down" ? { limit: 1, after: currentMessage.id } :
                     { limit: 1, before: currentMessage.id }).then(function(messages) {
                        if (!messages.size) return;
                        let message = messages.first();
                        currentMessage = message;
                        flaggingMessage.edit(menu({ direction, message }, $, origmessage.author))
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
                    } else if (reaction.emoji.name == consts.config.pinToPinEmoji) {
                        continueReactions = false;
                        let embed = menu({ message: currentMessage }, $, currentUser);
                        embed.setTitle($("PINS_TITLE"));
                        embed.setDescription($("PINS_PIN_SUCCESS"));
                        embed.setColor("#81EC79");
                        
                        flaggingMessage.edit(embed);

                        //Pin the message
                        if (!settings.users[author]) settings.users[author] = {};
                        if (!settings.users[author].flags) settings.users[author].flags = [];
                        let flagObject = { channel: currentMessage.channel.id, message: currentMessage.id, pinConfirmationMessage: flaggingMessage.id }
                        settings.users[author].flags.push(flagObject);

                    } else if (reaction.emoji.name == "🚫") {
                        continueReactions = false;
                        let embed = new Discord.RichEmbed();
                        embed.setTitle($("PINS_TITLE"));
                        embed.setDescription($("PINS_PIN_CANCEL"));
                        embed.setColor("#81EC79");
                        embed.setFooter($("PINS_FOOTER", {user: currentUser.username}), currentUser.avatarURL);
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
                message.channel.send($("PINS_COULDNT_PIN"));
            });
        }).catch(function(err) {
            message.reply($("PINS_COULDNT_PIN"))
        });
    } else if (command == "pin") {
        return message.reply($("PINS_INVALID_COMMAND", {prefix: prefix(message.guild.id)}));
    } else if (command.startsWith("pins")) {
        let number = command.substr(5);
        let nsfw = message.channel.nsfw;

        //Get flags
        let flagArray = settings.users[message.author.id].flags;
        if (!flagArray || flagArray.length < 1) {
            let embed = new Discord.RichEmbed;
            embed.setTitle($("PINS_NO_PINS"));
            embed.setDescription($("PINS_NO_PINS_DESCRIPTION", {prefix: prefix(message.guild.id)}));
            return message.channel.send(embed);
        }

        if (number.startsWith("--view")) {
            let pinNumber = number.substr(7);
            if (pinNumber > flagArray.length || pinNumber < 0) throw new UserInputError($("PINS_INVALID_PAGE"));

            let flagItem = flagArray[pinNumber - 1];
            let channel = client.channels.get(flagItem.channel);
            if (!channel) throw new CommandError($("PINS_CHANNEL_GONE"));
            if (channel.nsfw && !nsfw) throw new CommandError($("PINS_CHANNEL_NSFW"));

            let embed = new Discord.RichEmbed;
            embed.setTitle($("PINS_PIN_TITLE", {emoji: consts.config.pinToPinEmoji, pinNumber: pinNumber}));
            embed.setDescription($("PINS_JUMP_TEXT", {jump: `[${$("PINS_JUMP")}](https://discordapp.com/channels/${channel.guild.id}/${channel.id}/${flagItem.message})`, channel: `<#${channel.id}>`}))
            embed.setColor("#81EC79");

            channel.fetchMessage(flagItem.message).then(function(fMessage) {
                let flagMessage = fMessage.content + "\n";

                if (settings.guilds[channel.guild.id].echoOffensive) flagMessage = filterOffensive(fMessage.content) + "\n";

                if (flagMessage.trim() != "") embed.addField(fMessage.author.tag, flagMessage.length > 1020 ? `${flagMessage.substr(0, 1021)}...` : flagMessage);
                if (fMessage.attachments.size > 0) {
                    let attachments = "";
                    let attachmentsCount = 0;
                    for (let [, attachment] of fMessage.attachments) {
                        attachments += `[${attachment.filename}](${attachment.url})`;

                        if (attachment.height != null) {
                            if (fMessage.content == "") flagMessage = $("PINS_IMAGE");
                            embed.setImage(attachment.proxyURL);
                        }

                        attachmentsCount++;
                    }

                    embed.addField($("PINS_ATTACHMENT", {count: attachmentsCount}), attachments);
                }

                message.channel.send(embed);                
            }).catch(err => {
                log(err, logType.warning);
                embed.addField($("PINS_ERROR"), $("PINS_MESSAGE_GONE"));
                message.channel.send(embed);
            });
            return;
        }

        if (isNaN(number) || !number || number <= 0) number = 1;
        number = Math.round(number);
        if (number > (flagArray.length / 4) + 1) number = Math.ceil(flagArray.length / 4);
        let embed = new Discord.RichEmbed;
        embed.setTitle($("PINS_PINS_TITLE", {emoji: consts.config.pinToPinEmoji}));
        embed.setDescription($("PINS_PINS_DESCRIPTION"));
        embed.setColor("#81EC79");


        let fullPages = Math.ceil(flagArray.length / 4);
        if (fullPages == 1) {
            embed.setFooter($("PINS_HOWTO_PIN", {prefix:prefix(message.guild.id)}));
        } else {
            embed.setFooter($("PINS_HOWTO_PAGINATE", {pageNumber:number, numberOfPages: fullPages, prefix:prefix(message.guild.id)}));
        }

        let get4Messages = function(page) {
            if ((page - 1) * 4 > flagArray.length) {
                return [];
            }

            let ms = [];

            for (let i = (page - 1) * 4; i < flagArray.length; i++) {
                ms.push(flagArray[i]);
                if (ms.length == 4) break;
            }

            return ms;
        }

        let getEmbed = async () => {
            embed.fields.length = 0;
            for (let flagItem of get4Messages(number)) {
                embed.setFooter($("PINS_HOWTO_PAGINATE", {pageNumber: number, numberOfPages: fullPages, prefix: prefix(message.guild.id)}));
                
                let channel = client.channels.get(flagItem.channel);
                let pinNumber = flagArray.findIndex(e => e === flagItem) + 1;
    
                let fieldName =  $("PINS_PIN_TITLE_COMPACT", {pinNumber})
                if (!channel) {
                    embed.addField(fieldName, $("PINS_CHANNEL_GONE"));
                }
    
                if (channel.nsfw && !nsfw) {
                    embed.addField(fieldName, $("PINS_CHANNEL_NSFW"));
                }
    
                try {
                    let message = await channel.fetchMessage(flagItem.message);
                    let flagMessage = message.content;
        
                    if (settings.guilds[channel.guild.id].echoOffensive) flagMessage = filterOffensive(message.content)
                    if (message.attachments.size > 0) {
                        flagMessage += "\n";
                        flagMessage += $("PINS_HOWTO_VIEW", {prefix: prefix(message.guild.id), pinNumber})
                    }
        
                    if (message.embeds.length)
                        flagMessage = $("PINS_CONTENT_WITH_EMBED", {embedcontent:unembed(message.embeds[0])}) //Unembed the first embed
        
                        let credit = $("PINS_PIN_AUTHOR", {pinAuthor: message.author, channel: message.channel, jumpToMessage:`[${$("PINS_JUMP")}](https://discordapp.com/channels/${channel.guild.id}/${channel.id}/${flagItem.message})`, interpolation: { escapeValue: false }});
                        embed.addField(fieldName, flagMessage.length+credit.length > 800 ? 
                        `${flagMessage.substr(0, 1021-credit.length-220)}...\n${credit}` : `${flagMessage}\n${credit}`);
    
                } catch (err) {
                    embed.addField(fieldName, $("PINS_MESSAGE_GONE"));
                }
            }
        }

        getEmbed().then(() => {
            message.channel.send(embed).then(m => {
                if (fullPages == 1) return;
                m.react("◀").then(() => {
                    m.createReactionCollector((r, u) => r.emoji.name == "◀" && u.id == message.author.id).on('collect', rr => { 
                        rr.remove(message.author.id);

                        if (!((number - 1) < 1)) {
                            --number;
                            getEmbed().then(() => m.edit(embed))
                        }
                    });
                })
                m.react("▶").then(() => {
                    m.createReactionCollector((r, u) => r.emoji.name == "▶" && u.id == message.author.id).on('collect', rr => {     
                        rr.remove(message.author.id);

                        if (!((number + 1) > fullPages)) {
                            ++number;
                            getEmbed().then(() => m.edit(embed))
                        }
                    });
                })            
            })
        });
    } else if (command.startsWith("unpin ")) {
        var unflagging = command.substr(6);
        var index = parseInt(unflagging) - 1;

        if (isNaN(index) || index < 0) return message.reply($("PINS_UNPIN_USAGE", {prefix: prefix(message.guild.id)}));
        if (settings.users[message.author.id] == null) return message.reply($("PINS_NO_PINS"));
        if (settings.users[message.author.id].flags == null) return message.reply($("PINS_NO_PINS"));
        if (settings.users[message.author.id].flags.length == 0) return message.reply($("PINS_NO_PINS"));
        if (settings.users[message.author.id].flags.length <= index) return message.reply($("PINS_NOT_THAT_MANY_PINS"));

        client.channels.get(settings.users[message.author.id].flags[index].channel).fetchMessage(settings.users[message.author.id].flags[index].message).then(pinned => {
            pinned.reactions.find(r => r.users.some(u => u.id == message.author.id)).remove(message.author);
        });

        client.channels.get(settings.users[message.author.id].flags[index].channel).fetchMessage(settings.users[message.author.id].flags[index].pinConfirmationMessage).then(confirmation => {
            confirmation.delete();
        })

        settings.users[message.author.id].flags.splice(index, 1);
        message.reply($("PINS_UNPIN_SUCCESS"));
    }
}

function messageReactionAdd(messageReaction, user) {
    if (user.bot) return;
    if (ignoredMessages.includes(messageReaction.message.id)) return;
    if (messageReaction.message.guild == undefined) return;
    if (!settings.guilds[messageReaction.message.guild.id].pinToPin) return;
    if (messageReaction.emoji.name !== consts.config.pinToPinEmoji) return;
    if (settings.guilds[messageReaction.message.guild.id].blocked[messageReaction.message.channel.id].includes("pin") || 
        settings.guilds[messageReaction.message.guild.id].blocked["guild"].includes("pin") ||
        settings.guilds[messageReaction.message.guild.id].blocked[messageReaction.message.channel.id].includes("all") || 
        settings.guilds[messageReaction.message.guild.id].blocked["guild"].includes("all")) return;

    let $ = _[settings.users[user.id].locale];

    if (!settings.users[user.id]) settings.users[user.id] = {};
    if (!settings.users[user.id].flags) settings.users[user.id].flags = [];
    let embedContent;
    let showAttachments;

    try {
        let embed = menu({ message: messageReaction.message }, $, user);
        embed.setTitle($("PINS_TITLE"));
        embed.setDescription($("PINS_PIN_SUCCESS"));
        embed.setFooter($(showAttachments ? "PINS_SHORTCUT_FOOTER_ATTACHMENTS" : "PINS_SHORTCUT_FOOTER", {user: user.username, count: parseInt(messageReaction.message.attachments.count)}), user.avatarURL)

        messageReaction.message.channel.send(embed).then(confirm => {
            let flagObject = { channel: messageReaction.message.channel.id, message: messageReaction.message.id, pinConfirmationMessage: confirm.id }
            settings.users[user.id].flags.push(flagObject);        
        });
    } catch (err) {
        log(err, logType.debug) //Something went wrong but frankly we don't care that much
    }
}

function messageReactionRemove(messageReaction, user) {
    if (user.bot) return;
    if (ignoredMessages.includes(messageReaction.message.id)) return;
    if (messageReaction.message.guild == undefined) return;
    if (!settings.guilds[messageReaction.message.guild.id].pinToPin) return;
    if (messageReaction.emoji.name !== consts.config.pinToPinEmoji) return;

    let $ = _[settings.users[user.id].locale];
    if (!settings.users[user.id]) settings.users[user.id] = {};
    if (!settings.users[user.id].flags) settings.users[user.id].flags = [];

    try {
        let message = settings.users[user.id].flags.splice(settings.users[user.id].flags.findIndex(f => f.message == messageReaction.message.id), 1)[0];
        client.channels.get(message.channel).fetchMessage(message.pinConfirmationMessage).then(m => m.delete());
    } catch (err) {
        log(err, logType.debug) //Something went wrong but frankly we don't care that much
    }
}

module.exports = {
    name: "Portable Pins",
    translatableName: "TITLE_FLAG",
    constructor: function(discordClient, commandEmitter, constants) {
        client = discordClient;
        consts = constants;

        commandEmitter.on('processCommand', processCommand);
        commandEmitter.on('messageReactionAdd', messageReactionAdd);
        commandEmitter.on('messageReactionRemove', messageReactionRemove);
    },
    destructor: function(commandEmitter) {
        commandEmitter.removeListener('processCommand', processCommand);
        commandEmitter.removeListener('messageReactionAdd', messageReactionAdd);
        commandEmitter.removeListener('messageReactionRemove', messageReactionRemove);
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
    acquireHelp: function(helpCmd, message, h$) {
        var help = {};

        switch (helpCmd) {
            case "pin":
                help.title = prefix(message.guild.id) + "pin";
                help.usageText = prefix(message.guild.id) + "pin [number | message id]";
                help.helpText = h$("PIN_HELPTEXT");
                help.param1 = h$("PIN_PARAM1");
                help.availableOptions = h$("PIN_AVAILABLEOPTIONS");
                help.remarks = h$("PIN_REMARKS");
                break;
            case "pins":
                help.title = prefix(message.guild.id) + "pins";
                help.usageText = prefix(message.guild.id) + "pins [number]";
                help.helpText = h$("PINS_HELPTEXT");
                help.param1 = h$("PINS_PARAM1");
                break;
            case "unpin":
                help.title = prefix(message.guild.id) + "unpin";
                help.usageText = prefix(message.guild.id) + "unpin [pin id]";
                help.helpText = h$("UNPIN_HELPTEXT");
                help.param1 = h$("UNPIN_PARAM1", {prefix: prefix(message.guild.id)});
        }

        return help;
    }
}
