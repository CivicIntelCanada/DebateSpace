// ============================================
// DEBATESPACE - DISPLAY WITH GUARANTEED YOUTUBE
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
                <div class="claims-header">📋 VERIFIED SOURCES & DATA:</div>
                <div class="claims-list">
                    ${claims.map(claim => `
                        <div class="claim-item">
                            <span class="claim-text">${claim.claim}</span>
                            <a href="${claim.url}" target="_blank" rel="noopener noreferrer" class="claim-source">🔗 ${claim.source}</a>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    };
    
    const renderKeyDataPoints = (points) => {
        if (!points || points.length === 0) return '';
        return `
            <div class="key-data-section">
                <div class="section-header">
                    <span class="section-icon">📊</span>
                    <span>KEY DATA POINTS</span>
                </div>
                <div class="key-data-list">
                    ${points.map(point => `<div class="key-data-item">📌 ${point}</div>`).join('')}
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
                                ${v.views && v.views !== 'N/A' ? `<div class="video-views">👁️ ${v.views} views</div>` : ''}
                                ${v.isSearchLink ? '<div class="video-search-badge">🔍 Click to search YouTube</div>' : ''}
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
                <span>COMPREHENSIVE RESEARCH</span>
            </div>
            <div class="fact-verdict">${data.factCheck?.verdict || '🔍 RESEARCH FINDINGS'}</div>
            <div class="fact-summary">${data.factCheck?.summary || 'No information available'}</div>
            ${data.factCheck?.detailedAnalysis ? `<div class="detailed-analysis"><strong>📋 DETAILED ANALYSIS:</strong><br>${data.factCheck.detailedAnalysis}</div>` : ''}
            ${renderKeyDataPoints(data.factCheck?.keyDataPoints)}
            ${renderCitedClaims(data.factCheck?.citedClaims)}
            ${data.factCheck?.tip ? `<div class="fact-tip">💡 ${data.factCheck.tip}</div>` : ''}
        </div>
        ${renderYouTube(data.youtube)}
        <div class="stats-footer">
            <span>🔍 "${query}"</span>
            <span>🏛️ ${data.factCheck?.sourceBreakdown?.government || 0} Government Sources</span>
            <span>🎓 ${data.factCheck?.sourceBreakdown?.academic || 0} Academic Sources</span>
            <span>📰 ${data.factCheck?.sourceBreakdown?.news || 0} News Sources</span>
            <span>📋 ${data.factCheck?.sourceBreakdown?.total || 0} Total Sources</span>
            <span>📺 ${data.youtube?.length || 0} Videos</span>
        </div>
    `;
    
    container.innerHTML = html;
}

function setSearch(topic) {
    document.getElementById('searchInput').value = topic;
    searchDebate();
}

// Styles (abbreviated for space - same as before with additional styles)
const styles = `
<style>
/* ... (same base styles as before) ... */
.detailed-analysis {
    background: rgba(0,0,0,0.2);
    border-radius: 12px;
    padding: 16px;
    margin: 16px 0;
    font-size: 0.9rem;
    line-height: 1.5;
}
.key-data-section {
    background: rgba(16, 185, 129, 0.08);
    border-radius: 12px;
    padding: 16px;
    margin: 16px 0;
}
.key-data-list {
    display: flex;
    flex-direction: column;
    gap: 8px;
}
.key-data-item {
    font-size: 0.85rem;
    color: #d4d4d8;
    padding: 4px 0;
}
.video-search-badge {
    font-size: 0.6rem;
    color: #60a5fa;
    margin-top: 6px;
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

console.log('DebateSpace loaded - Maximum depth research with guaranteed YouTube');
