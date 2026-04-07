// ============================================
// DEBATESPACE - CLEAN RESEARCH DISPLAY WITH FIXED YOUTUBE
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
    
    const renderKeyFindings = (findings) => {
        if (!findings || findings.length === 0) return '';
        return `
            <div class="key-findings-section">
                <div class="section-header">
                    <span class="section-icon">📊</span>
                    <span>KEY FINDINGS</span>
                </div>
                <div class="key-findings-list">
                    ${findings.map(finding => `<div class="key-finding">📌 ${finding}</div>`).join('')}
                </div>
            </div>
        `;
    };
    
    const renderCitations = (citations) => {
        if (!citations || citations.length === 0) {
            return '<div class="no-citations">No specific citations found. Try a different search term.</div>';
        }
        return `
            <div class="citations-section">
                <div class="section-header">
                    <span class="section-icon">📋</span>
                    <span>VERIFIED SOURCES & CITATIONS</span>
                </div>
                <div class="citations-list">
                    ${citations.map(citation => `
                        <div class="citation-item">
                            <div class="citation-text">${citation.text}</div>
                            <div class="citation-source">
                                <span class="source-label">${citation.source}</span>
                                <a href="${citation.url}" target="_blank" rel="noopener noreferrer" class="citation-link">🔗 View Source</a>
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    };
    
    const renderYouTube = (videos) => {
        if (!videos || videos.length === 0) {
            return `
                <div class="video-section">
                    <div class="section-header">
                        <span class="section-icon">📺</span>
                        <span>VIDEO EXPLANATIONS</span>
                    </div>
                    <div class="no-videos">No videos found for this topic. Try searching YouTube directly.</div>
                </div>
            `;
        }
        
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
                                <div class="video-title">${v.title}</div>
                                <div class="video-channel">${v.channel}</div>
                                ${v.views ? `<div class="video-views">👁️ ${v.views} views</div>` : ''}
                                ${v.isSearchLink ? '<div class="video-search-badge">🔍 Click to search YouTube</div>' : ''}
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    };
    
    let html = `
        <div class="research-card">
            <div class="research-header">
                <span class="research-icon">✅</span>
                <span>DEEP RESEARCH FINDINGS</span>
            </div>
            <div class="research-summary">${data.research?.summary || 'No summary available'}</div>
            ${renderKeyFindings(data.research?.keyFindings)}
            ${renderCitations(data.research?.citations)}
            <div class="research-tip">📜 Research includes archives, government data, academic sources, and news media. Click any source to verify.</div>
        </div>
        ${renderYouTube(data.youtube)}
        <div class="stats-footer">
            <span>🔍 "${query}"</span>
            <span>📜 ${data.research?.sourceBreakdown?.archives || 0} Archives</span>
            <span>🏛️ ${data.research?.sourceBreakdown?.government || 0} Government</span>
            <span>🎓 ${data.research?.sourceBreakdown?.academic || 0} Academic</span>
            <span>📋 ${data.research?.citations?.length || 0} Citations</span>
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
.research-card {
    background: linear-gradient(135deg, rgba(16, 185, 129, 0.12), rgba(16, 185, 129, 0.05));
    border: 2px solid rgba(16, 185, 129, 0.3);
    border-radius: 24px;
    padding: 28px;
    margin-bottom: 28px;
}
.research-header {
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
.research-icon { font-size: 1.3rem; }
.research-summary {
    font-size: 1rem;
    line-height: 1.6;
    color: #e4e4e7;
    margin-bottom: 20px;
    white-space: pre-wrap;
}
.research-tip {
    font-size: 0.8rem;
    color: #a1a1aa;
    margin-top: 16px;
    padding: 10px;
    background: rgba(0,0,0,0.2);
    border-radius: 10px;
}
.section-header {
    font-size: 1rem;
    font-weight: 700;
    margin-bottom: 16px;
    padding-bottom: 10px;
    border-bottom: 1px solid rgba(255,255,255,0.1);
    display: flex;
    align-items: center;
    gap: 10px;
}
.section-icon { font-size: 1.1rem; }
.citations-section, .key-findings-section, .video-section {
    background: rgba(20, 20, 35, 0.85);
    backdrop-filter: blur(10px);
    border-radius: 20px;
    padding: 24px;
    margin-bottom: 24px;
    border: 1px solid rgba(255, 255, 255, 0.08);
}
.citations-list {
    display: flex;
    flex-direction: column;
    gap: 16px;
}
.citation-item {
    background: rgba(0, 0, 0, 0.3);
    border-radius: 12px;
    padding: 14px 16px;
    border-left: 3px solid #10b981;
}
.citation-text {
    font-size: 0.85rem;
    color: #e4e4e7;
    margin-bottom: 10px;
    line-height: 1.4;
}
.citation-source {
    display: flex;
    justify-content: space-between;
    align-items: center;
    flex-wrap: wrap;
    gap: 10px;
}
.source-label {
    font-size: 0.7rem;
    color: #fbbf24;
}
.citation-link {
    font-size: 0.7rem;
    color: #34d399;
    text-decoration: none;
    padding: 4px 10px;
    background: rgba(16,185,129,0.1);
    border-radius: 20px;
}
.citation-link:hover { background: rgba(16,185,129,0.2); text-decoration: underline; }
.key-findings-list {
    display: flex;
    flex-direction: column;
    gap: 8px;
}
.key-finding {
    font-size: 0.85rem;
    color: #d4d4d8;
    padding: 6px 0;
    border-left: 2px solid #fbbf24;
    padding-left: 12px;
}
.video-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
    gap: 16px;
}
.video-card {
    background: rgba(0, 0, 0, 0.4);
    border-radius: 14px;
    overflow: hidden;
    cursor: pointer;
    transition: transform 0.2s;
}
.video-card:hover { transform: translateY(-3px); }
.video-card img { width: 100%; height: 140px; object-fit: cover; }
.video-placeholder {
    width: 100%;
    height: 140px;
    background: #1a1a2e;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 2.5rem;
}
.video-info { padding: 10px; }
.video-title {
    font-size: 0.8rem;
    font-weight: 600;
    color: #e4e4e7;
    margin-bottom: 4px;
}
.video-channel { font-size: 0.65rem; color: #71717a; }
.video-views { font-size: 0.6rem; color: #71717a; margin-top: 4px; }
.video-search-badge {
    font-size: 0.6rem;
    color: #60a5fa;
    margin-top: 6px;
}
.stats-footer {
    background: rgba(0, 0, 0, 0.3);
    border-radius: 40px;
    padding: 12px 20px;
    display: flex;
    flex-wrap: wrap;
    justify-content: center;
    gap: 20px;
    font-size: 0.7rem;
    color: #a1a1aa;
}
.stats-footer span {
    padding: 4px 10px;
    background: rgba(255,255,255,0.05);
    border-radius: 30px;
}
.no-citations {
    color: #71717a;
    text-align: center;
    padding: 20px;
}
.error-card {
    text-align: center;
    padding: 40px;
    background: rgba(239,68,68,0.1);
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
    .research-card, .citations-section, .video-section { padding: 16px; }
    .video-grid { grid-template-columns: 1fr; }
    .stats-footer { gap: 10px; }
    .citation-source { flex-direction: column; align-items: flex-start; }
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

console.log('DebateSpace loaded - Deep research discovery mode with fixed YouTube');
