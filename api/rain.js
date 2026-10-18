// 물멍 실시간 비 중계 함수 (Vercel Serverless Function)
// 노르웨이 기상청(MET Norway) 자료로 명소마다 지금 비가 오는지 알려줘요.
//   /api/rain?part=0 ~ 3      → 명소를 네 묶음으로 나눠, 한 묶음의 지금 날씨
//   /api/rain?lat=..&lon=..   → 지도에서 누른 곳 한 군데의 지금 날씨
// 결과는 Vercel이 20분 동안 저장해두고 모든 사용자에게 나눠줘요.
// 그래서 사용자가 아무리 많아도 기상청에는 같은 곳을 20분에 한 번 정도만 물어봐요.

// 기상청 이용 규칙: 요청마다 앱 이름과 연락처를 밝혀야 해요.
// 저장소 이름을 mulmeong이 아닌 다른 이름으로 만들었다면 아래 주소도 바꿔주세요.
const CONTACT = 'https://github.com/lgm500338/mulmeong';
const USER_AGENT = `mulmeong/1.0 (${CONTACT})`;
const PARTS = 4;

// 명소 좌표 (앱의 index.html 안 PLACES_RAW 목록과 이름표가 같아야 해요)
const PLACES = {"jeju-seongsan":[33.458,126.942],"busan-haeundae":[35.158,129.16],"gangneung-gyeongpo":[37.805,128.908],"halong-bay":[20.91,107.184],"cebu-moalboal":[9.95,123.4],"phi-phi":[7.74,98.77],"bali-uluwatu":[-8.829,115.085],"maldives":[4.175,73.509],"okinawa":[26.21,127.68],"waikiki":[21.276,-157.827],"santorini":[36.416,25.432],"amalfi":[40.634,14.602],"algarve-benagil":[37.087,-8.426],"cliffs-of-moher":[52.972,-9.426],"seven-sisters":[50.744,0.157],"lofoten":[68.2,13.6],"geirangerfjord":[62.1,7.09],"reynisfjara":[63.404,-19.045],"big-sur":[36.236,-121.81],"cannon-beach":[45.892,-123.961],"peggys-cove":[44.492,-63.917],"twelve-apostles":[-38.665,143.105],"bondi":[-33.891,151.277],"piha":[-36.954,174.469],"milford-sound":[-44.67,167.93],"cape-town":[-33.951,18.377],"copacabana":[-22.971,-43.182],"tulum":[20.211,-87.465],"zanzibar":[-6.165,39.19],"seychelles":[-4.36,55.83],"goa":[15.49,73.82],"mirissa":[5.946,80.458],"lake-bled":[46.363,14.094],"hallstatt":[47.562,13.649],"lake-como":[46.016,9.257],"lago-di-braies":[46.694,12.085],"lake-lucerne":[47.0,8.4],"lake-geneva":[46.45,6.6],"loch-lomond":[56.08,-4.6],"lake-saimaa":[61.2,28.2],"lake-baikal":[53.5,108.0],"lake-louise":[51.417,-116.217],"crater-lake":[42.944,-122.109],"lake-tahoe":[39.096,-120.032],"lake-kawaguchi":[35.517,138.75],"west-lake":[30.243,120.15],"chuncheon-uiam":[37.88,127.69],"upo-wetland":[35.555,128.418],"lake-tekapo":[-44.004,170.477],"lake-wanaka":[-44.7,169.13],"lake-titicaca":[-15.84,-69.33],"lake-atitlan":[14.69,-91.2],"niagara":[43.078,-79.075],"iguazu":[-25.695,-54.437],"victoria-falls":[-17.925,25.857],"gullfoss":[64.327,-20.121],"seljalandsfoss":[63.616,-19.989],"skogafoss":[63.532,-19.511],"voringsfossen":[60.43,7.25],"rhine-falls":[47.678,8.615],"plitvice":[44.88,15.62],"yosemite-falls":[37.756,-119.597],"multnomah":[45.576,-122.116],"havasu":[36.255,-112.698],"akaka":[19.854,-155.152],"jeongbang":[33.245,126.572],"kegon":[36.738,139.502],"ban-gioc":[22.854,106.724],"kuang-si":[19.749,101.994],"han-river":[37.52,126.98],"andong-hahoe":[36.539,128.518],"seine":[48.857,2.35],"thames":[51.507,-0.12],"vltava":[50.086,14.411],"danube-budapest":[47.507,19.045],"neckar-heidelberg":[49.41,8.71],"amsterdam-canals":[52.37,4.89],"bruges":[51.209,3.225],"venice":[45.437,12.335],"kamo-river":[35.01,135.77],"li-river":[24.78,110.49],"mekong":[19.89,102.13],"varanasi":[25.31,83.01],"amazon":[-3.1,-60.0],"horseshoe-bend":[36.88,-111.51],"seoraksan":[38.17,128.48],"jirisan":[35.36,127.6],"oirase":[40.56,140.94],"yakushima":[30.35,130.53],"jiuzhaigou":[33.26,103.92],"zhangjiajie":[29.32,110.43],"taroko":[24.16,121.62],"kinabalu":[6.07,116.56],"daintree":[-16.25,145.42],"monteverde":[10.3,-84.82],"hoh-rainforest":[47.86,-123.93],"smoky-mountains":[35.61,-83.49],"fairy-pools":[57.25,-6.27],"lauterbrunnen":[46.59,7.91],"black-forest":[48.0,8.2],"madeira":[32.75,-16.95]};

async function fetchPoint(lat, lon) {
  const url = `https://api.met.no/weatherapi/locationforecast/2.0/compact?lat=${lat}&lon=${lon}`;
  const r = await fetch(url, { headers: { 'User-Agent': USER_AGENT } });
  if (!r.ok) throw new Error('met.no ' + r.status);
  const j = await r.json();
  const series = (j.properties && j.properties.timeseries) || [];
  const now = Date.now() - 30 * 60 * 1000;
  const entry = series.find((s) => new Date(s.time).getTime() >= now) || series[0];
  if (!entry) throw new Error('no data');
  const d = entry.data.instant.details || {};
  const n1 = entry.data.next_1_hours || {};
  const n6 = entry.data.next_6_hours || {};
  return {
    p: Math.round(((n1.details && n1.details.precipitation_amount) || 0) * 10) / 10, // 앞으로 1시간 비의 양 (mm)
    s: (n1.summary && n1.summary.symbol_code) || '',                                  // 앞으로 1시간 날씨 기호
    s6: (n6.summary && n6.summary.symbol_code) || '',                                 // 앞으로 6시간 날씨 기호
    t: Math.round(d.air_temperature || 0),
    w: Math.round((d.wind_speed || 0) * 10) / 10,
    wd: Math.round(d.wind_from_direction || 0),
    c: Math.round(d.cloud_area_fraction || 0),
  };
}

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  const q = req.query || {};
  if (q.lat !== undefined || q.lon !== undefined) {
    const lat = Number(q.lat), lon = Number(q.lon);
    if (!Number.isFinite(lat) || !Number.isFinite(lon) || Math.abs(lat) > 85 || Math.abs(lon) > 180) {
      res.status(400).json({ error: 'bad position' });
      return;
    }
    // 0.5도 단위로 묶어서 같은 곳은 같은 답을 나눠 써요
    const rlat = Math.round(lat * 2) / 2, rlon = Math.round(lon * 2) / 2;
    try {
      const w = await fetchPoint(rlat, rlon);
      res.setHeader('Cache-Control', 's-maxage=1200, stale-while-revalidate=2400');
      res.status(200).json({ updated: new Date().toISOString(), point: w });
    } catch (e) {
      res.setHeader('Cache-Control', 's-maxage=60');
      res.status(502).json({ error: 'weather unavailable' });
    }
    return;
  }
  const part = Math.max(0, Math.min(PARTS - 1, parseInt(q.part || '0', 10) || 0));
  const all = Object.entries(PLACES);
  const size = Math.ceil(all.length / PARTS);
  const mine = all.slice(part * size, (part + 1) * size);
  // 한꺼번에 너무 많이 묻지 않도록 아홉 곳씩 나눠서 물어봐요
  const out = {};
  for (let i = 0; i < mine.length; i += 9) {
    const got = await Promise.all(mine.slice(i, i + 9).map(async ([id, [lat, lon]]) => {
      try { return [id, await fetchPoint(lat, lon)]; } catch (e) { return [id, null]; }
    }));
    for (const [id, w] of got) if (w) out[id] = w;
  }
  res.setHeader('Cache-Control', 's-maxage=1200, stale-while-revalidate=2400');
  res.status(200).json({ updated: new Date().toISOString(), part, places: out });
};
