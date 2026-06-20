"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";
import { notificationApi } from "@/lib/notificationApi";

// SVG Icons
const SearchIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
);
const ChevronDownIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6"/></svg>
);
const ChevronRightIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6"/></svg>
);
const RefreshIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/><path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16"/><path d="M16 21v-5h5"/></svg>
);
const PlayIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="5 3 19 12 5 21 5 3"/></svg>
);
const MoreVerticalIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="1"/><circle cx="12" cy="5" r="1"/><circle cx="12" cy="19" r="1"/></svg>
);
const HeadphonesIcon = () => (
   <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 14h3a2 2 0 0 1 2 2v3a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-7a9 9 0 0 1 18 0v7a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3"/></svg>
);
const CalendarIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="18" x="3" y="4" rx="2" ry="2"/><line x1="16" x2="16" y1="2" y2="6"/><line x1="8" x2="8" y1="2" y2="6"/><line x1="3" x2="21" y1="10" y2="10"/></svg>
);
const BarChartIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" x2="18" y1="20" y2="10"/><line x1="12" x2="12" y1="20" y2="4"/><line x1="6" x2="6" y1="20" y2="14"/></svg>
);
const ThemeBookIcon = () => (
  <div className="w-12 h-12 rounded-full border-2 border-[#e8d5b5] bg-[#fdf9f1] flex items-center justify-center text-[#c9a15a] flex-shrink-0 shadow-inner">
     <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/>
        <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/>
     </svg>
  </div>
);

const formatDate = (dateString: string) => {
  const date = new Date(dateString);
  return date.toLocaleDateString("vi-VN", { day: '2-digit', month: '2-digit', year: 'numeric' });
};

const formatDuration = (seconds: number) => {
  if (!seconds || isNaN(seconds)) return "00:00";
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  if (hrs > 0) {
    return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
};

export const translateLevel = (level: string) => {
  const mapping: Record<string, string> = {
    Easy: "Dễ",
    Medium: "Trung cấp",
    Hard: "Nâng cao",
    "Dễ": "Dễ",
    "Trung cấp": "Trung cấp",
    "Nâng cao": "Nâng cao"
  };
  return mapping[level] || level;
};

export default function PodcastListingPage() {
  const { user } = useAuth();
  const [podcasts, setPodcasts] = useState<Record<string, any>[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [sort, setSort] = useState("");
  const [expandedChapters, setExpandedChapters] = useState<Record<string, boolean>>({});
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);
  const [stats, setStats] = useState({ categories: {}, levels: {} });

  const [followedCategories, setFollowedCategories] = useState<string[]>([]);
  const [followLoadingMap, setFollowLoadingMap] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const fetchFollowed = async () => {
      if (user) {
        try {
          const followed = await notificationApi.getFollowedCategories();
          setFollowedCategories(followed.map((c: string) => c.trim()));
        } catch (err) {
          console.error("Error fetching followed categories:", err);
        }
      } else {
        setFollowedCategories([]);
      }
    };
    fetchFollowed();
  }, [user]);

  const handleToggleFollow = async (catName: string) => {
    if (!user) {
      alert("Vui lòng đăng nhập để theo dõi chủ đề này!");
      return;
    }
    const cleanCat = catName.trim();
    setFollowLoadingMap((prev) => ({ ...prev, [catName]: true }));
    try {
      const isFollowing = followedCategories.includes(cleanCat);
      if (isFollowing) {
        await notificationApi.unfollowCategory(cleanCat);
        setFollowedCategories((prev) => prev.filter((c) => c !== cleanCat));
      } else {
        await notificationApi.followCategory(cleanCat);
        setFollowedCategories((prev) => [...prev, cleanCat]);
      }
    } catch (err) {
      console.error("Error toggling follow category:", err);
      alert("Có lỗi xảy ra khi thực hiện thao tác. Vui lòng thử lại!");
    } finally {
      setFollowLoadingMap((prev) => ({ ...prev, [catName]: false }));
    }
  };

  const handleCopyLink = (id: string) => {
    const url = `${window.location.origin}/podcasts/${id}`;
    navigator.clipboard.writeText(url)
      .then(() => alert("Đã sao chép liên kết đến podcast này!"))
      .catch(() => alert("Không thể sao chép liên kết"));
    setActiveMenuId(null);
  };

  const handleDownload = async (ep: any) => {
    if (!ep?.audioUrl) return;
    try {
      const response = await fetch(ep.audioUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      const extension = ep.audioUrl.split(".").pop() || "mp3";
      link.setAttribute("download", `${ep.title}.${extension}`);
      document.body.appendChild(link);
      link.click();
      link.parentNode?.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Download failed:", error);
      window.open(ep.audioUrl, "_blank");
    }
    setActiveMenuId(null);
  };

  useEffect(() => {
    fetchPodcasts();
  }, [category, sort]);

  const fetchPodcasts = async () => {
    setLoading(true);

    try {
      let url = "/podcasts?limit=100";
      if (search) url += `&keyword=${search}`;
      if (category) url += `&category=${category}`;
      if (sort) url += `&sort=${sort}`;

      const res = await api.get(url);
      const apiData = res.data?.data || [];
      setPodcasts(apiData);
      
      const cats: Record<string, number> = {};
      const lvls: Record<string, number> = {};
      apiData.forEach((p: { category: string; level: string }) => {
        cats[p.category] = (cats[p.category] || 0) + 1;
        const mappedLevel = translateLevel(p.level);
        lvls[mappedLevel] = (lvls[mappedLevel] || 0) + 1;
      });
      setStats({ categories: cats, levels: lvls });
      
      if (apiData.length > 0) {
         const groups = Array.from(new Set(apiData.map((p: { category: string }) => p.category))) as string[];
         if (groups[0]) {
             setExpandedChapters((prev) => ({
                [groups[0]]: true,
                ...prev,
             }));
         }
      }
      
    } catch (err) {
      console.error("Error fetching podcasts:", err);
      setPodcasts([]);
      setStats({ categories: {}, levels: {} });
    } finally {
      setLoading(false);
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchPodcasts();
  };

  const handleReset = () => {
    setSearch("");
    setCategory("");
    setSort("");
    setTimeout(() => fetchPodcasts(), 0);
  };

  const toggleChapter = (cat: string) => {
    setExpandedChapters(prev => ({
      ...prev,
      [cat]: !prev[cat]
    }));
  };

  const groupedPodcasts: Record<string, any[]> = {};
  podcasts.forEach((p: any) => {
    if (!groupedPodcasts[p.category]) groupedPodcasts[p.category] = [];
    groupedPodcasts[p.category].push(p);
  });

  return (
    <div className="min-h-screen pb-16 bg-[#FDFBF7]">
      <div className="w-full bg-[#f3e9d8] relative overflow-hidden" style={{ backgroundImage: 'url("/textures/paper.jpg")' }}>
        <div className="max-w-[1200px] mx-auto px-6 py-8 relative z-10">
          <div className="text-sm font-medium text-[#8c6a34] mb-2 uppercase tracking-widest flex items-center gap-2">
             <Link href="/" className="hover:underline">Trang chủ</Link>
             <ChevronRightIcon />
             <span>Mục lục</span>
          </div>
          <h2 className="text-[#a84d28] font-bold tracking-widest text-sm mb-4 uppercase">Podcast Lịch Sử</h2>
          <h1 className="text-4xl md:text-5xl font-bold text-[#3a2312] leading-tight font-display mb-4 max-w-2xl">
            Khám phá lịch sử Việt Nam<br/>qua những câu chuyện
          </h1>
          <p className="text-[#5c4a3d] text-lg max-w-xl leading-relaxed">
            Lắng nghe những câu chuyện lịch sử hào hùng được tái hiện sống động qua giọng kể. 
            Mỗi tập podcast là một hành trình trở về quá khứ, giúp bạn hiểu hơn về dân tộc, đất nước 
            và con người Việt Nam.
          </p>
        </div>
        
        <div className="absolute right-0 top-0 h-full w-1/3 pointer-events-none opacity-80" 
             style={{ 
               background: 'radial-gradient(circle, rgba(201,161,90,0.2) 0%, rgba(243,233,216,0) 70%)' 
             }}>
        </div>
      </div>

      <div className="max-w-[1200px] mx-auto px-6 mt-8">
        
        <div className="bg-[#fdf9f1] border border-[#e8d5b5] rounded-xl p-3 flex flex-wrap gap-4 items-center mb-8 shadow-sm">
          <form onSubmit={handleSearchSubmit} className="flex items-center bg-white border border-[#e8d5b5] rounded-lg px-3 py-2 flex-1 min-w-[200px]">
            <SearchIcon />
            <input 
              type="text" 
              placeholder="Tìm kiếm podcast..." 
              className="ml-2 w-full outline-none text-sm text-[#3a2312] bg-transparent"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </form>
          
          <div className="flex gap-4 flex-wrap flex-1 min-w-[300px]">
             <select 
                className="bg-white border border-[#e8d5b5] rounded-lg px-4 py-2 text-sm text-[#3a2312] outline-none flex-1 appearance-none cursor-pointer"
                value={category}
                onChange={e => setCategory(e.target.value)}
             >
                <option value="">Chủ đề</option>
                {Object.keys(stats.categories).map(c => <option key={c} value={c}>{c}</option>)}
             </select>
             
             <select 
                className="bg-white border border-[#e8d5b5] rounded-lg px-4 py-2 text-sm text-[#3a2312] outline-none flex-1 appearance-none cursor-pointer"
                value={sort}
                onChange={e => setSort(e.target.value)}
             >
                <option value="">Sắp xếp: Mới nhất</option>
                <option value="oldest">Sắp xếp: Cũ nhất</option>
                <option value="views">Lượt nghe nhiều</option>
             </select>
          </div>

          <button 
             onClick={handleReset}
             className="bg-[#1f0a0d] text-[#f0ddb7] px-5 py-2 rounded-lg text-sm font-medium flex items-center gap-2 hover:bg-[#3a1a20] transition-colors cursor-pointer"
          >
            <RefreshIcon /> Làm mới
          </button>
        </div>

        <div className="flex flex-col lg:flex-row gap-8">
          <div className="flex-[3]">
            {loading ? (
              <div className="text-center py-10 text-[#8c6a34]">Đang tải dữ liệu...</div>
            ) : Object.keys(groupedPodcasts).length === 0 ? (
              <div className="text-center py-10 text-[#8c6a34]">Không tìm thấy podcast nào.</div>
            ) : (
              <div className="flex flex-col gap-4">
                {Object.entries(groupedPodcasts).map(([cat, epList], idx) => {
                  const isExpanded = expandedChapters[cat];
                  const chapterLabel = cat.toUpperCase().includes("CHƯƠNG") ? cat.toUpperCase() : `CHỦ ĐỀ: ${cat.toUpperCase()}`;
                  
                  return (
                    <div key={cat} className="bg-[#fcf8ef] border border-[#e8d5b5] rounded-xl overflow-hidden shadow-sm transition-all">
                      <div 
                        className="p-4 flex items-center justify-between cursor-pointer hover:bg-[#f3e9d8]/50"
                        onClick={() => toggleChapter(cat)}
                      >
                         <div className="flex items-center gap-4">
                            <ThemeBookIcon />
                             <div>
                                <div className="text-[#a84d28] font-bold text-xs uppercase tracking-wider mb-1">{chapterLabel}</div>
                                <h3 className="text-[#3a2312] font-bold text-lg font-display">{cat}</h3>
                                <div className="flex items-center gap-3 mt-1">
                                   <span className="text-[#8c6a34] text-xs">{epList.length} bài học</span>
                                   <button
                                     type="button"
                                     onClick={(e) => {
                                       e.stopPropagation();
                                       handleToggleFollow(cat);
                                     }}
                                     disabled={followLoadingMap[cat]}
                                     className={`px-2 py-0.5 rounded text-[10px] font-semibold flex items-center gap-1 transition-all ${
                                       followedCategories.includes(cat.trim())
                                         ? "bg-amber-100 text-amber-800 border border-amber-300 hover:bg-amber-200"
                                         : "bg-[#a84d28] text-white hover:bg-[#8f3f1e] shadow-sm"
                                     } disabled:opacity-50 cursor-pointer`}
                                   >
                                     {followLoadingMap[cat] ? (
                                       <span className="inline-block animate-spin mr-0.5">⏳</span>
                                     ) : followedCategories.includes(cat.trim()) ? (
                                       <span>✓ Đang theo dõi</span>
                                     ) : (
                                       <span>+ Theo dõi chủ đề</span>
                                     )}
                                   </button>
                                </div>
                             </div>
                         </div>
                         <div className="text-[#8c6a34] px-4">
                            {isExpanded ? <ChevronDownIcon /> : <ChevronRightIcon />}
                         </div>
                      </div>

                      {isExpanded && (
                        <div className="p-4 pt-0 border-t border-[#e8d5b5]/50 bg-[#f9f4e8]/50">
                           <div className="flex flex-col gap-3 mt-4">
                             {epList.map((ep, i) => (
                                <div key={ep._id} className="bg-white border border-[#e8d5b5] rounded-xl p-4 flex flex-col sm:flex-row gap-4 items-start sm:items-center hover:border-[#c9a15a] transition-all shadow-sm group">
                                   {/* Serial Number */}
                                   <div className="w-8 text-center text-[#c9a15a] font-bold font-display text-lg opacity-60 flex-shrink-0 self-center">
                                      {(i+1).toString().padStart(2, '0')}
                                   </div>
                                   
                                   {/* Thumbnail Image */}
                                   <div className="relative w-full sm:w-48 aspect-[16/9] rounded-lg overflow-hidden border border-[#e8d5b5]/60 flex-shrink-0 bg-amber-50">
                                      <img 
                                         src={ep.thumbnail || "/images/HeroSection.png"} 
                                         alt={ep.title} 
                                         className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                      />
                                      {ep.duration > 0 && (
                                         <span className="absolute bottom-2 right-2 bg-black/75 text-white text-[10px] font-semibold px-1.5 py-0.5 rounded backdrop-blur-[2px]">
                                            {formatDuration(ep.duration)}
                                         </span>
                                      )}
                                   </div>
                                   
                                   {/* Content */}
                                   <div className="flex-1 min-w-0">
                                      <h4 className="text-[#3a2312] font-bold text-[15px] group-hover:text-[#a84d28] transition-colors line-clamp-2 leading-snug">{ep.title}</h4>
                                      <div className="flex items-center gap-4 text-xs text-[#8c6a34] mt-1.5">
                                         <span className="flex items-center gap-1"><CalendarIcon /> {formatDate(ep.createdAt)}</span>
                                         <span className="flex items-center gap-1"><BarChartIcon /> {translateLevel(ep.level)}</span>
                                      </div>
                                      {ep.description && (
                                         <p className="text-[#5c4a3d] text-xs mt-2 line-clamp-2 leading-relaxed">
                                            {ep.description}
                                         </p>
                                      )}
                                   </div>
                                   
                                   {/* Actions */}
                                   <div className="flex items-center gap-2 self-end sm:self-center flex-shrink-0 relative">
                                      <Link href={`/podcasts/${ep._id}`} className="w-10 h-10 rounded-full border border-[#e8d5b5] flex items-center justify-center text-[#a84d28] hover:bg-[#a84d28] hover:text-white transition-colors bg-[#fdf9f1]">
                                         <PlayIcon />
                                      </Link>
                                      <button 
                                        onClick={() => setActiveMenuId(activeMenuId === ep._id ? null : ep._id)}
                                        className="w-8 h-8 flex items-center justify-center text-[#8c6a34] hover:bg-[#e8d5b5]/50 rounded-full transition-colors cursor-pointer"
                                      >
                                         <MoreVerticalIcon />
                                      </button>
                                      {activeMenuId === ep._id && (
                                         <>
                                            <div className="fixed inset-0 z-30" onClick={() => setActiveMenuId(null)} />
                                            <div className="absolute right-0 top-full mt-1 bg-[#fcf8ef] border border-[#e8d5b5] rounded-lg shadow-lg py-1.5 z-40 min-w-[150px] text-xs font-semibold animate-in fade-in slide-in-from-top-1 duration-150">
                                               <button 
                                                  onClick={() => handleDownload(ep)}
                                                  className="w-full text-left px-4 py-2 hover:bg-[#f3e9d8] text-[#5c4a3d] transition-colors flex items-center gap-2"
                                               >
                                                  <svg className="w-3.5 h-3.5 text-[#8c6a34]" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                                                     <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3" />
                                                  </svg>
                                                  <span>Tải âm thanh</span>
                                               </button>
                                               <button 
                                                  onClick={() => handleCopyLink(ep._id)}
                                                  className="w-full text-left px-4 py-2 hover:bg-[#f3e9d8] text-[#5c4a3d] transition-colors flex items-center gap-2"
                                               >
                                                  <svg className="w-3.5 h-3.5 text-[#8c6a34]" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                                                     <path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 0 1 1.242 7.244l-4.5 4.5a4.5 4.5 0 0 1-6.364-6.364l1.757-1.757m13.35-.622 1.757-1.757a4.5 4.5 0 0 0-6.364-6.364l-4.5 4.5a4.5 4.5 0 0 0 1.242 7.244" />
                                                  </svg>
                                                  <span>Sao chép liên kết</span>
                                               </button>
                                            </div>
                                         </>
                                      )}
                                   </div>
                                </div>
                             ))}
                           </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="flex-1 flex flex-col gap-6">
            <div className="bg-[#fcf8ef] border border-[#e8d5b5] rounded-xl p-5 shadow-sm">
               <h3 className="text-[#3a2312] font-bold text-[15px] tracking-wider mb-4 font-display">CHỦ ĐỀ NỔI BẬT</h3>
               <div className="flex flex-col gap-3">
                  {Object.entries(stats.categories).length > 0 ? (
                     Object.entries(stats.categories).map(([name, count]: any) => (
                        <div key={name} className="flex items-center justify-between group cursor-pointer">
                           <div className="flex items-center gap-2 text-sm text-[#5c4a3d] group-hover:text-[#a84d28] transition-colors">
                              <span className="text-[#c9a15a]">❖</span> {name}
                           </div>
                           <div className="w-6 h-6 rounded-full border border-[#e8d5b5] flex items-center justify-center text-xs text-[#8c6a34] bg-white">
                              {count}
                           </div>
                        </div>
                     ))
                  ) : (
                     <div className="text-sm text-[#8c6a34]">Đang cập nhật...</div>
                  )}
               </div>
            </div>

            <div className="bg-[#fcf8ef] border border-[#e8d5b5] rounded-xl p-5 shadow-sm">
               <h3 className="text-[#3a2312] font-bold text-[15px] tracking-wider mb-4 font-display">CẤP ĐỘ</h3>
               <div className="flex flex-col gap-4">
                  {["Dễ", "Trung cấp", "Nâng cao"].map((level) => {
                     const count = (stats.levels as any)[level] || 0;
                     return (
                        <div key={level} className="flex items-center justify-between group cursor-pointer">
                           <div className="text-sm text-[#5c4a3d] group-hover:text-[#a84d28] transition-colors">
                              {level}
                           </div>
                           <div className="text-sm text-[#8c6a34] font-medium">
                              {count}
                           </div>
                        </div>
                     );
                  })}
               </div>
            </div>

            <div className="bg-[#f5ebd3] border border-[#e8d5b5] rounded-xl p-6 flex items-center gap-4 shadow-sm">
               <div className="w-12 h-12 bg-[#eac988] rounded-full flex items-center justify-center flex-shrink-0 text-[#3a2312]">
                  <HeadphonesIcon />
               </div>
               <p className="text-sm text-[#5c4a3d] font-medium leading-relaxed italic font-display">
                  Lịch sử không chỉ là quá khứ, đó là hành trình để hiểu hiện tại và hướng tới tương lai.
               </p>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}
