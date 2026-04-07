// ============================================
// DEBATESPACE - FACT CHECK FRONTEND
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
        if (!claims || claims.length === 0) return '';
        return `
            <div class="cited-claims">
                <div class="claims-header">📋 VERIFIED CLAIMS WITH SOURCES:</div>
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
    
    const renderGovernmentSources = (sources) => {
        if (!sources || sources.length === 0) return `
            <div class="government-section">
                <div class="section-header"><span class="section-icon">🏛️</span><span>GOVERNMENT & OFFICIAL SOURCES</span></div>
                <div class="no-sources">No government sources found. Try a different search term.</div>
            </div>
        `;
        return `
            <div class="government-section">
                <div class="section-header"><span class="section-icon">🏛️</span><span>GOVERNMENT & OFFICIAL SOURCES</span></div>
                <div class="sources-grid">
                    ${sources.map(s => `
                        <a href="${s.url}" target="_blank" class="source-card gov-card">
                            <strong class="source-domain">${s.name}</strong>
                            <span class="source-title">${s.title}</span>
                        </a>
                    `).join('')}
                </div>
            </div>
        `;
    };
    
    const renderNewsArticles = (articles) => {
        if (!articles || articles.length === 0) return `
            <div class="news-section">
                <div class="section-header"><span class="section-icon">📰</span><span>NEWS ARTICLES</span></div>
                <div class="no-news">No news articles found for this topic</div>
            </div>
        `;
        return `
            <div class="news-section">
                <div class="section-header"><span class="section-icon">📰</span><span>NEWS ARTICLES</span></div>
                <div class="sources-grid">
                    ${articles.map(a => `
                        <a href="${a.url}" target="_blank" class="source-card news-card">
                            <strong class="source-domain">${a.name}</strong>
                            <span class="source-title">${a.title}</span>
                            ${a.date ? `<span class="source-date">📅 ${a.date}</span>` : ''}
                        </a>
                    `).join('')}
                </div>
            </div>
        `;
    };
    
    const renderYouTube = (videos) => {
        if (!videos || videos.length === 0) return '';
        return `
            <div class="video-section">
                <div class="section-header"><span class="section-icon">📺</span><span>VIDEO EXPLANATIONS</span></div>
                <div class="video-grid">
                    ${videos.map(v => `
                        <div class="video-card" onclick="window.open('${v.url}', '_blank')">
                            ${v.thumbnail ? `<img src="${v.thumbnail}">` : '<div class="video-placeholder">🎬</div>'}
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
            <div class="fact-header"><span class="fact-icon">✅</span><span>FACT CHECK & ANSWER</span></div>
            <div class="fact-verdict">${data.factCheck?.verdict || '🔍 INFORMATION FOUND'}</div>
            <div class="fact-summary">${data.factCheck?.summary || 'No fact check available'}</div>
            ${renderCitedClaims(data.factCheck?.citedClaims)}
            ${data.factCheck?.tip ? `<div class="fact-tip">💡 ${data.factCheck.tip}</div>` : ''}
        </div>
        ${renderGovernmentSources(data.factCheck?.governmentSources)}
        ${renderNewsArticles(data.newsArticles)}
        ${renderYouTube(data.youtube)}
        <div class="stats-footer">
            <span>🔍 "${query}"</span>
            <span>🏛️ ${data.factCheck?.governmentSources?.length || 0} Government Sources</span>
            <span>📰 ${data.newsArticles?.length || 0} News Articles</span>
            <span>📺 ${data.youtube?.length || 0} Videos</span>
            <span>📋 ${data.factCheck?.citedClaims?.length || 0} Verified Claims</span>
        </div>
    `;
    
    container.innerHTML = html;
}

function setSearch(topic) {
    document.getElementById('searchInput').value = topic;
    searchDebate();
}

window.searchDebate = searchDebate;
window.setSearch = setSearch;

document.getElementById('searchInput')?.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') searchDebate();
});

console.log('DebateSpace loaded - Ready to search!');
