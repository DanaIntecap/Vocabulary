// Shared behavior for vocabulary cards and the random practice card.
state.showAll = false;
const escapeCard = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function exampleSentence(word) {
  return word.ExampleSentence ? `<span class="example-sentence"><span class="pronunciation-label">Ejemplo · Simple present</span><span lang="en">${escapeCard(word.ExampleSentence)}</span></span>` : '';
}
function practiceCard(word, random = false) {
  const ipa = word.IPA || '';
  const guide = word.PronunciationGuide || '';
  return `<article class="practice-card ${random ? 'random-card' : ''}">
    <button type="button" class="card-turn" aria-expanded="false" aria-label="Ver significado de ${escapeCard(word.Word)}">
      <span class="turn-inner">
        <span class="turn-front"><img loading="lazy" src="${escapeCard(image(word))}" alt=""><span class="word">${escapeCard(word.Word)}</span><span class="turn-hint">Toca para ver el significado</span></span>
        <span class="turn-back" aria-hidden="true"><span class="word">${escapeCard(word.Word)}</span><span class="translation">${escapeCard(translation(word))}</span>${ipa ? `<span class="pronunciation"><span class="pronunciation-label">IPA</span><span lang="en" class="ipa">${escapeCard(ipa)}</span></span>` : ''}${guide ? `<span class="pronunciation"><span class="pronunciation-label">Guía de pronunciación</span><span>${escapeCard(guide)}</span></span>` : ''}${exampleSentence(word)}<span class="turn-hint">Toca para volver</span></span>
      </span>
    </button>
    <div class="practice-footer"><div class="meta">${escapeCard(word.Sublevel)} · Unidad ${escapeCard(word.Unit)}</div><div class="card-actions"><button type="button" class="audio">🔊 Escuchar</button><button type="button" class="btn-card" data-title="${escapeCard(word.Title)}">📌 Agregar a mi lista</button></div></div>
  </article>`;
}
function setCardMode(card, flipped = false) {
  const button = card.querySelector('.card-turn');
  card.classList.toggle('show-all', state.showAll);
  card.classList.toggle('flipped', flipped && !state.showAll);
  button.setAttribute('aria-expanded', String(state.showAll || flipped));
  button.setAttribute('aria-disabled', String(state.showAll));
  button.tabIndex = state.showAll ? -1 : 0;
  const front = card.querySelector('.turn-front');
  const back = card.querySelector('.turn-back');
  front.setAttribute('aria-hidden', String(flipped && !state.showAll));
  back.setAttribute('aria-hidden', String(!state.showAll && !flipped));
  const word = card.querySelector('.word').textContent;
  button.setAttribute('aria-label', `${state.showAll ? 'Información de' : flipped ? 'Volver a la palabra' : 'Ver significado de'} ${word}`);
}
function connectCards(container, words) {
  container.querySelectorAll('.practice-card').forEach((card, index) => {
    const word = words[index];
    setCardMode(card);
    card.querySelector('.card-turn').onclick = () => {
      if (!state.showAll) setCardMode(card, !card.classList.contains('flipped'));
    };
    card.querySelector('.audio').onclick = () => speak(word.Word);
    card.querySelector('.btn-card').onclick = () => addSelected(word);
    card.querySelector('img').onerror = e => { e.target.hidden = true; };
  });
  refreshSelectedButtons();
}
render = function() {
  state.list = current();
  $('count').textContent = `${state.list.length} palabras · ${$('sublevel').value} · unidad ${$('unit').value}`;
  $('grid').innerHTML = state.list.map(word => practiceCard(word)).join('');
  connectCards($('grid'), state.list);
  renderSelected();
  newCard();
};
showCard = function(word) {
  if (!word) return;
  state.card = word;
  const host = $('flashcard');
  host.className = 'random-card-host';
  host.removeAttribute('tabindex');
  host.removeAttribute('role');
  host.removeAttribute('aria-label');
  host.onclick = null;
  host.onkeydown = null;
  host.innerHTML = `<article class="image-guess-card">
    <button type="button" class="card-turn" aria-expanded="false" aria-label="Revelar la palabra en inglés">
      <span class="turn-inner">
        <span class="turn-front"><img src="${escapeCard(word.ImageUrl)}" alt="Imagen para adivinar la palabra en inglés"><span class="turn-hint">¿Cómo se dice en inglés? Dilo antes de voltear.</span></span>
        <span class="turn-back" aria-hidden="true"><span class="word" lang="en">${escapeCard(word.Word)}</span>${exampleSentence(word)}<span class="turn-hint">Usa la palabra en una oración y haz una pregunta a tu compañero. Toca para volver a la imagen.</span></span>
      </span>
    </button>
    <div class="image-answer-actions" hidden><button type="button" class="btn-listen">🔊 Escuchar palabra</button></div>
  </article>`;
  const card = host.querySelector('.image-guess-card');
  const button = card.querySelector('.card-turn');
  button.onclick = () => {
    const flipped = card.classList.toggle('flipped');
    button.setAttribute('aria-expanded', String(flipped));
    button.setAttribute('aria-label', flipped ? 'Volver a la imagen' : 'Revelar la palabra en inglés');
    card.querySelector('.turn-front').setAttribute('aria-hidden', String(flipped));
    card.querySelector('.turn-back').setAttribute('aria-hidden', String(!flipped));
    card.querySelector('.image-answer-actions').hidden = !flipped;
  };
  card.querySelector('.btn-listen').onclick = () => speak(word.Word);
};
let imageRound = 0;
newCard = async function() {
  const round = ++imageRound;
  const previous = state.card;
  const candidates = shuffle(state.list.filter(word => String(word.ImageUrl || '').trim()));
  // Prefer another image, but keep the only available card playable.
  candidates.sort((a, b) => Number(a === previous) - Number(b === previous));
  const host = $('flashcard');
  host.className = 'random-card-host';
  host.removeAttribute('tabindex');
  host.removeAttribute('role');
  host.removeAttribute('aria-label');
  host.onclick = null;
  host.onkeydown = null;
  state.card = null;
  host.innerHTML = '<p role="status">Buscando una imagen…</p>';
  for (const word of candidates) {
    const loaded = await new Promise(resolve => {
      const picture = new Image();
      const timer = setTimeout(() => resolve(false), 4000);
      picture.onload = () => { clearTimeout(timer); resolve(true); };
      picture.onerror = () => { clearTimeout(timer); resolve(false); };
      picture.src = word.ImageUrl;
    });
    if (round !== imageRound) return;
    if (loaded) { showCard(word); return; }
  }
  if (round === imageRound) host.innerHTML = '<p role="status">No hay imágenes disponibles para este juego en la unidad seleccionada. Elige otra unidad para jugar.</p>';
};
const bindOriginal = bind;
bind = function() {
  bindOriginal();
  $('flashcard').onkeydown = null;
  $('showAll').onchange = e => {
    state.showAll = e.target.checked;
    document.querySelectorAll('.practice-card').forEach(card => setCardMode(card));
  };
};
// A cached JSON response can finish before this script has loaded.
if (state.words.length) { bind(); render(); }
