// Independent rounds: edits to the selection affect only the next game.
(() => {
  const board = $('memoryBoard');
  const status = $('memoryStatus');
  const feedback = $('memoryFeedback');
  const audio = $('memoryAudio');
  const imageChecks = new Map();
  let generation = 0;
  let hideTimer;
  let cards = [];
  let first = null;
  let locked = false;
  let attempts = 0;
  let matches = 0;
  let total = 0;

  function shuffled(items) {
    const result = [...items];
    for (let i = result.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [result[i], result[j]] = [result[j], result[i]];
    }
    return result;
  }

  function checkImage(url) {
    if (!imageChecks.has(url)) {
      imageChecks.set(url, new Promise(resolve => {
        const picture = new Image();
        const finish = loaded => {
          clearTimeout(timer);
          picture.onload = picture.onerror = null;
          resolve(loaded);
          // Allow a later round to retry a transient failure.
          if (!loaded) imageChecks.delete(url);
        };
        const timer = setTimeout(() => finish(false), 4000);
        picture.onload = () => finish(picture.naturalWidth > 0);
        picture.onerror = () => finish(false);
        picture.src = url;
      }));
    }
    return imageChecks.get(url);
  }

  function updateStatus() {
    status.textContent = `Parejas: ${matches}/${total} · Intentos: ${attempts}`;
  }

  function show(card, visible) {
    card.button.classList.toggle('is-visible', visible);
    card.face.hidden = !visible;
    card.back.hidden = visible;
    card.button.setAttribute('aria-label', visible
      ? card.type === 'word' ? `Palabra: ${card.word.Word}` : 'Imagen para encontrar su palabra en inglés'
      : `Carta ${card.position + 1}, oculta`);
    card.button.setAttribute('aria-pressed', String(visible));
  }

  function flip(card) {
    if (locked || card.matched || first === card) return;
    show(card, true);
    if (!first) {
      first = card;
      feedback.textContent = 'Carta volteada. Elige otra carta.';
      return;
    }
    const previous = first;
    first = null;
    attempts++;
    if (previous.word.Title === card.word.Title && previous.type !== card.type) {
      matches++;
      for (const item of [previous, card]) {
        item.matched = true;
        item.button.classList.add('is-matched');
        item.button.setAttribute('aria-disabled', 'true');
        item.button.setAttribute('aria-label', `Pareja encontrada: ${item.word.Word}`);
      }
      const listen = document.createElement('button');
      listen.type = 'button';
      listen.className = 'btn-listen';
      listen.textContent = `🔊 ${card.word.Word}`;
      listen.setAttribute('aria-label', `Escuchar ${card.word.Word}`);
      listen.onclick = () => speak(card.word.Word);
      audio.append(listen);
      feedback.textContent = matches === total
        ? `¡Completaste las ${total} parejas en ${attempts} intentos! Puedes escuchar las palabras o comenzar otra partida.`
        : `¡Pareja encontrada! ${card.word.Word}. Ya puedes escuchar su pronunciación.`;
    } else {
      locked = true;
      feedback.textContent = 'Estas cartas no forman una pareja. Inténtalo de nuevo.';
      const round = generation;
      hideTimer = setTimeout(() => {
        if (round !== generation) return;
        show(previous, false);
        show(card, false);
        locked = false;
      }, 1100);
    }
    updateStatus();
  }

  async function start(source) {
    const round = ++generation;
    clearTimeout(hideTimer);
    first = null;
    locked = true;
    cards = [];
    attempts = matches = total = 0;
    board.replaceChildren();
    audio.replaceChildren();
    feedback.textContent = '';
    status.textContent = 'Comprobando imágenes…';
    board.setAttribute('aria-busy', 'true');
    const seen = new Set();
    const pool = shuffled(source.filter(word => {
      if (!word.Title || !word.Word || !String(word.ImageUrl || '').trim() || seen.has(word.Title)) return false;
      seen.add(word.Title);
      return true;
    }).map(word => ({ ...word })));
    const available = [];
    // Check in bounded batches, stopping as soon as six usable pairs exist.
    for (let i = 0; i < pool.length && available.length < 6; i += 6) {
      const batch = pool.slice(i, i + 6);
      const loaded = await Promise.all(batch.map(word => checkImage(word.ImageUrl)));
      if (round !== generation) return;
      batch.forEach((word, index) => { if (loaded[index]) available.push(word); });
    }
    if (round !== generation) return;
    board.setAttribute('aria-busy', 'false');
    if (available.length < 2) {
      status.textContent = 'No hay suficientes imágenes para jugar.';
      feedback.textContent = 'Necesitas al menos dos palabras con imágenes disponibles. Agrega otras palabras a tu lista o elige otra unidad.';
      return;
    }
    const words = available.slice(0, 6);
    total = words.length;
    cards = shuffled(words.flatMap(word => [{ word, type: 'image' }, { word, type: 'word' }]));
    cards.forEach((card, position) => {
      card.position = position;
      card.button = document.createElement('button');
      card.button.type = 'button';
      card.button.className = 'memory-card';
      card.back = document.createElement('span');
      card.back.textContent = '?';
      card.back.setAttribute('aria-hidden', 'true');
      card.face = document.createElement('span');
      card.face.className = 'memory-face';
      if (card.type === 'image') {
        const picture = document.createElement('img');
        picture.src = card.word.ImageUrl;
        picture.alt = 'Imagen para encontrar su palabra en inglés';
        card.face.append(picture);
      } else {
        card.face.lang = 'en';
        card.face.textContent = card.word.Word;
      }
      card.button.append(card.back, card.face);
      card.button.onclick = () => flip(card);
      show(card, false);
      board.append(card.button);
    });
    locked = false;
    updateStatus();
    feedback.textContent = total < 6 ? `Jugaremos con ${total} parejas: no hay seis imágenes disponibles en este grupo.` : 'Encuentra las seis parejas de imagen y palabra. Sin límite de tiempo.';
    cards[0].button.focus({ preventScroll: true });
  }

  $('startSelectedMemory').onclick = () => {
    $('memorySection').scrollIntoView({ behavior: 'smooth', block: 'start' });
    start(state.selected);
  };
  $('memorySelected').onclick = () => start(state.selected);
  $('memoryUnit').onclick = () => start(state.list);
})();
