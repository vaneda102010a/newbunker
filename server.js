const express = require("express");
const fs = require("fs");
const http = require("http");
const path = require("path");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server);
const PORT = process.env.PORT || 3000;
const PUBLIC_URL = process.env.PUBLIC_URL || process.env.RENDER_EXTERNAL_URL || "https://bunker-s4n4.onrender.com";
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
      turnIndex: 0,
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
  if (lobby.state !== "IN_GAME" || lobby.players.length === 0) {
    return null;
  }
  return lobby.players[lobby.turnIndex % lobby.players.length];
}

function serializeLobby(lobby) {
  const currentPlayer = getCurrentPlayer(lobby);
  
  return {
    id: lobby.id,
    roomCode: lobby.roomCode,
    state: lobby.state,
    hostId: lobby.hostId,
    turnIndex: lobby.turnIndex,
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

app.get(["/", "/index.html"], (req, res) => {
  res.sendFile(path.join(PROJECT_ROOT, "index.html"));
});

Object.entries(STATIC_FILES).forEach(([route, fileName]) => {
  app.get(route, (req, res) => {
    res.sendFile(path.join(PROJECT_ROOT, fileName));
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
  res.sendFile(filePath);
});

app.get("/healthz", (req, res) => {
  res.status(200).send("ok");
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
    lobby.turnIndex = 0;
    lobby.currentTurnStartedAt = Date.now();
    
    // Reset turn flags
    lobby.players.forEach(p => {
      p.hasRevealedThisTurn = false;
    });
    
    console.log(`Game started in lobby ${normalizedCode}`);
    
    sendReply(reply, { ok: true });
    broadcastLobby(normalizedCode);
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
    lobby.players = lobby.players.filter(p => p.id !== playerId);
    
    console.log(`Player ${playerToKick.name} (${playerId}) was kicked from lobby ${normalizedCode}`);
    
    sendReply(reply, { ok: true });
    broadcastLobby(normalizedCode);
  });
  
  socket.on("reveal-characteristic", ({ roomCode, characteristicKey } = {}, reply) => {
    const normalizedCode = normalizeRoomCode(roomCode);
    const lobby = getLobbyByRoomCode(normalizedCode);
    
    if (!lobby) {
      sendReply(reply, { ok: false, error: "Лобби не найдено" });
      return;
    }
    
    if (lobby.state !== "IN_GAME") {
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
    
    // Mark as revealed
    player.hasRevealedThisTurn = true;
    
    console.log(`Player ${player.name} revealed characteristic: ${characteristicKey}`);
    
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
    
    if (lobby.state !== "IN_GAME") {
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
    
    // Reset turn flag
    currentPlayer.hasRevealedThisTurn = false;
    
    // Move to next player
    lobby.turnIndex++;
    if (lobby.turnIndex >= lobby.players.length) {
      lobby.turnIndex = 0;
    }
    
    lobby.currentTurnStartedAt = Date.now();
    
    console.log(`Turn ended in lobby ${normalizedCode}. Next player: ${lobby.players[lobby.turnIndex]?.name}`);
    
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
      } else {
        room.gameLog.push(`${player.name} отключился`);
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
    gameLog: room.gameLog.slice(-80)
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

server.listen(PORT, () => {
  console.log(`Bunker generator is running on port ${PORT}`);
  console.log(`Public URL: ${PUBLIC_URL}`);
  console.log(`Cards API: ${PUBLIC_URL}/api/cards/${DEFAULT_THEME_ID}`);
});
