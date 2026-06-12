"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { api } from "@/lib/api";

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

const formatDate = (dateString: string) => {
  const date = new Date(dateString);
  return date.toLocaleDateString("vi-VN", { day: '2-digit', month: '2-digit', year: 'numeric' });
};

export default function PodcastListingPage() {
  const [podcasts, setPodcasts] = useState<Record<string, any>[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [era, setEra] = useState("");
  const [sort, setSort] = useState("");
  const [expandedChapters, setExpandedChapters] = useState<Record<string, boolean>>({});
  
  const [stats, setStats] = useState({ categories: {}, levels: {} });

  useEffect(() => {
    fetchPodcasts();
  }, [category, era, sort]);

  const fetchPodcasts = async () => {
    setLoading(true);

    try {
      let url = "/podcasts?limit=100";
      if (search) url += `&keyword=${search}`;
      if (category) url += `&category=${category}`;
      if (sort) url += `&sort=${sort}`;

      const mockData = [
        {
          _id: "mock-bai-1",
          title: "Bài 1: Liên hợp quốc",
          description: "Tìm hiểu về sự ra đời, mục tiêu và nguyên tắc hoạt động của Liên hợp quốc.",
          content: "Nội dung chi tiết bài học Liên hợp quốc...",
          category: "Chủ đề 1. THẾ GIỚI TRONG VÀ SAU CHIẾN TRANH LẠNH",
          level: "Trung cấp",
          createdAt: new Date().toISOString(),
          viewCount: 1250,
          thumbnail: "/images/HeroSection.png",
          audioUrl: "/audios/Bai_01.m4a",
          duration: 1125 // 18:45 in seconds
        }
      ];

      const res = await api.get(url);
      const apiData = res.data?.data || [];
      const finalData = apiData.length > 0 ? apiData : mockData;
      setPodcasts(finalData);
      
      const cats: Record<string, number> = {};
      const lvls: Record<string, number> = {};
      finalData.forEach((p: { category: string; level: string }) => {
        cats[p.category] = (cats[p.category] || 0) + 1;
        lvls[p.level] = (lvls[p.level] || 0) + 1;
      });
      setStats({ categories: cats, levels: lvls });
      
      if (finalData.length > 0) {
         const groups = Array.from(new Set(finalData.map((p: { category: string }) => p.category))) as string[];
         if (groups[0]) {
             setExpandedChapters({ [groups[0]]: true });
         }
      }
      
    } catch (err) {
      console.error("Error fetching podcasts:", err);
      const mockData = [{
          _id: "mock-bai-1",
          title: "Bài 1: Liên hợp quốc",
          description: "Tìm hiểu về sự ra đời, mục tiêu và nguyên tắc hoạt động của Liên hợp quốc.",
          content: "Nội dung chi tiết bài học Liên hợp quốc...",
          category: "Chủ đề 1. THẾ GIỚI TRONG VÀ SAU CHIẾN TRANH LẠNH",
          level: "Trung cấp",
          createdAt: new Date().toISOString(),
          viewCount: 1250,
          thumbnail: "/images/HeroSection.png",
          audioUrl: "/audios/Bai_01.m4a",
          duration: 1125 // 18:45 in seconds
      }];
      setPodcasts(mockData);
      setStats({ 
        categories: { [mockData[0].category]: 1 }, 
        levels: { [mockData[0].level]: 1 } 
      });
      setExpandedChapters({ [mockData[0].category]: true });
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
    setEra("");
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
                value={era}
                onChange={e => setEra(e.target.value)}
             >
                <option value="">Thời kỳ</option>
                <option value="Cổ đại">Cổ đại</option>
                <option value="Trung đại">Trung đại</option>
                <option value="Cận đại">Cận đại</option>
                <option value="Hiện đại">Hiện đại</option>
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
                  
                  const thumbnail = epList[0]?.thumbnail || "/images/HeroSection.png";

                  return (
                    <div key={cat} className="bg-[#fcf8ef] border border-[#e8d5b5] rounded-xl overflow-hidden shadow-sm transition-all">
                      <div 
                        className="p-4 flex items-center justify-between cursor-pointer hover:bg-[#f3e9d8]/50"
                        onClick={() => toggleChapter(cat)}
                      >
                         <div className="flex items-center gap-4">
                            <div className="w-16 h-16 rounded-full overflow-hidden border-2 border-[#e8d5b5] flex-shrink-0">
                               <img src={thumbnail} alt={cat} className="w-full h-full object-cover" />
                            </div>
                            <div>
                               <div className="text-[#a84d28] font-bold text-xs uppercase tracking-wider mb-1">{chapterLabel}</div>
                               <h3 className="text-[#3a2312] font-bold text-lg font-display">{cat}</h3>
                               <p className="text-[#8c6a34] text-xs mt-1">{epList.length} bài học</p>
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
                               <div key={ep._id} className="bg-white border border-[#e8d5b5] rounded-lg p-3 flex items-center hover:border-[#c9a15a] transition-colors group">
                                  <div className="w-8 text-center text-[#c9a15a] font-bold font-display text-lg opacity-60 mr-2">
                                     {(i+1).toString().padStart(2, '0')}
                                  </div>
                                  
                                  <div className="flex-1 ml-2">
                                     <h4 className="text-[#3a2312] font-bold text-[15px] group-hover:text-[#a84d28] transition-colors line-clamp-1">{ep.title}</h4>
                                     <div className="flex items-center gap-4 text-xs text-[#8c6a34] mt-1">
                                        <span className="flex items-center gap-1">📅 {formatDate(ep.createdAt)}</span>
                                        <span className="flex items-center gap-1">📊 {ep.level}</span>
                                     </div>
                                  </div>
                                  
                                  <div className="flex items-center gap-2">
                                     <Link href={`/podcasts/${ep._id}`} className="w-10 h-10 rounded-full border border-[#e8d5b5] flex items-center justify-center text-[#a84d28] hover:bg-[#a84d28] hover:text-white transition-colors bg-[#fdf9f1]">
                                        <PlayIcon />
                                     </Link>
                                     <button className="w-8 h-8 flex items-center justify-center text-[#8c6a34] hover:bg-[#e8d5b5]/50 rounded-full transition-colors cursor-pointer">
                                        <MoreVerticalIcon />
                                     </button>
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
