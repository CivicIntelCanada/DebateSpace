// ============================================
// DEBATESPACE - DISPLAY WITH WORKING AI ANALYSIS
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
    const formatWithCitations = (text, citations) => {
        if (!text) return '<p>No information available.</p>';
        let formatted = text;
        formatted = formatted.replace(/\[(\d+)\]/g, (match, num) => {
            const citation = citations?.find(c => c.id == num);
            if (citation) {
                return `<a href="${citation.url}" target="_blank" class="citation-link-inline" title="${citation.source}">[${num}]</a>`;
            }
            return match;
        });
        const paragraphs = formatted.split(/\n\n+/);
        return paragraphs.map(p => `<p>${p.replace(/\n/g, '<br>')}</p>`).join('');
    };
    
    const renderCitations = (citations) => {
        if (!citations || citations.length === 0) return '<div class="no-citations">No citations found.</div>';
        return `
            <div class="citations-section">
                <div class="section-header"><span class="section-icon">📋</span><span>SOURCE CITATIONS (${citations.length})</span></div>
                <div class="citations-list">
                    ${citations.map(c => `
                        <div class="citation-item">
                            <div class="citation-id">[${c.id}]</div>
                            <div class="citation-content">
                                <div class="citation-text">${c.text}</div>
                                <div class="citation-source"><span class="source-label">${c.source}</span><a href="${c.url}" target="_blank" class="citation-link">🔗 View Source</a></div>
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    };
    
    const renderAIAnalysis = (analysis) => {
        if (!analysis || !analysis.text) return '';
        return `
            <div class="ai-card">
                <div class="ai-header"><span class="ai-icon">🤖</span><span>AI ANALYSIS OF RESEARCH</span><span class="ai-badge">${analysis.modelUsed || 'AI'}</span></div>
                <div class="ai-text">${analysis.text}</div>
                ${analysis.disclaimer ? `<div class="ai-disclaimer">${analysis.disclaimer}</div>` : ''}
                <div class="ai-footer">📊 Based on ${analysis.sourcesUsed || 0} research sources</div>
            </div>
        `;
    };
    
    const renderNews = (articles) => {
        if (!articles || articles.length === 0) return '';
        return `
            <div class="news-section">
                <div class="section-header"><span class="section-icon">📰</span><span>NEWS ARTICLES (${articles.length})</span></div>
                <div class="news-list">${articles.map(a => `
                    <div class="news-item">
                        <a href="${a.url}" target="_blank" class="news-title">${a.title}</a>
                        <div class="news-meta"><span class="news-source">📌 ${a.source}</span>${a.date ? `<span class="news-date">📅 ${a.date}</span>` : ''}</div>
                        ${a.description ? `<div class="news-description">${a.description}...</div>` : ''}
                    </div>
                `).join('')}</div>
            </div>
        `;
    };
    
    const renderVideos = (videos) => {
        if (!videos || videos.length === 0) return '';
        return `
            <div class="video-section">
                <div class="section-header"><span class="section-icon">📺</span><span>VIDEOS (${videos.length})</span></div>
                <div class="video-grid">${videos.map(v => `
                    <div class="video-card" onclick="window.open('${v.url}', '_blank')">
                        ${v.thumbnail ? `<img src="${v.thumbnail}">` : '<div class="video-placeholder">🎬</div>'}
                        <div class="video-info"><div class="video-title">${v.title}</div><div class="video-channel">${v.channel}</div></div>
                    </div>
                `).join('')}</div>
            </div>
        `;
    };
    
    const renderAllSources = (sources) => {
        if (!sources || sources.length === 0) return '';
        return `
            <div class="sources-section">
                <div class="section-header"><span class="section-icon">📚</span><span>ALL SOURCES (${sources.length})</span></div>
                <div class="sources-list">${sources.map((s, i) => `
                    <div class="source-item"><span class="source-num">${i+1}.</span><span class="source-type">${s.isGovernment ? '🏛️' : s.type === 'archive' ? '📜' : '🌐'}</span><a href="${s.url}" target="_blank" class="source-link">${s.title || s.snippet?.substring(0, 80)}</a><span class="source-domain">${s.source}</span></div>
                `).join('')}</div>
            </div>
        `;
    };
    
    let html = `
        ${renderAIAnalysis(data.aiAnalysis)}
        <div class="research-card">
            <div class="research-header"><span class="research-icon">✅</span><span>RESEARCH FINDINGS WITH CITATIONS</span></div>
            <div class="research-text">${formatWithCitations(data.research?.text, data.research?.citations)}</div>
            <div class="research-footer"><span class="evidence-count">📊 ${data.research?.evidenceCount || 0} Sources (${data.research?.governmentCount || 0} Government)</span><span class="citation-note">💡 Click [numbers] to verify sources</span></div>
        </div>
        ${renderCitations(data.research?.citations)}
        ${renderNews(data.newsArticles)}
        ${renderVideos(data.videoSources)}
        ${renderAllSources(data.allSources)}
        <div class="stats-footer"><span>🔍 "${query}"</span><span>🏛️ ${data.allSources?.filter(s => s.isGovernment).length || 0} Gov</span><span>📜 ${data.allSources?.filter(s => s.type === "archive").length || 0} Archive</span><span>📰 ${data.newsArticles?.length || 0} News</span><span>📺 ${data.videoSources?.length || 0} Videos</span><span>📋 ${data.research?.citations?.length || 0} Citations</span></div>
    `;
    
    container.innerHTML = html;
}

function setSearch(topic) {
    document.getElementById('searchInput').value = topic;
    searchDebate();
}

// Styles
const styles = `
<style>
.ai-card {
    background: linear-gradient(135deg, rgba(139, 92, 246, 0.12), rgba(139, 92, 246, 0.05));
    border: 2px solid rgba(139, 92, 246, 0.3);
    border-radius: 24px;
    padding: 28px;
    margin-bottom: 28px;
}
.ai-header {
    font-size: 1.2rem;
    font-weight: 700;
    color: #a78bfa;
    margin-bottom: 16px;
    padding-bottom: 10px;
    border-bottom: 2px solid rgba(139, 92, 246, 0.3);
    display: flex;
    align-items: center;
    gap: 10px;
    flex-wrap: wrap;
}
.ai-icon { font-size: 1.3rem; }
.ai-badge { font-size: 0.7rem; background: rgba(139,92,246,0.2); padding: 4px 12px; border-radius: 20px; color: #c4b5fd; margin-left: auto; }
.ai-text { font-size: 1rem; line-height: 1.6; color: #e4e4e7; margin-bottom: 16px; }
.ai-disclaimer { font-size: 0.7rem; color: #71717a; margin-top: 12px; padding: 8px; background: rgba(0,0,0,0.2); border-radius: 8px; }
.ai-footer { margin-top: 16px; padding-top: 12px; border-top: 1px solid rgba(255,255,255,0.1); font-size: 0.7rem; color: #a1a1aa; }
.research-card {
    background: linear-gradient(135deg, rgba(16, 185, 129, 0.12), rgba(16, 185, 129, 0.05));
    border: 2px solid rgba(16, 185, 129, 0.3);
    border-radius: 24px;
    padding: 28px;
    margin-bottom: 28px;
}
.research-header { font-size: 1.2rem; font-weight: 700; color: #10b981; margin-bottom: 16px; padding-bottom: 10px; border-bottom: 2px solid rgba(16,185,129,0.3); display: flex; align-items: center; gap: 10px; }
.research-icon { font-size: 1.3rem; }
.research-text { font-size: 1rem; line-height: 1.6; color: #e4e4e7; margin-bottom: 20px; }
.research-text p { margin-bottom: 12px; }
.citation-link-inline { display: inline-block; color: #fbbf24; text-decoration: none; font-weight: bold; padding: 0 2px; font-size: 0.85rem; }
.citation-link-inline:hover { text-decoration: underline; color: #34d399; }
.research-footer { display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 16px; padding-top: 16px; border-top: 1px solid rgba(255,255,255,0.1); font-size: 0.75rem; color: #a1a1aa; }
.evidence-count { background: rgba(16,185,129,0.15); padding: 4px 12px; border-radius: 20px; }
.citation-note { color: #71717a; }
.section-header { font-size: 1rem; font-weight: 700; margin-bottom: 16px; padding-bottom: 10px; border-bottom: 1px solid rgba(255,255,255,0.1); display: flex; align-items: center; gap: 10px; }
.section-icon { font-size: 1.1rem; }
.citations-section, .news-section, .video-section, .sources-section {
    background: rgba(20, 20, 35, 0.85);
    backdrop-filter: blur(10px);
    border-radius: 20px;
    padding: 24px;
    margin-bottom: 24px;
    border: 1px solid rgba(255,255,255,0.08);
}
.citations-list { display: flex; flex-direction: column; gap: 16px; max-height: 600px; overflow-y: auto; }
.citation-item { background: rgba(0,0,0,0.3); border-radius: 12px; padding: 14px 16px; display: flex; gap: 12px; border-left: 3px solid #10b981; }
.citation-id { font-size: 0.9rem; font-weight: bold; color: #fbbf24; min-width: 40px; }
.citation-content { flex: 1; }
.citation-text { font-size: 0.85rem; color: #e4e4e7; margin-bottom: 8px; line-height: 1.4; }
.citation-source { display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 10px; }
.source-label { font-size: 0.7rem; color: #fbbf24; }
.citation-link { font-size: 0.7rem; color: #34d399; text-decoration: none; padding: 4px 10px; background: rgba(16,185,129,0.1); border-radius: 20px; }
.news-list { display: flex; flex-direction: column; gap: 16px; max-height: 500px; overflow-y: auto; }
.news-item { background: rgba(0,0,0,0.3); border-radius: 12px; padding: 14px 16px; border-left: 3px solid #3b82f6; }
.news-title { font-size: 0.9rem; font-weight: 600; color: #60a5fa; text-decoration: none; display: block; margin-bottom: 6px; }
.news-title:hover { text-decoration: underline; }
.news-meta { display: flex; gap: 16px; margin-bottom: 8px; }
.news-source, .news-date { font-size: 0.65rem; color: #71717a; }
.news-description { font-size: 0.75rem; color: #a1a1aa; }
.video-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); gap: 16px; }
.video-card { background: rgba(0,0,0,0.4); border-radius: 14px; overflow: hidden; cursor: pointer; transition: transform 0.2s; }
.video-card:hover { transform: translateY(-3px); }
.video-card img { width: 100%; height: 140px; object-fit: cover; }
.video-placeholder { width: 100%; height: 140px; background: #1a1a2e; display: flex; align-items: center; justify-content: center; font-size: 2.5rem; }
.video-info { padding: 10px; }
.video-title { font-size: 0.8rem; font-weight: 600; color: #e4e4e7; margin-bottom: 4px; }
.video-channel { font-size: 0.65rem; color: #71717a; }
.sources-list { display: flex; flex-direction: column; gap: 8px; max-height: 500px; overflow-y: auto; }
.source-item { font-size: 0.75rem; padding: 8px 0; display: flex; gap: 10px; align-items: center; flex-wrap: wrap; border-bottom: 1px solid rgba(255,255,255,0.05); }
.source-num { color: #71717a; min-width: 30px; font-size: 0.7rem; }
.source-type { font-size: 0.8rem; min-width: 30px; }
.source-link { color: #60a5fa; text-decoration: none; flex: 1; font-size: 0.8rem; }
.source-link:hover { text-decoration: underline; }
.source-domain { font-size: 0.65rem; color: #71717a; max-width: 200px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.stats-footer { background: rgba(0,0,0,0.3); border-radius: 40px; padding: 12px 20px; display: flex; flex-wrap: wrap; justify-content: center; gap: 20px; font-size: 0.7rem; color: #a1a1aa; }
.stats-footer span { padding: 4px 10px; background: rgba(255,255,255,0.05); border-radius: 30px; }
.no-citations { color: #71717a; text-align: center; padding: 20px; }
.error-card { text-align: center; padding: 40px; background: rgba(239,68,68,0.1); border-radius: 24px; }
.retry-btn { background: #6366f1; border: none; padding: 10px 24px; border-radius: 50px; color: white; font-weight: 600; cursor: pointer; margin-top: 16px; }
@media (max-width: 768px) {
    .ai-card, .research-card, .citations-section, .news-section, .video-section, .sources-section { padding: 16px; }
    .stats-footer { gap: 10px; }
    .citation-item { flex-direction: column; }
    .citation-source { flex-direction: column; align-items: flex-start; }
    .source-item { flex-wrap: wrap; }
    .source-domain { max-width: none; white-space: normal; }
    .research-footer { flex-direction: column; align-items: flex-start; }
    .ai-header { flex-direction: column; align-items: flex-start; }
    .ai-badge { margin-left: 0; }
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

console.log('DebateSpace loaded - AI analysis of research');
