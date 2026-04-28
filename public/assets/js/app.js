const cardColors = ["#9b5cff", "#32aaf3", "#3bd26f", "#ff8b25", "#ffc928", "#ff477d", "#4fd1c5", "#f97316"];
const ROLE_HOST = "host";
const ROLE_PLAYER = "player";
const VIEW_CARDS = "cards";
const VIEW_TABLE = "table";
const CHARACTER_VIEW_STORAGE_KEY = "bunkerCharacterView";
const PUBLIC_APP_URL = "https://bunker-s4n4.onrender.com";
const DEFAULT_THEME_ID = "classic";
const themes = [
  { id: "classic", name: "Классическая" },
  { id: "fantasy", name: "Фэнтези" }
];
const themeCardSources = {
  classic: { path: "/cards.txt", fileName: "cards.txt", allowFallback: true },
  fantasy: { path: "/cards-fantasy.txt", fileName: "cards Fantasy.txt", allowFallback: false }
};
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

const tableTraits = [
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
  { key: "specialAbility", label: "Способность" }
];

const traitIcons = {
  gender: "👤",
  bodyType: "▣",
  trait: "✦",
  age: "⏳",
  profession: "🛠",
  health: "❤️",
  hobby: "🎯",
  phobia: "😱",
  largeInventory: "📦",
  backpack: "🎒",
  additionalInfo: "ℹ",
  specialAbility: "⚡"
};

const traitToneKeywords = {
  good: [
    "врач",
    "инженер",
    "механик",
    "фермер",
    "электрик",
    "первая помощь",
    "выживание",
    "сильный иммунитет",
    "идеальное здоровье",
    "абсолютно здоров"
  ],
  bad: [
    "рак",
    "психоз",
    "шизофрения",
    "наркомания",
    "инсульт",
    "инфаркт",
    "алкоголизм",
    "хрупкие кости",
    "тяжелые болезни"
  ],
  rare: [
    "тайный агент",
    "знает другой бункер",
    "выживал в катастрофе",
    "уникальные способности"
  ]
};

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
const packSummary = document.querySelector("#packSummary");
const characterGrid = document.querySelector("#characterGrid");
const cardViewButton = document.querySelector("#cardViewButton");
const tableViewButton = document.querySelector("#tableViewButton");
const gameLogList = document.querySelector("#gameLogList");
const helpButton = document.querySelector("#helpButton");
const settingsPanelButton = document.querySelector("#settingsPanelButton");
const roomPanelButton = document.querySelector("#roomPanelButton");
const rolePanelButton = document.querySelector("#rolePanelButton");
const setupModals = document.querySelectorAll("[data-setup-modal]");
const helpModal = document.querySelector("#helpModal");
const helpCloseButton = document.querySelector("#helpCloseButton");
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
let newlyRevealedTraitKeys = new Set();
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
let characterView = getSavedCharacterView();
let pendingCreateRoomName = "";
let pendingApprovedRequest = null;
const handledAbilityRequests = new Set();
const cardDatabaseCache = new Map();

function getSavedCharacterView() {
  try {
    return localStorage.getItem(CHARACTER_VIEW_STORAGE_KEY) === VIEW_CARDS ? VIEW_CARDS : VIEW_TABLE;
  } catch (error) {
    return VIEW_TABLE;
  }
}

function getSelectedText(select) {
  return select.options[select.selectedIndex].textContent.trim();
}

function renderThemeOptions() {
  if (!themeSelect) {
    return;
  }

  themeSelect.innerHTML = themes
    .map((theme) => `<option value="${theme.id}" ${theme.id === DEFAULT_THEME_ID ? "selected" : ""}>${theme.name}</option>`)
    .join("");
}

function getThemeById(themeId) {
  return themes.find((theme) => theme.id === themeId) || themes[0];
}

function getSelectedTheme() {
  return getThemeById(themeSelect?.value || DEFAULT_THEME_ID);
}

function getSettings() {
  const selectedTheme = getSelectedTheme();

  return {
    theme: selectedTheme.id,
    themeName: selectedTheme.name,
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

  socket = io();

  socket.on("connect", () => {
    currentSocketId = socket.id;
    console.log("Connected:", socket.id);

    if (pendingCreateRoomName) {
      const playerName = pendingCreateRoomName;
      pendingCreateRoomName = "";
      emitCreateRoom(playerName);
    }

    const inviteCode = new URLSearchParams(window.location.search).get("room");

    if (inviteCode && roomCodeInput && !currentRoomCode) {
      roomCodeInput.value = inviteCode.toUpperCase();
      setStatus("Введите имя и нажмите «Присоединиться к комнате».", "");
    }
  });

  socket.on("room-state", applyRoomState);
  socket.on("roomCreated", ({ roomCode } = {}) => {
    if (!roomCode) {
      return;
    }

    console.log("Room created:", roomCode);
    currentRoomCode = roomCode;

    if (roomCodeInput) {
      roomCodeInput.value = roomCode;
    }

    window.history.replaceState(
      {},
      "",
      `?room=${roomCode}`
    );
  });
  socket.on("ability-approval-request", handleAbilityApprovalRequest);
  socket.on("disconnect", () => {
    setStatus("Соединение с комнатой потеряно. Переподключение...", "error");
  });
}

function createOnlineRoom() {
  const playerName = roomNameInput?.value.trim() || "";

  if (!playerName) {
    alert("Введите имя");
    return;
  }

  showConfirm(
    "Создать новую комнату?",
    "Вы точно хотите создать новую комнату, а не присоединиться к существующей?",
    () => createOnlineRoomAfterConfirm(playerName),
    {
      confirmLabel: "Создать комнату",
      cancelLabel: "Отмена"
    }
  );
}

function createOnlineRoomAfterConfirm(playerName) {
  console.log("Creating room as:", playerName);

  if (!socket?.connected) {
    pendingCreateRoomName = playerName;
    setStatus("Нет соединения с сервером комнат. Комната создастся после подключения.", "error");
    socket?.connect?.();
    return;
  }

  emitCreateRoom(playerName);
}

function emitCreateRoom(playerName) {
  if (!socket?.connected) {
    pendingCreateRoomName = playerName;
    return;
  }

  console.log("Emit createRoom");
  socket.emit("createRoom", { playerName }, handleRoomReply);
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

  socket.emit("join-room", { roomCode, name: getRoomPlayerName() }, handleRoomReply);
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

  markNewlyRevealedTraits(room.revealedTraits || {});
  currentRoomCode = room.roomCode;
  currentSocketId = socket?.id || currentUser.socketId || currentSocketId;
  roomPlayers = room.players || [];
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
    characterGrid.innerHTML = "";
    updatePackSummary(null);
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

  socket.emit("host-sync-state", {
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

  validateCardDatabase(database, "fallback cards");
  return database;
}

function getThemeCardSource(themeId) {
  return themeCardSources[getThemeById(themeId).id] || themeCardSources[DEFAULT_THEME_ID];
}

async function loadCardsForTheme(themeId) {
  const resolvedThemeId = getThemeById(themeId).id;

  if (cardDatabaseCache.has(resolvedThemeId)) {
    return cardDatabaseCache.get(resolvedThemeId);
  }

  const database = await loadCardDatabase(resolvedThemeId);
  cardDatabaseCache.set(resolvedThemeId, database);
  return database;
}

async function loadCardDatabase(themeId = DEFAULT_THEME_ID) {
  const source = getThemeCardSource(themeId);
  const requestedUrl = new URL(source.path, window.location.href).href;
  let response;

  try {
    response = await fetch(source.path);
  } catch (error) {
    logCardsLoadError(error, requestedUrl, source.fileName, response);
    throw error;
  }

  if (!response.ok) {
    const error = new Error(`${source.fileName} returned ${response.status} ${response.statusText}`);
    logCardsLoadError(error, requestedUrl, source.fileName, response);
    throw error;
  }

  try {
    return parseCardsText(await response.text(), source.fileName);
  } catch (error) {
    logCardsLoadError(error, requestedUrl, source.fileName, response);
    throw error;
  }
}

function logCardsLoadError(error, requestedUrl, fileName, response = null) {
  console.error(`Не удалось загрузить ${fileName}`, {
    currentUrl: window.location.href,
    requestedUrl,
    status: response ? `${response.status} ${response.statusText}` : "нет ответа",
    error
  });
}

function parseCardsText(text, fileName = "cards.txt") {
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

  validateCardDatabase(database, fileName);
  return database;
}

function validateCardDatabase(database, fileName = "cards.txt") {
  const missing = requiredCardSections.filter((section) => !database[section]?.length);

  if (missing.length > 0) {
    throw new Error(`${fileName} missing cards for: ${missing.join(", ")}`);
  }
}

function setGenerationReady(isReady) {
  cardsAreReady = Boolean(isReady);
  updateControlAvailability();
}

async function generateLocalPack() {
  if (!isHostView()) {
    setStatus("Генерировать пак может только ведущий.", "error");
    return false;
  }

  if (!cardsAreReady) {
    setStatus("Карты еще загружаются.", "error");
    return false;
  }

  const settings = getSettings();
  const source = getThemeCardSource(settings.theme);

  setGenerationReady(false);

  try {
    cardDatabase = await loadCardsForTheme(settings.theme);
  } catch (error) {
    console.error(error);
    setStatus(`Не удалось загрузить ${source.fileName}. Проверь, что файл существует и называется точно «${source.fileName}».`, "error");
    setGenerationReady(true);
    return false;
  }

  const pack = createLocalPack(settings);
  pack.settings = settings;

  resetGameState(pack);
  renderPack(pack);

  if (isOnlineRoom()) {
    socket.emit("host-generate-pack", { roomCode: currentRoomCode, pack });
    setStatus("", "");
    setGenerationReady(true);
    return true;
  }

  setStatus("", "");
  setGenerationReady(true);
  return true;
}

function createLocalPack(settings) {
  const playerCount = Number(settings.playerCount || 6);
  const themeId = getThemeById(settings.theme || DEFAULT_THEME_ID).id;
  const availableSlots = Math.floor(playerCount / 2);
  const catastrophe = { ...pickRandom(window.BUNKER_DATA.catastrophes) };
  const bunker = createRandomizedBunker(pickRandom(window.BUNKER_DATA.bunkers), availableSlots);
  const drawState = createDrawState();
  const specialAbilityHands = createSpecialAbilityHands(playerCount, drawState);

  const players = Array.from({ length: playerCount }, (_, index) => createLocalPlayer(index, specialAbilityHands[index], drawState));

  // Для темы Фэнтези: если в разделе "Пол" хранятся расы — генерируем итоговый пол на основании расы
  if (themeId === "fantasy") {
    players.forEach((p) => {
      const race = cleanText(p.gender, "");
      p.gender = getGenderByRace(race);
    });
  }

  return {
    themeId,
    catastrophe,
    bunker,
    players
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
  const race = drawCard("Раса", drawState);
  const age = getAgeByRace(race);

  return {
    number: index + 1,
    race,
    gender: drawCard(cardSections.gender, drawState),
    age: age,
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

function updatePackSummary(pack) {
  if (!packSummary) {
    return;
  }

  if (!pack?.players?.length) {
    packSummary.hidden = true;
    packSummary.textContent = "";
    return;
  }

  const playerCount = pack.players.length;
  const bunkerSlots = pack.bunker?.availableSlots ?? Math.floor(playerCount / 2);
  const theme = pack.settings?.themeName || getThemeById(pack.settings?.theme || pack.themeId || themeSelect?.value).name;
  const style = pack.settings?.style || getSelectedText(styleSelect);

  packSummary.textContent = `Пак сгенерирован | Игроков: ${playerCount} | Мест в бункере: ${bunkerSlots} | Тема: ${theme} | Стиль: ${style}`;
  packSummary.hidden = false;
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

function setCharacterView(view) {
  if (![VIEW_CARDS, VIEW_TABLE].includes(view) || characterView === view) {
    updateViewToggle();
    return;
  }

  characterView = view;

  try {
    localStorage.setItem(CHARACTER_VIEW_STORAGE_KEY, characterView);
  } catch (error) {
    // Keep the selected view for this session when storage is blocked.
  }

  updateViewToggle();

  if (currentPack?.players) {
    renderCharacters(currentPack.players);
  }
}

function updateViewToggle() {
  cardViewButton?.classList.toggle("active", characterView === VIEW_CARDS);
  tableViewButton?.classList.toggle("active", characterView === VIEW_TABLE);
  cardViewButton?.setAttribute("aria-pressed", String(characterView === VIEW_CARDS));
  tableViewButton?.setAttribute("aria-pressed", String(characterView === VIEW_TABLE));
}

function renderPack(pack) {
  currentPack = pack;
  updatePackSummary(pack);
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
  characterGrid.classList.toggle("cards-view", characterView === VIEW_CARDS);
  characterGrid.classList.toggle("table-view", characterView === VIEW_TABLE);
  characterGrid.dataset.playerCount = String(characters.length);
  updateViewToggle();

  if (characterView === VIEW_TABLE) {
    renderPlayersTable(characters);
    return;
  }

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

  if (newlyRevealedTraitKeys.size > 0) {
    window.setTimeout(() => {
      newlyRevealedTraitKeys.clear();
    }, 240);
  }
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

helpButton?.addEventListener("click", (event) => {
  event.stopPropagation();
  openHelpPanel();
});
helpCloseButton?.addEventListener("click", closeHelpPanel);
helpModal?.addEventListener("click", (event) => {
  if (event.target === helpModal) {
    closeHelpPanel();
  }
});

settingsPanelButton?.addEventListener("click", () => openSetupModal("gameSettingsModal"));
roomPanelButton?.addEventListener("click", () => openSetupModal("roomSetupModal"));
rolePanelButton?.addEventListener("click", () => openSetupModal("roleSetupModal"));
setupModals.forEach((modal) => {
  modal.addEventListener("click", (event) => {
    if (event.target === modal || event.target.closest("[data-close-setup]")) {
      closeAllSetupModals();
    }
  });
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

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    closeAllSetupModals();
    closeHelpPanel();
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

generateButton.addEventListener("click", handleGeneratePackAction);
randomThemeButton.addEventListener("click", selectRandomTheme);
cardViewButton?.addEventListener("click", () => setCharacterView(VIEW_CARDS));
tableViewButton?.addEventListener("click", () => setCharacterView(VIEW_TABLE));
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", () => {
    createRoomButton?.addEventListener("click", createOnlineRoom);
  }, { once: true });
} else {
  createRoomButton?.addEventListener("click", createOnlineRoom);
}
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
renderThemeOptions();
updateRoleControls();
updateViewToggle();

if (window.location.protocol === "file:") {
  const message = `Открой сайт через сервер: ${PUBLIC_APP_URL}. Не открывай index.html напрямую.`;
  console.error(message);
  setStatus(message, "error");
} else {
  initializeSocket();
  loadCardDatabase()
    .then((database) => {
      cardDatabase = database;
      cardDatabaseCache.set(DEFAULT_THEME_ID, database);
      const defaultPack = createLocalPack({ playerCount: 6 });
      resetGameState(defaultPack);
      renderPack(defaultPack);
      setGenerationReady(true);
      setStatus(appRole ? (isHostView() ? "Режим ведущего включен." : "Режим игрока включен.") : "Выберите роль перед началом игры.", "");
    })
    .catch((error) => {
      console.error("cards.txt недоступен, используется встроенный резервный набор.", error);
      cardDatabase = createFallbackCardDatabase();
      cardDatabaseCache.set(DEFAULT_THEME_ID, cardDatabase);
      const defaultPack = createLocalPack({ playerCount: 6 });
      resetGameState(defaultPack);
      renderPack(defaultPack);
      setGenerationReady(true);
      setStatus("Не удалось загрузить cards.txt. Используется встроенный резервный набор.", "error");
    });
}
