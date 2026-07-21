"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useRouter } from "next/navigation";
import { profileApi, type ProfileUpdatePayload } from "@/lib/profileApi";
import { api } from "@/lib/api";

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
  const [progressData, setProgressData] = useState<any>(null);

  const daysRemaining = (() => {
    const expiryDate = user?.subscriptionExpiry;
    const tierName = user?.subscriptionTier || "Free";
    if (!expiryDate || tierName === "Free") return null;
    try {
      const expiry = new Date(expiryDate).getTime();
      const now = new Date().getTime();
      const diff = expiry - now;
      return Math.ceil(diff / (1000 * 60 * 60 * 24));
    } catch {
      return null;
    }
  })();

  useEffect(() => {
    if (user && user.role === "student") {
      api.get<{ success: boolean; data: any }>("/progress/dashboard")
        .then((res) => setProgressData(res.data.data))
        .catch((err) => console.error("Error fetching progress dashboard:", err));
    }
  }, [user]);

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
      setEditForm({
        name: user.name || "",
        phone: user.phone || "",
        birthDate: toInputDate(user.birthDate),
        gender: user.gender,
        address: user.address || "",
        bio: user.bio || "",
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

  const xp = progressData?.xp ?? user?.xp ?? 0;
  const level = progressData?.level ?? user?.level ?? 1;
  const minXP = 100 * Math.pow(level - 1, 2);
  const maxXP = 100 * Math.pow(level, 2);
  const diffXP = maxXP - minXP;
  const currentOffset = xp - minXP;
  const percentFill = Math.min(100, Math.max(0, (currentOffset / (diffXP || 1)) * 100));

  const totalLessons = progressData?.stats?.totalLessons || 0;
  const totalPodcasts = progressData?.stats?.totalPodcasts || 0;
  const lessonPercent = totalLessons > 0 
    ? ((progressData?.stats?.completedLessonsCount || 0) / totalLessons) * 100 
    : 0;
  const podcastPercent = totalPodcasts > 0 
    ? ((progressData?.stats?.completedPodcastsCount || 0) / totalPodcasts) * 100 
    : 0;
  const unlockedPercent = totalLessons > 0
    ? ((progressData?.unlockedLessons?.length || 0) / totalLessons) * 100
    : 0;

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
                
                {/* Subscription Tier Badge right below name */}
                <div className="flex flex-col items-center gap-1 mt-1 mb-2">
                  <span className={`px-3 py-0.5 rounded-full text-[11px] font-bold tracking-wide uppercase border flex items-center gap-1 ${
                    (user?.subscriptionTier || "Free") === "Student Pro" 
                      ? "bg-amber-500/10 text-amber-300 border-amber-500/30" 
                      : (user?.subscriptionTier || "Free") === "Student Plus"
                      ? "bg-yellow-500/10 text-yellow-300 border-yellow-500/30"
                      : "bg-stone-500/10 text-stone-400 border-stone-500/20"
                  }`}>
                    {(user?.subscriptionTier || "Free") === "Student Pro" ? (
                      <svg className="w-3.5 h-3.5 fill-amber-300/20 text-amber-300 inline mr-1" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M6 12 12 2l6 10-6 10-6-10Z" />
                        <path d="M12 2v20" />
                        <path d="M6 12h12" />
                      </svg>
                    ) : (user?.subscriptionTier || "Free") === "Student Plus" ? (
                      <svg className="w-3.5 h-3.5 fill-yellow-300/20 text-yellow-300 inline mr-1" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                      </svg>
                    ) : (
                      <svg className="w-3.5 h-3.5 fill-stone-400/20 text-stone-400 inline mr-1" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                      </svg>
                    )}
                    Gói: {user?.subscriptionTier && user.subscriptionTier !== "Free" ? user.subscriptionTier : "Miễn phí"}
                  </span>
                  {(user?.subscriptionTier || "Free") !== "Free" && user?.subscriptionExpiry && (
                    <span className="text-[10px] text-stone-400">
                      Hạn dùng: {new Date(user.subscriptionExpiry).toLocaleDateString("vi-VN")}
                    </span>
                  )}
                </div>

                <div className="profile-role-badge">Nhà khám phá</div>

                {/* XP bar */}
                <div className="xp-bar-wrap">
                  <div className="xp-bar-labels">
                    <span>Cấp {level}</span>
                    <span>{xp.toLocaleString()} / {maxXP.toLocaleString()} XP</span>
                  </div>
                  <div className="xp-bar-track">
                    <div className="xp-bar-fill" style={{ width: `${percentFill}%` }} />
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

                {/* Expiration warning alert if nearing expiration (< 3 days) */}
                {user?.subscriptionTier && user?.subscriptionTier !== "Free" && daysRemaining !== null && daysRemaining <= 3 && (
                  <div 
                    className="mb-4 p-3 bg-red-950/60 border border-red-500/40 text-red-200 text-sm rounded-lg flex items-start gap-2"
                    style={{ fontFamily: "sans-serif" }}
                  >
                    <svg className="w-5 h-5 text-red-400 shrink-0 mt-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
                      <line x1="12" x2="12" y1="9" y2="13" />
                      <line x1="12" x2="12.01" y1="17" y2="17" />
                    </svg>
                    <div>
                      <strong className="text-red-400">Cảnh báo hết hạn!</strong> Gói <span className="text-amber-300 font-semibold">{user.subscriptionTier}</span> của bạn sẽ hết hạn trong {daysRemaining <= 0 ? "hôm nay" : `${daysRemaining} ngày`} nữa. Vui lòng gia hạn để không bị gián đoạn quyền lợi.
                    </div>
                  </div>
                )}

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

          {/* XP History */}
          <div className="card bottom-card">
            <CardHeader title="Lịch Sử Tích Lũy XP" />
            <div className="achievements-grid">
              {(progressData?.xpHistory || []).slice(0, 6).map((item: any, i: number) => (
                <div key={item._id || i} className="achievement-item">
                  <div
                    className="achievement-icon-bar"
                    style={{ borderColor: "#D4AF37", boxShadow: "0 0 8px #D4AF3744" }}
                  />
                  <div className="achievement-title">{item.description}</div>
                  <div className="achievement-desc">+{item.amount} XP · {formatDate(item.createdAt)}</div>
                </div>
              ))}
              {(!progressData?.xpHistory || progressData.xpHistory.length === 0) && (
                <p className="text-xs text-amber-600/70 italic text-center py-4 col-span-2">Chưa có lịch sử XP nào.</p>
              )}
            </div>
          </div>

          {/* Completion Stats */}
          <div className="card bottom-card">
            <CardHeader title="Tiến Độ Học Tập" />
            <div className="journey-list">
              <div className="journey-item">
                <div className="journey-info">
                  <div className="journey-label">Bài học RPG</div>
                  <div className="journey-title">Bài học lịch sử đã hoàn thành</div>
                  <div className="journey-progress-row">
                    <div className="progress-track">
                      <div
                        className="progress-fill"
                        style={{
                          width: `${lessonPercent}%`,
                          background: "linear-gradient(90deg, #D4AF3788, #D4AF37)",
                          boxShadow: "0 0 6px #D4AF3788",
                        }}
                      />
                    </div>
                    <span className="journey-pct" style={{ color: "#D4AF37" }}>
                      {progressData?.stats?.completedLessonsCount || 0}/{progressData?.stats?.totalLessons || 0} ({Math.round(lessonPercent)}%)
                    </span>
                  </div>
                </div>
              </div>

              <div className="journey-item">
                <div className="journey-info">
                  <div className="journey-label">Audio Podcast</div>
                  <div className="journey-title">Podcast âm thanh đã nghe</div>
                  <div className="journey-progress-row">
                    <div className="progress-track">
                      <div
                        className="progress-fill"
                        style={{
                          width: `${podcastPercent}%`,
                          background: "linear-gradient(90deg, #C0903088, #C09030)",
                          boxShadow: "0 0 6px #C0903088",
                        }}
                      />
                    </div>
                    <span className="journey-pct" style={{ color: "#C09030" }}>
                      {progressData?.stats?.completedPodcastsCount || 0}/{progressData?.stats?.totalPodcasts || 0} ({Math.round(podcastPercent)}%)
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Quiz Performances */}
          <div className="card bottom-card">
            <CardHeader title="Kết Quả Làm Quiz" />
            <div className="journey-list">
              {(progressData?.quizPerformances || []).slice(0, 3).map((item: any, i: number) => (
                <div key={item.lessonId || i} className="journey-item">
                  <div className="journey-info">
                    <div className="journey-label">Bài trắc nghiệm trong Game</div>
                    <div className="journey-title flex items-center justify-between mt-1">
                      <span className="text-amber-950 font-medium text-xs break-all">ID: {item.lessonId}</span>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        item.passed ? "bg-emerald-100 text-emerald-800" : "bg-red-100 text-red-800"
                      }`}>
                        {item.passed ? "ĐẠT" : "CHƯA ĐẠT"}
                      </span>
                    </div>
                    <div className="mt-1 flex items-center justify-between text-xs text-amber-700">
                      <span>Đúng: {item.score}/{item.total} câu</span>
                      <span>{formatDate(item.updatedAt)}</span>
                    </div>
                  </div>
                </div>
              ))}
              {(!progressData?.quizPerformances || progressData.quizPerformances.length === 0) && (
                <p className="text-xs text-amber-600/70 italic text-center py-4">Chưa thực hiện bài quiz nào.</p>
              )}
            </div>
          </div>

          {/* Unlocked game stages */}
          <div className="card bottom-card">
            <CardHeader title="Màn Chơi Đã Mở Khóa" />
            <div className="journey-list">
              <div className="journey-item">
                <div className="journey-info">
                  <div className="journey-label">Game RPG 2D</div>
                  <div className="journey-title">Màn chơi game đã được mở khóa</div>
                  <div className="journey-progress-row">
                    <div className="progress-track">
                      <div
                        className="progress-fill"
                        style={{
                          width: `${unlockedPercent}%`,
                          background: "linear-gradient(90deg, #b8963e88, #b8963e)",
                          boxShadow: "0 0 6px #b8963e88",
                        }}
                      />
                    </div>
                    <span className="journey-pct" style={{ color: "#b8963e" }}>
                      {progressData?.unlockedLessons?.length || 0}/{progressData?.stats?.totalLessons || 0} ({Math.round(unlockedPercent)}%)
                    </span>
                  </div>
                </div>
              </div>
            </div>
            <a href="#" className="btn-card block text-center mt-auto opacity-60 cursor-default pointer-events-none">Chơi trên Mobile</a>
          </div>

        </div>{/* end profile-bottom */}

        {/* Footer quote */}
        <div className="profile-footer">
          <div className="profile-footer__open-quote">"</div>
          <div className="profile-footer__text">
            Dòng chảy lịch sử không ngừng trôi,<br />
            Hiểu quá khứ – Trân trọng hiện tại – Kiến tạo tương lai.
          </div>
        </div>

      </div>{/* end profile-content */}
    </div>
  );
}