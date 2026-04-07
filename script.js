// ============================================
// DEBATESPACE - COMPLETE DISPLAY WITH ANSWER SECTION
// Sections: Answer (with citations) > Deep Research > News > All Sources
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
    
    // Format text with clickable citation links
    const formatWithCitations = (text, citations) => {
        if (!text) return 'No information available.';
        
        let formattedText = text;
        
        formattedText = formattedText.replace(/\[(\d+)\]/g, (match, num) => {
            const citation = citations.find(c => c.id == num);
            if (citation) {
                return `<a href="${citation.url}" target="_blank" class="citation-inline" title="Click to verify source: ${citation.source}">[${num}]</a>`;
            }
            return match;
        });
        
        formattedText = formattedText.replace(/\[(\d+)\]\[(\d+)\]\[(\d+)\]/g, (match, n1, n2, n3) => {
            const c1 = citations.find(c => c.id == n1);
            const c2 = citations.find(c => c.id == n2);
            const c3 = citations.find(c => c.id == n3);
            if (c1 && c2 && c3) {
                return `<a href="${c1.url}" target="_blank" class="citation-inline">[${n1}]</a><a href="${c2.url}" target="_blank" class="citation-inline">[${n2}]</a><a href="${c3.url}" target="_blank" class="citation-inline">[${n3}]</a>`;
            }
            return match;
        });
        
        formattedText = formattedText.replace(/\[(\d+)\]\[(\d+)\]/g, (match, n1, n2) => {
            const c1 = citations.find(c => c.id == n1);
            const c2 = citations.find(c => c.id == n2);
            if (c1 && c2) {
                return `<a href="${c1.url}" target="_blank" class="citation-inline">[${n1}]</a><a href="${c2.url}" target="_blank" class="citation-inline">[${n2}]</a>`;
            }
            return match;
        });
        
        const paragraphs = formattedText.split(/\n\n+/);
        formattedText = paragraphs.map(p => `<p>${p.replace(/\n/g, '<br>')}</p>`).join('');
        
        return formattedText;
    };
    
    // Render Answer Section (NEW)
    const renderAnswer = (answer) => {
        if (!answer || !answer.text) return '';
        return `
            <div class="answer-card">
                <div class="answer-header">
                    <span class="answer-icon">📌</span>
                    <span>DIRECT ANSWER</span>
                </div>
                <div class="answer-text">
                    ${formatWithCitations(answer.text, answer.citations || [])}
                </div>
                ${answer.citations && answer.citations.length > 0 ? `
                    <div class="answer-citations">
                        <span class="answer-citation-label">Sources for this answer:</span>
                        ${answer.citations.map(c => `
                            <a href="${c.url}" target="_blank" class="answer-citation-link">[${c.id}] ${c.source}</a>
                        `).join('')}
                    </div>
                ` : ''}
            </div>
        `;
    };
    
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
                            ${article.description ? `<div class="news-description">${article.description}...</div>` : ''}
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
                        if (source.type === "government_cx" || source.type === "government") typeIcon = "🏛️";
                        else if (source.type === "archive") typeIcon = "📜";
                        else if (source.type === "academic") typeIcon = "🎓";
                        else if (source.type === "video") typeIcon = "📺";
                        else typeIcon = "🌐";
                        
                        return `
                            <div class="allsource-item">
                                <span class="allsource-num">${idx + 1}.</span>
                                <span class="allsource-type">${typeIcon}</span>
                                <a href="${source.url}" target="_blank" class="allsource-link">${source.title}</a>
                                <span class="allsource-domain">${source.source}</span>
                            </div>
                        `;
                    }).join('')}
                </div>
            </div>
        `;
    };
    
    let html = `
        ${renderAnswer(data.answer)}
        <div class="research-card">
            <div class="research-header">
                <span class="research-icon">✅</span>
                <span>DEEP RESEARCH FINDINGS</span>
            </div>
            <div class="research-summary">
                ${formatWithCitations(data.research?.summary, data.research?.citations || [])}
            </div>
            ${renderKeyFindings(data.research?.keyFindings)}
            <div class="research-tip">💡 Numbers in brackets [1] are clickable citations. Click to verify the source directly.</div>
        </div>
        ${renderCitations(data.research?.citations)}
        ${renderNewsArticles(data.newsArticles)}
        ${renderAllSources(data.allSources)}
        <div class="stats-footer">
            <span>🔍 "${query}"</span>
            <span>🏛️ ${data.research?.sourceCounts?.government || 0} Gov Sources</span>
            <span>🎓 ${data.research?.sourceCounts?.academic || 0} Academic</span>
            <span>📰 ${data.newsArticles?.length || 0} News</span>
            <span>📋 ${data.research?.citations?.length || 0} Citations</span>
            <span>📚 ${data.allSources?.length || 0} Total Sources</span>
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
/* Answer Card - NEW */
.answer-card {
    background: linear-gradient(135deg, rgba(59, 130, 246, 0.12), rgba(59, 130, 246, 0.05));
    border: 2px solid rgba(59, 130, 246, 0.3);
    border-radius: 24px;
    padding: 24px;
    margin-bottom: 24px;
}
.answer-header {
    font-size: 1.1rem;
    font-weight: 700;
    color: #60a5fa;
    margin-bottom: 12px;
    padding-bottom: 8px;
    border-bottom: 2px solid rgba(59, 130, 246, 0.3);
    display: flex;
    align-items: center;
    gap: 10px;
}
.answer-icon { font-size: 1.2rem; }
.answer-text {
    font-size: 1rem;
    line-height: 1.6;
    color: #e4e4e7;
    margin-bottom: 16px;
}
.answer-citations {
    display: flex;
    flex-wrap: wrap;
    gap: 12px;
    padding-top: 12px;
    border-top: 1px solid rgba(255,255,255,0.1);
}
.answer-citation-label {
    font-size: 0.7rem;
    color: #a1a1aa;
}
.answer-citation-link {
    font-size: 0.7rem;
    color: #60a5fa;
    text-decoration: none;
    padding: 2px 8px;
    background: rgba(59,130,246,0.1);
    border-radius: 16px;
}
.answer-citation-link:hover { background: rgba(59,130,246,0.2); text-decoration: underline; }

/* Research Card */
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
}
.research-summary p {
    margin-bottom: 12px;
}
.citation-inline {
    display: inline-block;
    color: #fbbf24;
    text-decoration: none;
    font-weight: bold;
    padding: 0 2px;
    font-size: 0.85rem;
}
.citation-inline:hover {
    text-decoration: underline;
    color: #34d399;
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
.citations-section, .key-findings-section, .news-section, .allsources-section {
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
    .answer-card, .research-card, .citations-section, .key-findings-section, .news-section, .allsources-section { padding: 16px; }
    .stats-footer { gap: 10px; }
    .citation-item { flex-direction: column; }
    .citation-source { flex-direction: column; align-items: flex-start; }
    .allsource-item { flex-wrap: wrap; }
    .allsource-domain { max-width: none; white-space: normal; }
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

console.log('DebateSpace loaded - Answer section + deep research with citations');
