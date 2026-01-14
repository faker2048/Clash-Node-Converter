
import React, { useState, useCallback, useMemo } from 'react';
import { ClashProxy, OutputTab } from './types';
import { ParserService } from './services/parser';
import CopyButton from './components/CopyButton';

const App: React.FC = () => {
  const [input, setInput] = useState('');
  const [proxies, setProxies] = useState<ClashProxy[]>([]);
  const [filter, setFilter] = useState('');
  const [activeTab, setActiveTab] = useState<OutputTab>(OutputTab.SHARE_LINKS);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleProcess = useCallback(async () => {
    if (!input.trim()) return;
    
    setLoading(true);
    setError(null);
    
    try {
      let finalInput = input;
      
      // Detect if input is a URL
      if (input.startsWith('http')) {
        try {
          // Note: Browser-side fetching often hits CORS issues.
          // In a real app, a proxy or server-side fetch is needed.
          const response = await fetch(input);
          if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
          finalInput = await response.text();
        } catch (fetchErr: any) {
          throw new Error("Could not fetch the URL directly due to CORS/Network restrictions. Please paste the raw YAML content instead.");
        }
      }

      const results = ParserService.parseClashConfig(finalInput);
      if (results.length === 0) {
        throw new Error("No valid proxies found in the input.");
      }
      setProxies(results);
    } catch (err: any) {
      setError(err.message || "An error occurred while processing.");
      setProxies([]);
    } finally {
      setLoading(false);
    }
  }, [input]);

  const filteredProxies = useMemo(() => {
    if (!filter.trim()) return proxies;
    const search = filter.toLowerCase();
    return proxies.filter(p => 
      p.name.toLowerCase().includes(search) || 
      p.server.toLowerCase().includes(search)
    );
  }, [proxies, filter]);

  const shareLinks = useMemo(() => {
    return filteredProxies.map(p => ParserService.toShareLink(p)).join('\n');
  }, [filteredProxies]);

  const singboxJson = useMemo(() => {
    const outbounds = filteredProxies.map(p => ParserService.toSingBoxOutbound(p));
    return JSON.stringify(outbounds, null, 2);
  }, [filteredProxies]);

  return (
    <div className="min-h-screen pb-20">
      {/* Header */}
      <header className="py-12 text-center bg-gradient-to-b from-blue-900/20 to-transparent">
        <div className="inline-flex items-center justify-center w-16 h-16 mb-4 rounded-2xl bg-blue-600/20 text-blue-400 border border-blue-500/30">
          <i className="fas fa-shuffle text-3xl"></i>
        </div>
        <h1 className="text-4xl font-extrabold tracking-tight text-white sm:text-5xl">
          Clash Node Converter
        </h1>
        <p className="mt-4 text-lg text-slate-400 max-w-2xl mx-auto px-4">
          Convert your Clash subscriptions into Share Links or Sing-box configuration formats instantly.
        </p>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        {/* Input Area */}
        <section className="glass-panel p-6 rounded-3xl shadow-2xl">
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <label className="text-sm font-semibold text-slate-300 uppercase tracking-wider">
                Subscription URL or Raw YAML
              </label>
              <button 
                onClick={() => setInput('')}
                className="text-xs text-slate-500 hover:text-white transition-colors"
              >
                Clear Input
              </button>
            </div>
            <textarea
              className="w-full h-48 p-4 rounded-xl bg-slate-900/50 border border-slate-700 text-slate-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all resize-none code-font text-sm"
              placeholder="Paste your Clash subscription link or the raw YAML content here..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
            />
            <button
              onClick={handleProcess}
              disabled={loading || !input.trim()}
              className="w-full py-4 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:bg-slate-700 disabled:cursor-not-allowed text-white font-bold text-lg shadow-lg shadow-blue-900/20 transition-all flex items-center justify-center gap-3"
            >
              {loading ? (
                <i className="fas fa-spinner fa-spin"></i>
              ) : (
                <i className="fas fa-wand-magic-sparkles"></i>
              )}
              {loading ? 'Processing...' : 'Convert Nodes'}
            </button>
          </div>
          {error && (
            <div className="mt-4 p-4 rounded-xl bg-red-900/20 border border-red-500/30 text-red-400 text-sm flex items-start gap-3">
              <i className="fas fa-circle-exclamation mt-1"></i>
              <span>{error}</span>
            </div>
          )}
        </section>

        {/* Results Area */}
        {proxies.length > 0 && (
          <section className="glass-panel rounded-3xl overflow-hidden shadow-2xl animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Tabs Header */}
            <div className="flex flex-wrap border-b border-slate-700 bg-slate-800/50">
              <button
                onClick={() => setActiveTab(OutputTab.SHARE_LINKS)}
                className={`flex-1 min-w-[120px] py-4 text-sm font-medium transition-all border-b-2 ${
                  activeTab === OutputTab.SHARE_LINKS 
                    ? "border-blue-500 text-blue-400 bg-blue-500/5" 
                    : "border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-700/30"
                }`}
              >
                <i className="fas fa-link mr-2"></i>
                Share Links
              </button>
              <button
                onClick={() => setActiveTab(OutputTab.SINGBOX_JSON)}
                className={`flex-1 min-w-[120px] py-4 text-sm font-medium transition-all border-b-2 ${
                  activeTab === OutputTab.SINGBOX_JSON 
                    ? "border-blue-500 text-blue-400 bg-blue-500/5" 
                    : "border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-700/30"
                }`}
              >
                <i className="fas fa-code mr-2"></i>
                Sing-box JSON
              </button>
              <button
                onClick={() => setActiveTab(OutputTab.TABLE)}
                className={`flex-1 min-w-[120px] py-4 text-sm font-medium transition-all border-b-2 ${
                  activeTab === OutputTab.TABLE 
                    ? "border-blue-500 text-blue-400 bg-blue-500/5" 
                    : "border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-700/30"
                }`}
              >
                <i className="fas fa-table mr-2"></i>
                Node List ({filteredProxies.length})
              </button>
            </div>

            {/* Tab Content */}
            <div className="p-6">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
                <div className="flex items-center gap-3">
                  <h3 className="text-lg font-bold text-white whitespace-nowrap">
                    {activeTab === OutputTab.SHARE_LINKS && 'Extracted Share Links'}
                    {activeTab === OutputTab.SINGBOX_JSON && 'Sing-box Outbounds'}
                    {activeTab === OutputTab.TABLE && 'All Extracted Nodes'}
                  </h3>
                  {filter && (
                    <span className="text-xs bg-blue-500/20 text-blue-400 px-2 py-0.5 rounded-full border border-blue-500/30">
                      Filtered: {filteredProxies.length}
                    </span>
                  )}
                </div>

                <div className="flex flex-col sm:flex-row w-full md:w-auto gap-3">
                  {/* Filter Input */}
                  <div className="relative flex-1 sm:w-64">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <i className="fas fa-search text-slate-500 text-xs"></i>
                    </div>
                    <input
                      type="text"
                      placeholder="Filter by name or server..."
                      className="block w-full pl-9 pr-3 py-2 border border-slate-700 rounded-lg bg-slate-900/50 text-slate-200 placeholder-slate-500 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 transition-all shadow-inner"
                      value={filter}
                      onChange={(e) => setFilter(e.target.value)}
                    />
                    {filter && (
                      <button 
                        onClick={() => setFilter('')}
                        className="absolute inset-y-0 right-0 pr-2 flex items-center text-slate-500 hover:text-slate-300"
                      >
                        <i className="fas fa-times-circle text-xs"></i>
                      </button>
                    )}
                  </div>
                  
                  {activeTab !== OutputTab.TABLE && (
                    <CopyButton 
                      text={activeTab === OutputTab.SHARE_LINKS ? shareLinks : singboxJson} 
                      label="Copy Results"
                    />
                  )}
                </div>
              </div>

              <div className="max-h-[600px] overflow-y-auto custom-scrollbar">
                {filteredProxies.length === 0 ? (
                  <div className="py-20 text-center text-slate-500 italic">
                    <i className="fas fa-search mb-3 text-3xl opacity-20"></i>
                    <p>No nodes matching your filter criteria.</p>
                  </div>
                ) : (
                  <>
                    {activeTab === OutputTab.SHARE_LINKS && (
                      <pre className="p-4 rounded-xl bg-slate-950 border border-slate-800 text-blue-300 text-xs sm:text-sm overflow-x-auto code-font leading-relaxed">
                        {shareLinks}
                      </pre>
                    )}

                    {activeTab === OutputTab.SINGBOX_JSON && (
                      <pre className="p-4 rounded-xl bg-slate-950 border border-slate-800 text-green-400 text-xs sm:text-sm overflow-x-auto code-font leading-relaxed">
                        {singboxJson}
                      </pre>
                    )}

                    {activeTab === OutputTab.TABLE && (
                      <div className="overflow-x-auto rounded-xl border border-slate-800">
                        <table className="w-full text-left text-sm">
                          <thead className="bg-slate-800/50 text-slate-400 font-medium uppercase tracking-wider">
                            <tr>
                              <th className="px-4 py-3">Name</th>
                              <th className="px-4 py-3">Type</th>
                              <th className="px-4 py-3">Server</th>
                              <th className="px-4 py-3">Port</th>
                              <th className="px-4 py-3">Action</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-800 text-slate-300">
                            {filteredProxies.map((p, idx) => (
                              <tr key={idx} className="hover:bg-slate-800/30 transition-colors">
                                <td className="px-4 py-3 font-medium text-slate-100">{p.name}</td>
                                <td className="px-4 py-3">
                                  <span className="px-2 py-0.5 rounded-full bg-slate-700 text-xs">
                                    {p.type.toUpperCase()}
                                  </span>
                                </td>
                                <td className="px-4 py-3 opacity-60 text-xs">{p.server}</td>
                                <td className="px-4 py-3">{p.port}</td>
                                <td className="px-4 py-3">
                                  <CopyButton 
                                    text={ParserService.toShareLink(p)} 
                                    label="" 
                                    className="scale-75 origin-left px-2"
                                  />
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          </section>
        )}
      </main>

      <footer className="mt-20 py-8 text-center text-slate-500 text-xs border-t border-slate-800/50">
        <p>&copy; 2024 Clash Node Converter &bull; Professional Sub-conversion Tool</p>
      </footer>
    </div>
  );
};

export default App;
