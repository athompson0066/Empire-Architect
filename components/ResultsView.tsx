import React, { useState } from 'react';
import { ContentIdea, ContentType, DetailedOutline } from '../types';
import { generateDetailedOutline, generateExpertPrompt } from '../services/geminiService';
import { TargetIcon, DollarSignIcon, ArrowRightIcon, LoaderIcon, CheckCircleIcon, XIcon, BookOpenIcon, GlobeIcon, ExternalLinkIcon, RocketIcon, CodeIcon, MicIcon, HeadphonesIcon, SmartphoneIcon, ListIcon, DownloadIcon, BotIcon, CpuIcon, CopyIcon, TerminalIcon } from './Icons';

interface ResultsViewProps {
  ideas: ContentIdea[];
  contentType: ContentType;
}

export const ResultsView: React.FC<ResultsViewProps> = ({ ideas, contentType }) => {
  const [selectedIdea, setSelectedIdea] = useState<ContentIdea | null>(null);
  const [outline, setOutline] = useState<DetailedOutline | null>(null);
  const [loadingOutline, setLoadingOutline] = useState(false);
  
  const [activePromptIdea, setActivePromptIdea] = useState<ContentIdea | null>(null);
  const [generatedPrompt, setGeneratedPrompt] = useState<string | null>(null);
  const [loadingPrompt, setLoadingPrompt] = useState(false);
  const [promptCopied, setPromptCopied] = useState(false);

  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  
  const isTopWebsites = contentType === ContentType.TOP_WEBSITES;
  const isWebApp = contentType === ContentType.WEB_APP;
  const isMobileApp = contentType === ContentType.MOBILE_APP;
  const isPodcast = contentType === ContentType.PODCAST;
  const isListicle = contentType === ContentType.LISTICLE;
  const isAgent = contentType === ContentType.AI_AGENT;
  const isCrew = contentType === ContentType.CREW_AI;
  const isAdSnippet = contentType === ContentType.AD_SNIPPETS;

  const handleGenerateOutline = async (idea: ContentIdea) => {
    setSelectedIdea(idea);
    setLoadingOutline(true);
    setOutline(null);
    try {
      const result = await generateDetailedOutline(idea, contentType);
      setOutline(result);
    } catch (error) {
      console.error(error);
    } finally {
      setLoadingOutline(false);
    }
  };

  const handleCreatePrompt = async (idea: ContentIdea) => {
    setActivePromptIdea(idea);
    setLoadingPrompt(true);
    setGeneratedPrompt(null);
    setPromptCopied(false);
    try {
      const promptText = await generateExpertPrompt(idea, contentType);
      setGeneratedPrompt(promptText);
    } catch (error) {
      console.error(error);
    } finally {
      setLoadingPrompt(false);
    }
  };

  const handleCopyPrompt = () => {
    if (generatedPrompt) {
      navigator.clipboard.writeText(generatedPrompt);
      setPromptCopied(true);
      setTimeout(() => setPromptCopied(false), 2000);
    }
  };

  const handleCopy = (idea: ContentIdea, index: number) => {
    const text = `${idea.title}\n${idea.subtitle || ''}\n\n${idea.description}`;
    navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const closeOutline = () => {
    setSelectedIdea(null);
    setOutline(null);
  };

  const closePromptCreator = () => {
    setActivePromptIdea(null);
    setGeneratedPrompt(null);
  };

  const handleExport = () => {
    if (!ideas || ideas.length === 0) return;
    const headers = ['Title', 'Subtitle', 'Description', 'Target Audience', 'Pain Point / Source', 'Monetization / Context', 'URL'];
    const csvContent = ideas.map(idea => {
      const row = [idea.title, idea.subtitle || '', idea.description, idea.targetAudience, idea.painPointSolved, idea.monetizationAngle || '', idea.url || ''].map(field => {
        const stringField = String(field || '');
        return `"${stringField.replace(/"/g, '""')}"`;
      });
      return row.join(',');
    });
    const csvString = [headers.join(','), ...csvContent].join('\n');
    const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `${contentType.replace(/\s+/g, '_')}_Report.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getCardGradient = () => {
    if (isTopWebsites) return 'from-emerald-400 to-blue-600';
    if (isWebApp) return 'from-orange-400 to-pink-600';
    if (isMobileApp) return 'from-indigo-400 to-blue-600';
    if (isPodcast) return 'from-violet-500 to-fuchsia-500';
    if (isListicle) return 'from-lime-400 to-green-600';
    if (isAgent) return 'from-rose-400 to-red-600';
    if (isCrew) return 'from-amber-400 to-orange-600';
    if (isAdSnippet) return 'from-fuchsia-500 to-rose-600';
    return 'from-cyan-400 to-purple-600';
  };

  const getHoverText = () => {
    if (isTopWebsites) return 'group-hover:text-emerald-300';
    if (isWebApp) return 'group-hover:text-orange-300';
    if (isMobileApp) return 'group-hover:text-indigo-300';
    if (isPodcast) return 'group-hover:text-violet-300';
    if (isListicle) return 'group-hover:text-lime-300';
    if (isAgent) return 'group-hover:text-rose-300';
    if (isCrew) return 'group-hover:text-amber-300';
    if (isAdSnippet) return 'group-hover:text-fuchsia-300';
    return 'group-hover:text-cyan-300';
  };

  const getButtonLabel = () => {
    if (isTopWebsites) return 'Visit Website';
    if (isWebApp) return 'Draft Product Spec';
    if (isMobileApp) return 'Draft App Flow';
    if (isPodcast) return 'Draft Episode Plan';
    if (isListicle) return 'Draft Listicle';
    if (isAgent) return 'Draft Agent Persona';
    if (isCrew) return 'Draft Crew Logic';
    if (isAdSnippet) return 'Copy Ad Copy';
    return 'Draft Outline';
  };

  const getButtonIcon = (index?: number) => {
    if (isAdSnippet) return copiedIndex === index ? <CheckCircleIcon className="w-4 h-4 text-emerald-400" /> : <CopyIcon className="w-4 h-4" />;
    if (isTopWebsites) return <ExternalLinkIcon className="w-4 h-4" />;
    if (isWebApp) return <CodeIcon className="w-4 h-4" />;
    if (isMobileApp) return <SmartphoneIcon className="w-4 h-4" />;
    if (isPodcast) return <MicIcon className="w-4 h-4" />;
    if (isListicle) return <ListIcon className="w-4 h-4" />;
    if (isAgent) return <BotIcon className="w-4 h-4" />;
    if (isCrew) return <CpuIcon className="w-4 h-4" />;
    return <ArrowRightIcon className="w-4 h-4" />;
  };

  const getButtonStyles = () => {
    if (isTopWebsites) return 'group-hover:from-emerald-600 group-hover:to-blue-600';
    if (isWebApp) return 'group-hover:from-orange-600 group-hover:to-pink-600';
    if (isMobileApp) return 'group-hover:from-indigo-600 group-hover:to-blue-600';
    if (isPodcast) return 'group-hover:from-violet-600 group-hover:to-fuchsia-600';
    if (isListicle) return 'group-hover:from-lime-600 group-hover:to-green-600';
    if (isAgent) return 'group-hover:from-rose-600 group-hover:to-red-600';
    if (isCrew) return 'group-hover:from-amber-600 group-hover:to-orange-600';
    if (isAdSnippet) return 'group-hover:from-fuchsia-600 group-hover:to-rose-600';
    return 'group-hover:from-cyan-600 group-hover:to-purple-600';
  };

  const getTagColor = () => {
    if (isTopWebsites) return 'text-emerald-400 border-emerald-500/30';
    if (isWebApp) return 'text-orange-400 border-orange-500/30';
    if (isMobileApp) return 'text-indigo-400 border-indigo-500/30';
    if (isPodcast) return 'text-violet-400 border-violet-500/30';
    if (isListicle) return 'text-lime-400 border-lime-500/30';
    if (isAgent) return 'text-rose-400 border-rose-500/30';
    if (isCrew) return 'text-amber-400 border-amber-500/30';
    if (isAdSnippet) return 'text-fuchsia-400 border-fuchsia-500/30';
    return 'text-cyan-400 border-cyan-500/30';
  };

  if (!ideas || ideas.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-slate-400 animate-in fade-in duration-500">
        <div className="w-16 h-16 bg-slate-800 rounded-full flex items-center justify-center mb-4">
          <GlobeIcon className="w-8 h-8 text-slate-500" />
        </div>
        <h3 className="text-xl font-semibold text-white mb-2">No Results Found</h3>
        <p className="max-w-md text-center text-slate-500">Try adjusting your keyword or switch to another content type.</p>
      </div>
    );
  }

  return (
    <>
      <div className="flex justify-between items-center mb-6">
         <h2 className="text-xl font-bold text-white tracking-tight">Generated Reports</h2>
         <button
          onClick={handleExport}
          className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-slate-800 to-slate-700 hover:from-emerald-900/50 hover:to-emerald-800/50 text-slate-200 hover:text-emerald-300 rounded-lg border border-slate-600 hover:border-emerald-500/50 transition-all text-sm font-semibold group shadow-lg"
        >
          <DownloadIcon className="w-4 h-4 group-hover:scale-110 transition-transform text-emerald-500" />
          <span>Export Report to CSV</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pb-20">
        {ideas.map((idea, index) => (
          <div key={index} className="glass-panel rounded-xl p-6 transition-all duration-300 hover:scale-[1.01] hover:shadow-2xl hover:shadow-purple-500/20 group relative overflow-hidden flex flex-col">
            <div className={`absolute top-0 left-0 w-1 h-full bg-gradient-to-b ${getCardGradient()} opacity-0 group-hover:opacity-100 transition-opacity`} />
            
            <div className="flex justify-between items-start mb-4">
              <span className={`text-xs font-semibold tracking-wider uppercase border px-2 py-1 rounded ${getTagColor()}`}>{contentType}</span>
              {isAdSnippet && (
                <span className="text-[10px] font-bold text-slate-500 bg-slate-800/50 px-2 py-0.5 rounded-full border border-white/5">
                  Words: {idea.description.split(' ').length} / 25
                </span>
              )}
            </div>

            {isAdSnippet ? (
              <div className="mb-6 flex-1">
                <h3 className="text-2xl font-black text-white mb-1 uppercase tracking-tight leading-none font-mono">
                  {idea.title}
                </h3>
                {idea.subtitle && (
                  <p className="text-fuchsia-400 font-bold text-sm mb-4 leading-snug">
                    {idea.subtitle}
                  </p>
                )}
                <p className="text-slate-300 text-base leading-relaxed italic border-l-2 border-slate-700 pl-4 py-1">
                  "{idea.description}"
                </p>
              </div>
            ) : (
              <>
                <h3 className={`text-xl font-bold text-white mb-3 leading-tight transition-colors ${getHoverText()}`}>{idea.title}</h3>
                <p className="text-slate-300 text-sm mb-6 leading-relaxed flex-1">{idea.description}</p>
              </>
            )}

            <div className="space-y-3 mb-6">
              <div className="flex items-start gap-3">
                {isCrew ? <CpuIcon className="w-5 h-5 text-amber-400 mt-0.5 shrink-0" /> : isAgent ? <BotIcon className="w-5 h-5 text-rose-400 mt-0.5 shrink-0" /> : <TargetIcon className="w-5 h-5 text-purple-400 mt-0.5 shrink-0" />}
                <div>
                  <p className="text-xs text-slate-400 uppercase font-bold">{isTopWebsites ? 'Source' : 'Target Hook'}</p>
                  <p className="text-sm text-slate-200">{idea.painPointSolved}</p>
                </div>
              </div>
              {!isTopWebsites && (
                <div className="flex items-start gap-3">
                  <DollarSignIcon className="w-5 h-5 text-emerald-400 mt-0.5 shrink-0" />
                  <div>
                    <p className="text-xs text-slate-400 uppercase font-bold">Monetization</p>
                    <p className="text-sm text-slate-200">{idea.monetizationAngle || 'Lead Gen / Sales'}</p>
                  </div>
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {isTopWebsites ? (
                <a href={idea.url} target="_blank" rel="noopener noreferrer" className={`col-span-2 w-full flex items-center justify-center gap-2 bg-slate-800 hover:bg-slate-700 text-white py-3 rounded-lg font-medium transition-all group-hover:bg-gradient-to-r ${getButtonStyles()}`}>
                  <span>{getButtonLabel()}</span>
                  {getButtonIcon()}
                </a>
              ) : (
                <>
                  <button onClick={() => handleGenerateOutline(idea)} className={`flex items-center justify-center gap-2 bg-slate-800 hover:bg-slate-700 text-white py-3 rounded-lg font-medium transition-all group-hover:bg-gradient-to-r ${getButtonStyles()}`}>
                    <span>{getButtonLabel()}</span>
                    {getButtonIcon()}
                  </button>
                  <button onClick={() => handleCreatePrompt(idea)} className="flex items-center justify-center gap-2 bg-slate-800/50 hover:bg-gradient-to-r hover:from-amber-600 hover:to-orange-500 text-white py-3 rounded-lg font-medium transition-all border border-white/5 hover:border-amber-400/50 group/prompt">
                    <span>Prompt Creator</span>
                    <TerminalIcon className="w-4 h-4 group-hover/prompt:scale-110 transition-transform text-amber-400" />
                  </button>
                </>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Expert Prompt Modal */}
      {(activePromptIdea || loadingPrompt) && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-md" onClick={closePromptCreator} />
          <div className="relative w-full max-w-3xl bg-[#0a0f1d] border border-amber-500/30 rounded-2xl shadow-[0_0_50px_rgba(245,158,11,0.2)] flex flex-col max-h-[90vh] overflow-hidden animate-in zoom-in-95 duration-300">
            <div className="p-6 border-b border-white/10 flex justify-between items-center bg-gradient-to-r from-amber-900/20 to-orange-900/20">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-amber-500/10 rounded-lg flex items-center justify-center border border-amber-500/20">
                  <TerminalIcon className="text-amber-500 w-6 h-6" />
                </div>
                <div>
                  <p className="text-amber-400 text-[10px] font-bold uppercase tracking-[0.2em]">Prompt Engineering Crew</p>
                  <h2 className="text-lg font-bold text-white tracking-tight">Mega-Prompt Architect</h2>
                </div>
              </div>
              <button onClick={closePromptCreator} className="text-slate-400 hover:text-white transition-colors p-2 hover:bg-white/10 rounded-full">
                <XIcon className="w-6 h-6" />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-8 custom-scrollbar bg-slate-900/30">
              {loadingPrompt ? (
                <div className="flex flex-col items-center justify-center py-20 text-slate-400">
                  <div className="relative">
                    <div className="absolute inset-0 rounded-full bg-amber-500/20 blur-xl animate-pulse" />
                    <LoaderIcon className="w-16 h-16 animate-spin mb-4 text-amber-500 relative" />
                  </div>
                  <p className="text-xl font-light tracking-wide text-amber-200/70 animate-pulse mt-4">Consulting CrewAI Expert Agents...</p>
                  <div className="mt-8 flex gap-4 text-[10px] font-bold text-amber-500/50 uppercase tracking-widest">
                    <span className="animate-bounce" style={{animationDelay: '0s'}}>Analyzing Scope</span>
                    <span className="animate-bounce" style={{animationDelay: '0.2s'}}>Structuring Logic</span>
                    <span className="animate-bounce" style={{animationDelay: '0.4s'}}>Optimizing Variables</span>
                  </div>
                </div>
              ) : generatedPrompt ? (
                <div className="space-y-6">
                  <div className="bg-slate-800/40 border border-white/5 rounded-xl p-4 flex items-center justify-between">
                     <div className="flex items-center gap-3">
                       <CheckCircleIcon className="w-5 h-5 text-emerald-400" />
                       <span className="text-sm text-slate-300 font-medium">Expert Prompt for: <span className="text-white font-bold">{activePromptIdea?.title}</span></span>
                     </div>
                     <button 
                       onClick={handleCopyPrompt}
                       className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all ${promptCopied ? 'bg-emerald-600 text-white' : 'bg-amber-600 hover:bg-amber-500 text-white'}`}
                     >
                       {promptCopied ? <CheckCircleIcon className="w-4 h-4" /> : <CopyIcon className="w-4 h-4" />}
                       {promptCopied ? 'Copied!' : 'Copy Mega-Prompt'}
                     </button>
                  </div>
                  <div className="bg-[#050810] border border-white/10 rounded-xl p-6 relative group">
                    <pre className="text-slate-300 text-sm whitespace-pre-wrap font-mono leading-relaxed select-all">
                      {generatedPrompt}
                    </pre>
                  </div>
                  <div className="text-center">
                    <p className="text-xs text-slate-500 italic">This prompt is engineered for high-reasoning models like Gemini 2.5 Pro or GPT-4o.</p>
                  </div>
                </div>
              ) : null}
            </div>
            
            {!loadingPrompt && generatedPrompt && (
              <div className="p-4 border-t border-white/10 bg-[#0a0f1d] text-center">
                <button 
                  onClick={closePromptCreator}
                  className="text-slate-400 hover:text-white text-sm font-medium transition-colors"
                >
                  Dismiss Architect
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Blueprint Sidebar */}
      {!isTopWebsites && !isAdSnippet && (selectedIdea || loadingOutline) && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={closeOutline} />
          <div className="relative w-full max-w-2xl bg-slate-900 h-full border-l border-white/10 shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
            <div className="p-6 border-b border-white/10 flex justify-between items-start bg-slate-800/50">
              <div>
                <p className="text-cyan-400 text-xs font-bold uppercase tracking-widest mb-2">
                  {isCrew ? 'Crew Manifest' : isAgent ? 'Agent Spec' : 'Blueprint'}
                </p>
                <h2 className="text-xl font-bold text-white pr-8">{selectedIdea?.title}</h2>
              </div>
              <button onClick={closeOutline} className="text-slate-400 hover:text-white transition-colors p-2 hover:bg-white/10 rounded-full"><XIcon className="w-6 h-6" /></button>
            </div>
            <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
              {loadingOutline ? (
                <div className="flex flex-col items-center justify-center h-full text-slate-400">
                  <LoaderIcon className="w-12 h-12 animate-spin mb-4 text-cyan-500" />
                  <p className="text-lg animate-pulse">{isCrew ? 'Assembling Squad...' : 'Generating...'}</p>
                </div>
              ) : outline ? (
                <div className="space-y-8">
                  <div className={`border p-4 rounded-lg ${isCrew ? 'bg-amber-900/20 border-amber-500/30' : 'bg-purple-900/20 border-purple-500/30'}`}>
                    <h3 className={`font-bold mb-2 flex items-center gap-2 ${isCrew ? 'text-amber-300' : 'text-purple-300'}`}>
                      {isCrew ? <CpuIcon className="w-5 h-5" /> : <BotIcon className="w-5 h-5" />}
                      {isCrew ? 'Primary Crew Directive' : 'Core Promise'}
                    </h3>
                    <p className={`${isCrew ? 'text-amber-100' : 'text-purple-100'} italic`}>"{outline.introHook}"</p>
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-white mb-4 border-b border-white/10 pb-2">{isCrew ? 'The Agent Squad' : 'System Components'}</h3>
                    <div className="space-y-6">
                      {outline.modules.map((module, idx) => (
                        <div key={idx} className="relative pl-6 border-l-2 border-slate-700">
                          <div className={`absolute -left-[9px] top-0 w-4 h-4 rounded-full bg-slate-900 border-2 ${isCrew ? 'border-amber-500' : 'border-cyan-500'}`} />
                          <h4 className={`${isCrew ? 'text-amber-400' : 'text-cyan-400'} font-bold text-lg mb-2`}>{module.title}</h4>
                          <ul className="space-y-2">
                            {module.points.map((point, pIdx) => (
                              <li key={pIdx} className="flex items-start gap-2 text-slate-300 text-sm">
                                <CheckCircleIcon className="w-4 h-4 text-slate-500 mt-0.5 shrink-0" />
                                <span>{point}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="bg-emerald-900/20 border border-emerald-500/30 p-6 rounded-lg mt-8">
                    <h3 className="text-emerald-400 font-bold uppercase text-xs tracking-wider mb-2">Success Strategy</h3>
                    <p className="text-xl font-bold text-white">{outline.cta}</p>
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      )}
    </>
  );
};
