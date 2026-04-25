const express = require("express");
const http = require("http");
const path = require("path");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});
const PORT = process.env.PORT || 3000;
const PUBLIC_URL = process.env.PUBLIC_URL || process.env.RENDER_EXTERNAL_URL || "https://newbunker.onrender.com";
const PROJECT_ROOT = __dirname;
const DEFAULT_SLOT_COUNT = 6;
const STATIC_FILES = {
  "/script.js": "script.js",
  "/style.css": "style.css",
  "/data.js": "data.js"
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

app.get("/healthz", (req, res) => {
  res.status(200).send("ok");
});

app.use((req, res) => {
  res.status(404).send("Not found");
});

io.on("connection", (socket) => {
  socket.on("createRoom", ({ name } = {}, reply) => {
    const roomCode = createRoomCode();
    const userName = cleanName(name) || "Ведущий";
    const room = createRoom(roomCode, socket.id, userName);
    rooms.set(roomCode, room);
    socket.join(roomCode);
    sendReply(reply, { ok: true, roomCode });
    logRoomState(roomCode);
    broadcastRoom(roomCode);
  });

  socket.on("joinRoom", ({ roomCode, name } = {}, reply) => {
    const normalizedCode = normalizeRoomCode(roomCode);
    const room = rooms.get(normalizedCode);

    if (!room) {
      sendError(socket, "Комната не найдена");
      sendReply(reply, { ok: false, error: "Комната не найдена" });
      return;
    }

    const user = ensureRoomUser(room, socket.id, cleanName(name) || `Игрок ${room.users.length + 1}`);
    user.name = cleanName(name) || user.name;
    user.connected = true;
    socket.join(normalizedCode);
    room.gameLog.push(`${user.name} присоединился к комнате`);
    sendReply(reply, { ok: true, roomCode: normalizedCode });
    logRoomState(normalizedCode);
    broadcastRoom(normalizedCode);
  });

  socket.on("claimSlot", ({ roomCode, slotIndex, playerName } = {}, reply) => {
    const normalizedCode = normalizeRoomCode(roomCode);
    const room = rooms.get(normalizedCode);
    const slotKey = normalizeSlotIndex(slotIndex);

    if (!room) {
      sendError(socket, "Комната не найдена");
      sendReply(reply, { ok: false, error: "Комната не найдена" });
      return;
    }

    if (!Object.prototype.hasOwnProperty.call(room.slots, slotKey)) {
      sendError(socket, "Такого слота нет");
      sendReply(reply, { ok: false, error: "Такого слота нет" });
      return;
    }

    if (room.slots[slotKey] && room.slots[slotKey] !== socket.id) {
      sendError(socket, "Слот уже занят");
      sendReply(reply, { ok: false, error: "Слот уже занят" });
      return;
    }

    const user = ensureRoomUser(room, socket.id, cleanName(playerName) || "Игрок");
    user.name = cleanName(playerName) || user.name;
    releaseUserSlot(room, socket.id);
    room.slots[slotKey] = socket.id;
    room.slotNames[slotKey] = user.name;
    room.gameLog.push(`${user.name} занял слот ${slotKey}`);
    sendReply(reply, { ok: true });
    logRoomState(normalizedCode);
    broadcastRoom(normalizedCode);
  });

  socket.on("leaveSlot", ({ roomCode } = {}, reply) => {
    const normalizedCode = normalizeRoomCode(roomCode);
    const room = rooms.get(normalizedCode);

    if (!room) {
      sendError(socket, "Комната не найдена");
      sendReply(reply, { ok: false, error: "Комната не найдена" });
      return;
    }

    releaseUserSlot(room, socket.id);
    sendReply(reply, { ok: true });
    logRoomState(normalizedCode);
    broadcastRoom(normalizedCode);
  });

  socket.on("generatePack", ({ roomCode, pack } = {}) => {
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
    ensureRoomSlots(room, DEFAULT_SLOT_COUNT);
    logRoomState(room.roomCode);
    broadcastRoom(room.roomCode);
  });

  socket.on("revealTrait", ({ roomCode, playerNumber, traitKey } = {}) => {
    const room = rooms.get(normalizeRoomCode(roomCode));
    const user = getRoomUser(room, socket.id);

    if (!room || !user || !canReveal(room, user, Number(playerNumber))) {
      return;
    }

    setTraitRevealed(room, Number(playerNumber), traitKey);
    room.gameLog.push(`Открыта характеристика Игрока ${Number(playerNumber)}`);
    logRoomState(room.roomCode);
    broadcastRoom(room.roomCode);
  });

  socket.on("revealAll", ({ roomCode, playerNumber, traitKeys } = {}) => {
    const room = getHostRoom(socket, roomCode);
    if (!room) {
      return;
    }

    (Array.isArray(traitKeys) ? traitKeys : []).forEach((traitKey) => {
      setTraitRevealed(room, Number(playerNumber), traitKey);
    });
    room.gameLog.push(`Ведущий открыл все характеристики Игрока ${Number(playerNumber)}`);
    logRoomState(room.roomCode);
    broadcastRoom(room.roomCode);
  });

  socket.on("excludePlayer", ({ roomCode, playerNumber, excluded } = {}) => {
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
    logRoomState(room.roomCode);
    broadcastRoom(room.roomCode);
  });

  socket.on("hostSyncState", ({ roomCode, state } = {}) => {
    const room = getHostRoom(socket, roomCode);
    if (!room || !state) {
      return;
    }

    applySharedState(room, state);
    logRoomState(room.roomCode);
    broadcastRoom(room.roomCode);
  });

  socket.on("abilityRequest", ({ roomCode, context } = {}, reply) => {
    const room = rooms.get(normalizeRoomCode(roomCode));
    const user = getRoomUser(room, socket.id);
    const userSlot = getUserSlot(room, socket.id);

    if (!room || !user || Number(context?.actorNumber) !== Number(userSlot)) {
      sendError(socket, "Можно использовать только свои способности");
      sendReply(reply, { ok: false, error: "Можно использовать только свои способности" });
      return;
    }

    const request = {
      id: createRequestId(),
      socketId: socket.id,
      playerName: user.name,
      actorNumber: Number(userSlot),
      context,
      createdAt: Date.now()
    };
    room.pendingAbilityRequests.push(request);
    room.gameLog.push(`Игрок ${userSlot} запросил способность`);
    sendReply(reply, { ok: true, requestId: request.id });
    logRoomState(room.roomCode);
    broadcastRoom(room.roomCode);
    io.to(room.hostId).emit("abilityApprovalRequest", { roomCode: room.roomCode, request });
  });

  socket.on("hostRejectAbility", ({ roomCode, requestId } = {}) => {
    const room = getHostRoom(socket, roomCode);
    if (!room) {
      return;
    }

    room.pendingAbilityRequests = room.pendingAbilityRequests.filter((request) => request.id !== requestId);
    room.gameLog.push("Ведущий отклонил запрос способности");
    logRoomState(room.roomCode);
    broadcastRoom(room.roomCode);
  });

  socket.on("disconnect", () => {
    rooms.forEach((room) => {
      const user = getRoomUser(room, socket.id);
      if (!user) {
        return;
      }

      user.connected = false;
      releaseUserSlot(room, socket.id);
      room.gameLog.push(user.isHost ? "Ведущий отключился" : `${user.name} отключился`);
      logRoomState(room.roomCode);
      broadcastRoom(room.roomCode);
    });
  });
});

function createRoom(roomCode, hostId, hostName) {
  return {
    roomCode,
    hostId,
    users: [{ socketId: hostId, name: hostName, isHost: true, connected: true }],
    slots: createSlots(DEFAULT_SLOT_COUNT),
    slotNames: {},
    generatedPack: null,
    revealedTraits: {},
    excludedPlayers: [],
    usedAbilities: {},
    protectedPlayers: [],
    pendingAbilityRequests: [],
    gameLog: ["Комната создана"]
  };
}

function createSlots(count) {
  return Array.from({ length: count }, (_, index) => index + 1).reduce((slots, slotNumber) => {
    slots[slotNumber] = null;
    return slots;
  }, {});
}

function ensureRoomSlots(room, count) {
  const existingSlots = room.slots || {};
  const nextSlots = createSlots(count);
  const nextSlotNames = {};

  Object.keys(nextSlots).forEach((slotKey) => {
    if (existingSlots[slotKey]) {
      nextSlots[slotKey] = existingSlots[slotKey];
      nextSlotNames[slotKey] = room.slotNames?.[slotKey] || getRoomUser(room, existingSlots[slotKey])?.name || "";
    }
  });

  room.slots = nextSlots;
  room.slotNames = nextSlotNames;
}

function createRoomCode() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";

  do {
    code = Array.from({ length: 6 }, () => alphabet[Math.floor(Math.random() * alphabet.length)]).join("");
  } while (rooms.has(code));

  return code;
}

function createRequestId() {
  return `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`.toUpperCase();
}

function normalizeRoomCode(roomCode) {
  return String(roomCode || "").trim().toUpperCase();
}

function normalizeSlotIndex(slotIndex) {
  return String(Number(slotIndex));
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

function getRoomUser(room, socketId) {
  return room?.users?.find((user) => user.socketId === socketId) || null;
}

function ensureRoomUser(room, socketId, name) {
  const existingUser = getRoomUser(room, socketId);

  if (existingUser) {
    return existingUser;
  }

  const user = {
    socketId,
    name,
    isHost: room.hostId === socketId,
    connected: true
  };
  room.users.push(user);
  return user;
}

function getUserSlot(room, socketId) {
  const entry = Object.entries(room?.slots || {}).find(([, ownerId]) => ownerId === socketId);
  return entry ? Number(entry[0]) : null;
}

function releaseUserSlot(room, socketId) {
  Object.keys(room.slots || {}).forEach((slotKey) => {
    if (room.slots[slotKey] === socketId) {
      room.slots[slotKey] = null;
      delete room.slotNames[slotKey];
    }
  });
}

function canReveal(room, user, playerNumber) {
  return user.isHost || Number(getUserSlot(room, user.socketId)) === Number(playerNumber);
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

function getRoomPlayers(room) {
  return room.users.map((user) => ({
    socketId: user.socketId,
    name: user.name,
    playerNumber: getUserSlot(room, user.socketId),
    isHost: user.isHost,
    connected: user.connected
  }));
}

function getCurrentUser(room, user) {
  return {
    socketId: user.socketId,
    name: user.name,
    playerNumber: getUserSlot(room, user.socketId),
    isHost: user.isHost,
    connected: user.connected
  };
}

function serializeRoom(room) {
  return {
    roomCode: room.roomCode,
    hostId: room.hostId,
    users: room.users,
    players: getRoomPlayers(room),
    slots: room.slots,
    slotNames: room.slotNames,
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
  room.users.forEach((user) => {
    io.to(user.socketId).emit("roomStateUpdated", {
      room: payload,
      currentUser: getCurrentUser(room, user),
      publicUrl: PUBLIC_URL
    });
  });
}

function sendError(socket, message) {
  socket.emit("errorMessage", message);
}

function sendReply(reply, payload) {
  if (typeof reply === "function") {
    reply(payload);
  }
}

function logRoomState(roomCode) {
  const room = rooms.get(roomCode);
  if (room) {
    console.log("Room state:", JSON.stringify(serializeRoom(room), null, 2));
  }
}

server.listen(PORT, () => {
  console.log(`Bunker generator is running on port ${PORT}`);
  console.log(`Public URL: ${PUBLIC_URL}`);
  console.log(`Cards file: ${PUBLIC_URL}/cards.txt`);
});
