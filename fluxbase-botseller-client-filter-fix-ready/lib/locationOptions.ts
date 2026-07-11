export const LOCATION_SCOPES = ["poland", "europe", "europe_countries", "voivodeship", "custom"] as const;

export type LocationScope = (typeof LOCATION_SCOPES)[number];

export const LOCATION_SCOPE_LABELS: Record<LocationScope, string> = {
  poland: "Cała Polska",
  europe: "Cała Europa",
  europe_countries: "Wybrane kraje Europy",
  voivodeship: "Województwa",
  custom: "Własne miasta",
};

export const POLISH_VOIVODESHIPS: Record<string, string[]> = {
  "dolnośląskie": ["Wrocław", "Wałbrzych", "Legnica", "Jelenia Góra", "Lubin", "Głogów", "Świdnica", "Bolesławiec", "Oleśnica", "Dzierżoniów", "Oława", "Zgorzelec", "Bielawa", "Kłodzko", "Jawor", "Trzebnica", "Polkowice", "Lubań", "Kamienna Góra", "Strzelin"],
  "kujawsko-pomorskie": ["Bydgoszcz", "Toruń", "Włocławek", "Grudziądz", "Inowrocław", "Brodnica", "Świecie", "Chełmno", "Nakło nad Notecią", "Rypin", "Solec Kujawski", "Żnin", "Lipno", "Tuchola", "Mogilno", "Aleksandrów Kujawski", "Golub-Dobrzyń", "Wąbrzeźno", "Radziejów"],
  "lubelskie": ["Lublin", "Chełm", "Zamość", "Biała Podlaska", "Puławy", "Świdnik", "Kraśnik", "Łuków", "Biłgoraj", "Lubartów", "Łęczna", "Tomaszów Lubelski", "Hrubieszów", "Dęblin", "Radzyń Podlaski", "Parczew", "Włodawa", "Opole Lubelskie", "Janów Lubelski"],
  "lubuskie": ["Zielona Góra", "Gorzów Wielkopolski", "Nowa Sól", "Żary", "Żagań", "Świebodzin", "Międzyrzecz", "Słubice", "Krosno Odrzańskie", "Kostrzyn nad Odrą", "Wschowa", "Sulechów", "Strzelce Krajeńskie", "Drezdenko"],
  "łódzkie": ["Łódź", "Piotrków Trybunalski", "Pabianice", "Tomaszów Mazowiecki", "Bełchatów", "Zgierz", "Skierniewice", "Radomsko", "Kutno", "Sieradz", "Zduńska Wola", "Łowicz", "Wieluń", "Opoczno", "Aleksandrów Łódzki", "Ozorków", "Łęczyca", "Rawa Mazowiecka", "Brzeziny"],
  "małopolskie": ["Kraków", "Tarnów", "Nowy Sącz", "Oświęcim", "Chrzanów", "Olkusz", "Nowy Targ", "Bochnia", "Gorlice", "Zakopane", "Wieliczka", "Myślenice", "Skawina", "Andrychów", "Kęty", "Wadowice", "Limanowa", "Brzesko", "Niepołomice", "Miechów"],
  "mazowieckie": ["Warszawa", "Radom", "Płock", "Siedlce", "Pruszków", "Legionowo", "Ostrołęka", "Ciechanów", "Mińsk Mazowiecki", "Żyrardów", "Otwock", "Piaseczno", "Wołomin", "Mława", "Nowy Dwór Mazowiecki", "Grodzisk Mazowiecki", "Grójec", "Kobyłka", "Marki", "Ząbki", "Sochaczew", "Garwolin", "Wyszków", "Płońsk", "Sokołów Podlaski"],
  "opolskie": ["Opole", "Kędzierzyn-Koźle", "Nysa", "Brzeg", "Kluczbork", "Prudnik", "Strzelce Opolskie", "Krapkowice", "Namysłów", "Głubczyce", "Olesno", "Głuchołazy", "Zdzieszowice"],
  "podkarpackie": ["Rzeszów", "Przemyśl", "Stalowa Wola", "Mielec", "Tarnobrzeg", "Krosno", "Dębica", "Jarosław", "Sanok", "Jasło", "Łańcut", "Ropczyce", "Leżajsk", "Lubaczów", "Nisko", "Przeworsk", "Ustrzyki Dolne"],
  "podlaskie": ["Białystok", "Suwałki", "Łomża", "Augustów", "Bielsk Podlaski", "Grajewo", "Hajnówka", "Zambrów", "Sokółka", "Wysokie Mazowieckie", "Siemiatycze", "Kolno", "Mońki"],
  "pomorskie": ["Gdańsk", "Gdynia", "Słupsk", "Tczew", "Starogard Gdański", "Wejherowo", "Rumia", "Chojnice", "Kwidzyn", "Malbork", "Lębork", "Pruszcz Gdański", "Kościerzyna", "Bytów", "Puck", "Człuchów", "Kartuzy"],
  "śląskie": ["Katowice", "Częstochowa", "Sosnowiec", "Gliwice", "Zabrze", "Bielsko-Biała", "Bytom", "Rybnik", "Ruda Śląska", "Tychy", "Dąbrowa Górnicza", "Chorzów", "Jaworzno", "Jastrzębie-Zdrój", "Mysłowice", "Siemianowice Śląskie", "Żory", "Tarnowskie Góry", "Będzin", "Piekary Śląskie", "Racibórz", "Świętochłowice", "Zawiercie", "Wodzisław Śląski", "Cieszyn", "Mikołów", "Knurów", "Lubliniec", "Żywiec"],
  "świętokrzyskie": ["Kielce", "Ostrowiec Świętokrzyski", "Starachowice", "Skarżysko-Kamienna", "Sandomierz", "Końskie", "Busko-Zdrój", "Jędrzejów", "Staszów", "Pińczów", "Włoszczowa", "Kazimierza Wielka", "Opatów"],
  "warmińsko-mazurskie": ["Olsztyn", "Elbląg", "Ełk", "Iława", "Ostróda", "Giżycko", "Kętrzyn", "Szczytno", "Bartoszyce", "Mrągowo", "Działdowo", "Pisz", "Braniewo", "Lidzbark Warmiński", "Gołdap", "Nidzica", "Olecko"],
  "wielkopolskie": ["Poznań", "Kalisz", "Konin", "Piła", "Ostrów Wielkopolski", "Gniezno", "Leszno", "Września", "Śrem", "Koło", "Turek", "Krotoszyn", "Jarocin", "Wągrowiec", "Swarzędz", "Kościan", "Rawicz", "Gostyń", "Szamotuły", "Chodzież", "Nowy Tomyśl", "Złotów", "Oborniki"],
  "zachodniopomorskie": ["Szczecin", "Koszalin", "Stargard", "Kołobrzeg", "Świnoujście", "Szczecinek", "Police", "Białogard", "Goleniów", "Gryfino", "Wałcz", "Drawsko Pomorskie", "Choszczno", "Sławno", "Kamień Pomorski", "Gryfice", "Myślibórz"]
};

export const VOIVODESHIP_NAMES = Object.keys(POLISH_VOIVODESHIPS);

export const POLAND_LOCATIONS = Array.from(new Set(Object.values(POLISH_VOIVODESHIPS).flat()));

export const EUROPE_COUNTRIES: Record<string, string[]> = {
  "Albania": ["Tirana, Albania", "Durrës, Albania", "Vlorë, Albania", "Shkodër, Albania", "Elbasan, Albania", "Fier, Albania", "Korçë, Albania", "Berat, Albania", "Sarandë, Albania", "Gjirokastër, Albania"],
  "Andora": ["Andorra la Vella, Andorra", "Escaldes-Engordany, Andorra", "Encamp, Andorra", "Sant Julià de Lòria, Andorra", "La Massana, Andorra", "Ordino, Andorra"],
  "Austria": ["Vienna, Austria", "Graz, Austria", "Linz, Austria", "Salzburg, Austria", "Innsbruck, Austria", "Klagenfurt, Austria", "Villach, Austria", "Wels, Austria", "Sankt Pölten, Austria", "Dornbirn, Austria", "Wiener Neustadt, Austria", "Steyr, Austria", "Feldkirch, Austria", "Bregenz, Austria", "Leoben, Austria"],
  "Belgia": ["Brussels, Belgium", "Antwerp, Belgium", "Ghent, Belgium", "Charleroi, Belgium", "Liège, Belgium", "Bruges, Belgium", "Namur, Belgium", "Leuven, Belgium", "Mons, Belgium", "Aalst, Belgium", "Mechelen, Belgium", "La Louvière, Belgium", "Kortrijk, Belgium", "Hasselt, Belgium", "Ostend, Belgium", "Tournai, Belgium", "Genk, Belgium", "Seraing, Belgium"],
  "Bośnia i Hercegowina": ["Sarajevo, Bosnia and Herzegovina", "Banja Luka, Bosnia and Herzegovina", "Tuzla, Bosnia and Herzegovina", "Zenica, Bosnia and Herzegovina", "Mostar, Bosnia and Herzegovina", "Bijeljina, Bosnia and Herzegovina", "Prijedor, Bosnia and Herzegovina", "Brčko, Bosnia and Herzegovina", "Doboj, Bosnia and Herzegovina", "Bihać, Bosnia and Herzegovina"],
  "Bułgaria": ["Sofia, Bulgaria", "Plovdiv, Bulgaria", "Varna, Bulgaria", "Burgas, Bulgaria", "Ruse, Bulgaria", "Stara Zagora, Bulgaria", "Pleven, Bulgaria", "Sliven, Bulgaria", "Dobrich, Bulgaria", "Shumen, Bulgaria", "Pernik, Bulgaria", "Haskovo, Bulgaria", "Yambol, Bulgaria", "Blagoevgrad, Bulgaria", "Veliko Tarnovo, Bulgaria"],
  "Chorwacja": ["Zagreb, Croatia", "Split, Croatia", "Rijeka, Croatia", "Osijek, Croatia", "Zadar, Croatia", "Pula, Croatia", "Slavonski Brod, Croatia", "Karlovac, Croatia", "Varaždin, Croatia", "Šibenik, Croatia", "Dubrovnik, Croatia", "Bjelovar, Croatia", "Sisak, Croatia", "Vinkovci, Croatia", "Koprivnica, Croatia"],
  "Cypr": ["Nicosia, Cyprus", "Limassol, Cyprus", "Larnaca, Cyprus", "Paphos, Cyprus", "Famagusta, Cyprus", "Kyrenia, Cyprus", "Protaras, Cyprus", "Ayia Napa, Cyprus", "Polis, Cyprus", "Paralimni, Cyprus"],
  "Czarnogóra": ["Podgorica, Montenegro", "Nikšić, Montenegro", "Herceg Novi, Montenegro", "Pljevlja, Montenegro", "Bar, Montenegro", "Bijelo Polje, Montenegro", "Cetinje, Montenegro", "Budva, Montenegro", "Berane, Montenegro", "Ulcinj, Montenegro", "Kotor, Montenegro", "Tivat, Montenegro"],
  "Czechy": ["Prague, Czechia", "Brno, Czechia", "Ostrava, Czechia", "Plzeň, Czechia", "Liberec, Czechia", "Olomouc, Czechia", "České Budějovice, Czechia", "Hradec Králové, Czechia", "Ústí nad Labem, Czechia", "Pardubice, Czechia", "Zlín, Czechia", "Karlovy Vary, Czechia", "Jihlava, Czechia", "Teplice, Czechia", "Děčín, Czechia", "Chomutov, Czechia", "Mladá Boleslav, Czechia", "Opava, Czechia"],
  "Dania": ["Copenhagen, Denmark", "Aarhus, Denmark", "Odense, Denmark", "Aalborg, Denmark", "Esbjerg, Denmark", "Randers, Denmark", "Kolding, Denmark", "Horsens, Denmark", "Vejle, Denmark", "Roskilde, Denmark", "Herning, Denmark", "Hørsholm, Denmark", "Helsingør, Denmark", "Silkeborg, Denmark", "Næstved, Denmark"],
  "Estonia": ["Tallinn, Estonia", "Tartu, Estonia", "Narva, Estonia", "Pärnu, Estonia", "Kohtla-Järve, Estonia", "Viljandi, Estonia", "Rakvere, Estonia", "Maardu, Estonia", "Sillamäe, Estonia", "Kuressaare, Estonia", "Võru, Estonia", "Valga, Estonia"],
  "Finlandia": ["Helsinki, Finland", "Espoo, Finland", "Tampere, Finland", "Vantaa, Finland", "Oulu, Finland", "Turku, Finland", "Jyväskylä, Finland", "Lahti, Finland", "Kuopio, Finland", "Pori, Finland", "Kouvola, Finland", "Joensuu, Finland", "Lappeenranta, Finland", "Hämeenlinna, Finland", "Vaasa, Finland", "Rovaniemi, Finland"],
  "Francja": ["Paris, France", "Marseille, France", "Lyon, France", "Toulouse, France", "Nice, France", "Nantes, France", "Strasbourg, France", "Montpellier, France", "Bordeaux, France", "Lille, France", "Rennes, France", "Reims, France", "Le Havre, France", "Saint-Étienne, France", "Toulon, France", "Grenoble, France", "Dijon, France", "Angers, France", "Nîmes, France", "Clermont-Ferrand, France", "Aix-en-Provence, France", "Brest, France", "Tours, France", "Amiens, France", "Limoges, France", "Annecy, France"],
  "Grecja": ["Athens, Greece", "Thessaloniki, Greece", "Patras, Greece", "Heraklion, Greece", "Larissa, Greece", "Volos, Greece", "Ioannina, Greece", "Chania, Greece", "Kavala, Greece", "Rhodes, Greece", "Trikala, Greece", "Serres, Greece", "Kalamata, Greece", "Alexandroupoli, Greece", "Katerini, Greece"],
  "Hiszpania": ["Madrid, Spain", "Barcelona, Spain", "Valencia, Spain", "Seville, Spain", "Zaragoza, Spain", "Málaga, Spain", "Murcia, Spain", "Palma, Spain", "Bilbao, Spain", "Alicante, Spain", "Córdoba, Spain", "Valladolid, Spain", "Vigo, Spain", "Gijón, Spain", "Granada, Spain", "A Coruña, Spain", "Vitoria-Gasteiz, Spain", "Elche, Spain", "Oviedo, Spain", "Santander, Spain", "Pamplona, Spain", "Toledo, Spain", "Salamanca, Spain", "Girona, Spain", "Tarragona, Spain", "Marbella, Spain"],
  "Holandia": ["Amsterdam, Netherlands", "Rotterdam, Netherlands", "The Hague, Netherlands", "Utrecht, Netherlands", "Eindhoven, Netherlands", "Groningen, Netherlands", "Tilburg, Netherlands", "Almere, Netherlands", "Breda, Netherlands", "Nijmegen, Netherlands", "Enschede, Netherlands", "Haarlem, Netherlands", "Arnhem, Netherlands", "Amersfoort, Netherlands", "Apeldoorn, Netherlands", "Leiden, Netherlands", "Dordrecht, Netherlands", "Maastricht, Netherlands", "Zwolle, Netherlands", "Delft, Netherlands"],
  "Irlandia": ["Dublin, Ireland", "Cork, Ireland", "Limerick, Ireland", "Galway, Ireland", "Waterford, Ireland", "Drogheda, Ireland", "Dundalk, Ireland", "Swords, Ireland", "Bray, Ireland", "Kilkenny, Ireland", "Ennis, Ireland", "Tralee, Ireland", "Carlow, Ireland", "Naas, Ireland", "Athlone, Ireland"],
  "Islandia": ["Reykjavík, Iceland", "Kópavogur, Iceland", "Hafnarfjörður, Iceland", "Akureyri, Iceland", "Reykjanesbær, Iceland", "Garðabær, Iceland", "Mosfellsbær, Iceland", "Selfoss, Iceland", "Akranes, Iceland", "Ísafjörður, Iceland"],
  "Kosowo": ["Pristina, Kosovo", "Prizren, Kosovo", "Peja, Kosovo", "Gjilan, Kosovo", "Ferizaj, Kosovo", "Mitrovica, Kosovo", "Gjakova, Kosovo", "Vushtrri, Kosovo", "Podujeva, Kosovo", "Suhareka, Kosovo"],
  "Liechtenstein": ["Vaduz, Liechtenstein", "Schaan, Liechtenstein", "Balzers, Liechtenstein", "Triesen, Liechtenstein", "Eschen, Liechtenstein", "Mauren, Liechtenstein"],
  "Litwa": ["Vilnius, Lithuania", "Kaunas, Lithuania", "Klaipėda, Lithuania", "Šiauliai, Lithuania", "Panevėžys, Lithuania", "Alytus, Lithuania", "Marijampolė, Lithuania", "Mažeikiai, Lithuania", "Jonava, Lithuania", "Utena, Lithuania", "Kėdainiai, Lithuania", "Telšiai, Lithuania"],
  "Luksemburg": ["Luxembourg, Luxembourg", "Esch-sur-Alzette, Luxembourg", "Differdange, Luxembourg", "Dudelange, Luxembourg", "Ettelbruck, Luxembourg", "Diekirch, Luxembourg", "Wiltz, Luxembourg", "Remich, Luxembourg"],
  "Łotwa": ["Riga, Latvia", "Daugavpils, Latvia", "Liepāja, Latvia", "Jelgava, Latvia", "Jūrmala, Latvia", "Ventspils, Latvia", "Rēzekne, Latvia", "Valmiera, Latvia", "Jēkabpils, Latvia", "Ogre, Latvia", "Tukums, Latvia", "Cēsis, Latvia"],
  "Macedonia Północna": ["Skopje, North Macedonia", "Bitola, North Macedonia", "Kumanovo, North Macedonia", "Prilep, North Macedonia", "Tetovo, North Macedonia", "Veles, North Macedonia", "Ohrid, North Macedonia", "Gostivar, North Macedonia", "Štip, North Macedonia", "Strumica, North Macedonia"],
  "Malta": ["Valletta, Malta", "Birkirkara, Malta", "Mosta, Malta", "Qormi, Malta", "Sliema, Malta", "St. Julian's, Malta", "Żabbar, Malta", "San Ġwann, Malta", "Naxxar, Malta", "Rabat, Malta", "Mellieħa, Malta"],
  "Mołdawia": ["Chișinău, Moldova", "Bălți, Moldova", "Tiraspol, Moldova", "Bender, Moldova", "Rîbnița, Moldova", "Cahul, Moldova", "Ungheni, Moldova", "Soroca, Moldova", "Orhei, Moldova", "Comrat, Moldova"],
  "Monako": ["Monaco, Monaco", "Monte Carlo, Monaco", "La Condamine, Monaco", "Fontvieille, Monaco", "Larvotto, Monaco"],
  "Niemcy": ["Berlin, Germany", "Hamburg, Germany", "Munich, Germany", "Cologne, Germany", "Frankfurt, Germany", "Stuttgart, Germany", "Düsseldorf, Germany", "Dortmund, Germany", "Essen, Germany", "Leipzig, Germany", "Bremen, Germany", "Dresden, Germany", "Hanover, Germany", "Nuremberg, Germany", "Mannheim, Germany", "Bonn, Germany", "Münster, Germany", "Karlsruhe, Germany", "Augsburg, Germany", "Wiesbaden, Germany", "Mainz, Germany", "Freiburg im Breisgau, Germany", "Kiel, Germany", "Magdeburg, Germany", "Potsdam, Germany", "Heidelberg, Germany", "Regensburg, Germany", "Würzburg, Germany", "Ingolstadt, Germany", "Ulm, Germany"],
  "Norwegia": ["Oslo, Norway", "Bergen, Norway", "Trondheim, Norway", "Stavanger, Norway", "Drammen, Norway", "Fredrikstad, Norway", "Kristiansand, Norway", "Sandnes, Norway", "Tromsø, Norway", "Sarpsborg, Norway", "Skien, Norway", "Ålesund, Norway", "Tønsberg, Norway", "Moss, Norway", "Haugesund, Norway", "Bodø, Norway"],
  "Polska": POLAND_LOCATIONS.map((city) => `${city}, Poland`),
  "Portugalia": ["Lisbon, Portugal", "Porto, Portugal", "Vila Nova de Gaia, Portugal", "Amadora, Portugal", "Braga, Portugal", "Coimbra, Portugal", "Funchal, Portugal", "Setúbal, Portugal", "Aveiro, Portugal", "Faro, Portugal", "Leiria, Portugal", "Évora, Portugal", "Viseu, Portugal", "Guimarães, Portugal", "Cascais, Portugal", "Sintra, Portugal"],
  "Rumunia": ["Bucharest, Romania", "Cluj-Napoca, Romania", "Timișoara, Romania", "Iași, Romania", "Constanța, Romania", "Craiova, Romania", "Brașov, Romania", "Galați, Romania", "Ploiești, Romania", "Oradea, Romania", "Sibiu, Romania", "Arad, Romania", "Pitești, Romania", "Baia Mare, Romania", "Târgu Mureș, Romania", "Bacău, Romania", "Suceava, Romania", "Satu Mare, Romania"],
  "San Marino": ["San Marino, San Marino", "Serravalle, San Marino", "Borgo Maggiore, San Marino", "Domagnano, San Marino", "Fiorentino, San Marino"],
  "Serbia": ["Belgrade, Serbia", "Novi Sad, Serbia", "Niš, Serbia", "Kragujevac, Serbia", "Subotica, Serbia", "Zrenjanin, Serbia", "Pančevo, Serbia", "Čačak, Serbia", "Kraljevo, Serbia", "Novi Pazar, Serbia", "Leskovac, Serbia", "Smederevo, Serbia", "Valjevo, Serbia", "Kruševac, Serbia"],
  "Słowacja": ["Bratislava, Slovakia", "Košice, Slovakia", "Prešov, Slovakia", "Žilina, Slovakia", "Banská Bystrica, Slovakia", "Nitra, Slovakia", "Trnava, Slovakia", "Trenčín, Slovakia", "Martin, Slovakia", "Poprad, Slovakia", "Prievidza, Slovakia", "Zvolen, Slovakia", "Považská Bystrica, Slovakia", "Nové Zámky, Slovakia"],
  "Słowenia": ["Ljubljana, Slovenia", "Maribor, Slovenia", "Celje, Slovenia", "Kranj, Slovenia", "Koper, Slovenia", "Velenje, Slovenia", "Novo Mesto, Slovenia", "Ptuj, Slovenia", "Trbovlje, Slovenia", "Kamnik, Slovenia", "Jesenice, Slovenia", "Nova Gorica, Slovenia"],
  "Szwajcaria": ["Zurich, Switzerland", "Geneva, Switzerland", "Basel, Switzerland", "Lausanne, Switzerland", "Bern, Switzerland", "Winterthur, Switzerland", "Lucerne, Switzerland", "St. Gallen, Switzerland", "Lugano, Switzerland", "Biel/Bienne, Switzerland", "Thun, Switzerland", "Köniz, Switzerland", "La Chaux-de-Fonds, Switzerland", "Fribourg, Switzerland", "Schaffhausen, Switzerland", "Chur, Switzerland"],
  "Szwecja": ["Stockholm, Sweden", "Gothenburg, Sweden", "Malmö, Sweden", "Uppsala, Sweden", "Västerås, Sweden", "Örebro, Sweden", "Linköping, Sweden", "Helsingborg, Sweden", "Jönköping, Sweden", "Norrköping, Sweden", "Lund, Sweden", "Umeå, Sweden", "Gävle, Sweden", "Borås, Sweden", "Eskilstuna, Sweden", "Karlstad, Sweden", "Växjö, Sweden", "Halmstad, Sweden"],
  "Turcja": ["Istanbul, Turkey", "Ankara, Turkey", "Izmir, Turkey", "Bursa, Turkey", "Antalya, Turkey", "Konya, Turkey", "Adana, Turkey", "Gaziantep, Turkey", "Kayseri, Turkey", "Mersin, Turkey", "Eskişehir, Turkey", "Diyarbakır, Turkey", "Samsun, Turkey", "Denizli, Turkey"],
  "Ukraina": ["Kyiv, Ukraine", "Kharkiv, Ukraine", "Odesa, Ukraine", "Dnipro, Ukraine", "Lviv, Ukraine", "Zaporizhzhia, Ukraine", "Vinnytsia, Ukraine", "Poltava, Ukraine", "Chernihiv, Ukraine", "Cherkasy, Ukraine", "Zhytomyr, Ukraine", "Chernivtsi, Ukraine", "Rivne, Ukraine", "Ivano-Frankivsk, Ukraine", "Ternopil, Ukraine", "Uzhhorod, Ukraine"],
  "Węgry": ["Budapest, Hungary", "Debrecen, Hungary", "Szeged, Hungary", "Miskolc, Hungary", "Pécs, Hungary", "Győr, Hungary", "Nyíregyháza, Hungary", "Kecskemét, Hungary", "Székesfehérvár, Hungary", "Szombathely, Hungary", "Érd, Hungary", "Tatabánya, Hungary", "Sopron, Hungary", "Kaposvár, Hungary", "Veszprém, Hungary"],
  "Wielka Brytania": ["London, United Kingdom", "Manchester, United Kingdom", "Birmingham, United Kingdom", "Leeds, United Kingdom", "Glasgow, United Kingdom", "Liverpool, United Kingdom", "Bristol, United Kingdom", "Sheffield, United Kingdom", "Edinburgh, United Kingdom", "Cardiff, United Kingdom", "Newcastle upon Tyne, United Kingdom", "Nottingham, United Kingdom", "Leicester, United Kingdom", "Coventry, United Kingdom", "Belfast, United Kingdom", "Brighton, United Kingdom", "Southampton, United Kingdom", "Oxford, United Kingdom", "Cambridge, United Kingdom", "York, United Kingdom", "Reading, United Kingdom", "Aberdeen, United Kingdom", "Plymouth, United Kingdom", "Swansea, United Kingdom", "Portsmouth, United Kingdom"],
  "Włochy": ["Rome, Italy", "Milan, Italy", "Naples, Italy", "Turin, Italy", "Palermo, Italy", "Genoa, Italy", "Bologna, Italy", "Florence, Italy", "Bari, Italy", "Catania, Italy", "Venice, Italy", "Verona, Italy", "Messina, Italy", "Padua, Italy", "Trieste, Italy", "Brescia, Italy", "Parma, Italy", "Modena, Italy", "Reggio Calabria, Italy", "Perugia, Italy", "Livorno, Italy", "Ravenna, Italy", "Cagliari, Italy", "Rimini, Italy", "Siena, Italy", "Pisa, Italy"],
};
export const EUROPE_COUNTRIES_WITHOUT_POLAND = Object.fromEntries(
  Object.entries(EUROPE_COUNTRIES).filter(([country]) => country !== "Polska"),
) as Record<string, string[]>;

export const EUROPE_COUNTRY_NAMES = Object.keys(EUROPE_COUNTRIES);
export const EUROPE_COUNTRY_NAMES_FOR_EUROPE_PLAN = Object.keys(EUROPE_COUNTRIES_WITHOUT_POLAND);
export const EUROPE_LOCATIONS = Array.from(new Set(Object.values(EUROPE_COUNTRIES).flat()));
export const EUROPE_LOCATIONS_WITHOUT_POLAND = Array.from(new Set(Object.values(EUROPE_COUNTRIES_WITHOUT_POLAND).flat()));

const POLAND_LOCATION_SET = new Set([
  ...POLAND_LOCATIONS.map((city) => city.toLowerCase()),
  ...POLAND_LOCATIONS.map((city) => `${city}, poland`.toLowerCase()),
  ...POLAND_LOCATIONS.map((city) => `${city}, polska`.toLowerCase()),
]);

export function isPolishLocation(value: string | null | undefined) {
  const normalized = (value || "").trim().toLowerCase();
  if (!normalized) return false;
  if (["polska", "cała polska", "cala polska", "all poland"].includes(normalized)) return true;
  if (normalized.includes(", poland") || normalized.includes(", polska")) return true;
  return POLAND_LOCATION_SET.has(normalized);
}

export function languageForLocation(value: string | null | undefined): "pl" | "en" {
  return isPolishLocation(value) ? "pl" : "en";
}

export function languageForCampaignLocation(scope: string | null | undefined, locations: string[] | null | undefined, placeCity?: string | null): "pl" | "en" {
  if (scope === "poland" || scope === "voivodeship") return "pl";
  if (placeCity && isPolishLocation(placeCity)) return "pl";
  const list = (locations || []).map((item) => item.trim()).filter(Boolean);
  if (list.length && list.every(isPolishLocation)) return "pl";
  return "en";
}

export function normalizeLocationLabel(value: string) {
  const key = value.trim().toLowerCase();
  const map: Record<string, string> = {
    "cala polska": "cała polska",
    "cała polska": "cała polska",
    "polska": "cała polska",
    "all poland": "cała polska",
    "cala europa": "cała europa",
    "cała europa": "cała europa",
    "europa": "cała europa",
    "europe": "cała europa",
    "all europe": "cała europa",
    "wybrane kraje europy": "wybrane kraje europy",
    "kraje europy": "wybrane kraje europy",
    "europe countries": "wybrane kraje europy",
  };
  if (map[key]) return map[key];
  const country = EUROPE_COUNTRY_NAMES.find((name) => name.toLowerCase() === key);
  if (country) return country;
  return key;
}

export function expandLocations(rawLocations: string[] | null | undefined, options: { max?: number } = {}) {
  const limit = options.max ?? 120;
  const items = (rawLocations || []).map((item) => item.trim()).filter(Boolean);
  if (!items.length) return POLAND_LOCATIONS.slice(0, limit);

  const expanded: string[] = [];
  for (const item of items) {
    const normalized = normalizeLocationLabel(item);
    if (normalized === "cała polska") expanded.push(...POLAND_LOCATIONS);
    else if (normalized === "cała europa") expanded.push(...EUROPE_LOCATIONS_WITHOUT_POLAND);
    else if (POLISH_VOIVODESHIPS[normalized]) expanded.push(...POLISH_VOIVODESHIPS[normalized]);
    else if (EUROPE_COUNTRIES[normalized]) expanded.push(...EUROPE_COUNTRIES[normalized]);
    else expanded.push(item);
  }

  return Array.from(new Set(expanded)).slice(0, limit);
}
