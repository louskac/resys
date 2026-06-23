import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import authOptions from "@/lib/auth";
import { execSync } from "child_process";

interface VersionGroup {
  version: string;
  displayVersion: string;
  date: string;
  benefits: string[];
  files: string[];
}

let cachedUpdates: VersionGroup[] = [];
let cachedHead: string = "";

function getCommitUserBenefit(msg: string): string {
  const trimmed = msg.trim();
  const lower = trimmed.toLowerCase();

  // 1. Direct match mapping for existing commits
  const matches: Record<string, string> = {
    "feat: add Czech translation for v0.2.0 release message":
      "Optimalizace aktualizací: Přidán český popis pro hlavní verzi v0.2.0 rezervačního portálu.",
    "feat: B2B subscription billing, real-time sync, system updates timeline and local HTTPS proxy":
      "Rozsáhlý upgrade platformy: Nasazení kompletního systému předplatného a limitů pro organizace, okamžitá real-time synchronizace změn a spuštění přehledné historie systémových aktualizací.",
    "feat: add horizontal resource scheduler and superadmin payment cuts": 
      "Představujeme přehledný horizontální kalendář pro správu rozvrhů a nové možnosti konfigurace platebních provizí.",
    "feat: replace automatic scanner rescan with manual trigger button": 
      "Zvýšení spolehlivosti skenování QR lístků: Automatický rescan byl nahrazen spolehlivým manuálním spouštěčem.",
    "style: add descriptive icons to all reservation status badges": 
      "Přehlednější stavy rezervací: Všechny stavové štítky nyní obsahují přehledné a jasné ikony.",
    "feat: make calendar ticket QR code dynamic and improve dashboard status contrast": 
      "Vylepšení vzhledu a zabezpečení: Zvýšen kontrast barev pro stavy rezervací a nasazen dynamický QR kód pro lístky.",
    "feat: implement secure dynamic QR verification to prevent screenshots": 
      "Ochrana proti podvodům: Zavedena dynamická verifikace QR kódů zabraňující vstupu pomocí snímků obrazovky.",
    "feat: implement resource technical breaks and restore user B2B partner connection": 
      "Nové možnosti správy: Zavedena podpora pro technické přestávky sportoviště (úklid, servis) a oprava B2B partnerských vazeb.",
    "feat: implement local HTTPS, partner invoicing, payment simulator, theme-awareness and checkout routing fixes": 
      "Rozsáhlá aktualizace: Nasazení zabezpečeného protokolu HTTPS, fakturace pro partnery, platební simulátor a podpora vizuálních šablon.",
    "feat: multi-tenant administration, billing & mobile UX optimizations": 
      "Optimalizace rozhraní: Správa více organizací (Multi-tenant) a zjednodušení uživatelského zážitku na mobilech.",
    "feat: AI onboarding wizard, custom resource operating hours, and UI redesign": 
      "Chytrý start: Spuštěn AI průvodce nastavením portálu a možnost zadat specifické provozní hodiny pro jednotlivá sportoviště.",
    "feat: support nested resource switches, styled alert dialogs, and sequential admin AI tool call queueing": 
      "Zjednodušení administrace: Podpora pro vnořené přepínání zdrojů a modernější, přehlednější design dialogových oken.",
    "fix: resolve admin 403 Forbidden checks for rule/resource/device modifications": 
      "Oprava systému oprávnění: Vyřešeny potíže s chybným odepřením přístupu (403) při úpravě pravidel a konfigurace zařízení.",
    "ux: adjust modals sizing and reposition AI assistant to bottom-right": 
      "Zpřesnění layoutu: Optimalizace velikosti vyskakovacích oken a přesunutí asistenta ReKeeper do pravého dolního rohu.",
    "feat: implement fully asynchronous AI-generated greetings for ReKeeper": 
      "Zrychlení odezvy: AI asistent ReKeeper nyní generuje úvodní uvítání na pozadí bez zdržování načítání stránky.",
    "feat: make initial ReKeeper greetings dynamically adapt to tenant AI instructions and vertical": 
      "Chytřejší asistent: Úvodní oslovení asistenta se nyní přizpůsobuje oboru vaší organizace a nastaveným instrukcím.",
    "feat: add admin-configurable AI system prompt instructions for ReKeeper": 
      "Instrukce pro AI: Správci mohou nově nastavit specifické instrukce a tón komunikace pro AI asistenta ReKeeper.",
    "Rename AI Assistant/Copilot to ReKeeper (Timekeeper & Gatekeeper)": 
      "Sjednocení značky: Přejmenovali jsme vestavěného AI pomocníka na přehledný název ReKeeper.",
    "Add secure, guardrailed AI Assistant for Tenant Admin panel": 
      "Chytrá podpora: Přidán bezpečný AI asistent s pravidly pro pomoc administrátorům s běžnou agendou.",
    "feat: implement multi-tenant B2B SaaS role system (Superadmin, Tenant Admin, User), dynamic landing page, database auto-seeding, and User Dashboard": 
      "Základní verze platformy: Spuštěn kompletní systém rolí, uživatelské nástěnky a automatické seedování databáze.",
    "fix: resolve admin API 403 Forbidden checks for rule/resource/device modifications":
      "Oprava oprávnění: Vyřešeno chybné odmítnutí přístupu (403) při úpravě pravidel a zařízení administračním rozhraním.",
    "Feed tenant name, vertical, and tagline context to ReKeeper AI Assistant":
      "Kontext pro AI: Asistentovi ReKeeper jsou automaticky poskytovány informace o typu a názvu vaší organizace.",
    "feat: support reservation details clicks, rescheduling, and AI assistant actions":
      "Správa rezervací: Podpora kliknutí na detaily rezervace, změny termínů a akcí prováděných AI asistentem.",
    "fix: resolve React 19 setState in render warning inside AIAssistant executeToolCall":
      "Interní stabilita: Vyřešeno varování Reactu ohledně nastavení stavu během vykreslování v AI asistentovi.",
    "fix: persist and merge resolved assistant parameters to keep stepper highlights active":
      "Vylepšení AI asistenta: Uchování a sloučení parametrů asistenta pro zachování aktivního zvýraznění kroků.",
    "ux: keep cursor focused inside AI assistant input bar during next step transitions":
      "Lepší UX asistenta: Udržení zaměřeného kurzoru v textovém poli AI asistenta během přechodu mezi kroky.",
    "style: improve recurrence selection UX with switch toggle, segmented buttons, and a stepper":
      "Snadnější opakování: Vylepšení výběru opakovaných rezervací pomocí přepínače, segmentovaných tlačítek a vizuálního průvodce.",
    "feat: add support for recurring bookings (weekly/bi-weekly/monthly) and series cancellation":
      "Opakované rezervace: Přidána podpora pro opakování rezervací (týdně/čtrnáctidenně/měsíčně) a hromadné rušení sérií.",
    "feat(ai): modularize assistant HUD, add transcription, and improve model call resilience":
      "AI hlasové rozhraní: Modularizace panelu asistenta ReKeeper, přidání přepisu řeči a vyšší stabilita dotazů na model.",
    "style(ai): consolidate assistant layout into compact unified capsule":
      "Vzhled asistenta: Sjednocení prvků do kompaktní a elegantní plovoucí bubliny.",
    "feat: implement voice-enabled interactive AI booking assistant":
      "Hlasový asistent: Spuštění interaktivního AI asistenta, se kterým můžete komunikovat hlasem.",
    "build: fix vercel build by removing prisma db push and seed":
      "Zrychlení sestavení: Optimalizace konfigurace sestavení pro spolehlivější nasazení v cloudu.",
    "feat(landing,admin): revamp B2B SaaS landing page & admin panel visual aesthetics":
      "Facelift vzhledu: Kompletní estetický facelift úvodní stránky a administračního panelu.",
    "fix: resolve crash in day view when opening reservation modal":
      "Oprava chyb: Odstraněna chyba způsobující pád rozhraní při otevření detailu rezervace v denním přehledu.",
    "feat: implement real-time synchronization, timezone correction, double-booking prevention, and URL slugification":
      "Chytrá synchronizace: Okamžitá aktualizace dat, podpora časových pásem a zamezení dvojitému zarezervování stejného termínu.",
    "Remove temporary debug route after successful verification":
      "Zabezpečení kódu: Odstranění dočasných testovacích rozhraní po ověření funkčnosti.",
    "Add temporary debug route to inspect Vercel database connection":
      "Diagnostika databáze: Přidána dočasná cesta pro ověření připojení k databázi v cloudovém prostředí.",
    "Fix database seed persistence, default banner image, and add deterministic resource ordering":
      "Stabilizace dat: Oprava ukládání výchozích dat, výchozího obrázku a deterministické řazení zdrojů v kalendáři.",
    "Czech localization, UI polish, increased booking limits, and default calendar date fix":
      "Česká lokalizace: Kompletní překlad rozhraní do češtiny, doladění detailů a navýšení rezervačních limitů.",
    "backend added":
      "Spuštění backendu: Inicializace databázové vrstvy a základní logiky rezervačního systému.",
    "style(calendar): make past events 100% grayscale by removing left border color and badge colors":
      "Přehlednost kalendáře: Zobrazení proběhlých událostí šedým tónem pro lepší přehled o čase.",
    "style(admin,theme): fix input overlapping and change Umelka brand color to purple":
      "Úprava motivu: Vyřešeno překrývání polí a nastavení hlavní barvy na fialovou pro značku Umelka.",
    "style(calendar): make grid lines higher, remove emojis, and hide redundant occupied details":
      "Čistší kalendář: Zvýšení přehlednosti kalendáře odstraněním rušivých prvků a zvýrazněním mřížky.",
    "feat(admin,calendar): implement Admin features and style calendar overlays":
      "Administrátorský kalendář: Implementace pokročilých funkcí pro správce a vyladění kalendářových překryvů.",
    "docs: update README with project features and local setup guidelines":
      "Vývojářská dokumentace: Aktualizace README s popisem funkcí a pokyny pro lokální spuštění.",
    "feat: calendar past slot stripes, day/week/month view switching, and return-to-today button":
      "Zobrazení kalendáře: Možnost přepínání mezi dnem, týdnem a měsícem a rychlé tlačítko pro návrat na dnešek.",
    "Initial commit from Create Next App":
      "Zahájení vývoje: Inicializace projektu a vytvoření základní kostry aplikace."
  };

  // Check direct matches
  for (const [key, val] of Object.entries(matches)) {
    if (trimmed === key || trimmed.startsWith(key)) {
      return val;
    }
  }

  // 2. Dynamic fallbacks for future developer commits (strip prefix, translate verbs, capitalize)
  let cleanMsg = trimmed;
  let prefix = "";

  const matchPrefix = cleanMsg.match(/^(feat|fix|style|ux|refactor|docs|build)(?:\([^)]+\))?\s*:\s*(.*)$/i);
  if (matchPrefix) {
    prefix = matchPrefix[1].toLowerCase();
    cleanMsg = matchPrefix[2];
  }

  // Translate common English verbs at the start of cleanMsg
  const words = cleanMsg.split(" ");
  const firstWord = words[0].toLowerCase();
  const restWords = words.slice(1).join(" ");

  let translatedVerb = "";
  if (firstWord === "add" || firstWord === "adds" || firstWord === "adding") {
    translatedVerb = "Přidání";
  } else if (firstWord === "implement" || firstWord === "implements" || firstWord === "implementing") {
    translatedVerb = "Implementace";
  } else if (firstWord === "fix" || firstWord === "fixes" || firstWord === "fixing" || firstWord === "resolve" || firstWord === "resolves") {
    translatedVerb = "Oprava";
  } else if (firstWord === "improve" || firstWord === "improves" || firstWord === "improving" || firstWord === "enhance" || firstWord === "enhances") {
    translatedVerb = "Vylepšení";
  } else if (firstWord === "refactor" || firstWord === "refactors" || firstWord === "refactoring" || firstWord === "optimize" || firstWord === "optimizes") {
    translatedVerb = "Optimalizace";
  } else if (firstWord === "style" || firstWord === "styles" || firstWord === "styling" || firstWord === "design" || firstWord === "designs") {
    translatedVerb = "Úprava vzhledu";
  } else if (firstWord === "update" || firstWord === "updates" || firstWord === "updating") {
    translatedVerb = "Aktualizace";
  } else if (firstWord === "remove" || firstWord === "removes" || firstWord === "removing") {
    translatedVerb = "Odstranění";
  } else if (firstWord === "support" || firstWord === "supports") {
    translatedVerb = "Podpora pro";
  }

  if (translatedVerb) {
    cleanMsg = `${translatedVerb} ${restWords}`;
  } else {
    // Capitalize the first letter
    cleanMsg = cleanMsg.charAt(0).toUpperCase() + cleanMsg.slice(1);
  }

  // Prepend prefix category in Czech if not already covered
  if (prefix === "fix" && !cleanMsg.startsWith("Oprava")) {
    return `Oprava: ${cleanMsg}`;
  } else if (prefix === "feat" && !cleanMsg.startsWith("Přidání") && !cleanMsg.startsWith("Implementace") && !cleanMsg.startsWith("Podpora")) {
    return `Nová funkce: ${cleanMsg}`;
  } else if ((prefix === "style" || prefix === "ux") && !cleanMsg.startsWith("Úprava vzhledu") && !cleanMsg.startsWith("Vylepšení")) {
    return `Vylepšení vzhledu: ${cleanMsg}`;
  } else if (prefix === "refactor" && !cleanMsg.startsWith("Optimalizace")) {
    return `Optimalizace kódu: ${cleanMsg}`;
  } else if (prefix === "docs") {
    return `Dokumentace: ${cleanMsg}`;
  }

  return cleanMsg;
}

interface RawCommit {
  hash: string;
  date: string;
  message: string;
  version: string;
  files: string[];
}

interface Group {
  version: string;
  date: string;
  rawCommits: RawCommit[];
}

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const headHash = execSync("git rev-parse HEAD", { encoding: "utf-8" }).trim();
    
    if (cachedHead === headHash && cachedUpdates.length > 0) {
      return NextResponse.json({ updates: cachedUpdates });
    }

    const logOutput = execSync('git log --format="%H|%ad|%s" --date=short', { encoding: "utf-8" });
    const lines = logOutput.trim().split("\n");

    const rawCommits: RawCommit[] = [];
    let lastSeenVersion: string = "";

    for (const line of lines) {
      if (!line) continue;
      
      const firstPipe = line.indexOf("|");
      const secondPipe = line.indexOf("|", firstPipe + 1);
      if (firstPipe === -1 || secondPipe === -1) continue;
      
      const hash = line.substring(0, firstPipe);
      const date = line.substring(firstPipe + 1, secondPipe);
      const message = line.substring(secondPipe + 1);
      const trimmedMessage = message.trim();

      // Skip empty commits and version bumps/releases commits to avoid technical noise in UI list
      const lowerMsg = trimmedMessage.toLowerCase();
      if (
        lowerMsg === "bump" || 
        lowerMsg.includes("bump version") || 
        lowerMsg.includes("release v") || 
        lowerMsg.match(/^v?\d+\.\d+\.\d+$/)
      ) {
        continue;
      }

      // Fetch package.json content at this SHA to determine version group
      let version = "0.1.0";
      try {
        const pkgContent = execSync(`git show ${hash}:package.json`, { 
          encoding: "utf-8", 
          stdio: ["pipe", "pipe", "ignore"] 
        });
        const pkg = JSON.parse(pkgContent);
        version = pkg.version || "0.1.0";
      } catch (err) {
        version = lastSeenVersion || "0.1.0";
      }

      lastSeenVersion = version;

      // Fetch modified files list
      let files: string[] = [];
      try {
        const filesOutput = execSync(`git diff-tree --no-commit-id --name-only -r ${hash}`, {
          encoding: "utf-8",
          stdio: ["pipe", "pipe", "ignore"]
        });
        files = filesOutput.trim().split("\n").filter(f => f.trim().length > 0);
      } catch (err) {
        files = [];
      }

      rawCommits.push({
        hash,
        date,
        message: trimmedMessage,
        version,
        files
      });
    }

    // Group raw commits by both version and date (day)
    const groups: Group[] = [];
    for (const commit of rawCommits) {
      let existingGroup = groups.find(g => g.version === commit.version && g.date === commit.date);
      if (!existingGroup) {
        existingGroup = {
          version: commit.version,
          date: commit.date,
          rawCommits: []
        };
        groups.push(existingGroup);
      }
      existingGroup.rawCommits.push(commit);
    }

    // Sort groups chronologically (oldest first) to assign incremental patch versions
    const chronologicalGroups = [...groups].reverse();

    function semverGt(v1: string, v2: string): boolean {
      const parts1 = v1.split(".").map(Number);
      const parts2 = v2.split(".").map(Number);
      for (let i = 0; i < 3; i++) {
        const val1 = parts1[i] || 0;
        const val2 = parts2[i] || 0;
        if (val1 > val2) return true;
        if (val1 < val2) return false;
      }
      return false;
    }

    function incrementPatch(version: string): string {
      const parts = version.split(".");
      const patch = parseInt(parts[2] || "0", 10);
      parts[2] = (patch + 1).toString();
      return parts.join(".");
    }

    const groupVersions: Record<string, string> = {};
    if (chronologicalGroups.length > 0) {
      let currentVersion = chronologicalGroups[0].version;
      groupVersions[`${chronologicalGroups[0].version}|${chronologicalGroups[0].date}`] = `v${currentVersion}`;

      for (let i = 1; i < chronologicalGroups.length; i++) {
        const g = chronologicalGroups[i];
        if (semverGt(g.version, currentVersion)) {
          currentVersion = g.version;
        } else {
          currentVersion = incrementPatch(currentVersion);
        }
        groupVersions[`${g.version}|${g.date}`] = `v${currentVersion}`;
      }
    }

    // Transform into final payload format
    const finalGroups = groups.map((g) => {
      const displayVersion = groupVersions[`${g.version}|${g.date}`] || `v${g.version}`;
      
      const benefits = Array.from(new Set(
        g.rawCommits.map(c => getCommitUserBenefit(c.message))
      ));
      
      const files = Array.from(new Set(
        g.rawCommits.flatMap(c => c.files)
      ));

      return {
        version: displayVersion,
        displayVersion: displayVersion,
        date: g.date,
        benefits,
        files
      };
    });

    cachedHead = headHash;
    cachedUpdates = finalGroups;
    
    return NextResponse.json({ updates: finalGroups });
  } catch (error) {
    console.error("Failed to fetch system updates from git:", error);
    return NextResponse.json({ error: "Failed to fetch updates" }, { status: 500 });
  }
}
