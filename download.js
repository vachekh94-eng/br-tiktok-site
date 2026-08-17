// Serverless-функция Netlify.
// Принимает { url } со ссылкой на TikTok-видео и возвращает { downloadUrl }
// с прямой ссылкой на файл без водяного знака.
//
// Использует бесплатный публичный API tikwm.com. Если он окажется
// нестабильным/недоступным, замените TIKWM_ENDPOINT на другой сервис
// (например, RapidAPI "TikTok Downloader" — тогда потребуется добавить
// заголовок с вашим API-ключом, см. переменные окружения Netlify).

const TIKWM_ENDPOINT = 'https://www.tikwm.com/api/';

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  let tiktokUrl;
  try {
    const body = JSON.parse(event.body || '{}');
    tiktokUrl = (body.url || '').trim();
  } catch {
    return { statusCode: 400, body: JSON.stringify({ error: 'Некорректный запрос' }) };
  }

  if (!tiktokUrl || !/tiktok\.com/i.test(tiktokUrl)) {
    return { statusCode: 400, body: JSON.stringify({ error: 'Укажи корректную ссылку на TikTok-видео' }) };
  }

  try {
    const apiRes = await fetch(`${TIKWM_ENDPOINT}?url=${encodeURIComponent(tiktokUrl)}&hd=1`);
    const data = await apiRes.json();

    if (data.code !== 0 || !data.data) {
      return { statusCode: 502, body: JSON.stringify({ error: 'Не удалось получить видео. Проверь ссылку.' }) };
    }

    // play — версия без водяного знака
    const rawUrl = data.data.hdplay || data.data.play;
    const downloadUrl = rawUrl.startsWith('http') ? rawUrl : `https://www.tikwm.com${rawUrl}`;

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ downloadUrl })
    };
  } catch (err) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Сервис временно недоступен, попробуй позже.' })
    };
  }
};
