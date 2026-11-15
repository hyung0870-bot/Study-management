import { initializeApp } from 'firebase/app';
import { browserLocalPersistence, getAuth, setPersistence } from 'firebase/auth';
import { initializeFirestore, memoryLocalCache } from 'firebase/firestore';

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

// IndexedDB 영구 캐시는 Safari(iOS)에서 서버 데이터를 못 받고 멈추는 일이 있어 메모리 캐시를 쓴다.
// 화면용 오프라인 사본은 StoreContext가 localStorage에 따로 보관한다.
export const db = initializeFirestore(app, {
  localCache: memoryLocalCache(),
});
