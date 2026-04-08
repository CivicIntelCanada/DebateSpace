// DebateSpace - Main Application Script

const searchForm = document.getElementById('searchForm');
const searchInput = document.getElementById('searchInput');
const searchBtn = document.getElementById('searchBtn');
const loadingDiv = document.getElementById('loading');
const errorDiv = document.getElementById('error');
const resultsDiv = document.getElementById('results');

searchForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const query = searchInput.value.trim();
    if (!query) return;
    
    await performSearch(query);
});

async function performSearch(query) {
    // Show loading
    loadingDiv.style.display = 'block';
    document.getElementById('loadingQuery').textContent = query;
    errorDiv.style.display = 'none';
    resultsDiv.style.display = 'none';
    searchBtn.disabled = true;
    
    try {
        const response = await fetch(`/api/search?query=${encodeURIComponent(query)}`);
        const data = await response.json();
        
        if (data.success) {
            displayResults(data);
        } else {
            showError('Failed to fetch results. Please try again.');
        }
    } catch (err) {
        console.error('Error:', err);
        showError('Network error. Please check your connection and try again.');
    } finally {
        loadingDiv.style.display = 'none';
        searchBtn.disabled = false;
    }
}

function showError(message) {
    errorDiv.textContent = `⚠️ ${message}`;
    errorDiv.style.display = 'block';
    resultsDiv.style.display = 'none';
}

function displayResults(data) {
    let html = '';
    
    // ========================================
    // RESEARCH SUMMARY SECTION (NO AI)
    // ========================================
    if (data.researchSummary && data.researchSummary.text) {
        html += `
            <div class="card summary-card">
                <div class="card-header">
                    <h2>📋 RESEARCH SUMMARY</h2>
                    <span class="badge no-ai">No AI · Rule Based</span>
                </div>
                <div class="summary-content">
                    ${formatSummaryText(data.researchSummary.text)}
                </div>
                <div class="card-footer">
                    <small>📊 Analyzed ${data.researchSummary.sourcesUsed || 0} sources • ${data.researchSummary.method || 'Rule-based'}</small>
                </div>
            </div>
        `;
    }
    
    // ========================================
    // RESEARCH FINDINGS WITH CITATIONS
    // ========================================
    if (data.research && data.research.citations && data.research.citations.length > 0) {
        html += `
            <div class="card research-card">
                <div class="card-header">
                    <h2>📄 RESEARCH FINDINGS WITH CITATIONS</h2>
                    <span class="badge">${data.research.governmentCount || 0} Government Sources</span>
                </div>
                <div class="research-text">
                    <p>${escapeHtml(data.research.text || '')}</p>
                </div>
                <div class="citations-list">
                    <h3>Source Citations:</h3>
                    ${data.research.citations.map(citation => `
                        <div class="citation-item" id="citation-${citation.id}">
                            <span class="citation-number">[${citation.id}]</span>
                            <div class="citation-details">
                                <p class="citation-text">${escapeHtml(citation.text)}</p>
                                <a href="${citation.url}" target="_blank" rel="noopener noreferrer" class="citation-source">
                                    📎 ${escapeHtml(citation.source)}
                                </a>
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    }
    
    // ========================================
    // NEWS ARTICLES
    // ========================================
    if (data.newsArticles && data.newsArticles.length > 0) {
        html += `
            <div class="card news-card-section">
                <div class="card-header">
                    <h2>📰 NEWS ARTICLES</h2>
                </div>
                <div class="news-grid">
                    ${data.newsArticles.map(article => `
                        <a href="${article.url}" target="_blank" rel="noopener noreferrer" class="news-item">
                            <h3>${escapeHtml(article.title)}</h3>
                            <p>${escapeHtml(article.description || '')}</p>
                            <div class="news-meta">
                                <span>${escapeHtml(article.source)}</span>
                                ${article.date ? `<span>${article.date}</span>` : ''}
                            </div>
                        </a>
                    `).join('')}
                </div>
            </div>
        `;
    }
    
    // ========================================
    // VIDEO SOURCES
    // ========================================
    if (data.videoSources && data.videoSources.length > 0) {
        html += `
            <div class="card video-card-section">
                <div class="card-header">
                    <h2>🎥 VIDEO EXPLANATIONS</h2>
                </div>
                <div class="video-grid">
                    ${data.videoSources.map(video => `
                        <a href="${video.url}" target="_blank" rel="noopener noreferrer" class="video-item">
                            ${video.thumbnail ? `<img src="${video.thumbnail}" alt="${escapeHtml(video.title)}">` : ''}
                            <h3>${escapeHtml(video.title)}</h3>
                            <p>${escapeHtml(video.channel)}</p>
                        </a>
                    `).join('')}
                </div>
            </div>
        `;
    }
    
    // ========================================
    // ALL SOURCES
    // ========================================
    if (data.allSources && data.allSources.length > 0) {
        html += `
            <div class="card sources-card">
                <div class="card-header">
                    <h2>🔗 ALL RESEARCH SOURCES</h2>
                    <span class="badge">${data.allSources.length} Sources</span>
                </div>
                <div class="sources-list">
                    ${data.allSources.map(source => `
                        <a href="${source.url}" target="_blank" rel="noopener noreferrer" class="source-link">
                            ${source.isGovernment ? '🏛️ ' : '📄 '}
                            ${escapeHtml(source.title || source.url)}
                            <span class="source-domain">${escapeHtml(source.source)}</span>
                        </a>
                    `).join('')}
                </div>
            </div>
        `;
    }
    
    resultsDiv.innerHTML = html;
    resultsDiv.style.display = 'block';
    
    // Scroll to results
    resultsDiv.scrollIntoView({ behavior: 'smooth' });
}

function formatSummaryText(text) {
    // Convert plain text to HTML with proper formatting
    let html = escapeHtml(text);
    
    // Convert line breaks to <br>
    html = html.replace(/\n/g, '<br>');
    
    // Convert URLs to clickable links
    html = html.replace(/(https?:\/\/[^\s]+)/g, '<a href="$1" target="_blank" rel="noopener noreferrer">$1</a>');
    
    // Format bold text
    html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    
    return html;
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}
