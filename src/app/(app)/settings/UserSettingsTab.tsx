"use client";

import { useState } from "react";
import { PopButton } from "../../PopButton";
import LogoutButton from "../../LogoutButton";

export default function UserSettingsTab({ email }: { email: string }) {
  const [name, setName] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [nameBusy, setNameBusy] = useState(false);
  const [passwordBusy, setPasswordBusy] = useState(false);
  const [nameSuccess, setNameSuccess] = useState(false);
  const [passwordSuccess, setPasswordSuccess] = useState(false);
  const [nameError, setNameError] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  async function updateName() {
    if (!name.trim()) return;
    setNameBusy(true);
    setNameError(null);
    setNameSuccess(false);

    const res = await fetch("/api/settings/name", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: name.trim() }),
    });

    setNameBusy(false);

    if (res.ok) {
      setNameSuccess(true);
      setName("");
      setTimeout(() => setNameSuccess(false), 3000);
    } else {
      const data = await res.json().catch(() => ({ error: "Failed to update name" }));
      setNameError(data.error || "Failed to update name");
    }
  }

  async function updatePassword() {
    setPasswordError(null);
    setPasswordSuccess(false);

    if (!currentPassword || !newPassword) {
      setPasswordError("All fields are required");
      return;
    }

    if (newPassword.length < 8) {
      setPasswordError("New password must be at least 8 characters");
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordError("New passwords don't match");
      return;
    }

    setPasswordBusy(true);

    const res = await fetch("/api/settings/password", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ currentPassword, newPassword }),
    });

    setPasswordBusy(false);

    if (res.ok) {
      setPasswordSuccess(true);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setTimeout(() => setPasswordSuccess(false), 3000);
    } else {
      const data = await res.json().catch(() => ({ error: "Failed to update password" }));
      setPasswordError(data.error || "Failed to update password");
    }
  }

  return (
    <>
      {/* Account Info */}
      <section className="rounded-3xl border-2 border-border bg-card p-5">
        <h2 className="font-display text-lg font-bold">Account</h2>
        <p className="mt-1 text-sm text-muted">{email}</p>
        <div className="mt-4 w-full">
          <LogoutButton variant="button" />
        </div>
      </section>

      {/* Change Name */}
      <section className="rounded-3xl border-2 border-border bg-card p-5">
        <h2 className="font-display text-lg font-bold">Display Name</h2>
        <p className="mt-1 text-sm text-muted">
          This name appears in your chats and conversations with others.
        </p>

        <div className="mt-4 flex gap-2">
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && updateName()}
            placeholder="Enter new name"
            className="h-11 flex-1 rounded-2xl border-2 border-border bg-card px-4 text-sm outline-none focus:border-indigo-ai"
            disabled={nameBusy}
          />
          <PopButton
            onClick={updateName}
            disabled={!name.trim() || nameBusy}
            className="h-11 px-5"
          >
            {nameBusy ? "Saving..." : "Update"}
          </PopButton>
        </div>

        {nameSuccess && (
          <p className="mt-2 text-sm font-bold text-mint">✓ Name updated successfully!</p>
        )}
        {nameError && (
          <p className="mt-2 text-sm font-bold text-sakura">{nameError}</p>
        )}
      </section>

      {/* Change Password */}
      <section className="rounded-3xl border-2 border-border bg-card p-5">
        <h2 className="font-display text-lg font-bold">Change Password</h2>
        <p className="mt-1 text-sm text-muted">
          Update your password. Must be at least 8 characters.
        </p>

        <div className="mt-4 flex flex-col gap-3">
          <input
            type="password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            placeholder="Current password"
            className="h-11 rounded-2xl border-2 border-border bg-card px-4 text-sm outline-none focus:border-indigo-ai"
            disabled={passwordBusy}
          />
          <input
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            placeholder="New password"
            className="h-11 rounded-2xl border-2 border-border bg-card px-4 text-sm outline-none focus:border-indigo-ai"
            disabled={passwordBusy}
          />
          <input
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && updatePassword()}
            placeholder="Confirm new password"
            className="h-11 rounded-2xl border-2 border-border bg-card px-4 text-sm outline-none focus:border-indigo-ai"
            disabled={passwordBusy}
          />

          <PopButton
            onClick={updatePassword}
            disabled={!currentPassword || !newPassword || !confirmPassword || passwordBusy}
            className="h-11"
          >
            {passwordBusy ? "Updating..." : "Update Password"}
          </PopButton>
        </div>

        {passwordSuccess && (
          <p className="mt-2 text-sm font-bold text-mint">✓ Password updated successfully!</p>
        )}
        {passwordError && (
          <p className="mt-2 text-sm font-bold text-sakura">{passwordError}</p>
        )}
      </section>
    </>
  );
}
