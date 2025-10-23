import random
import sys
from typing import List, Optional

INT_MIN = 1
INT_MAX = 100
START_POINTS = 10

class Player:
    def __init__(self, name: str, is_human: bool):
        self.name = name
        self.is_human = is_human
        self.points = START_POINTS
        self.alive = True
        self.last_choice: Optional[int] = None

    def __repr__(self):
        return f"{self.name}({'H' if self.is_human else 'B'})[{self.points}]"

def clamp(v, lo, hi):
    return max(lo, min(hi, v))

def simulate_others_picks(
    num_others: int,
    center: float,
    spread: float,
    avoid: Optional[int] = None,
) -> List[int]:
    picks = []
    for _ in range(num_others):
        val = int(round(random.gauss(center, spread)))
        val = clamp(val, INT_MIN, INT_MAX)
        if avoid is not None and random.random() < 0.55:
            if val == avoid:
                shift = random.choice([-3, -2, -1, 1, 2, 3])
                val = clamp(val + shift, INT_MIN, INT_MAX)
        picks.append(val)
    return picks

def evaluate_round_outcome(
    my_pick: int,
    others_picks: List[int],
    players_remaining: int
) -> float:
    all_picks = [my_pick] + others_picks
    avg = sum(all_picks) / len(all_picks)
    m = 0.8 * avg
    distances = [abs(p - m) for p in all_picks]
    min_dist = min(distances)
    winners = [i for i, d in enumerate(distances) if abs(d - min_dist) < 1e-9]
    i_me = 0
    i_win = (i_me in winners)
    util = 1.0 if i_win else -1.0
    if players_remaining in (2, 3):
        count_same_as_me = sum(1 for v in all_picks if v == my_pick)
        if count_same_as_me >= 2:
            util -= 1.0  
    util -= 0.01 * abs(my_pick - m)
    return util

def minimax_bot_pick(
    players: List[Player],
    me_index: int,
) -> int:
    alive_players = [p for p in players if p.alive]
    n_alive = len(alive_players)
    if n_alive <= 3:
        candidate_my = list(range(INT_MIN, INT_MAX + 1))
    elif n_alive <= 5:
        candidate_my = list(range(INT_MIN, INT_MAX + 1, 1))
    else:
        candidate_my = list(range(INT_MIN, INT_MAX + 1, 2))
    centers = [10, 20, 30, 40, 50, 60, 70, 80, 90]
    prev_choices = [p.last_choice for p in alive_players if p.last_choice is not None]
    if prev_choices:
        prev_avg = sum(prev_choices) / len(prev_choices)
        prev_m = 0.8 * prev_avg
        adaptive = set([
            int(round(prev_avg)),
            int(round(prev_m)),
            clamp(int(round(prev_m * 1.1)), INT_MIN, INT_MAX),
            clamp(int(round(prev_m * 0.9)), INT_MIN, INT_MAX),
        ])
        centers = sorted(set(centers).union(adaptive))
    spread = 10 if n_alive <= 4 else 15 if n_alive <= 7 else 20
    num_others = n_alive - 1
    best_pick = None
    best_value = -1e9
    jitter = random.uniform(-0.005, 0.005)
    for my_pick in candidate_my:
        worst_case = 1e9
        for c in centers:
            trials = 6 if n_alive >= 6 else 10
            total = 0.0
            for _ in range(trials):
                others = simulate_others_picks(num_others, c, spread, avoid=my_pick if n_alive in (2,3) else None)
                util = evaluate_round_outcome(my_pick, others, n_alive)
                total += util
            avg_util = total / trials
            if avg_util < worst_case:
                worst_case = avg_util
        value = worst_case + jitter
        if value > best_value:
            best_value = value
            best_pick = my_pick
    return best_pick if best_pick is not None else 40

def play_round(players: List[Player]) -> bool:
    """Play one round. Returns True if should continue, False if error."""
    alive_indices = [i for i, p in enumerate(players) if p.alive]
    n_alive = len(alive_indices)
    picks = {}

    for i in alive_indices:
        p = players[i]
        if p.is_human:
            print("Nhập số (1–100) hoặc 'q' để thoát:", flush=True)
            try:
                raw = sys.stdin.readline().strip()
            except:
                print("Lỗi đọc input.", flush=True)
                return False
            
            if not raw:
                print("Input trống. Vui lòng thử lại.", flush=True)
                return False
                
            if raw.lower() in ("q", "quit", "exit"):
                print("Bạn đã thoát game.", flush=True)
                return False
            
            try:
                x = int(raw)
                if INT_MIN <= x <= INT_MAX:
                    picks[i] = x
                else:
                    print(f"❌ Số không hợp lệ: {x}. Phải từ {INT_MIN} đến {INT_MAX}.", flush=True)
                    return False
            except ValueError:
                print(f"❌ Dữ liệu không hợp lệ: '{raw}'. Vui lòng nhập số nguyên.", flush=True)
                return False
        else:
            bot_pick = minimax_bot_pick(players, i)
            picks[i] = bot_pick

    for i, x in picks.items():
        players[i].last_choice = x
    
    chosen = [picks[i] for i in alive_indices]
    avg = sum(chosen) / len(chosen)
    m = 0.8 * avg
    distances = {i: abs(picks[i] - m) for i in alive_indices}
    min_dist = min(distances.values())
    winners = [i for i, d in distances.items() if abs(d - min_dist) < 1e-9]
    
    for i in alive_indices:
        if i not in winners:
            players[i].points -= 1
    
    if n_alive in (2, 3):
        count_by_num = {}
        for i in alive_indices:
            x = picks[i]
            count_by_num.setdefault(x, []).append(i)
        for num, ids in count_by_num.items():
            if len(ids) >= 2:
                for i in ids:
                    players[i].points -= 1
    
    for i in alive_indices:
        if players[i].points <= 0:
            players[i].alive = False

    print("\n===== KẾT QUẢ VÁN =====", flush=True)
    for i in alive_indices:
        p = players[i]
        me_flag = " (BẠN)" if p.is_human else ""
        w_flag = " ✅" if i in winners else " ❌"
        print(f"{p.name}{me_flag} chọn {picks[i]:>3} | điểm: {p.points:>2}{w_flag}", flush=True)
    print(f"Trung bình = {avg:.2f}  ->  m = 0.8 * avg = {m:.2f}", flush=True)
    if len(winners) > 1:
        print("Người gần m nhất (đồng hạng): " + ", ".join(players[i].name for i in winners), flush=True)
    else:
        print("Người gần m nhất: " + players[winners[0]].name, flush=True)
    
    return True

def print_scoreboard(players: List[Player]):
    alive = [p for p in players if p.alive]
    dead = [p for p in players if not p.alive]
    print("\n===== BẢNG ĐIỂM =====", flush=True)
    for p in sorted(alive, key=lambda x: (-x.points, x.name)):
        tag = "(BẠN)" if p.is_human else ""
        print(f"{p.name:>10} {tag:6}  |  {p.points} điểm", flush=True)
    if dead:
        print("ĐÃ LOẠI: " + ", ".join(f"{p.name}" for p in dead), flush=True)

def game_loop():
    # Get difficulty from command line argument
    n = int(sys.argv[1]) if len(sys.argv) > 1 else 5
    n = max(2, min(10, n))  # Clamp between 2-10
    
    print("🎮 GAME ĐOÁN SỐ BẮT ĐẦU!", flush=True)
    print(f"Số người chơi: {n} (Bạn + {n-1} Bot)", flush=True)
    print("\n📜 Luật chơi:", flush=True)
    print("- Mỗi người bắt đầu với 10 điểm.", flush=True)
    print("- Mỗi vòng, chọn số từ 1-100.", flush=True)
    print("- m = 0.8 × trung bình các số đã chọn.", flush=True)
    print("- Ai gần m nhất: giữ điểm. Người khác: -1 điểm.", flush=True)
    print("- Khi còn 2-3 người: chọn trùng số = -1 điểm thêm.", flush=True)
    print("- Nhập 'q' để thoát.\n", flush=True)

    players: List[Player] = []
    players.append(Player("Bạn", True))
    for i in range(1, n):
        players.append(Player(f"Bot{i}", False))

    round_idx = 1
    try:
        while True:
            alive_players = [p for p in players if p.alive]
            if len(alive_players) <= 1:
                break
            
            print(f"\n{'='*10} VÁN {round_idx} {'='*10}", flush=True)
            print_scoreboard(players)
            
            if not play_round(players):
                break
            
            round_idx += 1
            
    except KeyboardInterrupt:
        print("\nGame bị gián đoạn.", flush=True)
    except Exception as e:
        print(f"\nLỗi: {e}", flush=True)
    
    print("\n" + "="*30, flush=True)
    print("GAME KẾT THÚC", flush=True)
    print("="*30, flush=True)
    print_scoreboard(players)
    
    winners = [p for p in players if p.alive]
    if not winners:
        print("\n🤝 Hoà! Không ai còn điểm.", flush=True)
    elif len(winners) == 1:
        is_human = winners[0].is_human
        emoji = "🎉" if is_human else "🤖"
        print(f"\n{emoji} WINNER: {winners[0].name}!", flush=True)
    else:
        top_points = max(p.points for p in winners)
        top = [p for p in winners if p.points == top_points]
        if len(top) == 1:
            is_human = top[0].is_human
            emoji = "🎉" if is_human else "🤖"
            print(f"\n{emoji} WINNER: {top[0].name}!", flush=True)
        else:
            print("\n🏆 WINNERS (đồng hạng): " + ", ".join(p.name for p in top), flush=True)

if __name__ == "__main__":
    random.seed()
    game_loop()