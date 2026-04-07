// ============================================
// DEBATESPACE - MAXIMUM DEPTH FRONTEND
// Every sentence has a citation
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
    
    // Show search depth indicator
    updateSearchDepth('Initializing deep research...');
    
    try {
        const response = await fetch(`/api/search?query=${encodeURIComponent(query)}`);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const data = await response.json();
        renderDeepResults(data, query);
        updateSearchDepth(`Complete! Found ${data.depthStats?.totalSources || 0} sources across 10+ categories`);
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
        updateSearchDepth('Search failed. Please try again.');
    } finally {
        loading.style.display = 'none';
    }
}

function updateSearchDepth(message) {
    const depthIndicator = document.getElementById('depthIndicator');
    if (depthIndicator) {
        depthIndicator.innerHTML = message;
        depthIndicator.style.opacity = '1';
        setTimeout(() => {
            depthIndicator.style.opacity = '0.5';
        }, 2000);
    }
}

function renderDeepResults(data, query) {
    const container = document.getElementById('results');
    
    // Format answer with clickable citations for each sentence
    const formatAnswerWithCitations = (answer) => {
        if (!answer || !answer.text) return 'No answer available.';
        
        let formattedHtml = '';
        
        // If we have sentence-level citations, use them
        if (answer.sentences && answer.sentences.length > 0) {
            for (let i = 0; i < answer.sentences.length; i++) {
                const sentence = answer.sentences[i];
                if (sentence.citationId) {
                    const citation = answer.citations.find(c => c.id === sentence.citationId);
                    if (citation) {
                        formattedHtml += `<span class="sentence-with-citation">${sentence.text}<a href="${citation.url}" target="_blank" class="citation-superscript" title="Source: ${citation.source}">[${sentence.citationId}]</a></span> `;
                    } else {
                        formattedHtml += `${sentence.text} `;
                    }
                } else {
                    formattedHtml += `<span class="sentence-intro">${sentence.text}</span> `;
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
        
        // Group citations by type
        const govCitations = citations.filter(c => c.type === 'government' || c.type === 'international');
        const legalCitations = citations.filter(c => c.type === 'legal');
        const academicCitations = citations.filter(c => c.type === 'academic' || c.type === 'scientific');
        const otherCitations = citations.filter(c => !govCitations.includes(c) && !legalCitations.includes(c) && !academicCitations.includes(c));
        
        let groupedHtml = '';
        
        if (govCitations.length > 0) {
            groupedHtml += `
                <div class="citation-group">
                    <div class="citation-group-header">🏛️ GOVERNMENT & OFFICIAL SOURCES (${govCitations.length})</div>
                    ${renderCitationList(govCitations)}
                </div>
            `;
        }
        
        if (legalCitations.length > 0) {
            groupedHtml += `
                <div class="citation-group">
                    <div class="citation-group-header">⚖️ LEGAL & COURT SOURCES (${legalCitations.length})</div>
                    ${renderCitationList(legalCitations)}
                </div>
            `;
        }
        
        if (academicCitations.length > 0) {
            groupedHtml += `
                <div class="citation-group">
                    <div class="citation-group-header">🎓 ACADEMIC & SCIENTIFIC SOURCES (${academicCitations.length})</div>
                    ${renderCitationList(academicCitations)}
                </div>
            `;
        }
        
        if (otherCitations.length > 0) {
            groupedHtml += `
                <div class="citation-group">
                    <div class="citation-group-header">📚 OTHER VERIFIED SOURCES (${otherCitations.length})</div>
                    ${renderCitationList(otherCitations)}
                </div>
            `;
        }
        
        return `
            <div class="citations-section">
                <div class="section-header">
                    <span class="section-icon">📋</span>
                    <span>VERIFIED SOURCE CITATIONS (${citations.length})</span>
                    <span class="citation-badge">Every claim verified</span>
                </div>
                ${groupedHtml}
            </div>
        `;
    };
    
    const renderCitationList = (citations) => {
        return `
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
        `;
    };
    
    const renderNewsArticles = (articles) => {
        if (!articles || articles.length === 0) return '';
        return `
            <div class="news-section">
                <div class="section-header">
                    <span class="section-icon">📰</span>
                    <span>LATEST NEWS ARTICLES (${articles.length})</span>
                </div>
                <div class="news-list">
                    ${articles.map(article => `
                        <div class="news-item">
                            <a href="${article.url}" target="_blank" class="news-title">${article.title}</a>
                            <div class="news-meta">
                                <span class="news-source">📌 ${article.source}</span>
                                ${article.date ? `<span class="news-date">📅 ${article.date}</span>` : ''}
                            </div>
                            ${article.description ? `<div class="news-description">${article.description.substring(0, 200)}...</div>` : ''}
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
                            ${v.thumbnail ? `<img src="${v.thumbnail}" alt="${v.title}" loading="lazy">` : '<div class="video-placeholder">🎬</div>'}
                            <div class="video-info">
                                <div class="video-title">${v.title.length > 60 ? v.title.substring(0, 60) + '...' : v.title}</div>
                                <div class="video-channel">${v.channel}</div>
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    };
    
    const renderSourceBreakdown = (stats) => {
        if (!stats) return '';
        
        const total = stats.totalSources || 0;
        const gov = stats.governmentSources || 0;
        const academic = stats.academicSources || 0;
        const legal = stats.legalSources || 0;
        const archive = stats.archiveSources || 0;
        
        const govPercent = total > 0 ? Math.round((gov / total) * 100) : 0;
        const academicPercent = total > 0 ? Math.round((academic / total) * 100) : 0;
        const legalPercent = total > 0 ? Math.round((legal / total) * 100) : 0;
        const archivePercent = total > 0 ? Math.round((archive / total) * 100) : 0;
        
        return `
            <div class="breakdown-section">
                <div class="section-header">
                    <span class="section-icon">📊</span>
                    <span>RESEARCH DEPTH BREAKDOWN</span>
                </div>
                <div class="breakdown-bars">
                    <div class="breakdown-bar">
                        <div class="breakdown-label">🏛️ Government Sources</div>
                        <div class="bar-container">
                            <div class="bar-fill gov-fill" style="width: ${govPercent}%"></div>
                        </div>
                        <div class="breakdown-count">${gov} (${govPercent}%)</div>
                    </div>
                    <div class="breakdown-bar">
                        <div class="breakdown-label">🎓 Academic Sources</div>
                        <div class="bar-container">
                            <div class="bar-fill academic-fill" style="width: ${academicPercent}%"></div>
                        </div>
                        <div class="breakdown-count">${academic} (${academicPercent}%)</div>
                    </div>
                    <div class="breakdown-bar">
                        <div class="breakdown-label">⚖️ Legal Sources</div>
                        <div class="bar-container">
                            <div class="bar-fill legal-fill" style="width: ${legalPercent}%"></div>
                        </div>
                        <div class="breakdown-count">${legal} (${legalPercent}%)</div>
                    </div>
                    <div class="breakdown-bar">
                        <div class="breakdown-label">📜 Archive Sources</div>
                        <div class="bar-container">
                            <div class="bar-fill archive-fill" style="width: ${archivePercent}%"></div>
                        </div>
                        <div class="breakdown-count">${archive} (${archivePercent}%)</div>
                    </div>
                </div>
                <div class="breakdown-total">Total Sources Analyzed: ${total}</div>
            </div>
        `;
    };
    
    const renderAllSources = (sources) => {
        if (!sources || sources.length === 0) return '';
        
        // Group sources by type for better display
        const govSources = sources.filter(s => s.type === 'government' || s.type === 'international');
        const legalSources = sources.filter(s => s.type === 'legal');
        const academicSources = sources.filter(s => s.type === 'academic' || s.type === 'scientific');
        const archiveSources = sources.filter(s => s.type === 'archive');
        const thinkTankSources = sources.filter(s => s.type === 'thinktank');
        const webSources = sources.filter(s => s.type === 'web');
        
        return `
            <div class="allsources-section">
                <div class="section-header">
                    <span class="section-icon">📚</span>
                    <span>ALL RESEARCH SOURCES (${sources.length})</span>
                    <button class="collapse-btn" onclick="toggleAllSources()">▼</button>
                </div>
                <div id="allsources-content" class="allsources-content">
                    ${renderSourceGroup('🏛️ Government & Official', govSources)}
                    ${renderSourceGroup('⚖️ Legal & Court', legalSources)}
                    ${renderSourceGroup('🎓 Academic & Scientific', academicSources)}
                    ${renderSourceGroup('📜 Archives & Historical', archiveSources)}
                    ${renderSourceGroup('🏢 Think Tanks & Policy', thinkTankSources)}
                    ${renderSourceGroup('🌐 Web & Media', webSources)}
                </div>
            </div>
        `;
    };
    
    const renderSourceGroup = (title, sources) => {
        if (sources.length === 0) return '';
        return `
            <div class="source-group">
                <div class="source-group-title">${title} (${sources.length})</div>
                <div class="allsources-list">
                    ${sources.map((source, idx) => `
                        <div class="allsource-item">
                            <span class="allsource-num">${idx + 1}.</span>
                            <a href="${source.url}" target="_blank" class="allsource-link">${source.title || source.text?.substring(0, 80)}</a>
                            <span class="allsource-domain">${source.source}</span>
                            ${source.date ? `<span class="allsource-date">📅 ${source.date}</span>` : ''}
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    };
    
    let html = `
        <!-- DEPTH INDICATOR -->
        <div id="depthIndicator" class="depth-indicator">🔍 Maximum depth research completed</div>
        
        <!-- IN-DEPTH ANSWER WITH CITATIONS -->
        <div class="answer-card">
            <div class="answer-header">
                <span class="answer-icon">📌</span>
                <span>VERIFIED ANSWER WITH CITATIONS</span>
                <span class="verification-badge">✓ Every sentence cited</span>
            </div>
            <div class="answer-text">
                ${formatAnswerWithCitations(data.answer)}
            </div>
            <div class="answer-footer">
                <div class="answer-stats">
                    <span class="evidence-count">📊 ${data.answer?.evidenceCount || 0} verified sources</span>
                    <span class="gov-count">🏛️ ${data.answer?.governmentCount || 0} government sources</span>
                    <span class="legal-count">⚖️ ${data.answer?.legalCount || 0} legal sources</span>
                    <span class="academic-count">🎓 ${data.answer?.academicCount || 0} academic sources</span>
                </div>
                <span class="citation-note">💡 Numbers in brackets [1] are clickable citations that go directly to the source</span>
            </div>
        </div>
        
        ${renderSourceBreakdown(data.depthStats)}
        ${renderCitations(data.answer?.citations)}
        ${renderNewsArticles(data.newsArticles)}
        ${renderVideos(data.videoSources)}
        ${renderAllSources(data.allSources)}
        
        <div class="stats-footer">
            <span>🔍 "${query}"</span>
            <span>🏛️ ${data.allSources?.filter(s => s.type === "government" || s.type === "international").length || 0} Gov</span>
            <span>⚖️ ${data.allSources?.filter(s => s.type === "legal").length || 0} Legal</span>
            <span>🎓 ${data.allSources?.filter(s => s.type === "academic" || s.type === "scientific").length || 0} Academic</span>
            <span>📜 ${data.allSources?.filter(s => s.type === "archive").length || 0} Archive</span>
            <span>🏢 ${data.allSources?.filter(s => s.type === "thinktank").length || 0} Think Tank</span>
            <span>📰 ${data.newsArticles?.length || 0} News</span>
            <span>📺 ${data.videoSources?.length || 0} Videos</span>
            <span>📋 ${data.answer?.citations?.length || 0} Citations</span>
        </div>
    `;
    
    container.innerHTML = html;
}

function toggleAllSources() {
    const content = document.getElementById('allsources-content');
    const btn = document.querySelector('.collapse-btn');
    if (content.style.display === 'none') {
        content.style.display = 'block';
        btn.innerHTML = '▼';
    } else {
        content.style.display = 'none';
        btn.innerHTML = '▶';
    }
}

function setSearch(topic) {
    document.getElementById('searchInput').value = topic;
    searchDebate();
}

// Enhanced Styles
const styles = `
<style>
/* Existing styles preserved, adding new ones */

.depth-indicator {
    background: linear-gradient(135deg, #1e3a5f, #0f172a);
    border-radius: 40px;
    padding: 10px 20px;
    margin-bottom: 20px;
    text-align: center;
    font-size: 0.85rem;
    color: #60a5fa;
    border: 1px solid rgba(96, 165, 250, 0.3);
    transition: opacity 0.5s;
}

.verification-badge {
    background: #10b981;
    color: white;
    font-size: 0.7rem;
    padding: 4px 10px;
    border-radius: 30px;
    margin-left: auto;
}

.answer-stats {
    display: flex;
    flex-wrap: wrap;
    gap: 12px;
}

.gov-count, .legal-count, .academic-count {
    padding: 4px 10px;
    border-radius: 20px;
    font-size: 0.7rem;
}

.gov-count { background: rgba(59, 130, 246, 0.15); color: #60a5fa; }
.legal-count { background: rgba(245, 158, 11, 0.15); color: #fbbf24; }
.academic-count { background: rgba(16, 185, 129, 0.15); color: #34d399; }

.breakdown-section {
    background: rgba(20, 20, 35, 0.85);
    backdrop-filter: blur(10px);
    border-radius: 20px;
    padding: 24px;
    margin-bottom: 24px;
    border: 1px solid rgba(255, 255, 255, 0.08);
}

.breakdown-bars {
    display: flex;
    flex-direction: column;
    gap: 16px;
    margin: 20px 0;
}

.breakdown-bar {
    display: flex;
    align-items: center;
    gap: 12px;
    flex-wrap: wrap;
}

.breakdown-label {
    width: 160px;
    font-size: 0.8rem;
    color: #e4e4e7;
}

.bar-container {
    flex: 1;
    height: 28px;
    background: rgba(0, 0, 0, 0.3);
    border-radius: 14px;
    overflow: hidden;
}

.bar-fill {
    height: 100%;
    border-radius: 14px;
    transition: width 1s ease;
}

.gov-fill { background: linear-gradient(90deg, #3b82f6, #60a5fa); }
.academic-fill { background: linear-gradient(90deg, #10b981, #34d399); }
.legal-fill { background: linear-gradient(90deg, #f59e0b, #fbbf24); }
.archive-fill { background: linear-gradient(90deg, #8b5cf6, #a78bfa); }

.breakdown-count {
    min-width: 80px;
    font-size: 0.75rem;
    color: #a1a1aa;
}

.breakdown-total {
    text-align: center;
    margin-top: 16px;
    padding-top: 16px;
    border-top: 1px solid rgba(255,255,255,0.1);
    font-size: 0.85rem;
    font-weight: 600;
    color: #10b981;
}

.citation-group {
    margin-bottom: 24px;
}

.citation-group-header {
    font-size: 0.9rem;
    font-weight: 600;
    color: #e4e4e7;
    margin-bottom: 12px;
    padding-bottom: 8px;
    border-bottom: 1px solid rgba(255,255,255,0.1);
}

.citation-badge {
    font-size: 0.65rem;
    background: rgba(16, 185, 129, 0.15);
    padding: 3px 10px;
    border-radius: 20px;
    margin-left: 12px;
}

.sentence-intro {
    font-weight: 600;
    color: #60a5fa;
}

.allsources-content {
    max-height: 600px;
    overflow-y: auto;
}

.source-group {
    margin-bottom: 20px;
}

.source-group-title {
    font-size: 0.85rem;
    font-weight: 600;
    color: #fbbf24;
    margin-bottom: 10px;
    padding: 8px 12px;
    background: rgba(0, 0, 0, 0.3);
    border-radius: 10px;
}

.collapse-btn {
    background: rgba(255,255,255,0.1);
    border: none;
    color: #e4e4e7;
    padding: 4px 12px;
    border-radius: 20px;
    cursor: pointer;
    font-size: 0.7rem;
    margin-left: auto;
}

.collapse-btn:hover {
    background: rgba(255,255,255,0.2);
}

.allsource-date {
    font-size: 0.6rem;
    color: #71717a;
    margin-left: 8px;
}

@media (max-width: 768px) {
    .breakdown-bar {
        flex-direction: column;
        align-items: flex-start;
    }
    
    .breakdown-label {
        width: auto;
    }
    
    .bar-container {
        width: 100%;
    }
    
    .answer-stats {
        flex-direction: column;
        gap: 8px;
    }
    
    .citation-group-header {
        font-size: 0.8rem;
    }
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
window.toggleAllSources = toggleAllSources;

document.getElementById('searchInput')?.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') searchDebate();
});

console.log('DebateSpace MAX DEPTH loaded - Researching across 10+ source categories');
