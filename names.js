/* Full Court Dynasty — fictional world data. Every school and conference is invented. */
(function (root) {
  "use strict";
  // [name, abbrev, members, tier]  — 32 conferences, 365 teams, sized like 2026–27 Division I
  const CONFS = [
    ["Great Lakes Conference", "GLC", 18, 1], ["Southern Athletic Union", "SAU", 16, 1], ["Atlantic Seaboard Conference", "ASC", 18, 1],
    ["Heartland Sixteen", "H16", 16, 1], ["Capital Catholic League", "CCL", 11, 1],
    ["Cascade Conference", "CAS", 9, 2], ["High Desert Conference", "HDC", 10, 2], ["Pacific Shore League", "PSL", 10, 2],
    ["Atlantic River Conference", "ARC", 14, 2], ["Gulf States Conference", "GSC", 13, 2], ["Prairie Valley Conference", "PVC", 12, 2],
    ["Frontier Conference", "FRC", 11, 3], ["Sunshine Coast Conference", "SCC", 14, 3], ["Rust Belt Conference", "RBC", 12, 3],
    ["Tidewater Athletic Association", "TAA", 13, 3], ["Lakeshore League", "LSL", 10, 3], ["Hudson Valley Conference", "HVC", 13, 3],
    ["Blue Ridge Conference", "BRC", 10, 3], ["Golden Coast Conference", "GCC", 9, 3], ["Timberline Conference", "TLC", 9, 3],
    ["Piedmont League", "PDL", 11, 3], ["Red Rock Conference", "RRC", 10, 3], ["Northern Plains League", "NPL", 9, 3],
    ["Old Colony League", "OCL", 8, 3], ["Liberty Bell League", "LBL", 10, 3], ["Tri-State Conference", "TSC", 9, 3],
    ["North Atlantic League", "NAL", 9, 3], ["River Valley Conference", "RVC", 11, 3],
    ["Bayou Conference", "BAY", 11, 4], ["Delta Athletic Conference", "DAC", 12, 4], ["Chesapeake Athletic Conference", "CHA", 8, 4],
    ["Seaboard Conference", "SBC", 9, 4],
  ];
  const PRE = "Ash Amber Arbor Aspen Bay Bear Beech Birch Black Bluff Bright Brook Cedar Clear Cliff Cold Copper Crow Deer Dove Eagle Elm Ember Fair Falcon Fern Fox Frost Glen Gold Granite Gray Green Hart Haven Hawk Hazel Heron High Holly Iron Ivy Juniper Kestrel King Lark Laurel Linden Lynx Maple Marsh Meadow Mill Mist Moss Oak Orchard Osprey Otter Pine Plum Quail Raven Red Reed Ridge River Rock Rose Rowan Saber Sage Salt Shadow Silver Sky Snow Sparrow Spring Spruce Star Stone Storm Summer Sun Swan Thorn Timber Tide Vale Willow Wind Winter Wolf Wren Yarrow".split(" ");
  const SUF = "bridge brook bury by crest dale field ford gate glen grove hall haven hill hollow hurst land ley mere mont moor mouth port ridge shire stead stone ton vale view water well wick wood worth".split(" ");
  const SAINTS = "Aurelian Benedict Bernard Cyprian Dominic Edmund Felix Gregory Hilary Ignatius Jerome Lucian Matthias Ambrose Clement Isidore Leander Martin Nicholas Raymond Sebastian Silas Thaddeus Vincent".split(" ");
  const MASCOTS = "Aces Anchors Badgers Bandits Barons Bears Bengals Bison Blazers Bobcats Bulldogs Buccaneers Cardinals Cavaliers Chargers Chiefs Colts Comets Condors Cougars Coyotes Crusaders Cyclones Dolphins Dragons Eagles Explorers Falcons Flames Foxes Friars Gators Gophers Griffins Grizzlies Gulls Hawks Herons Highlanders Hornets Huskies Jaguars Javelinas Kestrels Knights Lancers Lions Lumberjacks Lynx Mariners Mavericks Miners Monarchs Mustangs Navigators Nighthawks Ospreys Otters Owls Panthers Pathfinders Pilots Pioneers Raiders Rams Rangers Rattlers Ravens Rebels Redhawks Riverhawks Rockets Royals Sabercats Sailors Scots Seahawks Sentinels Settlers Spartans Stags Stallions Storm Thunder Tigers Timberwolves Titans Toppers Trailblazers Vikings Voyagers Warhawks Wildcats Wolverines Wolves Yellowjackets Engineers Hurricanes Pelicans Kingfishers Bluejays Ridgebacks Wranglers Stormbirds".split(" ");
  const COLORS = ["#7a1020", "#0b4f8a", "#0f6b3a", "#5b2a86", "#c8102e", "#1d3c78", "#a3501c", "#2c2c2c", "#006d77", "#8a3b12", "#2f5d2a", "#4a4a6a", "#b8860b", "#00539b", "#862633", "#004c45", "#e35205", "#3c1053", "#7c878e", "#bf5700", "#002d72", "#9e1b32", "#154734", "#582c83", "#cc0033", "#00205b", "#6f263d", "#0c2340", "#a6192e", "#13294b", "#ba0c2f", "#4f2683"];
  root.HLNames = { CONFS, PRE, SUF, SAINTS, MASCOTS, COLORS };
  if (typeof module !== "undefined" && module.exports) module.exports = root.HLNames;
})(typeof window !== "undefined" ? window : globalThis);
