// ============================================
// DEBATESPACE - EVERY SENTENCE CITED DISPLAY
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
    
    // Format answer with clickable citations for each sentence
    const formatAnswerWithCitations = (answer) => {
        if (!answer || !answer.text) return 'No answer available.';
        
        let formattedHtml = '';
        
        // If we have sentence-level citations, use them
        if (answer.sentences && answer.sentences.length > 0) {
            for (const sentence of answer.sentences) {
                const citation = answer.citations.find(c => c.id === sentence.citationId);
                if (citation) {
                    formattedHtml += `<span class="sentence-with-citation">${sentence.text}<a href="${citation.url}" target="_blank" class="citation-superscript" title="Source: ${citation.source}">[${sentence.citationId}]</a></span> `;
                } else {
                    formattedHtml += `${sentence.text} `;
                }
            }
        } else {
            // Fallback: format whole text with citation links
            formattedHtml = answer.text;
            if (answer.citations) {
                formattedHtml = formattedHtml.replace(/\[(\d+)\]/g, (match, num) => {
                    const citation = answer.citations.find(c => c.id == num);
                    if (citation) {
                        return `<a href="${citation.url}" target="_blank" class="citation-inline" title="${citation.source}">[${num}]</a>`;
                    }
                    return match;
                });
            }
        }
        
        const paragraphs = formattedHtml.split(/\n\n+/);
        return paragraphs.map(p => `<p>${p.replace(/\n/g, '<br>')}</p>`).join('');
    };
    
    const renderCitations = (citations) => {
        if (!citations || citations.length === 0) {
            return '<div class="no-citations">No specific citations found. Try a different search term.</div>';
        }
        return `
            <div class="citations-section">
                <div class="section-header">
                    <span class="section-icon">📋</span>
                    <span>SOURCE CITATIONS (${citations.length})</span>
                </div>
                <div class="citations-list">
                    ${citations.map(citation => `
                        <div class="citation-item">
                            <div class="citation-id">[${citation.id}]</div>
                            <div class="citation-content">
                                <div class="citation-text">${citation.text}</div>
                                <div class="citation-source">
                                    <span class="source-label">${citation.source}</span>
                                    <a href="${citation.url}" target="_blank" class="citation-link">🔗 View Original Source</a>
                                </div>
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    };
    
    const renderNewsArticles = (articles) => {
        if (!articles || articles.length === 0) return '';
        return `
            <div class="news-section">
                <div class="section-header">
                    <span class="section-icon">📰</span>
                    <span>NEWS ARTICLES (${articles.length})</span>
                </div>
                <div class="news-list">
                    ${articles.map(article => `
                        <div class="news-item">
                            <a href="${article.url}" target="_blank" class="news-title">${article.title}</a>
                            <div class="news-meta">
                                <span class="news-source">📌 ${article.source}</span>
                                ${article.date ? `<span class="news-date">📅 ${article.date}</span>` : ''}
                            </div>
                            ${article.description ? `<div class="news-description">${article.description.substring(0, 150)}...</div>` : ''}
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    };
    
    const renderVideos = (videos) => {
        if (!videos || videos.length === 0) return '';
        return `
            <div class="video-section">
                <div class="section-header">
                    <span class="section-icon">📺</span>
                    <span>VIDEO EXPLANATIONS (${videos.length})</span>
                </div>
                <div class="video-grid">
                    ${videos.map(v => `
                        <div class="video-card" onclick="window.open('${v.url}', '_blank')">
                            ${v.thumbnail ? `<img src="${v.thumbnail}" alt="${v.title}">` : '<div class="video-placeholder">🎬</div>'}
                            <div class="video-info">
                                <div class="video-title">${v.title}</div>
                                <div class="video-channel">${v.channel}</div>
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    };
    
    const renderAllSources = (sources) => {
        if (!sources || sources.length === 0) return '';
        return `
            <div class="allsources-section">
                <div class="section-header">
                    <span class="section-icon">📚</span>
                    <span>ALL RESEARCH SOURCES (${sources.length})</span>
                </div>
                <div class="allsources-list">
                    ${sources.map((source, idx) => {
                        let typeIcon = "";
                        if (source.type === "government") typeIcon = "🏛️";
                        else if (source.type === "archive") typeIcon = "📜";
                        else if (source.type === "academic") typeIcon = "🎓";
                        else if (source.type === "web") typeIcon = "🌐";
                        else typeIcon = "📄";
                        
                        return `
                            <div class="allsource-item">
                                <span class="allsource-num">${idx + 1}.</span>
                                <span class="allsource-type">${typeIcon}</span>
                                <a href="${source.url}" target="_blank" class="allsource-link">${source.title || source.text?.substring(0, 80)}</a>
                                <span class="allsource-domain">${source.source}</span>
                            </div>
                        `;
                    }).join('')}
                </div>
            </div>
        `;
    };
    
    let html = `
        <!-- IN-DEPTH ANSWER WITH CITATIONS -->
        <div class="answer-card">
            <div class="answer-header">
                <span class="answer-icon">📌</span>
                <span>FACTUAL ANSWER WITH CITATIONS</span>
            </div>
            <div class="answer-text">
                ${formatAnswerWithCitations(data.answer)}
            </div>
            <div class="answer-footer">
                <span class="evidence-count">📊 Based on ${data.answer?.evidenceCount || 0} government and official sources</span>
                <span class="citation-note">💡 Numbers in brackets [1] are clickable citations that go directly to the source</span>
            </div>
        </div>
        
        ${renderCitations(data.answer?.citations)}
        ${renderNewsArticles(data.newsArticles)}
        ${renderVideos(data.videoSources)}
        ${renderAllSources(data.allSources)}
        
        <div class="stats-footer">
            <span>🔍 "${query}"</span>
            <span>🏛️ ${data.allSources?.filter(s => s.type === "government").length || 0} Gov Sources</span>
            <span>📜 ${data.allSources?.filter(s => s.type === "archive").length || 0} Archives</span>
            <span>🎓 ${data.allSources?.filter(s => s.type === "academic").length || 0} Academic</span>
            <span>📰 ${data.newsArticles?.length || 0} News</span>
            <span>📺 ${data.videoSources?.length || 0} Videos</span>
            <span>📋 ${data.answer?.citations?.length || 0} Citations</span>
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
.answer-card {
    background: linear-gradient(135deg, rgba(16, 185, 129, 0.12), rgba(16, 185, 129, 0.05));
    border: 2px solid rgba(16, 185, 129, 0.3);
    border-radius: 24px;
    padding: 28px;
    margin-bottom: 28px;
}
.answer-header {
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
.answer-icon { font-size: 1.3rem; }
.answer-text {
    font-size: 1rem;
    line-height: 1.7;
    color: #e4e4e7;
    margin-bottom: 20px;
}
.answer-text p {
    margin-bottom: 12px;
}
.sentence-with-citation {
    display: inline;
}
.citation-superscript {
    display: inline-block;
    color: #fbbf24;
    text-decoration: none;
    font-weight: bold;
    font-size: 0.75rem;
    margin-left: 2px;
    padding: 0 2px;
}
.citation-superscript:hover {
    text-decoration: underline;
    color: #34d399;
}
.citation-inline {
    display: inline-block;
    color: #fbbf24;
    text-decoration: none;
    font-weight: bold;
    padding: 0 2px;
}
.citation-inline:hover {
    text-decoration: underline;
    color: #34d399;
}
.answer-footer {
    display: flex;
    justify-content: space-between;
    align-items: center;
    flex-wrap: wrap;
    gap: 16px;
    padding-top: 16px;
    border-top: 1px solid rgba(255,255,255,0.1);
    font-size: 0.75rem;
    color: #a1a1aa;
}
.evidence-count {
    background: rgba(16,185,129,0.15);
    padding: 4px 12px;
    border-radius: 20px;
}
.citation-note {
    color: #71717a;
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
.citations-section, .news-section, .video-section, .allsources-section {
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
    max-height: 600px;
    overflow-y: auto;
}
.citation-item {
    background: rgba(0, 0, 0, 0.3);
    border-radius: 12px;
    padding: 14px 16px;
    display: flex;
    gap: 12px;
    border-left: 3px solid #10b981;
}
.citation-id {
    font-size: 0.9rem;
    font-weight: bold;
    color: #fbbf24;
    min-width: 40px;
}
.citation-content {
    flex: 1;
}
.citation-text {
    font-size: 0.85rem;
    color: #e4e4e7;
    margin-bottom: 8px;
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
.news-list {
    display: flex;
    flex-direction: column;
    gap: 16px;
    max-height: 500px;
    overflow-y: auto;
}
.news-item {
    background: rgba(0, 0, 0, 0.3);
    border-radius: 12px;
    padding: 14px 16px;
    border-left: 3px solid #3b82f6;
}
.news-title {
    font-size: 0.9rem;
    font-weight: 600;
    color: #60a5fa;
    text-decoration: none;
    display: block;
    margin-bottom: 6px;
}
.news-title:hover { text-decoration: underline; }
.news-meta {
    display: flex;
    gap: 16px;
    margin-bottom: 8px;
}
.news-source, .news-date {
    font-size: 0.65rem;
    color: #71717a;
}
.news-description {
    font-size: 0.75rem;
    color: #a1a1aa;
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
.allsources-list {
    display: flex;
    flex-direction: column;
    gap: 8px;
    max-height: 500px;
    overflow-y: auto;
}
.allsource-item {
    font-size: 0.75rem;
    padding: 8px 0;
    display: flex;
    gap: 10px;
    align-items: center;
    flex-wrap: wrap;
    border-bottom: 1px solid rgba(255,255,255,0.05);
}
.allsource-num {
    color: #71717a;
    min-width: 30px;
    font-size: 0.7rem;
}
.allsource-type {
    font-size: 0.8rem;
    min-width: 30px;
}
.allsource-link {
    color: #60a5fa;
    text-decoration: none;
    flex: 1;
    font-size: 0.8rem;
}
.allsource-link:hover { text-decoration: underline; }
.allsource-domain {
    font-size: 0.65rem;
    color: #71717a;
    max-width: 200px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
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
    .answer-card, .citations-section, .news-section, .video-section, .allsources-section { padding: 16px; }
    .stats-footer { gap: 10px; }
    .citation-item { flex-direction: column; }
    .citation-source { flex-direction: column; align-items: flex-start; }
    .allsource-item { flex-wrap: wrap; }
    .allsource-domain { max-width: none; white-space: normal; }
    .answer-footer { flex-direction: column; align-items: flex-start; }
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

console.log('DebateSpace loaded - Every sentence cited from government sources');
