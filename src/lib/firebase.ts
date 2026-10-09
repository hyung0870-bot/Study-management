import { initializeApp } from 'firebase/app';
import { browserLocalPersistence, getAuth, setPersistence } from 'firebase/auth';
import { initializeFirestore, persistentLocalCache, persistentMultipleTabManager } from 'firebase/firestore';

// Firebase 웹 설정값 (공개되어도 괜찮은 값 - 실제 보안은 Firestore 보안 규칙이 담당)
const firebaseConfig = {
  apiKey: 'AIzaSyAV1fhBblhapkIlrwICAajFmKxPT7-0BTM',
  authDomain: 'study-management-a1c37.firebaseapp.com',
  projectId: 'study-management-a1c37',
  storageBucket: 'study-management-a1c37.firebasestorage.app',
  messagingSenderId: '750658966713',
  appId: '1:750658966713:web:4edbe5b44159733af07768',
  measurementId: 'G-TDES1D0MQC',
};

export const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
// 한 번 로그인하면 브라우저를 닫아도 계속 로그인 유지
setPersistence(auth, browserLocalPersistence);

// 오프라인에서도 동작하고, 다시 연결되면 자동 동기화
export const db = initializeFirestore(app, {
  localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }),
});
