// DebateSpace Frontend - with category support

let currentData = null;

async function searchDebate() {
    const query = document.getElementById('searchInput').value.trim();
    if (!query) return;
    
    const loadingDiv = document.getElementById('loading');
    const resultsDiv = document.getElementById('results');
    
    loadingDiv.style.display = 'block';
    resultsDiv.innerHTML = '';
    
    try {
        const response = await fetch(`/api/search?query=${encodeURIComponent(query)}`);
        const data = await response.json();
        currentData = data;
        renderResults(data);
    } catch (error) {
        resultsDiv.innerHTML = `<div class="error-message">❌ Error searching. Please try again.</div>`;
    } finally {
        loadingDiv.style.display = 'none';
    }
}

function renderResults(data) {
    const resultsDiv = document.getElementById('results');
    
    // Stats bar (preserves your original style)
    let html = `
        <div class="stats-bar">
            <span>📊 ${data.totalSourcesFound} sources</span>
            <span>🏛️ ${data.governmentSourcesCount} government sources</span>
            <span>🕒 ${new Date(data.timestamp).toLocaleTimeString()}</span>
        </div>
    `;
    
    // AI Analysis Section (YOUR ORIGINAL FORMAT)
    if (data.aiAnalysis && data.aiAnalysis.text) {
        html += `
            <div class="ai-section">
                <div class="section-header">
                    <span class="section-icon">🤖</span>
                    <h3>AI Analysis of Research</h3>
                </div>
                <div class="ai-analysis-content">
                    ${data.aiAnalysis.text.replace(/\n/g, '<br>')}
                </div>
                <div class="analysis-footer">
                    Based on ${data.aiAnalysis.sourcesUsed} sources (${data.aiAnalysis.governmentSourcesUsed} government) • ${data.aiAnalysis.modelUsed}
                </div>
            </div>
        `;
    }
    
    // NEW: Category sections (Statistics, Policy, Economic)
    if (data.research && data.research.categories) {
        const categories = data.research.categories;
        
        if (categories.statistics && categories.statistics.length > 0) {
            html += `<div class="section-header"><span class="section-icon">📊</span><h3>Key Statistics</h3></div>`;
            for (const stat of categories.statistics) {
                html += `<div class="citation-item"><div class="citation-text">${stat.text.substring(0, 300)}...</div><a href="${stat.url}" target="_blank" class="source-link">🔗 Verify source</a></div>`;
            }
        }
        
        if (categories.policy && categories.policy.length > 0) {
            html += `<div class="section-header"><span class="section-icon">⚖️</span><h3>Policy Findings</h3></div>`;
            for (const policy of categories.policy) {
                html += `<div class="citation-item"><div class="citation-text">${policy.text.substring(0, 300)}...</div><a href="${policy.url}" target="_blank" class="source-link">🔗 Verify source</a></div>`;
            }
        }
        
        if (categories.economic && categories.economic.length > 0) {
            html += `<div class="section-header"><span class="section-icon">💰</span><h3>Economic Data</h3></div>`;
            for (const econ of categories.economic) {
                html += `<div class="citation-item"><div class="citation-text">${econ.text.substring(0, 300)}...</div><a href="${econ.url}" target="_blank" class="source-link">🔗 Verify source</a></div>`;
            }
        }
    }
    
    // Research text (YOUR ORIGINAL)
    if (data.research && data.research.text) {
        html += `
            <div class="research-summary">
                <div class="section-header">
                    <span class="section-icon">📚</span>
                    <h3>Research & Findings</h3>
                </div>
                <p>${data.research.text}</p>
            </div>
        `;
    }
    
    // Citations (YOUR ORIGINAL FORMAT)
    if (data.research && data.research.citations && data.research.citations.length > 0) {
        html += `<div class="section-header"><span class="section-icon">📄</span><h3>Source Citations (${data.research.citations.length})</h3></div>`;
        html += `<div class="citations-container">`;
        for (const citation of data.research.citations) {
            html += `
                <div class="citation-card" id="citation-${citation.id}">
                    <div class="citation-header">
                        <span class="citation-number">[${citation.id}]</span>
                        <strong>${citation.source}</strong>
                    </div>
                    <div class="citation-snippet">${citation.text}</div>
                    <div class="citation-link">
                        <a href="${citation.url}" target="_blank" rel="noopener noreferrer">🔗 Verify source →</a>
                    </div>
                </div>
            `;
        }
        html += `</div>`;
    }
    
    // News (YOUR ORIGINAL)
    if (data.newsArticles && data.newsArticles.length > 0) {
        html += `<div class="section-header"><span class="section-icon">📰</span><h3>Recent News Articles</h3></div>`;
        html += `<div class="news-grid">`;
        for (const article of data.newsArticles) {
            html += `
                <div class="news-card">
                    <a href="${article.url}" target="_blank" rel="noopener noreferrer"><strong>${article.title}</strong></a>
                    <div class="news-meta">${article.source} • ${article.date || ''}</div>
                    <p>${article.description || ''}</p>
                </div>
            `;
        }
        html += `</div>`;
    }
    
    // Videos (YOUR ORIGINAL)
    if (data.videoSources && data.videoSources.length > 0) {
        html += `<div class="section-header"><span class="section-icon">🎥</span><h3>Video Explanations</h3></div>`;
        html += `<div class="videos-grid">`;
        for (const video of data.videoSources) {
            html += `
                <div class="video-card">
                    <a href="${video.url}" target="_blank" rel="noopener noreferrer">
                        ${video.thumbnail ? `<img src="${video.thumbnail}" class="video-thumbnail" alt="">` : ''}
                        <strong>${video.title}</strong>
                    </a>
                    <div class="video-channel">${video.channel}</div>
                </div>
            `;
        }
        html += `</div>`;
    }
    
    // All Sources (YOUR ORIGINAL)
    if (data.allSources && data.allSources.length > 0) {
        html += `<div class="section-header"><span class="section-icon">🌐</span><h3>All Sources (${data.allSources.length})</h3></div>`;
        html += `<div class="sources-list">`;
        for (const src of data.allSources) {
            const badge = src.isGovernment ? '🏛️ ' : '📄 ';
            html += `
                <div class="source-item">
                    <a href="${src.url}" target="_blank" rel="noopener noreferrer">${badge}${src.title || src.source}</a>
                    <div class="source-domain">${src.source}</div>
                </div>
            `;
        }
        html += `</div>`;
    }
    
    resultsDiv.innerHTML = html;
}

function setSearch(query) {
    document.getElementById('searchInput').value = query;
    searchDebate();
}

window.searchDebate = searchDebate;
window.setSearch = setSearch;