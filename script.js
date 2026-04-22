#// DebateSpace Frontend - Deep Research v2

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
    
    // Header stats
    let html = `
        <div class="stats-bar">
            <span>📊 ${data.totalSourcesFound} sources</span>
            <span>🏛️ ${data.governmentSourcesCount} government sources</span>
            <span>🕒 ${new Date(data.timestamp).toLocaleTimeString()}</span>
        </div>
    `;
    
    // AI Analysis Section (with citations)
    if (data.aiAnalysis && data.aiAnalysis.text) {
        let aiText = data.aiAnalysis.text;
        // Convert inline citations to clickable links
        aiText = aiText.replace(/\[source:\s*(https?:\/\/[^\s\]]+)\]/gi, (match, url) => {
            return `<a href="${url}" target="_blank" rel="noopener noreferrer" class="citation-link">[source]</a>`;
        });
        
        html += `
            <div class="card ai-card">
                <div class="card-header">
                    <span class="card-icon">🤖</span>
                    <h2>AI Fact-Check Analysis</h2>
                    <span class="badge">${data.aiAnalysis.modelUsed || 'Groq AI'}</span>
                </div>
                <div class="ai-content">
                    ${aiText.replace(/\n/g, '<br>')}
                </div>
                <div class="card-footer">
                    Based on ${data.aiAnalysis.sourcesUsed} sources (${data.aiAnalysis.governmentSourcesUsed} government)
                </div>
            </div>
        `;
    }
    
    // Deep Research Categories (Statistics, Policy, Economic)
    if (data.research && data.research.categories) {
        const categories = data.research.categories;
        const categoryOrder = ['statistics', 'policy', 'economic'];
        const categoryTitles = {
            statistics: '📈 Key Statistics',
            policy: '⚖️ Policy Findings',
            economic: '💰 Economic Data'
        };
        
        for (const cat of categoryOrder) {
            if (categories[cat] && categories[cat].length > 0) {
                html += `
                    <div class="card category-card">
                        <div class="card-header">
                            <span class="card-icon">${categoryTitles[cat][0]}</span>
                            <h2>${categoryTitles[cat]}</h2>
                        </div>
                        <div class="category-content">
                `;
                for (const item of categories[cat]) {
                    html += `
                        <div class="finding-item">
                            <p>${item.sentence}</p>
                            <a href="${item.url}" target="_blank" rel="noopener noreferrer" class="citation-number">[${item.citationId}]</a>
                        </div>
                    `;
                }
                html += `</div></div>`;
            }
        }
    }
    
    // Compiler Summary
    if (data.research && data.research.compilerSummary) {
        html += `
            <div class="card compiler-card">
                <div class="card-header">
                    <span class="card-icon">📚</span>
                    <h2>Source Compilation</h2>
                </div>
                <div class="compiler-content">
                    <p>${data.research.compilerSummary}</p>
                </div>
            </div>
        `;
    }
    
    // Citations List (detailed)
    if (data.research && data.research.citations && data.research.citations.length > 0) {
        html += `
            <div class="card citations-card">
                <div class="card-header">
                    <span class="card-icon">📄</span>
                    <h2>Verified Source Citations</h2>
                </div>
                <div class="citations-list">
        `;
        for (const citation of data.research.citations.slice(0, 25)) {
            html += `
                <div class="citation-item" id="citation-${citation.id}">
                    <span class="citation-id">[${citation.id}]</span>
                    <div class="citation-details">
                        <strong>${citation.source}</strong><br>
                        <span class="citation-text">${citation.text.substring(0, 200)}...</span><br>
                        <a href="${citation.url}" target="_blank" rel="noopener noreferrer" class="citation-link">🔗 Verify source →</a>
                    </div>
                </div>
            `;
        }
        html += `</div></div>`;
    }
    
    // News Articles
    if (data.newsArticles && data.newsArticles.length > 0) {
        html += `
            <div class="card news-card">
                <div class="card-header">
                    <span class="card-icon">📰</span>
                    <h2>Recent News</h2>
                </div>
                <div class="news-grid">
        `;
        for (const article of data.newsArticles.slice(0, 6)) {
            html += `
                <div class="news-item">
                    <a href="${article.url}" target="_blank" rel="noopener noreferrer">
                        <strong>${article.title}</strong>
                    </a>
                    <div class="news-meta">${article.source} • ${article.date || ''}</div>
                    <p>${article.description || ''}</p>
                </div>
            `;
        }
        html += `</div></div>`;
    }
    
    // Videos
    if (data.videoSources && data.videoSources.length > 0) {
        html += `
            <div class="card video-card">
                <div class="card-header">
                    <span class="card-icon">🎥</span>
                    <h2>Video Explanations</h2>
                </div>
                <div class="video-grid">
        `;
        for (const video of data.videoSources.slice(0, 4)) {
            html += `
                <div class="video-item">
                    <a href="${video.url}" target="_blank" rel="noopener noreferrer">
                        ${video.thumbnail ? `<img src="${video.thumbnail}" alt="${video.title}" class="video-thumb">` : ''}
                        <strong>${video.title}</strong>
                    </a>
                    <div class="video-meta">${video.channel}</div>
                </div>
            `;
        }
        html += `</div></div>`;
    }
    
    // All Sources (fallback)
    if (data.allSources && data.allSources.length > 0) {
        html += `
            <div class="card all-sources-card">
                <div class="card-header">
                    <span class="card-icon">🌐</span>
                    <h2>All Sources (${data.allSources.length})</h2>
                </div>
                <div class="sources-list">
        `;
        for (const src of data.allSources.slice(0, 20)) {
            html += `
                <div class="source-item">
                    <a href="${src.url}" target="_blank" rel="noopener noreferrer">
                        ${src.isGovernment ? '🏛️ ' : '📄 '}${src.title || src.source}
                    </a>
                    <div class="source-meta">${src.source}</div>
                </div>
            `;
        }
        html += `</div></div>`;
    }
    
    resultsDiv.innerHTML = html;
}

function setSearch(query) {
    document.getElementById('searchInput').value = query;
    searchDebate();
}

// Make functions global for inline buttons
window.searchDebate = searchDebate;
window.setSearch = setSearch;