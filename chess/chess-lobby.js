/**
 * 中国象棋房间大厅 — Firebase Realtime Database 集成
 * 提供公开房间列表、创建/加入房间、自动清理
 * 降级方案：Firebase 不可用时退回手动输入房间号模式
 */
var ChessLobby = (function () {
  'use strict';

  // ==================== Firebase 配置 ====================

  var firebaseConfig = {
    apiKey: "AIzaSyApVdDYaCSc67ywuRV6Zz6vqM7s6EnbQpk",
    authDomain: "chess-lobby-92618.firebaseapp.com",
    databaseURL: "https://chess-lobby-92618-default-rtdb.firebaseio.com",
    projectId: "chess-lobby-92618",
    storageBucket: "chess-lobby-92618.firebasestorage.app",
    messagingSenderId: "781607036445",
    appId: "1:781607036445:web:6c99c7f6a92c03a93c88f4"
  };

  // ==================== 状态 ====================
  var db = null;
  var initialized = false;
  var manualMode = false;       // 降级为手动模式
  var roomsRef = null;
  var listCallback = null;
  var myRoomRef = null;

  // ==================== 初始化 ====================

  function init() {
    if (initialized) return true;

    try {
      if (typeof firebase === 'undefined') {
        console.warn('Firebase SDK 未加载，使用手动模式');
        manualMode = true;
        return false;
      }

      if (!firebase.apps.length) {
        firebase.initializeApp(firebaseConfig);
      }
      db = firebase.database();
      roomsRef = db.ref('rooms');
      initialized = true;
      console.log('Firebase 大厅已初始化');
      return true;
    } catch (e) {
      console.error('Firebase 初始化失败:', e.message);
      manualMode = true;
      return false;
    }
  }

  // ==================== 房间操作 ====================

  // 创建房间
  function createRoom(roomName, hostPeerId) {
    if (!init()) return null;

    var roomId = 'room-' + Date.now() + '-' + Math.random().toString(36).substr(2, 5);
    var roomData = {
      name: roomName || '无名棋局',
      hostPeerId: hostPeerId,
      createdAt: firebase.database.ServerValue.TIMESTAMP,
      playerCount: 1
    };

    var ref = db.ref('rooms/' + roomId);
    ref.set(roomData);

    // 断开连接时自动删除房间
    ref.onDisconnect().remove();

    myRoomRef = ref;
    return roomId;
  }

  // 加入房间（更新 playerCount）
  function joinRoom(roomId) {
    if (!init()) return;

    var ref = db.ref('rooms/' + roomId);
    ref.transaction(function (room) {
      if (room && room.playerCount === 1) {
        room.playerCount = 2;
        return room;
      }
      return; // 房间已满或不存在，取消
    }, function (error, committed) {
      if (error) {
        console.error('加入房间失败:', error);
      }
      // committed 为 false 表示房间已被抢占
    });
  }

  // 离开/删除房间
  function leaveRoom(roomId) {
    if (!roomId) return;
    if (myRoomRef) {
      myRoomRef.onDisconnect().cancel();
      myRoomRef.remove();
      myRoomRef = null;
    } else if (roomId && db) {
      db.ref('rooms/' + roomId).remove();
    }
  }

  // ==================== 房间列表监听 ====================

  // 监听房间列表变化
  function onRoomListChanged(callback) {
    if (!init()) {
      // 降级模式：直接调用回调通知
      if (callback) callback(null);
      return;
    }

    listCallback = callback;

    roomsRef.on('value', function (snapshot) {
      var rooms = snapshot.val() || {};
      var now = Date.now();
      var MAX_AGE = 10 * 60 * 1000; // 10 分钟过期

      // 过滤：只显示等待中的房间（playerCount=1）
      var available = {};
      Object.keys(rooms).forEach(function (id) {
        var room = rooms[id];
        var age = now - (room.createdAt || 0);
        if (room.playerCount === 1 && age < MAX_AGE) {
          available[id] = room;
        }
      });

      if (listCallback) listCallback(available);
    });
  }

  // 停止监听
  function offRoomListChanged() {
    if (roomsRef && listCallback) {
      roomsRef.off('value');
      listCallback = null;
    }
  }

  // ==================== 降级模式 ====================

  function isManualMode() {
    return manualMode || !initialized;
  }

  // ==================== 公开 API ====================

  return {
    init: init,
    createRoom: createRoom,
    joinRoom: joinRoom,
    leaveRoom: leaveRoom,
    onRoomListChanged: onRoomListChanged,
    offRoomListChanged: offRoomListChanged,
    isManualMode: isManualMode
  };
})();

if (typeof module !== 'undefined' && module.exports) {
  module.exports = ChessLobby;
}
