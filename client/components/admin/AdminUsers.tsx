"use client";

import type { User } from "@/types/auth";

type Props = {
  users: User[];
  allUsers: User[];
  query: string;
  setQuery: (v: string) => void;
};

export default function AdminUsers({ users, allUsers, query, setQuery }: Props) {
  return (
    <div className="admin-stack">
      <div className="admin-heading">
        <div><p className="admin-kicker">Tài khoản</p><h2>Quản lý user</h2></div>
        <input className="admin-search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Tìm user..."/>
      </div>
      <div className="admin-panel">
        <div className="admin-panel-heading"><h3>Danh sách user</h3><span>{allUsers.length} mục</span></div>
        <div className="admin-mini-list">
          {users.map((item) => (
            <div key={item.id} className="admin-mini-row">
              <div><strong>{item.name}</strong><span>{item.email}</span></div>
              <em>{item.role}</em>
            </div>
          ))}
          {users.length === 0 && <p className="admin-empty">Không tìm thấy user phù hợp.</p>}
        </div>
      </div>
    </div>
  );
}
