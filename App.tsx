import React, { useState, useEffect } from 'react';
import { ContentType, ContentIdea, AudienceKeyword, TrendingKeyword } from './types';
import { generateContentIdeas, generateKeywordsFromAudience, generateTrendingKeywords } from './services/geminiService';
import { ResultsView } from './components/ResultsView';
import { SparklesIcon, LoaderIcon, UsersIcon, TargetIcon, ArrowRightIcon, TrendingUpIcon, MapPinIcon, CheckCircleIcon, KeyIcon } from './components/Icons';

type InputMode = 'keyword' | 'audience' | 'trend';

// Extend window for AI Studio
declare global {
  interface Window {
    aistudio: {
      hasSelectedApiKey: () => Promise<boolean>;
      openSelectKey: () => Promise<void>;
    };
  }
}

function App() {
  const [keyword, setKeyword] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [activeTab, setActiveTab] = useState<ContentType>(ContentType.COURSE);
  const [inputMode, setInputMode] = useState<InputMode>('keyword');
  const [results, setResults] = useState<Record<string, ContentIdea[]>>({});
  const [audienceKeywords, setAudienceKeywords] = useState<AudienceKeyword[]>([]);
  const [trendingKeywords, setTrendingKeywords] = useState<TrendingKeyword[]>([]);
  const [hasKey, setHasKey] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const checkKey = async () => {
      // Check multiple sources for the API key
      const envKey = 
        (import.meta.env && import.meta.env.VITE_GEMINI_API_KEY) ||
        (process.env.GEMINI_API_KEY) || 
        (process.env.API_KEY);

      if (envKey && envKey !== 'undefined' && envKey !== '') {
        setHasKey(true);
        return;
      }

      if (window.aistudio) {
        const selected = await window.aistudio.hasSelectedApiKey();
        setHasKey(selected);
      } else {
        setHasKey(false);
      }
    };
    checkKey();
  }, []);

  const handleOpenKeySelector = async () => {
    if (window.aistudio) {
      await window.aistudio.openSelectKey();
      setHasKey(true);
      setError(null);
    }
  };

  const handleSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!keyword.trim()) return;
    
    setIsGenerating(true);
    setError(null);
    
    if (inputMode === 'audience') {
      try {
        const generatedKeywords = await generateKeywordsFromAudience(keyword);
        setAudienceKeywords(generatedKeywords);
        setTrendingKeywords([]); 
        setResults({});
      } catch (err: any) { 
        if (err.message === "QUOTA_EXCEEDED") {
          setError("API Quota Exceeded. Please check your billing or try again later.");
        } else {
          console.error(err);
          setError("An unexpected error occurred. Please try again.");
        }
      } finally { 
        setIsGenerating(false); 
      }
      return;
    }
    
    if (inputMode === 'trend') {
      try {
        const generatedTrends = await generateTrendingKeywords(keyword);
        setTrendingKeywords(generatedTrends);
        setAudienceKeywords([]); 
        setResults({});
      } catch (err: any) { 
        if (err.message === "QUOTA_EXCEEDED") {
          setError("API Quota Exceeded. Please check your billing or try again later.");
        } else {
          console.error(err);
          setError("An unexpected error occurred. Please try again.");
        }
      } finally { 
        setIsGenerating(false); 
      }
      return;
    }

    // Default Keyword Mode
    setResults({}); 
    setAudienceKeywords([]); 
    setTrendingKeywords([]);
    try {
      const ideas = await generateContentIdeas(keyword, activeTab);
      setResults(prev => ({ ...prev, [activeTab]: ideas }));
    } catch (err: any) { 
      if (err.message === "QUOTA_EXCEEDED") {
        setError("API Quota Exceeded. Please check your billing or try again later.");
      } else {
        console.error(err);
        setError("An unexpected error occurred. Please try again.");
      }
    } finally { 
      setIsGenerating(false); 
    }
  };

  const handleKeywordSelect = (selectedKeyword: string) => {
    setKeyword(selectedKeyword);
    setInputMode('keyword');
    setAudienceKeywords([]);
    setTrendingKeywords([]);
    setError(null);
    
    // Use a small timeout to ensure state transitions before triggering new search
    setTimeout(() => {
      setIsGenerating(true);
      setResults({});
      generateContentIdeas(selectedKeyword, activeTab)
        .then(ideas => setResults(prev => ({ ...prev, [activeTab]: ideas })))
        .catch(err => {
          if (err.message === "QUOTA_EXCEEDED") {
            setError("API Quota Exceeded. Please check your billing or try again later.");
          } else {
            console.error(err);
            setError("An unexpected error occurred. Please try again.");
          }
        })
        .finally(() => setIsGenerating(false));
    }, 50);
  };

  const switchTab = async (type: ContentType) => {
    setActiveTab(type);
    if (keyword && !results[type] && !isGenerating && inputMode === 'keyword') {
      setIsGenerating(true);
      setError(null);
      try {
        const ideas = await generateContentIdeas(keyword, type);
        setResults(prev => ({ ...prev, [type]: ideas }));
      } catch (err: any) { 
        if (err.message === "QUOTA_EXCEEDED") {
          setError("API Quota Exceeded. Please check your billing or try again later.");
        } else {
          console.error(err);
          setError("An unexpected error occurred. Please try again.");
        }
      } finally { 
        setIsGenerating(false); 
      }
    }
  };

  const hasResults = Object.keys(results).length > 0;
  const hasAudienceKeywords = audienceKeywords.length > 0;
  const hasTrendingKeywords = trendingKeywords.length > 0;

  return (
    <div className="min-h-screen bg-[#0f172a] text-slate-100 flex flex-col">
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-purple-900/20 rounded-full blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-cyan-900/20 rounded-full blur-[120px]" />
      </div>

      <div className="relative z-10 container mx-auto px-4 lg:px-8 max-w-7xl flex-1 flex flex-col">
        <header className="py-8 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-lg flex items-center justify-center shadow-lg shadow-cyan-500/20">
              <SparklesIcon className="text-white w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-white">EmpireArchitect</h1>
              <p className="text-xs text-slate-400 font-medium tracking-wider uppercase">AI Publishing Engine</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            {!hasKey && (
              <button 
                onClick={handleOpenKeySelector}
                className="flex items-center gap-2 px-3 py-1.5 bg-amber-500/10 border border-amber-500/30 text-amber-400 rounded-lg text-xs font-bold hover:bg-amber-500/20 transition-all animate-pulse"
              >
                <KeyIcon className="w-3 h-3" />
                <span>Fix API Key</span>
              </button>
            )}
            <div className="hidden md:block">
              <span className="text-sm text-slate-500 border border-slate-800 px-3 py-1 rounded-full bg-slate-900/50">v1.6.0 • Deep Analysis Enabled</span>
            </div>
          </div>
        </header>

        <div className={`transition-all duration-500 ease-in-out flex flex-col items-center justify-center ${hasResults || hasAudienceKeywords || hasTrendingKeywords ? 'py-8' : 'flex-1 py-20'}`}>
          <div className="flex flex-wrap justify-center gap-2 sm:gap-4 mb-6 bg-slate-800/50 p-1 rounded-xl border border-white/5 backdrop-blur-sm">
            <button 
              onClick={() => { setInputMode('keyword'); setKeyword(''); setAudienceKeywords([]); setTrendingKeywords([]); setResults({}); }} 
              className={`flex items-center gap-2 px-4 sm:px-6 py-2 rounded-lg text-sm font-medium transition-all ${inputMode === 'keyword' ? 'bg-cyan-600 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}
            >
              <TargetIcon className="w-4 h-4" /><span>Keyword Mode</span>
            </button>
            <button 
              onClick={() => { setInputMode('audience'); setKeyword(''); setAudienceKeywords([]); setTrendingKeywords([]); setResults({}); }} 
              className={`flex items-center gap-2 px-4 sm:px-6 py-2 rounded-lg text-sm font-medium transition-all ${inputMode === 'audience' ? 'bg-purple-600 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}
            >
              <UsersIcon className="w-4 h-4" /><span>Audience Mode</span>
            </button>
            <button 
              onClick={() => { setInputMode('trend'); setKeyword(''); setAudienceKeywords([]); setTrendingKeywords([]); setResults({}); }} 
              className={`flex items-center gap-2 px-4 sm:px-6 py-2 rounded-lg text-sm font-medium transition-all ${inputMode === 'trend' ? 'bg-pink-600 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}
            >
              <TrendingUpIcon className="w-4 h-4" /><span>Trend Mode</span>
            </button>
          </div>

          <form onSubmit={handleSearch} className="w-full max-w-3xl relative group px-4">
            <div className={`absolute top-0 bottom-0 left-4 right-4 bg-gradient-to-r rounded-2xl blur opacity-25 group-hover:opacity-50 transition duration-1000 ${inputMode === 'audience' ? 'from-purple-500 to-pink-600' : inputMode === 'trend' ? 'from-pink-500 to-orange-600' : 'from-cyan-500 to-purple-600'}`} />
            <div className="relative flex items-center">
              <input 
                type="text" 
                value={keyword} 
                onChange={(e) => setKeyword(e.target.value)} 
                placeholder={inputMode === 'audience' ? "E.g., 'Overwhelmed Single Moms'" : inputMode === 'trend' ? "E.g., 'United States' or 'Tech Industry'" : "Enter a keyword (e.g., 'SaaS Sales')"} 
                className="w-full bg-slate-900 border border-slate-700 text-white text-lg px-6 py-5 rounded-xl shadow-2xl focus:outline-none focus:ring-2 focus:ring-cyan-500/50" 
              />
              <button 
                type="submit" 
                disabled={isGenerating || !keyword} 
                className={`absolute right-3 top-3 bottom-3 text-white px-6 rounded-lg font-semibold transition-all shadow-lg flex items-center gap-2 ${inputMode === 'audience' ? 'bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500' : inputMode === 'trend' ? 'bg-gradient-to-r from-pink-600 to-orange-600 hover:from-pink-500 hover:to-orange-500' : 'bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500'}`}
              >
                {isGenerating ? <LoaderIcon className="animate-spin w-5 h-5" /> : <span>Ignite</span>}
              </button>
            </div>
          </form>

          {error && (
            <div className="w-full max-w-3xl mt-6 px-4 animate-in fade-in slide-in-from-top-4 duration-500">
              <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 flex items-center gap-4 text-red-400">
                <div className="w-10 h-10 rounded-full bg-red-500/20 flex items-center justify-center shrink-0">
                  <KeyIcon className="w-5 h-5" />
                </div>
                <div className="flex-1">
                  <p className="font-bold text-sm">Action Required</p>
                  <p className="text-xs opacity-80">{error}</p>
                </div>
                <button 
                  onClick={handleOpenKeySelector}
                  className="px-4 py-2 bg-red-500/20 hover:bg-red-500/30 rounded-lg text-xs font-bold transition-all whitespace-nowrap"
                >
                  Update Key
                </button>
              </div>
            </div>
          )}
        </div>

        <main className="flex-1">
          {isGenerating && !hasResults && !hasAudienceKeywords && !hasTrendingKeywords && (
            <div className="flex flex-col items-center justify-center py-20 text-slate-500">
              <LoaderIcon className="w-12 h-12 animate-spin mb-4 text-cyan-500" />
              <p className="text-xl font-light tracking-wide animate-pulse">
                {inputMode === 'audience' ? 'Decoding Audience Psychology...' : inputMode === 'trend' ? 'Scanning Market Trends...' : 'Architecting Content Empire...'}
              </p>
            </div>
          )}

          {/* Audience Mode Results */}
          {hasAudienceKeywords && (
            <div className="animate-in fade-in slide-in-from-bottom-10 duration-700 pb-20">
              <h2 className="text-2xl font-bold text-white mb-8 flex items-center gap-3">
                <UsersIcon className="text-purple-400 w-8 h-8" />
                Target Audience Pain Points
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {audienceKeywords.map((item, idx) => (
                  <button 
                    key={idx} 
                    onClick={() => handleKeywordSelect(item.keyword)}
                    className="glass-panel text-left p-6 rounded-xl hover:scale-[1.02] transition-all border-l-4 border-purple-500 group shadow-xl hover:shadow-purple-500/20"
                  >
                    <h3 className="text-xl font-bold text-white mb-3 group-hover:text-purple-300 transition-colors">{item.keyword}</h3>
                    <p className="text-slate-400 text-sm mb-4 leading-relaxed">{item.painPoint}</p>
                    <div className="flex items-center gap-2 text-purple-400 text-xs font-bold tracking-widest uppercase mt-auto">
                      <span>Build Strategy</span>
                      <ArrowRightIcon className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Trend Mode Results */}
          {hasTrendingKeywords && (
            <div className="animate-in fade-in slide-in-from-bottom-10 duration-700 pb-20">
              <h2 className="text-2xl font-bold text-white mb-8 flex items-center gap-3">
                <TrendingUpIcon className="text-pink-400 w-8 h-8" />
                Emerging Market Opportunities
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {trendingKeywords.map((trend, idx) => (
                  <button 
                    key={idx} 
                    onClick={() => handleKeywordSelect(trend.keyword)}
                    className="glass-panel text-left p-6 rounded-xl hover:scale-[1.02] transition-all border-l-4 border-pink-500 group shadow-xl hover:shadow-pink-500/20"
                  >
                    <div className="flex justify-between items-start mb-2">
                      <span className="bg-pink-500/10 text-pink-400 text-[10px] px-2 py-0.5 rounded font-bold uppercase tracking-wider border border-pink-500/20">{trend.category}</span>
                    </div>
                    <h3 className="text-xl font-bold text-white mb-3 group-hover:text-pink-300 transition-colors">{trend.keyword}</h3>
                    <p className="text-slate-400 text-sm mb-4 leading-relaxed">{trend.searchVolumeContext}</p>
                    <div className="flex items-center gap-2 text-pink-400 text-xs font-bold tracking-widest uppercase mt-auto">
                      <span>Capitalize Now</span>
                      <ArrowRightIcon className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Keyword Mode Content Tabs */}
          {hasResults && (
            <div className="animate-in fade-in slide-in-from-bottom-10 duration-700">
              <div className="flex flex-wrap gap-2 mb-8 justify-center md:justify-start sticky top-4 z-30 py-3 px-4 bg-slate-900/80 backdrop-blur-xl border border-white/5 shadow-2xl rounded-2xl overflow-x-auto">
                {Object.values(ContentType).map((type) => (
                  <button
                    key={type}
                    onClick={() => switchTab(type)}
                    className={`px-4 py-2 rounded-full text-sm font-medium transition-all duration-300 border flex shrink-0 items-center gap-2 ${
                      activeTab === type ? 'bg-cyan-500/10 border-cyan-500 text-cyan-400 shadow-[0_0_15px_rgba(6,182,212,0.3)]' : 'bg-slate-800/50 border-transparent text-slate-400 hover:bg-slate-800 hover:text-white'
                    }`}
                  >
                    {type}
                    {(type === ContentType.CREW_AI || type === ContentType.AI_AGENT) && (
                      <span className="bg-gradient-to-r from-amber-400 to-orange-500 text-[10px] text-white px-1.5 py-0.5 rounded-full font-bold animate-pulse">PRO</span>
                    )}
                  </button>
                ))}
              </div>
              
              <div className="flex-1">
                {isGenerating && !results[activeTab] ? (
                  <div className="flex flex-col items-center justify-center py-20 text-slate-500">
                    <LoaderIcon className="w-12 h-12 animate-spin mb-4 text-cyan-500" />
                    <p className="text-xl font-light">Assembling High-Value Strategies...</p>
                  </div>
                ) : (
                  results[activeTab] && <ResultsView ideas={results[activeTab]} contentType={activeTab} />
                )}
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

export default App;