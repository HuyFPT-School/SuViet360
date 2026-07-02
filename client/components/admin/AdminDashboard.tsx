"use client";

import Link from "next/link";
import type { Lesson, LessonFormValues } from "@/lib/adminApi";
import type { User } from "@/types/auth";

type Props = {
  stats: Array<{ label: string; value: number }>;
  lessons: Lesson[];
  users: User[];
  onOpenLessons: () => void;
  onOpenUsers: () => void;
};

function formatDate(value?: string) {
  if (!value) return "Chưa có";
  return new Intl.DateTimeFormat("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" }).format(new Date(value));
}

export default function AdminDashboard({ stats, lessons, users, onOpenLessons, onOpenUsers }: Props) {
  return (
    <div className="admin-stack">
      <div className="admin-heading">
        <div>
          <p className="admin-kicker">Tổng quan</p>
          <h2>Dashboard</h2>
        </div>
        <div className="admin-actions">
          <button type="button" onClick={onOpenLessons}>Tạo lesson</button>
          <button type="button" onClick={onOpenUsers}>Xem user</button>
        </div>
      </div>
      <div className="admin-stat-grid">
        {stats.map((stat) => (
          <div key={stat.label} className="admin-stat-card">
            <span>{stat.label}</span><strong>{stat.value}</strong>
          </div>
        ))}
      </div>
      <div className="admin-grid-2">
        <div className="admin-panel">
          <div className="admin-panel-heading"><h3>Lesson mới nhất</h3><span>{lessons.length} mục</span></div>
          <div className="admin-mini-list">
            {lessons.slice(0, 5).map((lesson) => (
              <div key={lesson._id} className="admin-mini-row">
                <div><strong>{lesson.title}</strong><span>{formatDate(lesson.createdAt)}</span></div>
                <Link href={`/game?id=${lesson._id}`}>Chơi thử</Link>
              </div>
            ))}
            {lessons.length === 0 && <p className="admin-empty">Chưa có lesson nào.</p>}
          </div>
        </div>
        <div className="admin-panel">
          <div className="admin-panel-heading"><h3>User trong client</h3><span>{users.length} mục</span></div>
          <div className="admin-mini-list">
            {users.map((item) => (
              <div key={item.id} className="admin-mini-row">
                <div><strong>{item.name}</strong><span>{item.email}</span></div>
                <em>{item.role}</em>
              </div>
            ))}
            <p className="admin-note">Server hiện chưa có endpoint danh sách user, nên client chỉ hiển thị dữ liệu tài khoản đang đăng nhập.</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export { type Lesson, type LessonFormValues };
