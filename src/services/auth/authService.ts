import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithCredential,
  GoogleAuthProvider,
  sendPasswordResetEmail,
  signOut,
  deleteUser,
} from 'firebase/auth';
import { auth } from '@/services/firebase';
import { deleteAllUserData } from '@/services/auth/profileService';

export async function registerWithEmail(email: string, password: string) {
  return createUserWithEmailAndPassword(auth, email, password);
}

export async function signInWithEmail(email: string, password: string) {
  return signInWithEmailAndPassword(auth, email, password);
}

export async function signInWithGoogle(idToken: string) {
  const credential = GoogleAuthProvider.credential(idToken);
  return signInWithCredential(auth, credential);
}

export async function signOutUser(): Promise<void> {
  await signOut(auth);
}

export async function sendPasswordReset(email: string): Promise<void> {
  await sendPasswordResetEmail(auth, email);
}

// Firestore data must be deleted BEFORE the Auth account.
// If Firestore delete fails, this throws and the Auth account is preserved.
export async function deleteAccount(): Promise<void> {
  const user = auth.currentUser;
  if (!user) throw new Error('No authenticated user');

  await deleteAllUserData(user.uid);
  await deleteUser(user);
}
