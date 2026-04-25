const cardColors = ["#9b5cff", "#32aaf3", "#3bd26f", "#ff8b25", "#ffc928", "#ff477d", "#4fd1c5", "#f97316"];
const ROLE_HOST = "host";
const ROLE_PLAYER = "player";
const PUBLIC_APP_URL = "https://newbunker.onrender.com";
const SERVER_URL =
  location.hostname === "localhost"
    ? "http://localhost:3000"
    : "https://newbunker.onrender.com";
const characterTraits = [
  { key: "gender", label: "Пол" },
  { key: "bodyType", label: "Тип тела" },
  { key: "trait", label: "Черта" },
  { key: "age", label: "Возраст" },
  { key: "profession", label: "Профессия" },
  { key: "health", label: "Здоровье" },
  { key: "hobby", label: "Хобби" },
  { key: "phobia", label: "Фобия" },
  { key: "largeInventory", label: "Крупное" },
  { key: "backpack", label: "Рюкзак" },
  { key: "additionalInfo", label: "Инфо" },
  { key: "specialAbility", label: "Способн." }
];

const cardSections = {
  gender: "Пол",
  bodyType: "Тип тела",
  trait: "Черта",
  profession: "Профессия",
  health: "Здоровье",
  hobby: "Хобби",
  phobia: "Фобия",
  largeInventory: "Крупное",
  backpack: "Рюкзак",
  additionalInfo: "Инфо",
  specialAbility: "Способность"
};
const requiredCardSections = Object.values(cardSections);
const repeatAllowedSections = new Set(["Пол", "Тип тела", "Здоровье"]);

const themeSelect = document.querySelector("#themeSelect");
const playerCountSelect = document.querySelector("#playerCountSelect");
const styleSelect = document.querySelector("#styleSelect");
const difficultySelect = document.querySelector("#difficultySelect");
const generateButton = document.querySelector("#generateButton");
const randomThemeButton = document.querySelector("#randomThemeButton");
const statusMessage = document.querySelector("#statusMessage");
const characterGrid = document.querySelector("#characterGrid");
const gameLogList = document.querySelector("#gameLogList");
const createRoomButton = document.querySelector("#createRoomButton");
const joinRoomButton = document.querySelector("#joinRoomButton");
const roomNameInput = document.querySelector("#roomNameInput");
const roomCodeInput = document.querySelector("#roomCodeInput");
const roomInfo = document.querySelector("#roomInfo");
const roomCodeDisplay = document.querySelector("#roomCodeDisplay");
const roomInviteLink = document.querySelector("#roomInviteLink");
const roomPlayersList = document.querySelector("#roomPlayersList");
const hostRoleButton = document.querySelector("#hostRoleButton");
const playerRoleButton = document.querySelector("#playerRoleButton");
const playerSetup = document.querySelector("#playerSetup");
const playerNumberSelect = document.querySelector("#playerNumberSelect");
const playerNameInput = document.querySelector("#playerNameInput");

const catastropheTabTitle = document.querySelector("#catastropheTabTitle");
const catastropheTabText = document.querySelector("#catastropheTabText");
const bunkerTabText = document.querySelector("#bunkerTabText");
const confirmModal = document.querySelector("#confirmModal");
const confirmTitle = document.querySelector("#confirmTitle");
const confirmMessage = document.querySelector("#confirmMessage");
const confirmYesButton = document.querySelector("#confirmYesButton");
const confirmNoButton = document.querySelector("#confirmNoButton");
const abilityModal = document.querySelector("#abilityModal");
const abilityPlayerLabel = document.querySelector("#abilityPlayerLabel");
const abilityTitle = document.querySelector("#abilityTitle");
const abilityDescription = document.querySelector("#abilityDescription");
const abilityTargetField = document.querySelector("#abilityTargetField");
const abilityTargetSelect = document.querySelector("#abilityTargetSelect");
const abilityTargetHint = document.querySelector("#abilityTargetHint");
const abilityTraitField = document.querySelector("#abilityTraitField");
const abilityTraitSelect = document.querySelector("#abilityTraitSelect");
const abilityAdminNote = document.querySelector("#abilityAdminNote");
const abilityConfirmButton = document.querySelector("#abilityConfirmButton");
const abilityCancelButton = document.querySelector("#abilityCancelButton");

let cardDatabase = createEmptyCardDatabase();
let currentPack = null;
let excludedPlayers = new Set();
let revealedTraits = {};
let confirmAction = null;
let usedAbilities = {};
let protectedPlayers = new Set();
let gameLog = [];
let pendingAbility = null;
let appRole = "";
let currentPlayerNumber = 1;
let currentPlayerName = "";
let cardsAreReady = false;
let socket = null;
let currentRoomCode = "";
let currentSocketId = "";
let roomPlayers = [];
let roomSlots = {};
let roomSlotNames = {};
let pendingApprovedRequest = null;
const handledAbilityRequests = new Set();

function getSelectedText(select) {
  return select.options[select.selectedIndex].textContent.trim();
}

function getSettings() {
  return {
    theme: getSelectedText(themeSelect),
    playerCount: Number(getSelectedText(playerCountSelect)),
    style: getSelectedText(styleSelect),
    difficulty: getSelectedText(difficultySelect)
  };
}

function isHostView() {
  return appRole === ROLE_HOST;
}

function isPlayerView() {
  return appRole === ROLE_PLAYER;
}

function isOwnPlayer(playerNumber) {
  return Boolean(appRole) && Number(playerNumber) === Number(currentPlayerNumber);
}

function isOnlineRoom() {
  return Boolean(currentRoomCode && socket?.connected);
}

function canRevealTrait(playerNumber) {
  return isHostView() || isOwnPlayer(playerNumber);
}

function canUseAbility(playerNumber) {
  return isOwnPlayer(playerNumber);
}

function getConfiguredPlayerCount() {
  return currentPack?.players?.length || Number(getSelectedText(playerCountSelect)) || 6;
}

function setRole(role) {
  appRole = role;
  currentPlayerNumber = clampPlayerNumber(currentPlayerNumber);
  updateRoleControls();
  updateControlAvailability();

  if (currentPack) {
    renderPack(currentPack);
  }

  setStatus(role === ROLE_HOST ? "Режим ведущего включен." : "Режим игрока включен.", "");
}

function clampPlayerNumber(playerNumber) {
  const playerCount = getConfiguredPlayerCount();
  const number = Number(playerNumber) || 1;
  return Math.min(Math.max(number, 1), playerCount);
}

function updateRoleControls() {
  const isHost = isHostView();
  const isPlayer = isPlayerView();

  hostRoleButton?.classList.toggle("active", isHost);
  playerRoleButton?.classList.toggle("active", isPlayer);

  if (playerSetup) {
    playerSetup.hidden = isOnlineRoom() || (!isHost && !isPlayer);
  }

  if (hostRoleButton) {
    hostRoleButton.disabled = isOnlineRoom();
  }

  if (playerRoleButton) {
    playerRoleButton.disabled = isOnlineRoom();
  }

  if (!isOnlineRoom()) {
    updatePlayerNumberOptions();
  }
}

function updatePlayerNumberOptions() {
  if (!playerNumberSelect) {
    return;
  }

  const playerCount = getConfiguredPlayerCount();
  const selectedNumber = clampPlayerNumber(currentPlayerNumber);
  playerNumberSelect.innerHTML = Array.from({ length: playerCount }, (_, index) => {
    const number = index + 1;
    return `<option value="${number}" ${number === selectedNumber ? "selected" : ""}>Игрок ${number}</option>`;
  }).join("");
  currentPlayerNumber = selectedNumber;
}

function updateControlAvailability() {
  const hostCanGenerate = cardsAreReady && isHostView();
  generateButton.disabled = !hostCanGenerate;
  randomThemeButton.disabled = !hostCanGenerate;
  playerCountSelect.disabled = !isHostView();
  themeSelect.disabled = !isHostView();
  styleSelect.disabled = !isHostView();
  difficultySelect.disabled = !isHostView();
}

function initializeSocket() {
  if (typeof io !== "function") {
    setStatus("Socket.IO не загружен. Онлайн-комнаты недоступны.", "error");
    return;
  }

  console.log("Connecting to:", SERVER_URL);
  socket = io(SERVER_URL, {
    transports: ["websocket"]
  });

  socket.on("connect", () => {
    currentSocketId = socket.id;
    const inviteCode = new URLSearchParams(window.location.search).get("room");

    if (inviteCode && roomCodeInput && !currentRoomCode) {
      roomCodeInput.value = inviteCode.toUpperCase();
      setStatus("Введите имя и нажмите «Присоединиться к комнате».", "");
    }
  });

  socket.on("roomStateUpdated", (payload) => {
    console.log("roomStateUpdated", payload?.room?.roomCode, payload?.room?.slots);
    applyRoomState(payload);
  });
  socket.on("errorMessage", (message) => {
    console.error("Socket error:", message);
    setStatus(message || "Ошибка комнаты.", "error");
  });
  socket.on("abilityApprovalRequest", handleAbilityApprovalRequest);
  socket.on("disconnect", () => {
    setStatus("Соединение с комнатой потеряно. Переподключение...", "error");
  });
}

function createOnlineRoom() {
  if (!socket?.connected) {
    setStatus("Нет соединения с сервером комнат.", "error");
    return;
  }

  socket.emit("createRoom", { name: getRoomPlayerName() }, handleRoomReply);
}

function joinOnlineRoom() {
  if (!socket?.connected) {
    setStatus("Нет соединения с сервером комнат.", "error");
    return;
  }

  const roomCode = cleanText(roomCodeInput?.value, "").toUpperCase();

  if (!roomCode) {
    setStatus("Введите код комнаты.", "error");
    return;
  }

  socket.emit("joinRoom", { roomCode, name: getRoomPlayerName() }, handleRoomReply);
}

function handleRoomReply(response) {
  if (!response?.ok) {
    setStatus(response?.error || "Не удалось подключиться к комнате.", "error");
    return;
  }

  currentRoomCode = response.roomCode;
  setStatus(`Комната ${currentRoomCode} подключена.`, "success");
}

function getRoomPlayerName() {
  return cleanText(roomNameInput?.value || playerNameInput?.value, "Игрок");
}

function applyRoomState({ room, currentUser }) {
  if (!room || !currentUser) {
    return;
  }

  currentRoomCode = room.roomCode;
  currentSocketId = socket?.id || currentUser.socketId || currentSocketId;
  roomPlayers = room.players || [];
  roomSlots = room.slots || {};
  roomSlotNames = room.slotNames || {};
  appRole = currentUser.isHost ? ROLE_HOST : ROLE_PLAYER;
  currentPlayerNumber = Number(currentUser.playerNumber) || 0;
  currentPlayerName = currentUser.name || "";
  revealedTraits = room.revealedTraits || {};
  excludedPlayers = new Set(room.excludedPlayers || []);
  usedAbilities = room.usedAbilities || {};
  protectedPlayers = new Set(room.protectedPlayers || []);
  gameLog = room.gameLog || [];

  if (room.generatedPack) {
    currentPack = room.generatedPack;
    renderPack(currentPack);
  } else {
    currentPack = null;
    renderRoomSlotCards();
    updateRoleControls();
    updateControlAvailability();
    renderGameLog();
  }

  renderRoomInfo(room);
}

function renderRoomInfo(room) {
  if (!roomInfo) {
    return;
  }

  roomInfo.hidden = false;
  roomCodeDisplay.textContent = room.roomCode;

  const inviteUrl = `${window.location.origin}${window.location.pathname}?room=${encodeURIComponent(room.roomCode)}`;
  roomInviteLink.href = inviteUrl;
  roomInviteLink.textContent = inviteUrl;

  roomPlayersList.innerHTML = (room.players || [])
    .map((player) => `
      <li>
        <span>${escapeHtml(player.name || `Игрок ${player.playerNumber || "?"}`)}</span>
        <strong>${player.isHost ? "Ведущий" : `Игрок ${player.playerNumber || "-"}`}</strong>
      </li>
    `)
    .join("");
}

function collectSharedState(resolvedRequestId = "") {
  return {
    generatedPack: currentPack,
    revealedTraits,
    excludedPlayers: Array.from(excludedPlayers),
    usedAbilities,
    protectedPlayers: Array.from(protectedPlayers),
    gameLog,
    resolvedRequestId
  };
}

function syncHostState(resolvedRequestId = "") {
  if (!isOnlineRoom() || !isHostView()) {
    return;
  }

  socket.emit("hostSyncState", {
    roomCode: currentRoomCode,
    state: collectSharedState(resolvedRequestId)
  });
}

function handleAbilityApprovalRequest({ roomCode, request }) {
  if (!isHostView() || roomCode !== currentRoomCode || !request || handledAbilityRequests.has(request.id)) {
    return;
  }

  handledAbilityRequests.add(request.id);
  showConfirm(
    "Запрос способности",
    `${request.playerName || `Игрок ${request.actorNumber}`} хочет использовать способность. Подтвердить?`,
    () => approveAbilityRequest(request)
  );
}

function approveAbilityRequest(request) {
  if (!request?.context || !isHostView()) {
    return;
  }

  const context = request.context;
  const abilityKey = getAbilityKey(context.actorNumber, context.abilityIndex);
  usedAbilities[abilityKey] = true;
  addGameLog(`Ведущий подтвердил способность Игрока ${context.actorNumber}`);
  executeAbility(context);
  renderPack(currentPack);
  renderGameLog();
  syncHostState(request.id);
}

function createEmptyCardDatabase() {
  return requiredCardSections.reduce((database, section) => {
    database[section] = [];
    return database;
  }, {});
}

function createFallbackCardDatabase() {
  const database = {
    "Пол": ["Мужчина", "Женщина", "Небинарный"],
    "Тип тела": ["Худощавый", "Крепкое телосложение", "Атлетическое", "Полный"],
    "Черта": ["Оптимист", "Скептик", "Лидер", "Миротворец", "Паникер", "Практичный"],
    "Профессия": ["Врач", "Инженер", "Повар", "Механик", "Учитель", "Охранник"],
    "Здоровье": ["Здоров", "Легкая близорукость", "Хроническая усталость", "Астма легкой формы"],
    "Хобби": ["Садоводство", "Шахматы", "Ремонт", "Первая помощь", "Кулинария", "Радиолюбительство"],
    "Фобия": ["Страх темноты", "Клаустрофобия", "Акрофобия", "Страх насекомых", "Без фобий", "Социофобия"],
    "Крупное": ["Набор инструментов", "Аптечка", "Генератор", "Ящик консервов", "Фильтр воды", "Спальный мешок"],
    "Рюкзак": ["Фонарик и батарейки", "Веревка", "Нож", "Рация", "Семена овощей", "Термос"],
    "Инфо": ["Знает план бункера", "Умеет чинить вентиляцию", "Проходил курсы выживания", "Знает местность", "Хорошо готовит", "Умеет договариваться"],
    "Способность": [
      "Поменяться рюкзаком с выбранным игроком",
      "Украсть крупный инвентарь у выбранного игрока",
      "Заставить выбранного игрока раскрыть здоровье",
      "Перегенерировать здоровье одному выбранному игроку",
      "Защититься от одной спец. возможности",
      "Один раз избежать исключения (1 раунд)"
    ]
  };

  validateCardDatabase(database);
  return database;
}

async function loadCardDatabase() {
  const requestedUrl = new URL("/cards.txt", window.location.href).href;
  let response;

  try {
    response = await fetch("/cards.txt");
  } catch (error) {
    logCardsLoadError(error, requestedUrl, response);
    throw error;
  }

  if (!response.ok) {
    logCardsLoadError(new Error(`cards.txt returned ${response.status} ${response.statusText}`), requestedUrl, response);
    throw new Error(`cards.txt returned ${response.status} ${response.statusText}`);
  }

  try {
    return parseCardsText(await response.text());
  } catch (error) {
    logCardsLoadError(error, requestedUrl, response);
    throw error;
  }
}

function logCardsLoadError(error, requestedUrl, response = null) {
  console.error("Не удалось загрузить cards.txt", {
    currentUrl: window.location.href,
    requestedUrl,
    status: response ? `${response.status} ${response.statusText}` : "нет ответа",
    error
  });
}

function parseCardsText(text) {
  const database = createEmptyCardDatabase();
  let currentSection = "";

  text.replace(/^\uFEFF/, "").split(/\r?\n/).forEach((rawLine) => {
    const line = rawLine.trim();

    if (!line) {
      return;
    }

    const header = line.match(/^\[(.+)]$/);
    if (header) {
      currentSection = header[1].trim();
      if (!database[currentSection]) {
        database[currentSection] = [];
      }
      return;
    }

    if (currentSection) {
      database[currentSection].push(line);
    }
  });

  validateCardDatabase(database);
  return database;
}

function validateCardDatabase(database) {
  const missing = requiredCardSections.filter((section) => !database[section]?.length);

  if (missing.length > 0) {
    throw new Error(`cards.txt missing cards for: ${missing.join(", ")}`);
  }
}

function setGenerationReady(isReady) {
  cardsAreReady = Boolean(isReady);
  updateControlAvailability();
}

function generateLocalPack() {
  if (!isHostView()) {
    setStatus("Генерировать пак может только ведущий.", "error");
    return;
  }

  if (!cardsAreReady) {
    setStatus("cards.txt еще загружается.", "error");
    return;
  }

  const settings = getSettings();
  const pack = createLocalPack(settings);

  resetGameState(pack);
  renderPack(pack);

  if (isOnlineRoom()) {
    socket.emit("generatePack", { roomCode: currentRoomCode, pack });
    setStatus(`Пак сгенерирован для комнаты ${currentRoomCode}.`, "success");
    return;
  }

  setStatus("Пак сгенерирован локально.", "success");
}

function createLocalPack(settings) {
  const playerCount = Number(settings.playerCount || 6);
  const availableSlots = Math.floor(playerCount / 2);
  const catastrophe = { ...pickRandom(window.BUNKER_DATA.catastrophes) };
  const bunker = createRandomizedBunker(pickRandom(window.BUNKER_DATA.bunkers), availableSlots);
  const drawState = createDrawState();
  const specialAbilityHands = createSpecialAbilityHands(playerCount, drawState);

  return {
    catastrophe,
    bunker,
    players: Array.from({ length: playerCount }, (_, index) => createLocalPlayer(index, specialAbilityHands[index], drawState))
  };
}

function createRandomizedBunker(template, availableSlots) {
  const size = randomInt(50, 300);
  const years = randomInt(3, 30);

  return {
    ...template,
    size: `${size} ${getRussianSquareMeterWord(size)}`,
    stayTime: `${years} ${getRussianYearWord(years)}`,
    availableSlots
  };
}

function createLocalPlayer(index, abilityCards, drawState) {
  const health = drawCard(cardSections.health, drawState);

  return {
    number: index + 1,
    gender: drawCard(cardSections.gender, drawState),
    age: generateAge(),
    bodyType: drawCard(cardSections.bodyType, drawState),
    trait: drawCard(cardSections.trait, drawState),
    profession: drawCard(cardSections.profession, drawState),
    health,
    healthSeverity: getHealthSeverity(health),
    healthExplanation: getHealthExplanation(health),
    hobby: drawCard(cardSections.hobby, drawState),
    phobia: drawCard(cardSections.phobia, drawState),
    largeInventory: drawCard(cardSections.largeInventory, drawState),
    backpack: drawCard(cardSections.backpack, drawState),
    additionalInfo: drawCard(cardSections.additionalInfo, drawState),
    specialAbility: abilityCards.join("; "),
    accent: cardColors[index % cardColors.length]
  };
}

function createDrawState() {
  return {
    usedBySection: new Map()
  };
}

function drawCard(section, drawState, excluded = new Set()) {
  const cards = cardDatabase[section] || [];

  if (cards.length === 0) {
    return "Не указано";
  }

  if (repeatAllowedSections.has(section)) {
    return pickRandom(cards);
  }

  if (!drawState.usedBySection.has(section)) {
    drawState.usedBySection.set(section, new Set());
  }

  const used = drawState.usedBySection.get(section);
  const freshCards = cards.filter((card) => !used.has(card) && !excluded.has(card));
  const fallbackCards = cards.filter((card) => !excluded.has(card));
  const candidates = freshCards.length > 0 ? freshCards : fallbackCards;

  if (candidates.length === 0) {
    return "Не указано";
  }

  const card = pickRandom(candidates);
  used.add(card);
  return card;
}

function createSpecialAbilityHands(playerCount, drawState) {
  const hands = [];

  for (let playerIndex = 0; playerIndex < playerCount; playerIndex += 1) {
    const hand = [];

    while (hand.length < 2) {
      const ability = drawCard(cardSections.specialAbility, drawState, new Set(hand));

      if (ability === "Не указано") {
        break;
      }

      hand.push(ability);
    }

    hands.push(hand);
  }

  return hands;
}

function pickRandom(list) {
  return list[Math.floor(Math.random() * list.length)];
}

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function generateAge() {
  const age = randomInt(18, 80);
  return `${age} ${getRussianYearWord(age)}`;
}

function getRussianYearWord(age) {
  const lastTwoDigits = age % 100;
  const lastDigit = age % 10;

  if (lastTwoDigits >= 11 && lastTwoDigits <= 14) {
    return "лет";
  }

  if (lastDigit === 1) {
    return "год";
  }

  if (lastDigit >= 2 && lastDigit <= 4) {
    return "года";
  }

  return "лет";
}

function getRussianSquareMeterWord(value) {
  const lastTwoDigits = value % 100;
  const lastDigit = value % 10;

  if (lastTwoDigits >= 11 && lastTwoDigits <= 14) {
    return "квадратных метров";
  }

  if (lastDigit === 1) {
    return "квадратный метр";
  }

  if (lastDigit >= 2 && lastDigit <= 4) {
    return "квадратных метра";
  }

  return "квадратных метров";
}

function cleanText(value, fallback = "Не указано") {
  const text = String(value ?? "").trim();
  return text || fallback;
}

function setStatus(message, type) {
  statusMessage.textContent = message;
  statusMessage.className = `status-message ${type}`.trim();
}

function createPlaceholderImage(character) {
  const title = escapeSvgText(canViewTrait(character.number, "profession") ? character.profession : `Игрок ${character.number}`);
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="420" height="300" viewBox="0 0 420 300">
      <defs>
        <linearGradient id="bg" x1="0" x2="1" y1="0" y2="1">
          <stop offset="0" stop-color="#151b25"/>
          <stop offset="0.55" stop-color="#10131a"/>
          <stop offset="1" stop-color="${character.accent}"/>
        </linearGradient>
      </defs>
      <rect width="420" height="300" fill="url(#bg)"/>
      <circle cx="210" cy="118" r="56" fill="${character.accent}" opacity="0.85"/>
      <rect x="118" y="174" width="184" height="86" rx="34" fill="#05070b" opacity="0.74"/>
      <text x="210" y="276" fill="#edf0f5" font-family="Arial" font-size="22" font-weight="700" text-anchor="middle">${title}</text>
    </svg>
  `;

  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}

function renderPack(pack) {
  currentPack = pack;
  if (!isOnlineRoom()) {
    currentPlayerNumber = clampPlayerNumber(currentPlayerNumber);
    updatePlayerNumberOptions();
  }
  renderCharacters(pack.players);

  catastropheTabTitle.textContent = pack.catastrophe.title;
  catastropheTabText.innerHTML = formatCatastrophe(pack.catastrophe);
  bunkerTabText.innerHTML = formatBunker(pack.bunker);
}

function renderCharacters(characters) {
  characterGrid.innerHTML = "";
  characterGrid.style.setProperty("--player-columns", Math.min(characters.length, 6));
  const gameIsOver = isGameOver();

  characters.forEach((character) => {
    const card = document.createElement("article");
    const isExcluded = excludedPlayers.has(character.number);
    const isOwn = isOwnPlayer(character.number);
    card.className = `character-card${isExcluded ? " excluded" : ""}${isOwn ? " own-card" : ""}`;
    card.style.setProperty("--accent", character.accent);

    card.innerHTML = `
      <span class="number-badge">${character.number}</span>
      ${isOwn ? `<span class="own-card-badge">${escapeHtml(getOwnCardBadgeText())}</span>` : ""}
      <img class="portrait" src="${createPlaceholderImage(character)}" alt="Игрок ${character.number}">
      <div class="card-body">
        <h3 class="profession">${renderCardTitle(character)}</h3>
        ${renderSlotControl(character.number)}
        <dl class="stats">
          ${characterTraits.map((trait) => renderTraitRow(character, trait)).join("")}
        </dl>
        ${isHostView() ? `
          <button class="reveal-all-button" type="button" data-action="reveal-all" data-player="${character.number}">
            Открыть все
          </button>
          <button class="exclude-button${isExcluded ? " active" : ""}" type="button" data-action="exclude" data-player="${character.number}" ${gameIsOver && !isExcluded ? "disabled" : ""}>
            ${isExcluded ? "Вернуть" : "Исключить"}
          </button>
        ` : ""}
      </div>
    `;

    characterGrid.append(card);
  });
}

function renderRoomSlotCards() {
  if (!isOnlineRoom()) {
    characterGrid.innerHTML = "";
    return;
  }

  const slotNumbers = getRoomSlotNumbers();
  characterGrid.innerHTML = "";
  characterGrid.style.setProperty("--player-columns", Math.min(slotNumbers.length || 6, 6));

  slotNumbers.forEach((slotNumber, index) => {
    const card = document.createElement("article");
    card.className = `character-card slot-card${isMySlot(slotNumber) ? " own-card" : ""}`;
    card.style.setProperty("--accent", cardColors[index % cardColors.length]);
    card.innerHTML = `
      <span class="number-badge">${slotNumber}</span>
      ${isMySlot(slotNumber) ? `<span class="own-card-badge">Мой слот</span>` : ""}
      <div class="slot-card-body">
        <h3 class="profession">Игрок ${slotNumber}</h3>
        ${renderSlotControl(slotNumber)}
        <p class="slot-hint">Пак еще не сгенерирован</p>
      </div>
    `;
    characterGrid.append(card);
  });
}

function getRoomSlotNumbers() {
  const slotNumbers = Object.keys(roomSlots || {})
    .map((slotKey) => Number(slotKey))
    .filter((slotNumber) => Number.isFinite(slotNumber))
    .sort((first, second) => first - second);

  return slotNumbers.length > 0 ? slotNumbers : Array.from({ length: 6 }, (_, index) => index + 1);
}

function getSlotOwner(slotNumber) {
  return roomSlots?.[String(slotNumber)] || roomSlots?.[slotNumber] || null;
}

function getSlotName(slotNumber) {
  return cleanText(roomSlotNames?.[String(slotNumber)] || roomSlotNames?.[slotNumber], "");
}

function isMySlot(slotNumber) {
  return Boolean(currentSocketId && getSlotOwner(slotNumber) === currentSocketId);
}

function renderSlotControl(slotNumber) {
  if (!isOnlineRoom()) {
    return "";
  }

  const ownerId = getSlotOwner(slotNumber);

  if (!ownerId) {
    return `
      <div class="slot-control">
        <button class="slot-button" type="button" data-action="claim-slot" data-slot="${slotNumber}">
          Занять слот
        </button>
      </div>
    `;
  }

  if (isMySlot(slotNumber)) {
    return `<div class="slot-control"><span class="slot-status mine">Мой слот</span></div>`;
  }

  const slotName = getSlotName(slotNumber) || `Игрок ${slotNumber}`;
  return `<div class="slot-control"><span class="slot-status taken">Занято (${escapeHtml(slotName)})</span></div>`;
}

function claimSlot(slotIndex) {
  if (!isOnlineRoom()) {
    return;
  }

  console.log("claimSlot", { roomCode: currentRoomCode, slotIndex });
  socket.emit("claimSlot", {
    roomCode: currentRoomCode,
    slotIndex,
    playerName: getRoomPlayerName()
  }, handleSlotReply);
}

function leaveSlot() {
  if (!isOnlineRoom()) {
    return;
  }

  console.log("leaveSlot", { roomCode: currentRoomCode });
  socket.emit("leaveSlot", { roomCode: currentRoomCode }, handleSlotReply);
}

function handleSlotReply(response) {
  if (!response?.ok) {
    setStatus(response?.error || "Не удалось обновить слот.", "error");
    return;
  }

  setStatus("Слот обновлен.", "success");
}

function getOwnCardBadgeText() {
  return currentPlayerName ? `Ваша карта · ${currentPlayerName}` : "Ваша карта";
}

function renderCardTitle(character) {
  if (canViewTrait(character.number, "profession")) {
    return escapeHtml(character.profession);
  }

  return `Игрок ${character.number}`;
}

function renderTraitRow(character, trait) {
  const value = renderTraitValue(character, trait);

  return `
    <div class="trait-row trait-${trait.key}">
      <dt>${trait.label}</dt>
      <dd>${value}</dd>
    </div>
  `;
}

function renderTraitValue(character, trait) {
  const isPublic = isTraitRevealed(character.number, trait.key);

  if (!canViewTrait(character.number, trait.key)) {
    return renderHiddenTraitValue(character.number, trait);
  }

  return renderVisibleTraitValue(character, trait, isPublic);
}

function canViewTrait(playerNumber, traitKey) {
  return isHostView() || isOwnPlayer(playerNumber) || isTraitRevealed(playerNumber, traitKey);
}

function renderHiddenTraitValue(playerNumber, trait) {
  if (isHostView()) {
    return renderHostHiddenTraitControls(playerNumber, trait);
  }

  return renderLockButton(playerNumber, trait.key, trait.label, !canRevealTrait(playerNumber));
}

function renderHostHiddenTraitControls(playerNumber, trait) {
  const revealAction = renderTraitRevealAction(playerNumber, trait.key, trait.label);
  const rerollAction = renderTraitRerollAction(playerNumber, trait.key, trait.label);
  const healthAction = trait.key === "health" ? renderHealthFixAction(playerNumber) : "";

  return `
    <div class="trait-value-box hidden-host-controls">
      <div class="trait-value-line">
        <span class="trait-hidden-placeholder">Скрыто</span>
        <span class="trait-row-actions">${revealAction}${rerollAction}${healthAction}</span>
      </div>
      <span class="visibility-badge host">Скрыто</span>
    </div>
  `;
}

function renderVisibleTraitValue(character, trait, isPublic) {
  let value;

  if (trait.key === "health") {
    value = renderHealthValue(character);
  } else if (trait.key === "specialAbility") {
    value = renderSpecialAbilities(character);
  } else {
    value = `<span class="trait-value">${escapeHtml(character[trait.key])}</span>`;
  }

  const revealAction = !isPublic && canRevealTrait(character.number)
    ? renderTraitRevealAction(character.number, trait.key, trait.label)
    : "";
  const rerollAction = isHostView()
    ? renderTraitRerollAction(character.number, trait.key, trait.label)
    : "";
  const healthAction = isHostView() && trait.key === "health"
    ? renderHealthFixAction(character.number)
    : "";

  return `
    <div class="trait-value-box">
      <div class="trait-value-line">
        ${value}
        <span class="trait-row-actions">${revealAction}${rerollAction}${healthAction}</span>
      </div>
      ${renderVisibilityBadge(character.number, isPublic)}
    </div>
  `;
}

function renderVisibilityBadge(playerNumber, isPublic) {
  if (isPublic) {
    return `<span class="visibility-badge public">Открыто всем</span>`;
  }

  if (isOwnPlayer(playerNumber)) {
    return `<span class="visibility-badge private">Только вы</span>`;
  }

  if (isHostView()) {
    return `<span class="visibility-badge host">Скрыто от игроков</span>`;
  }

  return "";
}

function renderSpecialAbilities(character) {
  const abilities = getPlayerAbilities(character);

  if (abilities.length === 0) {
    return `<span class="trait-value">Не указано</span>`;
  }

  return `
    <div class="ability-buttons">
      ${abilities.map((ability, index) => renderAbilityCard(character.number, ability, index)).join("")}
    </div>
  `;
}

function renderAbilityCard(playerNumber, ability, abilityIndex) {
  const abilityKey = getAbilityKey(playerNumber, abilityIndex);
  const isUsed = Boolean(usedAbilities[abilityKey]);
  const presentation = getAbilityPresentation(ability);
  const tooltip = escapeHtml(ability);
  const isDisabled = isUsed || !canUseAbility(playerNumber);

  return `
    <button class="ability-btn ability-use-button ability-type-${presentation.visualType}${isUsed ? " used" : ""}" type="button" data-action="use-ability" data-player="${playerNumber}" data-ability-index="${abilityIndex}" data-tooltip="${tooltip}" aria-label="${tooltip}" ${isDisabled ? "disabled" : ""}>
      ${isUsed
        ? `<span class="ability-used-mark" aria-hidden="true">✓</span><span class="ability-label">Использовано</span>`
        : `<span class="ability-icon" aria-hidden="true">${presentation.icon}</span><span class="ability-label">${escapeHtml(presentation.label)}</span>`}
    </button>
  `;
}

function getAbilityPresentation(abilityText) {
  const text = cleanText(abilityText, "");
  const lowerText = text.toLowerCase();
  const logicType = detectAbilityType(lowerText);
  const visualType = getAbilityVisualType(logicType, lowerText);
  const icons = {
    swap: "🔄",
    steal: "👜",
    reveal: "👁",
    reroll: "🎲",
    defense: "🛡",
    global: "🌐"
  };

  return {
    icon: icons[visualType] || icons.global,
    label: getAbilityShortLabel(lowerText, logicType),
    visualType
  };
}

function getAbilityVisualType(logicType, lowerText) {
  if (lowerText.includes("все характеристики") || logicType === "manual") {
    return "global";
  }

  return logicType;
}

function getAbilityShortLabel(lowerText, logicType) {
  const traitKey = inferTraitKey(lowerText);

  if (logicType === "defense") {
    return lowerText.includes("избежать") ? "Иммунитет" : "Щит";
  }

  if (logicType === "steal") {
    if (traitKey === "backpack") {
      return "Украсть рюкзак";
    }

    if (traitKey === "largeInventory") {
      return "Украсть инвентарь";
    }

    return "Украсть";
  }

  if (logicType === "swap") {
    return `Обмен ${getAbilityTraitGenitiveLabel(traitKey)}`;
  }

  if (logicType === "reroll") {
    return `Переген ${getAbilityTraitGenitiveLabel(traitKey)}`;
  }

  if (logicType === "reveal") {
    if (lowerText.includes("все характеристики")) {
      return "Открыть все";
    }

    if (lowerText.includes("слева")) {
      return "Открыть слева";
    }

    if (lowerText.includes("справа")) {
      return "Открыть справа";
    }

    return `Раскрыть ${getTraitAccusative(traitKey)}`;
  }

  return "Способность";
}

function getAbilityTraitGenitiveLabel(traitKey) {
  const labels = {
    profession: "профессии",
    health: "здоровья",
    phobia: "фобии",
    largeInventory: "инвентаря",
    backpack: "рюкзака",
    specialAbility: "способности"
  };

  return labels[traitKey] || "карты";
}

function renderHealthValue(character) {
  const severity = ["good", "medium", "danger", "critical"].includes(character.healthSeverity)
    ? character.healthSeverity
    : "medium";
  const explanation = character.healthExplanation || "Состояние влияет на ресурс организма и шансы выжить.";

  return `
    <span class="health-value health-${severity}">
      <span class="health-marker" aria-hidden="true"></span>
      <span class="trait-value">${escapeHtml(character.health)}</span>
      <button class="health-help" type="button" data-action="health-info" aria-label="Пояснение здоровья">
        ?
        <span class="health-tooltip" role="tooltip">${escapeHtml(explanation)}</span>
      </button>
    </span>
  `;
}

function getHealthSeverity(health) {
  const value = health.toLowerCase();

  if (value.includes("иммунитет") || value.includes("здоров")) {
    return "good";
  }

  if (value.includes("крит") || value.includes("рак") || value.includes("хрупкие кости")) {
    return "critical";
  }

  if (value.includes("тяжел") || value.includes("психоз")) {
    return "danger";
  }

  return "medium";
}

function getHealthExplanation(health) {
  const value = health.toLowerCase();

  if (value.includes("иммунитет")) {
    return "Высокая устойчивость к болезням. Повышает шансы на выживание.";
  }

  if (value.includes("здоров")) {
    return "Стабильное состояние. Может функционировать долго, не снижает выживаемость.";
  }

  if (value.includes("рак")) {
    return "Критическое состояние. Без лечения проживет ограниченное время, сильно снижает выживаемость.";
  }

  if (value.includes("вирус")) {
    return "Может ухудшиться со временем. Работоспособен, но есть риск заражения других.";
  }

  if (value.includes("булим")) {
    return "Ослабляет организм и питание. Не критично при контроле, но снижает устойчивость.";
  }

  if (value.includes("псих") || value.includes("шиз")) {
    return "Нестабильное состояние. Стресс может быстро снизить надежность и шансы.";
  }

  if (value.includes("хрупкие")) {
    return "Очень высокая травмоопасность. Без нагрузок может жить долго, но травма опасна.";
  }

  return "Состояние влияет на ресурс организма и шансы выжить.";
}

function renderLockButton(playerNumber, traitKey, label, isDisabled = false) {
  return `
    <button class="trait-lock" type="button" data-action="reveal-trait" data-player="${playerNumber}" data-trait="${traitKey}" aria-label="Открыть ${label}" ${isDisabled ? "disabled" : ""}>
      🔒
    </button>
  `;
}

function renderTraitRevealAction(playerNumber, traitKey, label) {
  return `
    <button class="trait-mini-action" type="button" data-action="reveal-trait" data-player="${playerNumber}" data-trait="${traitKey}" aria-label="Открыть ${label} для всех">
      🔒
    </button>
  `;
}

function renderTraitRerollAction(playerNumber, traitKey, label) {
  return `
    <button class="trait-mini-action" type="button" data-action="reroll-trait" data-player="${playerNumber}" data-trait="${traitKey}" aria-label="Перегенерировать ${label}">
      ↻
    </button>
  `;
}

function renderHealthFixAction(playerNumber) {
  return `
    <button class="trait-mini-action health-fix-action" type="button" data-action="make-healthy" data-player="${playerNumber}" aria-label="Сделать здоровым" title="Сделать здоровым">
      ⚕
    </button>
  `;
}

function getPlayerAbilities(player) {
  return cleanText(player?.specialAbility, "")
    .split(";")
    .map((ability) => ability.trim())
    .filter(Boolean);
}

function getAbilityKey(playerNumber, abilityIndex) {
  return `${playerNumber}:${abilityIndex}`;
}

function getPlayerByNumber(playerNumber) {
  return currentPack?.players?.find((player) => player.number === Number(playerNumber)) || null;
}

function analyzeAbility(abilityText, actorNumber) {
  const text = cleanText(abilityText, "");
  const lowerText = text.toLowerCase();
  const direction = lowerText.includes("слева")
    ? "left"
    : lowerText.includes("справа")
      ? "right"
      : "";
  const autoTargetNumber = direction ? getNeighborPlayerNumber(actorNumber, direction) : null;
  const traitKey = inferTraitKey(lowerText);
  const revealAll = lowerText.includes("все характеристики");
  const explicitTarget = lowerText.includes("выбран")
    || lowerText.includes("другим игроком")
    || lowerText.includes("одного игрока")
    || lowerText.includes("одному")
    || lowerText.includes("двух игроков");
  const type = detectAbilityType(lowerText);
  const needsTarget = !autoTargetNumber
    && type !== "defense"
    && (
      type === "steal"
      || type === "swap"
      || type === "reveal"
      || (type === "reroll" && explicitTarget)
      || (type === "manual" && explicitTarget)
    );
  const needsTrait = !revealAll && !traitKey && ["reveal", "reroll", "swap"].includes(type);

  return {
    type,
    traitKey,
    revealAll,
    direction,
    autoTargetNumber,
    needsTarget,
    needsTrait,
    explicitTarget
  };
}

function detectAbilityType(lowerText) {
  if (includesAny(lowerText, ["защититься", "избежать"])) {
    return "defense";
  }

  if (includesAny(lowerText, ["украсть"])) {
    return "steal";
  }

  if (includesAny(lowerText, ["обменяться", "поменяться", "обменять", "поменять"])) {
    return "swap";
  }

  if (includesAny(lowerText, ["перегенерировать"])) {
    return "reroll";
  }

  if (includesAny(lowerText, ["заставить", "раскрыть", "открыть"])) {
    return "reveal";
  }

  return "manual";
}

function includesAny(text, keywords) {
  return keywords.some((keyword) => text.includes(keyword));
}

function inferTraitKey(lowerText) {
  if (lowerText.includes("професс")) {
    return "profession";
  }

  if (lowerText.includes("рюкзак")) {
    return "backpack";
  }

  if (lowerText.includes("крупн")) {
    return "largeInventory";
  }

  if (lowerText.includes("здоров")) {
    return "health";
  }

  if (lowerText.includes("фоби")) {
    return "phobia";
  }

  if (lowerText.includes("хобби")) {
    return "hobby";
  }

  if (lowerText.includes("способност") || lowerText.includes("спец.")) {
    return "specialAbility";
  }

  return "";
}

function getNeighborPlayerNumber(actorNumber, direction) {
  const players = currentPack?.players || [];
  const actorIndex = players.findIndex((player) => player.number === Number(actorNumber));

  if (actorIndex === -1 || players.length < 2) {
    return null;
  }

  const offset = direction === "left" ? -1 : 1;
  const targetIndex = (actorIndex + offset + players.length) % players.length;
  return players[targetIndex].number;
}

function getAbilityTitle(type) {
  const titles = {
    swap: "Обмен",
    steal: "Кража",
    reveal: "Раскрытие",
    reroll: "Перегенерация",
    defense: "Защита",
    manual: "Способность"
  };

  return titles[type] || "Способность";
}

function isTraitRevealed(playerNumber, traitKey) {
  return Boolean(revealedTraits[playerNumber]?.[traitKey]);
}

function revealTrait(playerNumber, traitKey) {
  if (isOnlineRoom()) {
    socket.emit("revealTrait", { roomCode: currentRoomCode, playerNumber, traitKey });
    return;
  }

  setTraitRevealed(playerNumber, traitKey);
  renderPack(currentPack);
}

function revealAllTraits(playerNumber) {
  if (isOnlineRoom()) {
    socket.emit("revealAll", {
      roomCode: currentRoomCode,
      playerNumber,
      traitKeys: characterTraits.map((trait) => trait.key)
    });
    return;
  }

  setAllTraitsRevealed(playerNumber);
  renderPack(currentPack);
}

function setTraitRevealed(playerNumber, traitKey) {
  if (!revealedTraits[playerNumber]) {
    revealedTraits[playerNumber] = {};
  }

  revealedTraits[playerNumber][traitKey] = true;
}

function setAllTraitsRevealed(playerNumber) {
  characterTraits.forEach((trait) => {
    setTraitRevealed(playerNumber, trait.key);
  });
}

function toggleExcluded(playerNumber) {
  if (!isHostView()) {
    return;
  }

  if (isOnlineRoom()) {
    socket.emit("excludePlayer", {
      roomCode: currentRoomCode,
      playerNumber,
      excluded: !excludedPlayers.has(playerNumber)
    });
    return;
  }

  if (excludedPlayers.has(playerNumber)) {
    excludedPlayers.delete(playerNumber);
  } else if (!isGameOver()) {
    if (protectedPlayers.has(playerNumber)) {
      protectedPlayers.delete(playerNumber);
      addGameLog(`Игрок ${playerNumber} избежал исключения`);
      setStatus(`Игрок ${playerNumber} использовал защиту от исключения.`, "success");
      renderGameLog();
      return;
    }

    excludedPlayers.add(playerNumber);
  }

  renderPack(currentPack);

  if (isGameOver()) {
    setStatus("Игра остановлена: осталось игроков ровно по количеству мест в бункере.", "success");
  }
}

function rerollTrait(playerNumber, traitKey) {
  if (!isHostView()) {
    return;
  }

  const player = getPlayerByNumber(playerNumber);

  if (!player || !cardSections[traitKey]) {
    return;
  }

  player[traitKey] = drawReplacementTrait(traitKey, player[traitKey]);
  refreshDerivedTraitData(player, traitKey);
  if (traitKey === "specialAbility") {
    Object.keys(usedAbilities)
      .filter((abilityKey) => abilityKey.startsWith(`${player.number}:`))
      .forEach((abilityKey) => {
        delete usedAbilities[abilityKey];
      });
  }
  addGameLog(`Ведущий перегенерировал ${getTraitAccusative(traitKey)} Игроку ${player.number}`);
  renderPack(currentPack);
  renderGameLog();

  if (isOnlineRoom()) {
    syncHostState();
  }

  setStatus(`Игрок ${player.number}: ${getTraitAccusative(traitKey)} перегенерировано.`, "success");
}

function makePlayerHealthy(playerNumber) {
  if (!isHostView()) {
    return;
  }

  const player = getPlayerByNumber(playerNumber);

  if (!player) {
    return;
  }

  player.health = "Здоров";
  refreshDerivedTraitData(player, "health");
  addGameLog(`Ведущий изменил здоровье Игрока ${player.number}`);
  renderPack(currentPack);
  renderGameLog();

  if (isOnlineRoom()) {
    syncHostState();
  }

  setStatus(`Игрок ${player.number}: здоровье изменено.`, "success");
}

function formatBunker(bunker) {
  return `
    <ul class="detail-list">
      <li><strong>Постройка:</strong> ${escapeHtml(bunker.buildTime)}</li>
      <li><strong>Локация:</strong> ${escapeHtml(bunker.location)}</li>
      <li><strong>Размер:</strong> ${escapeHtml(bunker.size)}</li>
      <li><strong>Срок внутри:</strong> ${escapeHtml(bunker.stayTime)}</li>
      <li><strong>Еда:</strong> ${escapeHtml(bunker.food)}</li>
      <li><strong>Полезные предметы:</strong> ${escapeHtml(bunker.items.join(", "))}</li>
      <li><strong>Мест в бункере:</strong> ${escapeHtml(bunker.availableSlots)}</li>
    </ul>
  `;
}

function formatCatastrophe(catastrophe) {
  const paragraphs = Array.isArray(catastrophe.description)
    ? catastrophe.description
    : [catastrophe.description];

  return `
    ${paragraphs.map((paragraph) => `<p>${escapeHtml(paragraph)}</p>`).join("")}
  `;
}

function resetGameState(pack) {
  currentPack = pack;
  excludedPlayers = new Set();
  revealedTraits = {};
  usedAbilities = {};
  protectedPlayers = new Set();
  gameLog = [];
  pendingAbility = null;
  closeAbilityModal();
  renderGameLog();
}

function isGameOver() {
  if (!currentPack?.players?.length) {
    return false;
  }

  return getRemainingPlayers().length <= currentPack.bunker.availableSlots;
}

function getRemainingPlayers() {
  return currentPack.players.filter((player) => !excludedPlayers.has(player.number));
}

function openAbilityModal(playerNumber, abilityIndex) {
  if (!canUseAbility(playerNumber)) {
    return;
  }

  const player = getPlayerByNumber(playerNumber);
  const abilityText = getPlayerAbilities(player)[abilityIndex];

  if (!player || !abilityText) {
    return;
  }

  const analysis = analyzeAbility(abilityText, playerNumber);
  pendingAbility = {
    actorNumber: playerNumber,
    abilityIndex,
    abilityText,
    analysis
  };

  abilityPlayerLabel.textContent = `Игрок ${playerNumber} · ${getAbilityTitle(analysis.type)}`;
  abilityTitle.textContent = abilityText;
  abilityDescription.textContent = abilityText;
  abilityAdminNote.textContent = isHostView() ? "" : "Способность будет применена локально";

  renderAbilityTargetControls();
  updateAbilityTraitOptions();
  updateAbilityConfirmState();

  abilityModal.hidden = false;

  if (!abilityTargetField.hidden) {
    abilityTargetSelect.focus();
  } else if (!abilityTraitField.hidden) {
    abilityTraitSelect.focus();
  } else {
    abilityConfirmButton.focus();
  }
}

function renderAbilityTargetControls() {
  const { analysis, actorNumber } = pendingAbility;
  const autoTargetNumber = analysis.autoTargetNumber;
  const showAutoTarget = Boolean(autoTargetNumber);

  abilityTargetField.hidden = !analysis.needsTarget;
  abilityTargetHint.hidden = !showAutoTarget;
  abilityTargetSelect.innerHTML = "";

  if (showAutoTarget) {
    abilityTargetHint.textContent = `Цель: Игрок ${autoTargetNumber}`;
  }

  if (!analysis.needsTarget) {
    return;
  }

  const options = getTargetOptions(actorNumber, analysis);
  abilityTargetSelect.innerHTML = [
    `<option value="">Выберите игрока</option>`,
    ...options.map((player) => `<option value="${player.number}">Игрок ${player.number}</option>`)
  ].join("");
}

function getTargetOptions(actorNumber, analysis) {
  const players = currentPack?.players || [];

  if (["swap", "steal"].includes(analysis.type)) {
    return players.filter((player) => player.number !== Number(actorNumber));
  }

  return players;
}

function updateAbilityTraitOptions() {
  if (!pendingAbility) {
    return;
  }

  const { analysis } = pendingAbility;
  abilityTraitField.hidden = !analysis.needsTrait;
  abilityTraitSelect.innerHTML = "";

  if (!analysis.needsTrait) {
    return;
  }

  const targetNumber = getPendingTargetNumber();
  const options = getTraitOptionsForAbility(analysis, targetNumber);

  abilityTraitSelect.innerHTML = [
    `<option value="">Выберите характеристику</option>`,
    ...options.map((trait) => `<option value="${trait.key}">${trait.label}</option>`)
  ].join("");
}

function getTraitOptionsForAbility(analysis, targetNumber) {
  if (analysis.type === "reveal" && targetNumber) {
    const hiddenTraits = characterTraits.filter((trait) => !isTraitRevealed(targetNumber, trait.key));
    return hiddenTraits.length > 0 ? hiddenTraits : characterTraits;
  }

  return characterTraits.filter((trait) => trait.key !== "specialAbility" && cardSections[trait.key]);
}

function updateAbilityConfirmState() {
  if (!pendingAbility) {
    abilityConfirmButton.disabled = true;
    return;
  }

  const { analysis } = pendingAbility;
  const needsTargetValue = analysis.needsTarget && !abilityTargetSelect.value;
  const needsTraitValue = analysis.needsTrait && !abilityTraitSelect.value;
  abilityConfirmButton.disabled = needsTargetValue || needsTraitValue;
}

function getPendingTargetNumber() {
  if (!pendingAbility) {
    return null;
  }

  const { analysis, actorNumber } = pendingAbility;

  if (analysis.autoTargetNumber) {
    return analysis.autoTargetNumber;
  }

  if (analysis.needsTarget) {
    return Number(abilityTargetSelect.value) || null;
  }

  return actorNumber;
}

function confirmAbilityUse() {
  if (!pendingAbility || abilityConfirmButton.disabled) {
    return;
  }

  const context = {
    ...pendingAbility,
    targetNumber: getPendingTargetNumber(),
    traitKey: pendingAbility.analysis.traitKey || abilityTraitSelect.value || ""
  };
  const abilityKey = getAbilityKey(context.actorNumber, context.abilityIndex);

  if (!canUseAbility(context.actorNumber)) {
    setStatus("Можно использовать только свои способности.", "error");
    closeAbilityModal();
    return;
  }

  if (isOnlineRoom() && !isHostView()) {
    socket.emit("abilityRequest", { roomCode: currentRoomCode, context }, (response) => {
      if (!response?.ok) {
        setStatus(response?.error || "Не удалось отправить запрос способности.", "error");
        return;
      }

      setStatus("Запрос способности отправлен ведущему.", "success");
    });
    closeAbilityModal();
    return;
  }

  usedAbilities[abilityKey] = true;
  addGameLog(`Игрок ${context.actorNumber} использовал способность`);

  const wasApplied = executeAbility(context);
  closeAbilityModal();
  renderPack(currentPack);
  renderGameLog();
  if (isOnlineRoom() && isHostView()) {
    syncHostState();
  }
  if (wasApplied !== false) {
    setStatus("Способность применена локально.", "success");
  }
}

function executeAbility(context) {
  if (isAbilityBlockedByDefense(context)) {
    return false;
  }

  if (context.analysis.type === "swap") {
    applySwapAbility(context);
    return true;
  }

  if (context.analysis.type === "steal") {
    applyStealAbility(context);
    return true;
  }

  if (context.analysis.type === "reveal") {
    applyRevealAbility(context);
    return true;
  }

  if (context.analysis.type === "reroll") {
    applyRerollAbility(context);
    return true;
  }

  if (context.analysis.type === "defense") {
    applyDefenseAbility(context);
    return true;
  }

  addGameLog(`Способность Игрока ${context.actorNumber} требует ручного применения`);
  return true;
}

function isAbilityBlockedByDefense(context) {
  const targetNumber = context.targetNumber;

  if (!targetNumber || targetNumber === context.actorNumber || context.analysis.type === "defense") {
    return false;
  }

  if (!protectedPlayers.has(targetNumber)) {
    return false;
  }

  protectedPlayers.delete(targetNumber);
  addGameLog(`Игрок ${targetNumber} защитился от способности Игрока ${context.actorNumber}`);
  setStatus(`Защита Игрока ${targetNumber} заблокировала способность.`, "success");
  return true;
}

function applySwapAbility(context) {
  const actor = getPlayerByNumber(context.actorNumber);
  const target = getPlayerByNumber(context.targetNumber);
  const traitKey = context.traitKey;

  if (!actor || !target || !traitKey) {
    addGameLog(`Обмен Игрока ${context.actorNumber} требует ручного применения`);
    return;
  }

  const actorValue = actor[traitKey];
  actor[traitKey] = target[traitKey];
  target[traitKey] = actorValue;
  refreshDerivedTraitData(actor, traitKey);
  refreshDerivedTraitData(target, traitKey);
  addGameLog(`Игрок ${context.actorNumber} обменялся ${getTraitInstrumental(traitKey)} с Игроком ${context.targetNumber}`);
}

function applyStealAbility(context) {
  const actor = getPlayerByNumber(context.actorNumber);
  const target = getPlayerByNumber(context.targetNumber);
  const traitKey = context.traitKey;

  if (!actor || !target || !["backpack", "largeInventory"].includes(traitKey)) {
    addGameLog(`Кража Игрока ${context.actorNumber} требует ручного применения`);
    return;
  }

  const stolenValue = cleanText(target[traitKey]);
  actor[traitKey] = mergeStolenItem(actor[traitKey], stolenValue);
  target[traitKey] = "Украдено";
  addGameLog(`Игрок ${context.actorNumber} украл ${getTraitAccusative(traitKey)} у Игрока ${context.targetNumber}`);
}

function applyRevealAbility(context) {
  const targetNumber = context.targetNumber;

  if (!targetNumber) {
    addGameLog(`Раскрытие Игрока ${context.actorNumber} требует ручного применения`);
    return;
  }

  if (context.analysis.revealAll) {
    setAllTraitsRevealed(targetNumber);
    addGameLog(`Игрок ${context.actorNumber} открыл все характеристики Игрока ${targetNumber}`);
    return;
  }

  if (!context.traitKey) {
    addGameLog(`Раскрытие Игрока ${context.actorNumber} требует выбора характеристики`);
    return;
  }

  setTraitRevealed(targetNumber, context.traitKey);
  addGameLog(`Игрок ${context.actorNumber} заставил Игрока ${targetNumber} раскрыть ${getTraitAccusative(context.traitKey)}`);
}

function applyRerollAbility(context) {
  const target = getPlayerByNumber(context.targetNumber || context.actorNumber);
  const traitKey = context.traitKey;

  if (!target || !traitKey || !cardSections[traitKey]) {
    addGameLog(`Перегенерация Игрока ${context.actorNumber} требует ручного применения`);
    return;
  }

  target[traitKey] = drawReplacementTrait(traitKey, target[traitKey]);
  refreshDerivedTraitData(target, traitKey);
  addGameLog(`Игрок ${context.actorNumber} перегенерировал ${getTraitAccusative(traitKey)} Игроку ${target.number}`);
}

function applyDefenseAbility(context) {
  protectedPlayers.add(context.actorNumber);
  addGameLog(`Игрок ${context.actorNumber} защитился от следующей способности`);
}

function mergeStolenItem(currentValue, stolenValue) {
  const current = cleanText(currentValue, "");
  const stolen = cleanText(stolenValue, "");

  if (!stolen || stolen === "Украдено" || stolen === "Не указано") {
    return current || "Не указано";
  }

  if (!current || current === "Украдено" || current === "Не указано") {
    return stolen;
  }

  if (current.includes(stolen)) {
    return current;
  }

  return `${current}; ${stolen}`;
}

function drawReplacementTrait(traitKey, currentValue) {
  if (traitKey === "age") {
    return generateAge();
  }

  if (traitKey === "specialAbility") {
    const abilities = [];
    const drawState = createDrawState();

    while (abilities.length < 2) {
      const ability = drawCard(cardSections.specialAbility, drawState, new Set(abilities));

      if (ability === "Не указано") {
        break;
      }

      abilities.push(ability);
    }

    return abilities.join("; ") || cleanText(currentValue);
  }

  const section = cardSections[traitKey];
  const cards = cardDatabase[section] || [];
  const candidates = cards.filter((card) => card !== currentValue);
  return pickRandom(candidates.length > 0 ? candidates : cards) || cleanText(currentValue);
}

function refreshDerivedTraitData(player, traitKey) {
  if (traitKey !== "health") {
    return;
  }

  player.healthSeverity = getHealthSeverity(player.health);
  player.healthExplanation = getHealthExplanation(player.health);
}

function getTraitInstrumental(traitKey) {
  const labels = {
    gender: "полом",
    bodyType: "типом тела",
    trait: "чертой",
    age: "возрастом",
    profession: "профессией",
    health: "здоровьем",
    hobby: "хобби",
    phobia: "фобией",
    largeInventory: "крупным инвентарем",
    backpack: "рюкзаком",
    additionalInfo: "информацией",
    specialAbility: "способностью"
  };

  return labels[traitKey] || "характеристикой";
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

function addGameLog(message) {
  gameLog.push(message);
}

function renderGameLog() {
  if (!gameLogList) {
    return;
  }

  if (gameLog.length === 0) {
    gameLogList.innerHTML = `<li class="log-empty">Действий пока нет</li>`;
    return;
  }

  gameLogList.innerHTML = gameLog
    .slice(-40)
    .map((message) => `<li>${escapeHtml(message)}</li>`)
    .join("");
  gameLogList.scrollTop = gameLogList.scrollHeight;
}

function closeAbilityModal() {
  if (abilityModal) {
    abilityModal.hidden = true;
  }

  pendingAbility = null;
}

function showConfirm(title, message, onConfirm) {
  confirmTitle.textContent = title;
  confirmMessage.textContent = message;
  confirmAction = onConfirm;
  confirmModal.hidden = false;
  confirmYesButton.focus();
}

function closeConfirm() {
  confirmModal.hidden = true;
  confirmAction = null;
}

function escapeHtml(value) {
  return cleanText(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function escapeSvgText(value) {
  return cleanText(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function selectRandomTheme() {
  if (!isHostView()) {
    setStatus("Менять настройки может только ведущий.", "error");
    return;
  }

  const randomIndex = Math.floor(Math.random() * themeSelect.options.length);
  themeSelect.selectedIndex = randomIndex;
  setStatus("Случайная тема выбрана. Нажми «Сгенерировать пак».", "");
}

function isTouchTooltipMode() {
  return window.matchMedia("(hover: none), (pointer: coarse)").matches;
}

function closeActiveAbilityTooltips(exceptButton = null) {
  characterGrid.querySelectorAll(".ability-use-button.tooltip-open").forEach((activeButton) => {
    if (activeButton !== exceptButton) {
      activeButton.classList.remove("tooltip-open");
    }
  });
}

characterGrid.addEventListener("click", (event) => {
  const button = event.target.closest("button");

  if (!button) {
    return;
  }

  if (button.dataset.action === "health-info") {
    const wasActive = button.classList.contains("active");
    characterGrid.querySelectorAll(".health-help.active").forEach((activeButton) => {
      activeButton.classList.remove("active");
    });
    button.classList.toggle("active", !wasActive);
    return;
  }

  if (button.dataset.action === "claim-slot") {
    claimSlot(Number(button.dataset.slot));
    return;
  }

  const playerNumber = Number(button.dataset.player);

  if (button.dataset.action === "use-ability") {
    if (button.disabled) {
      return;
    }

    if (isTouchTooltipMode() && !button.classList.contains("tooltip-open")) {
      closeActiveAbilityTooltips(button);
      button.classList.add("tooltip-open");
      return;
    }

    closeActiveAbilityTooltips();
    openAbilityModal(playerNumber, Number(button.dataset.abilityIndex));
    return;
  }

  if (button.dataset.action === "reveal-trait") {
    if (!canRevealTrait(playerNumber)) {
      return;
    }

    showConfirm(
      "Открытие характеристики",
      "Открыть эту характеристику для всех?",
      () => revealTrait(playerNumber, button.dataset.trait)
    );
  }

  if (button.dataset.action === "reroll-trait") {
    rerollTrait(playerNumber, button.dataset.trait);
  }

  if (button.dataset.action === "make-healthy") {
    makePlayerHealthy(playerNumber);
  }

  if (button.dataset.action === "reveal-all") {
    if (!isHostView()) {
      return;
    }

    showConfirm(
      "Открыть все",
      "Открыть все характеристики этого игрока?",
      () => revealAllTraits(playerNumber)
    );
  }

  if (button.dataset.action === "exclude") {
    if (!isHostView()) {
      return;
    }

    toggleExcluded(playerNumber);
  }
});

document.addEventListener("click", (event) => {
  if (!event.target.closest(".ability-use-button")) {
    closeActiveAbilityTooltips();
  }
});

confirmYesButton.addEventListener("click", () => {
  if (confirmAction) {
    confirmAction();
  }

  closeConfirm();
});

confirmNoButton.addEventListener("click", closeConfirm);

confirmModal.addEventListener("click", (event) => {
  if (event.target === confirmModal) {
    closeConfirm();
  }
});

abilityTargetSelect.addEventListener("change", () => {
  updateAbilityTraitOptions();
  updateAbilityConfirmState();
});

abilityTraitSelect.addEventListener("change", updateAbilityConfirmState);
abilityConfirmButton.addEventListener("click", confirmAbilityUse);
abilityCancelButton.addEventListener("click", closeAbilityModal);

abilityModal.addEventListener("click", (event) => {
  if (event.target === abilityModal) {
    closeAbilityModal();
  }
});

generateButton.addEventListener("click", generateLocalPack);
randomThemeButton.addEventListener("click", selectRandomTheme);
createRoomButton?.addEventListener("click", createOnlineRoom);
joinRoomButton?.addEventListener("click", joinOnlineRoom);
roomCodeInput?.addEventListener("input", () => {
  roomCodeInput.value = roomCodeInput.value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 6);
});
hostRoleButton?.addEventListener("click", () => setRole(ROLE_HOST));
playerRoleButton?.addEventListener("click", () => setRole(ROLE_PLAYER));
playerNumberSelect?.addEventListener("change", () => {
  currentPlayerNumber = clampPlayerNumber(playerNumberSelect.value);
  if (currentPack) {
    renderPack(currentPack);
  }
});
playerNameInput?.addEventListener("input", () => {
  currentPlayerName = cleanText(playerNameInput.value, "");
  if (currentPack) {
    renderPack(currentPack);
  }
});
playerCountSelect.addEventListener("change", () => {
  currentPlayerNumber = clampPlayerNumber(currentPlayerNumber);
  updatePlayerNumberOptions();
});

setGenerationReady(false);
updateRoleControls();

if (window.location.protocol === "file:") {
  const message = `Открой сайт через сервер: ${PUBLIC_APP_URL}. Не открывай index.html напрямую.`;
  console.error(message);
  setStatus(message, "error");
} else {
  initializeSocket();
  loadCardDatabase()
    .then((database) => {
      cardDatabase = database;
      const defaultPack = createLocalPack({ playerCount: 6 });
      resetGameState(defaultPack);
      renderPack(defaultPack);
      setGenerationReady(true);
      setStatus(appRole ? (isHostView() ? "Режим ведущего включен." : "Режим игрока включен.") : "Выберите роль перед началом игры.", "");
    })
    .catch((error) => {
      console.error("cards.txt недоступен, используется встроенный резервный набор.", error);
      cardDatabase = createFallbackCardDatabase();
      const defaultPack = createLocalPack({ playerCount: 6 });
      resetGameState(defaultPack);
      renderPack(defaultPack);
      setGenerationReady(true);
      setStatus("Не удалось загрузить cards.txt. Используется встроенный резервный набор.", "error");
    });
}
