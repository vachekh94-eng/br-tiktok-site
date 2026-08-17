const form = document.getElementById('downloadForm');
const input = document.getElementById('tiktokUrl');
const btn = document.getElementById('downloadBtn');
const progressWrap = document.getElementById('progressWrap');
const progressEmojisEl = document.getElementById('progressEmojis');
const progressPercentEl = document.getElementById('progressPercent');
const fileLink = document.getElementById('fileLink');
const errorMsg = document.getElementById('errorMsg');

const EMOJI_COUNT = 10;

function buildEmojiRow() {
  progressEmojisEl.innerHTML = '';
  for (let i = 0; i < EMOJI_COUNT; i++) {
    const span = document.createElement('span');
    span.textContent = '🤙';
    progressEmojisEl.appendChild(span);
  }
}

function setProgress(percent) {
  progressPercentEl.textContent = Math.round(percent);
  const litCount = Math.round((percent / 100) * EMOJI_COUNT);
  [...progressEmojisEl.children].forEach((el, i) => {
    el.classList.toggle('lit', i < litCount);
  });
}

function resetUI() {
  errorMsg.hidden = true;
  fileLink.hidden = true;
  fileLink.removeAttribute('href');
  progressWrap.hidden = true;
  buildEmojiRow();
  setProgress(0);
}

function showError(text) {
  errorMsg.textContent = text;
  errorMsg.hidden = false;
  progressWrap.hidden = true;
}

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  const url = input.value.trim();
  if (!url) return;

  resetUI();
  btn.disabled = true;
  btn.textContent = '...';
  progressWrap.hidden = false;

  try {
    const res = await fetch('/.netlify/functions/download', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url })
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.error || 'Не удалось обработать ссылку. Проверь адрес видео.');
    }

    const { downloadUrl } = await res.json();
    if (!downloadUrl) throw new Error('Сервис не вернул ссылку на видео.');

    const videoRes = await fetch(downloadUrl);
    if (!videoRes.ok || !videoRes.body) throw new Error('Не удалось скачать файл.');

    const total = Number(videoRes.headers.get('Content-Length')) || 0;
    const reader = videoRes.body.getReader();
    const chunks = [];
    let received = 0;

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      chunks.push(value);
      received += value.length;
      if (total) {
        setProgress((received / total) * 100);
      }
    }

    if (!total) setProgress(100);

    const blob = new Blob(chunks, { type: 'video/mp4' });
    const blobUrl = URL.createObjectURL(blob);

    fileLink.href = blobUrl;
    fileLink.download = 'br-video.mp4';
    fileLink.hidden = false;
    setProgress(100);

  } catch (err) {
    showError(err.message || 'Что-то пошло не так. Попробуй ещё раз.');
  } finally {
    btn.disabled = false;
    btn.textContent = 'Скачать';
  }
});

resetUI();
