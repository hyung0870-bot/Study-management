/// <reference types="vite/client" />
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

// Safari(특히 iOS 홈 화면 앱)는 GitHub Pages의 index.html 캐시를 오래 붙잡아 옛 버전을 보여준다.
// 앱이 다시 보일 때마다 index.html을 캐시 없이 받아, 번들 파일 이름이 바뀌었으면 새로고침한다.
if (import.meta.env.PROD) {
  const entry = /assets\/index-[\w-]+\.js/;
  const script = document.querySelector<HTMLScriptElement>('script[type="module"][src]');
  const current = script?.src.match(entry)?.[0];
  const checkUpdate = async () => {
    if (!script || !current || document.visibilityState !== 'visible') return;
    try {
      const html = await (await fetch(new URL('../index.html', script.src), { cache: 'no-store' })).text();
      const latest = html.match(entry)?.[0];
      // 같은 새 버전으로 두 번 새로고침하지 않게 막아 무한 새로고침을 방지
      if (latest && latest !== current && sessionStorage.getItem('reloadedFor') !== latest) {
        sessionStorage.setItem('reloadedFor', latest);
        location.reload();
      }
    } catch {
      // 오프라인 등: 지금 버전으로 계속 사용
    }
  };
  checkUpdate();
  document.addEventListener('visibilitychange', checkUpdate);
}
