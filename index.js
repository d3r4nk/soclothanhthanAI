const dotenv = require("dotenv");
const { MezonClient } = require("mezon-sdk");
const { spawn, spawnSync } = require("child_process");
const path = require("path");
const fs = require("fs");
const ChessGame = require("./chessGame");

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
const chessGames = new Map(); 

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
    
    // ===== CHESS COMMANDS =====
    
    // Start chess game
    if (content.startsWith("*playChess") || content === "*chess") {
      if (chessGames.has(event.channel_id)) {
        await msg.reply({ t: "♟️ Game cờ vua đang chạy! Gõ *stopChess để dừng." });
        return;
      }

      // Lấy mode từ lệnh (*playChess ai hoặc *playChess pvp)
      const parts = content.split(" ");
      const mode = parts[1] && parts[1].toLowerCase() === "ai" ? "ai" : "pvp";

      const game = new ChessGame(mode);
      chessGames.set(event.channel_id, game);

      let introMsg = "♟️ **GAME CỜ VUA BẮT ĐẦU!**\n";
      introMsg += mode === "ai" 
        ? "🤖 Chế độ: **Người chơi vs AI** (Bạn là ⚪ Trắng, AI là ⚫ Đen)\n\n"
        : "👥 Chế độ: **Người chơi vs Người chơi**\n\n";

      await channel.send({ t: introMsg + game.toString() + "\n" + game.getHelp() });
      return;
    }

    // Stop chess game
    if (content === "*stopChess") {
      if (!chessGames.has(event.channel_id)) {
        await msg.reply({ t: "❌ Không có game cờ vua nào đang chạy." });
        return;
      }
      chessGames.delete(event.channel_id);
      await msg.reply({ t: "🛑 Game cờ vua đã dừng." });
      return;
    }
    
    // Show chess board
    if (content === "*board" && chessGames.has(event.channel_id)) {
      const game = chessGames.get(event.channel_id);
      await channel.send({ t: game.toString() });
      return;
    }
    
    // Chess help
    if (content === "*chessHelp" && chessGames.has(event.channel_id)) {
      const game = chessGames.get(event.channel_id);
      await msg.reply({ t: game.getHelp() });
      return;
    }
    
    // Resign chess game
    if (content === "*resign" && chessGames.has(event.channel_id)) {
      const game = chessGames.get(event.channel_id);
      const winner = game.whiteToMove ? "⚫ Black" : "⚪ White";
      chessGames.delete(event.channel_id);
      await channel.send({ t: `🏳️ ${game.whiteToMove ? 'White' : 'Black'} đã đầu hàng!\n${winner} thắng!` });
      return;
    }
    
    // Handle chess moves
    if (chessGames.has(event.channel_id)) {
      const game = chessGames.get(event.channel_id);
      
      // Check for move command
      const isMoveCommand = content.startsWith("move ") || /^[a-h][1-8][a-h][1-8]$/.test(content.toLowerCase());
      if (isMoveCommand) {
        const moveStr = content.startsWith("move ") 
          ? content.substring(5).trim().toLowerCase() 
          : content.toLowerCase();
        
        if (!/^[a-h][1-8][a-h][1-8]$/.test(moveStr)) {
          await msg.reply({ t: "❌ Định dạng không đúng. Dùng: move e2e4" });
          return;
        }
        
        const from = moveStr.substring(0, 2);
        const to = moveStr.substring(2, 4);
        const result = game.makeMove(from, to);
        
        if (result.success) {
          let response = game.toString();
          if (result.status) {
            response += `\n**${result.status}**`;
            if (result.status.includes("wins")) {
              chessGames.delete(event.channel_id);
            }
          }
          
          // Nếu là chế độ AI, và đến lượt AI chơi
          if (result.aiTurn) {
            const bestMove = game.findBestMove();
            if (bestMove) {
              const aiFrom = game.squareToNotation(bestMove.from[0], bestMove.from[1]);
              const aiTo = game.squareToNotation(bestMove.to[0], bestMove.to[1]);
              game.makeMove(aiFrom, aiTo);
              response += `\n🤖 **AI đi:** ${aiFrom}${aiTo}\n${game.toString()}`;
              if (game.getGameStatus()) {
                response += `\n**${game.getGameStatus()}**`;
                if (game.checkmate || game.stalemate) {
                  chessGames.delete(event.channel_id);
                }
              }
            } else {
              response += "\n🤖 **AI không có nước đi hợp lệ!**";
            }
          }

          await channel.send({ t: response });
        } else {
          await msg.reply({ t: `❌ ${result.message}` });
        }
        return;
      }
    }
    
    // ===== GUESSING GAME COMMANDS =====
    
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
    
    // Start guessing game
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
    
    // Stop guessing game
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
    
    // Handle game input for guessing game
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
}

main()
  .then(() => console.log("Bot started successfully!"))
  .catch((error) => console.error("Bot error:", error));
