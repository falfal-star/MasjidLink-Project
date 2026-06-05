'use client';

import React, { useState, useRef, useEffect } from 'react';
import { createClient } from '../../../../utils/supabase/client';
import { 
  Send, MessageSquare, Bot, Sparkles, RefreshCw, 
  BookOpen, FileText, Landmark, User, FileEdit
} from 'lucide-react';

interface ChatMessage {
  id: string;
  sender: 'user' | 'bot';
  text: string;
  timestamp: Date;
  proposalDraft?: any;
}

export default function MasjidBotPage() {
  const supabase = createClient();
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      sender: 'bot',
      text: "Assalamu'alaikum warahmatullahi wabarakatuh. Saya **MasjidBot**, asisten AI MasjidLink untuk membantu DKM mengelola proposal, LPJ, dan tata kelola keuangan PSAK 409. Ada yang bisa saya bantu hari ini?",
      timestamp: new Date(),
    }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [masjidName, setMasjidName] = useState('Masjid Kami');
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    async function fetchMasjid() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase
        .from('user_masjid_roles')
        .select('masjids(name)')
        .eq('user_id', user.id)
        .maybeSingle();
      if (data?.masjids) {
        setMasjidName((data.masjids as any).name);
      }
    }
    fetchMasjid();
  }, [supabase]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const handleSend = async (textToSend: string) => {
    if (!textToSend.trim()) return;

    const userMsg: ChatMessage = {
      id: Math.random().toString(),
      sender: 'user',
      text: textToSend,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    // Simulate AI thinking and processing
    setTimeout(() => {
      let botResponse = '';
      let proposalDraft: any = null;
      const lower = textToSend.toLowerCase();

      if (lower.includes('proposal') || lower.includes('program baru') || lower.includes('buat proposal')) {
        botResponse = `Tentu, saya telah membuatkan draf proposal program kerja untuk **${masjidName}** yang terstruktur secara syariah:\n\n` +
          `### DRAF PROPOSAL PROGRAM DIGITAL\n` +
          `* **Judul**: Pengajian Akbar & Santunan Anak Yatim Ramadhan\n` +
          `* **Kategori**: Keagamaan & Sosial\n` +
          `* **Sasaran**: 150 Jamaah & 50 Anak Yatim\n` +
          `* **Anggaran yang Diusulkan**: Rp 15.000.000\n` +
          `* **Rekomendasi Sumber Dana**: Infaq Terikat (Muqayyad) / Sedekah Umum\n\n` +
          `Draf JSON program telah berhasil digenerate di sistem. Anda bisa langsung mengimpor data ini ke halaman pembuatan proposal baru di menu **Kelola Program**.`;
        
        proposalDraft = {
          title: "Pengajian Akbar & Santunan Anak Yatim",
          category: "keagamaan",
          budget: 15000000,
          description: "Kegiatan rutin kajian keislaman menjelang buka puasa bersama disertai penyaluran santunan bagi anak yatim piatu di lingkungan sekitar masjid.",
        };
      } else if (lower.includes('lpj') || lower.includes('pertanggungjawaban')) {
        botResponse = `Untuk menyusun Laporan Pertanggungjawaban (LPJ) program DKM di **${masjidName}**, pastikan komponen berikut telah diisi:\n` +
          `1. **Realisasi Keuangan**: Bandingkan anggaran awal dengan realisasi aktual.\n` +
          `2. **Partisipasi Jamaah**: Catat kehadiran aktual vs target (misal: 120 dari 150 target jamaah).\n` +
          `3. **Dokumentasi**: Unggah minimal 3 foto kegiatan yang representatif.\n\n` +
          `*Tips AI*: Saya dapat mendeteksi jika terjadi kelebihan anggaran (*budget overrun*) di atas 10% dan merekomendasikan penulisan justifikasi tertulis dari penanggung jawab program agar LPJ disetujui oleh Ketua DKM secara mulus.`;
      } else if (lower.includes('psak') || lower.includes('ziswaf') || lower.includes('hukum') || lower.includes('zakat')) {
        botResponse = `Berdasarkan pedoman akuntansi syariah **PSAK 409**:\n` +
          `* **Dana Zakat** hanya boleh disalurkan kepada 8 Asnaf (Fakir, Miskin, Amil, Mualaf, Riqab, Gharimin, Fisabilillah, Ibnu Sabil). Tidak boleh digunakan untuk operasional fisik masjid (seperti semen/paving).\n` +
          `* **Dana Infaq/Sedekah** dapat digunakan secara lebih fleksibel untuk pembangunan masjid, operasional AC, kajian, maupun sosial kemasyarakatan.\n` +
          `* **Amil** berhak mendapatkan maksimal 12.5% (1/8 bagian) dari total zakat yang dihimpun.\n\n` +
          `*Catatan: Panduan ini bersifat umum. Untuk kepastian hukum fiqih syariah yang mendalam, silakan konsultasikan dengan komisi fatwa MUI atau ulama setempat.*`;
      } else {
        botResponse = `Saya memahami pertanyaan Anda tentang manajemen operasional masjid. Sebagai asisten AI MasjidLink, saya direkomendasikan untuk membantu Anda:\n` +
          `- 📝 **Menyusun draf proposal kegiatan baru** (ketik kata "proposal")\n` +
          `- 📊 **Panduan pelaporan keuangan PSAK 409 & ZISWAF** (ketik kata "PSAK")\n` +
          `- 🗂️ **Alur verifikasi & penyusunan LPJ program** (ketik kata "LPJ")\n\n` +
          `Ada detail operasional khusus dari **${masjidName}** yang ingin Anda tanyakan?`;
      }

      const botMsg: ChatMessage = {
        id: Math.random().toString(),
        sender: 'bot',
        text: botResponse,
        timestamp: new Date(),
        proposalDraft,
      };

      setMessages(prev => [...prev, botMsg]);
      setLoading(false);
    }, 1200);
  };

  const handleCopyProposal = (draft: any) => {
    localStorage.setItem('masjidlink_pending_proposal', JSON.stringify(draft));
    alert("Draf proposal disalin ke memori! Anda dapat menggunakannya saat membuat program baru.");
  };

  return (
    <div className="flex flex-col h-[calc(100vh-140px)] max-h-[750px] bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-100 bg-slate-50/50 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <Bot className="w-5 h-5" />
          </div>
          <div>
            <h2 className="font-extrabold text-slate-dark text-base flex items-center gap-1.5">
              MasjidBot DKM
              <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 text-[10px] rounded-full font-black flex items-center gap-0.5">
                <Sparkles className="w-2.5 h-2.5" /> AI ASSISTANT
              </span>
            </h2>
            <p className="text-xs text-slate-light font-medium">{masjidName}</p>
          </div>
        </div>
        <button 
          onClick={() => setMessages(messages.slice(0, 1))}
          className="p-2 hover:bg-slate-100 text-slate-light hover:text-slate rounded-xl transition-all cursor-pointer"
          title="Reset Percakapan"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 p-6 overflow-y-auto space-y-4 bg-slate-50/20">
        {messages.map(msg => (
          <div key={msg.id} className={`flex gap-3 max-w-[85%] ${msg.sender === 'user' ? 'ml-auto flex-row-reverse' : ''}`}>
            <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 text-sm font-bold ${
              msg.sender === 'user' ? 'bg-primary text-white' : 'bg-emerald-50 text-emerald-600 border border-emerald-100'
            }`}>
              {msg.sender === 'user' ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
            </div>
            
            <div className="space-y-2">
              <div className={`p-4 rounded-3xl text-sm font-medium ${
                msg.sender === 'user' 
                  ? 'bg-primary text-white rounded-tr-none' 
                  : 'bg-white text-slate-dark rounded-tl-none border border-gray-100 shadow-sm leading-relaxed'
              }`}>
                {/* Parse simple markdown format */}
                {msg.text.split('\n').map((line, idx) => {
                  let rendered = line;
                  if (rendered.startsWith('### ')) {
                    return <h4 key={idx} className="font-extrabold text-sm text-emerald-700 mt-2 mb-1 uppercase">{rendered.replace('### ', '')}</h4>;
                  }
                  if (rendered.startsWith('* ')) {
                    return <li key={idx} className="ml-4 list-disc text-xs mt-1">{rendered.replace('* ', '')}</li>;
                  }
                  return <p key={idx} className="mt-1" dangerouslySetInnerHTML={{ 
                    __html: rendered
                      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                      .replace(/\*(.*?)\*/g, '<em>$1</em>')
                  }} />;
                })}
              </div>

              {msg.proposalDraft && (
                <div className="bg-emerald-50/50 border border-emerald-100 rounded-2xl p-4 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-2.5">
                    <FileEdit className="w-5 h-5 text-emerald-600" />
                    <div>
                      <p className="text-xs font-bold text-slate-dark">{msg.proposalDraft.title}</p>
                      <p className="text-[10px] text-slate-light">Budget: Rp {msg.proposalDraft.budget.toLocaleString('id-ID')}</p>
                    </div>
                  </div>
                  <button 
                    onClick={() => handleCopyProposal(msg.proposalDraft)}
                    className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-bold rounded-lg transition-all cursor-pointer"
                  >
                    Salin Draf Proposal
                  </button>
                </div>
              )}

              <span className="text-[9px] text-slate-light font-medium px-2 block">
                {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex gap-3 max-w-[85%]">
            <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-100 flex items-center justify-center shrink-0 animate-pulse">
              <Bot className="w-4 h-4 animate-bounce" />
            </div>
            <div className="bg-white border border-gray-100 shadow-sm p-4 rounded-3xl rounded-tl-none flex items-center gap-1.5 py-3">
              <span className="w-2 h-2 bg-emerald-500 rounded-full animate-bounce delay-75"></span>
              <span className="w-2 h-2 bg-emerald-500 rounded-full animate-bounce delay-150"></span>
              <span className="w-2 h-2 bg-emerald-500 rounded-full animate-bounce delay-300"></span>
            </div>
          </div>
        )}
        <div ref={chatEndRef} />
      </div>

      {/* Suggested prompts */}
      <div className="px-6 py-3 border-t border-gray-100 flex gap-2 overflow-x-auto bg-slate-50/30">
        <button 
          onClick={() => handleSend("Buat draf proposal kegiatan sosial")}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-gray-200 hover:border-primary hover:text-primary text-slate text-xs font-bold rounded-full transition-all whitespace-nowrap cursor-pointer"
        >
          <BookOpen className="w-3.5 h-3.5" /> Buat Proposal
        </button>
        <button 
          onClick={() => handleSend("Bantu susun Laporan Pertanggungjawaban (LPJ)")}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-gray-200 hover:border-primary hover:text-primary text-slate text-xs font-bold rounded-full transition-all whitespace-nowrap cursor-pointer"
        >
          <FileText className="w-3.5 h-3.5" /> Susun LPJ Program
        </button>
        <button 
          onClick={() => handleSend("Bagaimana aturan pengelolaan dana ZISWAF PSAK 409?")}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-gray-200 hover:border-primary hover:text-primary text-slate text-xs font-bold rounded-full transition-all whitespace-nowrap cursor-pointer"
        >
          <Landmark className="w-3.5 h-3.5" /> Aturan PSAK 409
        </button>
      </div>

      {/* Input */}
      <form 
        onSubmit={(e) => {
          e.preventDefault();
          handleSend(input);
        }}
        className="px-6 py-4 border-t border-gray-100 flex gap-3 bg-white"
      >
        <input 
          type="text" 
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Tanyakan penyusunan proposal, LPJ, atau PSAK 409..." 
          className="flex-1 px-4 py-2.5 bg-slate-50 border border-gray-200 rounded-2xl text-sm focus:outline-none focus:border-primary focus:bg-white transition-all font-medium text-slate-dark"
        />
        <button 
          type="submit" 
          disabled={!input.trim()}
          className="p-3 bg-primary hover:bg-primary-dark text-white rounded-2xl shadow-sm transition-all cursor-pointer disabled:opacity-50"
        >
          <Send className="w-4 h-4" />
        </button>
      </form>
    </div>
  );
}
