// ============================================
// DEBATESPACE - COMPLETE FRONTEND
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
    
    // Format text with citation links
    const formatText = (text, citations) => {
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
    
    // AI Analysis Section
    const aiHtml = data.aiAnalysis ? `
        <div class="ai-card">
            <div class="ai-header">
                <span>🤖</span>
                <span>AI ANALYSIS</span>
                <span class="ai-badge">${data.aiAnalysis.modelUsed || 'AI'}</span>
            </div>
            <div class="ai-text">${data.aiAnalysis.text}</div>
            ${data.aiAnalysis.disclaimer ? `<div class="ai-disclaimer">${data.aiAnalysis.disclaimer}</div>` : ''}
            <div class="ai-footer">📊 Based on ${data.aiAnalysis.sourcesUsed || 0} research sources</div>
        </div>
    ` : '';
    
    // Research Section
    const researchHtml = `
        <div class="research-card">
            <div class="research-header">
                <span>✅</span>
                <span>RESEARCH FINDINGS</span>
            </div>
            <div class="research-text">${formatText(data.research?.text, data.research?.citations)}</div>
            <div class="research-footer">
                <span>📊 ${data.research?.evidenceCount || 0} Sources (${data.research?.governmentCount || 0} Government)</span>
                <span>💡 Click [numbers] to verify sources</span>
            </div>
        </div>
    `;
    
    // Citations Section
    const citationsHtml = data.research?.citations?.length > 0 ? `
        <div class="citations-card">
            <div class="citations-header">
                <span>📋</span>
                <span>SOURCE CITATIONS (${data.research.citations.length})</span>
            </div>
            <div class="citations-list">
                ${data.research.citations.map(c => `
                    <div class="citation-item">
                        <div class="citation-id">[${c.id}]</div>
                        <div class="citation-content">
                            <div class="citation-text">${c.text}</div>
                            <div class="citation-source">
                                <span>${c.source}</span>
                                <a href="${c.url}" target="_blank">🔗 View Source</a>
                            </div>
                        </div>
                    </div>
                `).join('')}
            </div>
        </div>
    ` : '';
    
    // News Section
    const newsHtml = data.newsArticles?.length > 0 ? `
        <div class="news-card">
            <div class="news-header">
                <span>📰</span>
                <span>NEWS ARTICLES (${data.newsArticles.length})</span>
            </div>
            <div class="news-list">
                ${data.newsArticles.map(a => `
                    <div class="news-item">
                        <a href="${a.url}" target="_blank" class="news-title">${a.title}</a>
                        <div class="news-meta">📌 ${a.source}${a.date ? ` • 📅 ${a.date}` : ''}</div>
                        ${a.description ? `<div class="news-desc">${a.description}...</div>` : ''}
                    </div>
                `).join('')}
            </div>
        </div>
    ` : '';
    
    // Videos Section
    const videosHtml = data.videoSources?.length > 0 ? `
        <div class="videos-card">
            <div class="videos-header">
                <span>📺</span>
                <span>VIDEOS (${data.videoSources.length})</span>
            </div>
            <div class="videos-grid">
                ${data.videoSources.map(v => `
                    <div class="video-item" onclick="window.open('${v.url}', '_blank')">
                        ${v.thumbnail ? `<img src="${v.thumbnail}">` : '<div class="video-placeholder">🎬</div>'}
                        <div class="video-info">
                            <div class="video-title">${v.title}</div>
                            <div class="video-channel">${v.channel}</div>
                        </div>
                    </div>
                `).join('')}
            </div>
        </div>
    ` : '';
    
    // All Sources Section
    const sourcesHtml = data.allSources?.length > 0 ? `
        <div class="sources-card">
            <div class="sources-header">
                <span>📚</span>
                <span>ALL SOURCES (${data.allSources.length})</span>
            </div>
            <div class="sources-list">
                ${data.allSources.map((s, i) => `
                    <div class="source-item">
                        <span class="source-num">${i+1}.</span>
                        <span class="source-type">${s.isGovernment ? '🏛️' : s.type === 'archive' ? '📜' : '🌐'}</span>
                        <a href="${s.url}" target="_blank" class="source-link">${s.title || s.snippet?.substring(0, 80)}</a>
                        <span class="source-domain">${s.source}</span>
                    </div>
                `).join('')}
            </div>
        </div>
    ` : '';
    
    // Stats Footer
    const statsHtml = `
        <div class="stats-footer">
            <span>🔍 "${query}"</span>
            <span>🏛️ ${data.allSources?.filter(s => s.isGovernment).length || 0} Gov</span>
            <span>📜 ${data.allSources?.filter(s => s.type === "archive").length || 0} Archive</span>
            <span>📰 ${data.newsArticles?.length || 0} News</span>
            <span>📺 ${data.videoSources?.length || 0} Videos</span>
            <span>📋 ${data.research?.citations?.length || 0} Citations</span>
        </div>
    `;
    
    container.innerHTML = aiHtml + researchHtml + citationsHtml + newsHtml + videosHtml + sourcesHtml + statsHtml;
}

function setSearch(topic) {
    document.getElementById('searchInput').value = topic;
    searchDebate();
}

// Add styles
const styles = `
<style>
* { margin: 0; padding: 0; box-sizing: border-box; }
body { background: #0f0f1a; font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif; color: #e4e4e7; line-height: 1.5; }
.main-container { max-width: 1200px; margin: 0 auto; padding: 32px 24px; }
.site-header { text-align: center; margin-bottom: 48px; }
.logo-badge { font-size: 3rem; margin-bottom: 8px; display: inline-block; animation: float 3s ease-in-out infinite; }
@keyframes float { 0%, 100% { transform: translateY(0px); } 50% { transform: translateY(-8px); } }
h1 { font-size: 3rem; font-weight: 700; background: linear-gradient(135deg, #fff 0%, #a78bfa 50%, #60a5fa 100%); -webkit-background-clip: text; background-clip: text; color: transparent; }
h1 span { background: linear-gradient(135deg, #a78bfa 0%, #c084fc 100%); -webkit-background-clip: text; background-clip: text; color: transparent; }
.tagline { color: #a1a1aa; text-align: center; margin-bottom: 40px; }
.search-container { display: flex; gap: 10px; max-width: 700px; margin: 0 auto; background: rgba(24,24,37,0.9); border-radius: 60px; padding: 4px 4px 4px 20px; border: 1px solid rgba(255,255,255,0.1); }
#searchInput { flex: 1; background: transparent; border: none; padding: 18px 0; font-size: 1rem; color: #fff; outline: none; }
#searchBtn { background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); border: none; padding: 12px 32px; border-radius: 50px; color: white; font-weight: 600; cursor: pointer; }
.search-tips { display: flex; flex-wrap: wrap; gap: 10px; justify-content: center; margin-top: 20px; }
.tip-btn { background: rgba(39,39,52,0.8); border: 1px solid rgba(255,255,255,0.08); padding: 6px 16px; border-radius: 50px; color: #d4d4d8; cursor: pointer; }
.loading { text-align: center; padding: 60px; }
.spinner { width: 50px; height: 50px; border: 3px solid rgba(99,102,241,0.2); border-top: 3px solid #6366f1; border-radius: 50%; animation: spin 1s linear infinite; margin: 0 auto 20px; }
@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }

/* Cards */
.ai-card, .research-card, .citations-card, .news-card, .videos-card, .sources-card {
    background: rgba(20,20,35,0.85);
    backdrop-filter: blur(10px);
    border-radius: 24px;
    padding: 24px;
    margin-bottom: 24px;
    border: 1px solid rgba(255,255,255,0.08);
}
.ai-card { background: linear-gradient(135deg, rgba(139,92,246,0.12), rgba(139,92,246,0.05)); border-color: rgba(139,92,246,0.3); }
.research-card { background: linear-gradient(135deg, rgba(16,185,129,0.12), rgba(16,185,129,0.05)); border-color: rgba(16,185,129,0.3); }
.ai-header, .research-header, .citations-header, .news-header, .videos-header, .sources-header {
    font-size: 1.1rem;
    font-weight: 700;
    margin-bottom: 16px;
    padding-bottom: 10px;
    border-bottom: 1px solid rgba(255,255,255,0.1);
    display: flex;
    align-items: center;
    gap: 10px;
}
.ai-badge { font-size: 0.7rem; background: rgba(139,92,246,0.2); padding: 2px 10px; border-radius: 20px; margin-left: auto; }
.ai-text, .research-text { font-size: 1rem; line-height: 1.6; color: #e4e4e7; margin-bottom: 16px; }
.ai-footer, .research-footer { font-size: 0.7rem; color: #a1a1aa; padding-top: 12px; border-top: 1px solid rgba(255,255,255,0.1); display: flex; justify-content: space-between; flex-wrap: wrap; gap: 10px; }
.citation-link { display: inline-block; color: #fbbf24; text-decoration: none; font-weight: bold; padding: 0 2px; }
.citations-list { display: flex; flex-direction: column; gap: 12px; max-height: 500px; overflow-y: auto; }
.citation-item { background: rgba(0,0,0,0.3); border-radius: 12px; padding: 12px; display: flex; gap: 10px; border-left: 3px solid #10b981; }
.citation-id { font-weight: bold; color: #fbbf24; min-width: 40px; }
.citation-text { font-size: 0.85rem; color: #e4e4e7; margin-bottom: 8px; }
.citation-source { display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 8px; font-size: 0.7rem; }
.citation-source a { color: #34d399; text-decoration: none; }
.news-list { display: flex; flex-direction: column; gap: 12px; max-height: 400px; overflow-y: auto; }
.news-item { background: rgba(0,0,0,0.3); border-radius: 12px; padding: 12px; border-left: 3px solid #3b82f6; }
.news-title { font-size: 0.9rem; font-weight: 600; color: #60a5fa; text-decoration: none; display: block; margin-bottom: 4px; }
.news-meta { font-size: 0.65rem; color: #71717a; margin-bottom: 6px; }
.news-desc { font-size: 0.75rem; color: #a1a1aa; }
.videos-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(240px, 1fr)); gap: 16px; }
.video-item { background: rgba(0,0,0,0.4); border-radius: 12px; overflow: hidden; cursor: pointer; transition: transform 0.2s; }
.video-item:hover { transform: translateY(-3px); }
.video-item img { width: 100%; height: 130px; object-fit: cover; }
.video-placeholder { width: 100%; height: 130px; background: #1a1a2e; display: flex; align-items: center; justify-content: center; font-size: 2rem; }
.video-info { padding: 10px; }
.video-title { font-size: 0.8rem; font-weight: 600; margin-bottom: 4px; }
.video-channel { font-size: 0.65rem; color: #71717a; }
.sources-list { display: flex; flex-direction: column; gap: 8px; max-height: 400px; overflow-y: auto; }
.source-item { font-size: 0.75rem; padding: 6px 0; display: flex; gap: 8px; align-items: center; flex-wrap: wrap; border-bottom: 1px solid rgba(255,255,255,0.05); }
.source-num { color: #71717a; min-width: 30px; }
.source-link { color: #60a5fa; text-decoration: none; flex: 1; }
.source-domain { font-size: 0.65rem; color: #71717a; }
.stats-footer { background: rgba(0,0,0,0.3); border-radius: 40px; padding: 12px 20px; display: flex; flex-wrap: wrap; justify-content: center; gap: 16px; font-size: 0.7rem; color: #a1a1aa; margin-top: 20px; }
.stats-footer span { padding: 4px 10px; background: rgba(255,255,255,0.05); border-radius: 30px; }
.error-card { text-align: center; padding: 40px; background: rgba(239,68,68,0.1); border-radius: 24px; }
.retry-btn { background: #6366f1; border: none; padding: 10px 24px; border-radius: 50px; color: white; font-weight: 600; cursor: pointer; margin-top: 16px; }
.site-footer { text-align: center; margin-top: 40px; padding-top: 20px; border-top: 1px solid rgba(255,255,255,0.05); font-size: 0.7rem; color: #52525b; }
@media (max-width: 768px) {
    .main-container { padding: 20px 16px; }
    h1 { font-size: 2rem; }
    .search-container { flex-direction: column; background: #181825; border-radius: 28px; padding: 12px; }
    #searchInput { width: 100%; padding: 14px; }
    #searchBtn { width: 100%; margin-top: 10px; }
    .videos-grid { grid-template-columns: 1fr; }
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

console.log('DebateSpace loaded');
