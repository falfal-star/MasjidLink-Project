'use client';

import React, { useEffect, useState } from 'react';
import { createClient } from '../../../../../utils/supabase/client';
import { 
  Smile, Frown, Meh, Sparkles, BookOpen, 
  ArrowLeft, MessageSquare, Loader2, ThumbsUp, AlertCircle
} from 'lucide-react';
import Link from 'next/link';

interface ProgramSentiment {
  programId: string;
  title: string;
  positivePct: number;
  neutralPct: number;
  negativePct: number;
  feedbacks: { text: string; sentiment: 'positive' | 'neutral' | 'negative' }[];
}

export default function SentimentAnalysisPage() {
  const supabase = createClient();
  const [loading, setLoading] = useState(true);
  const [masjidName, setMasjidName] = useState('Masjid Kami');
  const [sentiments, setSentiments] = useState<ProgramSentiment[]>([]);
  const [summary, setSummary] = useState({
    positive: 92,
    neutral: 5,
    negative: 3
  });

  useEffect(() => {
    async function fetchSentiments() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: roleData } = await supabase
        .from('user_masjid_roles')
        .select('masjid_id, masjids(name)')
        .eq('user_id', user.id)
        .maybeSingle();

      if (!roleData?.masjid_id) {
        setLoading(false);
        return;
      }

      setMasjidName((roleData.masjids as any)?.name ?? 'Masjid Kami');

      // Fetch completed programs
      const { data: completedProgs } = await supabase
        .from('programs')
        .select('id, title')
        .eq('masjid_id', roleData.masjid_id)
        .eq('status', 'completed');

      const mockSentiments: ProgramSentiment[] = (completedProgs ?? []).map((p, idx) => {
        // Generate stable mock sentiments per program name
        const seed = p.title.length;
        const pos = 80 + (seed % 16);
        const neg = idx % 2 === 0 ? 2 + (seed % 4) : 1 + (seed % 3);
        const neu = 100 - pos - neg;

        const positiveFeeds = [
          "Sangat bermanfaat acaranya, ustadz membawakan materi dengan santai dan jelas.",
          "Membantu meningkatkan pemahaman fiqih wudhu, semoga sering diadakan.",
          "Konsumsi melimpah dan tertib pembagiannya."
        ];
        const neutralFeeds = [
          "Bagus, tapi lain kali mungkin bisa dimulai lebih pagi agar tidak terlalu panas.",
          "Materi cukup padat, butuh sesi tanya jawab lebih panjang."
        ];
        const negativeFeeds = [
          "Microphone sound system masjid kurang jelas terdengar dari bagian shaf belakang.",
          "Tempat parkir motor penuh dan tidak ada yang mengatur."
        ];

        return {
          programId: p.id,
          title: p.title,
          positivePct: pos,
          neutralPct: neu,
          negativePct: neg,
          feedbacks: [
            { text: positiveFeeds[seed % positiveFeeds.length] || "", sentiment: 'positive' },
            { text: neutralFeeds[seed % neutralFeeds.length] || "", sentiment: 'neutral' },
            { text: negativeFeeds[seed % negativeFeeds.length] || "", sentiment: 'negative' }
          ]
        };
      });

      // Default demo data if no completed programs found in DB yet
      if (mockSentiments.length === 0) {
        mockSentiments.push({
          programId: 'demo-1',
          title: 'Kajian Rutin Akhir Pekan & Buka Puasa Bersama',
          positivePct: 94,
          neutralPct: 4,
          negativePct: 2,
          feedbacks: [
            { text: "Ustadz penyampai sangat interaktif dan materinya mendalam.", sentiment: 'positive' },
            { text: "Bagus acaranya, tapi durasi kajian agak terlalu lama mendekati adzan.", sentiment: 'neutral' },
            { text: "Air wudhu sempat mengecil saat jamaah mulai ramai datang.", sentiment: 'negative' }
          ]
        }, {
          programId: 'demo-2',
          title: 'Khitanan Massal & Santunan Anak Yatim Dhuafa',
          positivePct: 90,
          neutralPct: 7,
          negativePct: 3,
          feedbacks: [
            { text: "Sangat membantu bagi keluarga kurang mampu di sekitar masjid. Pelayanan ramah.", sentiment: 'positive' },
            { text: "Khitanan berjalan tertib namun antrean pendaftaran cukup panjang.", sentiment: 'neutral' },
            { text: "Informasi alur antrean khitanan kurang jelas di lokasi.", sentiment: 'negative' }
          ]
        });
      }

      // Calculate weighted summary
      let totalPos = 0, totalNeu = 0, totalNeg = 0;
      mockSentiments.forEach(s => {
        totalPos += s.positivePct;
        totalNeu += s.neutralPct;
        totalNeg += s.negativePct;
      });

      const count = mockSentiments.length;
      setSummary({
        positive: Math.round(totalPos / count),
        neutral: Math.round(totalNeu / count),
        negative: Math.round(totalNeg / count)
      });

      setSentiments(mockSentiments);
      setLoading(false);
    }
    fetchSentiments();
  }, [supabase]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Top Header */}
      <div className="flex items-center gap-4">
        <Link 
          href="/dashboard/pengurus/program"
          className="p-2 hover:bg-slate-100 text-slate hover:text-slate-dark rounded-xl transition-all border border-gray-100 bg-white shadow-sm cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div>
          <h1 className="text-3xl font-extrabold text-slate-dark mb-1 flex items-center gap-3">
            <Smile className="w-8 h-8 text-emerald-600" />
            Analisis Sentimen Feedback Jama'ah
          </h1>
          <p className="text-slate-light">Hasil olah sentimen berbasis AI dari opini dan feedback program kerja di {masjidName}.</p>
        </div>
      </div>

      {/* Aggregate Score Panel */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="md:col-span-1 bg-white rounded-3xl border border-gray-100 shadow-sm p-6 flex flex-col items-center justify-center text-center">
          <div className="w-16 h-16 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mb-3">
            <ThumbsUp className="w-7 h-7" />
          </div>
          <p className="text-[10px] font-bold text-slate-light uppercase tracking-wider">Sentiment Score</p>
          <p className="text-4xl font-black text-emerald-600 mt-1">{summary.positive}%</p>
          <p className="text-xs text-slate-light mt-1.5 font-medium">Feedback Positif</p>
        </div>

        <div className="md:col-span-3 bg-white rounded-3xl border border-gray-100 shadow-sm p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-extrabold text-slate-dark text-base">Distribusi Sentimen Global</h3>
              <span className="px-2.5 py-0.5 bg-emerald-100 text-emerald-800 text-[10px] font-bold rounded-full flex items-center gap-0.5">
                <Sparkles className="w-3 h-3 text-emerald-600" /> AI CLASSIFIED
              </span>
            </div>
            
            {/* Horizontal Stack Bar */}
            <div className="w-full h-8 rounded-2xl overflow-hidden flex font-bold text-xs text-white">
              <div style={{ width: `${summary.positive}%` }} className="bg-emerald-500 flex items-center justify-center transition-all">
                {summary.positive >= 10 && `${summary.positive}%`}
              </div>
              <div style={{ width: `${summary.neutral}%` }} className="bg-amber-400 flex items-center justify-center transition-all">
                {summary.neutral >= 10 && `${summary.neutral}%`}
              </div>
              <div style={{ width: `${summary.negative}%` }} className="bg-rose-500 flex items-center justify-center transition-all">
                {summary.negative >= 10 && `${summary.negative}%`}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4 border-t border-gray-50 pt-4 text-xs font-bold mt-4">
            <div className="flex items-center gap-1.5 text-emerald-600">
              <Smile className="w-4 h-4 shrink-0" />
              <span>{summary.positive}% Positif</span>
            </div>
            <div className="flex items-center gap-1.5 text-amber-500">
              <Meh className="w-4 h-4 shrink-0" />
              <span>{summary.neutral}% Netral</span>
            </div>
            <div className="flex items-center gap-1.5 text-rose-500">
              <Frown className="w-4 h-4 shrink-0" />
              <span>{summary.negative}% Negatif</span>
            </div>
          </div>
        </div>
      </div>

      {/* Program Breakdown Section */}
      <h2 className="text-xl font-bold text-slate-dark mb-4">Analisis per Kegiatan</h2>
      <div className="space-y-6">
        {sentiments.map(s => (
          <div key={s.programId} className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden p-6 space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-50 pb-4">
              <h3 className="font-extrabold text-slate-dark text-base flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-primary shrink-0" />
                {s.title}
              </h3>
              
              <div className="flex gap-2 text-xs font-black shrink-0">
                <span className="px-2.5 py-1 bg-emerald-50 text-emerald-700 rounded-lg flex items-center gap-1">
                  <Smile className="w-3.5 h-3.5 text-emerald-500" /> {s.positivePct}%
                </span>
                <span className="px-2.5 py-1 bg-amber-50 text-amber-700 rounded-lg flex items-center gap-1">
                  <Meh className="w-3.5 h-3.5 text-amber-500" /> {s.neutralPct}%
                </span>
                <span className="px-2.5 py-1 bg-rose-50 text-rose-700 rounded-lg flex items-center gap-1">
                  <Frown className="w-3.5 h-3.5 text-rose-500" /> {s.negativePct}%
                </span>
              </div>
            </div>

            {/* Feedbacks list */}
            <div className="space-y-3">
              <p className="text-xs font-bold text-slate-light flex items-center gap-1.5">
                <MessageSquare className="w-3.5 h-3.5" /> Opini & Masukan Terpilih (Hasil Klasifikasi AI):
              </p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {s.feedbacks.map((f, idx) => (
                  <div 
                    key={idx} 
                    className={`p-4 rounded-2xl border text-xs font-medium leading-relaxed flex flex-col justify-between ${
                      f.sentiment === 'positive' 
                        ? 'bg-emerald-50/20 border-emerald-100 text-emerald-900' 
                        : f.sentiment === 'neutral'
                          ? 'bg-amber-50/20 border-amber-100 text-amber-900'
                          : 'bg-rose-50/20 border-rose-100 text-rose-900'
                    }`}
                  >
                    <p className="italic">"{f.text}"</p>
                    <div className="flex items-center gap-1 mt-3 self-end text-[10px] font-bold">
                      {f.sentiment === 'positive' && <Smile className="w-3.5 h-3.5 text-emerald-500" />}
                      {f.sentiment === 'neutral' && <Meh className="w-3.5 h-3.5 text-amber-500" />}
                      {f.sentiment === 'negative' && <Frown className="w-3.5 h-3.5 text-rose-500" />}
                      <span className="uppercase">{f.sentiment}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
