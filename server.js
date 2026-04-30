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
const VOTING_DURATION_MS = 30000;
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

app.get("/", (req, res) => {
  res.send("OK");
});

app.get("/index.html", (req, res) => {
  sendProjectFile(res, path.join(PROJECT_ROOT, "index.html"));
});

Object.entries(STATIC_FILES).forEach(([route, fileName]) => {
  app.get(route, (req, res) => {
    sendProjectFile(res, path.join(PROJECT_ROOT, fileName));
  });
});

app.use("/core", express.static(path.join(PUBLIC_DIR, "core")));
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
  socket.on("kickPlayer", ({ roomCode, playerId } = {}, reply) => {
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

    // Attempt to disconnect the player's socket if connected
    try {
      const targetSocket = io.sockets.sockets.get(playerToKick.socketId);
      if (targetSocket) {
        try { targetSocket.emit('kicked', { roomCode: normalizedCode }); } catch (e) {}
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
    room.pendingAbilityRequests = [];
    clearVotingTimer(room);
    room.voting = null;
    room.gameLog = ["Ведущий сгенерировал новый пак"];
    reconcilePlayerSlots(room);
    broadcastRoom(room.roomCode);
  });

  socket.on("reveal-trait", ({ roomCode, playerNumber, traitKey } = {}) => {
    const room = rooms.get(normalizeRoomCode(roomCode));
    const player = getRoomPlayer(room, socket.id);

    if (!room || !player || !canReveal(player, Number(playerNumber))) {
      return;
    }

    setTraitRevealed(room, Number(playerNumber), traitKey);
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
    const excludedSet = new Set(room.excludedPlayers);
    if (excluded) {
      excludedSet.add(number);
      room.gameLog.push(`Ведущий исключил Игрока ${number}`);
    } else {
      excludedSet.delete(number);
      room.gameLog.push(`Ведущий вернул Игрока ${number}`);
    }
    room.excludedPlayers = Array.from(excludedSet);
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

  socket.on("voting-start", ({ roomCode, candidates } = {}, reply) => {
    const room = getHostRoom(socket, roomCode);
    if (!room) {
      sendReply(reply, { ok: false, error: "Только ведущий может начать голосование" });
      return;
    }

    const validCandidates = normalizeVotingCandidates(room, candidates);
    if (validCandidates.length < 2) {
      sendReply(reply, { ok: false, error: "Выберите минимум двух активных игроков" });
      return;
    }

    clearVotingTimer(room);
    startVotingRound(room, validCandidates, {
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
    if (room.voting.votes[voterNumber]) {
      sendReply(reply, { ok: false, error: "Вы уже проголосовали" });
      return;
    }

    room.voting.votes[voterNumber] = candidateNumber;
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
      sendReply(reply, { ok: false, error: "Только ведущий может пропустить голосование" });
      return;
    }

    clearVotingTimer(room);
    room.voting = null;
    room.gameLog.push("Голосование пропущено ведущим");
    sendReply(reply, { ok: true });
    broadcastRoom(room.roomCode);
  });

  socket.on("ability-request", ({ roomCode, context } = {}, reply) => {
    const room = rooms.get(normalizeRoomCode(roomCode));
    const player = getRoomPlayer(room, socket.id);

    if (!room || !player || Number(context?.actorNumber) !== Number(player.playerNumber)) {
      sendReply(reply, { ok: false, error: "Можно использовать только свои способности" });
      return;
    }

    const request = {
      id: createRequestId(),
      socketId: socket.id,
      playerName: player.name,
      actorNumber: player.playerNumber,
      context,
      createdAt: Date.now()
    };
    room.pendingAbilityRequests.push(request);
    room.gameLog.push(`Игрок ${player.playerNumber} запросил способность`);
    sendReply(reply, { ok: true, requestId: request.id });
    broadcastRoom(room.roomCode);
    io.to(room.hostId).emit("ability-approval-request", { roomCode: room.roomCode, request });
  });

  socket.on("host-reject-ability", ({ roomCode, requestId } = {}) => {
    const room = getHostRoom(socket, roomCode);
    if (!room) {
      return;
    }

    room.pendingAbilityRequests = room.pendingAbilityRequests.filter((request) => request.id !== requestId);
    room.gameLog.push("Ведущий отклонил запрос способности");
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
  io.to(roomCode).emit("roomStateUpdated", serializeRoom(room));
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
    pendingAbilityRequests: [],
    voting: null,
    votingTimer: null,
    gameLog: ["Комната создана"]
  };
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

function isActiveRoomParticipant(room, player) {
  return getActiveRoomParticipants(room).some((candidate) => candidate.socketId === player.socketId);
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

function startVotingRound(room, candidates, options = {}) {
  const id = options.id || room.voting?.id || createRequestId();
  const round = Number(options.round) || 1;
  const now = Date.now();

  room.voting = {
    id,
    round,
    active: true,
    status: "active",
    candidates,
    votes: {},
    startedAt: now,
    endsAt: now + VOTING_DURATION_MS,
    durationMs: VOTING_DURATION_MS,
    result: null,
    message: round > 1 ? `Повторный раунд ${round}` : "Голосование активно"
  };

  if (options.logStart) {
    room.gameLog.push(`Кандидаты добавлены: ${candidates.map((number) => `Игрок ${number}`).join(", ")}`);
    room.gameLog.push("Голосование началось");
  }

  clearVotingTimer(room);
  room.votingTimer = setTimeout(() => resolveVotingRound(room.roomCode, "timer"), VOTING_DURATION_MS + 100);
}

function allActiveParticipantsVoted(room) {
  if (!room.voting?.active) {
    return false;
  }

  const participants = getActiveRoomParticipants(room);
  return participants.length > 0 && participants.every((player) => room.voting.votes[Number(player.playerNumber)]);
}

function resolveVotingRound(roomCode, reason = "timer") {
  const room = rooms.get(roomCode);
  if (!room?.voting?.active) {
    return;
  }

  clearVotingTimer(room);

  const voting = room.voting;
  const counts = voting.candidates.reduce((result, playerNumber) => {
    result[playerNumber] = 0;
    return result;
  }, {});

  Object.values(voting.votes).forEach((candidateNumber) => {
    const number = Number(candidateNumber);
    if (counts[number] !== undefined) {
      counts[number] += 1;
    }
  });

  const maxVotes = Math.max(0, ...Object.values(counts));
  const tied = Object.entries(counts)
    .filter(([, count]) => count === maxVotes)
    .map(([playerNumber]) => Number(playerNumber));
  const details = Object.entries(counts)
    .map(([playerNumber, count]) => `Игрок ${playerNumber}: ${count}`)
    .join("; ");

  room.gameLog.push(`Голосование завершено: ${details || "голосов нет"}`);

  if (maxVotes <= 0) {
    room.voting = {
      ...voting,
      active: false,
      status: "ended",
      result: {
        type: "no-votes",
        reason,
        counts,
        message: "Никто не выбыл: голосов нет"
      },
      message: "Голосование завершено без голосов"
    };
    broadcastRoom(room.roomCode);
    return;
  }

  if (tied.length > 1) {
    room.gameLog.push(`Ничья: ${tied.map((number) => `Игрок ${number}`).join(", ")}. Запущен новый раунд`);
    startVotingRound(room, tied, {
      id: voting.id,
      round: voting.round + 1
    });
    broadcastRoom(room.roomCode);
    return;
  }

  const eliminated = tied[0];
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
      eliminated,
      message: `Исключен Игрок ${eliminated}`
    },
    message: `Голосование завершено: исключен Игрок ${eliminated}`
  };
  broadcastRoom(room.roomCode);
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

  if (Array.isArray(state.gameLog)) {
    room.gameLog = state.gameLog.slice(-80);
  }

  if (state.resolvedRequestId) {
    room.pendingAbilityRequests = room.pendingAbilityRequests.filter((request) => request.id !== state.resolvedRequestId);
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
    pendingAbilityRequests: room.pendingAbilityRequests,
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
  const voted = Object.keys(voting.votes || {}).map(Number);

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
    io.to(player.socketId).emit("room-state", {
      room: payload,
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
