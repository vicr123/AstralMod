# AstralMod
Discord Moderation Bot for bits & Bytes, theShell and many other servers

#### [Invite AstralMod to your server](https://discordapp.com/oauth2/authorize?client_id=282048599574052864&scope=bot&permissions=461843558)

## Commands
For a full list of commands, use `am:help` in a channel. Use `am:help [command]` to look up help for a specific command. To get help with terminal commands, type `help` into the terminal.

## Running AstralMod yourself
1. Make sure you have [Node.js](https://nodejs.org/en/) installed. If it's recent enough it should work.
2. Clone this repository into your folder of choice.
3. Run `npm install` in this directory to install all of AstralMod's dependencies.
4. Create a new file in the root directory of AstralMod called `consts.js`. Fill it with this (and specify your own information where necessary): 

```js
module.exports = {
    keys: {
        token: "", // This is where the token for your bot account goes
        settingsKey: "", // This is the encryption key for the settings file. What you input here really doesn't matter - it should be about 32 characters (if you go any longer it will be truncated). Don't change it or else you won't be able to use your settings file again. 
        yandexKey: "" // This is the token used for the Yandex.Translate API. You can leave this blank, but 'am:tr' will be disabled. If you want to use 'am:tr' though, you can get a token at https://tech.yandex.com/translate/ and insert it here.
    },
    config: {
        prefix: "am:", // This is the default prefix used by AstralMod.
        bprefix: "am#", // This is the default prefix used by AstralMod when it is running as AstralMod Blueprint.
        name: "AstralMod", // This is the name that AstralMod uses to refer to itself.
        bname: "AstralMod Blueprint", // This is the name that AstralMod uses to refer to itself in blueprint mode.
        version: "3.1", // This is the version number that AstralMod refers to itself as. When in blueprint mode, the version is not shown (and logs say 'Blueprint').
        pinToPinEmoji: "📌", // This is used as the emoji for the Portable Pins and the Pin to Pin feature. You can generally leave this as the default, but if you have other bots that interpret the 📌 emoji as something else, you might want to change it.
        calcProcess: "/usr/bin/thecalculator", // This is a path to the compiled binary for theCalculator, used for calculating expressions in 'am:calc'. You can leave this blank, but 'am:calc' will be disabled. You can grab a copy of theCalculator at https://github.com/vicr123/thecalculator/releases.
        emojiServer: "" // This is the server ID of a server that has all of the AstralMod-specific emoji. More information about setting up the emoji can be found below. You can leave this blank, but all custom emoji will be replaced by ➡.
    },
    colors: { // These are the colors used for embeds.
        done: "#FFC000",
        info: "#1E3C8C",
        fail: "#FF5000",
        none: "#36393F"
    }
}
```

3. Run the bot by running `node bot.js` with your preferred options.

### AstralMod Emoji?
Set up a server and upload the the emoji in the `/emoji` folder to it. You can change the actual emoji picture to whatever you want, but make sure to keep the names the same. Then, invite your bot into it, and set the `emojiServer` value in the `consts.js` file to the server ID of that server.

### Command line options
- `--blueprint` Runs AstralMod as AstralMod Blueprint. The version number is replaced with "Blueprint" and the prefix is changed.
- `--debug` Enables debugging output in the console
- `--nowelcome` Disables the welcome message that AstralMod sends when it joins a new server
- `--nousername` Stops AstralMod from changing its username to the one specified in the config
- `--novacuum` Disables the periodic cleanup of the settings file
- `--httpserver` Enables the web interface, accessible at http://127.0.0.1:28931

### Developing AstralMod
If you wish to add a command, look at the `plugins` directory. Make your own plugin to include commands.
If you wish to modify the actual program, look at `bot.js`, or the AstralMod source code.
