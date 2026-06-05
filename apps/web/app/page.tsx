import Link from 'next/link';

export default function Home() {
  return (
    <main className="min-h-screen bg-white text-slate">
      {/* Navbar */}
      <nav className="w-full px-8 py-4 flex justify-between items-center border-b border-gray-100">
        <div className="text-2xl font-bold text-primary">
          Masjid<span className="text-accent">Link</span>
        </div>
        <div className="flex gap-6 items-center">
          <Link href="/masjid" className="text-slate hover:text-primary transition-colors">Direktori Masjid</Link>
          <Link href="/program" className="text-slate hover:text-primary transition-colors">Program Kebaikan</Link>
          <div className="w-px h-6 bg-gray-200"></div>
          <Link href="/login" className="px-5 py-2 bg-primary text-white rounded-full hover:bg-primary-dark transition-all shadow-sm">
            Masuk
          </Link>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="max-w-6xl mx-auto px-8 py-24 text-center flex flex-col items-center">
        <h1 className="text-5xl md:text-6xl font-extrabold text-slate-dark tracking-tight leading-tight mb-6 max-w-4xl">
          Satu Platform, <br />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-accent">Berjuta Kebaikan</span>
        </h1>
        <p className="text-xl text-slate-light mb-10 max-w-2xl">
          Kelola operasional masjid secara transparan, profesional, dan mudahkan jamaah untuk berdonasi dalam satu ekosistem digital terpadu.
        </p>
        
        {/* Search Bar */}
        <div className="w-full max-w-2xl bg-white rounded-full shadow-lg border border-gray-100 p-2 flex items-center">
          <input 
            type="text" 
            placeholder="Cari masjid atau program donasi..." 
            className="flex-1 px-6 py-3 outline-none text-slate-dark bg-transparent"
          />
          <button className="px-8 py-3 bg-accent text-white font-semibold rounded-full hover:bg-accent-dark transition-all">
            Cari
          </button>
        </div>
      </section>

      {/* Features / Quick Access */}
      <section className="bg-gray-50 py-20">
        <div className="max-w-6xl mx-auto px-8 grid grid-cols-1 md:grid-cols-3 gap-8">
          {[
            { title: "Transparansi Dana (PSAK 409)", desc: "Laporan keuangan syariah terstandarisasi, aman, dan dapat diakses jamaah secara real-time." },
            { title: "Donasi Tanpa Potongan", desc: "Sistem transfer unik manual memastikan 100% donasi Anda sampai ke masjid tujuan tanpa potongan gateway." },
            { title: "Multi-Role Dashboard", desc: "Akses khusus untuk Jama'ah dan Pengurus dengan isolasi data yang aman menggunakan teknologi terkini." }
          ].map((feature, i) => (
            <div key={i} className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
              <div className="w-12 h-12 bg-primary/10 rounded-2xl mb-6 flex items-center justify-center">
                <div className="w-6 h-6 bg-primary rounded-full opacity-80"></div>
              </div>
              <h3 className="text-xl font-bold text-slate-dark mb-3">{feature.title}</h3>
              <p className="text-slate-light leading-relaxed">{feature.desc}</p>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
