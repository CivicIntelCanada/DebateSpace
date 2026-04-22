// DebateSpace Frontend - With Clickable Citations & Full Answers

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
    
    let html = `
        <div class="stats-bar">
            <span>📊 ${data.totalSourcesFound} sources</span>
            <span>🏛️ ${data.governmentSourcesCount} government sources</span>
            <span>🕒 ${new Date(data.timestamp).toLocaleTimeString()}</span>
        </div>
    `;
    
    // AI ANALYSIS SECTION
    if (data.aiAnalysis && data.aiAnalysis.text) {
        let aiText = data.aiAnalysis.text;
        
        aiText = aiText.replace(/\[(\d+)\]/g, (match, num) => {
            const citation = data.research?.citations?.find(c => c.id == num);
            if (citation && citation.url) {
                return `<a href="${citation.url}" target="_blank" rel="noopener noreferrer" class="clickable-citation">[${num}]</a>`;
            }
            return match;
        });
        
        aiText = aiText.replace(/\[source:\s*(https?:\/\/[^\s\]]+)\]/gi, (match, url) => {
            return `<a href="${url}" target="_blank" rel="noopener noreferrer" class="clickable-citation">[source]</a>`;
        });
        
        html += `
            <div class="ai-section">
                <div class="section-header">
                    <span class="section-icon">🤖</span>
                    <h3>AI Fact-Check Analysis</h3>
                </div>
                <div class="ai-analysis-content">
                    ${aiText.replace(/\n/g, '<br>')}
                </div>
                <div class="analysis-footer">
                    Based on ${data.aiAnalysis.sourcesUsed} sources (${data.aiAnalysis.governmentSourcesUsed} government) • ${data.aiAnalysis.modelUsed}
                </div>
            </div>
        `;
    }
    
    // RESEARCH TEXT
    if (data.research && data.research.text) {
        let researchText = data.research.text;
        
        researchText = researchText.replace(/\[(\d+)\]/g, (match, num) => {
            const citation = data.research.citations?.find(c => c.id == num);
            if (citation && citation.url) {
                return `<a href="${citation.url}" target="_blank" rel="noopener noreferrer" class="clickable-citation">[${num}]</a>`;
            }
            return match;
        });
        
        html += `
            <div class="research-summary">
                <div class="section-header">
                    <span class="section-icon">📚</span>
                    <h3>Research & Findings</h3>
                </div>
                <div class="research-text">
                    ${researchText.replace(/\n/g, '<br>')}
                </div>
            </div>
        `;
    }
    
    // CITATIONS SECTION - FULL ANSWERS, NO TRUNCATION
    if (data.research && data.research.citations && data.research.citations.length > 0) {
        html += `<div class="section-header"><span class="section-icon">📄</span><h3>Verified Source Citations (${data.research.citations.length})</h3></div>`;
        html += `<div class="citations-container">`;
        
        for (const citation of data.research.citations) {
            let fullText = citation.text;
            let fullTitle = citation.title || '';
            
            html += `
                <div class="citation-card" id="citation-${citation.id}">
                    <div class="citation-header">
                        <a href="${citation.url}" target="_blank" rel="noopener noreferrer" class="citation-number-link">[${citation.id}]</a>
                        <strong class="citation-source">${citation.source}</strong>
                    </div>
                    ${fullTitle ? `<div class="citation-title">${fullTitle}</div>` : ''}
                    <div class="citation-full-text">${fullText}</div>
                    <div class="citation-link">
                        <a href="${citation.url}" target="_blank" rel="noopener noreferrer" class="verify-link">🔗 Verify full source →</a>
                    </div>
                </div>
            `;
        }
        html += `</div>`;
    }
    
    // NEWS ARTICLES
    if (data.newsArticles && data.newsArticles.length > 0) {
        html += `<div class="section-header"><span class="section-icon">📰</span><h3>Recent News Articles</h3></div>`;
        html += `<div class="news-grid">`;
        for (const article of data.newsArticles.slice(0, 6)) {
            html += `
                <div class="news-card">
                    <a href="${article.url}" target="_blank" rel="noopener noreferrer">
                        <strong>${article.title}</strong>
                    </a>
                    <div class="news-meta">${article.source} • ${article.date || ''}</div>
                    <p>${article.description || ''}</p>
                </div>
            `;
        }
        html += `</div>`;
    }
    
    // VIDEO EXPLANATIONS
    if (data.videoSources && data.videoSources.length > 0) {
        html += `<div class="section-header"><span class="section-icon">🎥</span><h3>Video Explanations</h3></div>`;
        html += `<div class="videos-grid">`;
        for (const video of data.videoSources.slice(0, 4)) {
            html += `
                <div class="video-card">
                    <a href="${video.url}" target="_blank" rel="noopener noreferrer">
                        ${video.thumbnail ? `<img src="${video.thumbnail}" class="video-thumbnail" alt="${video.title}">` : ''}
                        <strong>${video.title}</strong>
                    </a>
                    <div class="video-channel">${video.channel}</div>
                </div>
            `;
        }
        html += `</div>`;
    }
    
    // ALL SOURCES
    if (data.allSources && data.allSources.length > 0) {
        html += `<div class="section-header"><span class="section-icon">🌐</span><h3>All Sources (${data.allSources.length})</h3></div>`;
        html += `<div class="sources-list">`;
        for (const src of data.allSources.slice(0, 30)) {
            const badge = src.isGovernment ? '🏛️ ' : '📄 ';
            html += `
                <div class="source-item">
                    <a href="${src.url}" target="_blank" rel="noopener noreferrer">${badge}${src.title || src.source}</a>
                    <div class="source-domain">${src.source}</div>
                    ${src.snippet ? `<div class="source-snippet">${src.snippet.substring(0, 150)}...</div>` : ''}
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