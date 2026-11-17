import '@fontsource/noto-serif-kr/500.css';
import '@fontsource/noto-serif-kr/700.css';
import 'pretendard/dist/web/variable/pretendardvariable-dynamic-subset.css';
import './style.css';

import { startApp } from './app';
import { loadProfile, saveProfile } from './core/storage';
import { cleanNickname, randomNickname } from './net/nickname';
import { checkManagerCode, managerCode, loadManagerSession, saveManagerSession } from './core/manager';
import { readParams } from './core/params';
import { registerServiceWorker } from './pwa/register';
import { LoadingScreen } from './ui/loading';
import { fetchBucheonWeather, weatherAria } from './weather/bucheon';

// 닉네임은 입장할 때 직접 정한다. 비우면 추천 닉네임으로 들어간다. 이 브라우저에만 저장한다.


declare global {
  interface Window {
    __YONGSEOJEOM_READY?: boolean;
  }
}

registerServiceWorker();

const params = readParams();
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
const canvas = document.getElementById('scene') as HTMLCanvasElement;
const startEl = document.getElementById('start')!;
const gateEl = document.getElementById('manager-gate')!;
const codeInput = document.getElementById('manager-code') as HTMLInputElement;
const gateError = document.getElementById('manager-gate-error')!;
document.getElementById('start-manager')!.hidden = !managerCode();

// ---------- 닉네임 입력 ----------
const nickInput = document.getElementById('start-nick') as HTMLInputElement;
const savedProfile = loadProfile();
nickInput.value = savedProfile.nickChosen ? cleanNickname(savedProfile.nickname) : '';
const suggestNick = (): void => {
  let n = randomNickname();
  for (let i = 0; i < 5 && n === nickInput.placeholder; i++) n = randomNickname();
  nickInput.placeholder = n;
};
suggestNick();
document.getElementById('start-nick-suggest')!.addEventListener('click', () => {
  suggestNick();
  nickInput.value = nickInput.placeholder;
  nickInput.focus();
});
/** 입력한 닉네임을 프로필에 저장(비우면 추천 닉네임) */
function commitNickname(): void {
  const nick = cleanNickname(nickInput.value) || nickInput.placeholder;
  nickInput.value = nick;
  savedProfile.nickname = nick;
  savedProfile.nickChosen = true;
  saveProfile(savedProfile);
}

// 캔버스 설명만 부천 날씨에 맞춘다(시작 문구는 고정)
void fetchBucheonWeather(params.weather).then((w) => {
  canvas.setAttribute('aria-label', weatherAria(w.kind));
});

let entered = false;
let asManager = loadManagerSession();

async function enter(): Promise<void> {
  if (entered) return;
  entered = true;
  gateEl.hidden = true;
  const openMs = reducedMotion ? 0 : 950;
  if (openMs) {
    startEl.classList.add('is-opening');
    await new Promise((r) => setTimeout(r, openMs));
  }
  startEl.hidden = true;
  const loading = new LoadingScreen();
  loading.show();
  await startApp(params, canvas, loading, reducedMotion, { manager: asManager });
}

function openManagerGate(): void {
  if (entered) return;
  gateError.hidden = true;
  codeInput.value = '';
  gateEl.hidden = false;
  requestAnimationFrame(() => codeInput.focus());
}

function closeManagerGate(): void {
  gateEl.hidden = true;
  gateError.hidden = true;
  codeInput.value = '';
}

function submitManagerCode(): void {
  if (!checkManagerCode(codeInput.value)) {
    gateError.hidden = false;
    codeInput.select();
    return;
  }
  asManager = true;
  saveManagerSession(true);
  closeManagerGate();
  void enter();
}

document.getElementById('start-enter')!.addEventListener('click', () => {
  asManager = false;
  saveManagerSession(false);
  commitNickname();
  void enter();
});
nickInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && !e.isComposing) {
    e.preventDefault();
    document.getElementById('start-enter')!.click();
  }
});
document.getElementById('start-manager')!.addEventListener('click', (e) => {
  e.preventDefault();
  e.stopPropagation();
  openManagerGate();
});
document.getElementById('manager-cancel')!.addEventListener('click', () => closeManagerGate());
document.getElementById('manager-enter')!.addEventListener('click', () => submitManagerCode());
codeInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') {
    e.preventDefault();
    submitManagerCode();
  } else if (e.key === 'Escape') {
    closeManagerGate();
  }
});

if (params.autostart) void enter();
