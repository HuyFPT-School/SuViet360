"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { api } from "@/lib/api";

// --- Icons ---
const HomeIcon = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>;
const ClockIcon = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>;
const BookOpenIcon = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>;
const CalendarIcon = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect width="18" height="18" x="3" y="4" rx="2" ry="2"/><line x1="16" x2="16" y1="2" y2="6"/><line x1="8" x2="8" y1="2" y2="6"/><line x1="3" x2="21" y1="10" y2="10"/></svg>;
const PlayIcon = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg>;
const PauseIcon = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>;
const VolumeIcon = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14"/></svg>;
const SettingsIcon = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>;
const EditIcon = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>;
const DownloadIcon = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" x2="12" y1="15" y2="3"/></svg>;
const ShareIcon = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" x2="15.42" y1="13.51" y2="17.49"/><line x1="15.41" x2="8.59" y1="6.51" y2="10.49"/></svg>;
const SmallPlayIcon = () => <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg>;
const MoreVerticalIcon = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="1"/><circle cx="12" cy="5" r="1"/><circle cx="12" cy="19" r="1"/></svg>;
const ChevronDownIcon = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6"/></svg>;

// Format time
const formatTime = (seconds: number) => {
  if (!seconds || isNaN(seconds)) return "00:00";
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m < 10 ? '0' : ''}${m}:${s < 10 ? '0' : ''}${s}`;
};

const formatDate = (dateString: string) => {
  if (!dateString) return "";
  const date = new Date(dateString);
  return date.toLocaleDateString("vi-VN", { day: '2-digit', month: '2-digit', year: 'numeric' });
};
const MOCK_PODCAST = {
  _id: "mock-bai-1",
  title: "Bài 1: Liên hợp quốc",
  description: "Podcast tái hiện lại sự hình thành, vai trò và những đóng góp quan trọng của Liên hợp quốc đối với nền hòa bình thế giới từ năm 1945 đến nay.",
  content: "Liên hợp quốc là tổ chức quốc tế lớn nhất thế giới, được thành lập với mục tiêu duy trì hòa bình và an ninh quốc tế, phát triển mối quan hệ hữu nghị giữa các quốc gia và thúc đẩy tiến bộ xã hội, nâng cao mức sống và quyền con người.",
  category: "Chủ đề 1. THẾ GIỚI TRONG VÀ SAU CHIẾN TRANH LẠNH",
  level: "Trung cấp",
  createdAt: new Date().toISOString(),
  viewCount: 1250,
  thumbnail: "/images/HeroSection.png", // Generic fallback image
  audioUrl: "/audios/Bai_01.m4a",
  duration: 1125 // 18:45
};



const MOCK_NOTES: any[] = [];

const MOCK_COMMENTS: any[] = [];

export default function PodcastDetailPage() {
  const params = useParams();
  const id = params?.id as string;

  const [podcast, setPodcast] = useState<Record<string, any> | null>(null);
  const [notes, setNotes] = useState<Record<string, any>[]>([]);
  const [comments, setComments] = useState<Record<string, any>[]>([]);
  const [loading, setLoading] = useState(true);

  // Audio state
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);

  // Tabs
  const [activeTab, setActiveTab] = useState("noidung");
  
  // Forms
  const [commentText, setCommentText] = useState("");
  const [noteText, setNoteText] = useState("");
  const [isAddingNote, setIsAddingNote] = useState(false);
  const [noteTimestamp, setNoteTimestamp] = useState(0);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        if (id === "mock-bai-1") {
          setPodcast(MOCK_PODCAST);
          setDuration(MOCK_PODCAST.duration);
          setLoading(false);
          return;
        }


        const [podRes, notesRes, commentsRes] = await Promise.all([
          api.get(`/podcasts/${id}`),
          api.get(`/podcast-notes/${id}`).catch(() => ({ data: { data: [] } })),
          api.get(`/podcast-comments/${id}`).catch(() => ({ data: { data: [] } }))
        ]);
        
        setPodcast(podRes.data.data);
        setNotes(notesRes.data.data || []);
        setComments(commentsRes.data.data || []);
        setDuration(podRes.data.data.duration || 0);
        
      } catch (err) {
        console.error("Error fetching podcast details:", err);
        setPodcast(MOCK_PODCAST);
        setDuration(MOCK_PODCAST.duration);
        setLoading(false);
      }
    };

    fetchData();
  }, [id]);

  // Audio Controls
  const togglePlay = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
    }
    setIsPlaying(!isPlaying);
  };

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime);
    }
  };

  const handleLoadedMetadata = () => {
    if (audioRef.current) {
      setDuration(audioRef.current.duration);
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = Number(e.target.value);
    if (audioRef.current) {
      audioRef.current.currentTime = time;
      setCurrentTime(time);
    }
  };

  const handleVolume = (e: React.ChangeEvent<HTMLInputElement>) => {
    const vol = Number(e.target.value);
    if (audioRef.current) {
      audioRef.current.volume = vol;
      setVolume(vol);
    }
  };

  const seekTo = (time: number) => {
    if (audioRef.current) {
      audioRef.current.currentTime = time;
      setCurrentTime(time);
      if (!isPlaying) {
        audioRef.current.play();
        setIsPlaying(true);
      }
    }
  };

  // Submissions
  const submitComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentText.trim()) return;
    try {
      if (id !== "mock-bai-1") {
        const res = await api.post("/podcast-comments", { podcastId: id, content: commentText });
        setComments([res.data.data, ...comments]);
      } else {
        setComments([{ _id: Date.now().toString(), content: commentText, createdAt: new Date().toISOString(), userId: { name: "Bạn" } }, ...comments]);
      }
      setCommentText("");
    } catch (err) {
      console.error(err);
      alert("Cần đăng nhập để bình luận");
    }
  };

  const startAddingNote = () => {
    setNoteTimestamp(currentTime);
    setIsAddingNote(true);
  };

  const submitNote = async () => {
    if (!noteText.trim()) {
      setIsAddingNote(false);
      return;
    }
    try {
      if (id !== "mock-bai-1") {
        const res = await api.post("/podcast-notes", { podcastId: id, content: noteText, timestamp: noteTimestamp });
        setNotes([...notes, res.data.data].sort((a,b) => a.timestamp - b.timestamp));
      } else {
        setNotes([...notes, { _id: Date.now().toString(), content: noteText, timestamp: noteTimestamp }].sort((a,b) => a.timestamp - b.timestamp));
      }
      setNoteText("");
      setIsAddingNote(false);
    } catch (err) {
      console.error(err);
      alert("Cần đăng nhập để thêm ghi chú");
    }
  };

  if (loading) return <div className="min-h-screen bg-[#FDFBF7] flex items-center justify-center text-[#8c6a34]">Đang tải...</div>;
  if (!podcast) return <div className="min-h-screen bg-[#FDFBF7] flex items-center justify-center text-[#8c6a34]">Không tìm thấy nội dung.</div>;

  return (
    <div className="min-h-screen pb-16 bg-[#FDFBF7] relative" style={{ backgroundImage: 'url("/textures/paper.jpg")' }}>
      
      {/* Audio Element */}
      <audio 
        ref={audioRef}
        src={podcast.audioUrl || "/audios/Bai_01.m4a"}
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onEnded={() => setIsPlaying(false)}
      />

      <div className="max-w-[1200px] mx-auto px-6 py-6">
        
        {/* Breadcrumb */}
        <div className="text-xs font-medium text-[#8c6a34] mb-6 flex items-center gap-2">
           <Link href="/" className="hover:text-[#a84d28] transition-colors"><HomeIcon /></Link>
           <span>/</span>
           <Link href="/podcasts" className="hover:underline">Mục lục</Link>
           <span>/</span>
           <span className="text-[#a84d28]">{podcast.title}</span>
        </div>

        <div className="flex flex-col lg:flex-row gap-6">
          
          {/* LEFT COLUMN */}
          <div className="flex-[2] flex flex-col gap-6">
            
            {/* Player Card */}
            <div className="bg-[#fcf8ef] border border-[#e8d5b5] rounded-xl p-6 shadow-sm">
              <h2 className="text-[#a84d28] font-bold tracking-widest text-xs mb-2 uppercase">PODCAST LỊCH SỬ</h2>
              
              <div className="flex gap-6 mb-6">
                 <div className="flex-1">
                    <h1 className="text-3xl font-bold text-[#3a2312] font-display mb-4 leading-tight">{podcast.title}</h1>
                    <p className="text-[#5c4a3d] text-sm leading-relaxed mb-6">{podcast.description}</p>
                    
                    <div className="flex flex-wrap items-center gap-6 text-xs text-[#8c6a34] font-medium">
                       <span className="flex items-center gap-2"><ClockIcon /> Thời lượng: {formatTime(duration)}</span>
                       <span className="flex items-center gap-2"><BookOpenIcon /> Cấp độ: {podcast.level}</span>
                       <span className="flex items-center gap-2"><CalendarIcon /> Ngày đăng: {formatDate(podcast.createdAt)}</span>
                    </div>
                 </div>
                 
                 <div className="w-[280px] h-[160px] rounded-lg overflow-hidden border-2 border-[#e8d5b5] flex-shrink-0 shadow-inner">
                    <img src={podcast.thumbnail || "/images/HeroSection.png"} alt="Thumbnail" className="w-full h-full object-cover" />
                 </div>
              </div>

              {/* Controls Wrapper */}
              <div className="bg-[#f5e9d3] rounded-xl p-4 border border-[#e8d5b5] shadow-inner mb-4">
                 <div className="flex items-center gap-4">
                    <button 
                      onClick={togglePlay}
                      className="w-12 h-12 rounded-full bg-[#3a2312] text-[#f0ddb7] flex items-center justify-center hover:bg-[#a84d28] hover:scale-105 transition-all shadow-md flex-shrink-0"
                    >
                       {isPlaying ? <PauseIcon /> : <PlayIcon />}
                    </button>
                    
                    <span className="text-xs font-medium text-[#5c4a3d] w-10">{formatTime(currentTime)}</span>
                    
                    {/* Progress Bar Container */}
                    <div className="relative flex-1 flex items-center h-8">
                       {/* Background Track */}
                       <div className="absolute w-full h-[3px] bg-[#d8c39d] rounded-full"></div>
                       {/* Fill Track */}
                       <div className="absolute h-[3px] bg-[#a84d28] rounded-full" style={{ width: `${(currentTime/duration)*100 || 0}%` }}></div>
                       
                       {/* Note Markers */}
                       {notes.map(note => {
                          const left = `${(note.timestamp / duration) * 100}%`;
                          return (
                             <div 
                               key={note._id} 
                               className="absolute w-2.5 h-2.5 bg-[#eac988] border-[1.5px] border-[#a84d28] rounded-full top-1/2 -translate-y-1/2 cursor-pointer hover:scale-150 transition-transform z-10"
                               style={{ left }}
                               title={note.content}
                               onClick={() => seekTo(note.timestamp)}
                             ></div>
                          );
                       })}
                       
                       {/* Range Input */}
                       <input 
                         type="range" 
                         min="0" max={duration || 100} 
                         value={currentTime} 
                         onChange={handleSeek}
                         className="absolute w-full h-full opacity-0 cursor-pointer z-20"
                       />
                    </div>
                    
                    <span className="text-xs font-medium text-[#5c4a3d] w-10 text-right">{formatTime(duration)}</span>
                    
                    <div className="w-px h-6 bg-[#d8c39d] mx-2"></div>
                    
                    <div className="flex items-center gap-2 text-[#5c4a3d]">
                       <VolumeIcon />
                       <input 
                         type="range" min="0" max="1" step="0.05"
                         value={volume} onChange={handleVolume}
                         className="w-16 h-[3px] appearance-none rounded-full [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-0 [&::-webkit-slider-thumb]:h-0"
                         style={{ background: `linear-gradient(to right, #a84d28 0%, #a84d28 ${volume * 100}%, #d8c39d ${volume * 100}%, #d8c39d 100%)` }}
                       />
                    </div>
                    
                    <button className="text-[#5c4a3d] hover:text-[#a84d28] ml-2"><SettingsIcon /></button>
                 </div>
              </div>

              {/* Action Buttons */}
              <div className="flex border border-[#e8d5b5] rounded-lg overflow-hidden bg-white">
                 <button onClick={startAddingNote} className="w-full py-3 flex items-center justify-center gap-2 text-sm font-medium text-[#5c4a3d] hover:bg-[#f3e9d8] transition-colors">
                    <EditIcon /> Thêm ghi chú tại {formatTime(currentTime)}
                 </button>
              </div>

            </div>

            {/* Content Tabs */}
            <div className="bg-[#fcf8ef] border border-[#e8d5b5] rounded-xl overflow-hidden shadow-sm">
               <div className="flex border-b border-[#e8d5b5] px-6">
                  <button 
                     onClick={() => setActiveTab("noidung")}
                     className={`py-4 font-bold text-sm tracking-wider uppercase border-b-2 transition-colors mr-8 ${activeTab === 'noidung' ? 'border-[#a84d28] text-[#a84d28]' : 'border-transparent text-[#8c6a34] hover:text-[#5c4a3d]'}`}
                  >NỘI DUNG</button>
                  <button 
                     onClick={() => setActiveTab("tailieu")}
                     className={`py-4 font-bold text-sm tracking-wider uppercase border-b-2 transition-colors ${activeTab === 'tailieu' ? 'border-[#a84d28] text-[#a84d28]' : 'border-transparent text-[#8c6a34] hover:text-[#5c4a3d]'}`}
                  >TÀI LIỆU LIÊN QUAN</button>
               </div>
               
               <div className="p-6 text-sm text-[#5c4a3d] leading-relaxed bg-[#fdfbf7]">
                  {activeTab === "noidung" ? (
                     <div dangerouslySetInnerHTML={{ __html: podcast.content?.replace(/\n/g, '<br/>') || podcast.description }} />
                  ) : (
                     <p>Chưa có tài liệu liên quan cho bài học này.</p>
                  )}
                  
                  <div className="mt-4 text-center">
                     <button className="text-[#a84d28] font-bold text-xs uppercase flex items-center justify-center gap-1 mx-auto hover:underline">
                        Xem thêm <ChevronDownIcon />
                     </button>
                  </div>
               </div>
            </div>

            {/* Comments */}
            <div className="bg-[#fcf8ef] border border-[#e8d5b5] rounded-xl p-6 shadow-sm">
               <h3 className="text-[#3a2312] font-bold text-[15px] tracking-wider mb-6 font-display">BÌNH LUẬN</h3>
               
               {/* Input */}
               <form onSubmit={submitComment} className="flex gap-4 mb-8">
                  <div className="w-10 h-10 rounded-full bg-[#e8d5b5] flex items-center justify-center text-[#5c4a3d] font-bold flex-shrink-0">
                     <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                  </div>
                  <input 
                    type="text" 
                    placeholder="Viết bình luận của bạn..." 
                    value={commentText}
                    onChange={e => setCommentText(e.target.value)}
                    className="flex-1 bg-white border border-[#e8d5b5] rounded-lg px-4 py-2 text-sm text-[#3a2312] outline-none focus:border-[#c9a15a] shadow-inner"
                  />
                  <button type="submit" className="bg-[#c9a15a] hover:bg-[#b58b4c] text-white px-6 py-2 rounded-lg text-sm font-medium transition-colors shadow-md">
                     Gửi
                  </button>
               </form>

               {/* Comment List */}
               <div className="flex flex-col gap-6">
                  {comments.length === 0 ? (
                     <p className="text-sm text-[#8c6a34] text-center">Chưa có bình luận nào.</p>
                  ) : comments.map(c => (
                     <div key={c._id} className="flex gap-4">
                        <div className="w-10 h-10 rounded-full bg-[#d8c39d] flex items-center justify-center text-white font-bold flex-shrink-0 overflow-hidden">
                           {c.userId?.avatar ? <img src={c.userId.avatar} alt="avt" className="w-full h-full object-cover"/> : <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>}
                        </div>
                        <div className="flex-1 border-b border-[#e8d5b5]/50 pb-4">
                           <div className="flex items-center justify-between mb-1">
                              <h4 className="font-bold text-sm text-[#3a2312]">{c.userId?.name || "Người dùng ẩn danh"}</h4>
                              <div className="flex items-center gap-2 text-xs text-[#8c6a34]">
                                 {formatDate(c.createdAt)}
                                 <MoreVerticalIcon />
                              </div>
                           </div>
                           <p className="text-sm text-[#5c4a3d]">{c.content}</p>
                        </div>
                     </div>
                  ))}
               </div>
            </div>

          </div>

          {/* RIGHT COLUMN */}
          <div className="flex-1 flex flex-col gap-6">
            
            {/* Notes Section */}
            <div className="bg-[#fcf8ef] border border-[#e8d5b5] rounded-xl p-5 shadow-sm">
               <div className="flex items-center justify-between mb-4">
                  <h3 className="text-[#3a2312] font-bold text-[15px] tracking-wider font-display uppercase">Ghi chú của bạn</h3>
                  <button onClick={() => setIsAddingNote(true)} className="bg-[#3a2312] hover:bg-[#a84d28] text-[#f0ddb7] text-xs font-medium px-3 py-1.5 rounded-lg flex items-center gap-1 transition-colors shadow-sm">
                     + Thêm ghi chú mới
                  </button>
               </div>
               
               {isAddingNote && (
                  <div className="mb-4 bg-white p-3 rounded-lg border border-[#c9a15a] shadow-inner">
                     <p className="text-xs text-[#8c6a34] mb-2 font-medium">Ghi chú tại: {formatTime(noteTimestamp)}</p>
                     <textarea 
                        value={noteText}
                        onChange={e => setNoteText(e.target.value)}
                        placeholder="Nhập nội dung..."
                        className="w-full text-sm outline-none resize-none bg-transparent mb-2 text-[#3a2312]"
                        rows={2}
                        autoFocus
                     />
                     <div className="flex justify-end gap-2">
                        <button onClick={() => setIsAddingNote(false)} className="text-xs text-[#8c6a34] px-2 py-1">Hủy</button>
                        <button onClick={submitNote} className="bg-[#c9a15a] text-white text-xs px-3 py-1 rounded">Lưu</button>
                     </div>
                  </div>
               )}

               <div className="flex flex-col gap-3">
                  {notes.length === 0 && !isAddingNote ? (
                     <p className="text-sm text-[#8c6a34] text-center py-4">Chưa có ghi chú nào.</p>
                  ) : notes.map((note) => (
                     <div key={note._id} className="bg-white border border-[#e8d5b5] rounded-lg p-3 group hover:border-[#c9a15a] transition-colors">
                        <div className="flex justify-between items-start mb-2">
                           <span className="text-xs font-bold text-[#a84d28] bg-[#f5e9d3] px-2 py-0.5 rounded">{formatTime(note.timestamp)}</span>
                           <div className="flex gap-1 text-[#8c6a34]">
                              <button onClick={() => seekTo(note.timestamp)} className="w-6 h-6 flex items-center justify-center hover:bg-[#f3e9d8] rounded-full transition-colors" title="Phát từ đây">
                                 <SmallPlayIcon />
                              </button>
                              <button className="w-6 h-6 flex items-center justify-center hover:bg-[#f3e9d8] rounded-full transition-colors">
                                 <MoreVerticalIcon />
                              </button>
                           </div>
                        </div>
                        <p className="text-sm text-[#5c4a3d] cursor-pointer" onClick={() => seekTo(note.timestamp)}>
                           {note.content}
                        </p>
                     </div>
                  ))}
               </div>
               
               {notes.length > 0 && (
                  <button className="w-full mt-4 py-2 bg-[#f5e9d3] text-[#8c6a34] text-xs font-bold uppercase rounded-lg hover:bg-[#e8d5b5] transition-colors">
                     Xem tất cả ghi chú
                  </button>
               )}
            </div>

            {/* Info Section */}
            <div className="bg-[#fcf8ef] border border-[#e8d5b5] rounded-xl p-5 shadow-sm">
               <h3 className="text-[#3a2312] font-bold text-[15px] tracking-wider mb-4 font-display">GIỚI THIỆU BÀI HỌC</h3>
               <div className="flex flex-col gap-3 text-sm">
                  <div className="flex">
                     <span className="w-24 text-[#8c6a34]">Chủ đề:</span>
                     <span className="flex-1 text-[#3a2312] font-medium">{podcast.category}</span>
                  </div>
                  <div className="flex">
                     <span className="w-24 text-[#8c6a34]">Cấp độ:</span>
                     <span className="flex-1 text-[#3a2312] font-medium">{podcast.level}</span>
                  </div>
                  <div className="flex">
                     <span className="w-24 text-[#8c6a34]">Thời lượng:</span>
                     <span className="flex-1 text-[#3a2312] font-medium">{formatTime(duration)}</span>
                  </div>
                  <div className="flex">
                     <span className="w-24 text-[#8c6a34]">Lượt nghe:</span>
                     <span className="flex-1 text-[#3a2312] font-medium">{podcast.viewCount?.toLocaleString() || 0} lượt</span>
                  </div>
                  <div className="flex">
                     <span className="w-24 text-[#8c6a34]">Ngày đăng:</span>
                     <span className="flex-1 text-[#3a2312] font-medium">{formatDate(podcast.createdAt)}</span>
                  </div>
               </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}
