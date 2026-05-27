'use client';

import React, { useState, useEffect } from 'react';
import Image from "next/image";

// Rozhraní pro strukturu firmy
interface CompanyData {
  ico: string;
  obchodniNazev: string;
  pravniForma: string;
  datumVzniku: string;
  stavSubjektu: string;
  dic: string;
  adresaSidla: string;
  datumOvereni: string;
  zdrojDat: 'ARES API' | 'SQLite cache';

  souradnice?: `${string},${string}`;
}

// Pomocná funkce pro vyčištění textu pro porovnání názvů firem
function normalizeString(str: string): string {
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, '');
}

export default function CompanyForm() {
  const [ico, setIco] = useState('');
  const [userNazev, setUserNazev] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Stavy pro aktivně zobrazenou firmu
  const [activeData, setActiveData] = useState<CompanyData | null>(null);
  const [matchResult, setMatchResult] = useState<{ type: 'shoda' | 'caustecna' | 'neshoda'; text: string } | null>(null);

  // Stav pro seznam uložených firem
  const [savedCompanies, setSavedCompanies] = useState<CompanyData[]>([]);

  // Načtení uložených firem při startu aplikace
  useEffect(() => {
    const localData = localStorage.getItem('firmacheck_saved_companies');
    if (localData) {
      try {
        setSavedCompanies(JSON.parse(localData));
      } catch (e) {
        console.error('Chyba při načítání uložených firem:', e);
      }
    }
  }, []);

  // Pomocné funkce simulující SQLite Cache operace v prohlížeči (IndexedDB princip)
  const getCachedCompany = (searchIco: string): CompanyData | null => {
    const cache = localStorage.getItem(`firmacheck_cache_${searchIco}`);
    if (cache) {
      try {
        const parsed = JSON.parse(cache);
        return { ...parsed, zdrojDat: 'SQLite cache' };
      } catch (e) {
        return null;
      }
    }
    return null;
  };

  const saveToCache = (searchIco: string, data: Omit<CompanyData, 'zdrojDat'>) => {
    localStorage.setItem(`firmacheck_cache_${searchIco}`, JSON.stringify(data));
  };



  // Hlavní funkce pro ověření firmy
  const handleVerify = async (e: React.FormEvent | null, targetIco?: string) => {
    if (e) e.preventDefault();

    const icoToSearch = targetIco || ico.trim();

    setLoading(true);
    setError(null);
    setActiveData(null);
    setMatchResult(null);

    if (!/^\d{8}$/.test(icoToSearch)) {
      setError('IČO musí obsahovat přesně 8 číslic.');
      setLoading(false);
      return;
    }

    if (!targetIco) {
      setIco(icoToSearch);
    }

    // 1. Krok: Pokus o načtení ze SQLite Cache v prohlížeči
    const cachedData = getCachedCompany(icoToSearch);

    if (cachedData) {
      setActiveData(cachedData);
      evaluateNameMatch(userNazev, cachedData.obchodniNazev);
      setLoading(false);
      return;
    }


    // 2. Krok: Local-First přímé volání ARES API z prohlížeče (obchází cloudový Geo-blocking Vercelu)
    // 2. Krok: Bezpečné volání přes naši Next.js API Proxy (řeší CORS i cloud certifikáty)
    try {
      const res = await fetch(`/api/ares?ico=${icoToSearch}`);

      if (res.status === 404) {
        throw new Error('Firma s tímto IČO nebyla v registru ARES nalezena.');
      }

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error || 'Chyba při komunikaci s ARES API registrem.');
      }

      const result = await res.json();

      const newCompany: CompanyData = {
        ico: result.ico,
        obchodniNazev: result.obchodniNazev,
        pravniForma: result.pravniForma,
        datumVzniku: result.datumVzniku,
        stavSubjektu: result.stavSubjektu,
        dic: result.dic,
        adresaSidla: result.adresaSidla,
        datumOvereni: new Date().toLocaleString('cs-CZ'),
        zdrojDat: 'ARES API'
      };

      // Uložení do klientské cache
      saveToCache(result.ico, {
        ico: newCompany.ico,
        obchodniNazev: newCompany.obchodniNazev,
        pravniForma: newCompany.pravniForma,
        datumVzniku: newCompany.datumVzniku,
        stavSubjektu: newCompany.stavSubjektu,
        dic: newCompany.dic,
        adresaSidla: newCompany.adresaSidla,
        datumOvereni: newCompany.datumOvereni
      });

      setActiveData(newCompany);
      evaluateNameMatch(userNazev, newCompany.obchodniNazev);

    } catch (err: any) {
      setError(err.message || 'Nepodařilo se ověřit firmu.');
    } finally {
      setLoading(false);
    }


  };

  // Vyhodnocení shody názvu firmy
  function evaluateNameMatch(userInput: string, aresName: string) {
    if (!userInput.trim()) return;

    const normUser = normalizeString(userInput);
    const normAres = normalizeString(aresName);

    if (normUser === normAres) {
      setMatchResult({
        type: 'shoda',
        text: `✅ Zadaný název „${userInput}“ přesně odpovídá firmě „${aresName}“.`
      });
    } else if (normAres.includes(normUser) || normUser.includes(normAres)) {
      setMatchResult({
        type: 'caustecna',
        text: `⚠️ Zadaný název „${userInput}“ částečně odpovídá firmě „${aresName}“.`
      });
    } else {
      setMatchResult({
        type: 'neshoda',
        text: `❌ Zadaný název se liší od názvu uvedeného v ARES („${aresName}“).`
      });
    }
  };

  // Uložení firmy do permanentního seznamu
  const handleSaveCompany = () => {
    if (!activeData) return;

    if (savedCompanies.some(c => c.ico === activeData.ico)) {
      alert('Tato firma již je ve vašem seznamu uložena.');
      return;
    }

    const updatedList = [activeData, ...savedCompanies];
    setSavedCompanies(updatedList);
    localStorage.setItem('firmacheck_saved_companies', JSON.stringify(updatedList));
  };

  // Odstranění firmy ze seznamu
  const handleRemoveCompany = (icoToRemove: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updatedList = savedCompanies.filter(c => c.ico !== icoToRemove);
    setSavedCompanies(updatedList);
    localStorage.setItem('firmacheck_saved_companies', JSON.stringify(updatedList));
  };

  // Export seznamu uložených firem do CSV souboru
  const exportToCSV = () => {
    if (savedCompanies.length === 0) return;

    const headers = ['ICO', 'Obchodni nazev', 'Pravni forma', 'Stav subjektu', 'Adresa sidla', 'Datum vzniku', 'Datum posledniho overeni', 'Zdroj posledniho nacteni'];

    const rows = savedCompanies.map(c => [
      `"${c.ico}"`,
      `"${c.obchodniNazev.replace(/"/g, '""')}"`,
      `"${c.pravniForma}"`,
      `"${c.stavSubjektu}"`,
      `"${c.adresaSidla.replace(/"/g, '""')}"`,
      `"${c.datumVzniku}"`,
      `"${c.datumOvereni}"`,
      `"${c.zdrojDat}"`
    ]);

    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');

    link.setAttribute('href', url);
    link.setAttribute('download', `firmacheck_export_${new Date().toISOString().slice(0, 10)}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Bonus: Kopírování celého JSON listu do schránky
  const copyJSONToClipboard = () => {
    if (savedCompanies.length === 0) return;
    const jsonString = JSON.stringify(savedCompanies, null, 2);
    navigator.clipboard.writeText(jsonString)
      .then(() => alert('Seznam firem byl zkopírován v JSON formátu do vaší schránky!'))
      .catch(() => alert('Kopírování se nezdařilo.'));
  };

  return (
    <div className="space-y-10 max-w-4xl mx-auto text-black">
      {/* 1. SEKCE: Vyhledávací formulář */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200">
        <form onSubmit={(e) => handleVerify(e)} className="grid grid-cols-1 md:grid-cols-2 gap-4 items-end">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">IČO firmy *</label>
            <input
              type="text"
              maxLength={8}
              value={ico}
              onChange={(e) => setIco(e.target.value.replace(/\D/g, ''))}
              placeholder="Např. 02823519"
              className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition bg-white text-black"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Název firmy pro kontrolu (volitelný)</label>
            <input
              type="text"
              value={userNazev}
              onChange={(e) => setUserNazev(e.target.value)}
              placeholder="Např. ideabox"
              className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition bg-white text-black"
            />
          </div>

          {!activeData && !loading && (
            <div className="flex flex-col items-center justify-center py-10 text-center">

              <Image
                src="/ai-illustration.png"
                alt="Ověření firmy"
                width={300}
                height={200}
              />

              <h2 className="mt-4 text-lg font-semibold text-gray-700">
                Zadej IČO firmy pro ověření
              </h2>

              <p className="text-sm text-gray-500">
                Data se načtou z ARES a zobrazí se detail firmy
              </p>

            </div>
          )}

          <div className="md:col-span-2">
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-zinc-900 hover:bg-zinc-800 text-white font-bold py-3 px-4 rounded-xl transition disabled:bg-zinc-400 cursor-pointer shadow-sm"
            >
              {loading ? 'Ověřuji v databázi...' : 'Ověřit firmu'}
            </button>
          </div>
        </form>

        {error && (
          <div className="mt-4 p-4 bg-red-50 border border-red-200 text-red-700 rounded-xl text-sm font-semibold">
            🛑 {error}
          </div>
        )}
      </div>

      {/* 2. SEKCE: Výsledný detail ověřené firmy */}
      {activeData && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-fadeIn">
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200 space-y-4 flex flex-col justify-between">
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold ${activeData.zdrojDat === 'ARES API' ? 'bg-blue-100 text-blue-800' : 'bg-purple-100 text-purple-800'
                  }`}>
                  ⚙️ Stav: {activeData.zdrojDat}
                </span>

                <button
                  onClick={handleSaveCompany}
                  disabled={savedCompanies.some(c => c.ico === activeData.ico)}
                  className="px-3 py-1 bg-green-600 hover:bg-green-700 disabled:bg-gray-200 disabled:text-gray-400 disabled:cursor-not-allowed text-white text-xs font-bold rounded-lg transition cursor-pointer"
                >
                  {savedCompanies.some(c => c.ico === activeData.ico) ? '✓ Uloženo' : '💾 Uložit firmu'}
                </button>
              </div>

              <h2 className="text-xl font-extrabold text-gray-900">{activeData.obchodniNazev}</h2>

              {matchResult && (
                <div className={`p-3 rounded-xl text-sm font-medium ${matchResult.type === 'shoda' ? 'bg-green-50 text-green-800 border border-green-200' :
                  matchResult.type === 'caustecna' ? 'bg-amber-50 text-amber-800 border border-amber-200' :
                    'bg-red-50 text-red-800 border border-red-200'
                  }`}>
                  {matchResult.text}
                </div>
              )}

              <div className="border-t border-gray-100 pt-3 space-y-2 text-sm">
                <div className="flex justify-between py-0.5"><span className="text-gray-500">IČO:</span><span className="font-bold text-gray-800">{activeData.ico}</span></div>
                <div className="flex justify-between py-0.5"><span className="text-gray-500">DIČ:</span><span className="font-bold text-gray-800">{activeData.dic}</span></div>
                <div className="flex justify-between py-0.5"><span className="text-gray-500">Právní forma:</span><span className="font-bold text-gray-800 text-right truncate max-w-[200px]">{activeData.pravniForma}</span></div>
                <div className="flex justify-between py-0.5"><span className="text-gray-500">Datum vzniku:</span><span className="font-bold text-gray-800">{activeData.datumVzniku !== 'Nedostupné' ? new Date(activeData.datumVzniku).toLocaleDateString('cs-CZ') : 'Nedostupné'}</span></div>
                <div className="flex justify-between py-0.5"><span className="text-gray-500">Stav subjektu:</span><span className="font-bold text-gray-800">{activeData.stavSubjektu}</span></div>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-gray-100 flex flex-col">
              <span className="text-xs text-gray-400">📍 Sídlo firmy:</span>
              <span className="text-sm font-bold text-gray-800">{activeData.adresaSidla}</span>
            </div>
          </div>

          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200 flex flex-col h-full">
            <h3 className="text-sm font-bold text-gray-900 mb-2">
              🗺️ Geocoding lokace sídla
            </h3>

            {/* MAP AREA (Mapy.com iframe NEFUNGUJE → nahrazujeme placeholderem) */}
            <div className="w-full flex-grow h-60 rounded-xl overflow-hidden border border-gray-200 bg-gray-50 flex flex-col items-center justify-center text-center px-4">

              <p className="text-sm text-gray-500 mb-2">
                Náhled mapy není dostupný (Mapy.com nepodporují embed).
              </p>

              <p className="text-xs text-gray-400">
                📍 {activeData.adresaSidla}
              </p>

              {activeData?.souradnice ? (
                <p className="text-xs text-gray-400 mt-1">
                  📍 {activeData.souradnice}
                </p>
              ) : (
                <p className="text-xs text-gray-300 mt-1">
                  📍 Souřadnice nejsou dostupné
                </p>
              )}
            </div>

            {/* LINKS */}
            <div className="mt-2 flex justify-between">

              <a
                href={`https://mapy.com/zakladni?q=${encodeURIComponent(activeData.adresaSidla)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs font-bold text-blue-600 hover:text-blue-800"
              >
                Otevřít v Mapy.com ↗
              </a>

              <a
                href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(activeData.adresaSidla)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs font-bold text-gray-600 hover:text-gray-900"
              >
                Google Maps ↗
              </a>

            </div>
          </div>
        </div>
      )}

      {/* 3. SEKCE: Seznam uložených firem a Export */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200 space-y-6">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center border-b border-gray-100 pb-4 gap-4">
          <div>
            <h3 className="text-lg font-extrabold text-gray-900">📂 Seznam uložených firem ({savedCompanies.length})</h3>
            <p className="text-xs text-gray-500">Data jsou trvale uložena ve vaší lokální databázi.</p>
          </div>

          {savedCompanies.length > 0 && (
            <div className="flex gap-2">
              <button
                onClick={exportToCSV}
                className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg transition cursor-pointer"
              >
                📊 Export CSV
              </button>
              <button
                onClick={copyJSONToClipboard}
                className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-white text-xs font-bold rounded-lg transition cursor-pointer"
              >
                📋 Kopírovat JSON
              </button>
            </div>
          )}
        </div>

        {savedCompanies.length === 0 ? (
          <div className="text-center py-8 text-gray-400 text-sm">
            📭 V seznamu zatím nejsou žádné uložené firmy. Prověřte firmu výše a klikněte na "Uložit firmu".
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {savedCompanies.map((company) => (
              <div
                key={company.ico}
                onClick={() => handleVerify(null, company.ico)}
                className="p-4 bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-xl transition cursor-pointer flex justify-between items-start group"
              >
                <div className="space-y-1 max-w-[85%]">
                  <h4 className="font-bold text-gray-900 text-sm truncate">{company.obchodniNazev}</h4>
                  <p className="text-xs text-gray-600 font-medium">IČO: {company.ico}</p>
                  <p className="text-xs text-gray-500 truncate">{company.adresaSidla}</p>
                  <p className="text-[10px] text-gray-400">Ověřeno: {company.datumOvereni}</p>
                </div>

                <button
                  onClick={(e) => handleRemoveCompany(company.ico, e)}
                  className="text-gray-400 hover:text-red-600 text-sm font-bold p-1 transition cursor-pointer"
                  title="Odebrat firmu"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
