/**
 * 中国象棋游戏引擎
 * 负责：棋盘状态管理、走法生成、将军/将死检测
 * 纯逻辑模块，不涉及 UI 和网络
 */
var ChessEngine = (function () {
  'use strict';

  // ==================== 常量 ====================

  var COLORS = { RED: 'red', BLACK: 'black' };

  var PIECES = {
    KING: 'king',
    ADVISOR: 'advisor',
    ELEPHANT: 'elephant',
    KNIGHT: 'knight',
    ROOK: 'rook',
    CANNON: 'cannon',
    PAWN: 'pawn'
  };

  // 红方九宫格行范围：7-9，黑方：0-2
  function palaceRows(color) {
    return color === COLORS.RED ? { min: 7, max: 9 } : { min: 0, max: 2 };
  }

  // 是否已过河（从该方的视角）
  function hasCrossedRiver(row, color) {
    return color === COLORS.RED ? row <= 4 : row >= 5;
  }

  // ==================== 棋盘工具 ====================

  function cloneBoard(board) {
    return board.map(function (row) {
      return row.map(function (cell) {
        return cell ? { type: cell.type, color: cell.color } : null;
      });
    });
  }

  function inBounds(row, col) {
    return row >= 0 && row <= 9 && col >= 0 && col <= 8;
  }

  function inPalace(row, col, color) {
    var pr = palaceRows(color);
    return row >= pr.min && row <= pr.max && col >= 3 && col <= 5;
  }

  // 查找指定颜色的将/帅位置
  function findKing(board, color) {
    for (var r = 0; r < 10; r++) {
      for (var c = 0; c < 9; c++) {
        var p = board[r][c];
        if (p && p.type === PIECES.KING && p.color === color) {
          return { row: r, col: c };
        }
      }
    }
    return null;
  }

  // 计算两点之间（不含端点）的棋子数量
  function countBetween(board, r1, c1, r2, c2) {
    var count = 0;
    if (r1 === r2) {
      // 同一行
      var minC = Math.min(c1, c2);
      var maxC = Math.max(c1, c2);
      for (var c = minC + 1; c < maxC; c++) {
        if (board[r1][c]) count++;
      }
    } else if (c1 === c2) {
      // 同一列
      var minR = Math.min(r1, r2);
      var maxR = Math.max(r1, r2);
      for (var r = minR + 1; r < maxR; r++) {
        if (board[r][c1]) count++;
      }
    }
    return count;
  }

  // ==================== 走法生成（原始走法，不考虑将军） ====================

  // 将/帅：一步直行，限九宫格
  function getKingMoves(board, row, col, color) {
    var moves = [];
    var dirs = [[-1, 0], [1, 0], [0, -1], [0, 1]];
    for (var i = 0; i < dirs.length; i++) {
      var nr = row + dirs[i][0];
      var nc = col + dirs[i][1];
      if (!inBounds(nr, nc)) continue;
      if (!inPalace(nr, nc, color)) continue;
      var target = board[nr][nc];
      if (target && target.color === color) continue;
      moves.push({ row: nr, col: nc });
    }
    return moves;
  }

  // 士/仕：一步斜行，限九宫格
  function getAdvisorMoves(board, row, col, color) {
    var moves = [];
    var dirs = [[-1, -1], [-1, 1], [1, -1], [1, 1]];
    for (var i = 0; i < dirs.length; i++) {
      var nr = row + dirs[i][0];
      var nc = col + dirs[i][1];
      if (!inBounds(nr, nc)) continue;
      if (!inPalace(nr, nc, color)) continue;
      var target = board[nr][nc];
      if (target && target.color === color) continue;
      moves.push({ row: nr, col: nc });
    }
    return moves;
  }

  // 象/相："田"字对角，不过河，注意塞象眼
  function getElephantMoves(board, row, col, color) {
    var moves = [];
    // 四个对角方向，每个需要检查象眼（中心点）
    var dirs = [
      { dr: -2, dc: -2, eyeR: -1, eyeC: -1 },
      { dr: -2, dc: 2, eyeR: -1, eyeC: 1 },
      { dr: 2, dc: -2, eyeR: 1, eyeC: -1 },
      { dr: 2, dc: 2, eyeR: 1, eyeC: 1 }
    ];
    for (var i = 0; i < dirs.length; i++) {
      var d = dirs[i];
      var nr = row + d.dr;
      var nc = col + d.dc;
      var eyeR = row + d.eyeR;
      var eyeC = col + d.eyeC;
      if (!inBounds(nr, nc)) continue;
      // 不能过河：红方象只能在己方半边（行5-9），黑方象（行0-4）
      if (color === COLORS.RED && nr < 5) continue;
      if (color === COLORS.BLACK && nr > 4) continue;
      // 象眼被堵
      if (board[eyeR][eyeC]) continue;
      var target = board[nr][nc];
      if (target && target.color === color) continue;
      moves.push({ row: nr, col: nc });
    }
    return moves;
  }

  // 马：L 形走法，注意蹩马脚
  function getKnightMoves(board, row, col, color) {
    var moves = [];
    // 四个正交方向的马脚，每个方向有两个落点
    var legs = [
      { legR: -1, legC: 0, targets: [[-2, -1], [-2, 1]] },
      { legR: 1, legC: 0, targets: [[2, -1], [2, 1]] },
      { legR: 0, legC: -1, targets: [[-1, -2], [1, -2]] },
      { legR: 0, legC: 1, targets: [[-1, 2], [1, 2]] }
    ];
    for (var i = 0; i < legs.length; i++) {
      var leg = legs[i];
      var legR = row + leg.legR;
      var legC = col + leg.legC;
      // 马脚被堵（蹩马脚）
      if (!inBounds(legR, legC) || board[legR][legC]) continue;
      for (var j = 0; j < leg.targets.length; j++) {
        var nr = row + leg.targets[j][0];
        var nc = col + leg.targets[j][1];
        if (!inBounds(nr, nc)) continue;
        var target = board[nr][nc];
        if (target && target.color === color) continue;
        moves.push({ row: nr, col: nc });
      }
    }
    return moves;
  }

  // 车/車：直线任意距离，不能越子
  function getRookMoves(board, row, col, color) {
    var moves = [];
    var dirs = [[-1, 0], [1, 0], [0, -1], [0, 1]];
    for (var i = 0; i < dirs.length; i++) {
      var dr = dirs[i][0];
      var dc = dirs[i][1];
      var nr = row + dr;
      var nc = col + dc;
      while (inBounds(nr, nc)) {
        var target = board[nr][nc];
        if (target) {
          if (target.color !== color) {
            moves.push({ row: nr, col: nc }); // 吃子
          }
          break; // 碰到棋子就停（无论敌我）
        }
        moves.push({ row: nr, col: nc });
        nr += dr;
        nc += dc;
      }
    }
    return moves;
  }

  // 炮/砲：走子如车，吃子需翻山（隔一个棋子吃子）
  function getCannonMoves(board, row, col, color) {
    var moves = [];
    var dirs = [[-1, 0], [1, 0], [0, -1], [0, 1]];
    for (var i = 0; i < dirs.length; i++) {
      var dr = dirs[i][0];
      var dc = dirs[i][1];
      var nr = row + dr;
      var nc = col + dc;

      // 第一阶段：走子（遇到棋子前都是空位走法）
      while (inBounds(nr, nc) && !board[nr][nc]) {
        moves.push({ row: nr, col: nc });
        nr += dr;
        nc += dc;
      }

      // 碰到第一个棋子（炮架/炮台），跳过它
      if (inBounds(nr, nc) && board[nr][nc]) {
        nr += dr;
        nc += dc;
        // 第二阶段：找炮架后面的第一个棋子（吃子目标）
        while (inBounds(nr, nc) && !board[nr][nc]) {
          nr += dr;
          nc += dc;
        }
        if (inBounds(nr, nc) && board[nr][nc] && board[nr][nc].color !== color) {
          moves.push({ row: nr, col: nc }); // 翻山吃子
        }
      }
    }
    return moves;
  }

  // 兵/卒：未过河只能前进，过河可左右，不能后退
  function getPawnMoves(board, row, col, color) {
    var moves = [];
    var forward = color === COLORS.RED ? -1 : 1;
    var fr = row + forward;

    // 前进
    if (inBounds(fr, col)) {
      var target = board[fr][col];
      if (!target || target.color !== color) {
        moves.push({ row: fr, col: col });
      }
    }

    // 过河后可以左右走
    if (hasCrossedRiver(row, color)) {
      var sides = [-1, 1];
      for (var i = 0; i < sides.length; i++) {
        var nc = col + sides[i];
        if (!inBounds(row, nc)) continue;
        target = board[row][nc];
        if (!target || target.color !== color) {
          moves.push({ row: row, col: nc });
        }
      }
    }

    return moves;
  }

  // 获取指定位置棋子的所有原始走法（不考虑将军）
  function getRawMoves(board, row, col) {
    var piece = board[row][col];
    if (!piece) return [];

    switch (piece.type) {
      case PIECES.KING: return getKingMoves(board, row, col, piece.color);
      case PIECES.ADVISOR: return getAdvisorMoves(board, row, col, piece.color);
      case PIECES.ELEPHANT: return getElephantMoves(board, row, col, piece.color);
      case PIECES.KNIGHT: return getKnightMoves(board, row, col, piece.color);
      case PIECES.ROOK: return getRookMoves(board, row, col, piece.color);
      case PIECES.CANNON: return getCannonMoves(board, row, col, piece.color);
      case PIECES.PAWN: return getPawnMoves(board, row, col, piece.color);
      default: return [];
    }
  }

  // ==================== 将军/将死检测 ====================

  // 检测"将帅对面"：两王在同一列且之间无棋子
  function isKingFacingKing(board) {
    var redKing = findKing(board, COLORS.RED);
    var blackKing = findKing(board, COLORS.BLACK);
    if (!redKing || !blackKing) return false;
    if (redKing.col !== blackKing.col) return false;
    return countBetween(board, redKing.row, redKing.col, blackKing.row, blackKing.col) === 0;
  }

  // 检查某方是否被将军
  function isKingInCheck(board, color) {
    // 先检查将帅对面（这也算被将军）
    if (isKingFacingKing(board)) return true;

    var king = findKing(board, color);
    if (!king) return true; // 将被吃了，绝对算被将军

    var opponentColor = color === COLORS.RED ? COLORS.BLACK : COLORS.RED;

    // 遍历对方所有棋子，看是否能攻击到王
    for (var r = 0; r < 10; r++) {
      for (var c = 0; c < 9; c++) {
        var piece = board[r][c];
        if (!piece || piece.color !== opponentColor) continue;
        var moves = getRawMoves(board, r, c);
        for (var i = 0; i < moves.length; i++) {
          if (moves[i].row === king.row && moves[i].col === king.col) {
            return true;
          }
        }
      }
    }
    return false;
  }

  // 获取某位置棋子的所有合法走法（走完后不能让自己被将军）
  function getValidMoves(board, row, col) {
    var piece = board[row][col];
    if (!piece) return [];

    var rawMoves = getRawMoves(board, row, col);
    var validMoves = [];

    for (var i = 0; i < rawMoves.length; i++) {
      var move = rawMoves[i];
      // 模拟走棋
      var simBoard = cloneBoard(board);
      simBoard[move.row][move.col] = simBoard[row][col];
      simBoard[row][col] = null;
      // 走完后自己不能被将军
      if (!isKingInCheck(simBoard, piece.color)) {
        validMoves.push(move);
      }
    }

    return validMoves;
  }

  // 检查某方是否还有合法走法
  function hasAnyValidMove(board, color) {
    for (var r = 0; r < 10; r++) {
      for (var c = 0; c < 9; c++) {
        var piece = board[r][c];
        if (!piece || piece.color !== color) continue;
        if (getValidMoves(board, r, c).length > 0) return true;
      }
    }
    return false;
  }

  // 检测将死（无合法走法 + 被将军）
  function isCheckmate(board, color) {
    return isKingInCheck(board, color) && !hasAnyValidMove(board, color);
  }

  // 检测困毙（无合法走法 + 未被将军，象棋规则中算输）
  function isStalemate(board, color) {
    return !isKingInCheck(board, color) && !hasAnyValidMove(board, color);
  }

  // ==================== 棋盘初始化 ====================

  // 初始棋盘布局
  function createInitialBoard() {
    var board = [];
    for (var r = 0; r < 10; r++) {
      board[r] = [];
      for (var c = 0; c < 9; c++) {
        board[r][c] = null;
      }
    }

    // 黑方底线（行 0）
    var backRank = [PIECES.ROOK, PIECES.KNIGHT, PIECES.ELEPHANT, PIECES.ADVISOR,
                     PIECES.KING, PIECES.ADVISOR, PIECES.ELEPHANT, PIECES.KNIGHT, PIECES.ROOK];
    for (c = 0; c < 9; c++) {
      board[0][c] = { type: backRank[c], color: COLORS.BLACK };
    }

    // 黑方炮（行 2，列 1 和 7）
    board[2][1] = { type: PIECES.CANNON, color: COLORS.BLACK };
    board[2][7] = { type: PIECES.CANNON, color: COLORS.BLACK };

    // 黑方卒（行 3，列 0, 2, 4, 6, 8）
    for (c = 0; c < 9; c += 2) {
      board[3][c] = { type: PIECES.PAWN, color: COLORS.BLACK };
    }

    // 红方兵（行 6，列 0, 2, 4, 6, 8）
    for (c = 0; c < 9; c += 2) {
      board[6][c] = { type: PIECES.PAWN, color: COLORS.RED };
    }

    // 红方炮（行 7，列 1 和 7）
    board[7][1] = { type: PIECES.CANNON, color: COLORS.RED };
    board[7][7] = { type: PIECES.CANNON, color: COLORS.RED };

    // 红方底线（行 9）
    for (c = 0; c < 9; c++) {
      board[9][c] = { type: backRank[c], color: COLORS.RED };
    }

    return board;
  }

  // ==================== 走棋操作 ====================

  function createInitialState() {
    return {
      board: createInitialBoard(),
      turn: COLORS.RED,           // 红方先手
      moveHistory: [],
      inCheck: null,              // 'red' | 'black' | null
      gameOver: null              // { winner: 'red'|'black', reason: 'checkmate'|'stalemate'|'resign' } | null
    };
  }

  // 走棋，返回新状态（不修改原状态）
  function makeMove(state, fromRow, fromCol, toRow, toCol) {
    var board = cloneBoard(state.board);
    var piece = board[fromRow][fromCol];
    var captured = board[toRow][toCol];

    // 执行走棋
    board[toRow][toCol] = piece;
    board[fromRow][fromCol] = null;

    // 切换回合
    var nextTurn = state.turn === COLORS.RED ? COLORS.BLACK : COLORS.RED;

    // 检测对方是否被将军/将死/困毙
    var inCheck = isKingInCheck(board, nextTurn) ? nextTurn : null;
    var gameOver = null;

    if (isCheckmate(board, nextTurn)) {
      gameOver = { winner: state.turn, reason: 'checkmate' };
    } else if (isStalemate(board, nextTurn)) {
      gameOver = { winner: state.turn, reason: 'stalemate' };
    }

    // 记录走棋历史
    var moveRecord = {
      fromRow: fromRow,
      fromCol: fromCol,
      toRow: toRow,
      toCol: toCol,
      piece: { type: piece.type, color: piece.color },
      captured: captured ? { type: captured.type, color: captured.color } : null
    };

    return {
      board: board,
      turn: nextTurn,
      moveHistory: state.moveHistory.concat([moveRecord]),
      inCheck: inCheck,
      gameOver: gameOver
    };
  }

  // ==================== 工具函数 ====================

  // 获取棋子显示文字
  function getPieceChar(piece) {
    if (!piece) return '';
    var isRed = piece.color === COLORS.RED;
    switch (piece.type) {
      case PIECES.KING: return isRed ? '帅' : '将';
      case PIECES.ADVISOR: return isRed ? '仕' : '士';
      case PIECES.ELEPHANT: return isRed ? '相' : '象';
      case PIECES.KNIGHT: return isRed ? '傌' : '馬';
      case PIECES.ROOK: return isRed ? '俥' : '車';
      case PIECES.CANNON: return isRed ? '炮' : '砲';
      case PIECES.PAWN: return isRed ? '兵' : '卒';
      default: return '?';
    }
  }

  // ==================== 公开 API ====================

  return {
    COLORS: COLORS,
    PIECES: PIECES,

    createInitialBoard: createInitialBoard,
    createInitialState: createInitialState,
    getRawMoves: getRawMoves,
    getValidMoves: getValidMoves,
    makeMove: makeMove,
    isKingInCheck: isKingInCheck,
    isCheckmate: isCheckmate,
    isStalemate: isStalemate,
    hasAnyValidMove: hasAnyValidMove,
    findKing: findKing,
    getPieceChar: getPieceChar,
    inBounds: inBounds
  };
})();

// 如果支持模块导出（Node.js 等环境）
if (typeof module !== 'undefined' && module.exports) {
  module.exports = ChessEngine;
}
