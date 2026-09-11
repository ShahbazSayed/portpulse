"use client";

import { useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
);

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<any[]>([]);

  useEffect(() => {
    loadNotifications();
  }, []);

  async function loadNotifications() {
    const { data } = await supabase
      .from("notifications")
      .select("*")
      .order("created_at", { ascending: false });

    setNotifications(data || []);
  }

  async function markAsRead(id: string) {
    await supabase
      .from("notifications")
      .update({ is_read: true })
      .eq("id", id);

    setNotifications((current) =>
      current.map((notification) =>
        notification.id === id
          ? { ...notification, is_read: true }
          : notification
      )
    );
  }

  return (
    <main className="min-h-screen bg-slate-950 p-8 text-white">
      <div className="mx-auto max-w-4xl">
        <a
          href="/dashboard"
          className="text-sm text-cyan-400 hover:underline"
        >
          ← Back to Dashboard
        </a>

        <div className="mt-8">
          <h1 className="text-4xl font-bold">Notifications</h1>
          <p className="mt-2 text-slate-400">
            Important shipment alerts and risk updates.
          </p>
        </div>

        <div className="mt-8 space-y-4">
          {notifications.length === 0 ? (
            <div className="rounded-2xl border border-slate-800 bg-slate-900 p-8 text-center">
              <p className="text-slate-400">
                No notifications yet.
              </p>
            </div>
          ) : (
            notifications.map((notification) => (
              <div
                key={notification.id}
                className={`rounded-2xl border p-6 ${
                  notification.is_read
                    ? "border-slate-800 bg-slate-900"
                    : "border-cyan-900/50 bg-cyan-950/10"
                }`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h2 className="text-lg font-semibold">
                      {notification.title}
                    </h2>

                    <p className="mt-2 text-slate-400">
                      {notification.message}
                    </p>
                  </div>

                  <span className="rounded-full bg-orange-500/10 px-3 py-1 text-xs font-semibold text-orange-400">
                    {notification.type}
                  </span>
                </div>

                <div className="mt-4 flex items-center justify-between">
                  <p className="text-xs text-slate-500">
                    {new Date(notification.created_at).toLocaleString()}
                  </p>

                  {!notification.is_read && (
                    <button
                      onClick={() => markAsRead(notification.id)}
                      className="rounded-lg bg-cyan-600 px-4 py-2 text-sm font-semibold hover:bg-cyan-500"
                    >
                      Mark as Read
                    </button>
                  )}

                  {notification.is_read && (
                    <span className="text-sm text-green-400">
                      ✓ Read
                    </span>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </main>
  );
}