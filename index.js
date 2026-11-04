const GAME_URL = "https://01a1a6f4-e5a5-7e0e-a0e1-fd9fb80d331c.arena.site/";

function changeTheme(themeName) {
  document.documentElement.setAttribute('data-theme', themeName);
}

function generateRandomPhone() {
  const ddd = Math.floor(Math.random() * 89) + 11;
  const part1 = Math.floor(Math.random() * 90000) + 10000;
  const part2 = Math.floor(Math.random() * 9000) + 1000;
  return `(${ddd}) 9${part1.toString().substring(1)}-${part2}`;
}

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

function openGameLink() {
  const elem = document.documentElement;

  if (elem.requestFullscreen) {
    elem.requestFullscreen().catch(() => {});
  } else if (elem.webkitRequestFullscreen) {
    elem.webkitRequestFullscreen();
  } else if (elem.msRequestFullscreen) {
    elem.msRequestFullscreen();
  }

  setTimeout(() => {
    window.location.href = GAME_URL;
  }, 300);
}

window.addEventListener('DOMContentLoaded', () => {
  assignSurvivorPhones();
});