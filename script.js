// ============================================
// DEBATESPACE - DEEP RESEARCH DISPLAY
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
        resultsDiv.innerHTML = `
            <div class="error-card">
                <div class="error-icon">⚠️</div>
                <h3>Unable to fetch results</h3>
                <p>${error.message}</p>
                <button onclick="searchDebate()" class="retry-btn">Try Again</button>
            </div>
        `;
    } finally {
        loading.style.display = 'none';
    }
}

function renderResults(data, query) {
    const container = document.getElementById('results');
    
    const renderCitedClaims = (claims) => {
        if (!claims || claims.length === 0) {
            return '<div class="no-claims">🔍 No specific claims found. Try a different search term.</div>';
        }
        return `
            <div class="cited-claims">
                <div class="claims-header">📋 VERIFIED SOURCES & GOVERNMENT DATA:</div>
                <div class="claims-list">
                    ${claims.map(claim => `
                        <div class="claim-item ${claim.priority === 'government' ? 'gov-claim' : ''}">
                            <span class="claim-text">${claim.claim.length > 350 ? claim.claim.substring(0, 350) + '...' : claim.claim}</span>
                            <a href="${claim.url}" target="_blank" rel="noopener noreferrer" class="claim-source">🔗 ${claim.source}</a>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    };
    
    const renderYouTube = (videos) => {
        if (!videos || videos.length === 0) return '';
        return `
            <div class="video-section">
                <div class="section-header">
                    <span class="section-icon">📺</span>
                    <span>VIDEO EXPLANATIONS</span>
                </div>
                <div class="video-grid">
                    ${videos.map(v => `
                        <div class="video-card" onclick="window.open('${v.url}', '_blank')">
                            ${v.thumbnail ? `<img src="${v.thumbnail}" alt="${v.title}">` : '<div class="video-placeholder">🎬</div>'}
                            <div class="video-info">
                                <div class="video-title">${v.title.length > 60 ? v.title.substring(0,60)+'...' : v.title}</div>
                                <div class="video-channel">${v.channel}</div>
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    };
    
    let html = `
        <div class="fact-card">
            <div class="fact-header">
                <span class="fact-icon">✅</span>
                <span>DEEP RESEARCH & FACT CHECK</span>
            </div>
            <div class="fact-verdict">${data.factCheck?.verdict || '🔍 RESEARCH FINDINGS'}</div>
            <div class="fact-summary">${data.factCheck?.summary || 'No information available'}</div>
            ${renderCitedClaims(data.factCheck?.citedClaims)}
            ${data.factCheck?.tip ? `<div class="fact-tip">💡 ${data.factCheck.tip}</div>` : ''}
        </div>
        ${renderYouTube(data.youtube)}
        <div class="stats-footer">
            <span>🔍 "${query}"</span>
            <span>🏛️ ${data.factCheck?.sourceCount?.government || 0} Government Sources</span>
            <span>📚 ${data.factCheck?.sourceCount?.archive || 0} Archive Sources</span>
            <span>📋 ${data.factCheck?.sourceCount?.total || 0} Total Sources</span>
            <span>📺 ${data.youtube?.length || 0} Videos</span>
        </div>
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
.fact-card {
    background: linear-gradient(135deg, rgba(16, 185, 129, 0.12), rgba(16, 185, 129, 0.05));
    border: 2px solid rgba(16, 185, 129, 0.3);
    border-radius: 24px;
    padding: 28px;
    margin-bottom: 28px;
}
.fact-header {
    font-size: 1.2rem;
    font-weight: 700;
    color: #10b981;
    margin-bottom: 16px;
    padding-bottom: 10px;
    border-bottom: 2px solid rgba(16, 185, 129, 0.3);
    display: flex;
    align-items: center;
    gap: 10px;
}
.fact-icon { font-size: 1.3rem; }
.fact-verdict {
    font-size: 1rem;
    font-weight: 600;
    color: #fbbf24;
    margin-bottom: 12px;
    padding: 6px 12px;
    background: rgba(0,0,0,0.3);
    display: inline-block;
    border-radius: 20px;
}
.fact-summary {
    font-size: 1rem;
    line-height: 1.6;
    color: #e4e4e7;
    margin-bottom: 20px;
    white-space: pre-wrap;
}
.fact-tip {
    font-size: 0.8rem;
    color: #a1a1aa;
    margin-top: 16px;
    padding: 10px;
    background: rgba(0,0,0,0.2);
    border-radius: 10px;
}
.cited-claims {
    margin-top: 20px;
    padding-top: 16px;
    border-top: 1px solid rgba(255,255,255,0.1);
}
.claims-header {
    font-size: 0.8rem;
    color: #fbbf24;
    margin-bottom: 12px;
    font-weight: 600;
}
.claims-list { display: flex; flex-direction: column; gap: 12px; }
.claim-item {
    background: rgba(0, 0, 0, 0.3);
    border-radius: 12px;
    padding: 14px 16px;
    border-left: 3px solid #10b981;
    transition: transform 0.2s;
}
.claim-item:hover { transform: translateX(4px); background: rgba(16, 185, 129, 0.05); }
.gov-claim { border-left-color: #fbbf24; }
.claim-text { display: block; font-size: 0.85rem; color: #e4e4e7; margin-bottom: 10px; line-height: 1.4; }
.claim-source {
    display: inline-block;
    font-size: 0.7rem;
    color: #34d399;
    text-decoration: none;
    padding: 5px 10px;
    background: rgba(16, 185, 129, 0.1);
    border-radius: 8px;
}
.claim-source:hover { background: rgba(16, 185, 129, 0.2); text-decoration: underline; }
.video-section {
    background: rgba(20, 20, 35, 0.85);
    backdrop-filter: blur(10px);
    border-radius: 24px;
    padding: 24px;
    margin-bottom: 28px;
    border: 1px solid rgba(255, 255, 255, 0.08);
}
.section-header {
    font-size: 1rem;
    font-weight: 700;
    margin-bottom: 20px;
    padding-bottom: 12px;
    border-bottom: 1px solid rgba(255, 255, 255, 0.1);
    display: flex;
    align-items: center;
    gap: 10px;
}
.section-icon { font-size: 1.2rem; }
.video-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
    gap: 20px;
}
.video-card {
    background: rgba(0, 0, 0, 0.4);
    border-radius: 16px;
    overflow: hidden;
    cursor: pointer;
    transition: transform 0.2s;
}
.video-card:hover { transform: translateY(-4px); }
.video-card img { width: 100%; height: 160px; object-fit: cover; }
.video-placeholder {
    width: 100%;
    height: 160px;
    background: #1a1a2e;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 3rem;
}
.video-info { padding: 12px; }
.video-title {
    font-size: 0.8rem;
    font-weight: 600;
    color: #e4e4e7;
    margin-bottom: 4px;
    line-height: 1.3;
}
.video-channel { font-size: 0.65rem; color: #71717a; }
.stats-footer {
    background: rgba(0, 0, 0, 0.3);
    border-radius: 40px;
    padding: 14px 24px;
    display: flex;
    flex-wrap: wrap;
    justify-content: center;
    gap: 24px;
    font-size: 0.75rem;
    color: #a1a1aa;
    margin-top: 20px;
}
.stats-footer span {
    padding: 4px 12px;
    background: rgba(255, 255, 255, 0.05);
    border-radius: 30px;
}
.no-claims {
    color: #71717a;
    text-align: center;
    padding: 20px;
    font-size: 0.85rem;
}
.error-card {
    text-align: center;
    padding: 50px;
    background: rgba(239, 68, 68, 0.1);
    border-radius: 24px;
}
.retry-btn {
    background: #6366f1;
    border: none;
    padding: 10px 24px;
    border-radius: 50px;
    color: white;
    font-weight: 600;
    cursor: pointer;
    margin-top: 16px;
}
@media (max-width: 768px) {
    .fact-card, .video-section { padding: 18px; }
    .video-grid { grid-template-columns: 1fr; }
    .stats-footer { gap: 12px; }
    .claim-item { padding: 10px 12px; }
    .claim-text { font-size: 0.8rem; }
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

console.log('DebateSpace loaded - Deepest research mode');
