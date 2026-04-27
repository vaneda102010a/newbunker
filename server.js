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
const STATIC_FILES = {
  "/script.js": "script.js",
  "/style.css": "style.css",
  "/data.js": "data.js",
  "/images/bunker-bg.jpg": "public/images/bunker-bg.jpg"
};
const rooms = new Map();

app.get(["/", "/index.html"], (req, res) => {
  res.sendFile(path.join(PROJECT_ROOT, "index.html"));
});

Object.entries(STATIC_FILES).forEach(([route, fileName]) => {
  app.get(route, (req, res) => {
    res.sendFile(path.join(PROJECT_ROOT, fileName));
  });
});

app.get("/cards.txt", (req, res) => {
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("Content-Type", "text/plain; charset=utf-8");
  res.sendFile(path.join(PROJECT_ROOT, "cards.txt"));
});

app.get("/cards-fantasy.txt", (req, res) => {
  const fileName = "cards Fantasy.txt";
  const filePath = path.join(PROJECT_ROOT, fileName);

  res.setHeader("Cache-Control", "no-store");
  res.setHeader("Content-Type", "text/plain; charset=utf-8");

  if (!fs.existsSync(filePath)) {
    res.status(404).send(`${fileName} not found`);
    return;
  }

  res.sendFile(filePath);
});

app.get("/healthz", (req, res) => {
  res.status(200).send("ok");
});

app.use((req, res) => {
  res.status(404).send("Not found");
});

io.on("connection", (socket) => {
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
      return;
    }

    room.players.push({
      socketId: socket.id,
      name: cleanName(name) || `Игрок ${room.players.length + 1}`,
      playerNumber: assignPlayerNumber(room),
      isHost: false,
      connected: true
    });
    room.gameLog.push(`${room.players[room.players.length - 1].name} присоединился к комнате`);
    socket.join(normalizedCode);
    sendReply(reply, { ok: true, roomCode: normalizedCode });
    broadcastRoom(normalizedCode);
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
    room.gameLog.push(`Открыта характеристика Игрока ${Number(playerNumber)}`);
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
  });
});

function createRoomForSocket(socket, rawPlayerName, reply) {
  const roomCode = generateRoomCode();
  const playerName = cleanName(rawPlayerName) || "Ведущий";
  const room = createRoom(roomCode, socket.id, playerName);
  rooms.set(roomCode, room);
  socket.join(roomCode);

  console.log("Room created:", roomCode);

  sendReply(reply, { ok: true, roomCode });
  socket.emit("roomCreated", { roomCode });
  io.to(roomCode).emit("roomStateUpdated", serializeRoom(room));
  broadcastRoom(roomCode);
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
  console.log(`Cards file: ${PUBLIC_URL}/cards.txt`);
});
