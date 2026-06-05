const ADMIN_PASSWORD = "sports2027";
const DATA_DOC = window.db.collection("sportsFestival").doc("main");

const classes = [
  "1-1","1-2","1-3","1-4","1-5","1-6",
  "2-1","2-2","2-3","2-4","2-5","2-6","2-7",
  "3-1","3-2","3-3","3-4","3-5","3-6"
];

const grades = ["1年", "2年", "3年"];

let selectedClass = localStorage.getItem("selectedClass") || "";
let sports = [];
let venues = [];
let matches = [];
let scoreRules = {};
let sportTypes = {};
let sportDelays = {};
let thirdPlaceSettings = {};
let matchSchedules = {};
let seedSettings = [];
let resultPublished = false;
let announcements = [];

let isAdmin = false;
let currentPage = "home";
let dataLoaded = false;

DATA_DOC.onSnapshot((doc) => {
  const data = doc.exists ? doc.data() : {};

  sports = data.sports || [];
  venues = data.venues || [];
  matches = data.matches || [];
  scoreRules = data.scoreRules || {};
  sportTypes = data.sportTypes || {};
  sportDelays = data.sportDelays || {};
  thirdPlaceSettings = data.thirdPlaceSettings || {};
  matchSchedules = data.matchSchedules || {};
  seedSettings = data.seedSettings || [];
  resultPublished = data.resultPublished || false;
  announcements = data.announcements || [];

  matches = matches.map(m => ({
    id: m.id || Date.now() + Math.random(),
    sport: m.sport || "未設定競技",
    venue: m.venue || "未定",
    start: m.start || "",
    end: m.end || "",
    a: m.a,
    b: m.b,
    winner: m.winner || "",
    round: m.round || 1,
    matchNo: m.matchNo || 0,
    auto: m.auto || false,
    type: m.type || "normal",
    seedId: m.seedId || ""
  }));

  assignMissingMatchNumbers();

  sports.forEach(sport => {
    if(!scoreRules[sport]){
      scoreRules[sport] = { first: 50, second: 30, third: 20 };
    }
    if(!sportTypes[sport]){
      sportTypes[sport] = "class";
    }
    if(sportDelays[sport] === undefined){
      sportDelays[sport] = 0;
    }
    if(thirdPlaceSettings[sport] === undefined){
      thirdPlaceSettings[sport] = false;
    }
    if(!matchSchedules[sport]){
      matchSchedules[sport] = {};
    }
  });

  dataLoaded = true;
  renderCurrentPage();
});

function assignMissingMatchNumbers(){
  sports.forEach(sport => {
    const sportMatches = matches.filter(m => m.sport === sport && m.type !== "thirdPlace");
    const rounds = [...new Set(sportMatches.map(m => m.round))];

    rounds.forEach(round => {
      const list = sportMatches
        .filter(m => m.round === round)
        .sort((a,b) => a.id - b.id);

      list.forEach((m,index) => {
        if(!m.matchNo){
          m.matchNo = index + 1;
        }
      });
    });
  });

  matches
    .filter(m => m.type === "thirdPlace")
    .forEach(m => {
      if(!m.matchNo){
        m.matchNo = 1;
      }
    });
}

async function saveData(){
  await DATA_DOC.set({
    sports,
    venues,
    matches,
    scoreRules,
    sportTypes,
    sportDelays,
    thirdPlaceSettings,
    matchSchedules,
    seedSettings,
    resultPublished,
    announcements
  });
}

function renderCurrentPage(){
  if(!dataLoaded) return;

  if(currentPage === "home") showHome();
  if(currentPage === "schedule") showSchedule();
  if(currentPage === "tournament") showTournament();
  if(currentPage === "sports") showSports();
  if(currentPage === "admin" && isAdmin) showAdmin();
}

function classOptions(selected = ""){
  return classes.map(c => `
    <option ${c === selected ? "selected" : ""}>${c}</option>
  `).join("");
}

function teamOptions(selected = ""){
  return `
    <option disabled>--- クラス ---</option>
    ${classes.map(c => `
      <option ${c === selected ? "selected" : ""}>${c}</option>
    `).join("")}
    <option disabled>--- 学年競技用 ---</option>
    ${grades.map(g => `
      <option ${g === selected ? "selected" : ""}>${g}</option>
    `).join("")}
  `;
}

function sportOptions(selected = ""){
  if(sports.length === 0){
    return `<option value="">競技を追加してください</option>`;
  }

  return sports.map(s => `
    <option ${s === selected ? "selected" : ""}>${s}</option>
  `).join("");
}

function venueOptions(selected = ""){
  if(venues.length === 0){
    return `<option value="">会場を追加してください</option>`;
  }

  return venues.map(v => `
    <option ${v === selected ? "selected" : ""}>${v}</option>
  `).join("");
}

function getGradeOfClass(cls){
  if(cls.startsWith("1-")) return "1年";
  if(cls.startsWith("2-")) return "2年";
  if(cls.startsWith("3-")) return "3年";
  return "";
}

function isGradeTeam(team){
  return grades.includes(team);
}

function classBelongsToTeam(cls, team){
  if(team === cls) return true;
  if(isGradeTeam(team)) return getGradeOfClass(cls) === team;
  return false;
}

function roundName(round){
  if(round === 1) return "1回戦";
  if(round === 2) return "2回戦";
  if(round === 3) return "準々決勝";
  if(round === 4) return "準決勝";
  if(round === 5) return "決勝";
  return `${round}回戦`;
}

function matchLabel(match){
  if(match.type === "thirdPlace") return "3位決定戦";
  return `${roundName(match.round)} 第${match.matchNo || 1}試合`;
}

function scheduleLabel(schedule){
  if(schedule.type === "thirdPlace"){
    return "3位決定戦";
  }

  return `${roundName(Number(schedule.round))} 第${schedule.matchNo}試合`;
}

function timeToMinutes(time){
  if(!time) return null;
  const parts = time.split(":");
  return Number(parts[0]) * 60 + Number(parts[1]);
}

function minutesToTime(minutes){
  if(minutes === null || isNaN(minutes)) return "";
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${String(h).padStart(2,"0")}:${String(m).padStart(2,"0")}`;
}

function addMinutesToTime(time, delay){
  const mins = timeToMinutes(time);
  if(mins === null) return "";
  return minutesToTime(mins + delay);
}

function getDelay(sport){
  return Number(sportDelays[sport] || 0);
}

function displayTime(match){
  const delay = getDelay(match.sport);

  if(!match.start){
    return "時間未定";
  }

  const delayedStart = addMinutesToTime(match.start, delay);
  const delayedEnd = match.end ? addMinutesToTime(match.end, delay) : "";

  if(delay > 0){
    return `${delayedStart}〜${delayedEnd}（予定 ${match.start}〜${match.end} / ${delay}分遅れ）`;
  }

  return `${match.start}〜${match.end}`;
}

function announcementLabel(type){
  if(type === "urgent") return "🔴 緊急";
  if(type === "info") return "🟢 一般";
  if(type === "news") return "🟡 速報";
  return "📢 お知らせ";
}

function scheduleKey(round, matchNo, type = "normal"){
  if(type === "thirdPlace" || round === "thirdPlace"){
    return "thirdPlace-1";
  }

  return `${round}-${matchNo}`;
}

function getScheduleFor(sport, round, type = "normal", matchNo = 1){
  const key = scheduleKey(round, matchNo, type);
  const schedule = matchSchedules[sport]?.[key];

  return {
    venue: schedule?.venue || "未定",
    start: schedule?.start || "",
    end: schedule?.end || ""
  };
}

function opponentLabelFromSeed(seed){
  if(seed.opponentType === "team"){
    return seed.opponentTeam;
  }

  const match = matches.find(m => String(m.id) === String(seed.opponentMatchId));

  if(!match){
    return "指定試合が見つかりません";
  }

  return `${matchLabel(match)}：${match.a} vs ${match.b} の勝者`;
}

function getSeedOpponent(seed){
  if(seed.opponentType === "team"){
    return seed.opponentTeam;
  }

  const match = matches.find(m => String(m.id) === String(seed.opponentMatchId));

  if(!match || !match.winner){
    return "";
  }

  return match.winner;
}

function saveClass(){
  const select = document.getElementById("classSelect");

  if(!select.value){
    alert("クラスを選択してください");
    return;
  }

  selectedClass = select.value;
  localStorage.setItem("selectedClass", selectedClass);
  showHome();
}

function showHome(){
  currentPage = "home";

  const next = getNextMatchForClass(selectedClass);

  document.getElementById("page").innerHTML = `
    <div class="card">
      <h2>ようこそ</h2>
      <p>あなたのクラスを選択してください</p>

      <select id="classSelect">
        <option value="">クラスを選択</option>
        ${classOptions(selectedClass)}
      </select>

      <button onclick="saveClass()">クラスを保存</button>
    </div>

    <div class="card">
      <h2>📢 お知らせ</h2>
      ${renderAnnouncementsForStudents()}
    </div>

    <div class="card">
      <h2>次の予定</h2>
      ${
        selectedClass
        ? renderNextMatch(next)
        : `<p>クラスを選択してください</p>`
      }
    </div>

    ${
      resultPublished
      ? `
        <div class="card">
          <h2>🏆 総合順位</h2>
          ${renderPublicRanking()}
        </div>
      `
      : `
        <div class="card">
          <h2>🏆 総合順位</h2>
          <p>総合順位は閉会式まで非公開です。</p>
        </div>
      `
    }

    <div class="card">
      <h2>登録状況</h2>
      <p>競技数：${sports.length}</p>
      <p>会場数：${venues.length}</p>
      <p>試合数：${matches.length}</p>
      <p>シード設定数：${seedSettings.length}</p>
    </div>
  `;
}

function renderAnnouncementsForStudents(){
  if(announcements.length === 0){
    return `<p>現在お知らせはありません。</p>`;
  }

  return announcements
    .slice()
    .sort((a,b) => b.id - a.id)
    .map(a => `
      <div class="match">
        <strong>${announcementLabel(a.type)}：${a.title}</strong>
        <p>${a.message}</p>
        <p>${a.time}</p>
      </div>
    `).join("");
}

function getNextMatchForClass(cls){
  if(!cls) return null;

  const list = matches
    .filter(m => classBelongsToTeam(cls, m.a) || classBelongsToTeam(cls, m.b))
    .filter(m => !m.winner)
    .sort((a,b) => {
      const aTime = timeToMinutes(a.start);
      const bTime = timeToMinutes(b.start);

      if(aTime !== null && bTime !== null){
        return (aTime + getDelay(a.sport)) - (bTime + getDelay(b.sport));
      }

      if(a.round !== b.round) return a.round - b.round;

      return (a.start || "99:99").localeCompare(b.start || "99:99");
    });

  return list[0] || null;
}

function renderNextMatch(match){
  if(!match){
    return `<p>現在、予定はありません</p>`;
  }

  const opponent = classBelongsToTeam(selectedClass, match.a) ? match.b : match.a;

  return `
    <div class="schedule-item">
      <p class="time">${displayTime(match)}</p>
      <h3>${match.sport}</h3>
      <p>🆚 ${opponent}</p>
      <p class="place">📍 ${match.venue}</p>
      <p>${matchLabel(match)}</p>
    </div>
  `;
}

function showSchedule(){
  currentPage = "schedule";

  if(!selectedClass){
    document.getElementById("page").innerHTML = `
      <div class="card">
        <h2>予定表</h2>
        <p>先にホームでクラスを選択してください。</p>
      </div>
    `;
    return;
  }

  const myMatches = matches
    .filter(m => classBelongsToTeam(selectedClass, m.a) || classBelongsToTeam(selectedClass, m.b))
    .sort((a,b) => {
      const aTime = timeToMinutes(a.start);
      const bTime = timeToMinutes(b.start);

      if(aTime !== null && bTime !== null){
        return (aTime + getDelay(a.sport)) - (bTime + getDelay(b.sport));
      }

      if(a.round !== b.round) return a.round - b.round;

      return (a.start || "99:99").localeCompare(b.start || "99:99");
    });

  let html = `
    <div class="card">
      <h2>📅 ${selectedClass} の予定</h2>
  `;

  if(myMatches.length === 0){
    html += `<p>まだ予定はありません。</p>`;
  }else{
    myMatches.forEach(match => {
      const opponent = classBelongsToTeam(selectedClass, match.a) ? match.b : match.a;

      html += `
        <div class="schedule-item">
          <p class="time">${displayTime(match)}</p>
          <h3>${match.sport}</h3>
          <p>🆚 ${opponent}</p>
          <p class="place">📍 ${match.venue}</p>
          <p>${matchLabel(match)}</p>
          <p>勝者：<span class="winner">${match.winner || "未定"}</span></p>
        </div>
      `;
    });
  }

  html += `</div>`;
  document.getElementById("page").innerHTML = html;
}

function showTournament(){
  currentPage = "tournament";

  let html = `
    <div class="card">
      <h2>🏆 トーナメント表</h2>
      <p>横にスクロールできます。</p>
  `;

  if(matches.length === 0){
    html += `<p>まだ試合が登録されていません。</p>`;
  }else{
    const sportsList = [...new Set(matches.map(m => m.sport))];

    sportsList.forEach(sport => {
      const delay = getDelay(sport);
      const thirdText = thirdPlaceSettings[sport]
        ? "3位決定戦あり"
        : "3位決定戦なし（同率3位）";

      html += `
        <div class="sport-card">
          <h3>${sport}</h3>
          <p>${thirdText}</p>
          ${
            delay > 0
            ? `<p class="winner">現在 ${delay}分遅れ</p>`
            : `<p>遅れなし</p>`
          }
          ${renderBracketForSport(sport)}
        </div>
      `;
    });
  }

  html += `</div>`;
  document.getElementById("page").innerHTML = html;
}

function renderBracketForSport(sport){
  const normalMatches = matches
    .filter(m => m.sport === sport && m.type !== "thirdPlace")
    .sort((a,b) => {
      if(a.round !== b.round) return a.round - b.round;

      if(a.matchNo !== b.matchNo) return a.matchNo - b.matchNo;

      const aTime = timeToMinutes(a.start);
      const bTime = timeToMinutes(b.start);

      if(aTime !== null && bTime !== null){
        return (aTime + getDelay(a.sport)) - (bTime + getDelay(b.sport));
      }

      return (a.start || "99:99").localeCompare(b.start || "99:99");
    });

  const thirdMatch = matches.find(m => m.sport === sport && m.type === "thirdPlace");
  const sportSeeds = seedSettings.filter(s => s.sport === sport);

  if(normalMatches.length === 0 && sportSeeds.length === 0){
    return `<p>この競技の試合はまだありません。</p>`;
  }

  const rounds = [...new Set([
    ...normalMatches.map(m => m.round),
    ...sportSeeds.map(s => Number(s.round))
  ])].sort((a,b) => a - b);

  let html = `
    <div style="overflow-x:auto;padding:10px 0;">
      <div style="display:flex;gap:14px;align-items:flex-start;min-width:max-content;">
  `;

  rounds.forEach(round => {
    const roundMatches = normalMatches.filter(m => m.round === round);
    const roundSeeds = sportSeeds.filter(s => Number(s.round) === Number(round));

    html += `
      <div style="min-width:220px;">
        <div style="
          background:#2e7d32;
          color:white;
          padding:8px;
          border-radius:8px;
          text-align:center;
          font-weight:bold;
          margin-bottom:10px;
        ">
          ${roundName(round)}
        </div>
    `;

    roundSeeds.forEach(seed => {
      const alreadyCreated = matches.some(m => String(m.seedId) === String(seed.id));

      html += `
        <div style="
          border:2px dashed #fbc02d;
          border-radius:12px;
          background:#fffde7;
          margin-bottom:14px;
          padding:10px;
        ">
          <strong>⭐ シード</strong>
          <p>${seed.team}</p>
          <p>第${seed.matchNo}試合予定</p>
          <p>相手：${opponentLabelFromSeed(seed)}</p>
          <p>📍 ${seed.venue}</p>
          <p>${alreadyCreated ? "試合作成済み" : "相手確定待ち"}</p>
        </div>
      `;
    });

    roundMatches.forEach(match => {
      const winnerA = match.winner === match.a;
      const winnerB = match.winner === match.b;

      html += `
        <div style="
          border:2px solid #c8e6c9;
          border-radius:12px;
          background:white;
          margin-bottom:14px;
          padding:10px;
          box-shadow:0 2px 5px rgba(0,0,0,0.08);
        ">
          <div style="
            padding:8px;
            border-radius:8px;
            background:${winnerA ? "#e8f5e9" : "#fafafa"};
            font-weight:${winnerA ? "bold" : "normal"};
          ">
            ${winnerA ? "✅ " : ""}${match.a}
          </div>

          <div style="text-align:center;font-size:12px;color:#777;margin:4px 0;">
            vs
          </div>

          <div style="
            padding:8px;
            border-radius:8px;
            background:${winnerB ? "#e8f5e9" : "#fafafa"};
            font-weight:${winnerB ? "bold" : "normal"};
          ">
            ${winnerB ? "✅ " : ""}${match.b}
          </div>

          <div style="margin-top:8px;font-size:13px;color:#555;">
            <div>${matchLabel(match)}</div>
            <div>⏰ ${displayTime(match)}</div>
            <div>📍 ${match.venue}</div>
            <div>勝者：<strong>${match.winner || "未定"}</strong></div>
          </div>
        </div>
      `;
    });

    html += `</div>`;
  });

  html += `</div></div>`;

  if(thirdMatch){
    html += `
      <div style="
        margin-top:15px;
        padding:12px;
        border:2px solid #fbc02d;
        border-radius:12px;
        background:#fffde7;
      ">
        <h3>🥉 3位決定戦</h3>
        <p><strong>${thirdMatch.a} vs ${thirdMatch.b}</strong></p>
        <p>⏰ ${displayTime(thirdMatch)}</p>
        <p>📍 ${thirdMatch.venue}</p>
        <p>勝者：<strong>${thirdMatch.winner || "未定"}</strong></p>
      </div>
    `;
  }

  return html;
}

function showSports(){
  currentPage = "sports";

  let html = `
    <div class="card">
      <h2>🎯 競技一覧</h2>
  `;

  if(sports.length === 0){
    html += `<p>まだ競技が登録されていません。</p>`;
  }else{
    sports.forEach(sport => {
      const count = matches.filter(m => m.sport === sport).length;
      const typeText = sportTypes[sport] === "grade" ? "学年競技" : "クラス競技";
      const delay = getDelay(sport);
      const thirdText = thirdPlaceSettings[sport] ? "3位決定戦あり" : "3位決定戦なし";

      html += `
        <div class="sport-card">
          <div class="sport-title">${sport}</div>
          <p>種類：${typeText}</p>
          <p>${thirdText}</p>
          <p>登録試合数：${count}</p>
          <p>${delay > 0 ? `${delay}分遅れ` : "遅れなし"}</p>
        </div>
      `;
    });
  }

  html += `</div>`;
  document.getElementById("page").innerHTML = html;
}

function showAdminLogin(){
  currentPage = "adminLogin";

  document.getElementById("page").innerHTML = `
    <div class="card admin-panel">
      <h2>🔐 管理者ログイン</h2>
      <input type="password" id="adminPassword" placeholder="パスワード">
      <button onclick="loginAdmin()">ログイン</button>
      <p>試作版PW：sports2027</p>
    </div>
  `;
}

function loginAdmin(){
  const pw = document.getElementById("adminPassword").value;

  if(pw === ADMIN_PASSWORD){
    isAdmin = true;
    currentPage = "admin";
    showAdmin();
  }else{
    alert("パスワードが違います");
  }
}

function showAdmin(){
  currentPage = "admin";

  if(!isAdmin){
    showAdminLogin();
    return;
  }

  document.getElementById("page").innerHTML = `
    <div class="card admin-panel">
      <h2>⚙ 管理画面</h2>

      <h3>🎯 競技追加</h3>
      <input id="sportInput" placeholder="例：🏀 バスケットボール">
      <select id="sportTypeInput">
        <option value="class">クラス競技</option>
        <option value="grade">学年競技</option>
      </select>
      <select id="thirdPlaceInput">
        <option value="false">3位決定戦なし</option>
        <option value="true">3位決定戦あり</option>
      </select>
      <button onclick="addSport()">競技を追加</button>

      <h3>📍 会場追加</h3>
      <input id="venueInput" placeholder="例：体育館A">
      <button onclick="addVenue()">会場を追加</button>

      <h3>📝 試合追加</h3>

      <label>競技</label>
      <select id="matchSport">
        ${sportOptions()}
      </select>

      <label>会場</label>
      <select id="matchVenue">
        ${venueOptions()}
      </select>

      <label>予定開始時間</label>
      <input type="time" id="matchStart">

      <label>予定終了時間</label>
      <input type="time" id="matchEnd">

      <label>チームA</label>
      <select id="teamA">
        ${teamOptions()}
      </select>

      <label>チームB</label>
      <select id="teamB">
        ${teamOptions()}
      </select>

      <button onclick="addMatch()">試合を追加</button>
    </div>

    <div class="card admin-panel">
      <h2>⏰ 2回戦以降の試合別予定設定</h2>

      <label>競技</label>
      <select id="scheduleSport">${sportOptions()}</select>

      <label>ラウンド</label>
      <select id="scheduleRound">
        <option value="2">2回戦</option>
        <option value="3">準々決勝</option>
        <option value="4">準決勝</option>
        <option value="5">決勝</option>
        <option value="thirdPlace">3位決定戦</option>
      </select>

      <label>試合番号</label>
      <input type="number" id="scheduleMatchNo" min="1" value="1" placeholder="例：1">

      <label>会場</label>
      <select id="scheduleVenue">${venueOptions()}</select>

      <label>開始時間</label>
      <input type="time" id="scheduleStart">

      <label>終了時間</label>
      <input type="time" id="scheduleEnd">

      <button onclick="saveMatchSchedule()">試合予定を保存</button>

      <h3>登録済み試合別予定</h3>
      ${renderMatchSchedules()}
    </div>

    <div class="card admin-panel">
      <h2>⭐ シード設定</h2>

      <label>競技</label>
      <select id="seedSport">${sportOptions()}</select>

      <label>シードチーム</label>
      <select id="seedTeam">${teamOptions()}</select>

      <label>開始ラウンド</label>
      <select id="seedRound">
        <option value="2">2回戦</option>
        <option value="3">準々決勝</option>
        <option value="4">準決勝</option>
        <option value="5">決勝</option>
      </select>

      <label>試合番号</label>
      <input type="number" id="seedMatchNo" min="1" value="1">

      <label>会場</label>
      <select id="seedVenue">${venueOptions()}</select>

      <label>試合相手</label>
      <select id="seedOpponent">
        ${seedOpponentOptions()}
      </select>

      <button onclick="addSeedSetting()">シードを追加</button>

      <h3>登録済みシード</h3>
      ${renderSeedSettings()}
    </div>

    <div class="card admin-panel">
      <h2>📢 お知らせ管理</h2>

      <label>種類</label>
      <select id="announcementType">
        <option value="urgent">🔴 緊急</option>
        <option value="info">🟢 一般</option>
        <option value="news">🟡 速報</option>
      </select>

      <label>タイトル</label>
      <input id="announcementTitle" placeholder="例：会場変更">

      <label>内容</label>
      <textarea id="announcementMessage" placeholder="例：ドッジボールは体育館AからグラウンドBへ変更です"></textarea>

      <button onclick="addAnnouncement()">お知らせを投稿</button>

      <h3>投稿済みお知らせ</h3>
      ${renderAdminAnnouncements()}
    </div>

    <div class="card admin-panel">
      <h2>🏆 閉会式モード</h2>
      <p>現在：${resultPublished ? "結果公開中" : "結果非公開"}</p>
      ${
        resultPublished
        ? `<button class="danger" onclick="unpublishResult()">結果を非公開に戻す</button>`
        : `<button onclick="publishResult()">結果を公開する</button>`
      }
    </div>

    <div class="card admin-panel">
      <h2>⏰ 競技ごとの遅延管理</h2>
      ${renderDelayControls()}
    </div>

    <div class="card admin-panel">
      <h2>登録済み競技・得点設定</h2>
      ${renderAdminSports()}
    </div>

    <div class="card admin-panel">
      <h2>登録済み会場</h2>
      ${renderAdminVenues()}
    </div>

    <div class="card admin-panel">
      <h2>登録済み試合</h2>
      ${renderAdminMatches()}
    </div>

    <div class="card admin-panel">
      <h2>📊 得点集計</h2>
      ${renderRanking()}
    </div>

    <div class="card admin-panel">
      <button class="danger" onclick="resetAllData()">全データ削除</button>
    </div>
  `;
}

function seedOpponentOptions(){
  let html = "";

  html += `<option disabled>--- 指定チーム ---</option>`;

  classes.forEach(c => {
    html += `<option value="team:${c}">${c}</option>`;
  });

  grades.forEach(g => {
    html += `<option value="team:${g}">${g}</option>`;
  });

  html += `<option disabled>--- 試合の勝者 ---</option>`;

  matches
    .filter(m => m.type !== "thirdPlace")
    .sort((a,b) => {
      if(a.sport !== b.sport) return a.sport.localeCompare(b.sport);
      if(a.round !== b.round) return a.round - b.round;
      if(a.matchNo !== b.matchNo) return a.matchNo - b.matchNo;
      return a.id - b.id;
    })
    .forEach(m => {
      html += `
        <option value="match:${m.id}">
          ${m.sport} / ${matchLabel(m)} / ${m.a} vs ${m.b} の勝者
        </option>
      `;
    });

  return html;
}

async function saveMatchSchedule(){
  const sport = document.getElementById("scheduleSport").value;
  const roundValue = document.getElementById("scheduleRound").value;
  const matchNo = Number(document.getElementById("scheduleMatchNo").value);
  const venue = document.getElementById("scheduleVenue").value;
  const start = document.getElementById("scheduleStart").value;
  const end = document.getElementById("scheduleEnd").value;

  if(!sport || !roundValue || !matchNo || !venue || !start || !end){
    alert("競技・ラウンド・試合番号・会場・時間を入力してください");
    return;
  }

  const type = roundValue === "thirdPlace" ? "thirdPlace" : "normal";
  const round = roundValue === "thirdPlace" ? "thirdPlace" : Number(roundValue);
  const key = scheduleKey(round, matchNo, type);

  if(!matchSchedules[sport]){
    matchSchedules[sport] = {};
  }

  matchSchedules[sport][key] = {
    sport,
    round,
    matchNo,
    type,
    venue,
    start,
    end
  };

  applySavedScheduleToExistingMatches(sport, round, matchNo, type);

  await saveData();
}

function applySavedScheduleToExistingMatches(sport, round, matchNo, type){
  matches.forEach(match => {
    const sameSport = match.sport === sport;
    const sameType = type === "thirdPlace"
      ? match.type === "thirdPlace"
      : match.type !== "thirdPlace";

    const sameRound = type === "thirdPlace"
      ? true
      : Number(match.round) === Number(round);

    const sameMatchNo = Number(match.matchNo || 1) === Number(matchNo);

    if(sameSport && sameType && sameRound && sameMatchNo){
      const s = getScheduleFor(sport, round, type, matchNo);
      match.venue = s.venue;
      match.start = s.start;
      match.end = s.end;
    }
  });
}

function renderMatchSchedules(){
  if(Object.keys(matchSchedules).length === 0){
    return `<p>まだ試合別予定はありません。</p>`;
  }

  let html = "";

  Object.keys(matchSchedules).forEach(sport => {
    Object.keys(matchSchedules[sport]).forEach(key => {
      const s = matchSchedules[sport][key];

      html += `
        <div class="match">
          <strong>${sport} / ${scheduleLabel(s)}</strong>
          <p>📍 ${s.venue}</p>
          <p>⏰ ${s.start}〜${s.end}</p>
          <button class="danger" onclick="deleteMatchSchedule('${sport}','${key}')">
            削除
          </button>
        </div>
      `;
    });
  });

  return html;
}

async function deleteMatchSchedule(sport, key){
  if(!confirm("この試合予定を削除しますか？")) return;

  delete matchSchedules[sport][key];

  await saveData();
}

async function addSeedSetting(){
  const sport = document.getElementById("seedSport").value;
  const team = document.getElementById("seedTeam").value;
  const round = Number(document.getElementById("seedRound").value);
  const matchNo = Number(document.getElementById("seedMatchNo").value);
  const venue = document.getElementById("seedVenue").value;
  const opponentValue = document.getElementById("seedOpponent").value;

  if(!sport || !team || !round || !matchNo || !venue || !opponentValue){
    alert("シード情報をすべて入力してください");
    return;
  }

  const [opponentType, opponentId] = opponentValue.split(":");

  if(team === opponentId){
    alert("同じチーム同士は登録できません");
    return;
  }

  if(sportTypes[sport] === "grade"){
    if(!isGradeTeam(team)){
      alert("学年競技のシードは学年を選んでください");
      return;
    }
  }

  if(sportTypes[sport] === "class"){
    if(isGradeTeam(team)){
      alert("クラス競技のシードはクラスを選んでください");
      return;
    }
  }

  seedSettings.push({
    id: Date.now() + Math.random(),
    sport,
    team,
    round,
    matchNo,
    venue,
    opponentType,
    opponentTeam: opponentType === "team" ? opponentId : "",
    opponentMatchId: opponentType === "match" ? opponentId : ""
  });

  applySeedSettings(sport);

  await saveData();
}

function renderSeedSettings(){
  if(seedSettings.length === 0){
    return `<p>シード設定はまだありません。</p>`;
  }

  return seedSettings
    .slice()
    .sort((a,b) => {
      if(a.sport !== b.sport) return a.sport.localeCompare(b.sport);
      if(a.round !== b.round) return a.round - b.round;
      return a.matchNo - b.matchNo;
    })
    .map(seed => {
      const created = matches.some(m => String(m.seedId) === String(seed.id));

      return `
        <div class="match">
          <strong>${seed.sport} / ${roundName(seed.round)} 第${seed.matchNo}試合</strong>
          <p>⭐ シード：${seed.team}</p>
          <p>相手：${opponentLabelFromSeed(seed)}</p>
          <p>📍 ${seed.venue}</p>
          <p>${created ? "試合作成済み" : "相手確定待ち"}</p>
          <button class="danger" onclick="deleteSeedSetting(${seed.id})">
            削除
          </button>
        </div>
      `;
    }).join("");
}

async function deleteSeedSetting(id){
  if(!confirm("このシード設定を削除しますか？")) return;

  seedSettings = seedSettings.filter(s => String(s.id) !== String(id));
  matches = matches.filter(m => String(m.seedId) !== String(id));

  await saveData();
}

function applySeedSettings(sport){
  const seeds = seedSettings.filter(s => s.sport === sport);

  seeds.forEach(seed => {
    const alreadyCreated = matches.some(m => String(m.seedId) === String(seed.id));
    if(alreadyCreated) return;

    const opponent = getSeedOpponent(seed);
    if(!opponent) return;

    const schedule = getScheduleFor(seed.sport, seed.round, "normal", seed.matchNo);

    matches.push({
      id: Date.now() + Math.random(),
      sport: seed.sport,
      venue: schedule.venue !== "未定" ? schedule.venue : seed.venue,
      start: schedule.start,
      end: schedule.end,
      a: seed.team,
      b: opponent,
      winner: "",
      round: seed.round,
      matchNo: seed.matchNo,
      auto: true,
      type: "normal",
      seedId: seed.id
    });
  });
}

async function addAnnouncement(){
  const type = document.getElementById("announcementType").value;
  const title = document.getElementById("announcementTitle").value.trim();
  const message = document.getElementById("announcementMessage").value.trim();

  if(!title || !message){
    alert("タイトルと内容を入力してください");
    return;
  }

  const now = new Date();
  const time = `${now.getHours()}:${String(now.getMinutes()).padStart(2,"0")}`;

  announcements.push({
    id: Date.now(),
    type,
    title,
    message,
    time
  });

  await saveData();
}

function renderAdminAnnouncements(){
  if(announcements.length === 0){
    return `<p>お知らせはまだありません。</p>`;
  }

  return announcements
    .slice()
    .sort((a,b) => b.id - a.id)
    .map(a => `
      <div class="match">
        <strong>${announcementLabel(a.type)}：${a.title}</strong>
        <p>${a.message}</p>
        <p>${a.time}</p>
        <button class="danger" onclick="deleteAnnouncement(${a.id})">
          削除
        </button>
      </div>
    `).join("");
}

async function deleteAnnouncement(id){
  if(!confirm("このお知らせを削除しますか？")) return;

  announcements = announcements.filter(a => a.id !== id);

  await saveData();
}

async function publishResult(){
  if(!confirm("総合順位を生徒画面に公開しますか？")) return;

  resultPublished = true;
  await saveData();
}

async function unpublishResult(){
  if(!confirm("総合順位を非公開に戻しますか？")) return;

  resultPublished = false;
  await saveData();
}

function renderDelayControls(){
  if(sports.length === 0){
    return `<p>競技を追加すると遅延管理ができます。</p>`;
  }

  return sports.map((sport,index) => {
    const delay = getDelay(sport);

    return `
      <div class="sport-card">
        <div class="sport-title">${sport}</div>
        <p>${delay > 0 ? `現在 ${delay}分遅れ` : "現在 遅れなし"}</p>

        <label>遅れを入力・調整（分）</label>
        <input type="number" id="delay-${index}" value="${delay}" min="0">

        <button onclick="setDelay(${index})">
          遅れを保存
        </button>

        <button onclick="increaseDelay(${index},5)">
          ＋5分遅れ
        </button>

        <button onclick="decreaseDelay(${index},5)">
          −5分回復
        </button>

        <button class="secondary" onclick="clearDelay(${index})">
          遅れなしに戻す
        </button>
      </div>
    `;
  }).join("");
}

async function setDelay(index){
  const sport = sports[index];
  const value = Number(document.getElementById(`delay-${index}`).value);

  sportDelays[sport] = Math.max(0, value);

  await saveData();
}

async function increaseDelay(index, minutes){
  const sport = sports[index];

  sportDelays[sport] = getDelay(sport) + minutes;

  await saveData();
}

async function decreaseDelay(index, minutes){
  const sport = sports[index];

  sportDelays[sport] = Math.max(0, getDelay(sport) - minutes);

  await saveData();
}

async function clearDelay(index){
  const sport = sports[index];

  sportDelays[sport] = 0;

  await saveData();
}

async function addSport(){
  const value = document.getElementById("sportInput").value.trim();
  const type = document.getElementById("sportTypeInput").value;
  const thirdPlace = document.getElementById("thirdPlaceInput").value === "true";

  if(!value){
    alert("競技名を入力してください");
    return;
  }

  if(sports.includes(value)){
    alert("同じ競技がすでにあります");
    return;
  }

  sports.push(value);
  sportTypes[value] = type;
  sportDelays[value] = 0;
  thirdPlaceSettings[value] = thirdPlace;
  matchSchedules[value] = {};
  scoreRules[value] = { first: 50, second: 30, third: 20 };

  await saveData();
}

async function addVenue(){
  const value = document.getElementById("venueInput").value.trim();

  if(!value){
    alert("会場名を入力してください");
    return;
  }

  if(venues.includes(value)){
    alert("同じ会場がすでにあります");
    return;
  }

  venues.push(value);

  await saveData();
}

async function addMatch(){
  const sport = document.getElementById("matchSport").value;
  const venue = document.getElementById("matchVenue").value;
  const start = document.getElementById("matchStart").value;
  const end = document.getElementById("matchEnd").value;
  const a = document.getElementById("teamA").value;
  const b = document.getElementById("teamB").value;

  if(!sport || !venue || !start || !end){
    alert("競技・会場・時間を入力してください");
    return;
  }

  if(a === b){
    alert("同じチーム同士の試合は登録できません");
    return;
  }

  if(sportTypes[sport] === "grade"){
    if(!isGradeTeam(a) || !isGradeTeam(b)){
      alert("学年競技では、1年・2年・3年を選択してください");
      return;
    }
  }

  if(sportTypes[sport] === "class"){
    if(isGradeTeam(a) || isGradeTeam(b)){
      alert("クラス競技では、クラスを選択してください");
      return;
    }
  }

  const round1Matches = matches.filter(
    m => m.sport === sport && m.round === 1 && m.type !== "thirdPlace"
  );

  matches.push({
    id: Date.now(),
    sport,
    venue,
    start,
    end,
    a,
    b,
    winner: "",
    round: 1,
    matchNo: round1Matches.length + 1,
    auto: false,
    type: "normal",
    seedId: ""
  });

  await saveData();
}

function renderAdminSports(){
  if(sports.length === 0){
    return `<p>競技はまだありません。</p>`;
  }

  return sports.map((sport,index) => {
    const rule = scoreRules[sport] || { first:50, second:30, third:20 };
    const typeText = sportTypes[sport] === "grade" ? "学年競技" : "クラス競技";
    const thirdText = thirdPlaceSettings[sport] ? "3位決定戦あり" : "3位決定戦なし";

    return `
      <div class="sport-card">
        <div class="sport-title">${sport}</div>
        <p>種類：${typeText}</p>
        <p>${thirdText}</p>

        <label>1位得点</label>
        <input type="number" id="first-${index}" value="${rule.first}">

        <label>2位得点</label>
        <input type="number" id="second-${index}" value="${rule.second}">

        <label>3位得点</label>
        <input type="number" id="third-${index}" value="${rule.third}">

        <label>3位決定戦</label>
        <select id="third-${index}-setting">
          <option value="false" ${!thirdPlaceSettings[sport] ? "selected" : ""}>なし</option>
          <option value="true" ${thirdPlaceSettings[sport] ? "selected" : ""}>あり</option>
        </select>

        <button onclick="updateSportSetting(${index})">競技設定を保存</button>
        <button class="danger" onclick="deleteSport(${index})">削除</button>
      </div>
    `;
  }).join("");
}

async function updateSportSetting(index){
  const sport = sports[index];

  scoreRules[sport] = {
    first: Number(document.getElementById(`first-${index}`).value),
    second: Number(document.getElementById(`second-${index}`).value),
    third: Number(document.getElementById(`third-${index}`).value)
  };

  thirdPlaceSettings[sport] =
    document.getElementById(`third-${index}-setting`).value === "true";

  await saveData();
}

function renderAdminVenues(){
  if(venues.length === 0){
    return `<p>会場はまだありません。</p>`;
  }

  return venues.map((venue,index) => `
    <div class="sport-card">
      <div>${venue}</div>
      <button class="danger" onclick="deleteVenue(${index})">削除</button>
    </div>
  `).join("");
}

function renderAdminMatches(){
  if(matches.length === 0){
    return `<p>試合はまだありません。</p>`;
  }

  return matches
    .sort((a,b) => {
      if(a.sport !== b.sport) return a.sport.localeCompare(b.sport);

      if(a.type === "thirdPlace" && b.type !== "thirdPlace") return 1;
      if(a.type !== "thirdPlace" && b.type === "thirdPlace") return -1;

      if(a.round !== b.round) return a.round - b.round;
      if(a.matchNo !== b.matchNo) return a.matchNo - b.matchNo;

      const aTime = timeToMinutes(a.start);
      const bTime = timeToMinutes(b.start);

      if(aTime !== null && bTime !== null){
        return (aTime + getDelay(a.sport)) - (bTime + getDelay(b.sport));
      }

      return (a.start || "99:99").localeCompare(b.start || "99:99");
    })
    .map(match => `
      <div class="match">
        <div class="match-title">
          ${match.sport}
          / ${matchLabel(match)}
          ${match.auto ? "（自動生成）" : ""}
        </div>

        <p>${match.a} vs ${match.b}</p>
        <p>📍 ${match.venue}</p>
        <p>⏰ ${displayTime(match)}</p>
        <p>勝者：<span class="winner">${match.winner || "未定"}</span></p>

        <button onclick="setWinner(${match.id}, '${match.a}')">
          ${match.a} 勝利
        </button>

        <button onclick="setWinner(${match.id}, '${match.b}')">
          ${match.b} 勝利
        </button>

        <h3>時間・会場編集</h3>

        <select id="venue-${match.id}">
          ${venueOptions(match.venue)}
        </select>

        <input type="time" id="start-${match.id}" value="${match.start}">
        <input type="time" id="end-${match.id}" value="${match.end}">

        <button class="secondary" onclick="updateMatchInfo(${match.id})">
          時間・会場を保存
        </button>

        <button class="danger" onclick="deleteMatch(${match.id})">
          試合削除
        </button>
      </div>
    `).join("");
}

async function updateMatchInfo(id){
  const match = matches.find(m => String(m.id) === String(id));
  if(!match) return;

  match.venue = document.getElementById(`venue-${id}`).value || "未定";
  match.start = document.getElementById(`start-${id}`).value;
  match.end = document.getElementById(`end-${id}`).value;

  await saveData();
}

async function setWinner(id,winner){
  const match = matches.find(m => String(m.id) === String(id));
  if(!match) return;

  match.winner = winner;

  generateNextRound(match.sport);
  applySeedSettings(match.sport);

  await saveData();
}

function getLoser(match){
  if(!match.winner) return "";
  return match.a === match.winner ? match.b : match.a;
}

function generateNextRound(sport){
  const normalMatches = matches.filter(m => m.sport === sport && m.type !== "thirdPlace");

  if(normalMatches.length === 0) return;

  const maxRound = Math.max(...normalMatches.map(m => m.round));

  const currentRoundMatches = normalMatches
    .filter(m => m.round === maxRound)
    .sort((a,b) => {
      if(a.matchNo !== b.matchNo) return a.matchNo - b.matchNo;
      return a.id - b.id;
    });

  if(currentRoundMatches.length <= 1) return;

  const allFinished = currentRoundMatches.every(m => m.winner);

  if(!allFinished) return;

  const nextRound = maxRound + 1;

  const nextRoundAlreadyExists =
    normalMatches.some(m => m.round === nextRound && !m.seedId);

  if(nextRoundAlreadyExists) return;

  const winners = currentRoundMatches.map(m => m.winner);

  let createdNo = 1;

  for(let i = 0; i < winners.length; i += 2){
    if(!winners[i + 1]) break;

    const schedule = getScheduleFor(sport, nextRound, "normal", createdNo);

    matches.push({
      id: Date.now() + Math.random(),
      sport,
      venue: schedule.venue,
      start: schedule.start,
      end: schedule.end,
      a: winners[i],
      b: winners[i + 1],
      winner: "",
      round: nextRound,
      matchNo: createdNo,
      auto: true,
      type: "normal",
      seedId: ""
    });

    createdNo++;
  }

  if(thirdPlaceSettings[sport] && currentRoundMatches.length === 2){
    const thirdAlreadyExists =
      matches.some(m => m.sport === sport && m.type === "thirdPlace");

    if(!thirdAlreadyExists){
      const loserA = getLoser(currentRoundMatches[0]);
      const loserB = getLoser(currentRoundMatches[1]);
      const schedule = getScheduleFor(sport, "thirdPlace", "thirdPlace", 1);

      if(loserA && loserB){
        matches.push({
          id: Date.now() + Math.random(),
          sport,
          venue: schedule.venue,
          start: schedule.start,
          end: schedule.end,
          a: loserA,
          b: loserB,
          winner: "",
          round: nextRound,
          matchNo: 1,
          auto: true,
          type: "thirdPlace",
          seedId: ""
        });
      }
    }
  }
}

function addScoreToTeam(scores, team, points){
  if(!team || !points) return;

  if(isGradeTeam(team)){
    classes.forEach(cls => {
      if(getGradeOfClass(cls) === team){
        scores[cls] += points;
      }
    });
  }else{
    scores[team] += points;
  }
}

function calculateScores(){
  const scores = {};

  classes.forEach(c => {
    scores[c] = 0;
  });

  sports.forEach(sport => {
    const normalMatches = matches.filter(m => m.sport === sport && m.type !== "thirdPlace");

    if(normalMatches.length === 0) return;

    const maxRound = Math.max(...normalMatches.map(m => m.round));
    const finalMatch = normalMatches.find(m => m.round === maxRound);

    if(!finalMatch || !finalMatch.winner) return;

    const rule = scoreRules[sport] || { first:50, second:30, third:20 };

    const first = finalMatch.winner;
    const second = finalMatch.a === first ? finalMatch.b : finalMatch.a;

    addScoreToTeam(scores, first, rule.first);
    addScoreToTeam(scores, second, rule.second);

    const semiFinals = normalMatches.filter(m => m.round === maxRound - 1);

    if(thirdPlaceSettings[sport]){
      const thirdMatch = matches.find(m => m.sport === sport && m.type === "thirdPlace");

      if(thirdMatch && thirdMatch.winner){
        addScoreToTeam(scores, thirdMatch.winner, rule.third);
      }
    }else{
      semiFinals.forEach(m => {
        if(!m.winner) return;

        const loser = getLoser(m);

        if(loser !== first && loser !== second){
          addScoreToTeam(scores, loser, rule.third);
        }
      });
    }
  });

  return scores;
}

function renderRanking(){
  const scores = calculateScores();

  const ranking = Object.entries(scores)
    .sort((a,b) => b[1] - a[1]);

  let html = `
    <p>※この順位は管理者画面だけに表示されます。</p>
    <p>※3位決定戦なしの場合は、準決勝敗退チームが同率3位扱いです。</p>
  `;

  ranking.forEach(([cls,score],index) => {
    html += `
      <div class="match">
        <strong>${index + 1}位　${cls}</strong>
        <p>${score}点</p>
      </div>
    `;
  });

  return html;
}

function renderPublicRanking(){
  const scores = calculateScores();

  const ranking = Object.entries(scores)
    .filter(([cls,score]) => score > 0)
    .sort((a,b) => b[1] - a[1])
    .slice(0,3);

  if(ranking.length === 0){
    return `<p>まだ結果がありません。</p>`;
  }

  let html = "";

  ranking.forEach(([cls,score],index) => {
    const medal = index === 0 ? "🥇" : index === 1 ? "🥈" : "🥉";

    html += `
      <div class="match">
        <strong>${medal} ${index + 1}位　${cls}</strong>
        <p>${score}点</p>
      </div>
    `;
  });

  return html;
}

async function deleteSport(index){
  if(!confirm("この競技を削除しますか？")) return;

  const sport = sports[index];

  sports.splice(index,1);
  delete scoreRules[sport];
  delete sportTypes[sport];
  delete sportDelays[sport];
  delete thirdPlaceSettings[sport];
  delete matchSchedules[sport];

  seedSettings = seedSettings.filter(s => s.sport !== sport);
  matches = matches.filter(m => m.sport !== sport);

  await saveData();
}

async function deleteVenue(index){
  if(!confirm("この会場を削除しますか？")) return;

  venues.splice(index,1);

  await saveData();
}

async function deleteMatch(id){
  if(!confirm("この試合を削除しますか？")) return;

  matches = matches.filter(m => String(m.id) !== String(id));

  await saveData();
}

async function resetAllData(){
  if(!confirm("すべてのデータを削除しますか？")) return;

  sports = [];
  venues = [];
  matches = [];
  scoreRules = {};
  sportTypes = {};
  sportDelays = {};
  thirdPlaceSettings = {};
  matchSchedules = {};
  seedSettings = [];
  resultPublished = false;
  announcements = [];

  await saveData();
}