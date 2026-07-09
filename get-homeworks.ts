import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs } from 'firebase/firestore';
import fs from 'fs';

const firebaseConfig = JSON.parse(fs.readFileSync('./firebase-applet-config.json', 'utf-8'));
const app = initializeApp(firebaseConfig);
const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);

async function run() {
  console.log("Querying homeworks...");
  const qSnap = await getDocs(collection(db, 'homeworks'));
  console.log("Total homeworks:", qSnap.size);
  qSnap.forEach(doc => {
    console.log(JSON.stringify({ id: doc.id, ...doc.data() }, null, 2));
  });
}

run().catch(console.error);
