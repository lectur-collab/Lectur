import React from "react";
import {
  X,
  User as UserIcon,
  LogOut,
  Sparkles,
  Database,
  RotateCcw,
  CheckCircle2,
  Lock,
  ArrowRight,
} from "lucide-react";
import { User } from "firebase/auth";

interface UserAccountModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: User | null;
  onSignIn: () => Promise<void>;
  onSignOut: () => Promise<void>;
  onStartFresh: () => void;
  savedNotesCount: number;
}

export const UserAccountModal: React.FC<UserAccountModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  onSignIn,
  onSignOut,
  onStartFresh,
  savedNotesCount,
}) => {
  const [isSigningIn, setIsSigningIn] = React.useState(false);

  if (!isOpen) return null;

  const handleSignIn = async () => {
    setIsSigningIn(true);
    try {
      await onSignIn();
      onClose();
    } catch (err) {
      console.error("Sign-in failed:", err);
    } finally {
      setIsSigningIn(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await onSignOut();
      onClose();
    } catch (err) {
      console.error("Sign-out failed:", err);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
      <div className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden my-auto animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-5 py-4 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <span className="p-2 rounded-xl bg-amber-400 text-slate-950 shadow-xs">
              <Database className="w-4 h-4" />
            </span>
            <div>
              <h3 className="text-base font-extrabold text-white tracking-tight">
                Personal Workspace & Database
              </h3>
              <p className="text-xs text-slate-400">
                Independent study storage for each student
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            title="Close dialog"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 space-y-4">
          {currentUser ? (
            /* Signed In State */
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex items-center gap-3">
                {currentUser.photoURL ? (
                  <img
                    src={currentUser.photoURL}
                    alt={currentUser.displayName || "User"}
                    className="w-12 h-12 rounded-full border-2 border-amber-400 object-cover"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className="w-12 h-12 rounded-full bg-amber-100 text-amber-900 font-bold flex items-center justify-center text-lg border border-amber-300">
                    {(currentUser.displayName || currentUser.email || "U")[0].toUpperCase()}
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <h4 className="text-sm font-bold text-slate-900 truncate">
                      {currentUser.displayName || "Student User"}
                    </h4>
                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
                      <CheckCircle2 className="w-2.5 h-2.5 text-emerald-600" />
                      Active
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 truncate">{currentUser.email}</p>
                </div>
              </div>

              {/* Personal Database Stats */}
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="p-3 bg-amber-50/70 border border-amber-200/80 rounded-xl">
                  <span className="text-slate-500 block text-[11px]">Personal Cloud Notes</span>
                  <span className="text-base font-extrabold text-amber-900">
                    {savedNotesCount} Saved
                  </span>
                </div>
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
                  <span className="text-slate-500 block text-[11px]">Database Isolation</span>
                  <span className="text-xs font-bold text-slate-700 flex items-center gap-1 mt-0.5">
                    <Lock className="w-3 h-3 text-emerald-600" /> 100% Private
                  </span>
                </div>
              </div>

              {/* Start Fresh Action */}
              <div className="p-3.5 rounded-xl bg-slate-100/80 border border-slate-200 text-xs text-slate-600 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-800 flex items-center gap-1.5">
                    <RotateCcw className="w-3.5 h-3.5 text-slate-600" /> Start Clean Session
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      onStartFresh();
                      onClose();
                    }}
                    className="px-2.5 py-1 bg-white hover:bg-slate-50 text-slate-800 border border-slate-300 rounded-lg font-bold text-xs shadow-2xs transition-colors"
                  >
                    Start Fresh
                  </button>
                </div>
                <p className="text-[11px] text-slate-500">
                  Clears the active note screen so you can analyze another lecture from a clean slate.
                </p>
              </div>

              {/* Sign Out / Switch User */}
              <button
                type="button"
                onClick={handleSignOut}
                className="w-full py-2.5 px-4 rounded-xl border border-red-200 bg-red-50/50 hover:bg-red-50 text-red-700 font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition-colors"
              >
                <LogOut className="w-4 h-4" />
                Sign Out & Switch Account
              </button>
            </div>
          ) : (
            /* Signed Out / Guest State */
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-amber-50/80 border border-amber-200/90 text-amber-950 space-y-2">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-amber-700" />
                  <h4 className="text-xs sm:text-sm font-extrabold text-amber-950">
                    Each user gets their own personal history
                  </h4>
                </div>
                <p className="text-xs text-amber-900/80 leading-relaxed">
                  Sign in with your Google account so your lecture notes, flashcards, and study history are stored in your own private cloud database.
                </p>
              </div>

              {/* Google Sign In Button */}
              <button
                type="button"
                onClick={handleSignIn}
                disabled={isSigningIn}
                className="w-full py-3 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs sm:text-sm shadow-md flex items-center justify-center gap-2.5 transition-all disabled:opacity-50"
              >
                {isSigningIn ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Connecting personal database...</span>
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" viewBox="0 0 24 24">
                      <path
                        fill="#4285F4"
                        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                      />
                      <path
                        fill="#34A853"
                        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                      />
                      <path
                        fill="#FBBC05"
                        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                      />
                      <path
                        fill="#EA4335"
                        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                      />
                    </svg>
                    <span>Sign In with Google</span>
                  </>
                )}
              </button>

              <div className="pt-2 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => {
                    onStartFresh();
                    onClose();
                  }}
                  className="w-full py-2 px-3 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold text-xs flex items-center justify-center gap-1.5 transition-colors"
                >
                  <RotateCcw className="w-3.5 h-3.5 text-slate-500" />
                  <span>Continue Fresh Session (Guest)</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
