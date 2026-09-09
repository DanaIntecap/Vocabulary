// Shared behavior for vocabulary cards and the random practice card.
state.showAll = false;
const escapeCard = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function practiceCard(word, random = false) {
  const ipa = word.IPA || '';
  const guide = word.PronunciationGuide || '';
  return `<article class="practice-card ${random ? 'random-card' : ''}">
    <button type="button" class="card-turn" aria-expanded="false" aria-label="Ver significado de ${escapeCard(word.Word)}">
      <span class="turn-inner">
        <span class="turn-front"><img loading="lazy" src="${escapeCard(image(word))}" alt=""><span class="word">${escapeCard(word.Word)}</span><span class="turn-hint">Toca para ver el significado</span></span>
        <span class="turn-back" aria-hidden="true"><span class="word">${escapeCard(word.Word)}</span><span class="translation">${escapeCard(translation(word))}</span>${ipa ? `<span class="pronunciation"><span class="pronunciation-label">IPA</span><span lang="en" class="ipa">${escapeCard(ipa)}</span></span>` : ''}${guide ? `<span class="pronunciation"><span class="pronunciation-label">Guía de pronunciación</span><span>${escapeCard(guide)}</span></span>` : ''}<span class="turn-hint">Toca para volver</span></span>
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
  host.innerHTML = practiceCard(word, true);
  connectCards(host, [word]);
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
