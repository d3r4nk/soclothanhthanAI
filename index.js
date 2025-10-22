const dotenv = require("dotenv");
const { MezonClient } = require("mezon-sdk");
const { spawn, spawnSync } = require("child_process");
const path = require("path");
dotenv.config();
function detectPythonCmd() {
  if (process.env.PYTHON_PATH) return process.env.PYTHON_PATH;

  const candidates = process.platform === "win32"
    ? ["py", "python", "python3"]
    : ["python3", "python"];

  for (const cmd of candidates) {
    try {
      const args = process.platform === "win32" && cmd === "py" ? ["-3", "--version"] : ["--version"];
      const res = spawnSync(cmd, args, { stdio: "ignore" });
      if (res.status === 0) return cmd;
    } catch (_) {}
  }
  return null;
}

const games = new Map();

async function main() {
  const client = new MezonClient(process.env.APPLICATION_TOKEN);
  await client.login();
  client.onChannelMessage(async (event) => {
    const content = (event?.content?.t ?? "").trim();
    const channel = await client.channels.fetch(event.channel_id);
    const msg = await channel.messages.fetch(event.message_id);
    if (content === "*ping") {
      const channelFetch = await client.channels.fetch(event.channel_id);
      const messageFetch = await channelFetch.messages.fetch(event.message_id);
      await messageFetch.reply({ t: "reply pong" });
      await channelFetch.send({ t: "channel send pong" });
      const clan = await client.clans.fetch(event.clan_id);
      const user = await clan.users.fetch(event.sender_id);
      await user.sendDM({ t: "hello DM" });
      return;
    }
    if (content === "playGuess") {
      if (games.has(event.channel_id)) {
        await msg.reply({ t: "Nhập số (1–100) hoặc gõ q để thoát." });
        return;
      }

      const pyCmd = detectPythonCmd();
      if (!pyCmd) {
        await msg.reply({
          t:
            "Lỗi: máy chạy bot không tìm thấy Python.\n" 
        });
        return;
      }

      const scriptPath = path.join(process.cwd(), "borderlandguessinggame.py");
      const args = process.platform === "win32" && pyCmd === "py" ? ["-3", scriptPath] : [scriptPath];

      const child = spawn(pyCmd, args, {
        cwd: process.cwd(),
        stdio: ["pipe", "pipe", "pipe"],
        env: { ...process.env, PYTHONUNBUFFERED: "1" }, 
      });

      games.set(event.channel_id, child);
      child.stdout.on("data", async (buf) => {
        const chunk = buf.toString();
        if (chunk.trim()) {
          await channel.send({ t: chunk.slice(0, 1800) });
        }
      });
      child.stderr.on("data", async (buf) => {
        const chunk = buf.toString();
        if (chunk.trim()) {
          await channel.send({ t: "⚠️ " + chunk.slice(0, 1800) });
        }
      });

      child.on("close", async (code) => {
        games.delete(event.channel_id);
        await channel.send({ t: `Game kết thúc (exit code: ${code}).` });
      });

      await msg.reply({ t: "Đoán số đề\nNhập số (1–100). Gõ 'q' để thoát." });
      return;
    }
    if (content === "*stopGuess") {
      const child = games.get(event.channel_id);
      if (child) {
        child.kill();
        games.delete(event.channel_id);
        await msg.reply({ t: "Đã dừng game đoán số." });
      } else {
        await msg.reply({ t: "Hiện không có game nào đang chạy." });
      }
      return;
    }
    if (games.has(event.channel_id) && !content.startsWith("*")) {
      const child = games.get(event.channel_id);
      child.stdin.write(content + "\n");
      return;
    }
  });
}

main()
  .then(() => console.log("bot start!"))
  .catch((error) => console.error(error));
