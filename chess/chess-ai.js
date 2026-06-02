/**
 * 中国象棋 AI 引擎
 * 依赖 ChessEngine，实现 Minimax + Alpha-Beta 搜索
 * 三档难度：简单(1层) / 中等(2层) / 困难(3层+时间控制)
 */
var ChessAI = (function () {
  'use strict';

  var C = ChessEngine.COLORS;
  var P = ChessEngine.PIECES;

  // ==================== 难度常量 ====================
  var EASY = 'easy';
  var MEDIUM = 'medium';
  var HARD = 'hard';

  // ==================== 子力基础价值 ====================
  var PIECE_BASE_VALUE = {};
  PIECE_BASE_VALUE[P.KING] = 10000;
  PIECE_BASE_VALUE[P.ROOK] = 600;
  PIECE_BASE_VALUE[P.CANNON] = 300;
  PIECE_BASE_VALUE[P.KNIGHT] = 270;
  PIECE_BASE_VALUE[P.ELEPHANT] = 120;
  PIECE_BASE_VALUE[P.ADVISOR] = 120;
  PIECE_BASE_VALUE[P.PAWN] = 30;    // 未过河
  PIECE_BASE_VALUE[P.PAWN + '_crossed'] = 80;  // 已过河

  // ==================== 位置加分表（从红方视角，行9=红方底线） ====================
  // 对黑方使用时镜像行号

  // 车的位置加分：中路和河口线加分
  var ROOK_POS = [
    [ 10,  5,  5, 15, 15, 15,  5,  5, 10],  // row 0
    [ 15, 15, 15, 20, 20, 20, 15, 15, 15],  // row 1
    [  5, 10, 10, 15, 15, 15, 10, 10,  5],  // row 2
    [  5, 10, 10, 15, 15, 15, 10, 10,  5],  // row 3
    [  5, 10, 10, 15, 15, 15, 10, 10,  5],  // row 4
    [  5, 10, 10, 15, 15, 15, 10, 10,  5],  // row 5
    [  5, 10, 10, 15, 15, 15, 10, 10,  5],  // row 6
    [  5, 10, 10, 15, 15, 15, 10, 10,  5],  // row 7
    [  0,  5,  5, 10, 10, 10,  5,  5,  0],  // row 8
    [  0,  5,  5, 10, 10, 10,  5,  5,  0]   // row 9 (红方底线)
  ];

  // 马的位置加分：中心位置好，边角蹩脚风险大所以减分
  var KNIGHT_POS = [
    [  0, -5,  0,  0,  5,  0,  0, -5,  0],  // row 0
    [  0,  5, 10, 10, 10, 10, 10,  5,  0],  // row 1
    [  0, 10, 15, 15, 15, 15, 15, 10,  0],  // row 2
    [  0, 10, 15, 20, 20, 20, 15, 10,  0],  // row 3
    [  0, 10, 15, 20, 20, 20, 15, 10,  0],  // row 4
    [  0, 10, 15, 20, 20, 20, 15, 10,  0],  // row 5
    [  0, 10, 15, 15, 15, 15, 15, 10,  0],  // row 6
    [  0,  5, 10, 10, 10, 10, 10,  5,  0],  // row 7
    [  0,  0,  5,  5,  5,  5,  5,  0,  0],  // row 8
    [  0, -5,  0,  0,  0,  0,  0, -5,  0]   // row 9
  ];

  // 炮的位置加分：中路加分，初始位置稍减（鼓励尽早出动）
  var CANNON_POS = [
    [  0,  0,  5, 10, 10, 10,  5,  0,  0],  // row 0
    [  0,  5, 10, 15, 15, 15, 10,  5,  0],  // row 1
    [  0,  5, 10, 15, 15, 15, 10,  5,  0],  // row 2
    [  0,  5, 10, 15, 15, 15, 10,  5,  0],  // row 3
    [  0,  5, 10, 15, 15, 15, 10,  5,  0],  // row 4
    [  0,  5, 10, 15, 15, 15, 10,  5,  0],  // row 5
    [  0,  5, 10, 15, 15, 15, 10,  5,  0],  // row 6
    [  0, -5,  0,  5,  5,  5,  0, -5,  0],  // row 7
    [  0,  0,  0,  0,  0,  0,  0,  0,  0],  // row 8
    [  0,  0,  0,  0,  0,  0,  0,  0,  0]   // row 9
  ];

  // 兵的位置加分（红方视角：行越小越靠前）
  var PAWN_RED_POS = [
    [  0,  0,  0,  0,  0,  0,  0,  0,  0],  // row 0
    [  0,  0,  0,  0,  0,  0,  0,  0,  0],  // row 1
    [  0,  0,  0,  0,  0,  0,  0,  0,  0],  // row 2
    [  5, 10, 15, 20, 20, 20, 15, 10,  5],  // row 3 (过河后)
    [  5, 10, 15, 20, 20, 20, 15, 10,  5],  // row 4
    [ 10, 15, 20, 25, 25, 25, 20, 15, 10],  // row 5 (接近敌方)
    [ 10, 15, 20, 25, 25, 25, 20, 15, 10],  // row 6 (红兵初始行)
    [  0,  0,  0,  0,  0,  0,  0,  0,  0],  // row 7
    [  0,  0,  0,  0,  0,  0,  0,  0,  0],  // row 8
    [  0,  0,  0,  0,  0,  0,  0,  0,  0]   // row 9
  ];

  // 士/仕位置加分：防守位
  var ADVISOR_POS = [
    [  0,  0,  0,  0,  0,  0,  0,  0,  0],
    [  0,  0,  0,  0,  0,  0,  0,  0,  0],
    [  0,  0,  0,  0,  0,  0,  0,  0,  0],
    [  0,  0,  0,  0,  0,  0,  0,  0,  0],
    [  0,  0,  0,  0,  0,  0,  0,  0,  0],
    [  0,  0,  0,  0,  0,  0,  0,  0,  0],
    [  0,  0,  0,  0,  0,  0,  0,  0,  0],
    [  0,  0,  0,  5,  0,  5,  0,  0,  0],  // row 7
    [  0,  0,  0,  0, 10,  0,  0,  0,  0],  // row 8 (中间最好)
    [  0,  0,  0,  5,  0,  5,  0,  0,  0]   // row 9
  ];

  // 象/相位置加分：防守位
  var ELEPHANT_POS = [
    [  0,  0,  0,  0,  0,  0,  0,  0,  0],
    [  0,  0,  0,  0,  0,  0,  0,  0,  0],
    [  0,  0,  0,  0,  0,  0,  0,  0,  0],
    [  0,  0,  0,  0,  0,  0,  0,  0,  0],
    [  0,  0,  0,  0,  0,  0,  0,  0,  0],
    [  0,  0,  0,  0,  0,  0,  0,  0,  0],  // row 5 (河界)
    [  0,  0,  5,  0,  0,  0,  5,  0,  0],  // row 6
    [  0,  0,  0,  0,  0,  0,  0,  0,  0],  // row 7
    [  0,  0,  0,  0,  0,  0,  0,  0,  0],  // row 8
    [  0,  0,  5,  0,  0,  0,  5,  0,  0]   // row 9
  ];

  // 将/帅位置加分：安全位
  var KING_POS = [
    [  0,  0,  0,  0,  0,  0,  0,  0,  0],
    [  0,  0,  0,  0,  0,  0,  0,  0,  0],
    [  0,  0,  0,  0,  0,  0,  0,  0,  0],
    [  0,  0,  0,  0,  0,  0,  0,  0,  0],
    [  0,  0,  0,  0,  0,  0,  0,  0,  0],
    [  0,  0,  0,  0,  0,  0,  0,  0,  0],
    [  0,  0,  0,  0,  0,  0,  0,  0,  0],
    [  0,  0,  0,  0,  5,  0,  0,  0,  0],  // row 7
    [  0,  0,  0,  5, 10,  5,  0,  0,  0],  // row 8
    [  0,  0,  0,  0,  5,  0,  0,  0,  0]   // row 9
  ];

  // 位置表映射
  var POS_TABLES = {};
  POS_TABLES[P.ROOK] = ROOK_POS;
  POS_TABLES[P.KNIGHT] = KNIGHT_POS;
  POS_TABLES[P.CANNON] = CANNON_POS;
  POS_TABLES[P.ADVISOR] = ADVISOR_POS;
  POS_TABLES[P.ELEPHANT] = ELEPHANT_POS;
  POS_TABLES[P.KING] = KING_POS;
  // 兵有独立的红方/黑方表

  // ==================== 工具函数 ====================

  function cloneBoard(board) {
    return board.map(function (row) {
      return row.map(function (cell) {
        return cell ? { type: cell.type, color: cell.color } : null;
      });
    });
  }

  // 获取位置加分（row 为实际行号，color 为棋子颜色）
  function getPositionBonus(piece, row, col) {
    var table;
    if (piece.type === P.PAWN) {
      table = piece.color === C.RED ? PAWN_RED_POS : mirrorTable(PAWN_RED_POS);
    } else {
      table = POS_TABLES[piece.type];
      if (!table) return 0;
      if (piece.color === C.BLACK) {
        table = mirrorTable(table);
      }
    }
    return table[row][col];
  }

  // 垂直镜像位置表（黑方使用）
  function mirrorTable(table) {
    var mirrored = [];
    for (var r = 0; r < 10; r++) {
      mirrored[r] = table[9 - r];
    }
    return mirrored;
  }

  // 判断是否过河
  function hasCrossedRiver(row, color) {
    return color === C.RED ? row <= 4 : row >= 5;
  }

  // ==================== 评估函数 ====================

  function evaluate(board, forColor) {
    var score = 0;

    for (var r = 0; r < 10; r++) {
      for (var c = 0; c < 9; c++) {
        var piece = board[r][c];
        if (!piece) continue;

        var sign = piece.color === forColor ? 1 : -1;

        // 子力分
        var baseVal = PIECE_BASE_VALUE[piece.type];
        if (piece.type === P.PAWN && hasCrossedRiver(r, piece.color)) {
          baseVal = PIECE_BASE_VALUE[P.PAWN + '_crossed'];
        }
        score += sign * baseVal;

        // 位置分
        score += sign * getPositionBonus(piece, r, c);
      }
    }

    // 机动性分（简化：只计算总走法数差异）
    // 较大权重用在困难难度，简单/中等可忽略
    return score;
  }

  // 计算某方的所有合法走法（用于机动性评估和搜索）
  function getAllValidMoves(board, color) {
    var allMoves = [];
    for (var r = 0; r < 10; r++) {
      for (var c = 0; c < 9; c++) {
        var piece = board[r][c];
        if (!piece || piece.color !== color) continue;
        var moves = ChessEngine.getValidMoves(board, r, c);
        for (var i = 0; i < moves.length; i++) {
          allMoves.push({
            fromRow: r, fromCol: c,
            toRow: moves[i].row, toCol: moves[i].col,
            piece: piece
          });
        }
      }
    }
    return allMoves;
  }

  // 走法排序：吃子优先，MVV/LVA
  function orderMoves(moves, board) {
    return moves.sort(function (a, b) {
      var captA = board[a.toRow][a.toCol];
      var captB = board[b.toRow][b.toCol];
      var scoreA = captA ? PIECE_BASE_VALUE[captA.type] : 0;
      var scoreB = captB ? PIECE_BASE_VALUE[captB.type] : 0;
      // 被吃子价值越高越优先；吃子用小子吃大子更优先
      var valA = scoreA - (PIECE_BASE_VALUE[a.piece.type] / 100);
      var valB = scoreB - (PIECE_BASE_VALUE[b.piece.type] / 100);
      return valB - valA;
    });
  }

  // 模拟走棋（浅拷贝，不验证将军）
  function applyMove(board, fromRow, fromCol, toRow, toCol) {
    var newBoard = cloneBoard(board);
    newBoard[toRow][toCol] = newBoard[fromRow][fromCol];
    newBoard[fromRow][fromCol] = null;
    return newBoard;
  }

  // ==================== Minimax + Alpha-Beta ====================

  var searchStartTime = 0;
  var searchTimeLimit = 2000;  // 2秒超时（困难难度）
  var searchCancelled = false;

  function minimax(board, depth, alpha, beta, maximizing, aiColor, currentColor) {
    // 超时检查
    if (searchCancelled) return maximizing ? -99999 : 99999;

    if (depth === 0) {
      return evaluate(board, aiColor);
    }

    var moves = getAllValidMoves(board, currentColor);

    // 无合法走法 → 将死或困毙
    if (moves.length === 0) {
      if (ChessEngine.isKingInCheck(board, currentColor)) {
        // 被将死，对被将死的一方极端不利
        return maximizing ? -99999 + (4 - depth) * 100 : 99999 - (4 - depth) * 100;
      }
      // 困毙（无子可动但未被将军），象棋中算输
      return maximizing ? -99999 + (4 - depth) * 100 : 99999 - (4 - depth) * 100;
    }

    orderMoves(moves, board);

    var nextColor = currentColor === C.RED ? C.BLACK : C.RED;

    if (maximizing) {
      var maxEval = -Infinity;
      for (var i = 0; i < moves.length; i++) {
        if (searchCancelled) break;
        var m = moves[i];
        var newBoard = applyMove(board, m.fromRow, m.fromCol, m.toRow, m.toCol);
        // 跳过导致己方被将军的走法
        if (ChessEngine.isKingInCheck(newBoard, currentColor)) continue;
        var nodeScore = minimax(newBoard, depth - 1, alpha, beta, false, aiColor, nextColor);
        maxEval = Math.max(maxEval, nodeScore);
        alpha = Math.max(alpha, nodeScore);
        if (beta <= alpha) break;
      }
      return maxEval === -Infinity ? -99999 : maxEval;
    } else {
      var minEval = Infinity;
      for (var j = 0; j < moves.length; j++) {
        if (searchCancelled) break;
        var mm = moves[j];
        var newBoard2 = applyMove(board, mm.fromRow, mm.fromCol, mm.toRow, mm.toCol);
        if (ChessEngine.isKingInCheck(newBoard2, currentColor)) continue;
        var nodeScore2 = minimax(newBoard2, depth - 1, alpha, beta, true, aiColor, nextColor);
        minEval = Math.min(minEval, nodeScore2);
        beta = Math.min(beta, nodeScore2);
        if (beta <= alpha) break;
      }
      return minEval === Infinity ? 99999 : minEval;
    }
  }

  // ==================== 公开入口 ====================

  function findBestMove(state, difficulty) {
    var board = state.board;
    var aiColor = state.turn;
    var depth;

    switch (difficulty) {
      case EASY: depth = 1; break;
      case MEDIUM: depth = 2; break;
      case HARD: depth = 3; break;
      default: depth = 1;
    }

    var moves = getAllValidMoves(board, aiColor);
    if (moves.length === 0) return null;

    orderMoves(moves, board);
    searchCancelled = false;
    searchStartTime = performance.now();

    var bestMove = moves[0];
    var bestScore = -Infinity;
    var alpha = -Infinity;
    var beta = Infinity;
    var nextColor = aiColor === C.RED ? C.BLACK : C.RED;

    // 困难难度：迭代加深 + 超时控制
    var actualDepth = difficulty === HARD ? 1 : depth;
    var maxDepth = depth;

    while (actualDepth <= maxDepth) {
      if (searchCancelled) break;

      var currentBest = moves[0];
      var currentBestScore = -Infinity;

      for (var i = 0; i < moves.length; i++) {
        if (searchCancelled) break;

        var m = moves[i];
        var newBoard = applyMove(board, m.fromRow, m.fromCol, m.toRow, m.toCol);
        if (ChessEngine.isKingInCheck(newBoard, aiColor)) continue;

        var moveScore;
        if (actualDepth === 1) {
          moveScore = -evaluate(newBoard, aiColor);
        } else {
          searchTimeLimit = difficulty === HARD ? 2000 : 5000;
          moveScore = minimax(newBoard, actualDepth - 1, alpha, beta, false, aiColor, nextColor);
        }

        if (moveScore > currentBestScore) {
          currentBestScore = moveScore;
          currentBest = m;
        }
      }

      // 更新最佳
      if (currentBestScore > bestScore || actualDepth === 1) {
        bestScore = currentBestScore;
        bestMove = currentBest;
      }

      // 简单难度：在达到深度1后可以提前退出
      if (difficulty === EASY) break;

      // 困难难度：继续加深，但检查时间
      if (difficulty === HARD) {
        var elapsed = performance.now() - searchStartTime;
        if (elapsed > 1500 || actualDepth >= 4) {
          break; // 时间不够了，不再加深
        }
      }

      actualDepth++;
      if (difficulty !== HARD) break;  // 简单/中等不迭代加深
    }

    // 简单难度：在等分走法中随机选择（30%概率选非最优）
    if (difficulty === EASY) {
      var equalMoves = [];
      for (var j = 0; j < moves.length; j++) {
        var mm = moves[j];
        var tmpBoard = applyMove(board, mm.fromRow, mm.fromCol, mm.toRow, mm.toCol);
        if (ChessEngine.isKingInCheck(tmpBoard, aiColor)) continue;
        var sc = -evaluate(tmpBoard, aiColor);
        // 分数接近最优的（差距在50以内）视为等分
        if (bestScore - sc < 50) {
          equalMoves.push(mm);
        }
      }
      if (equalMoves.length > 1 && Math.random() < 0.3) {
        bestMove = equalMoves[Math.floor(Math.random() * equalMoves.length)];
      }
    }

    return {
      fromRow: bestMove.fromRow,
      fromCol: bestMove.fromCol,
      toRow: bestMove.toRow,
      toCol: bestMove.toCol
    };
  }

  // 取消搜索（用于用户中断）
  function cancelSearch() {
    searchCancelled = true;
  }

  // ==================== 公开 API ====================
  return {
    EASY: EASY,
    MEDIUM: MEDIUM,
    HARD: HARD,
    findBestMove: findBestMove,
    cancelSearch: cancelSearch,
    evaluate: evaluate
  };
})();

if (typeof module !== 'undefined' && module.exports) {
  module.exports = ChessAI;
}
