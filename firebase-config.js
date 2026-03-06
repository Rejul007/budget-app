import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js';
import { getAuth }        from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js';
import { getFirestore }   from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js';

const firebaseConfig = {
  apiKey:            'AIzaSyD1THJIUvyTIN3pELJMC0sjzMsvXOCvGBo',
  authDomain:        'college-budget-manager.firebaseapp.com',
  projectId:         'college-budget-manager',
  storageBucket:     'college-budget-manager.firebasestorage.app',
  messagingSenderId: '213199283322',
  appId:             '1:213199283322:web:8e39e8f7223c4abc0d07c3'
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db   = getFirestore(app);
