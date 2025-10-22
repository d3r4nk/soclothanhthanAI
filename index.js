const dotenv = require("dotenv");
const { MezonClient } = require("mezon-sdk");
const { spawn } = require("child_process");

dotenv.config();

async function main() {
  const client = new MezonClient({
    botId: process.env.BOT_ID,
    token: process.env.BOT_TOKEN,
  });

  await client.login();

  client.onChannelMessage(async (event) => {
    try {
      const content = event?.content?.t;

      // Lệnh ping test
      if (content === "*ping") {
        const channelFetch = await client.channels.fetch(event.channel_id);
        const messageFetch = await channelFetch.messages.fetch(event.message_id);

        await messageFetch.reply({ t: "reply pong" });
        await channelFetch.send({ t: "channel send pong" });

        const clan = await client.clans.fetch(event.clan_id);
        const user = await clan.users.fetch(event.sender_id);
        await user.sendDM({ t: "hello DM" });
      }
      else if (content === "*playGuess") {
        const channelFetch = await client.channels.fetch(event.channel_id);
        await channelFetch.send({ t: "Đoán số đê" });

        const py = spawn("python", ["borderlandguessinggame.py"]);

        py.stdout.on("data", async (data) => {
          const msg = data.toString().trim();
          console.log(`Python output: ${msg}`);

          await channelFetch.send({ t: msg });
        });

        py.stderr.on("data", async (data) => {
          const err = data.toString().trim();
          console.error(`Python error: ${err}`);
          await channelFetch.send({ t: ` Lỗi: ${err}` });
        });

        py.on("close", async (code) => {
          console.log(`Game ended with code ${code}`);
          await channelFetch.send({ t: `Game kết thúc (exit code: ${code})` });
        });
      }
    } catch (err) {
      console.error("Error handling message:", err);
    }
  });
}

main()
  .then(() => console.log("bot start!"))
  .catch((error) => console.error(error));
