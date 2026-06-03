"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useRouter } from "next/navigation";
import { profileApi, type ProfileUpdatePayload } from "@/lib/profileApi";

/* ─── Data ─────────────────────────────────── */

const achievements = [
  { title: "Nhà Khám Phá",      desc: "Đã khám phá 10 di sản",   color: "#D4AF37" },
  { title: "Nhà Sưu Tầm",       desc: "Sưu tầm 50 hiện vật",      color: "#C0A060" },
  { title: "Học Giả Sử Việt",   desc: "Đọc 100 bài viết",          color: "#B8963E" },
  { title: "Lữ Hành Thời Gian", desc: "Hoàn thành 5 hành trình",  color: "#A07830" },
  { title: "Bậc Thầy Bản Đồ",   desc: "Mở khóa 20 địa danh",      color: "#C8A850" },
  { title: "Dấu Ấn Lịch Sử",    desc: "Đăng nhập 30 ngày",         color: "#D4AF37" },
];

const journeys = [
  { label: "Thăng Long - Hà Nội",     progress: 75, color: "#D4AF37" },
  { label: "Nhà Trần và kháng chiến",  progress: 40, color: "#C09030" },
  { label: "Tây Sơn bừng nghiệp",      progress: 20, color: "#A07020" },
];

const heritage = [
  { name: "Hoàng thành Thăng Long",  unlocked: true  },
  { name: "Văn Miếu Quốc Tử Giám",  unlocked: true  },
  { name: "Tháp Chàm Mỹ Sơn",        unlocked: false },
  { name: "Thành nhà Hồ",             unlocked: false },
];

const weekDays = ["T2", "T3", "T4", "T5", "T6", "T7", "CN"];

const sidebarItems = [
  "Thông tin cá nhân",
  "Thành tựu",
  "Hành trình của tôi",
  "Di sản đã mở khóa",
  "Nhật ký hành trình",
  "Cài đặt tài khoản",
];

const GENDER_MAP: Record<string, string> = {
  male: "Nam",
  female: "Nữ",
  other: "Khác",
};

/* ─── Helpers ────────────────────────────────── */

function formatDate(dateStr?: string) {
  if (!dateStr) return "";
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString("vi-VN");
  } catch {
    return dateStr;
  }
}

function toInputDate(dateStr?: string) {
  if (!dateStr) return "";
  try {
    const d = new Date(dateStr);
    return d.toISOString().split("T")[0];
  } catch {
    return "";
  }
}

/* ─── Sub-components ────────────────────────── */

function CardHeader({ title }: { title: string }) {
  return (
    <div className="card-header">
      <div className="card-header__row">
        <span className="card-header__title">{title}</span>
        <span className="card-header__link">Xem tất cả</span>
      </div>
      <div className="card-header__divider" />
    </div>
  );
}

/* ─── Main component ────────────────────────── */

export default function ProfilePage() {
  const [activeTab, setActiveTab] = useState(0);
  const { user, isLoading, refreshUser } = useAuth();
  const router = useRouter();

  /* ── Edit state ── */
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState("");
  const [editForm, setEditForm] = useState<ProfileUpdatePayload>({});

  /* ── Avatar state ── */
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    refreshUser().catch(() => {});
  }, [refreshUser]);

  useEffect(() => {
    if (!isLoading && !user) {
      router.push("/login");
    }
  }, [user, isLoading, router]);

  /* ── Populate form when user loads ── */
  useEffect(() => {
    if (user) {
      Promise.resolve().then(() => {
        setEditForm({
          name: user.name || "",
          phone: user.phone || "",
          birthDate: toInputDate(user.birthDate),
          gender: user.gender,
          address: user.address || "",
          bio: user.bio || "",
        });
      });
    }
  }, [user]);

  /* ── Handlers ── */
  const handleEditToggle = useCallback(() => {
    if (isEditing) {
      // Cancel → reset form
      if (user) {
        setEditForm({
          name: user.name || "",
          phone: user.phone || "",
          birthDate: toInputDate(user.birthDate),
          gender: user.gender,
          address: user.address || "",
          bio: user.bio || "",
        });
      }
    }
    setSaveMessage("");
    setIsEditing((prev) => !prev);
  }, [isEditing, user]);

  const handleSaveProfile = useCallback(async () => {
    setIsSaving(true);
    setSaveMessage("");
    try {
      await profileApi.updateProfile(editForm);
      await refreshUser();
      setIsEditing(false);
      setSaveMessage("Cập nhật thành công!");
      setTimeout(() => setSaveMessage(""), 3000);
    } catch (err: unknown) {
      const msg =
        err && typeof err === "object" && "response" in err
          ? (err as { response?: { data?: { message?: string } } }).response
              ?.data?.message || "Có lỗi xảy ra"
          : "Có lỗi xảy ra";
      setSaveMessage(msg);
    } finally {
      setIsSaving(false);
    }
  }, [editForm, refreshUser]);

  const handleAvatarClick = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleAvatarChange = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      // Validate client-side
      if (!file.type.startsWith("image/")) {
        setSaveMessage("Vui lòng chọn file ảnh");
        return;
      }
      if (file.size > 2 * 1024 * 1024) {
        setSaveMessage("Ảnh tối đa 2MB");
        return;
      }

      // Preview
      const reader = new FileReader();
      reader.onloadend = () => setAvatarPreview(reader.result as string);
      reader.readAsDataURL(file);

      // Upload
      setIsUploadingAvatar(true);
      setSaveMessage("");
      try {
        await profileApi.uploadAvatar(file);
        await refreshUser();
        setSaveMessage("Cập nhật ảnh đại diện thành công!");
        setTimeout(() => setSaveMessage(""), 3000);
      } catch {
        setSaveMessage("Upload ảnh thất bại");
        setAvatarPreview(null);
      } finally {
        setIsUploadingAvatar(false);
        // Reset input so same file can be selected again
        if (fileInputRef.current) fileInputRef.current.value = "";
      }
    },
    [refreshUser]
  );

  const handleDeleteAvatar = useCallback(async () => {
    setIsUploadingAvatar(true);
    try {
      await profileApi.deleteAvatar();
      await refreshUser();
      setAvatarPreview(null);
      setSaveMessage("Đã xóa ảnh đại diện");
      setTimeout(() => setSaveMessage(""), 3000);
    } catch {
      setSaveMessage("Xóa ảnh thất bại");
    } finally {
      setIsUploadingAvatar(false);
    }
  }, [refreshUser]);

  const handleFormChange = useCallback(
    (field: keyof ProfileUpdatePayload, value: string) => {
      setEditForm((prev) => ({ ...prev, [field]: value }));
    },
    []
  );

  /* ── Loading state ── */
  if (isLoading) {
    return (
      <div className="profile-page flex items-center justify-center min-h-screen">
        <p className="text-[#f0ddb7] text-lg font-semibold animate-pulse uppercase tracking-widest">
          Đang tải hồ sơ...
        </p>
      </div>
    );
  }

  const name = user?.name || "Nguyễn Văn An";
  const email = user?.email || "nguyenvanan@gmail.com";
  const avatarUrl = avatarPreview || user?.avatar || "";

  const personalInfo = [
    { label: "Họ và tên",      value: name,                                          field: "name" as const },
    { label: "Email",          value: email,                                          field: null },
    { label: "Số điện thoại",  value: user?.phone || "Chưa cập nhật",               field: "phone" as const },
    { label: "Ngày sinh",      value: formatDate(user?.birthDate) || "Chưa cập nhật", field: "birthDate" as const },
    { label: "Giới tính",      value: user?.gender ? GENDER_MAP[user.gender] : "Chưa cập nhật", field: "gender" as const },
    { label: "Địa chỉ",        value: user?.address || "Chưa cập nhật",              field: "address" as const },
  ];

  return (
    <div className="profile-page">
      {/* ── Content ── */}
      <div className="profile-content">

        {/* Breadcrumb */}
        <div className="breadcrumb">
          Trang chủ
          <span className="breadcrumb__sep">›</span>
          <span className="breadcrumb__current">Hồ sơ cá nhân</span>
        </div>

        {/* ── Top section: Sidebar + Profile card ── */}
        <div className="profile-top">

          {/* Sidebar */}
          <div className="card sidebar">
            <div className="sidebar__title">Hồ Sơ Cá Nhân</div>
            <div className="sidebar__divider" />
            {sidebarItems.map((label, i) => (
              <div
                key={i}
                className={`sidebar__item${activeTab === i ? " sidebar__item--active" : ""}`}
                onClick={() => setActiveTab(i)}
              >
                <span className="sidebar__item-label">{label}</span>
              </div>
            ))}
          </div>

          {/* Profile card */}
          <div className="card profile-card">
            <div className="profile-card__inner">

              {/* Avatar column */}
              <div className="profile-card__avatar-col">
                <div className="avatar-wrap" onClick={handleAvatarClick} style={{ cursor: "pointer" }}>
                  {avatarUrl ? (
                    <img
                      src={avatarUrl}
                      alt="Avatar"
                      className="avatar-circle"
                      style={{
                        objectFit: "cover",
                        width: 110,
                        height: 110,
                      }}
                    />
                  ) : (
                    <div className="avatar-circle" />
                  )}
                  <div className="avatar-edit">
                    {isUploadingAvatar ? "⏳" : "+"}
                  </div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    style={{ display: "none" }}
                    onChange={handleAvatarChange}
                  />
                </div>

                {/* Delete avatar button */}
                {user?.avatar && !isUploadingAvatar && (
                  <button
                    className="profile-avatar-delete-btn"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteAvatar();
                    }}
                  >
                    Xóa ảnh
                  </button>
                )}

                <div className="profile-name">{name}</div>
                <div className="profile-role-badge">Nhà khám phá</div>

                {/* XP bar */}
                <div className="xp-bar-wrap">
                  <div className="xp-bar-labels">
                    <span>Cấp 12</span>
                    <span>2.350 / 4.000 XP</span>
                  </div>
                  <div className="xp-bar-track">
                    <div className="xp-bar-fill" style={{ width: "58.75%" }} />
                  </div>
                </div>

                {/* Quote / Bio */}
                {isEditing ? (
                  <textarea
                    className="profile-bio-input"
                    placeholder="Viết giới thiệu bản thân..."
                    value={editForm.bio || ""}
                    onChange={(e) => handleFormChange("bio", e.target.value)}
                    maxLength={500}
                    rows={3}
                  />
                ) : (
                  <div className="profile-quote">
                    {user?.bio
                      ? `"${user.bio}"`
                      : "\"Yêu lịch sử, đam mê khám phá và muốn tìm hiểu sâu hơn về hành trình dựng nước và giữ nước của dân tộc Việt Nam.\""}
                  </div>
                )}
              </div>

              {/* Info panel */}
              <div className="profile-info-panel">
                <div className="section-title">Thông Tin Cá Nhân</div>
                <div className="divider-line" />

                {/* Success/Error message */}
                {saveMessage && (
                  <div className={`profile-save-message ${saveMessage.includes("thành công") ? "profile-save-message--success" : "profile-save-message--error"}`}>
                    {saveMessage}
                  </div>
                )}

                <div className="info-table">
                  {personalInfo.map(({ label, value, field }) => (
                    <div key={label} className="info-row">
                      <span className="info-row__label">{label}</span>
                      {isEditing && field ? (
                        <span className="info-row__value">
                          {field === "gender" ? (
                            <select
                              className="profile-edit-input profile-edit-select"
                              value={editForm.gender || ""}
                              onChange={(e) => handleFormChange("gender", e.target.value)}
                            >
                              <option value="">Chọn giới tính</option>
                              <option value="male">Nam</option>
                              <option value="female">Nữ</option>
                              <option value="other">Khác</option>
                            </select>
                          ) : field === "birthDate" ? (
                            <input
                              type="date"
                              className="profile-edit-input"
                              value={editForm.birthDate || ""}
                              onChange={(e) => handleFormChange("birthDate", e.target.value)}
                            />
                          ) : (
                            <input
                              type="text"
                              className="profile-edit-input"
                              value={(editForm[field] as string) || ""}
                              onChange={(e) => handleFormChange(field, e.target.value)}
                              placeholder={label}
                            />
                          )}
                        </span>
                      ) : (
                        <span className="info-row__value">{value}</span>
                      )}
                    </div>
                  ))}
                </div>

                <div className="profile-actions">
                  {isEditing ? (
                    <>
                      <button
                        className="btn-edit btn-edit--save"
                        onClick={handleSaveProfile}
                        disabled={isSaving}
                      >
                        {isSaving ? "Đang lưu..." : "Lưu Thay Đổi"}
                      </button>
                      <button
                        className="btn-edit btn-edit--cancel"
                        onClick={handleEditToggle}
                        disabled={isSaving}
                      >
                        Hủy
                      </button>
                    </>
                  ) : (
                    <button className="btn-edit" onClick={handleEditToggle}>
                      Chỉnh Sửa Thông Tin
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ── Bottom section ── */}
        <div className="profile-bottom">

          {/* Achievements */}
          <div className="card bottom-card">
            <CardHeader title="Thành Tựu Khám Phá" />
            <div className="achievements-grid">
              {achievements.map((a, i) => (
                <div key={i} className="achievement-item">
                  <div
                    className="achievement-icon-bar"
                    style={{ borderColor: a.color, boxShadow: `0 0 8px ${a.color}44` }}
                  />
                  <div className="achievement-title">{a.title}</div>
                  <div className="achievement-desc">{a.desc}</div>
                </div>
              ))}
            </div>
            <button className="btn-card">Xem Tất Cả Thành Tựu</button>
          </div>

          {/* Journeys */}
          <div className="card bottom-card">
            <CardHeader title="Hành Trình Của Tôi" />
            <div className="journey-list">
              {journeys.map((j, i) => (
                <div key={i} className="journey-item">
                  <div className="journey-info">
                    <div className="journey-label">Hành trình</div>
                    <div className="journey-title">{j.label}</div>
                    <div className="journey-progress-row">
                      <div className="progress-track">
                        <div
                          className="progress-fill"
                          style={{
                            width: `${j.progress}%`,
                            background: `linear-gradient(90deg, ${j.color}88, ${j.color})`,
                            boxShadow: `0 0 6px ${j.color}88`,
                          }}
                        />
                      </div>
                      <span className="journey-pct" style={{ color: j.color }}>
                        {j.progress}%
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <button className="btn-card">Tiếp Tục Hành Trình</button>
          </div>

          {/* Heritage */}
          <div className="card bottom-card">
            <CardHeader title="Di Sản Đã Mở Khóa" />
            <div className="heritage-grid">
              {heritage.map((h, i) => (
                <div
                  key={i}
                  className={`heritage-item ${h.unlocked ? "heritage-item--unlocked" : "heritage-item--locked"}`}
                >
                  <div className="heritage-item__badge">
                    {h.unlocked
                      ? <div className="badge-check">✓</div>
                      : <div className="badge-lock">✕</div>
                    }
                  </div>
                  <div className="heritage-item__name">{h.name}</div>
                </div>
              ))}
            </div>
            <button className="btn-card">Khám Phá Bản Đồ Di Sản</button>
          </div>

          {/* Streak */}
          <div className="card bottom-card">
            <CardHeader title="Streak Đăng Nhập" />
            <div className="streak-body">
              <div className="streak-circle">
                <span className="streak-count">32</span>
              </div>

              <div className="streak-label">Ngày liên tiếp</div>

              <div className="streak-week">
                {weekDays.map((d, i) => (
                  <div key={d} className="streak-day">
                    <span className="streak-day__name">{d}</span>
                    <div className={`streak-day__box ${i < 6 ? "streak-day__box--done" : "streak-day__box--pending"}`}>
                      {i < 6 ? "✓" : ""}
                    </div>
                  </div>
                ))}
              </div>

              <div className="streak-hint">Đăng nhập mỗi ngày để nhận thưởng!</div>

              <button className="btn-card">Xem Phần Thưởng</button>
            </div>
          </div>

        </div>{/* end profile-bottom */}

        {/* Footer quote */}
        <div className="profile-footer">
          <div className="profile-footer__open-quote">&ldquo;</div>
          <div className="profile-footer__text">
            Dòng chảy lịch sử không ngừng trôi,<br />
            Hiểu quá khứ – Trân trọng hiện tại – Kiến tạo tương lai.
          </div>
        </div>

      </div>{/* end profile-content */}
    </div>
  );
}