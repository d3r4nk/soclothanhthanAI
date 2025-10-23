const dotenv = require("dotenv");
const { MezonClient } = require("mezon-sdk");
const { spawn, spawnSync } = require("child_process");
const path = require("path");
const fs = require("fs");

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
  const client = new MezonClient({
    token: process.env.BOT_TOKEN,
    botId: process.env.BOT_ID
  });
  
  await client.login();
  
  client.onChannelMessage(async (event) => {
    const content = (event?.content?.t ?? "").trim();
    const channel = await client.channels.fetch(event.channel_id);
    const msg = await channel.messages.fetch(event.message_id);
    
    // Ping command
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
    
    // Start game command
    if (content.startsWith("playGuess")) {
      if (games.has(event.channel_id)) {
        await msg.reply({ t: "Game đang chạy rồi! Nhập số hoặc *stopGuess để dừng." });
        return;
      }
      
      const pyCmd = detectPythonCmd();
      if (!pyCmd) {
        await msg.reply({ t: "Lỗi: máy chạy bot không tìm thấy Python." });
        return;
      }
      
      const parts = content.split(" ");
      const difficulty = parts[1] ? parseInt(parts[1]) : 5;
     
      if (isNaN(difficulty) || difficulty < 2 || difficulty > 10) {
        await msg.reply({ t: "Độ khó phải từ 2-10. VD: playGuess 5" });
        return;
      }
      
      const scriptPath = path.join(process.cwd(), "borderlandguessinggame.py");
      
      // Check if script exists
      if (!fs.existsSync(scriptPath)) {
        await msg.reply({ t: "❌ Lỗi: không tìm thấy file game Python." });
        return;
      }
      
      const args = process.platform === "win32" && pyCmd === "py" 
        ? ["-3", scriptPath, difficulty.toString()] 
        : [scriptPath, difficulty.toString()];
      
      const child = spawn(pyCmd, args, {
        cwd: process.cwd(),
        stdio: ["pipe", "pipe", "pipe"],
        env: { ...process.env, PYTHONUNBUFFERED: "1" },
      });
      
      games.set(event.channel_id, child);
      
      // Handle stdout
      child.stdout.on("data", async (buf) => {
        const chunk = buf.toString().trim();
        if (chunk) {
          await channel.send({ t: chunk.slice(0, 1800) });
        }
      });
      
      // Handle stderr
      child.stderr.on("data", async (buf) => {
        const chunk = buf.toString().trim();
        if (chunk) {
          await channel.send({ t: "⚠️ " + chunk.slice(0, 1800) });
        }
      });
      
      // Handle process close
      child.on("close", async (code) => {
        games.delete(event.channel_id);
        await channel.send({ t: `Game kết thúc (exit code: ${code}).` });
      });
      
      // Handle spawn errors
      child.on("error", async (err) => {
        console.error("Python spawn error:", err);
        games.delete(event.channel_id);
        await channel.send({ t: "❌ Lỗi: không thể khởi động game Python." });
      });
      
      await msg.reply({ t: `🎮 Game bắt đầu với ${difficulty} người chơi!\nĐợi bot gửi yêu cầu nhập số...` });
      return;
    }
    
    // Handle game input - MUST be checked AFTER all command handlers
    if (games.has(event.channel_id)) {
      // Block other commands during game
      if (content.startsWith("*")) {
        // Let the command handlers above process this
        return;
      }
      
      const child = games.get(event.channel_id);
      
      // Check for quit commands
      if (content.toLowerCase() === 'q' || content.toLowerCase() === 'quit' || content.toLowerCase() === 'exit') {
        try {
          if (child.stdin.writable) {
            child.stdin.write(content + "\n");
          }
        } catch (err) {
          console.error("Error writing quit to stdin:", err);
          games.delete(event.channel_id);
          await msg.reply({ t: "❌ Game đã kết thúc bất thường." });
        }
        return;
      }
      
      // Validate number input
      const num = parseInt(content);
      if (!isNaN(num) && num >= 1 && num <= 100) {
        try {
          if (child.stdin.writable) {
            child.stdin.write(content + "\n");
          } else {
            await msg.reply({ t: "❌ Game đã kết thúc. Gõ 'playGuess' để chơi lại." });
            games.delete(event.channel_id);
          }
        } catch (err) {
          console.error("Error writing to stdin:", err);
          games.delete(event.channel_id);
          await msg.reply({ t: "❌ Lỗi khi gửi input. Game đã dừng." });
        }
        return;
      }
      
      // Invalid input during game - inform user
      if (content.length > 0 && content.length < 20) {
        await msg.reply({ t: "❌ Vui lòng nhập số từ 1-100 hoặc 'q' để thoát." });
      }
      return;
    }
  });
}

main()
  .then(() => console.log("Bot started successfully!"))
  .catch((error) => console.error("Bot error:", error));