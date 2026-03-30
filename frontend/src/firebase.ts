// Need to replace this with real config to use Firebase directly from client
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';

const firebaseConfig = {
  apiKey: "dummy_apiKey",
  authDomain: "dummy_authDomain",
  projectId: "dummy_projectId",
  storageBucket: "dummy_storageBucket",
  messagingSenderId: "dummy_messagingSenderId",
  appId: "dummy_appId"
};

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
