import { initializeApp } from "firebase/app";
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  User,
} from "firebase/auth";
import {
  getFirestore,
  doc,
  collection,
  setDoc,
  deleteDoc,
  getDocs,
  getDocFromServer,
} from "firebase/firestore";
import firebaseConfig from "../../firebase-applet-config.json";
import { StudyNoteData } from "../types";

// Initialize Firebase App
const app = initializeApp(firebaseConfig);

/**
 * Feature Flag: Authentication and Cloud Database are currently disabled per user preference.
 * All Firebase Auth and Firestore configurations and helper functions are preserved below
 * so that in the future this applet can seamlessly reconnect to your Firebase account!
 */
export const IS_FIREBASE_AUTH_ENABLED = false;

// Initialize Firestore with specific database ID (CRITICAL: Required for this applet)
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);

// Initialize Firebase Auth
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

// Standard Operation Types for error diagnosis
export enum OperationType {
  CREATE = "create",
  UPDATE = "update",
  DELETE = "delete",
  LIST = "list",
  GET = "get",
  WRITE = "write",
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

/**
 * Standard Firestore error handler per security specifications
 */
export function handleFirestoreError(
  error: unknown,
  operationType: OperationType,
  path: string | null
): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo:
        auth.currentUser?.providerData?.map((provider) => ({
          providerId: provider.providerId,
          email: provider.email,
        })) || [],
    },
    operationType,
    path,
  };
  console.error("Firestore Error: ", JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

/**
 * Validates connection to Firestore upon boot
 */
export async function testConnection(): Promise<boolean> {
  try {
    await getDocFromServer(doc(db, "test", "connection"));
    return true;
  } catch (error) {
    if (
      error instanceof Error &&
      error.message.includes("the client is offline")
    ) {
      console.warn("Please check your Firebase configuration: client is offline.");
      return false;
    }
    // Expected to fail with missing permissions or not found, but indicates network is online
    return true;
  }
}

// Fire test connection
testConnection();

/**
 * Sign in with Google Popup
 */
export async function signInWithGoogle(): Promise<User> {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    if (result.user) {
      await upsertUserProfile(result.user);
    }
    return result.user;
  } catch (error) {
    console.error("Google sign-in error:", error);
    throw error;
  }
}

/**
 * Sign out of current user session
 */
export async function logOutUser(): Promise<void> {
  try {
    await firebaseSignOut(auth);
  } catch (error) {
    console.error("Sign out error:", error);
    throw error;
  }
}

/**
 * Save / Update user profile in Firestore
 */
export async function upsertUserProfile(user: User): Promise<void> {
  if (!user.uid) return;
  const path = `users/${user.uid}`;
  try {
    const userDocRef = doc(db, "users", user.uid);
    const profileData = {
      id: user.uid,
      email: user.email || "",
      displayName: user.displayName || user.email?.split("@")[0] || "Student",
      photoUrl: user.photoURL || "",
      createdAt: new Date().toISOString(),
    };
    await setDoc(userDocRef, profileData, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

/**
 * Fetch personal study notes for the authenticated user from their private Firestore collection
 */
export async function fetchUserStudyNotes(userId: string): Promise<StudyNoteData[]> {
  const path = `users/${userId}/notes`;
  try {
    const notesColl = collection(db, "users", userId, "notes");
    const snapshot = await getDocs(notesColl);
    const notes: StudyNoteData[] = [];

    snapshot.forEach((docSnap) => {
      const data = docSnap.data();
      if (data.notePayload) {
        try {
          const parsed = JSON.parse(data.notePayload);
          notes.push(parsed);
        } catch {
          // If not json string, try reconstructing from fields
          notes.push({
            id: data.id,
            title: data.title,
            sourceType: data.sourceType || "youtube",
            sourceName: data.sourceName || "Video",
            sourceUrlOrInfo: data.sourceUrlOrInfo,
            style: data.style || "cornell",
            academicLevel: data.academicLevel || "undergraduate",
            executiveSummary: data.executiveSummary || "",
            keyTakeaways: [],
            sections: [],
            examTips: [],
            createdAt: typeof data.createdAt === "number" ? data.createdAt : Date.now(),
          });
        }
      }
    });

    // Sort newest first
    return notes.sort((a, b) => b.createdAt - a.createdAt);
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
  }
}

/**
 * Save a study note to the user's personal Firestore database
 */
export async function saveStudyNoteToFirestore(
  userId: string,
  note: StudyNoteData
): Promise<void> {
  const path = `users/${userId}/notes/${note.id}`;
  try {
    const noteDocRef = doc(db, "users", userId, "notes", note.id);
    const firestoreData = {
      id: note.id,
      userId: userId,
      title: note.title.slice(0, 300),
      sourceType: note.sourceType,
      sourceName: (note.sourceName || "YouTube").slice(0, 300),
      sourceUrlOrInfo: (note.sourceUrlOrInfo || "").slice(0, 1000),
      style: (note.style || "cornell").slice(0, 50),
      academicLevel: (note.academicLevel || "undergraduate").slice(0, 50),
      executiveSummary: (note.executiveSummary || "").slice(0, 5000),
      notePayload: JSON.stringify(note).slice(0, 500000),
      createdAt: new Date(note.createdAt || Date.now()).toISOString(),
      updatedAt: new Date().toISOString(),
    };
    await setDoc(noteDocRef, firestoreData);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

/**
 * Delete a study note from the user's personal Firestore database
 */
export async function deleteStudyNoteFromFirestore(
  userId: string,
  noteId: string
): Promise<void> {
  const path = `users/${userId}/notes/${noteId}`;
  try {
    const noteDocRef = doc(db, "users", userId, "notes", noteId);
    await deleteDoc(noteDocRef);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}
