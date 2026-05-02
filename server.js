const express = require("express");
const fs = require("fs");
const http = require("http");
const path = require("path");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server);
const PORT = process.env.PORT || 3000;
const PUBLIC_URL = process.env.PUBLIC_URL || "http://198.211.104.191:3000";
const PROJECT_ROOT = __dirname;
const PUBLIC_DIR = path.join(PROJECT_ROOT, "public");
const THEME_DIR = path.join(PUBLIC_DIR, "themes");
const DEFAULT_THEME_ID = "classic";
const STATIC_FILES = {
  "/script.js": "script.js",
  "/style.css": "style.css",
  "/data.js": "data.js",
  "/images/bunker-bg.jpg": "public/images/bunker-bg.jpg",
  "/images/fanta.jpg": "public/images/fanta.jpg"
};
const rooms = new Map();
const lobbies = new Map(); // New lobby system

// ============================================
// LOBBY SYSTEM
// ============================================

/**
 * Lobby structure:
 * {
 *   id: string
 *   roomCode: string (reference to room)
 *   players: Player[]
 *   state: "WAITING_LOBBY" | "IN_GAME" | "FINISHED"
 *   hostId: string (player.id, not socketId)
 *   turnIndex: number
 *   currentTurnStartedAt: number (timestamp)
 * }
 */

/**
 * Player structure in lobby:
 * {
 *   id: string (persistent UUID)
 *   socketId: string (changes on reconnect)
 *   name: string
 *   isHost: boolean
 *   isConnected: boolean
 *   hasRevealedThisTurn: boolean
 * }
 */

function createLobbyId() {
  return `lobby_${generateRoomCode().toLowerCase()}`;
}

function createPlayerId() {
  return `player_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
}

function createOrGetLobby(roomCode) {
  let lobby = lobbies.get(roomCode);
  
  if (!lobby) {
    lobby = {
      id: createLobbyId(),
      roomCode: roomCode,
      players: [],
      state: "WAITING_LOBBY",
      hostId: null,
      currentTurnIndex: 0,
      isGameStarted: false,
      currentTurnStartedAt: null
    };
    lobbies.set(roomCode, lobby);
  }
  
  return lobby;
}

function getLobbyByRoomCode(roomCode) {
  return lobbies.get(normalizeRoomCode(roomCode));
}

function getLobbyPlayer(lobby, playerId) {
  return lobby?.players?.find(p => p.id === playerId);
}

function getLobbyPlayerBySocketId(lobby, socketId) {
  return lobby?.players?.find(p => p.socketId === socketId);
}

function getCurrentPlayer(lobby) {
  if (!lobby?.isGameStarted || lobby.players.length === 0) {
    return null;
  }
  return lobby.players[lobby.currentTurnIndex % lobby.players.length];
}

function serializeLobby(lobby) {
  const currentPlayer = getCurrentPlayer(lobby);
  
  return {
    id: lobby.id,
    roomCode: lobby.roomCode,
    state: lobby.state,
    hostId: lobby.hostId,
    currentTurnIndex: lobby.currentTurnIndex,
    isGameStarted: Boolean(lobby.isGameStarted),
    currentTurnStartedAt: lobby.currentTurnStartedAt,
    currentPlayerId: currentPlayer?.id || null,
    players: lobby.players.map(p => ({
      id: p.id,
      name: p.name,
      isHost: p.isHost,
      isConnected: p.isConnected,
      hasRevealedThisTurn: p.hasRevealedThisTurn
    }))
  };
}

function broadcastLobby(roomCode) {
  const lobby = getLobbyByRoomCode(roomCode);
  const room = rooms.get(normalizeRoomCode(roomCode));
  
  if (!lobby || !room) {
    return;
  }

  const payload = serializeLobby(lobby);
  
  room.players.forEach((roomPlayer) => {
    io.to(roomPlayer.socketId).emit("lobby-state-update", {
      lobby: payload,
      publicUrl: PUBLIC_URL
    });
  });
}

function advanceLobbyTurn(lobby) {
  if (!lobby || !Array.isArray(lobby.players) || lobby.players.length === 0) return;

  // ensure game started
  if (!lobby.isGameStarted) {
    lobby.isGameStarted = true;
  }

  const prevIndex = Number(lobby.currentTurnIndex) || 0;
  const prevPlayer = lobby.players[prevIndex];
  if (prevPlayer) {
    // reset their reveal flag at end of their turn
    prevPlayer.hasRevealedThisTurn = false;
  }

  // advance
  const nextIndex = (prevIndex + 1) % lobby.players.length;
  lobby.currentTurnIndex = nextIndex;
  lobby.currentTurnStartedAt = Date.now();

  // broadcast nextTurn event to room
  try {
    const payload = { nextPlayerId: lobby.players[nextIndex]?.id || null, nextPlayerIndex: nextIndex };
    io.to(lobby.roomCode).emit("nextTurn", payload);
    io.to(lobby.roomCode).emit("updateTurn", payload);
    io.to(lobby.roomCode).emit("turnChanged", payload);
  } catch (e) {
    // ignore
  }

  return lobby.currentTurnIndex;
}

function sendProjectFile(res, filePath) {
  res.sendFile(filePath, (error) => {
    if (!error || res.headersSent) {
      return;
    }

    res.status(error.statusCode || error.status || 500).send("File not found");
  });
}

app.get(["/", "/index.html"], (req, res) => {
  sendProjectFile(res, path.join(PROJECT_ROOT, "index.html"));
});

Object.entries(STATIC_FILES).forEach(([route, fileName]) => {
  app.get(route, (req, res) => {
    sendProjectFile(res, path.join(PROJECT_ROOT, fileName));
  });
});

app.use("/core", express.static(path.join(PUBLIC_DIR, "core")));
app.use("/images", express.static(path.join(PUBLIC_DIR, "images")));
app.use("/themes", express.static(THEME_DIR));

function getSafeThemeId(theme) {
  const themeId = String(theme || "").trim().toLowerCase().replace(/[^a-z0-9_-]/g, "");
  const requestedPath = path.join(THEME_DIR, themeId, "cards.txt");

  if (themeId && fs.existsSync(requestedPath)) {
    return themeId;
  }

  return DEFAULT_THEME_ID;
}

app.get("/api/cards/:theme", (req, res) => {
  const themeId = getSafeThemeId(req.params.theme);
  const filePath = path.join(THEME_DIR, themeId, "cards.txt");

  res.setHeader("Cache-Control", "no-store");
  res.setHeader("Content-Type", "text/plain; charset=utf-8");
  res.setHeader("X-Theme-Id", themeId);
  sendProjectFile(res, filePath);
});

app.get("/healthz", (req, res) => {
  res.status(200).send("ok");
});

app.use((error, req, res, next) => {
  if (res.headersSent) {
    next(error);
    return;
  }

  res.status(error.statusCode || error.status || 500).send("Server error");
});

app.use((req, res) => {
  res.status(404).send("Not found");
});

io.on("connection", (socket) => {
  // ============================================
  // LOBBY EVENTS
  // ============================================
  
  socket.on("join-lobby", ({ roomCode, playerName } = {}, reply) => {
    const normalizedCode = normalizeRoomCode(roomCode);
    const room = rooms.get(normalizedCode);
    
    if (!room) {
      sendReply(reply, { ok: false, error: "Комната не найдена", playerId: null });
      return;
    }
    
    // Create lobby if it doesn't exist
    let lobby = getLobbyByRoomCode(normalizedCode);
    if (!lobby) {
      lobby = createOrGetLobby(normalizedCode);
    }
    
    const cleanedName = cleanName(playerName) || `Игрок ${lobby.players.length + 1}`;
    
    // Create new player for lobby
    const playerId = createPlayerId();
    const newPlayer = {
      id: playerId,
      socketId: socket.id,
      name: cleanedName,
      isHost: lobby.players.length === 0, // First player is host
      isConnected: true,
      hasRevealedThisTurn: false
    };
    
    if (newPlayer.isHost) {
      lobby.hostId = playerId;
    }
    
    lobby.players.push(newPlayer);
    
    // Also add to room for socket.io routing
    socket.join(normalizedCode);
    
    console.log(`Player ${cleanedName} (${playerId}) joined lobby ${normalizedCode}`);
    
    sendReply(reply, { ok: true, playerId, roomCode: normalizedCode });
    broadcastLobby(normalizedCode);
    broadcastRoom(normalizedCode);
  });
  
  socket.on("reconnect-lobby", ({ roomCode, playerId } = {}, reply) => {
    const normalizedCode = normalizeRoomCode(roomCode);
    const room = rooms.get(normalizedCode);
    const lobby = getLobbyByRoomCode(normalizedCode);
    
    if (!room || !lobby) {
      sendReply(reply, { ok: false, error: "Комната или лобби не найдено" });
      return;
    }
    
    const player = getLobbyPlayer(lobby, playerId);
    
    if (!player) {
      sendReply(reply, { ok: false, error: "Игрок не найден" });
      return;
    }
    
    // Update player connection
    player.socketId = socket.id;
    player.isConnected = true;
    
    // Join room socket
    socket.join(normalizedCode);
    
    console.log(`Player ${player.name} (${playerId}) reconnected to lobby ${normalizedCode}`);
    
    sendReply(reply, { ok: true, playerId });
    broadcastLobby(normalizedCode);
    broadcastRoom(normalizedCode);
  });
  
  socket.on("start-game", ({ roomCode } = {}, reply) => {
    const normalizedCode = normalizeRoomCode(roomCode);
    const lobby = getLobbyByRoomCode(normalizedCode);
    
    if (!lobby) {
      sendReply(reply, { ok: false, error: "Лобби не найдено" });
      return;
    }
    
    const player = getLobbyPlayerBySocketId(lobby, socket.id);
    
    if (!player || !player.isHost) {
      sendReply(reply, { ok: false, error: "Только хост может начать игру" });
      return;
    }
    
    if (lobby.players.length < 2) {
      sendReply(reply, { ok: false, error: "Нужно минимум 2 игрока" });
      return;
    }
    
    // Start game
    lobby.state = "IN_GAME";
    lobby.isGameStarted = true;
    lobby.currentTurnIndex = 0;
    lobby.currentTurnStartedAt = Date.now();

    // Reset turn flags
    lobby.players.forEach(p => {
      p.hasRevealedThisTurn = false;
    });
    
    console.log(`Game started in lobby ${normalizedCode}`);
    
    sendReply(reply, { ok: true });
    broadcastLobby(normalizedCode);
    // notify nextTurn
    const next = getCurrentPlayer(lobby);
    io.to(normalizedCode).emit("nextTurn", { nextPlayerId: next?.id || null, nextPlayerIndex: lobby.currentTurnIndex });
  });
  
  socket.on("kick-player", ({ roomCode, playerId } = {}, reply) => {
    const normalizedCode = normalizeRoomCode(roomCode);
    const lobby = getLobbyByRoomCode(normalizedCode);
    
    if (!lobby) {
      sendReply(reply, { ok: false, error: "Лобби не найдено" });
      return;
    }
    
    const hostPlayer = getLobbyPlayerBySocketId(lobby, socket.id);
    
    if (!hostPlayer || !hostPlayer.isHost) {
      sendReply(reply, { ok: false, error: "Только хост может исключать игроков" });
      return;
    }
    
    const playerToKick = getLobbyPlayer(lobby, playerId);
    
    if (!playerToKick) {
      sendReply(reply, { ok: false, error: "Игрок не найден" });
      return;
    }
    
    // Remove player from lobby
    const removedIndex = lobby.players.findIndex(p => p.id === playerId);
    const removedPlayer = removedIndex !== -1 ? lobby.players[removedIndex] : null;
    lobby.players = lobby.players.filter(p => p.id !== playerId);

    // Also remove from room.players if present
    const roomObj = rooms.get(normalizeRoomCode(normalizedCode));
    if (roomObj) {
      roomObj.players = roomObj.players.filter(rp => rp.socketId !== playerToKick.socketId);
    }

    // If removed player was current, advance turn
    if (lobby.isGameStarted && removedPlayer) {
      // if removedIndex is the current index, advance; otherwise adjust index
      if (removedIndex === lobby.currentTurnIndex) {
        advanceLobbyTurn(lobby);
      } else if (removedIndex < lobby.currentTurnIndex) {
        lobby.currentTurnIndex = Math.max(0, lobby.currentTurnIndex - 1);
      }
    }
    
    console.log(`Player ${playerToKick.name} (${playerId}) was kicked from lobby ${normalizedCode}`);
    
    sendReply(reply, { ok: true });
    broadcastLobby(normalizedCode);
  });

  // New camelCase event: kickPlayer (for client compatibility)
  socket.on("kickPlayer", ({ roomCode, playerId, targetSocketId } = {}, reply) => {
    const normalizedCode = normalizeRoomCode(roomCode);
    const lobby = getLobbyByRoomCode(normalizedCode);

    if (!lobby) {
      sendReply(reply, { ok: false, error: "Лобби не найдено" });
      return;
    }

    const hostPlayer = getLobbyPlayerBySocketId(lobby, socket.id);
    if (!hostPlayer || !hostPlayer.isHost) {
      sendReply(reply, { ok: false, error: "Только хост может исключать игроков" });
      return;
    }

    let playerToKick = null;
    if (playerId) playerToKick = getLobbyPlayer(lobby, playerId);
    if (!playerToKick && targetSocketId) playerToKick = lobby.players.find(p => p.socketId === targetSocketId);

    if (!playerToKick) {
      sendReply(reply, { ok: false, error: "Игрок не найден" });
      return;
    }

    // Attempt to disconnect the player's socket if connected
    try {
      const targetSocket = io.sockets.sockets.get(playerToKick.socketId);
      if (targetSocket) {
        try { targetSocket.emit('you_are_kicked', { roomCode: normalizedCode }); } catch (e) {}
        // give client a moment to show message
        setTimeout(() => { try { targetSocket.disconnect(true); } catch (e) {} }, 120);
      }
    } catch (err) {
      // ignore
    }

    // Remove player from lobby and room
    const removedIndex = lobby.players.findIndex(p => p.id === playerId);
    const removedPlayer = removedIndex !== -1 ? lobby.players[removedIndex] : null;
    lobby.players = lobby.players.filter(p => p.id !== playerId);
    const roomObj = rooms.get(normalizeRoomCode(normalizedCode));
    if (roomObj) {
      roomObj.players = roomObj.players.filter(rp => rp.socketId !== playerToKick.socketId);
      roomObj.gameLog.push(`${playerToKick.name} был исключён ведущим`);
    }

    if (lobby.isGameStarted && removedPlayer) {
      if (removedIndex === lobby.currentTurnIndex) {
        advanceLobbyTurn(lobby);
      } else if (removedIndex < lobby.currentTurnIndex) {
        lobby.currentTurnIndex = Math.max(0, lobby.currentTurnIndex - 1);
      }
    }

    sendReply(reply, { ok: true });
    broadcastLobby(normalizedCode);
    broadcastRoom(normalizedCode);
  });

  // ability-applied notification from host -> broadcast to room
  socket.on("ability-applied", ({ roomCode, actorNumber, actorName, abilityText, targetNumber, traitKey, newValue } = {}) => {
    const normalizedCode = normalizeRoomCode(roomCode);
    const room = rooms.get(normalizedCode);
    if (!room) return;

    const actor = actorName || `Игрок ${actorNumber}`;
    const target = targetNumber ? `Игрок ${targetNumber}` : 'неизвестная цель';
    const entry = `${actor} -> ${abilityText} -> ${target}. Результат: ${traitKey || 'характеристика'} изменена на ${newValue}`;
    room.gameLog = room.gameLog || [];
    room.gameLog.push(entry);

    // broadcast to all players a friendly event
    io.to(normalizedCode).emit('abilityApplied', { actorName, actorNumber, abilityText, targetNumber, traitKey, newValue });
    broadcastRoom(normalizedCode);
  });

  // also accept legacy abilityUsed events from client-side abilities module
  socket.on("abilityUsed", ({ roomCode, type, target, details } = {}) => {
    const normalizedCode = normalizeRoomCode(roomCode);
    const room = rooms.get(normalizedCode);
    if (!room) return;
    const actor = socket.id; // unknown actorName in legacy flow
    const entry = `Способность ${type} применена: ${details}`;
    room.gameLog = room.gameLog || [];
    room.gameLog.push(entry);
    io.to(normalizedCode).emit('abilityApplied', { actorName: actor, abilityText: type, targetNumber: target, traitKey: null, newValue: details });
    broadcastRoom(normalizedCode);
  });

  // New actionPerformed handler: client reports an action (e.g., reveal)
  socket.on('actionPerformed', ({ roomCode, action } = {}, reply) => {
    const normalizedCode = normalizeRoomCode(roomCode);
    const lobby = getLobbyByRoomCode(normalizedCode);
    const room = rooms.get(normalizedCode);

    if (!lobby || !room) {
      sendReply(reply, { ok: false, error: 'Лобби не найдено' });
      return;
    }

    if (!lobby.isGameStarted) {
      sendReply(reply, { ok: false, error: 'Игра не начата' });
      return;
    }

    const player = getLobbyPlayerBySocketId(lobby, socket.id);
    const currentPlayer = getCurrentPlayer(lobby);

    if (!player) {
      sendReply(reply, { ok: false, error: 'Игрок не найден' });
      return;
    }

    if (!currentPlayer) {
      sendReply(reply, { ok: false, error: 'Текущий игрок не определен' });
      return;
    }

    if (player.id !== currentPlayer.id) {
      sendReply(reply, { ok: false, error: 'Это не ваша очередь' });
      return;
    }

    // handle reveal action
    if (action?.type === 'reveal') {
      const playerNumber = Number(action.playerNumber);
      const traitKey = action.traitKey;
      if (!traitKey) {
        sendReply(reply, { ok: false, error: 'Не указана характеристика' });
        return;
      }

      // mark at room level (shared state)
      setTraitRevealed(room, playerNumber, traitKey);
      room.gameLog = room.gameLog || [];
      room.gameLog.push(`Игрок ${player.playerNumber || player.name} открыл ${getTraitAccusative(traitKey)} Игрока ${playerNumber}`);

      // advance turn
      advanceLobbyTurn(lobby);

      // broadcast updates
      broadcastRoom(normalizedCode);
      broadcastLobby(normalizedCode);
      io.to(normalizedCode).emit('turnChanged', { nextPlayerIndex: lobby.currentTurnIndex, nextPlayerId: lobby.players[lobby.currentTurnIndex]?.id || null });

      sendReply(reply, { ok: true });
      return;
    }

    sendReply(reply, { ok: false, error: 'Неизвестное действие' });
  });
  
  socket.on("reveal-characteristic", ({ roomCode, characteristicKey } = {}, reply) => {
    const normalizedCode = normalizeRoomCode(roomCode);
    const lobby = getLobbyByRoomCode(normalizedCode);
    
    if (!lobby) {
      sendReply(reply, { ok: false, error: "Лобби не найдено" });
      return;
    }
    
    if (!lobby.isGameStarted) {
      sendReply(reply, { ok: false, error: "Игра не начата" });
      return;
    }
    
    const player = getLobbyPlayerBySocketId(lobby, socket.id);
    const currentPlayer = getCurrentPlayer(lobby);
    
    if (!player) {
      sendReply(reply, { ok: false, error: "Игрок не найден" });
      return;
    }
    
    if (!currentPlayer) {
      sendReply(reply, { ok: false, error: "Текущий игрок не определен" });
      return;
    }
    
    // Only current player can reveal
    if (player.id !== currentPlayer.id) {
      sendReply(reply, { ok: false, error: "Это не ваша очередь" });
      return;
    }
    
    // Check if already revealed this turn
    if (player.hasRevealedThisTurn) {
      sendReply(reply, { ok: false, error: "Вы уже открыли характеристику в этом ходе" });
      return;
    }
    
    // Mark as revealed (one reveal per turn)
    player.hasRevealedThisTurn = true;

    console.log(`Player ${player.name} revealed characteristic: ${characteristicKey}`);

    // After revealing, automatically end the turn and advance
    advanceLobbyTurn(lobby);

    sendReply(reply, { ok: true });
    broadcastLobby(normalizedCode);
  });
  
  socket.on("end-turn", ({ roomCode } = {}, reply) => {
    const normalizedCode = normalizeRoomCode(roomCode);
    const lobby = getLobbyByRoomCode(normalizedCode);
    
    if (!lobby) {
      sendReply(reply, { ok: false, error: "Лобби не найдено" });
      return;
    }
    
    if (!lobby.isGameStarted) {
      sendReply(reply, { ok: false, error: "Игра не начата" });
      return;
    }
    
    const player = getLobbyPlayerBySocketId(lobby, socket.id);
    const currentPlayer = getCurrentPlayer(lobby);
    
    if (!player) {
      sendReply(reply, { ok: false, error: "Игрок не найден" });
      return;
    }
    
    if (!currentPlayer) {
      sendReply(reply, { ok: false, error: "Текущий игрок не определен" });
      return;
    }
    
    // Only current player or host can end turn
    if (player.id !== currentPlayer.id && !player.isHost) {
      sendReply(reply, { ok: false, error: "Это не ваша очередь" });
      return;
    }
    
    // Use shared advance logic
    advanceLobbyTurn(lobby);

    console.log(`Turn ended in lobby ${normalizedCode}. Next player: ${lobby.players[lobby.currentTurnIndex]?.name}`);

    sendReply(reply, { ok: true });
    broadcastLobby(normalizedCode);
  });
  
  // ============================================
  // LEGACY ROOM EVENTS
  // ============================================
  
  socket.on("createRoom", ({ playerName } = {}, reply) => {
    console.log("Received createRoom");
    createRoomForSocket(socket, playerName, reply);
  });

  socket.on("create-room", ({ name } = {}, reply) => {
    console.log("Received createRoom");
    createRoomForSocket(socket, name, reply);
  });

  socket.on("join-room", ({ roomCode, name } = {}, reply) => {
    const normalizedCode = normalizeRoomCode(roomCode);
    const room = rooms.get(normalizedCode);

    if (!room) {
      sendReply(reply, { ok: false, error: "Комната не найдена" });
      return;
    }

    const existingPlayer = room.players.find((player) => player.socketId === socket.id);
    if (existingPlayer) {
      existingPlayer.name = cleanName(name) || existingPlayer.name;
      socket.join(normalizedCode);
      sendReply(reply, { ok: true, roomCode: normalizedCode });
      broadcastRoom(normalizedCode);
      broadcastLobby(normalizedCode);
      return;
    }

    const playerName = cleanName(name) || `Игрок ${room.players.length + 1}`;
    room.players.push({
      socketId: socket.id,
      name: playerName,
      playerNumber: assignPlayerNumber(room),
      isHost: false,
      connected: true
    });
    room.gameLog.push(`${playerName} присоединился к комнате`);
    
    // Also add to lobby
    const lobby = createOrGetLobby(normalizedCode);
    const playerId = createPlayerId();
    lobby.players.push({
      id: playerId,
      socketId: socket.id,
      name: playerName,
      isHost: false,
      isConnected: true,
      hasRevealedThisTurn: false
    });
    
    socket.join(normalizedCode);
    sendReply(reply, { ok: true, roomCode: normalizedCode });
    broadcastRoom(normalizedCode);
    broadcastLobby(normalizedCode);
  });

  socket.on("host-generate-pack", ({ roomCode, pack } = {}) => {
    const room = getHostRoom(socket, roomCode);
    if (!room || !pack) {
      return;
    }

    room.generatedPack = pack;
    room.revealedTraits = {};
    room.excludedPlayers = [];
    room.usedAbilities = {};
    room.protectedPlayers = [];
    room.turnState = createInitialRoomTurnState(pack, []);
    room.lastRevealedTrait = null;
    room.lastUsedAbility = null;
    room.lastModifiedByAbility = null;
    clearVotingTimer(room);
    room.voting = null;
    room.gameLog = ["Ведущий сгенерировал новый пак"];
    reconcilePlayerSlots(room);
    broadcastRoom(room.roomCode);
  });

  socket.on("reveal-trait", ({ roomCode, playerNumber, traitKey } = {}) => {
    const room = rooms.get(normalizeRoomCode(roomCode));
    const player = getRoomPlayer(room, socket.id);
    const number = Number(playerNumber);

    if (!room || !player || !traitKey) {
      return;
    }

    const state = normalizeRoomTurnState(room);

    if (Number(player.playerNumber) !== number || Number(state.currentPlayerNumber) !== number || state.hasRevealed) {
      return;
    }

    setTraitRevealed(room, number, traitKey);
    room.lastRevealedTrait = {
      playerNumber: number,
      traitKey,
      turnNumber: Number(room.turnState?.turnNumber) || 0,
      timestamp: Date.now()
    };
    markRoomTurnReveal(room, number);
    room.gameLog.push(`Открыта характеристика Игрока ${Number(playerNumber)}: ${getTraitAccusative(traitKey)}`);
    broadcastRoom(room.roomCode);
  });

  socket.on("reveal-all", ({ roomCode, playerNumber, traitKeys } = {}) => {
    const room = getHostRoom(socket, roomCode);
    if (!room) {
      return;
    }

    (Array.isArray(traitKeys) ? traitKeys : []).forEach((traitKey) => {
      setTraitRevealed(room, Number(playerNumber), traitKey);
    });
    room.gameLog.push(`Ведущий открыл все характеристики Игрока ${Number(playerNumber)}`);
    broadcastRoom(room.roomCode);
  });

  socket.on("exclude-player", ({ roomCode, playerNumber, excluded } = {}) => {
    const room = getHostRoom(socket, roomCode);
    if (!room) {
      return;
    }

    const number = Number(playerNumber);
    const wasCurrentTurn = Number(room.turnState?.currentPlayerNumber) === number;
    const excludedSet = new Set(room.excludedPlayers);
    const protectedSet = new Set(room.protectedPlayers || []);
    if (excluded) {
      if (protectedSet.has(number)) {
        protectedSet.delete(number);
        room.protectedPlayers = Array.from(protectedSet);
        room.gameLog.push(`Игрок ${number} избежал исключения`);
        broadcastRoom(room.roomCode);
        return;
      }

      excludedSet.add(number);
      room.gameLog.push(`Ведущий исключил Игрока ${number}`);
    } else {
      excludedSet.delete(number);
      room.gameLog.push(`Ведущий вернул Игрока ${number}`);
    }
    room.excludedPlayers = Array.from(excludedSet);
    if (wasCurrentTurn) {
      room.turnState = {
        currentPlayerNumber: getNextRoomActivePlayerAfter(room, number),
        hasRevealed: false,
        hasUsedAbility: false,
        turnNumber: Math.max(1, Number(room.turnState?.turnNumber) || 1) + 1
      };
      if (room.turnState.currentPlayerNumber) {
        room.gameLog.push(`Ход перешел к Игроку ${room.turnState.currentPlayerNumber}`);
      }
      advanceRoomTurnIfReady(room);
    } else {
      normalizeRoomTurnState(room);
      advanceRoomTurnIfReady(room);
    }
    broadcastRoom(room.roomCode);
  });

  socket.on("host-sync-state", ({ roomCode, state } = {}) => {
    const room = getHostRoom(socket, roomCode);
    if (!room || !state) {
      return;
    }

    applySharedState(room, state);
    broadcastRoom(room.roomCode);
  });

  socket.on("voting-start", ({ roomCode } = {}, reply) => {
    const room = getHostRoom(socket, roomCode);
    if (!room) {
      sendReply(reply, { ok: false, error: "Только ведущий может начать голосование" });
      return;
    }

    if (room.voting?.active) {
      sendReply(reply, { ok: false, error: "Голосование уже активно" });
      return;
    }

    const alivePlayers = getAliveVotingPlayers(room);
    if (alivePlayers.length < 2) {
      sendReply(reply, { ok: false, error: "Для голосования нужно минимум два живых игрока" });
      return;
    }

    clearVotingTimer(room);
    startVotingRound(room, alivePlayers, {
      id: createRequestId(),
      round: 1,
      logStart: true
    });
    sendReply(reply, { ok: true });
    broadcastRoom(room.roomCode);
  });

  socket.on("voting-submit", ({ roomCode, candidate } = {}, reply) => {
    const room = rooms.get(normalizeRoomCode(roomCode));
    const player = getRoomPlayer(room, socket.id);
    const candidateNumber = Number(candidate);

    if (!room || !player || !room.voting?.active) {
      sendReply(reply, { ok: false, error: "Голосование не активно" });
      return;
    }

    if (!isActiveRoomParticipant(room, player)) {
      sendReply(reply, { ok: false, error: "Вы не участвуете в голосовании" });
      return;
    }

    if (!room.voting.candidates.includes(candidateNumber)) {
      sendReply(reply, { ok: false, error: "Кандидат недоступен" });
      return;
    }

    const voterNumber = Number(player.playerNumber);
    const currentAliveNumbers = new Set(getAliveVotingPlayers(room));
    if (!currentAliveNumbers.has(candidateNumber)) {
      sendReply(reply, { ok: false, error: "Кандидат недоступен" });
      return;
    }

    if (candidateNumber === voterNumber) {
      sendReply(reply, { ok: false, error: "Нельзя голосовать за себя" });
      return;
    }

    const votesByPlayerId = room.voting.votesByPlayerId || room.voting.votes || {};
    if (votesByPlayerId[voterNumber]) {
      sendReply(reply, { ok: false, error: "Вы уже проголосовали" });
      return;
    }

    room.voting.votesByPlayerId = room.voting.votesByPlayerId || {};
    room.voting.votes[voterNumber] = candidateNumber;
    room.voting.votesByPlayerId[String(voterNumber)] = candidateNumber;
    room.gameLog.push(`Игрок ${voterNumber} проголосовал`);
    sendReply(reply, { ok: true });

    if (allActiveParticipantsVoted(room)) {
      resolveVotingRound(room.roomCode, "all-voted");
      return;
    }

    broadcastRoom(room.roomCode);
  });

  socket.on("voting-skip", ({ roomCode } = {}, reply) => {
    const room = getHostRoom(socket, roomCode);
    if (!room) {
      sendReply(reply, { ok: false, error: "Только ведущий может завершить голосование" });
      return;
    }

    if (!room.voting?.active) {
      sendReply(reply, { ok: false, error: "Голосование не активно" });
      return;
    }

    resolveVotingRound(room.roomCode, "manual");
    sendReply(reply, { ok: true });
  });

  socket.on("ability-apply", ({ roomCode, context, state } = {}, reply) => {
    const room = rooms.get(normalizeRoomCode(roomCode));
    const player = getRoomPlayer(room, socket.id);
    const actorNumber = Number(context?.actorNumber);
    const abilityIndex = Number(context?.abilityIndex);

    if (!room || !player || actorNumber !== Number(player.playerNumber)) {
      sendReply(reply, { ok: false, error: "Можно использовать только свои способности" });
      return;
    }

    const abilityKey = `${actorNumber}:${abilityIndex}`;
    if (room.usedAbilities?.[abilityKey]) {
      sendReply(reply, { ok: false, error: "Эта способность уже использована" });
      return;
    }

    const turn = normalizeRoomTurnState(room);
    if (Number(turn.currentPlayerNumber) !== actorNumber || turn.hasUsedAbility) {
      sendReply(reply, { ok: false, error: "Сейчас не ход этого игрока или способность уже использована в этом ходу" });
      return;
    }

    if (!state || typeof state !== "object") {
      sendReply(reply, { ok: false, error: "Нет состояния способности" });
      return;
    }

    const submittedLog = Array.isArray(state.gameLog) ? state.gameLog : null;
    const stateWithoutLog = { ...state };
    delete stateWithoutLog.gameLog;

    applySharedState(room, stateWithoutLog);
    room.usedAbilities = room.usedAbilities || {};
    room.usedAbilities[abilityKey] = true;

    if (player.isHost && submittedLog) {
      room.gameLog = submittedLog.slice(-80);
    } else if (submittedLog?.length) {
      room.gameLog = [...(room.gameLog || []), ...submittedLog].slice(-80);
    } else {
      room.gameLog.push(`Игрок ${actorNumber} использовал способность`);
    }
    sendReply(reply, { ok: true });
    broadcastRoom(room.roomCode);
  });

  socket.on("disconnect", () => {
    // Clean up room state
    rooms.forEach((room) => {
      const player = room.players.find((candidate) => candidate.socketId === socket.id);
      if (!player) {
        return;
      }

      player.connected = false;
      if (room.hostId === socket.id) {
        room.gameLog.push("Ведущий отключился");
        // If the disconnected player was the current player, advance the turn
        const normalizedCode = normalizeRoomCode(lobby.roomCode);
        if (lobby.isGameStarted && lobby.players.length > 0) {
          const current = lobby.players[lobby.currentTurnIndex];
          if (current && current.socketId === socket.id) {
            advanceLobbyTurn(lobby);
          }
        }

        // Broadcast update
        const room = rooms.get(normalizeRoomCode(lobby.roomCode));
        if (room) {
          broadcastLobby(normalizedCode);
        }
      }
      broadcastRoom(room.roomCode);
    });
    
    // Clean up lobby state
    lobbies.forEach((lobby) => {
      const player = lobby.players.find((candidate) => candidate.socketId === socket.id);
      if (!player) {
        return;
      }
      
      player.isConnected = false;
      console.log(`Player ${player.name} (${player.id}) disconnected from lobby ${lobby.roomCode}`);
      
      // Broadcast update
      const normalizedCode = normalizeRoomCode(lobby.roomCode);
      const room = rooms.get(normalizedCode);
      if (room) {
        broadcastLobby(normalizedCode);
      }
    });
  });
});

function createRoomForSocket(socket, rawPlayerName, reply) {
  const roomCode = generateRoomCode();
  const playerName = cleanName(rawPlayerName) || "Ведущий";
  const room = createRoom(roomCode, socket.id, playerName);
  rooms.set(roomCode, room);
  
  // Create associated lobby
  const lobby = createOrGetLobby(roomCode);
  const playerId = createPlayerId();
  lobby.players.push({
    id: playerId,
    socketId: socket.id,
    name: playerName,
    isHost: true,
    isConnected: true,
    hasRevealedThisTurn: false
  });
  lobby.hostId = playerId;
  
  socket.join(roomCode);

  console.log("Room created:", roomCode);

  sendReply(reply, { ok: true, roomCode });
  socket.emit("roomCreated", { roomCode });
  broadcastRoom(roomCode);
  broadcastLobby(roomCode);
}

function createRoom(roomCode, hostId, hostName) {
  return {
    roomCode,
    hostId,
    players: [{ socketId: hostId, name: hostName, playerNumber: 1, isHost: true, connected: true }],
    generatedPack: null,
    revealedTraits: {},
    excludedPlayers: [],
    usedAbilities: {},
    protectedPlayers: [],
    turnState: createInitialRoomTurnState(null, []),
    lastRevealedTrait: null,
    lastUsedAbility: null,
    lastModifiedByAbility: null,
    voting: null,
    votingTimer: null,
    gameLog: ["Комната создана"]
  };
}

function createInitialRoomTurnState(pack, excludedPlayers = []) {
  const excluded = new Set((excludedPlayers || []).map(Number));
  const firstPlayer = (pack?.players || [])
    .map((player) => Number(player.number))
    .find((number) => Number.isFinite(number) && !excluded.has(number)) || null;

  return {
    currentPlayerNumber: firstPlayer,
    hasRevealed: false,
    hasUsedAbility: false,
    turnNumber: firstPlayer ? 1 : 0
  };
}

function getRoomActivePlayerNumbers(room) {
  const excluded = new Set((room?.excludedPlayers || []).map(Number));
  return (room?.generatedPack?.players || [])
    .map((player) => Number(player.number))
    .filter((number) => Number.isFinite(number) && !excluded.has(number));
}

function getNextRoomActivePlayerAfter(room, playerNumber) {
  const orderedPlayers = (room?.generatedPack?.players || []).map((player) => Number(player.number)).filter(Number.isFinite);
  const activePlayers = getRoomActivePlayerNumbers(room);

  if (activePlayers.length === 0) {
    return null;
  }

  const startIndex = Math.max(0, orderedPlayers.indexOf(Number(playerNumber)));
  for (let offset = 1; offset <= orderedPlayers.length; offset += 1) {
    const candidate = orderedPlayers[(startIndex + offset) % orderedPlayers.length];
    if (activePlayers.includes(candidate)) {
      return candidate;
    }
  }

  return activePlayers[0];
}

function normalizeRoomTurnState(room) {
  const activePlayers = getRoomActivePlayerNumbers(room);

  if (activePlayers.length === 0) {
    room.turnState = createInitialRoomTurnState(null, []);
    return room.turnState;
  }

  const requestedPlayer = Number(room.turnState?.currentPlayerNumber);
  room.turnState = {
    currentPlayerNumber: activePlayers.includes(requestedPlayer) ? requestedPlayer : activePlayers[0],
    hasRevealed: Boolean(room.turnState?.hasRevealed),
    hasUsedAbility: Boolean(room.turnState?.hasUsedAbility),
    turnNumber: Math.max(1, Number(room.turnState?.turnNumber) || 1)
  };

  return room.turnState;
}

function getRoomPlayerCharacter(room, playerNumber) {
  return (room?.generatedPack?.players || []).find((player) => Number(player.number) === Number(playerNumber)) || null;
}

function hasRoomAvailableReveal(room, playerNumber) {
  const traitKeys = [
    "gender",
    "bodyType",
    "trait",
    "age",
    "profession",
    "health",
    "hobby",
    "phobia",
    "largeInventory",
    "backpack",
    "additionalInfo",
    "specialAbility"
  ];

  return traitKeys.some((traitKey) => !room.revealedTraits?.[playerNumber]?.[traitKey]);
}

function hasRoomAvailableAbility(room, playerNumber) {
  const player = getRoomPlayerCharacter(room, playerNumber);
  if (!player) {
    return false;
  }

  return [player.specialAbility, player.specialAbility2].some((ability, index) => {
    const text = String(ability || "").trim();
    return text && !room.usedAbilities?.[`${playerNumber}:${index}`];
  });
}

function shouldAdvanceRoomTurn(room) {
  const state = normalizeRoomTurnState(room);
  const playerNumber = state.currentPlayerNumber;

  if (!playerNumber) {
    return false;
  }

  return (state.hasRevealed || !hasRoomAvailableReveal(room, playerNumber))
    && (state.hasUsedAbility || !hasRoomAvailableAbility(room, playerNumber));
}

function advanceRoomTurnIfReady(room, force = false) {
  if (!force && !shouldAdvanceRoomTurn(room)) {
    return false;
  }

  const activePlayers = getRoomActivePlayerNumbers(room);
  if (activePlayers.length === 0) {
    room.turnState = createInitialRoomTurnState(null, []);
    return false;
  }

  const turnPlayers = activePlayers.filter((number) => hasRoomAvailableReveal(room, number) || hasRoomAvailableAbility(room, number));
  const queue = turnPlayers.length > 0 ? turnPlayers : activePlayers;
  const previousPlayer = Number(room.turnState?.currentPlayerNumber);
  const currentIndex = queue.indexOf(previousPlayer);
  const nextIndex = queue.length === 1 ? 0 : (Math.max(0, currentIndex) + 1) % queue.length;
  const nextPlayer = queue[nextIndex];

  room.turnState = {
    currentPlayerNumber: nextPlayer,
    hasRevealed: false,
    hasUsedAbility: false,
    turnNumber: Math.max(1, Number(room.turnState?.turnNumber) || 1) + 1
  };

  if (previousPlayer !== nextPlayer) {
    room.gameLog.push(`Ход перешел к Игроку ${nextPlayer}`);
  }

  return true;
}

function markRoomTurnReveal(room, playerNumber) {
  const state = normalizeRoomTurnState(room);
  if (Number(state.currentPlayerNumber) === Number(playerNumber)) {
    state.hasRevealed = true;
  }
  advanceRoomTurnIfReady(room);
}

function createRoomCode() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";

  do {
    code = Array.from({ length: 6 }, () => alphabet[Math.floor(Math.random() * alphabet.length)]).join("");
  } while (rooms.has(code));

  return code;
}

function generateRoomCode() {
  return createRoomCode();
}

function createRequestId() {
  return `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`.toUpperCase();
}

function normalizeRoomCode(roomCode) {
  return String(roomCode || "").trim().toUpperCase();
}

function cleanName(name) {
  return String(name || "").trim().slice(0, 32);
}

function getHostRoom(socket, roomCode) {
  const room = rooms.get(normalizeRoomCode(roomCode));

  if (!room || room.hostId !== socket.id) {
    return null;
  }

  return room;
}

function getRoomPlayer(room, socketId) {
  return room?.players?.find((player) => player.socketId === socketId) || null;
}

function canReveal(player, playerNumber) {
  return player.isHost || Number(player.playerNumber) === Number(playerNumber);
}

function setTraitRevealed(room, playerNumber, traitKey) {
  if (!traitKey) {
    return;
  }

  if (!room.revealedTraits[playerNumber]) {
    room.revealedTraits[playerNumber] = {};
  }

  room.revealedTraits[playerNumber][traitKey] = true;
}

function getTraitAccusative(traitKey) {
  const labels = {
    gender: "пол",
    bodyType: "тип тела",
    trait: "черту",
    age: "возраст",
    profession: "профессию",
    health: "здоровье",
    hobby: "хобби",
    phobia: "фобию",
    largeInventory: "крупный инвентарь",
    backpack: "рюкзак",
    additionalInfo: "информацию",
    specialAbility: "способность"
  };

  return labels[traitKey] || "характеристику";
}

function getGeneratedPlayerNumbers(room) {
  return new Set((room.generatedPack?.players || []).map((player) => Number(player.number)).filter(Boolean));
}

function getActiveRoomParticipants(room) {
  const generatedNumbers = getGeneratedPlayerNumbers(room);
  const excluded = new Set((room.excludedPlayers || []).map(Number));

  return (room.players || [])
    .filter((player) => player.connected)
    .filter((player) => Number(player.playerNumber))
    .filter((player) => !generatedNumbers.size || generatedNumbers.has(Number(player.playerNumber)))
    .filter((player) => !excluded.has(Number(player.playerNumber)));
}

function getAliveVotingPlayers(room) {
  return getActiveRoomParticipants(room).map((player) => Number(player.playerNumber));
}

function isActiveRoomParticipant(room, player) {
  const activeNumbers = new Set(
    (room.voting?.alivePlayers?.length ? room.voting.alivePlayers : getAliveVotingPlayers(room))
      .map(Number)
  );

  return getActiveRoomParticipants(room)
    .filter((candidate) => activeNumbers.has(Number(candidate.playerNumber)))
    .some((candidate) => candidate.socketId === player.socketId);
}

function normalizeVotingCandidates(room, candidates) {
  const activeNumbers = new Set(getActiveRoomParticipants(room).map((player) => Number(player.playerNumber)));
  const unique = Array.from(new Set((Array.isArray(candidates) ? candidates : []).map(Number).filter(Boolean)));
  return unique.filter((number) => activeNumbers.has(number));
}

function getRoomPlayerLabel(room, playerNumber) {
  const player = (room.players || []).find((candidate) => Number(candidate.playerNumber) === Number(playerNumber));
  return player?.name || `Игрок ${playerNumber}`;
}

function clearVotingTimer(room) {
  if (room?.votingTimer) {
    clearTimeout(room.votingTimer);
    room.votingTimer = null;
  }
}

function startVotingRound(room, alivePlayers, options = {}) {
  const id = options.id || room.voting?.id || createRequestId();
  const round = Number(options.round) || 1;
  const now = Date.now();
  const candidates = Array.from(new Set((alivePlayers || []).map(Number).filter(Boolean)));
  const eliminatedPlayers = (room.excludedPlayers || []).map(Number).filter(Boolean);

  room.voting = {
    id,
    round,
    active: true,
    status: "active",
    candidates,
    alivePlayers: candidates,
    eliminatedPlayers,
    votes: {},
    votesByPlayerId: {},
    startedAt: now,
    endsAt: null,
    durationMs: null,
    result: null,
    message: "Ожидание голосов..."
  };

  if (options.logStart) {
    room.gameLog.push("Голосование началось");
  }

  clearVotingTimer(room);
}

function allActiveParticipantsVoted(room) {
  if (!room.voting?.active) {
    return false;
  }

  const aliveNumbers = new Set((room.voting.alivePlayers || []).map(Number));
  const participants = getActiveRoomParticipants(room)
    .filter((player) => aliveNumbers.has(Number(player.playerNumber)));
  const votes = room.voting.votesByPlayerId || room.voting.votes || {};
  return participants.length > 0 && participants.every((player) => votes[Number(player.playerNumber)]);
}

function resolveVotingRound(roomCode, reason = "timer") {
  const room = rooms.get(roomCode);
  if (!room?.voting?.active) {
    return;
  }

  clearVotingTimer(room);

  const voting = room.voting;
  const alivePlayers = (voting.alivePlayers?.length ? voting.alivePlayers : voting.candidates).map(Number);
  const neededVotes = Math.floor(alivePlayers.length / 2) + 1;
  const counts = alivePlayers.reduce((result, playerNumber) => {
    result[playerNumber] = 0;
    return result;
  }, {});

  Object.values(voting.votesByPlayerId || voting.votes || {}).forEach((candidateNumber) => {
    const number = Number(candidateNumber);
    if (counts[number] !== undefined) {
      counts[number] += 1;
    }
  });

  const maxVotes = Math.max(0, ...Object.values(counts));
  const winnerEntry = Object.entries(counts)
    .sort(([, a], [, b]) => b - a)
    .find(([, count]) => count >= neededVotes);
  const details = Object.entries(counts)
    .map(([playerNumber, count]) => `Игрок ${playerNumber}: ${count}`)
    .join("; ");

  room.gameLog.push(`Голосование завершено: ${details || "голосов нет"}`);

  if (!winnerEntry || maxVotes < neededVotes) {
    const message = "Никто не набрал 51% голосов.";
    room.gameLog.push(message);
    room.voting = {
      ...voting,
      active: false,
      status: "ended",
      result: {
        type: "no-majority",
        reason,
        counts,
        neededVotes,
        alivePlayers,
        eliminated: null,
        message
      },
      message
    };
    broadcastRoom(room.roomCode);
    return;
  }

  const eliminated = Number(winnerEntry[0]);
  if (consumeVotingProtection(room, eliminated)) {
    const message = `Игрок ${eliminated} был защищен и не был исключен`;
    room.gameLog.push(message);
    room.voting = {
      ...voting,
      active: false,
      status: "ended",
      result: {
        type: "protected",
        reason,
        counts,
        neededVotes,
        alivePlayers,
        eliminated: null,
        protectedPlayer: eliminated,
        message
      },
      message
    };
    broadcastRoom(room.roomCode);
    return;
  }

  const excluded = new Set((room.excludedPlayers || []).map(Number));
  excluded.add(eliminated);
  room.excludedPlayers = Array.from(excluded);
  room.gameLog.push(`Исключен Игрок ${eliminated}`);

  room.voting = {
    ...voting,
    active: false,
    status: "ended",
    result: {
      type: "eliminated",
      reason,
      counts,
      neededVotes,
      alivePlayers,
      eliminated,
      message: `Исключен Игрок ${eliminated}`
    },
    message: `Голосование завершено: исключен Игрок ${eliminated}`
  };
  broadcastRoom(room.roomCode);
}

function consumeVotingProtection(room, playerNumber) {
  const number = Number(playerNumber);
  const protectedSet = new Set((room.protectedPlayers || []).map(Number));
  let protectedByOneTimeState = false;

  if (protectedSet.has(number)) {
    protectedSet.delete(number);
    room.protectedPlayers = Array.from(protectedSet);
    protectedByOneTimeState = true;
  }

  const packPlayer = (room.generatedPack?.players || []).find((player) => Number(player.number) === number);
  const roomPlayer = (room.players || []).find((player) => Number(player.playerNumber) === number);

  [packPlayer, roomPlayer].filter(Boolean).forEach((player) => {
    if (player.protectedUntilNextExclusion || player.avoidExclusion || player.protectedFromExclusion) {
      protectedByOneTimeState = true;
    }

    if (player.protectedUntilNextExclusion) player.protectedUntilNextExclusion = false;
    if (player.avoidExclusion) player.avoidExclusion = false;
    if (player.protectedFromExclusion) player.protectedFromExclusion = false;
  });

  return protectedByOneTimeState;
}

function assignPlayerNumber(room) {
  const maxPlayers = room.generatedPack?.players?.length || 8;
  const used = new Set(room.players.map((player) => Number(player.playerNumber)).filter(Boolean));

  for (let number = 1; number <= maxPlayers; number += 1) {
    if (!used.has(number)) {
      return number;
    }
  }

  return null;
}

function reconcilePlayerSlots(room) {
  const maxPlayers = room.generatedPack?.players?.length || 8;
  const used = new Set();

  room.players.forEach((player) => {
    const number = Number(player.playerNumber);
    if (number >= 1 && number <= maxPlayers && !used.has(number)) {
      player.playerNumber = number;
      used.add(number);
      return;
    }

    player.playerNumber = null;
  });

  room.players.forEach((player) => {
    if (player.playerNumber) {
      return;
    }

    for (let number = 1; number <= maxPlayers; number += 1) {
      if (!used.has(number)) {
        player.playerNumber = number;
        used.add(number);
        return;
      }
    }
  });
}

function applySharedState(room, state) {
  if (state.generatedPack) {
    room.generatedPack = state.generatedPack;
  }

  if (state.revealedTraits) {
    room.revealedTraits = state.revealedTraits;
  }

  if (Array.isArray(state.excludedPlayers)) {
    room.excludedPlayers = state.excludedPlayers;
  }

  if (state.usedAbilities) {
    room.usedAbilities = state.usedAbilities;
  }

  if (Array.isArray(state.protectedPlayers)) {
    room.protectedPlayers = state.protectedPlayers;
  }

  if (state.turnState) {
    room.turnState = state.turnState;
  }

  if (Object.prototype.hasOwnProperty.call(state, "lastRevealedTrait")) {
    room.lastRevealedTrait = state.lastRevealedTrait;
  }

  if (Object.prototype.hasOwnProperty.call(state, "lastUsedAbility")) {
    room.lastUsedAbility = state.lastUsedAbility;
  }

  if (Object.prototype.hasOwnProperty.call(state, "lastModifiedByAbility")) {
    room.lastModifiedByAbility = state.lastModifiedByAbility;
  }

  if (Array.isArray(state.gameLog)) {
    room.gameLog = state.gameLog.slice(-80);
  }

}

function serializeRoom(room) {
  return {
    roomCode: room.roomCode,
    hostId: room.hostId,
    players: room.players,
    generatedPack: room.generatedPack,
    revealedTraits: room.revealedTraits,
    excludedPlayers: room.excludedPlayers,
    usedAbilities: room.usedAbilities,
    protectedPlayers: room.protectedPlayers,
    turnState: normalizeRoomTurnState(room),
    lastRevealedTrait: room.lastRevealedTrait || null,
    lastUsedAbility: room.lastUsedAbility || null,
    lastModifiedByAbility: room.lastModifiedByAbility || null,
    voting: serializeVoting(room),
    gameLog: room.gameLog.slice(-80)
  };
}

function serializeVoting(room) {
  const voting = room.voting;
  if (!voting) {
    return null;
  }

  const participants = getActiveRoomParticipants(room).map((player) => ({
    number: Number(player.playerNumber),
    name: player.name || `Игрок ${player.playerNumber}`,
    isHost: Boolean(player.isHost)
  }));
  const voted = Object.keys(voting.votesByPlayerId || voting.votes || {}).map(Number);

  return {
    id: voting.id,
    round: voting.round,
    active: voting.active,
    status: voting.status,
    candidates: voting.candidates.map((number) => ({
      number,
      name: getRoomPlayerLabel(room, number)
    })),
    participants,
    alivePlayers: (voting.alivePlayers || []).map(Number),
    eliminatedPlayers: (voting.eliminatedPlayers || room.excludedPlayers || []).map(Number),
    voted,
    startedAt: voting.startedAt,
    endsAt: voting.endsAt,
    durationMs: voting.durationMs,
    result: voting.result,
    message: voting.message
  };
}

function broadcastRoom(roomCode) {
  const room = rooms.get(roomCode);
  if (!room) {
    return;
  }

  const payload = serializeRoom(room);
  room.players.forEach((player) => {
    const roomPayload = player.isHost
      ? payload
      : { ...payload, gameLog: [] };

    io.to(player.socketId).emit("room-state", {
      room: roomPayload,
      currentUser: player,
      publicUrl: PUBLIC_URL
    });
  });
}

function sendReply(reply, payload) {
  if (typeof reply === "function") {
    reply(payload);
  }
}

server.listen(PORT, "0.0.0.0", () => {
  console.log(`Bunker generator is running on port ${PORT}`);
  console.log(`Public URL: ${PUBLIC_URL}`);
  console.log(`Cards API: ${PUBLIC_URL}/api/cards/classic`);
});
