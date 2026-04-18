// ============================================================
// Amap (高德地图) configuration
// ------------------------------------------------------------
// Paste your Amap Web JS API key below. You can register a free
// key at https://lbs.amap.com/ (register → 应用管理 → 创建新应用
// → 添加 key → select "Web端(JS API)" platform).
//
// The key is loaded from <script src="https://webapi.amap.com/maps?...&key=AMAP_KEY">
// inside src/components/MapEmbed.tsx.
// ============================================================

export const AMAP_KEY = 'YOUR_AMAP_JS_API_KEY_HERE';

// Shanghai (上海) is the fixed origin for every roulette spin.
export const SHANGHAI = {
  nameEn: 'Shanghai',
  nameZh: '上海',
  lng: 121.4737,
  lat: 31.2304,
};
