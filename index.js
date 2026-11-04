// O NOVO LINK ATUALIZADO DO JOGO/ARENA
const GAME_URL = "https://01a1a6f4-e5a5-7e0e-a0e1-fd9fb80d331c.arena.site/";

// Função para mudar a paleta de cores
function changeTheme(themeName) {
  document.documentElement.setAttribute('data-theme', themeName);
}

// Função para gerar número de telefone aleatório no formato (11) 9XXXX-XXXX
function generateRandomPhone() {
  const ddd = Math.floor(Math.random() * 89) + 11;
  const part1 = Math.floor(Math.random() * 90000) + 10000;
  const part2 = Math.floor(Math.random() * 9000) + 1000;
  return `(${ddd}) 9${part1.toString().substring(1)}-${part2}`;
}

// Insere os números gerados nos sobreviventes
function assignSurvivorPhones() {
  const henryPhone = document.getElementById('phone-henry');
  const allisonPhone = document.getElementById('phone-allison');
  const tomPhone = document.getElementById('phone-tom');
  const audreyPhone = document.getElementById('phone-audrey');

  if (henryPhone) henryPhone.textContent = generateRandomPhone();
  if (allisonPhone) allisonPhone.textContent = generateRandomPhone();
  if (tomPhone) tomPhone.textContent = generateRandomPhone();
  if (audreyPhone) audreyPhone.textContent = generateRandomPhone();
}

// Ativa tela cheia e redireciona para o link informado
function openGameLink() {
  const elem = document.documentElement;

  // Tenta solicitar o modo tela cheia do navegador
  if (elem.requestFullscreen) {
    elem.requestFullscreen().catch(() => {});
  } else if (elem.webkitRequestFullscreen) {
    elem.webkitRequestFullscreen();
  } else if (elem.msRequestFullscreen) {
    elem.msRequestFullscreen();
  }

  // Redireciona para o link
  setTimeout(() => {
    window.location.href = GAME_URL;
  }, 300);
}

// Executa a atribuição dos números quando a página carregar
window.addEventListener('DOMContentLoaded', () => {
  assignSurvivorPhones();
});