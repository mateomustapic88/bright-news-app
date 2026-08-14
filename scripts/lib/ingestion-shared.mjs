import { normalizeExternalUrl } from "../../src/lib/urls.js";
import { countKeywordHits, matchesKeyword, normalizeHaystack, stripHtml, toSentence } from "./html-text.mjs";
import {
  extractImageUrlFromArticle,
  extractImageUrlFromHtml,
  fetchHtmlForUrl,
  isLikelyImageUrl,
} from "./image-extraction.mjs";
import { isBlockedStoryImageUrl } from "../../src/lib/storyImages.js";
import { inferReviewDecision as inferReviewDecisionWithConfig } from "./review-decision.mjs";

export { stripHtml, toSentence } from "./html-text.mjs";
export {
  extractImageUrlFromArticle,
  extractImageUrlFromHtml,
  fetchHtmlForUrl,
} from "./image-extraction.mjs";

export const REGION_CONFIG = [
  { code: "world", country: "", lang: "en" },
  { code: "us", country: "us", lang: "en" },
  { code: "uk", country: "gb", lang: "en" },
  { code: "hr", country: "hr", lang: "hr" },
  { code: "si", country: "si", lang: "sl" },
  { code: "rs", country: "rs", lang: "sr" },
  { code: "ba", country: "ba", lang: "bs" },
  { code: "de", country: "de", lang: "de" },
  { code: "fr", country: "fr", lang: "fr" },
  { code: "ca", country: "ca", lang: "en" },
  { code: "jp", country: "jp", lang: "ja" },
  { code: "au", country: "au", lang: "en" },
  { code: "br", country: "br", lang: "pt" },
  { code: "in", country: "in", lang: "en" },
];

export const DEFAULT_INGEST_REGION_CODES = REGION_CONFIG.map(region => region.code).join(",");

export const CATEGORY_CONFIG = [
  {
    category: "Environment",
    emoji: "🌿",
    query: "\"climate restoration\" OR conservation OR reforestation OR biodiversity OR reef restoration OR wildlife recovery OR clean energy success OR emissions fall",
    localizedQueries: {
      hr: "očuvanje prirode OR pošumljavanje OR bioraznolikost OR obnova grebena OR oporavak divljih životinja OR uspjeh čiste energije OR smanjenje emisija",
      de: "Naturschutz OR Aufforstung OR Biodiversität OR Riffrestaurierung OR Erholung der Tierwelt OR Erfolg saubere Energie OR Emissionsrückgang",
      fr: "conservation OR reforestation OR biodiversité OR restauration des récifs OR retour de la faune OR succès énergie propre OR baisse des émissions",
      ja: "保全 OR 再植林 OR 生物多様性 OR サンゴ礁再生 OR 野生動物回復 OR クリーンエネルギー成功 OR 排出量減少",
      pt: "conservação OR reflorestamento OR biodiversidade OR restauração de recifes OR recuperação da vida selvagem OR sucesso da energia limpa OR queda das emissões",
    },
  },
  {
    category: "Science",
    emoji: "🔬",
    query: "scientists develop OR research breakthrough OR scientific advance OR new study shows progress OR discovery helps",
    localizedQueries: {
      hr: "znanstvenici razvili OR istraživački proboj OR znanstveni napredak OR novo istraživanje pokazuje napredak OR otkriće pomaže",
      de: "Wissenschaftler entwickeln OR Forschungsdurchbruch OR wissenschaftlicher Fortschritt OR neue Studie zeigt Fortschritt OR Entdeckung hilft",
      fr: "des scientifiques développent OR percée scientifique OR avancée scientifique OR une nouvelle étude montre des progrès OR une découverte aide",
      ja: "科学者が開発 OR 研究のブレークスルー OR 科学的進歩 OR 新しい研究が進展を示す OR 発見が役立つ",
      pt: "cientistas desenvolvem OR avanço científico OR descoberta ajuda OR nova pesquisa mostra progresso",
    },
  },
  {
    category: "Community",
    emoji: "🤝",
    query: "volunteers help OR charity success OR community project improves OR local initiative helps OR donation drive succeeds",
    localizedQueries: {
      hr: "volonteri pomažu OR uspjeh dobrotvorne akcije OR projekt zajednice poboljšava OR lokalna inicijativa pomaže OR uspješna donatorska akcija",
      de: "Freiwillige helfen OR Erfolg einer Wohltätigkeitsaktion OR Gemeinschaftsprojekt verbessert OR lokale Initiative hilft OR Spendenaktion erfolgreich",
      fr: "des bénévoles aident OR succès caritatif OR projet communautaire améliore OR initiative locale aide OR collecte de dons réussie",
      ja: "ボランティアが支援 OR 慈善活動の成功 OR 地域プロジェクトが改善 OR 地元の取り組みが役立つ OR 寄付活動が成功",
      pt: "voluntários ajudam OR sucesso beneficente OR projeto comunitário melhora OR iniciativa local ajuda OR campanha de doação bem-sucedida",
    },
  },
  {
    category: "Health",
    emoji: "💚",
    query: "health breakthrough OR treatment success OR vaccine success OR disease prevention progress OR recovery program helps",
    localizedQueries: {
      hr: "zdravstveni proboj OR uspjeh liječenja OR uspjeh cjepiva OR napredak u prevenciji bolesti OR program oporavka pomaže",
      de: "medizinischer Durchbruch OR Behandlungserfolg OR Impferfolg OR Fortschritt bei der Krankheitsprävention OR Genesungsprogramm hilft",
      fr: "percée en santé OR succès du traitement OR succès du vaccin OR progrès dans la prévention des maladies OR programme de rétablissement aide",
      ja: "医療のブレークスルー OR 治療成功 OR ワクチン成功 OR 病気予防の進展 OR 回復プログラムが役立つ",
      pt: "avanço na saúde OR sucesso no tratamento OR sucesso da vacina OR progresso na prevenção de doenças OR programa de recuperação ajuda",
    },
  },
  {
    category: "Animals",
    emoji: "🐾",
    query: "animal rescue OR wildlife recovery OR species rebound OR habitat restoration helps animals OR shelter adoption success",
    localizedQueries: {
      hr: "spašavanje životinja OR oporavak divljih životinja OR oporavak vrste OR obnova staništa pomaže životinjama OR uspjeh udomljavanja",
      de: "Tierrettung OR Erholung der Tierwelt OR Rückkehr einer Art OR Lebensraumrenaturierung hilft Tieren OR Tierheimvermittlung erfolgreich",
      fr: "sauvetage animalier OR retour de la faune OR reprise d'une espèce OR restauration de l'habitat aide les animaux OR adoption en refuge réussie",
      ja: "動物救助 OR 野生動物回復 OR 種の回復 OR 生息地の回復が動物を助ける OR 保護施設での譲渡成功",
      pt: "resgate de animais OR recuperação da vida selvagem OR recuperação de espécie OR restauração de habitat ajuda animais OR sucesso de adoção em abrigo",
    },
  },
  {
    category: "Sports",
    emoji: "🏅",
    query: "\"won gold\" OR medal win OR championship victory OR tournament winners OR athlete comeback OR charity run success OR club wins title",
    localizedQueries: {
      hr: "\"osvojio zlato\" OR osvojila zlato OR osvajanje medalje OR prvenstvena pobjeda OR pobjednik turnira OR povratak sportaša OR uspješna humanitarna utrka OR klub osvojio naslov",
      de: "\"gold gewonnen\" OR medaillengewinn OR meisterschaftssieg OR turniersieger OR comeback eines athleten OR erfolgreicher wohltätigkeitslauf OR verein gewinnt titel",
      fr: "\"médaille d'or\" OR victoire en championnat OR vainqueur du tournoi OR retour d'un athlète OR course caritative réussie OR club remporte le titre",
      ja: "金メダル獲得 OR メダル獲得 OR 選手の復活 OR 大会優勝 OR チャンピオンシップ優勝 OR チャリティーラン成功 OR クラブがタイトル獲得",
      pt: "\"ganhou ouro\" OR conquista de medalha OR vitória no campeonato OR vencedor do torneio OR retorno do atleta OR sucesso em corrida beneficente OR clube conquista título",
    },
  },
  {
    category: "Innovation",
    emoji: "💡",
    query: "clean tech breakthrough OR battery breakthrough OR affordable technology helps OR startup solution improves lives OR AI helps detect",
    localizedQueries: {
      hr: "proboj čiste tehnologije OR proboj baterije OR pristupačna tehnologija pomaže OR startup rješenje poboljšava živote OR AI pomaže otkriti",
      de: "Durchbruch bei sauberer Technologie OR Batteriedurchbruch OR erschwingliche Technologie hilft OR Startup-Lösung verbessert Leben OR KI hilft bei der Erkennung",
      fr: "percée de la technologie propre OR percée des batteries OR technologie abordable aide OR solution de startup améliore des vies OR l'IA aide à détecter",
      ja: "クリーンテックのブレークスルー OR バッテリーのブレークスルー OR 手頃な技術が役立つ OR スタートアップの解決策が生活を改善 OR AIが検出を支援",
      pt: "avanço em tecnologia limpa OR avanço em baterias OR tecnologia acessível ajuda OR solução de startup melhora vidas OR IA ajuda a detectar",
    },
  },
];

export const TRUSTED_AUTO_APPROVE_VENDORS = new Set(["goodnewsnetwork", "positive_news"]);
const MIN_POSITIVE_SCORE = 0.6;
const hasAiReviewer = Boolean(
  process.env.OPENAI_API_KEY ||
  process.env.GROQ_API_KEY ||
  process.env.GEMINI_API_KEY,
);
const HEURISTIC_AUTO_APPROVE_SCORE = Number(process.env.HEURISTIC_AUTO_APPROVE_SCORE || 0.66);
const MIN_SOURCE_QUALITY_SCORE = Number(process.env.MIN_SOURCE_QUALITY_SCORE || 0.38);
const AUTO_APPROVE_MIN_SOURCE_QUALITY_SCORE = Number(process.env.AUTO_APPROVE_MIN_SOURCE_QUALITY_SCORE || 0.62);
const LOCAL_POSITIVE_MIN_SCORE = Number(process.env.LOCAL_POSITIVE_MIN_SCORE || 0.45);
const LOCAL_POSITIVE_AUTO_APPROVE_SCORE = Number(process.env.LOCAL_POSITIVE_AUTO_APPROVE_SCORE || 0.5);
const LOCAL_POSITIVE_SCORE_BOOST = Number(process.env.LOCAL_POSITIVE_SCORE_BOOST || 0.5);
const LOCAL_INFORMATIVE_SCORE_BOOST = Number(process.env.LOCAL_INFORMATIVE_SCORE_BOOST || 1.5);
const BLOCKED_SOURCE_HOSTS = [
  "facebook.com",
  "instagram.com",
  "tiktok.com",
  "x.com",
  "twitter.com",
  "youtube.com",
  "youtu.be",
  "spotify.com",
  "podcasts.apple.com",
];

const NEGATIVE_KEYWORDS = [
  "war",
  "sanction",
  "sanctions",
  "blockade",
  "embargo",
  "oil tanker",
  "hurting your brain",
  "may be hurting",
  "may be harming",
  "may actually interfere",
  "may interfere",
  "harmful",
  "killer tick",
  "public health warning",
  "poisonings soar",
  "outbreak",
  "fatality",
  "fatalities",
  "struggling to cope",
  "funding pressures loom",
  "gaps and risks remain",
  "at an alarming rate",
  "disappearing at an alarming rate",
  "fears about access",
  "called out",
  "linked to cancer",
  "may be linked to cancer",
  "diagnosed with cancer every",
  "twice as likely to suffer",
  "less likely to receive timely care",
  "health inequality",
  "health inequalities",
  "health disparity",
  "health disparities",
  "racial disparity",
  "racial disparities",
  "ethnic disparity",
  "ethnic disparities",
  "suffer stroke",
  "lost half",
  "malaria remains",
  "missed signs",
  "must act now",
  "killed",
  "attack",
  "dead",
  "injured",
  "stranded",
  "disaster",
  "crash",
  "fraud",
  "scandal",
  "bomb",
  "shooting",
  "missile",
  "strike",
  "layoffs",
  "earthquake",
  "flood",
  "hurricane",
  "wildfire",
  "arrest",
  "lawsuit",
  "election",
  "politics",
  "crisis",
  "conflict",
  "protest",
  "riot",
  "opinion",
  "krieg",
  "katastrophe",
  "hochwasser",
  "wahl",
  "politik",
  "skandal",
  "krise",
  "konflikt",
  "sanktion",
  "sanktionen",
  "blockade",
  "embargo",
  "öltanker",
  "unfall",
  "verletzt",
  "gestrandet",
  "guerre",
  "catastrophe",
  "inondation",
  "élection",
  "politique",
  "scandale",
  "crise",
  "conflit",
  "sanction",
  "sanctions",
  "blocus",
  "embargo",
  "pétrolier",
  "accident",
  "rat",
  "ubijen",
  "poginuo",
  "katastrofa",
  "poplava",
  "infarkt",
  "upozorava",
  "upozoravaju",
  "upozorenje",
  "boluje od",
  "neizlečiva bolest",
  "neizljeciva bolest",
  "neizlječiva bolest",
  "neizljeciva",
  "polen",
  "izbori",
  "politika",
  "političar",
  "političari",
  "politički",
  "predsednik",
  "predsjednik",
  "premijer",
  "ministar",
  "ministri",
  "vlada",
  "režim",
  "vojni",
  "zvaničnik",
  "zvaničnici",
  "tvrdnje",
  "opovrgli",
  "gasovod",
  "plinovod",
  "eksploziv",
  "kremlj",
  "putin",
  "vučić",
  "orban",
  "skandal",
  "kriza",
  "sukob",
  "sankcije",
  "blokada",
  "embargo",
  "naftni tanker",
  "nesreća",
  "guerra",
  "morto",
  "mortos",
  "desastre",
  "enchente",
  "eleição",
  "política",
  "escândalo",
  "crise",
  "conflito",
  "sanção",
  "sanções",
  "bloqueio",
  "embargo",
  "petroleiro",
  "acidente",
  "戦争",
  "死亡",
  "災害",
  "洪水",
  "選挙",
  "政治",
  "危機",
  "紛争",
  "制裁",
  "封鎖",
  "禁輸",
  "石油タンカー",
  "事故",
];

const BLOCKED_TOPIC_TAGS = new Set([
  "politics",
  "opinion",
  "election",
  "democracy",
  "conflict",
  "war",
  "protest",
  "riot",
]);

const NON_NEWS_TITLE_PATTERNS = [
  /^good news in history\b/i,
  /horoscope/i,
  /free will astrology/i,
  /horoskop/i,
  /komentar urednika/i,
  /\bkolumna\b/i,
  /\bmišljenje\b/i,
  /\bosvrt\b/i,
  /cijena nafte/i,
  /\btranscript:\b.*\bearnings conference call\b/i,
  /\bustavni sud\b.*\b(ustavnost|zakona)\b/i,
  /\balarm iz amerike\b.*\bhitno povučen iz apoteka\b/i,
  /\bobjavljeni najnoviji podaci o zaraženima\b/i,
  /\befekat znatno manji od očekivanog\b/i,
  /\bukrala opasne viruse\b.*\buznemireni\b/i,
  /\bupozoravajući znak\b.*\bvisokim krvnim pritiskom\b/i,
  /\bunlikely to benefit patients\b.*\breport suggests\b/i,
  /\bwork needed on trust in vaccines\b/i,
  /\bnew study finds\b.*\b(hurting|harming|harmful|danger|risk|damage|interfere)\b/i,
  /\b(hurting|harming|harmful|danger|risk|damage|interfere)\b.*\bnew study finds\b/i,
  /\b(fish oil|supplement|vitamin|diet)\b.*\b(hurting|harming|harmful|may interfere|risk)\b/i,
  /\b(killer tick|public health warning|poisonings soar|severe .* surge|fatality rate|struggling to cope)\b/i,
  /\b(malaria|tb|leprosy|lassa fever)\b.*\b(missed signs|gaps remain|must act now|surge|outbreak|struggles)\b/i,
  /\b(hidden virus|common gut bacterium)\b.*\b(linked to|colon cancer|colorectal cancer)\b/i,
  /\bone person diagnosed with cancer every\b/i,
  /\b(black|white|asian|minority|ethnic|racial)\b.*\b(twice as likely|more likely|less likely)\b.*\b(stroke|cancer|care|treatment|die|death)\b/i,
  /\b(stroke|cancer|care|treatment)\b.*\b(black|white|asian|minority|ethnic|racial)\b.*\b(counterparts|backgrounds|patients)\b/i,
  /\bless likely to receive\b.*\b(timely care|care|treatment)\b/i,
  /\bsuffer stroke\b/i,
  /\b(report|experts).*?\b(gaps and risks remain|funding pressures loom)\b/i,
  /\b(price starts|early bird promo|out now|promo|popusti|popust|otvorene prijave|prijave za .*awards)\b/i,
  /\b(sale brings|record low .* sale|price down to|huge discount)\b/i,
  /\b(uvodi se|uvode se)\s+(plaćanje|placanje)\b/i,
  /\b(whatsapp|meta)\b.*\b(naknada|naknade|plaćanje|placanje|subscription|fee|fees)\b/i,
  /\bandroid[-\s]?malware\b/i,
  /\bmalware\b.*\b(play store|android|devices|geräte|gerate)\b/i,
  /\bnovo (oružje|oruzje)\b/i,
  /\b(oružje|oruzje)\b.*\b(ispaljuje|metaka|minuti|barut)\b/i,
  /\b(full year \d{4} results|business highlights|market trends|read full press release)\b/i,
  /\b(build muscle after|weight loss targets|expert tips|proven .* tips)\b/i,
  /\b(stagflation fears|shares .* surge|stock market|housing confidence)\b/i,
  /\b(spotify|spaceballs|taylor swift|miss universe|michael jackson|euforiji|iphone 16|rap album|kultne komedije)\b/i,
  /\bkako izabrati .* gde ga kupiti online\b/i,
  /\b(samsung televizori|metal summit|4walls|sajam namještaja|lifestyle iskustva)\b/i,
  /\bmegan markl\b.*\b(zlostavljana|napadana)\b/i,
  /\b(transfer|transferi|prelazi|gossip)\b.*\b(igrač|igrac|player|club|klub)\b/i,
  /\b(navijački neredi|huligani|hooligans)\b/i,
  /\b(crveni karton|red card|suspenzija|suspension)\b/i,
  /\b(poražen|poražena|izgubio|izgubila|lost to|defeat to)\b.*\b(klub|team|tim|momčad|ekipa)\b/i,
  /\b(bolniji|bolan|bolni)\s+poraz\b/i,
  /\bostali bez\b.*\b(evrolige|euroleague|trofeja|titule)\b/i,
  /\b(luda drama|lude drame|posle lude drame|nakon lude drame)\b.*\b(osvojio|osvojila|trofej|finale)\b/i,
  /\blonglegs\b.*\bnovi film\b/i,
  /\bsmrtonosnom plesu\b.*\bsudar\b/i,
  /\bsmanjili plaće radnicima\b/i,
  /\bnapuštaju\b.*\btraže odgovore\b/i,
  /\bzbog krijumčarenja migranata\b.*\bslobode lišeno\b/i,
  /\b(u bosni .*oblačno|umjereno do pretežno oblačno|sunčano uz .*oblačno|povećanje oblačnosti)\b/i,
  /\b(pretežno|pretezno)\s+sunčano\b.*\btemperaturom do\b/i,
  /\bprije podne\b.*\b(poslije podne|posle podne)\b.*\b(oblačno|oblacno)\b/i,
  /\b(oblačno|oblacno)\b.*\b(kišom|kisom|pljuskovima|grmljavinom)\b/i,
  /parking .*eura po satu/i,
  /(orkanska bura|oluja|nevrijeme|promet otežan|trajekti .* ne voze|bez vode|ne rade semafori)/i,
  /^u bosni oblačno, u hercegovini sunčano$/i,
  /^(brišite|obrišite) .* odmah!?$/i,
  /izazivaju rak/i,
  /\b(skoro|više od|vise od|oko)\s+\d+.*\b(boluje|obolel|oboljel)\b/i,
  /\b(boluje|obolel|oboljel)\b.*\b(neizlečiva|neizljeciva|neizlječiva)\b/i,
  /\bsmrtonosni virus\b|\bsmrtonosan virus\b/i,
  /\b(kruzeru|kruzer|cruise ship)\b.*\b(virus|preminul|umrli|deadly|smrtonos)\b/i,
  /\bhantavirus\b.*\b(smrtonos|simptom|otkazivanje|krvarenje|kruzer|umrle|umrli|života|zivota)\b/i,
  /\b(hitne mere|hitne mjere)\b.*\b(umrle|umrli|kruzer|virus|iskrcavanje)\b/i,
  /\btri osobe umrle\b|\bodneo tri života\b|\bodnio tri zivota\b|\bodneo tri zivota\b/i,
  /\b(gušenje|gusenje)\b.*\b(20 minuta|minuta|retk\w* bole)/i,
  /\bispovest\b.*\b(retk\w* bole|bolest|gušenje|gusenje|oticanje)\b/i,
  /\b(retka|rijetka)\s+bolest\b.*\b(gušenje|gusenje|oticanje|nepredvidivo|adekvatne terapije)\b/i,
  /\bhereditarni angioedem\b|\b\(?hae\)?\b.*\b(gušenje|gusenje|oticanje)\b/i,
  /(zašto smo .* facebooka|obrisali razgovor .* facebooka|gdje je nestao čovjek)/i,
  /(partner hoda ispred vas|intimnim odnosima)/i,
  /(klikni i tucaj jaja|besplatnu pretplatu na oranž)/i,
  /\b\d+\s+načina kako (spriječiti|sprečiti)\b.*\burinoinfekc/i,
  /\b(pronađeno|pronadjeno)\b.*\b(oružje|oruzje|eksplozivna sredstva)\b/i,
  /\b(tragedija|tragedy)\b.*\b(goril|gorilla)\b/i,
  /\bworld.?s oldest gorilla\b/i,
  /\blišen slobode\b|\blisen slobode\b/i,
  /\b(dječak|djecak)\b.*\bstradao\b.*\bstrujnog udara\b/i,
  /\bskrivao\b.*\b(majčino tijelo|majcino tijelo)\b/i,
  /\blažne račune\b|\blazne racune\b/i,
  /\b(dom zdravlja)\b.*\b(oštetili|ostetili)\b/i,
  /\b(ratka mladića|ratka mladica)\b/i,
  /\bgovora mržnje\b|\bgovora mrznje\b/i,
  /\bsmrt\b.*\bdjevojčice\b|\bdjevojcice\b/i,
  /\b(osuđeni|osudjeni)\b.*\bgodina zatvora\b/i,
  /\bisključio je rusiju i izrael\b|\biskljucio je rusiju i izrael\b/i,
  /\bneekonomičnih letova\b|\bneekonomicnih letova\b/i,
  /\bglumac šokirao odlukom\b|\bglumac sokirao odlukom\b/i,
  /\bsvaki peti osnovac probao vejp\b/i,
  /\bpucaju\b.*\bkokice\b/i,
  /\bozbiljnih zdravstvenih problema\b.*\b(obratite pažnju|obratite paznju)\b/i,
  /\bpovučen lek protiv gorušice\b|\bpovucen lek protiv gorusice\b/i,
  /\bzorica brunclik\b.*\bstanju\b/i,
  /\bkehlani\b.*\bmentalnim zdravljem\b/i,
  /\bzatvara pipu\b.*\bgubitak dodatnih\b/i,
  /\bameričkih radnika\b.*\bstrahuju\b.*\bai\b/i,
  /\bpreminuo\b.*\b(vijećnik|vijecnik)\b/i,
  /sperma/i,
  /kultni .* film/i,
  /zaradio preko .* milijuna dolara/i,
];

const POSITIVE_KEYWORDS = [
  "restoration",
  "recovery",
  "recover",
  "rescued",
  "rescue",
  "improves",
  "improved",
  "improve",
  "success",
  "succeeds",
  "breakthrough",
  "discovered",
  "new species",
  "progress",
  "record low",
  "historic low",
  "volunteers",
  "charity",
  "community",
  "helped",
  "helps",
  "helping",
  "saved",
  "save",
  "renewable",
  "conservation",
  "biodiversity",
  "clean energy",
  "treatment",
  "prevention",
  "species",
  "wildlife",
  "healthier",
  "adoption",
  "reforestation",
  "healthy",
  "protects",
  "benefit",
  "benefits",
  "effective",
  "first success",
  "first successes",
  "uspjeh",
  "napredak",
  "oporavak",
  "spašavanje",
  "spašeni",
  "humanitarna",
  "humanitarni",
  "humanitarno",
  "donacija",
  "donacije",
  "stipendija",
  "stipendije",
  "otvoren",
  "otvorena",
  "otvoreno",
  "otvara se",
  "obnovljen",
  "obnovljena",
  "obnovljeno",
  "uređen",
  "uređena",
  "uređeno",
  "besplatan",
  "besplatna",
  "besplatno",
  "nagrada",
  "nagradu",
  "osvojio",
  "osvojila",
  "osvojili",
  "volonterska akcija",
  "prikupljena sredstva",
  "prikupljeno",
  "inicijativa",
  "nova usluga",
  "pomaže",
  "pomažu",
  "volonteri",
  "očuvanje",
  "obnova",
  "liječenje",
  "prevencija",
  "štiti",
  "koristi",
  "otkriće",
  "otkriven",
  "otkrivena",
  "otkrivene",
  "izgradnja",
  "izgrađen",
  "izgrađena",
  "izgrađeno",
  "obeležen",
  "obeležena",
  "obeleženo",
  "obilježen",
  "obilježena",
  "obilježeno",
  "svečano",
  "svecano",
  "dostupno",
  "dostupna",
  "dostupne",
  "zdravlje",
  "zdravlja",
  "zdravstven",
  "vakcina",
  "vakcine",
  "vakcinu",
  "lekovita",
  "ljekovita",
  "banja",
  "banje",
  "daruju",
  "poklanja",
  "poklanjaju",
  "udomljavanje",
  "nova prilika",
  "sretan kraj",
  "čista energija",
  "poboljšava",
  "smanjenje",
  "erfolg",
  "erfolge",
  "fortschritt",
  "erholung",
  "rettung",
  "gerettet",
  "hilft",
  "helfen",
  "gesund",
  "gesünder",
  "vorbeugung",
  "vorbeugen",
  "schützt",
  "wirksam",
  "wirkung",
  "steigert",
  "erste erfolge",
  "behandlungserfolg",
  "freiwillige",
  "naturschutz",
  "behandlung",
  "entdeckung",
  "entdeckt",
  "saubere energie",
  "verbessert",
  "rückgang",
  "succès",
  "progrès",
  "rétablissement",
  "sauvetage",
  "sauvé",
  "aide",
  "protège",
  "prévention",
  "efficace",
  "bénéfice",
  "bénévoles",
  "conservation",
  "traitement",
  "découverte",
  "énergie propre",
  "améliore",
  "baisse",
  "sucesso",
  "progresso",
  "recuperação",
  "resgate",
  "salvo",
  "ajuda",
  "prevenção",
  "protege",
  "eficaz",
  "voluntários",
  "conservação",
  "descoberta",
  "energia limpa",
  "melhora",
  "queda",
  "成功",
  "進展",
  "回復",
  "救助",
  "救出",
  "助ける",
  "ボランティア",
  "保全",
  "発見",
  "クリーンエネルギー",
  "改善",
  "減少",
];

const LOCAL_POSITIVE_LEAN_VENDORS = new Set([
  "index_znanost",
  "index_zagreb",
  "index_ljubimci",
  "index_tech_gadget",
  "index_fit",
  "index_food",
  "index_chill",
  "24sata_lifestyle",
  "24sata_tech",
  "miss7_zdrava",
  "bug_hr",
  "poslovni_hr",
  "zadarski_list",
  "zagrebancija",
  "zg_magazin",
  "01portal",
  "cityportal",
  "dalmacija_danas",
  "dubrovniknet",
  "istra24",
  "regional_express",
  "sib_hr",
  "slo_tech",
  "stat_si_environment",
  "stat_si_development_technology",
  "stat_si_quality_life",
  "euronews_rs_nauka",
  "euronews_rs_tehnologija",
  "euronews_rs_zdravlje",
  "b92_zdravlje",
  "b92_zivot",
  "b92_tehnopolis",
  "b92_putovanja",
  "zdraviportal_ba",
  "novasloboda_ba",
  "nezavisne_kultura",
  "haber_humanost_ba",
  "haber_zdravlje_ba",
  "haber_nauka_ba",
  "haber_tech_ba",
  "oslobodjenje_zdravlje_ba",
  "oslobodjenje_magazin_ba",
  "deutschlandfunk_wissen",
  "deutschlandfunkkultur_wissenschaft",
  "deutschlandfunkkultur_umwelt",
  "heise_news",
  "spektrum_de",
  "wissenschaft_de",
  "quarks_de",
  "rki_de",
  "dw_wissenschaft_de",
]);

const COMMUNITY_POSITIVE_HINTS = [
  "humanitar",
  "donacij",
  "stipend",
  "otvoren",
  "otvorena",
  "otvoreno",
  "obnovljen",
  "obnovljena",
  "obnovljeno",
  "uređen",
  "uređena",
  "uređeno",
  "besplatan",
  "besplatna",
  "besplatno",
  "volonter",
  "inicijativa",
  "projekt pomaže",
  "nova usluga",
  "nove usluge",
  "dostupno",
  "dostupna",
  "dostupne",
  "izgradnja",
  "izgrađen",
  "izgrađena",
  "izgrađeno",
  "otvaranje",
  "otvorenje",
  "svečano",
  "svecano",
  "obilježeno",
  "obeleženo",
  "daruju",
  "poklanja",
  "poklanjaju",
  "lekovita",
  "ljekovita",
  "banja",
  "banje",
  "nagrada",
  "osvojio",
  "osvojila",
  "osvojili",
];

const INFORMATIVE_POSITIVE_CATEGORY_TAGS = new Set(["science", "animals", "innovation", "health", "community", "sports"]);

const LOCAL_INFORMATIVE_KEYWORDS = [
  "znanstvenik",
  "znanstvenika",
  "znanstvenici",
  "znanstvenica",
  "istraživanje",
  "studija",
  "otkriće",
  "otkrio",
  "otkrila",
  "otkriven",
  "otkrivena",
  "mozak",
  "neuron",
  "gen",
  "vrsta",
  "dinosaur",
  "kompjuter",
  "računalo",
  "tehnologija",
  "aplikacija",
  "galaxy",
  "quick share",
  "airdrop",
  "pas",
  "pasa",
  "psi",
  "ljubimac",
  "ljubimci",
  "životinja",
  "životinje",
  "zdravlje",
  "zdravlja",
  "zdravstven",
  "zdravstvena",
  "zdravstvene",
  "prevencija",
  "liječenje",
  "lečenje",
  "vakcina",
  "vakcine",
  "vakcinu",
  "simptomi",
  "navika",
  "ponašanja",
  "medicinski",
  "medicinska",
  "medicinske",
  "pedagoški",
  "pedagoski",
  "pedagoška",
  "pedagoska",
  "majki",
  "novorođenčadi",
  "novorodjenčadi",
  "izgradnja",
  "izgrađen",
  "izgrađena",
  "izgrađeno",
  "dom",
  "vatrogasni",
  "usluga",
  "usluge",
  "dostupno",
  "dostupne",
  "aerodrom",
  "destinacije",
  "putujete",
  "banja",
  "banje",
  "lekovita",
  "ljekovita",
  "sport",
  "sportski",
  "sportaš",
  "sportaši",
  "sportista",
  "sportisti",
  "medalja",
  "medalje",
  "zlato",
  "srebro",
  "bronza",
  "prvenstvo",
  "turnir",
  "kup",
  "maraton",
  "utrka",
  "trka",
  "pobijedio",
  "pobijedila",
  "osvojio",
  "osvojila",
  "osvojili",
];

const CATEGORY_KEYWORDS = {
  Environment: [
    "environment",
    "climate",
    "conservation",
    "reforestation",
    "biodiversity",
    "ocean",
    "marine",
    "energy",
    "renewable",
    "solar",
    "wind",
    "emissions",
    "reef",
    "soil",
    "farming",
  ],
  Science: [
    "science",
    "research",
    "researchers",
    "scientists",
    "study",
    "discovery",
    "breakthrough",
    "laboratory",
    "quantum",
  ],
  Community: [
    "community",
    "society",
    "volunteers",
    "charity",
    "youth",
    "culture",
    "education",
    "people",
    "housing",
    "neighborhood",
    "support",
    "economics",
  ],
  Health: [
    "health",
    "cancer",
    "treatment",
    "disease",
    "vaccine",
    "hospital",
    "medicine",
    "wellbeing",
    "recovery",
    "healthy",
  ],
  Animals: [
    "animal",
    "animals",
    "wildlife",
    "species",
    "rescue",
    "rhino",
    "marine life",
    "habitat",
    "shelter",
    "rewilding",
  ],
  Sports: [
    "sport",
    "sports",
    "athlete",
    "athletes",
    "medal",
    "medals",
    "gold medal",
    "silver medal",
    "bronze medal",
    "championship",
    "tournament",
    "cup",
    "league title",
    "marathon",
    "charity run",
    "club wins",
    "team wins",
    "runner",
    "karate",
    "football club",
    "basketball club",
  ],
  Innovation: [
    "technology",
    "innovation",
    "startup",
    "battery",
    "ai",
    "robotics",
    "engineering",
    "digital",
    "prototype",
  ],
};

const REGION_HINTS = {
  us: ["united states", "usa", "u.s.", "america", "american"],
  uk: ["united kingdom", "uk", "britain", "british", "england", "scotland", "wales"],
  hr: ["croatia", "croatian", "hrvatska", "hrvatski", "zagreb", "split", "rijeka"],
  si: ["slovenia", "slovenian", "slovenija", "slovenski", "ljubljana", "maribor"],
  rs: ["serbia", "serbian", "srbija", "srpski", "beograd", "belgrade", "novi sad", "niš"],
  ba: ["bosnia", "bosnian", "bosnia and herzegovina", "bih", "bosna", "hercegovina", "sarajevo", "banja luka", "mostar"],
  de: ["germany", "german", "deutschland", "deutsch", "berlin", "hamburg", "munich", "münchen"],
  fr: ["france", "french", "français", "paris", "lyon", "marseille"],
  ca: ["canada", "canadian", "toronto", "montreal", "vancouver", "ottawa"],
  jp: ["japan", "japanese", "日本", "東京", "大阪", "京都"],
  au: ["australia", "australian"],
  br: ["brazil", "brazilian", "brasil", "brasileiro", "são paulo", "rio de janeiro"],
  in: ["india", "indian", "bharat", "delhi", "mumbai", "bengaluru", "bangalore"],
};

const DOMAIN_REGION_HINTS = {
  ".hr": "hr",
  ".si": "si",
  ".rs": "rs",
  ".ba": "ba",
  ".de": "de",
  ".fr": "fr",
  ".ca": "ca",
  ".jp": "jp",
  ".br": "br",
  ".in": "in",
  ".co.uk": "uk",
  ".uk": "uk",
  ".au": "au",
};

const extractTagAttributes = (block, tagName) => {
  const match = block.match(new RegExp(`<${tagName}\\b([^>]*)>`, "i"));
  if (!match) return {};

  return Object.fromEntries(
    Array.from(match[1].matchAll(/([\w:-]+)="([^"]*)"/g)).map(([, key, value]) => [key, value]),
  );
};

const extractTagAttributesAll = (block, tagName) =>
  Array.from(block.matchAll(new RegExp(`<${tagName}\\b([^>]*)>`, "gi"))).map(([, attributes]) =>
    Object.fromEntries(
      Array.from(String(attributes || "").matchAll(/([\w:-]+)="([^"]*)"/g)).map(([, key, value]) => [key, value]),
    ));

export const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

const chunkArray = (items, size) => {
  const chunks = [];

  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }

  return chunks;
};

const SOURCE_QUALITY_PROFILES = [
  { match: "goodnewsnetwork", score: 0.84 },
  { match: "positive_news", score: 0.86 },
  { match: "reasonstobecheerful", score: 0.82 },
  { match: "goodgoodgood", score: 0.8 },
  { match: "npr.org", score: 0.93 },
  { match: "sciencedaily.com", score: 0.88 },
  { match: "smithsonianmag.com", score: 0.9 },
  { match: "mit.edu", score: 0.94 },
  { match: "futurity.org", score: 0.86 },
  { match: "arstechnica.com", score: 0.82 },
  { match: "medicalxpress.com", score: 0.84 },
  { match: "phys.org", score: 0.84 },
  { match: "yaleclimateconnections.org", score: 0.86 },
  { match: "niehs.nih.gov", score: 0.94 },
  { match: "ukri.org", score: 0.9 },
  { match: "england.nhs.uk", score: 0.92 },
  { match: "sciencemuseum.org.uk", score: 0.86 },
  { match: "index.hr", score: 0.68 },
  { match: "24sata.hr", score: 0.62 },
  { match: "bug.hr", score: 0.82 },
  { match: "poslovni.hr", score: 0.72 },
  { match: "n1info.rs", score: 0.72 },
  { match: "n1info.si", score: 0.72 },
  { match: "nova.rs", score: 0.63 },
  { match: "klix.ba", score: 0.68 },
  { match: "capital.ba", score: 0.74 },
  { match: "radiosarajevo.ba", score: 0.64 },
  { match: "b92.net", score: 0.66 },
  { match: "zdraviportal.ba", score: 0.77 },
  { match: "novasloboda.ba", score: 0.66 },
  { match: "nezavisne.com", score: 0.68 },
  { match: "delo.si", score: 0.78 },
];

export const resolveCategory = ({ title, description, content = "", tags = [] }) => {
  const haystack = normalizeHaystack([title, description, content, tags.join(" ")]);
  const scores = Object.entries(CATEGORY_KEYWORDS).map(([category, keywords]) => ({
    category,
    score: countKeywordHits(haystack, keywords),
  }));

  scores.sort((left, right) => right.score - left.score);
  return scores[0]?.score ? scores[0].category : "Community";
};

export const getCategoryEmoji = category =>
  CATEGORY_CONFIG.find(item => item.category === category)?.emoji || "✨";

export const getLocalizedCategoryQuery = (categoryConfig, lang = "en") =>
  categoryConfig.localizedQueries?.[lang] || categoryConfig.query;

export const resolveRegionCode = ({ title, description, content = "", tags = [], sourceUrl = "" }) => {
  const haystack = normalizeHaystack([title, description, content, tags.join(" ")]);

  if (sourceUrl) {
    try {
      const hostname = new URL(sourceUrl).hostname.toLowerCase();
      for (const [suffix, regionCode] of Object.entries(DOMAIN_REGION_HINTS)) {
        if (hostname.endsWith(suffix)) {
          return regionCode;
        }
      }
    } catch {
      // Ignore URL parse failures and continue with text hints.
    }
  }

  for (const [regionCode, hints] of Object.entries(REGION_HINTS)) {
    if (hints.some(hint => haystack.includes(hint))) {
      return regionCode;
    }
  }

  return "world";
};

export const inferReviewDecision = ({
  vendor,
  sourceName = "",
  sourceUrl = "",
  imageUrl = "",
  publishedAt = null,
  title,
  description,
  content = "",
  tags = [],
}) => inferReviewDecisionWithConfig({
  vendor,
  sourceName,
  sourceUrl,
  imageUrl,
  publishedAt,
  title,
  description,
  content,
  tags,
  config: {
    NON_NEWS_TITLE_PATTERNS,
    NEGATIVE_KEYWORDS,
    BLOCKED_TOPIC_TAGS,
    BLOCKED_SOURCE_HOSTS,
    POSITIVE_KEYWORDS,
    COMMUNITY_POSITIVE_HINTS,
    LOCAL_POSITIVE_LEAN_VENDORS,
    INFORMATIVE_POSITIVE_CATEGORY_TAGS,
    LOCAL_INFORMATIVE_KEYWORDS,
    TRUSTED_AUTO_APPROVE_VENDORS,
    SOURCE_QUALITY_PROFILES,
    hasAiReviewer,
    thresholds: {
      minPositiveScore: MIN_POSITIVE_SCORE,
      heuristicAutoApproveScore: HEURISTIC_AUTO_APPROVE_SCORE,
      minSourceQualityScore: MIN_SOURCE_QUALITY_SCORE,
      autoApproveMinSourceQualityScore: AUTO_APPROVE_MIN_SOURCE_QUALITY_SCORE,
      localPositiveMinScore: LOCAL_POSITIVE_MIN_SCORE,
      localPositiveAutoApproveScore: LOCAL_POSITIVE_AUTO_APPROVE_SCORE,
      localPositiveScoreBoost: LOCAL_POSITIVE_SCORE_BOOST,
      localInformativeScoreBoost: LOCAL_INFORMATIVE_SCORE_BOOST,
    },
  },
});

const imageFallbackDisabledByCli = process.argv.includes("--no-image-fallback");
const imageFallbackSeenSourceUrls = new Set();
const imageFallbackConcurrencyEnv = Number(process.env.INGEST_IMAGE_FALLBACK_CONCURRENCY || 4);
const maxImageFallbackConcurrency = Number.isFinite(imageFallbackConcurrencyEnv)
  ? Math.max(1, imageFallbackConcurrencyEnv)
  : 4;
let activeImageFallbackFetches = 0;
const pendingImageFallbackFetches = [];

const acquireImageFallbackSlot = async () => {
  if (activeImageFallbackFetches < maxImageFallbackConcurrency) {
    activeImageFallbackFetches += 1;
    return;
  }

  await new Promise(resolve => pendingImageFallbackFetches.push(resolve));
  activeImageFallbackFetches += 1;
};

const releaseImageFallbackSlot = () => {
  activeImageFallbackFetches = Math.max(0, activeImageFallbackFetches - 1);
  const next = pendingImageFallbackFetches.shift();
  if (next) next();
};

const withImageFallbackSlot = async callback => {
  await acquireImageFallbackSlot();

  try {
    return await callback();
  } finally {
    releaseImageFallbackSlot();
  }
};

const isAggregatorSourceUrl = sourceUrl => {
  try {
    const url = new URL(sourceUrl);
    const hostname = url.hostname.replace(/^www\./, "").toLowerCase();
    return (
      hostname === "news.google.com" ||
      (hostname === "google.com" && url.pathname.startsWith("/url"))
    );
  } catch {
    return true;
  }
};

const logImageFallback = details => {
  console.log(JSON.stringify({
    scope: "ingest_image_fallback",
    ...details,
  }));
};

const resolveArticleImageUrl = async ({
  article,
  rawPayload,
  sourceUrl,
  vendor,
  title,
  imageFallback = !imageFallbackDisabledByCli,
}) => {
  const imageUrl = extractImageUrlFromArticle({ ...article, raw_payload: rawPayload }) || "";
  const logBase = {
    vendor,
    sourceUrl,
    title: title.slice(0, 100),
  };

  if (imageUrl) {
    logImageFallback({ ...logBase, ran: false, reason: "existing_image", imageUrl });
    return imageUrl;
  }

  if (!imageFallback) {
    logImageFallback({ ...logBase, ran: false, reason: "disabled", imageUrl: "" });
    return "";
  }

  if (!sourceUrl) {
    logImageFallback({ ...logBase, ran: false, reason: "missing_source_url", imageUrl: "" });
    return "";
  }

  if (isAggregatorSourceUrl(sourceUrl)) {
    logImageFallback({ ...logBase, ran: false, reason: "aggregator_source_url", imageUrl: "" });
    return "";
  }

  if (imageFallbackSeenSourceUrls.has(sourceUrl)) {
    logImageFallback({ ...logBase, ran: false, reason: "already_seen_source_url", imageUrl: "" });
    return "";
  }

  imageFallbackSeenSourceUrls.add(sourceUrl);

  try {
    const fallbackImageUrl = await withImageFallbackSlot(async () => {
      const { html, finalUrl } = await fetchHtmlForUrl(sourceUrl, { timeoutMs: 8000 });
      return extractImageUrlFromHtml(html, finalUrl);
    });

    const usableImageUrl = fallbackImageUrl && !isBlockedStoryImageUrl(fallbackImageUrl)
      ? fallbackImageUrl
      : "";

    logImageFallback({
      ...logBase,
      ran: true,
      reason: usableImageUrl ? "picked" : "not_found",
      imageUrl: usableImageUrl,
    });

    return usableImageUrl;
  } catch (error) {
    logImageFallback({
      ...logBase,
      ran: true,
      reason: "failed",
      error: error?.message || "Unknown image fallback error",
      imageUrl: "",
    });
    return "";
  }
};

export const buildRawArticleRow = async ({
  vendor,
  sourceName,
  article,
  regionCode,
  countryCode = null,
  category,
  emoji,
  tags = [],
  rawPayload = article,
  imageFallback,
}) => {
  const sourceUrl = normalizeExternalUrl(article.url || article.link || article.source_url);
  if (!sourceUrl) return null;

  const title = toSentence(article.title);
  if (!title) return null;

  const description = toSentence(article.description || article.summary || "");
  const content = toSentence(article.content || article.content_encoded || "");
  const imageUrl = await resolveArticleImageUrl({
    article,
    rawPayload,
    sourceUrl,
    vendor,
    title,
    imageFallback,
  });
  const publishedAt = article.publishedAt || article.published_at || article.pubDate || null;
  const decision = inferReviewDecision({
    vendor,
    sourceName: sourceName || article.source_name || "",
    sourceUrl,
    imageUrl,
    publishedAt,
    title,
    description,
    content,
    tags: [...tags, sourceUrl],
  });

  return {
    vendor,
    external_id: sourceUrl,
    source_url: sourceUrl,
    source_name: sourceName || article.source_name || "",
    title,
    description,
    content,
    image_url: imageUrl,
    published_at: publishedAt,
    region_code: regionCode,
    country_code: countryCode,
    category,
    emoji,
    review_status: decision.reviewStatus,
    review_notes: decision.reviewNotes,
    rejected_reason: decision.rejectedReason,
    raw_payload: rawPayload,
  };
};

export const dedupeBySourceUrl = rows =>
  Array.from(
    rows.reduce((acc, row) => {
      const existing = acc.get(row.source_url);
      if (!existing) {
        acc.set(row.source_url, row);
        return acc;
      }

      if (existing.region_code === "world" && row.region_code !== "world") {
        acc.set(row.source_url, row);
      }

      if (existing.review_status === "pending" && row.review_status === "approved") {
        acc.set(row.source_url, row);
      }

      return acc;
    }, new Map()).values(),
  );

export const upsertRawArticles = async (supabase, rows) => {
  if (rows.length === 0) return 0;

  const existingLookupChunkSize = 10;
  const upsertChunkSize = 150;
  const sourceUrls = rows.map(row => row.source_url);
  const existingRows = [];

  for (const sourceUrlChunk of chunkArray(sourceUrls, existingLookupChunkSize)) {
    const { data, error: existingError } = await supabase
      .from("raw_articles")
      .select("source_url, review_status, review_notes, rejected_reason, published_story_id")
      .in("source_url", sourceUrlChunk);

    if (existingError) {
      throw new Error(existingError.message || JSON.stringify(existingError));
    }

    existingRows.push(...(data || []));
  }

  const existingBySourceUrl = new Map((existingRows || []).map(row => [row.source_url, row]));
  const rowsToUpsert = rows.map(row => {
    const existing = existingBySourceUrl.get(row.source_url);
    if (!existing) return row;

    if (existing.review_status === "published") {
      return {
        ...row,
        review_status: "published",
        review_notes: existing.review_notes || row.review_notes,
        rejected_reason: "",
        published_story_id: existing.published_story_id || null,
      };
    }

    if (existing.review_status === "rejected") {
      const isAutoRejected = String(existing.rejected_reason || "").startsWith("auto_");
      if (isAutoRejected && row.review_status !== "rejected") {
        return {
          ...row,
          published_story_id: existing.published_story_id || null,
        };
      }

      return {
        ...row,
        review_status: "rejected",
        review_notes: existing.review_notes || row.review_notes,
        rejected_reason: existing.rejected_reason || row.rejected_reason,
        published_story_id: existing.published_story_id || null,
      };
    }

    if (existing.review_status === "approved" && row.review_status === "pending") {
      return {
        ...row,
        review_status: "approved",
        review_notes: existing.review_notes || row.review_notes,
        rejected_reason: "",
        published_story_id: existing.published_story_id || null,
      };
    }

    return {
      ...row,
      review_notes: existing.review_notes || row.review_notes,
      rejected_reason: row.review_status === "rejected" ? row.rejected_reason : "",
      published_story_id: existing.published_story_id || null,
    };
  });

  for (const rowsChunk of chunkArray(rowsToUpsert, upsertChunkSize)) {
    const { error } = await supabase
      .from("raw_articles")
      .upsert(rowsChunk, { onConflict: "source_url" });

    if (error) throw new Error(error.message || JSON.stringify(error));
  }

  return rowsToUpsert.length;
};

const extractTagValue = (block, tagName) => {
  const match = block.match(new RegExp(`<${tagName}[^>]*>([\\s\\S]*?)</${tagName}>`, "i"));
  return match ? toSentence(match[1]) : "";
};

const extractTagValues = (block, tagName) =>
  Array.from(block.matchAll(new RegExp(`<${tagName}[^>]*>([\\s\\S]*?)</${tagName}>`, "gi")))
    .map(match => toSentence(match[1]))
    .filter(Boolean);

export const parseRssItems = xml =>
  Array.from(xml.matchAll(/<item\b[\s\S]*?<\/item>/gi)).map(match => {
    const block = match[0];
    const sourceAttributes = extractTagAttributes(block, "source");
    const mediaContentAttributes = extractTagAttributesAll(block, "media:content");
    const mediaThumbnailAttributes = extractTagAttributesAll(block, "media:thumbnail");
    const enclosureAttributes = extractTagAttributesAll(block, "enclosure");
    const itunesImageAttributes = extractTagAttributes(block, "itunes:image");
    const htmlDescription = extractTagValue(block, "description");
    const htmlContent = extractTagValue(block, "content:encoded");
    const imageUrl =
      mediaContentAttributes
        .map(attributes => attributes.url || attributes.href || "")
        .map(value => normalizeExternalUrl(value))
        .find(isLikelyImageUrl) ||
      mediaThumbnailAttributes
        .map(attributes => attributes.url || attributes.href || "")
        .map(value => normalizeExternalUrl(value))
        .find(isLikelyImageUrl) ||
      enclosureAttributes
        .filter(attributes => String(attributes.type || "").toLowerCase().startsWith("image/") || isLikelyImageUrl(attributes.url || ""))
        .map(attributes => attributes.url || "")
        .map(value => normalizeExternalUrl(value))
        .find(isLikelyImageUrl) ||
      normalizeExternalUrl(itunesImageAttributes.href || itunesImageAttributes.url || "") ||
      extractImageUrlFromHtml(htmlContent) ||
      extractImageUrlFromHtml(htmlDescription);

    return {
      title: extractTagValue(block, "title"),
      link: extractTagValue(block, "link"),
      description: htmlDescription,
      content_encoded: htmlContent,
      pubDate: extractTagValue(block, "pubDate"),
      categories: extractTagValues(block, "category"),
      source: extractTagValue(block, "source"),
      source_url: sourceAttributes.url || "",
      image_url: imageUrl || "",
    };
  });
