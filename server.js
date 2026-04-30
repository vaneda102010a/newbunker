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
const VOTING_DURATION_MS = 30000;
const STATIC_FILES = {
  "/script.js": "script.js",
  "/style.css": "style.css",
  "/data.js": "data.js",
  "/images/bunker-bg.jpg": "public/images/bunker-bg.jpg",
  "/images/fanta.jpg": "public/images/fanta.jpg"
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
      if (room.voting?.active && allActiveParticipantsVoted(room)) {
        resolveVotingRound(room.roomCode, "all-voted");
        return;
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

server.listen(PORT, () => {
  console.log(`Bunker generator is running on port ${PORT}`);
  console.log(`Public URL: ${PUBLIC_URL}`);
  console.log(`Cards API: ${PUBLIC_URL}/api/cards/${DEFAULT_THEME_ID}`);
});
