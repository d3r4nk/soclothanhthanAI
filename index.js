const dotenv = require("dotenv");
const { MezonClient } = require("mezon-sdk");
const { spawn, spawnSync } = require("child_process");
const path = require("path");
const fs = require("fs");
const ChessGame = require("./chessGame");
const ChessImageRenderer = require("./chessImageRenderer");

dotenv.config();

const imageRenderer = new ChessImageRenderer('./images');
let imagesLoaded = false;

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
const chessGames = new Map();
const aiThinking = new Map();
let musicBotProcess = null;
let musicBotReady = false;

async function sendBoard(channel, game, additionalText = "") {
  if (imagesLoaded) {
    try {
      const highlight = imageRenderer.getLastMoveHighlight(game);
      const imageBuffer = await imageRenderer.renderBoard(game, highlight);
      
      if (additionalText) {
        await channel.send({ t: additionalText });
      }
      
      await channel.sendFile({
        file_name: 'chess_board.png',
        file_content: imageBuffer
      });
    } catch (error) {
      console.error("Error rendering chess board:", error);
      const text = additionalText ? additionalText + "\n\n" + game.toString() : game.toString();
      await channel.send({ t: text });
    }
  } else {
    const text = additionalText ? additionalText + "\n\n" + game.toString() : game.toString();
    await channel.send({ t: text });
  }
}

function startMusicBot() {
  const pyCmd = detectPythonCmd();
  if (!pyCmd) {
    console.error("❌ Cannot find Python to start music bot");
    return false;
  }

  const scriptPath = path.join(process.cwd(), "musicbot.py");
  
  if (!fs.existsSync(scriptPath)) {
    console.error("❌ musicbot.py not found");
    return false;
  }

  const tokenPath = path.join(process.cwd(), "token.txt");
  if (!fs.existsSync(tokenPath)) {
    console.error("❌ token.txt not found for Discord music bot");
    return false;
  }

  const args = process.platform === "win32" && pyCmd === "py" 
    ? ["-3", scriptPath] 
    : [scriptPath];
  
  musicBotProcess = spawn(pyCmd, args, {
    cwd: process.cwd(),
    stdio: ["ignore", "pipe", "pipe"],
    env: { ...process.env, PYTHONUNBUFFERED: "1" },
  });

  musicBotProcess.stdout.on("data", (buf) => {
    const output = buf.toString().trim();
    console.log(`[Music Bot] ${output}`);
    if (output.includes("has connected to Discord")) {
      musicBotReady = true;
      console.log("✅ Discord Music Bot is ready!");
    }
  });

  musicBotProcess.stderr.on("data", (buf) => {
    const error = buf.toString().trim();
    console.error(`[Music Bot Error] ${error}`);
  });

  musicBotProcess.on("close", (code) => {
    console.log(`Music bot exited with code ${code}`);
    musicBotReady = false;
    musicBotProcess = null;
  });

  musicBotProcess.on("error", (err) => {
    console.error("Music bot spawn error:", err);
    musicBotReady = false;
    musicBotProcess = null;
  });

  return true;
}

function stopMusicBot() {
  if (musicBotProcess) {
    musicBotProcess.kill();
    musicBotProcess = null;
    musicBotReady = false;
    return true;
  }
  return false;
}

async function main() {
  const client = new MezonClient({
    token: process.env.BOT_TOKEN,
    botId: process.env.BOT_ID
  });
  
  await client.login();
  
  try {
    await imageRenderer.loadImages();
    imagesLoaded = true;
    console.log("✅ Chess images loaded successfully!");
  } catch (error) {
    console.error("❌ Failed to load chess images:", error);
    console.log("⚠️ Chess will use text-only mode");
  }

  if (startMusicBot()) {
    console.log("🎵 Starting Discord Music Bot...");
  } else {
    console.log("⚠️ Music bot not started - check Python and files");
  }
  
  client.onChannelMessage(async (event) => {
    const content = (event?.content?.t ?? "").trim();
    const channel = await client.channels.fetch(event.channel_id);
    const msg = await channel.messages.fetch(event.message_id);
    
    if (content === "*musicStatus") {
      const status = musicBotReady 
        ? "✅ Discord Music Bot đang chạy\n\nSử dụng các lệnh trên Discord:\n`!play <tên bài>` - Phát nhạc\n`!pause` - Tạm dừng\n`!skip` - Bỏ qua\n`!queue` - Xem danh sách\n`!help` - Xem tất cả lệnh" 
        : "❌ Discord Music Bot chưa sẵn sàng";
      await msg.reply({ t: status });
      return;
    }

    if (content === "*restartMusic") {
      stopMusicBot();
      await msg.reply({ t: "🔄 Đang khởi động lại Music Bot..." });
      setTimeout(() => {
        if (startMusicBot()) {
          console.log("🎵 Music Bot restarted");
        }
      }, 2000);
      return;
    }

    if (content === "*stopMusic") {
      if (stopMusicBot()) {
        await msg.reply({ t: "🛑 Music Bot đã dừng" });
      } else {
        await msg.reply({ t: "❌ Music Bot không chạy" });
      }
      return;
    }
    
    if (content.startsWith("*playChess") || content === "*chess") {
      if (chessGames.has(event.channel_id)) {
        await msg.reply({ t: "♟️ Game cờ vua đang chạy! Gõ *stopChess để dừng." });
        return;
      }
      
      let gameMode = 'pvp';
      const parts = content.split(" ");
      if (parts.length > 1) {
        const mode = parts[1].toLowerCase();
        if (mode === 'ai' || mode === 'bot' || mode === 'single' || mode === 'singleplayer') {
          gameMode = 'ai';
        } else if (mode === 'pvp' || mode === 'multi' || mode === 'multiplayer') {
          gameMode = 'pvp';
        } else {
          await msg.reply({ 
            t: "❌ Mode không hợp lệ!\n\nSử dụng:\n`*playChess pvp` - Chơi 2 người\n`*playChess ai` - Chơi với AI" 
          });
          return;
        }
      }
      
      const game = new ChessGame(gameMode);
      chessGames.set(event.channel_id, game);
      
      let modeText = gameMode === 'ai' ? '🤖 **vs AI Bot**' : '👥 **Player vs Player**';
      await sendBoard(channel, game, `♟️ **GAME CỜ VUA BẮT ĐẦU!**\n${modeText}\n\n${game.getHelp()}`);
      return;
    }
    
    if (content === "*stopChess") {
      if (!chessGames.has(event.channel_id)) {
        await msg.reply({ t: "❌ Không có game cờ vua nào đang chạy." });
        return;
      }
      chessGames.delete(event.channel_id);
      aiThinking.delete(event.channel_id);
      await msg.reply({ t: "🛑 Game cờ vua đã dừng." });
      return;
    }
    
    if (content === "*board" && chessGames.has(event.channel_id)) {
      const game = chessGames.get(event.channel_id);
      await sendBoard(channel, game);
      return;
    }
    
    if (content === "*chessHelp" && chessGames.has(event.channel_id)) {
      const game = chessGames.get(event.channel_id);
      await msg.reply({ t: game.getHelp() });
      return;
    }
    
    if (content === "*resign" && chessGames.has(event.channel_id)) {
      const game = chessGames.get(event.channel_id);
      const winner = game.whiteToMove ? "⚫ Black" : "⚪ White";
      chessGames.delete(event.channel_id);
      aiThinking.delete(event.channel_id);
      await channel.send({ t: `🏳️ ${game.whiteToMove ? 'White' : 'Black'} đã đầu hàng!\n${winner} thắng!` });
      return;
    }
    
    if (chessGames.has(event.channel_id)) {
      const game = chessGames.get(event.channel_id);
      
      if (aiThinking.get(event.channel_id)) {
        return;
      }
      
      let moveStr = null;
      
      if (content.startsWith("move ")) {
        moveStr = content.substring(5).trim().toLowerCase();
      } else if (/^[a-h][1-8][a-h][1-8]$/.test(content.toLowerCase())) {
        moveStr = content.toLowerCase();
      }
      
      if (moveStr) {
        if (!/^[a-h][1-8][a-h][1-8]$/.test(moveStr)) {
          await msg.reply({ t: "❌ Định dạng không đúng. Dùng: e2e4" });
          return;
        }
        
        const from = moveStr.substring(0, 2);
        const to = moveStr.substring(2, 4);
        
        const result = game.makeMove(from, to);
        
        if (result.success) {
          let statusText = result.status ? `\n**${result.status}**` : "";
          await sendBoard(channel, game, statusText);
          
          if (result.status && result.status.includes("wins")) {
            chessGames.delete(event.channel_id);
            aiThinking.delete(event.channel_id);
            return;
          }
          
          if (result.aiTurn && game.gameMode === 'ai') {
            aiThinking.set(event.channel_id, true);
            await channel.send({ t: "🤖 AI đang suy nghĩ..." });
            
            setTimeout(async () => {
              try {
                const aiMove = game.findBestMove();
                
                if (!aiMove) {
                  await channel.send({ t: "❌ AI không tìm được nước đi hợp lệ." });
                  chessGames.delete(event.channel_id);
                  aiThinking.delete(event.channel_id);
                  return;
                }
                
                const aiResult = game.makeMove(aiMove.fromNotation, aiMove.toNotation);
                
                let aiStatusText = `🤖 AI di chuyển: ${aiMove.fromNotation}${aiMove.toNotation}`;
                if (aiResult.status) {
                  aiStatusText += `\n**${aiResult.status}**`;
                }
                
                await sendBoard(channel, game, aiStatusText);
                
                if (aiResult.status && aiResult.status.includes("wins")) {
                  chessGames.delete(event.channel_id);
                  aiThinking.delete(event.channel_id);
                }
                
                aiThinking.delete(event.channel_id);
              } catch (error) {
                console.error("AI move error:", error);
                await channel.send({ t: "❌ Lỗi khi AI di chuyển." });
                aiThinking.delete(event.channel_id);
              }
            }, 1000);
          }
        } else {
          await msg.reply({ t: `❌ ${result.message}` });
        }
        return;
      }
    }
    
    if (content === "*ping") {
      await msg.reply({ t: "pong 🏓" });
      return;
    }
    
    if (content.startsWith("*playGuess")) {
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
        await msg.reply({ t: "Độ khó phải từ 2-10. VD: *playGuess 5" });
        return;
      }
      
      const scriptPath = path.join(process.cwd(), "borderlandguessinggame.py");
      
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
      
      child.stdout.on("data", async (buf) => {
        const chunk = buf.toString().trim();
        if (chunk) {
          await channel.send({ t: chunk.slice(0, 1800) });
        }
      });
      
      child.stderr.on("data", async (buf) => {
        const chunk = buf.toString().trim();
        if (chunk) {
          await channel.send({ t: "⚠️ " + chunk.slice(0, 1800) });
        }
      });
      
      child.on("close", async (code) => {
        games.delete(event.channel_id);
        await channel.send({ t: `Game kết thúc (exit code: ${code}).` });
      });
      
      child.on("error", async (err) => {
        console.error("Python spawn error:", err);
        games.delete(event.channel_id);
        await channel.send({ t: "❌ Lỗi: không thể khởi động game Python." });
      });
      
      await msg.reply({ t: `🎮 Game bắt đầu với ${difficulty} người chơi!\nĐợi bot gửi yêu cầu nhập số...` });
      return;
    }
    
    if (content === "*stopGuess") {
      if (!games.has(event.channel_id)) {
        await msg.reply({ t: "❌ Không có game nào đang chạy." });
        return;
      }
      
      const child = games.get(event.channel_id);
      child.kill();
      games.delete(event.channel_id);
      await msg.reply({ t: "🛑 Game đã dừng." });
      return;
    }
    
    if (games.has(event.channel_id)) {
      if (content.startsWith("*")) {
        return;
      }
      
      const child = games.get(event.channel_id);
      
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
      
      const num = parseInt(content);
      if (!isNaN(num) && num >= 1 && num <= 100) {
        try {
          if (child.stdin.writable) {
            child.stdin.write(content + "\n");
          } else {
            await msg.reply({ t: "❌ Game đã kết thúc. Gõ '*playGuess' để chơi lại." });
            games.delete(event.channel_id);
          }
        } catch (err) {
          console.error("Error writing to stdin:", err);
          games.delete(event.channel_id);
          await msg.reply({ t: "❌ Lỗi khi gửi input. Game đã dừng." });
        }
        return;
      }
      
      if (content.length > 0 && content.length < 20) {
        await msg.reply({ t: "❌ Vui lòng nhập số từ 1-100 hoặc 'q' để thoát." });
      }
      return;
    }
  });

  process.on('SIGINT', () => {
    console.log("\n🛑 Shutting down...");
    stopMusicBot();
    process.exit(0);
  });

  process.on('SIGTERM', () => {
    console.log("\n🛑 Shutting down...");
    stopMusicBot();
    process.exit(0);
  });
}

main()
  .then(() => console.log("Bot started successfully!"))
  .catch((error) => console.error("Bot error:", error));