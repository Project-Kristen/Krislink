const fetch = require("node-fetch");
const cheerio = require("cheerio");

var ua = [
  "Mozilla/5.0 (Windows NT 10.0) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/52.0.2743.116 Safari/537.36 Edge/15.15063",
  "Mozilla/5.0 (Windows NT 10.0; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/93.0.4577.63 Safari/537.36."
];
const headers = {
  "accept-language": "en-UK",
  "user-agent":
    ua[Math.floor(Math.random() * ua.length)]
};
async function getLyrics(query) {
  var text = await fetch(`https://cse.google.com/cse.js?hpg=1&cx=85cdfbdd90d0e46c1`, { headers });
  var html = await text.text();
  var json = "{" + html.split(')({')[1].slice(0, -2);
  var json = JSON.parse(json);
  var rannum = Math.floor(Math.random() * 20000);
  if (rannum < 10000) {
    var rannum = rannum + 10000;
  };
  var text = await fetch(`https://cse.google.com/cse/element/v1?rsz=filtered_cse&num=10&hl=en&source=gcsc&gss=.com&cselibv=${json.cselibVersion}&cx=${json['cx']}&q=${encodeURIComponent(query)}&safe=off&cse_tok=${json['cse_token']}&sort=&exp=${json['exp'].join(",")}&oq=${encodeURIComponent(query)}&cseclient=hosted-page-client&callback=google.search.cse.api${rannum}`, { headers });
  const resulttext = await text.text();
  const resultJSON = JSON.parse(resulttext.replace(`/*O_o*/`, "").replace(`google.search.cse.api${rannum}(`, "").slice(0, -2));
  const result = resultJSON['results'];
  return await analyticsURL(result);
};

async function analyticsURL(json) {
  const firstJSON = json[0];
  if (firstJSON['visibleUrl'] === 'mojim.com') {
    return await mojim(firstJSON['url'])
  } else if (firstJSON['visibleUrl'] === 'www.kkbox.com') {
    return await kkbox(firstJSON['url'])
  }
};

async function mojim(url) {
  const fetching = await fetch(url, { headers });
  const html = await fetching.text();
  const $ = await cheerio.load(html);
  var lyrics = await $('.fsZ').find('dl[class="fsZx1"]').html().replace(/<br>/g, '\n').replace(/Find more lyrics at ※ Mojim.com/g, '').replace(/更多更详尽歌词 在 ※ Mojim.com　魔镜歌词网/g, '').replace(/更多更詳盡歌詞 在 ※ Mojim.com　魔鏡歌詞網/g, '');
  if(lyrics.split('---------').length !== 0) {
    var lyrics = lyrics.split('---------')[0];
  } else if (lyrics.split('[').length !== 0) {
    var lyrics = lyrics.split('[')[0];
  };
  const checkJSON = JSON.parse($('script').eq(9).html());
  const Json = {};
  Json.name = checkJSON['itemListElement'][2]['name'];
  Json.url = url;
  Json.artist = checkJSON['itemListElement'][0]['name'];
  Json.lyrics = await cheerio.load(lyrics).text()
  Json.thumbnail = `http://mojim.com/logo-fb-g.jpg`;
  Json.source = `mojim.com`;
  return Json;
};

async function kkbox(url) {
  const fetching = await fetch(url, { headers });
  const html = await fetching.text();
  const $ = await cheerio.load(html);
  const json = JSON.parse($('script').eq(2).html());
  const Json = {};
  Json.name = json['name'];
  Json.url = json['url'];
  Json.artist = json['byArtist']['name'];
  Json.lyrics = json['recordingOf']['lyrics']['text'];
  Json.thumbnail = $('meta[property="og:image"]').attr('content');
  Json.source = `www.kkbox.com`;
  return Json;
};

module.exports = {
    getLyrics
}
