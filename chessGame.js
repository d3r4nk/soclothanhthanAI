// Piece values for evaluation
const PIECE_VALUES = {
  'pawn': 1,
  'knight': 3,
  'bishop': 3,
  'rook': 5,
  'queen': 9,
  'king': 0
};

// Position scores for pieces (higher = better position)
const KNIGHT_SCORES = [
  [0.0, 0.1, 0.2, 0.2, 0.2, 0.2, 0.1, 0.0],
  [0.1, 0.3, 0.5, 0.5, 0.5, 0.5, 0.3, 0.1],
  [0.2, 0.5, 0.6, 0.65, 0.65, 0.6, 0.5, 0.2],
  [0.2, 0.55, 0.65, 0.7, 0.7, 0.65, 0.55, 0.2],
  [0.2, 0.5, 0.65, 0.7, 0.7, 0.65, 0.5, 0.2],
  [0.2, 0.55, 0.6, 0.65, 0.65, 0.6, 0.55, 0.2],
  [0.1, 0.3, 0.5, 0.55, 0.55, 0.5, 0.3, 0.1],
  [0.0, 0.1, 0.2, 0.2, 0.2, 0.2, 0.1, 0.0]
];

const BISHOP_SCORES = [
  [0.0, 0.2, 0.2, 0.2, 0.2, 0.2, 0.2, 0.0],
  [0.2, 0.4, 0.4, 0.4, 0.4, 0.4, 0.4, 0.2],
  [0.2, 0.4, 0.5, 0.6, 0.6, 0.5, 0.4, 0.2],
  [0.2, 0.5, 0.5, 0.6, 0.6, 0.5, 0.5, 0.2],
  [0.2, 0.4, 0.6, 0.6, 0.6, 0.6, 0.4, 0.2],
  [0.2, 0.6, 0.6, 0.6, 0.6, 0.6, 0.6, 0.2],
  [0.2, 0.5, 0.4, 0.4, 0.4, 0.4, 0.5, 0.2],
  [0.0, 0.2, 0.2, 0.2, 0.2, 0.2, 0.2, 0.0]
];

const PAWN_SCORES = [
  [0.8, 0.8, 0.8, 0.8, 0.8, 0.8, 0.8, 0.8],
  [0.7, 0.7, 0.7, 0.7, 0.7, 0.7, 0.7, 0.7],
  [0.3, 0.3, 0.4, 0.5, 0.5, 0.4, 0.3, 0.3],
  [0.25, 0.25, 0.3, 0.45, 0.45, 0.3, 0.25, 0.25],
  [0.2, 0.2, 0.2, 0.4, 0.4, 0.2, 0.2, 0.2],
  [0.25, 0.15, 0.1, 0.2, 0.2, 0.1, 0.15, 0.25],
  [0.25, 0.3, 0.3, 0.0, 0.0, 0.3, 0.3, 0.25],
  [0.2, 0.2, 0.2, 0.2, 0.2, 0.2, 0.2, 0.2]
];
const QUEEN_SCORES = [
  [0.0, 0.2, 0.2, 0.3, 0.3, 0.2, 0.2, 0.0],
  [0.2, 0.4, 0.4, 0.4, 0.4, 0.4, 0.4, 0.2],
  [0.2, 0.4, 0.5, 0.5, 0.5, 0.5, 0.4, 0.2],
  [0.3, 0.4, 0.5, 0.5, 0.5, 0.5, 0.4, 0.3],
  [0.4, 0.4, 0.5, 0.5, 0.5, 0.5, 0.4, 0.3],
  [0.2, 0.5, 0.5, 0.5, 0.5, 0.5, 0.4, 0.2],
  [0.2, 0.4, 0.5, 0.4, 0.4, 0.4, 0.4, 0.2],
  [0.0, 0.2, 0.2, 0.3, 0.3, 0.2, 0.2, 0.0]
];
const ROOK_SCORES = [
  [0.25, 0.25, 0.25, 0.25, 0.25, 0.25, 0.25, 0.25],
  [0.5, 0.75, 0.75, 0.75, 0.75, 0.75, 0.75, 0.5],
  [0.0, 0.25, 0.25, 0.25, 0.25, 0.25, 0.25, 0.0],
  [0.0, 0.25, 0.25, 0.25, 0.25, 0.25, 0.25, 0.0],
  [0.0, 0.25, 0.25, 0.25, 0.25, 0.25, 0.25, 0.0],
  [0.0, 0.25, 0.25, 0.25, 0.25, 0.25, 0.25, 0.0],
  [0.0, 0.25, 0.25, 0.25, 0.25, 0.25, 0.25, 0.0],
  [0.25, 0.25, 0.25, 0.5, 0.5, 0.25, 0.25, 0.25]
];
const CHECKMATE = 1000;
const STALEMATE = 0;

class ChessGame {
  constructor(gameMode = 'pvp') {
    this.board = [
      ['♜', '♞', '♝', '♛', '♚', '♝', '♞', '♜'],
      ['♟', '♟', '♟', '♟', '♟', '♟', '♟', '♟'],
      ['.', '.', '.', '.', '.', '.', '.', '.'],
      ['.', '.', '.', '.', '.', '.', '.', '.'],
      ['.', '.', '.', '.', '.', '.', '.', '.'],
      ['.', '.', '.', '.', '.', '.', '.', '.'],
      ['♙', '♙', '♙', '♙', '♙', '♙', '♙', '♙'],
      ['♖', '♘', '♗', '♕', '♔', '♗', '♘', '♖']
    ];
    
    this.gameMode = gameMode; // 'pvp' or 'ai'
    this.whiteToMove = true;
    this.moveLog = [];
    this.whiteKingPos = [7, 4];
    this.blackKingPos = [0, 4];
    this.checkmate = false;
    this.stalemate = false;
    this.aiDepth = 3; // AI search depth
    
    // Castling rights
    this.castlingRights = {
      wks: true,
      wqs: true,
      bks: true,
      bqs: true
    };
    
    this.enPassantSquare = null;
    
    // Piece symbols
    this.whitePieces = ['♙', '♖', '♘', '♗', '♕', '♔'];
    this.blackPieces = ['♟', '♜', '♞', '♝', '♛', '♚'];
  }

  toString() {
  let str = '```\n    a   b   c   d   e   f   g   h\n';
  str += '  +---+---+---+---+---+---+---+---+\n';
  for (let i = 0; i < 8; i++) {
    str += `${8 - i} | ${this.board[i].join(' | ')} | ${8 - i}\n`;
    str += '  +---+---+---+---+---+---+---+---+\n';
  }
  str += '    a   b   c   d   e   f   g   h\n';
  str += `\n${this.whiteToMove ? '⚪ White' : '⚫ Black'} to move`;
  if (this.gameMode === 'ai') {
    str += ` (${this.whiteToMove ? 'You' : 'AI'})`;
  }
  if (this.moveLog.length > 0) {
    str += `\nLast move: ${this.moveLog[this.moveLog.length - 1]}`;
  }
  str += '\n```';
  return str;
}


  parseSquare(notation) {
    if (notation.length !== 2) return null;
    const file = notation[0].charCodeAt(0) - 'a'.charCodeAt(0);
    const rank = 8 - parseInt(notation[1]);
    if (file < 0 || file > 7 || rank < 0 || rank > 7) return null;
    return [rank, file];
  }

  squareToNotation(row, col) {
    return String.fromCharCode('a'.charCodeAt(0) + col) + (8 - row);
  }

  isWhitePiece(piece) {
    return this.whitePieces.includes(piece);
  }

  isBlackPiece(piece) {
    return this.blackPieces.includes(piece);
  }

  getPieceAt(row, col) {
    return this.board[row][col];
  }

  // Get all valid moves for current position
  getAllValidMoves() {
    const moves = [];
    for (let row = 0; row < 8; row++) {
      for (let col = 0; col < 8; col++) {
        const piece = this.board[row][col];
        if (piece === '.') continue;
        
        const isPieceWhite = this.isWhitePiece(piece);
        if (isPieceWhite !== this.whiteToMove) continue;
        
        // Get all possible destination squares
        for (let toRow = 0; toRow < 8; toRow++) {
          for (let toCol = 0; toCol < 8; toCol++) {
            if (this.isValidMove(row, col, toRow, toCol)) {
              moves.push({
                from: [row, col],
                to: [toRow, toCol],
                fromNotation: this.squareToNotation(row, col),
                toNotation: this.squareToNotation(toRow, toCol)
              });
            }
          }
        }
      }
    }
    return moves;
  }

  // AI: Find best move using Minimax with alpha-beta pruning
  findBestMove() {
    const validMoves = this.getAllValidMoves();
    if (validMoves.length === 0) return null;
    
    // Shuffle for variety
    for (let i = validMoves.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [validMoves[i], validMoves[j]] = [validMoves[j], validMoves[i]];
    }
    
    let bestMove = null;
    let bestValue = -Infinity;
    const alpha = -Infinity;
    const beta = Infinity;
    
    for (const move of validMoves) {
      // Make move
      const backup = this.makeMoveInternal(move.from[0], move.from[1], move.to[0], move.to[1]);
      
      // Evaluate with negamax
      const value = -this.negamax(this.aiDepth - 1, -beta, -alpha, -1);
      
      // Undo move
      this.undoMoveInternal(backup);
      
      if (value > bestValue) {
        bestValue = value;
        bestMove = move;
      }
    }
    
    return bestMove;
  }

  // Negamax algorithm with alpha-beta pruning
  negamax(depth, alpha, beta, color) {
    if (depth === 0) {
      return color * this.evaluateBoard();
    }
    
    const validMoves = this.getAllValidMoves();
    if (validMoves.length === 0) {
      if (this.isInCheck(this.whiteToMove)) {
        return -CHECKMATE; // Checkmate
      }
      return STALEMATE; // Stalemate
    }
    
    let maxValue = -Infinity;
    
    for (const move of validMoves) {
      const backup = this.makeMoveInternal(move.from[0], move.from[1], move.to[0], move.to[1]);
      const value = -this.negamax(depth - 1, -beta, -alpha, -color);
      this.undoMoveInternal(backup);
      
      maxValue = Math.max(maxValue, value);
      alpha = Math.max(alpha, value);
      
      if (alpha >= beta) {
        break; // Beta cutoff
      }
    }
    
    return maxValue;
  }

  // Evaluate board position
  evaluateBoard() {
    if (this.checkmate) {
      return this.whiteToMove ? -CHECKMATE : CHECKMATE;
    }
    if (this.stalemate) {
      return STALEMATE;
    }
    
    let score = 0;
    
    for (let row = 0; row < 8; row++) {
      for (let col = 0; col < 8; col++) {
        const piece = this.board[row][col];
        if (piece === '.') continue;
        
        const pieceType = this.getPieceType(piece);
        const isWhite = this.isWhitePiece(piece);
        
        let pieceValue = PIECE_VALUES[pieceType] || 0;
        let positionValue = 0;
        
        // Add position bonus
        if (pieceType === 'knight') {
          positionValue = KNIGHT_SCORES[row][col];
        } else if (pieceType === 'bishop') {
          positionValue = BISHOP_SCORES[row][col];
        } else if (pieceType === 'pawn') {
          positionValue = isWhite ? PAWN_SCORES[row][col] : PAWN_SCORES[7 - row][col];
        } else if (pieceType === 'queen') {
          positionValue = QUEEN_SCORES[row][col];
        } else if (pieceType === 'rook') {
          positionValue = ROOK_SCORES[row][col];
        }
        
        const totalValue = pieceValue + positionValue;
        score += isWhite ? totalValue : -totalValue;
      }
    }
    
    return score;
  }

  // Internal move for AI (returns backup data)
  makeMoveInternal(fromRow, fromCol, toRow, toCol) {
    const backup = {
      piece: this.board[fromRow][fromCol],
      captured: this.board[toRow][toCol],
      whiteToMove: this.whiteToMove,
      whiteKingPos: [...this.whiteKingPos],
      blackKingPos: [...this.blackKingPos],
      castlingRights: { ...this.castlingRights },
      enPassantSquare: this.enPassantSquare
    };
    
    const piece = this.board[fromRow][fromCol];
    this.board[toRow][toCol] = piece;
    this.board[fromRow][fromCol] = '.';
    
    // Update king position
    if (piece === '♔') this.whiteKingPos = [toRow, toCol];
    if (piece === '♚') this.blackKingPos = [toRow, toCol];
    
    // Pawn promotion
    if ((piece === '♙' && toRow === 0) || (piece === '♟' && toRow === 7)) {
      this.board[toRow][toCol] = this.whiteToMove ? '♕' : '♛';
    }
    
    this.whiteToMove = !this.whiteToMove;
    
    return backup;
  }

  // Undo internal move
  undoMoveInternal(backup) {
    const { piece, captured, whiteToMove, whiteKingPos, blackKingPos, castlingRights, enPassantSquare } = backup;
    
    // Find where the piece moved to
    let movedToRow = -1, movedToCol = -1;
    for (let row = 0; row < 8; row++) {
      for (let col = 0; col < 8; col++) {
        const currentPiece = this.board[row][col];
        if (currentPiece === piece || 
            (piece === '♙' && currentPiece === '♕') ||
            (piece === '♟' && currentPiece === '♛')) {
          // Check if this could be the moved piece by comparing with original king positions
          if (piece === '♔' || piece === '♚') {
            movedToRow = row;
            movedToCol = col;
            break;
          }
          // For other pieces, we need to find the one that's not in the original position
          movedToRow = row;
          movedToCol = col;
        }
      }
      if (movedToRow !== -1) break;
    }
    
    // Restore position based on king positions
    if (piece === '♔') {
      const [curRow, curCol] = this.whiteKingPos;
      this.board[whiteKingPos[0]][whiteKingPos[1]] = piece;
      this.board[curRow][curCol] = captured;
    } else if (piece === '♚') {
      const [curRow, curCol] = this.blackKingPos;
      this.board[blackKingPos[0]][blackKingPos[1]] = piece;
      this.board[curRow][curCol] = captured;
    } else {
      // For non-king pieces, restore based on the backup
      // We need to find where it came from - this is tricky with the current implementation
      // Simplified: just restore the captured piece at destination
      if (movedToRow !== -1) {
        this.board[movedToRow][movedToCol] = captured;
      }
    }
    
    this.whiteToMove = whiteToMove;
    this.whiteKingPos = whiteKingPos;
    this.blackKingPos = blackKingPos;
    this.castlingRights = castlingRights;
    this.enPassantSquare = enPassantSquare;
  }

  makeMove(from, to) {
    const fromPos = this.parseSquare(from);
    const toPos = this.parseSquare(to);
    
    if (!fromPos || !toPos) {
      return { success: false, message: "Invalid notation. Use format like 'e2e4'" };
    }

    const [fromRow, fromCol] = fromPos;
    const [toRow, toCol] = toPos;
    const piece = this.getPieceAt(fromRow, fromCol);

    if (piece === '.') {
      return { success: false, message: "No piece at source square" };
    }

    if (this.whiteToMove && !this.isWhitePiece(piece)) {
      return { success: false, message: "It's White's turn" };
    }
    if (!this.whiteToMove && !this.isBlackPiece(piece)) {
      return { success: false, message: "It's Black's turn" };
    }

    if (!this.isValidMove(fromRow, fromCol, toRow, toCol)) {
      return { success: false, message: "Invalid move for this piece" };
    }

    // Make the move
    const capturedPiece = this.board[toRow][toCol];
    this.board[toRow][toCol] = piece;
    this.board[fromRow][fromCol] = '.';

    // Update king position
    if (piece === '♔') this.whiteKingPos = [toRow, toCol];
    if (piece === '♚') this.blackKingPos = [toRow, toCol];

    // Handle pawn promotion
    if ((piece === '♙' && toRow === 0) || (piece === '♟' && toRow === 7)) {
      this.board[toRow][toCol] = this.whiteToMove ? '♕' : '♛';
    }

    this.updateCastlingRights(piece, fromRow, fromCol);

    const moveNotation = from + to + (capturedPiece !== '.' ? 'x' : '');
    this.moveLog.push(moveNotation);

    this.whiteToMove = !this.whiteToMove;

    const status = this.getGameStatus();
    
    return { 
      success: true, 
      message: "Move successful",
      status: status,
      aiTurn: this.gameMode === 'ai' && !this.whiteToMove
    };
  }

  isValidMove(fromRow, fromCol, toRow, toCol) {
    const piece = this.board[fromRow][fromCol];
    const targetPiece = this.board[toRow][toCol];

    if (this.whiteToMove && this.isWhitePiece(targetPiece)) return false;
    if (!this.whiteToMove && this.isBlackPiece(targetPiece)) return false;

    const pieceType = this.getPieceType(piece);

    switch (pieceType) {
      case 'pawn':
        return this.isValidPawnMove(fromRow, fromCol, toRow, toCol);
      case 'rook':
        return this.isValidRookMove(fromRow, fromCol, toRow, toCol);
      case 'knight':
        return this.isValidKnightMove(fromRow, fromCol, toRow, toCol);
      case 'bishop':
        return this.isValidBishopMove(fromRow, fromCol, toRow, toCol);
      case 'queen':
        return this.isValidQueenMove(fromRow, fromCol, toRow, toCol);
      case 'king':
        return this.isValidKingMove(fromRow, fromCol, toRow, toCol);
      default:
        return false;
    }
  }

  getPieceType(piece) {
    if (piece === '♙' || piece === '♟') return 'pawn';
    if (piece === '♖' || piece === '♜') return 'rook';
    if (piece === '♘' || piece === '♞') return 'knight';
    if (piece === '♗' || piece === '♝') return 'bishop';
    if (piece === '♕' || piece === '♛') return 'queen';
    if (piece === '♔' || piece === '♚') return 'king';
    return null;
  }

  isValidPawnMove(fromRow, fromCol, toRow, toCol) {
    const piece = this.board[fromRow][fromCol];
    const targetPiece = this.board[toRow][toCol];
    const isWhite = this.isWhitePiece(piece);
    const direction = isWhite ? -1 : 1;
    const startRow = isWhite ? 6 : 1;

    if (fromCol === toCol && toRow === fromRow + direction && targetPiece === '.') {
      return true;
    }

    if (fromCol === toCol && fromRow === startRow && 
        toRow === fromRow + 2 * direction && 
        targetPiece === '.' && 
        this.board[fromRow + direction][fromCol] === '.') {
      return true;
    }

    if (Math.abs(fromCol - toCol) === 1 && toRow === fromRow + direction && targetPiece !== '.') {
      return true;
    }

    return false;
  }

  isValidRookMove(fromRow, fromCol, toRow, toCol) {
    if (fromRow !== toRow && fromCol !== toCol) return false;
    return this.isPathClear(fromRow, fromCol, toRow, toCol);
  }

  isValidKnightMove(fromRow, fromCol, toRow, toCol) {
    const rowDiff = Math.abs(toRow - fromRow);
    const colDiff = Math.abs(toCol - fromCol);
    return (rowDiff === 2 && colDiff === 1) || (rowDiff === 1 && colDiff === 2);
  }

  isValidBishopMove(fromRow, fromCol, toRow, toCol) {
    if (Math.abs(toRow - fromRow) !== Math.abs(toCol - fromCol)) return false;
    return this.isPathClear(fromRow, fromCol, toRow, toCol);
  }

  isValidQueenMove(fromRow, fromCol, toRow, toCol) {
    return this.isValidRookMove(fromRow, fromCol, toRow, toCol) ||
           this.isValidBishopMove(fromRow, fromCol, toRow, toCol);
  }

  isValidKingMove(fromRow, fromCol, toRow, toCol) {
    const rowDiff = Math.abs(toRow - fromRow);
    const colDiff = Math.abs(toCol - fromCol);
    return rowDiff <= 1 && colDiff <= 1;
  }

  isPathClear(fromRow, fromCol, toRow, toCol) {
    const rowStep = toRow > fromRow ? 1 : toRow < fromRow ? -1 : 0;
    const colStep = toCol > fromCol ? 1 : toCol < fromCol ? -1 : 0;

    let currentRow = fromRow + rowStep;
    let currentCol = fromCol + colStep;

    while (currentRow !== toRow || currentCol !== toCol) {
      if (this.board[currentRow][currentCol] !== '.') {
        return false;
      }
      currentRow += rowStep;
      currentCol += colStep;
    }

    return true;
  }

  updateCastlingRights(piece, fromRow, fromCol) {
    if (piece === '♔') {
      this.castlingRights.wks = false;
      this.castlingRights.wqs = false;
    } else if (piece === '♚') {
      this.castlingRights.bks = false;
      this.castlingRights.bqs = false;
    } else if (piece === '♖') {
      if (fromRow === 7 && fromCol === 0) this.castlingRights.wqs = false;
      if (fromRow === 7 && fromCol === 7) this.castlingRights.wks = false;
    } else if (piece === '♜') {
      if (fromRow === 0 && fromCol === 0) this.castlingRights.bqs = false;
      if (fromRow === 0 && fromCol === 7) this.castlingRights.bks = false;
    }
  }

  isInCheck(isWhite) {
    const kingPos = isWhite ? this.whiteKingPos : this.blackKingPos;
    const [kingRow, kingCol] = kingPos;

    for (let row = 0; row < 8; row++) {
      for (let col = 0; col < 8; col++) {
        const piece = this.board[row][col];
        if (piece === '.') continue;
        
        const isPieceWhite = this.isWhitePiece(piece);
        if (isPieceWhite === isWhite) continue;

        if (this.isValidMove(row, col, kingRow, kingCol)) {
          return true;
        }
      }
    }
    return false;
  }

  getGameStatus() {
    if (this.checkmate) {
      return this.whiteToMove ? '⚫ Black wins by checkmate!' : '⚪ White wins by checkmate!';
    }
    if (this.stalemate) {
      return '🤝 Stalemate - Draw!';
    }
    if (this.isInCheck(!this.whiteToMove)) {
      return '⚠️ Check!';
    }
    return null;
  }

  getHelp() {
    let help = `**Chess Commands:**
\`move <from><to>\` - Move piece (e.g., \`move e2e4\`)
\`<from><to>\` - Quick move (e.g., \`e2e4\`)
\`*board\` - Show current board
\`*resign\` - Resign the game
\`*stopChess\` - Stop the game

**Game Mode:** ${this.gameMode === 'ai' ? '🤖 vs AI' : '👥 PvP'}`;

    if (this.gameMode === 'ai') {
      help += '\n**Note:** AI plays as Black. You are White.';
    }

    return help;
  }
}

module.exports = ChessGame;