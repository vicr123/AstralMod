const Discord = require('discord.js');
const client = new Discord.Client();

var expletiveFilter = false;
var lastMessages = {};
var sameMessageCount = {};
var poweroff = false;

function randomnum(min, max) { 
    return Math.random() * (max - min) + min;
}

client.on('ready', () => {
    console.log("AstralMod is now ready!");
});

function messageChecker(oldMessage, newMessage) {
    var message;
    if (newMessage == null) {
        message = oldMessage;
    } else {
        message = newMessage;
    }
    
    var msg = message.content;
    if (lastMessages[message.author.id] == msg && sameMessageCount[message.author.id] > 3) {
        console.log("Spam limits kicking in!");
        switch (Math.floor(Math.random() * 1000) % 4) {
            case 0:
                message.reply("Well... We all heard you.");
                break;
            case 1:
                message.reply("Stop typing the same thing! You're like a broken record!");
                break;
            case 2:
                message.reply("Hmm... Not sure if you'd actually say the same thing more than three times in public.");
                break;
            case 3:
                message.reply("Is that the only phrase you know? Can you try typing something else?");
                break;
        }
        
        message.delete();
        return;
    }
    
    if (expletiveFilter) {
        //Check for expletives
        var exp = msg.search(/(\s|^|.)(shit|shite|shitty|bullshit|fuck|fucking|ass|penis|cunt|faggot)(\s|$|.)/i);
        if (exp != -1) { //Gah! They're not supposed to say that!
            console.log("Expletive caught at " + parseInt(exp));
            switch (Math.floor(Math.random() * 1000) % 5) {
                case 0:
                    message.reply("I'm very disappointed in you. This is me <:angryvt:282006699802361856>");
                    break;
                case 1:
                    message.reply("Hey! Let's not have any of that please.");
                    break;
                case 2:
                    message.reply("Did you just...");
                    break;
                case 3:
                    message.reply("Cool. Now let's not forget the rules.");
                    break;
                case 4:
                    message.reply("If I'm not going to delete it, a mod will. Let's save them some work.");
                    break;
            }
            
            message.delete();
            return;
        }
        
        //Check for links
        exp = msg.search(/(http(s)?:\/\/.)?(www\.)?[-a-zA-Z0-9@:%._\+~#=]{2,256}\.[a-z]{2,6}\b([-a-zA-Z0-9@:%_\+.~#?&//=]*)/i);
        if (exp != -1) { //This is a link.
            console.log("Link caught at " + parseInt(exp));
            switch (Math.floor(Math.random() * 1000) % 5) {
                case 0:
                    message.reply("I've replaced your link with a not-so-link-like link: click here");
                    break;
                case 1:
                    message.reply("Whatever that link was... I hope it didn't contain some bad stuff...");
                    break;
                case 2:
                    message.reply("Did you just...");
                    break;
                case 3:
                    message.reply("Cool. Now let's not forget the rules.");
                    break;
                case 4:
                    message.reply("If I'm not going to delete it, a mod will. Let's save them some work.");
                    break;
            }
            
            message.delete();
            return;
        }
        
        //Check for images.
        //Other attachments are ok.
        if (message.attachments != null) {
            console.log("Beginning Attachment Check!");
            var block = false;
            for (let [key, attachment] of message.attachments) {
                if (attachment.height != null) {
                    block = true;
                    break;
                }
            }
            
            if (block) {
                console.log("Image caught");
                switch (Math.floor(Math.random() * 1000) % 5) {
                    case 0:
                        message.reply("A picture says a thousand words. That picture said about fifteen words. These exact words.");
                        break;
                    case 1:
                        message.reply("Let's not make all the other things disappear...");
                        break;
                    case 2:
                        message.reply("Did you just...");
                        break;
                    case 3:
                        message.reply("Cool. Now let's not forget the rules.");
                        break;
                    case 4:
                        message.reply("If I'm not going to delete it, a mod will. Let's save them some work.");
                        break;
                }
                message.delete();
                return;
            }
        }
    }
    
    if (msg.startsWith("mod:")) {
        //Check for moderator/admin permission
        
        //Moderator ID: 282068037664768001
        //Admin ID:     282068065619804160
        if (message.member.roles.find("name", "Admin") || message.member.roles.find("name", "Moderator")) { //Thanks Aren! :D
            var command = msg.substr(4);
            switch (command) {
                case "ping":
                    message.channel.send('<:vtBoshyTime:280178631886635008> PONG! I want to play pong too... :\'(');
                    break;
                case "pong":
                    message.channel.send('<:vtBoshyTime:280178631886635008> PING!');
                    break;
                case "filter":
                    if (expletiveFilter) {
                        message.channel.send(':arrow_forward: Expletive Filter: on');
                    } else {
                        message.channel.send(':arrow_forward: Expletive Filter: off');
                    }
                    message.delete();
                    break;
                case "filter on":
                    if (expletiveFilter) {
                        message.channel.send(':arrow_forward: Expletive Filter is already on.');
                    } else {
                        expletiveFilter = true;
                        message.channel.send(':white_check_mark: Expletive Filter is now turned on.');
                        console.log("Expletive Filter is now on.");
                    }
                    message.delete();
                    break;
                case "filter off":
                    if (expletiveFilter) {
                        expletiveFilter = false;
                        message.channel.send(':white_check_mark: Expletive Filter is now turned off.');
                        console.log("Expletive Filter is now off.");
                    } else {
                        message.channel.send(':arrow_forward: Expletive Filter is already off.');
                    }
                    message.delete();
                    break;
                case "reboot":
                    message.channel.send(":white_check_mark: We'll be back in a bit.").then(function() {
                        client.destroy();
                        client.login('MjgyMDQ4NTk5NTc0MDUyODY0.C4g2Pw.yFGdUuMlZITH99tWEic0JxIUGJ4').then(function() {
                            message.channel.send(":white_check_mark: AstralMod is back online!");
                        }).catch(function() {
                            console.log("[ERROR] Login failed.");
                        });
                    });
                    break;
                case "help":
                    message.channel.send(
                        "```\n" +
                        "ping  pong        Asks AstralMod to reply with a message\n" +
                        "filter [on|off]   Queries the chat filter.\n" +
                        "                  PARAMETER 1 (OPTIONAL)\n" + 
                        "                  Type on to set the filter on.\n" +
                        "                  Type off to set the filter off.\n" +
                        "help              Prints this help message.\n" +
                        "reboot            Asks AstralMod to reconnect.\n" +
                        "poweroff          Asks AstralMod to leave the server.\n" +
                        "```")
                default:
                    if (command.startsWith("uinfo")) {
                        /*if (message.channel.id == 277923386959855626) {
                            command = command.substr(6);
                            console.log(command);
                            client.fetchUser(command).then(function(user) {
                                embed = new Discord.RichEmbed();
                                embed.setAuthor(user.username, user.displayAvatarURL);
                                embed.setColor("#FF0000");
                                var message = "Discriminator:" + user.discriminator + "\n" + 
                                              "Created at: " + user.createdAt.toUTCString();
                                embed.setDescription(message);
                                message.channel.sendEmbed(quoteofday)
                            }).catch(function() {
                                message.channel.send(':no_entry_sign: That didn\'t work. You might want to try again.');
                            });
                        } else {
                            message.channel.send(':no_entry_sign: NO: Unable to use this command in this channel.');
                        }*/
                            message.channel.send(':no_entry_sign: Not working yet. Check back later.');
                    }
            }
            
            if (command == "poweroff") {
                if (poweroff) {
                    message.channel.send(':white_check_mark: WAIT! Please! What have I ever done!? NOOO...').then(function() {
                        process.exit(0);
                    }).catch(function() {
                        process.exit(0);
                    });
                } else {
                    message.channel.send(':information_source: To power off AstralMod, type in mod:poweroff again.');
                    poweroff = true;
                }
            } else {
                poweroff = false;
            }
        } else {
            message.reply(':no_entry_sign: NO: What? You\'re not a member of the staff! Why would you be allowed to type that!?');
        }
    }
    
    //Spam limiting
    if (lastMessages[message.author.id] != msg) {
        sameMessageCount[message.author.id] = 0;
    }
    lastMessages[message.author.id] = msg
    sameMessageCount[message.author.id] += 1;
}

client.on('message', messageChecker);
client.on('messageUpdate', messageChecker);

client.on('guildMemberAdd', usr => {
});

client.login('MjgyMDQ4NTk5NTc0MDUyODY0.C4g2Pw.yFGdUuMlZITH99tWEic0JxIUGJ4').catch(
  function() {
    console.log("[ERROR] Login failed.");
});
