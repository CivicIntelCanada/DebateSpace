// ============================================
// DEBATESPACE - DEEPER RESEARCH FRONTEND
// EXACT LAYOUT PRESERVED (Purple/Black theme, AI card at top)
// ============================================

async function searchDebate() {
    const query = document.getElementById('searchInput').value;
    if (!query.trim()) {
        alert('Please enter a debate topic or question');
        return;
    }
    
    const loading = document.getElementById('loading');
    const resultsDiv = document.getElementById('results');
    
    loading.style.display = 'block';
    resultsDiv.innerHTML = '';
    
    try {
        const response = await fetch(`/api/search?query=${encodeURIComponent(query)}`);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const data = await response.json();
        renderResults(data, query);
    } catch (error) {
        console.error('Search error:', error);
        resultsDiv.innerHTML = `<div class="error-card"><div class="error-icon">⚠️</div><h3>Unable to fetch results</h3><p>${error.message}</p><button onclick="searchDebate()" class="retry-btn">Try Again</button></div>`;
    } finally {
        loading.style.display = 'none';
    }
}

function renderResults(data, query) {
    const container = document.getElementById('results');
    
    const formatWithCitations = (text, citations) => {
        if (!text) return '<p>No information available.</p>';
        let formatted = text;
        formatted = formatted.replace(/\[(\d+)\]/g, (match, num) => {
            const citation = citations?.find(c => c.id == num);
            if (citation) {
                return `<a href="${citation.url}" target="_blank" class="citation-link" title="${citation.source}">[${num}]</a>`;
            }
            return match;
        });
        const paragraphs = formatted.split(/\n\n+/);
        return paragraphs.map(p => `<p>${p.replace(/\n/g, '<br>')}</p>`).join('');
    };
    
    // AI ANALYSIS SECTION (Top)
    const aiText = data.aiAnalysis?.text || 'AI analysis temporarily unavailable.';
    const sourcesUsed = data.aiAnalysis?.sourcesUsed || data.research?.evidenceCount || 0;
    const govSourcesUsed = data.aiAnalysis?.governmentSourcesUsed || data.research?.governmentCount || 0;
    
    const aiHtml = `
        <div class="ai-card">
            <div class="ai-header">
                <span class="ai-icon">🤖</span>
                <span>AI ANALYSIS OF RESEARCH</span>
            </div>
            <div class="ai-text">${formatWithCitations(aiText, data.research?.citations)}</div>
            <div class="ai-footer">📊 Based on ${sourcesUsed} sources (${govSourcesUsed} government) • ${data.aiAnalysis?.modelUsed || 'Groq Llama 3.3'}</div>
        </div>
    `;
    
    // RESEARCH FINDINGS with Categories
    let researchText = data.research?.text || 'Research findings will appear here.';
    
    if (data.research?.categories) {
        const cats = data.research.categories;
        if (cats.statistics?.length) {
            researchText += `\n\n📊 KEY STATISTICS FOUND:\n${cats.statistics.map(s => `• ${s.substring(0, 150)}...`).join('\n')}`;
        }
        if (cats.policy?.length) {
            researchText += `\n\n⚖️ POLICY FINDINGS:\n${cats.policy.map(s => `• ${s.substring(0, 150)}...`).join('\n')}`;
        }
        if (cats.economic?.length) {
            researchText += `\n\n💰 ECONOMIC DATA:\n${cats.economic.map(s => `• ${s.substring(0, 150)}...`).join('\n')}`;
        }
    }
    
    const researchHtml = `
        <div class="research-card">
            <div class="research-header">
                <span class="research-icon">✅</span>
                <span>RESEARCH FINDINGS WITH CITATIONS</span>
            </div>
            <div class="research-text">
                ${formatWithCitations(researchText, data.research?.citations)}
            </div>
            <div class="research-footer">
                <span>📊 ${data.research?.evidenceCount || 0} sources (${data.research?.governmentCount || 0} government sources)</span>
            </div>
        </div>
    `;
    
    // CITATIONS SECTION
    const citationsHtml = data.research?.citations?.length > 0 ? `
        <div class="citations-card">
            <div class="citations-header">
                <span class="citations-icon">📋</span>
                <span>SOURCE CITATIONS (${data.research.citations.length})</span>
            </div>
            <div class="citations-list">
                ${data.research.citations.map(c => `
                    <div class="citation-item">
                        <div class="citation-id">[${c.id}]</div>
                        <div class="citation-content">
                            <div class="citation-text">${escapeHtml(c.text.substring(0, 300))}${c.text.length > 300 ? '...' : ''}</div>
                            <div class="citation-source">
                                <span class="source-label">📌 ${escapeHtml(c.source)}</span>
                                <a href="${c.url}" target="_blank" class="source-link">🔗 View Original Source</a>
                            </div>
                        </div>
                    </div>
                `).join('')}
            </div>
        </div>
    ` : '';
    
    // NEWS SECTION
    const newsHtml = data.newsArticles?.length > 0 ? `
        <div class="news-card">
            <div class="news-header">
                <span class="news-icon">📰</span>
                <span>NEWS ARTICLES (${data.newsArticles.length})</span>
            </div>
            <div class="news-list">
                ${data.newsArticles.map(a => `
                    <div class="news-item">
                        <a href="${a.url}" target="_blank" class="news-title">${escapeHtml(a.title)}</a>
                        <div class="news-meta">📌 ${escapeHtml(a.source)}${a.date ? ` • 📅 ${a.date}` : ''}</div>
                        ${a.description ? `<div class="news-desc">${escapeHtml(a.description.substring(0, 150))}...</div>` : ''}
                    </div>
                `).join('')}
            </div>
        </div>
    ` : '';
    
    // VIDEOS SECTION
    const videosHtml = data.videoSources?.length > 0 ? `
        <div class="videos-card">
            <div class="videos-header">
                <span class="videos-icon">📺</span>
                <span>VIDEO EXPLANATIONS (${data.videoSources.length})</span>
            </div>
            <div class="videos-grid">
                ${data.videoSources.map(v => `
                    <div class="video-item" onclick="window.open('${v.url}', '_blank')">
                        ${v.thumbnail ? `<img src="${v.thumbnail}" alt="${escapeHtml(v.title)}">` : '<div class="video-placeholder">🎬</div>'}
                        <div class="video-info">
                            <div class="video-title">${escapeHtml(v.title)}</div>
                            <div class="video-channel">${escapeHtml(v.channel)}</div>
                        </div>
                    </div>
                `).join('')}
            </div>
        </div>
    ` : '';
    
    // ALL SOURCES SECTION
    const allSources = data.allSources || [];
    
    const sourcesHtml = allSources.length > 0 ? `
        <div class="sources-card">
            <div class="sources-header">
                <span class="sources-icon">📚</span>
                <span>ALL RESEARCH SOURCES (${allSources.length})</span>
            </div>
            <div class="sources-list">
                ${allSources.slice(0, 50).map((s, i) => `
                    <div class="source-item">
                        <span class="source-num">${i+1}.</span>
                        <span class="source-type">${s.isGovernment ? '🏛️' : s.type === 'archive' ? '📜' : '🌐'}</span>
                        <a href="${s.url}" target="_blank" class="source-link">${escapeHtml(s.title || s.snippet?.substring(0, 80) || 'Untitled')}</a>
                        <span class="source-domain">${escapeHtml(s.source)}</span>
                    </div>
                `).join('')}
                ${allSources.length > 50 ? `<div class="more-sources-note">+${allSources.length - 50} more sources available</div>` : ''}
            </div>
        </div>
    ` : '';
    
    // STATS FOOTER
    const totalGovCount = data.governmentSourcesCount || allSources.filter(s => s.isGovernment).length;
    const totalArchiveCount = allSources.filter(s => s.type === "archive").length;
    const totalNewsCount = data.newsArticles?.length || 0;
    const totalVideoCount = data.videoSources?.length || 0;
    const totalCitationsCount = data.research?.citations?.length || 0;
    
    const statsHtml = `
        <div class="stats-footer">
            <span>🔍 "${escapeHtml(query.substring(0, 40))}${query.length > 40 ? '...' : ''}"</span>
            <span>🏛️ ${totalGovCount} Government Sources</span>
            <span>📜 ${totalArchiveCount} Archives</span>
            <span>📰 ${totalNewsCount} News Articles</span>
            <span>📺 ${totalVideoCount} Videos</span>
            <span>📋 ${totalCitationsCount} Citations</span>
        </div>
    `;
    
    container.innerHTML = aiHtml + researchHtml + citationsHtml + newsHtml + videosHtml + sourcesHtml + statsHtml;
}

function setSearch(topic) {
    document.getElementById('searchInput').value = topic;
    searchDebate();
}

function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/[&<>]/g, function(m) {
        if (m === '&') return '&amp;';
        if (m === '<') return '&lt;';
        if (m === '>') return '&gt;';
        return m;
    });
}

// ========================================
// PURPLE/BLACK THEME STYLES (EXACTLY YOUR LAYOUT)
// ========================================
const styles = `
<style>
* { margin: 0; padding: 0; box-sizing: border-box; }
body { background: #0f0f1a; font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif; color: #e4e4e7; line-height: 1.5; }
.main-container { max-width: 1200px; margin: 0 auto; padding: 32px 24px; }

/* Header */
.site-header { text-align: center; margin-bottom: 48px; }
.logo-badge { font-size: 3rem; margin-bottom: 8px; display: inline-block; animation: float 3s ease-in-out infinite; }
@keyframes float { 0%, 100% { transform: translateY(0px); } 50% { transform: translateY(-8px); } }
h1 { font-size: 3rem; font-weight: 700; background: linear-gradient(135deg, #fff 0%, #a78bfa 50%, #60a5fa 100%); -webkit-background-clip: text; background-clip: text; color: transparent; }
h1 span { background: linear-gradient(135deg, #a78bfa 0%, #c084fc 100%); -webkit-background-clip: text; background-clip: text; color: transparent; }
.tagline { color: #a1a1aa; text-align: center; margin-bottom: 40px; }

/* Search */
.search-container { display: flex; gap: 10px; max-width: 700px; margin: 0 auto; background: rgba(24,24,37,0.9); border-radius: 60px; padding: 4px 4px 4px 20px; border: 1px solid rgba(255,255,255,0.1); }
#searchInput { flex: 1; background: transparent; border: none; padding: 18px 0; font-size: 1rem; color: #fff; outline: none; }
#searchBtn { background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); border: none; padding: 12px 32px; border-radius: 50px; color: white; font-weight: 600; cursor: pointer; }
.search-tips { display: flex; flex-wrap: wrap; gap: 10px; justify-content: center; margin-top: 20px; }
.tip-btn { background: rgba(39,39,52,0.8); border: 1px solid rgba(255,255,255,0.08); padding: 6px 16px; border-radius: 50px; color: #d4d4d8; cursor: pointer; }
.loading { text-align: center; padding: 60px; }
.spinner { width: 50px; height: 50px; border: 3px solid rgba(99,102,241,0.2); border-top: 3px solid #6366f1; border-radius: 50%; animation: spin 1s linear infinite; margin: 0 auto 20px; }
@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }

/* AI Card */
.ai-card {
    background: linear-gradient(135deg, rgba(139, 92, 246, 0.12), rgba(139, 92, 246, 0.05));
    border: 2px solid rgba(139, 92, 246, 0.4);
    border-radius: 24px;
    padding: 24px;
    margin-bottom: 24px;
}
.ai-header { font-size: 1.1rem; font-weight: 700; color: #a78bfa; margin-bottom: 16px; padding-bottom: 10px; border-bottom: 2px solid rgba(139, 92, 246, 0.3); display: flex; align-items: center; gap: 10px; }
.ai-text { font-size: 1rem; line-height: 1.6; color: #e4e4e7; margin-bottom: 16px; }
.ai-text p { margin-bottom: 12px; }
.ai-footer { font-size: 0.75rem; color: #a1a1aa; padding-top: 12px; border-top: 1px solid rgba(255,255,255,0.1); }

/* Research Card */
.research-card {
    background: linear-gradient(135deg, rgba(16, 185, 129, 0.12), rgba(16, 185, 129, 0.05));
    border: 2px solid rgba(16, 185, 129, 0.4);
    border-radius: 24px;
    padding: 24px;
    margin-bottom: 24px;
}
.research-header { font-size: 1.1rem; font-weight: 700; color: #10b981; margin-bottom: 16px; padding-bottom: 10px; border-bottom: 2px solid rgba(16, 185, 129, 0.3); display: flex; align-items: center; gap: 10px; }
.research-text { font-size: 1rem; line-height: 1.6; color: #e4e4e7; margin-bottom: 16px; }
.research-text p { margin-bottom: 12px; }
.citation-link { display: inline-block; color: #fbbf24; text-decoration: none; font-weight: bold; padding: 0 2px; }
.research-footer { font-size: 0.75rem; color: #a1a1aa; padding-top: 12px; border-top: 1px solid rgba(255,255,255,0.1); }

/* Citations Card */
.citations-card { background: rgba(20,20,35,0.9); border: 1px solid rgba(255,255,255,0.08); border-radius: 20px; padding: 24px; margin-bottom: 24px; }
.citations-header { font-size: 1rem; font-weight: 700; color: #fbbf24; margin-bottom: 16px; padding-bottom: 10px; border-bottom: 1px solid rgba(255,255,255,0.1); display: flex; align-items: center; gap: 10px; }
.citations-list { display: flex; flex-direction: column; gap: 16px; max-height: 500px; overflow-y: auto; }
.citation-item { background: rgba(0,0,0,0.3); border-radius: 12px; padding: 14px; display: flex; gap: 12px; border-left: 3px solid #10b981; }
.citation-id { font-size: 0.9rem; font-weight: bold; color: #fbbf24; min-width: 40px; }
.citation-content { flex: 1; }
.citation-text { font-size: 0.85rem; color: #e4e4e7; margin-bottom: 8px; line-height: 1.4; }
.citation-source { display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 10px; font-size: 0.7rem; }
.source-link { color: #34d399; text-decoration: none; padding: 4px 10px; background: rgba(16,185,129,0.1); border-radius: 20px; }

/* News Card */
.news-card { background: rgba(20,20,35,0.9); border: 1px solid rgba(255,255,255,0.08); border-radius: 20px; padding: 24px; margin-bottom: 24px; }
.news-header { font-size: 1rem; font-weight: 700; color: #3b82f6; margin-bottom: 16px; padding-bottom: 10px; border-bottom: 1px solid rgba(255,255,255,0.1); display: flex; align-items: center; gap: 10px; }
.news-list { display: flex; flex-direction: column; gap: 12px; max-height: 400px; overflow-y: auto; }
.news-item { background: rgba(0,0,0,0.3); border-radius: 12px; padding: 12px; border-left: 3px solid #3b82f6; }
.news-title { font-size: 0.9rem; font-weight: 600; color: #60a5fa; text-decoration: none; display: block; }

/* Videos Card */
.videos-card { background: rgba(20,20,35,0.9); border: 1px solid rgba(255,255,255,0.08); border-radius: 20px; padding: 24px; margin-bottom: 24px; }
.videos-header { font-size: 1rem; font-weight: 700; color: #ef4444; margin-bottom: 16px; padding-bottom: 10px; border-bottom: 1px solid rgba(255,255,255,0.1); display: flex; align-items: center; gap: 10px; }
.videos-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(240px, 1fr)); gap: 16px; }
.video-item { background: rgba(0,0,0,0.4); border-radius: 12px; overflow: hidden; cursor: pointer; transition: transform 0.2s; }
.video-item img { width: 100%; height: 130px; object-fit: cover; }

/* Sources Card */
.sources-card { background: rgba(20,20,35,0.9); border: 1px solid rgba(255,255,255,0.08); border-radius: 20px; padding: 24px; margin-bottom: 24px; }
.sources-header { font-size: 1rem; font-weight: 700; color: #a78bfa; margin-bottom: 16px; padding-bottom: 10px; border-bottom: 1px solid rgba(255,255,255,0.1); display: flex; align-items: center; gap: 10px; }
.sources-list { display: flex; flex-direction: column; gap: 8px; max-height: 400px; overflow-y: auto; }
.source-item { font-size: 0.75rem; padding: 8px 0; display: flex; gap: 10px; align-items: center; flex-wrap: wrap; border-bottom: 1px solid rgba(255,255,255,0.05); }
.source-link { color: #60a5fa; text-decoration: none; flex: 1; }

/* Stats Footer */
.stats-footer { background: rgba(0,0,0,0.3); border-radius: 40px; padding: 12px 20px; display: flex; flex-wrap: wrap; justify-content: center; gap: 16px; font-size: 0.7rem; color: #a1a1aa; margin-top: 20px; }
.stats-footer span { padding: 4px 10px; background: rgba(255,255,255,0.05); border-radius: 30px; }

/* Footer */
.site-footer { text-align: center; margin-top: 40px; padding-top: 20px; border-top: 1px solid rgba(255,255,255,0.05); font-size: 0.7rem; color: #52525b; }

/* Responsive */
@media (max-width: 768px) {
    .main-container { padding: 20px 16px; }
    h1 { font-size: 2rem; }
    .search-container { flex-direction: column; background: #181825; border-radius: 28px; padding: 12px; }
    #searchInput { width: 100%; padding: 14px; }
    #searchBtn { width: 100%; margin-top: 10px; }
    .videos-grid { grid-template-columns: 1fr; }
    .citation-item { flex-direction: column; }
}
</style>
`;

if (!document.querySelector('#debate-styles')) {
    const styleTag = document.createElement('style');
    styleTag.id = 'debate-styles';
    styleTag.textContent = styles;
    document.head.appendChild(styleTag);
}

window.searchDebate = searchDebate;
window.setSearch = setSearch;

document.getElementById('searchInput')?.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') searchDebate();
});

console.log('DebateSpace DEEPER RESEARCH loaded');
