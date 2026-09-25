// Each game takes a snapshot so selections can be edited for the next game.
const guessing = { cards: [], index: 0, score: 0, answered: false };
const normalizeGuess = value => String(value).normalize('NFKC').toLocaleLowerCase('en').trim().replace(/[’‘]/g, "'").replace(/\s+/g, ' ');
function startGuessing() {
  guessing.cards = state.selected.filter(word => word.Word && word.Translation).map(word => ({ ...word }));
  for (let i = guessing.cards.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [guessing.cards[i], guessing.cards[j]] = [guessing.cards[j], guessing.cards[i]];
  }
  guessing.index = 0;
  guessing.score = 0;
  speechSynthesis.cancel();
  showGuess();
  $('guessSection').scrollIntoView({ behavior: 'smooth', block: 'start' });
}
function showGuess() {
  guessing.answered = false;
  $('guessFeedback').textContent = '';
  $('guessListen').hidden = true;
  $('nextGuess').hidden = true;
  const word = guessing.cards[guessing.index];
  $('guessForm').hidden = !word;
  if (!word) {
    $('guessProgress').textContent = guessing.cards.length ? `Partida terminada · ${guessing.score} de ${guessing.cards.length} aciertos` : 'Agrega al menos una palabra con traducción a tu lista y comienza una partida.';
    $('guessClue').textContent = guessing.cards.length ? '¡Completaste todas tus flashcards!' : 'Tu lista no tiene palabras disponibles para jugar.';
    return;
  }
  $('guessProgress').textContent = `Flashcard ${guessing.index + 1} de ${guessing.cards.length} · Aciertos: ${guessing.score}`;
  $('guessClue').textContent = word.Translation;
  $('guessInput').value = '';
  $('guessInput').disabled = false;
  $('checkGuess').disabled = false;
  $('revealGuess').disabled = false;
  $('guessInput').focus({ preventScroll: true });
}
function checkGuess(reveal = false) {
  const word = guessing.cards[guessing.index];
  if (!word || guessing.answered) return;
  if (!reveal && !$('guessInput').value.trim()) { $('guessInput').focus(); return; }
  guessing.answered = true;
  const correct = !reveal && normalizeGuess($('guessInput').value) === normalizeGuess(word.Word);
  if (correct) guessing.score++;
  $('guessFeedback').textContent = `${correct ? '✅ ¡Correcto!' : reveal ? 'Respuesta:' : 'La respuesta correcta es:'} ${word.Word}`;
  $('guessFeedback').className = `game-feedback ${correct ? 'success' : ''}`;
  $('guessInput').disabled = true;
  $('checkGuess').disabled = true;
  $('revealGuess').disabled = true;
  $('guessListen').hidden = false;
  $('nextGuess').hidden = false;
  $('nextGuess').textContent = guessing.index + 1 === guessing.cards.length ? 'Ver resultado' : 'Siguiente flashcard';
  $('nextGuess').focus({ preventScroll: true });
}
$('startSelectedFlashcards').onclick = startGuessing;
$('restartGuess').onclick = startGuessing;
$('guessForm').onsubmit = event => { event.preventDefault(); checkGuess(); };
$('revealGuess').onclick = () => checkGuess(true);
$('nextGuess').onclick = () => { if (!guessing.answered) return; speechSynthesis.cancel(); guessing.index++; showGuess(); };
$('guessListen').onclick = () => { const word = guessing.cards[guessing.index]; if (word && guessing.answered) speak(word.Word); };
