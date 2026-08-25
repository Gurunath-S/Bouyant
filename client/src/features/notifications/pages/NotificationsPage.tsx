import React, { useEffect, useState } from 'react';
import { apiClient } from '../../../services/api/apiClient';
import { Notification } from '../../../types';
import { Bell, CheckCircle2, Info, AlertTriangle, ShieldCheck } from 'lucide-react';
import { Button } from '../../../components/ui/Button';

export const NotificationsPage: React.FC = () => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchNotifications();
  }, []);

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      const res: any = await apiClient.get('/notifications');
      setNotifications(res.data);
    } catch (err) {
      console.error('Failed to load notifications:', err);
    } finally {
      setLoading(false);
    }
  };

  const markAllRead = async () => {
    try {
      await apiClient.patch('/notifications/mark-all-read');
      setNotifications(notifications.map((n) => ({ ...n, isRead: true })));
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center justify-between border-b border-slate-200 pb-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Bell className="w-6 h-6 text-blue-600" />
            System Notifications & Alerts
          </h1>
          <p className="text-xs text-slate-500 mt-1">Real-time alerts for stall holds, payment confirmations, and invoices.</p>
        </div>

        <Button variant="outline" size="sm" onClick={markAllRead}>
          Mark All as Read
        </Button>
      </div>

      {loading ? (
        <div className="p-12 text-center text-slate-500 font-medium animate-pulse">Loading Alerts...</div>
      ) : notifications.length === 0 ? (
        <div className="p-12 text-center bg-white border border-slate-200 rounded-xl space-y-2">
          <Bell className="w-12 h-12 text-slate-300 mx-auto" />
          <h3 className="text-base font-bold text-slate-800">No Notifications</h3>
          <p className="text-xs text-slate-500">You are all caught up on system updates.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {notifications.map((n) => (
            <div
              key={n.id}
              className={`p-4 rounded-xl border flex items-start gap-4 transition-all ${
                n.isRead ? 'bg-white border-slate-200' : 'bg-blue-50/50 border-blue-200 shadow-2xs'
              }`}
            >
              <div className="p-2 rounded-lg bg-blue-100 text-blue-700 mt-0.5">
                <CheckCircle2 className="w-4 h-4" />
              </div>
              <div className="flex-1 space-y-1">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-slate-900">{n.title}</h4>
                  <span className="text-[10px] text-slate-400">
                    {new Date(n.createdAt).toLocaleDateString()}
                  </span>
                </div>
                <p className="text-xs text-slate-600">{n.message}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
