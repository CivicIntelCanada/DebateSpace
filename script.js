// ============================================
// DEBATESPACE - DEEP DIVE RESEARCH UI
// Every sentence cited. Verified facts highlighted.
// Government sources prioritized.
// ============================================

// Global state
let currentQuery = '';
let currentDeepData = null;

// ============================================
// MAIN SEARCH FUNCTION
// ============================================
async function searchDebate() {
    const query = document.getElementById('searchInput').value;
    if (!query.trim()) {
        alert('Please enter a debate topic or question');
        return;
    }
    
    currentQuery = query;
    
    const loading = document.getElementById('loading');
    const resultsDiv = document.getElementById('results');
    
    loading.style.display = 'block';
    resultsDiv.innerHTML = '';
    
    // Scroll to results
    resultsDiv.scrollIntoView({ behavior: 'smooth', block: 'start' });
    
    try {
        const response = await fetch(`/api/search?query=${encodeURIComponent(query)}&depth=deep`);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const data = await response.json();
        currentDeepData = data;
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

// ============================================
// RENDER COMPLETE RESULTS
// ============================================
function renderResults(data, query) {
    const container = document.getElementById('results');
    
    // Build the complete HTML
    let html = '';
    
    // 1. Answer Card with Citations
    html += renderAnswerCard(data.answer);
    
    // 2. Deep Dive Stats (if available)
    if (data.deepDiveMetadata) {
        html += renderDeepDiveStats(data.deepDiveMetadata);
    }
    
    // 3. Verified Facts Section (special highlight)
    if (data.answer?.verifiedFactsCount > 0) {
        html += renderVerifiedFactsSection(data.answer);
    }
    
    // 4. Citations Section
    html += renderCitationsSection(data.answer?.citations || []);
    
    // 5. Government Sources Summary
    html += renderGovernmentSourcesSummary(data.allSources || []);
    
    // 6. All Sources Section
    html += renderAllSourcesSection(data.allSources || []);
    
    // 7. Statistics Extracted (if any)
    if (data.answer?.dataPointsExtracted > 0) {
        html += renderStatisticsSection(data.answer);
    }
    
    // 8. Footer Stats
    html += renderFooterStats(data, query);
    
    container.innerHTML = html;
    
    // Add copy button functionality
    attachCopyButtonHandler();
}

// ============================================
// RENDER ANSWER CARD WITH CITATIONS
// ============================================
function renderAnswerCard(answer) {
    if (!answer || !answer.text) {
        return `
            <div class="answer-card">
                <div class="answer-header">
                    <span class="answer-icon">📌</span>
                    <span>FACTUAL ANSWER WITH CITATIONS</span>
                </div>
                <div class="answer-text">
                    <p>No specific information found. Try a more specific query like "site:bls.gov inflation rate 2024"</p>
                </div>
            </div>
        `;
    }
    
    const formattedAnswer = formatAnswerWithCitations(answer);
    
    return `
        <div class="answer-card">
            <div class="answer-header">
                <span class="answer-icon">📌</span>
                <span>FACTUAL ANSWER WITH CITATIONS</span>
                <button class="copy-answer-btn" onclick="copyAnswerToClipboard()">📋 Copy Answer</button>
            </div>
            <div class="answer-text">
                ${formattedAnswer}
            </div>
            <div class="answer-footer">
                <span class="evidence-count">📊 Based on ${answer.evidenceCount || 0} government and official sources</span>
                <span class="citation-note">💡 Numbers in brackets [1] are clickable citations that go directly to the source</span>
                ${answer.verifiedFactsCount ? `<span class="verified-badge">✅ ${answer.verifiedFactsCount} verified facts</span>` : ''}
            </div>
        </div>
    `;
}

// ============================================
// FORMAT ANSWER WITH CLICKABLE CITATIONS
// ============================================
function formatAnswerWithCitations(answer) {
    if (!answer.sentences || answer.sentences.length === 0) {
        return `<p>${answer.text || 'No answer available.'}</p>`;
    }
    
    let formattedHtml = '';
    
    for (const sentence of answer.sentences) {
        if (sentence.citationId) {
            const citation = answer.citations?.find(c => c.id === sentence.citationId);
            if (citation) {
                // Check if it's a verified fact
                const isVerified = citation.verificationCount && citation.verificationCount >= 2;
                const verifiedClass = isVerified ? 'verified-fact' : '';
                const verifiedIcon = isVerified ? ' ✓✓' : '';
                
                formattedHtml += `<span class="sentence-with-citation ${verifiedClass}">${sentence.text}${verifiedIcon}<a href="${citation.url}" target="_blank" class="citation-superscript" title="Source: ${citation.source} | ${citation.verificationCount ? `Verified across ${citation.verificationCount} sources` : 'Click to verify'}">[${sentence.citationId}]</a></span> `;
            } else {
                formattedHtml += `<span class="sentence-with-citation">${sentence.text} [${sentence.citationId}]</span> `;
            }
        } else {
            // Check if this is a section header
            if (sentence.text.includes('VERIFIED FACTS') || sentence.text.includes('STATISTICS') || sentence.text.includes('DIRECT QUOTES')) {
                formattedHtml += `<div class="answer-section-header">${sentence.text}</div> `;
            } else {
                formattedHtml += `<span class="sentence-intro">${sentence.text}</span> `;
            }
        }
    }
    
    // Split into paragraphs
    const paragraphs = formattedHtml.split(/\n\n+/);
    return paragraphs.map(p => `<p>${p.replace(/\n/g, '<br>')}</p>`).join('');
}

// ============================================
// RENDER DEEP DIVE STATS
// ============================================
function renderDeepDiveStats(metadata) {
    return `
        <div class="deepdive-stats-card">
            <div class="deepdive-header">
                <span class="deepdive-icon">🔬</span>
                <span>DEEP DIVE RESEARCH METRICS</span>
            </div>
            <div class="deepdive-grid">
                <div class="deepdive-item">
                    <span class="deepdive-value">${metadata.sourcesAnalyzed}</span>
                    <span class="deepdive-label">Sources Analyzed</span>
                </div>
                <div class="deepdive-item">
                    <span class="deepdive-value">${metadata.verifiedFacts}</span>
                    <span class="deepdive-label">Verified Facts</span>
                </div>
                <div class="deepdive-item">
                    <span class="deepdive-value">${metadata.dataPointsExtracted}</span>
                    <span class="deepdive-label">Data Points</span>
                </div>
                <div class="deepdive-item">
                    <span class="deepdive-value">${metadata.timeSeconds}s</span>
                    <span class="deepdive-label">Research Time</span>
                </div>
            </div>
        </div>
    `;
}

// ============================================
// RENDER VERIFIED FACTS SECTION
// ============================================
function renderVerifiedFactsSection(answer) {
    if (!answer.citations) return '';
    
    const verifiedCitations = answer.citations.filter(c => c.verificationCount && c.verificationCount >= 2);
    
    if (verifiedCitations.length === 0) return '';
    
    return `
        <div class="verified-section">
            <div class="section-header">
                <span class="section-icon">✅</span>
                <span>VERIFIED FACTS (Appear in multiple government sources)</span>
                <span class="verification-badge">${verifiedCitations.length} facts verified</span>
            </div>
            <div class="verified-list">
                ${verifiedCitations.map(citation => `
                    <div class="verified-item">
                        <div class="verified-icon">🔬</div>
                        <div class="verified-content">
                            <div class="verified-text">"${citation.text.length > 200 ? citation.text.substring(0, 200) + '...' : citation.text}"</div>
                            <div class="verified-meta">
                                <span class="verified-count">✓ Verified across ${citation.verificationCount} sources</span>
                                <a href="${citation.url}" target="_blank" class="verified-link">View Source →</a>
                            </div>
                        </div>
                    </div>
                `).slice(0, 10).join('')}
            </div>
        </div>
    `;
}

// ============================================
// RENDER CITATIONS SECTION
// ============================================
function renderCitationsSection(citations) {
    if (!citations || citations.length === 0) {
        return '<div class="citations-section"><div class="section-header"><span class="section-icon">📋</span><span>SOURCE CITATIONS</span></div><div class="no-citations">No specific citations found. Try a different search term.</div></div>';
    }
    
    return `
        <div class="citations-section">
            <div class="section-header">
                <span class="section-icon">📋</span>
                <span>SOURCE CITATIONS (${citations.length})</span>
                <button class="expand-all-btn" onclick="toggleAllCitations()">Expand All</button>
            </div>
            <div class="citations-list">
                ${citations.map(citation => `
                    <div class="citation-item" data-citation-id="${citation.id}">
                        <div class="citation-id">[${citation.id}]</div>
                        <div class="citation-content">
                            <div class="citation-text">${citation.text}</div>
                            <div class="citation-source">
                                <span class="source-label">${citation.source}</span>
                                <a href="${citation.url}" target="_blank" class="citation-link">🔗 View Original Source</a>
                                ${citation.verificationCount ? `<span class="verification-count">✓ Verified ×${citation.verificationCount}</span>` : ''}
                            </div>
                        </div>
                    </div>
                `).join('')}
            </div>
        </div>
    `;
}

// ============================================
// RENDER GOVERNMENT SOURCES SUMMARY
// ============================================
function renderGovernmentSourcesSummary(sources) {
    const govSources = sources.filter(s => s.type === 'government');
    if (govSources.length === 0) return '';
    
    // Group by region
    const byRegion = {};
    govSources.forEach(s => {
        const region = s.region || 'US';
        if (!byRegion[region]) byRegion[region] = [];
        byRegion[region].push(s);
    });
    
    return `
        <div class="gov-summary-section">
            <div class="section-header">
                <span class="section-icon">🏛️</span>
                <span>GOVERNMENT SOURCES BY REGION (${govSources.length})</span>
            </div>
            <div class="gov-regions">
                ${Object.entries(byRegion).map(([region, sources]) => `
                    <div class="gov-region">
                        <div class="gov-region-header">${getRegionFlag(region)} ${region}</div>
                        <div class="gov-region-sources">
                            ${sources.slice(0, 5).map(s => `
                                <a href="${s.url}" target="_blank" class="gov-source-link" title="${s.title}">
                                    ${s.source}
                                </a>
                            `).join('')}
                            ${sources.length > 5 ? `<span class="gov-more">+${sources.length - 5} more</span>` : ''}
                        </div>
                    </div>
                `).join('')}
            </div>
        </div>
    `;
}

// ============================================
// RENDER ALL SOURCES SECTION
// ============================================
function renderAllSourcesSection(sources) {
    if (!sources || sources.length === 0) return '';
    
    return `
        <div class="allsources-section">
            <div class="section-header">
                <span class="section-icon">📚</span>
                <span>ALL RESEARCH SOURCES (${sources.length})</span>
                <button class="filter-btn" onclick="filterSources()">Filter by Type</button>
            </div>
            <div class="allsources-list" id="allsources-list">
                ${sources.map((source, idx) => {
                    let typeIcon = "";
                    if (source.type === "government") typeIcon = "🏛️";
                    else if (source.type === "archive") typeIcon = "📜";
                    else if (source.type === "academic") typeIcon = "🎓";
                    else if (source.type === "legal") typeIcon = "⚖️";
                    else if (source.type === "web") typeIcon = "🌐";
                    else typeIcon = "📄";
                    
                    const regionTag = source.region ? `<span class="source-region">${source.region}</span>` : '';
                    
                    return `
                        <div class="allsource-item" data-type="${source.type}">
                            <span class="allsource-num">${idx + 1}.</span>
                            <span class="allsource-type">${typeIcon}</span>
                            <a href="${source.url}" target="_blank" class="allsource-link">${source.title || source.snippet?.substring(0, 80) || 'View Source'}</a>
                            <span class="allsource-domain">${source.source}</span>
                            ${regionTag}
                        </div>
                    `;
                }).join('')}
            </div>
        </div>
    `;
}

// ============================================
// RENDER STATISTICS SECTION
// ============================================
function renderStatisticsSection(answer) {
    if (!answer.citations) return '';
    
    // Look for data point citations
    const dataCitations = answer.citations.filter(c => c.source.includes('DATA POINT') || c.source.includes('statistic'));
    
    if (dataCitations.length === 0) return '';
    
    return `
        <div class="stats-extracted-section">
            <div class="section-header">
                <span class="section-icon">📈</span>
                <span>EXTRACTED DATA POINTS (${dataCitations.length})</span>
            </div>
            <div class="stats-grid">
                ${dataCitations.slice(0, 12).map(citation => `
                    <div class="stat-card">
                        <div class="stat-value">${citation.text.length > 60 ? citation.text.substring(0, 60) + '...' : citation.text}</div>
                        <div class="stat-source">
                            <a href="${citation.url}" target="_blank">Source</a>
                        </div>
                    </div>
                `).join('')}
            </div>
        </div>
    `;
}

// ============================================
// RENDER FOOTER STATS
// ============================================
function renderFooterStats(data, query) {
    const sources = data.allSources || [];
    const govCount = sources.filter(s => s.type === 'government').length;
    const archiveCount = sources.filter(s => s.type === 'archive').length;
    const academicCount = sources.filter(s => s.type === 'academic').length;
    const legalCount = sources.filter(s => s.type === 'legal').length;
    
    return `
        <div class="stats-footer">
            <span>🔍 "${query.substring(0, 50)}${query.length > 50 ? '...' : ''}"</span>
            <span>🏛️ ${govCount} Gov Sources</span>
            <span>📜 ${archiveCount} Archives</span>
            <span>🎓 ${academicCount} Academic</span>
            <span>⚖️ ${legalCount} Legal</span>
            <span>📋 ${data.answer?.citations?.length || 0} Citations</span>
            ${data.deepDiveMetadata?.verifiedFacts ? `<span>✅ ${data.deepDiveMetadata.verifiedFacts} Verified</span>` : ''}
        </div>
    `;
}

// ============================================
// HELPER FUNCTIONS
// ============================================
function getRegionFlag(region) {
    const flags = {
        'US': '🇺🇸',
        'Canada': '🇨🇦',
        'UK': '🇬🇧',
        'EU': '🇪🇺',
        'International': '🌍'
    };
    return flags[region] || '🏛️';
}

function copyAnswerToClipboard() {
    if (!currentDeepData || !currentDeepData.answer) return;
    
    let textToCopy = '';
    if (currentDeepData.answer.sentences) {
        for (const sentence of currentDeepData.answer.sentences) {
            textToCopy += sentence.text + ' ';
        }
    } else {
        textToCopy = currentDeepData.answer.text;
    }
    
    navigator.clipboard.writeText(textToCopy).then(() => {
        const btn = document.querySelector('.copy-answer-btn');
        const originalText = btn.innerHTML;
        btn.innerHTML = '✓ Copied!';
        setTimeout(() => {
            btn.innerHTML = originalText;
        }, 2000);
    });
}

function toggleAllCitations() {
    const citations = document.querySelectorAll('.citation-item');
    citations.forEach(citation => {
        citation.classList.toggle('expanded');
    });
}

function filterSources() {
    const types = ['government', 'archive', 'academic', 'legal', 'web'];
    const currentFilter = document.querySelector('.filter-btn.active')?.dataset.filter;
    
    if (currentFilter) {
        // Remove filter
        document.querySelectorAll('.allsource-item').forEach(item => {
            item.style.display = '';
        });
        document.querySelector('.filter-btn')?.classList.remove('active');
    } else {
        // Show only government
        document.querySelectorAll('.allsource-item').forEach(item => {
            if (item.dataset.type !== 'government') {
                item.style.display = 'none';
            }
        });
        document.querySelector('.filter-btn')?.classList.add('active');
    }
}

function attachCopyButtonHandler() {
    // Handler already defined globally
}

// ============================================
// QUICK SEARCH BUTTONS
// ============================================
function setSearch(topic) {
    document.getElementById('searchInput').value = topic;
    searchDebate();
}

// ============================================
// STYLES
// ============================================
const styles = `
<style>
/* Base styles */
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
    flex-wrap: wrap;
}

.copy-answer-btn {
    margin-left: auto;
    background: rgba(16, 185, 129, 0.2);
    border: 1px solid rgba(16, 185, 129, 0.5);
    padding: 6px 12px;
    border-radius: 20px;
    color: #10b981;
    font-size: 0.7rem;
    cursor: pointer;
    transition: all 0.2s;
}

.copy-answer-btn:hover {
    background: rgba(16, 185, 129, 0.4);
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

.answer-section-header {
    font-weight: bold;
    color: #fbbf24;
    margin: 16px 0 12px 0;
    font-size: 1rem;
    border-left: 3px solid #fbbf24;
    padding-left: 12px;
}

.sentence-with-citation {
    display: inline;
}

.verified-fact {
    background: rgba(16, 185, 129, 0.1);
    border-radius: 4px;
    padding: 2px 4px;
}

.citation-superscript {
    display: inline-block;
    color: #fbbf24;
    text-decoration: none;
    font-weight: bold;
    font-size: 0.7rem;
    margin-left: 3px;
    padding: 0 3px;
    background: rgba(0,0,0,0.4);
    border-radius: 10px;
}

.citation-superscript:hover {
    text-decoration: underline;
    color: #34d399;
    background: rgba(0,0,0,0.6);
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

.verified-badge {
    background: rgba(16,185,129,0.25);
    padding: 4px 12px;
    border-radius: 20px;
    color: #10b981;
}

.citation-note {
    color: #71717a;
}

/* Deep Dive Stats */
.deepdive-stats-card {
    background: linear-gradient(135deg, rgba(139, 92, 246, 0.1), rgba(139, 92, 246, 0.05));
    border: 1px solid rgba(139, 92, 246, 0.3);
    border-radius: 20px;
    padding: 20px;
    margin-bottom: 24px;
}

.deepdive-header {
    font-size: 1rem;
    font-weight: 700;
    color: #a78bfa;
    margin-bottom: 16px;
    display: flex;
    align-items: center;
    gap: 10px;
}

.deepdive-icon { font-size: 1.2rem; }

.deepdive-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
    gap: 16px;
}

.deepdive-item {
    text-align: center;
}

.deepdive-value {
    display: block;
    font-size: 1.8rem;
    font-weight: bold;
    color: #c4b5fd;
}

.deepdive-label {
    font-size: 0.7rem;
    color: #71717a;
}

/* Verified Facts Section */
.verified-section {
    background: rgba(16, 185, 129, 0.08);
    border-left: 4px solid #10b981;
    border-radius: 16px;
    padding: 20px;
    margin-bottom: 24px;
}

.verified-list {
    display: flex;
    flex-direction: column;
    gap: 16px;
    margin-top: 12px;
}

.verified-item {
    display: flex;
    gap: 12px;
    padding: 12px;
    background: rgba(0,0,0,0.2);
    border-radius: 12px;
}

.verified-icon {
    font-size: 1.2rem;
}

.verified-content {
    flex: 1;
}

.verified-text {
    font-size: 0.9rem;
    color: #e4e4e7;
    margin-bottom: 8px;
    font-style: italic;
}

.verified-meta {
    display: flex;
    gap: 16px;
    align-items: center;
    flex-wrap: wrap;
}

.verified-count {
    font-size: 0.7rem;
    color: #10b981;
}

.verified-link {
    font-size: 0.7rem;
    color: #60a5fa;
    text-decoration: none;
}

.verified-link:hover {
    text-decoration: underline;
}

.verification-badge {
    font-size: 0.7rem;
    background: #10b981;
    color: white;
    padding: 2px 8px;
    border-radius: 20px;
    margin-left: auto;
}

/* Section Headers */
.section-header {
    font-size: 1rem;
    font-weight: 700;
    margin-bottom: 16px;
    padding-bottom: 10px;
    border-bottom: 1px solid rgba(255,255,255,0.1);
    display: flex;
    align-items: center;
    gap: 10px;
    flex-wrap: wrap;
}

.section-icon { font-size: 1.1rem; }

/* Citations Section */
.citations-section, .gov-summary-section, .allsources-section, .stats-extracted-section {
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
    transition: all 0.2s;
}

.citation-item.expanded .citation-text {
    max-height: none;
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
    max-height: 80px;
    overflow: hidden;
    transition: max-height 0.2s;
}

.citation-item.expanded .citation-text {
    max-height: 500px;
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

.citation-link:hover {
    background: rgba(16,185,129,0.2);
    text-decoration: underline;
}

.verification-count {
    font-size: 0.65rem;
    color: #10b981;
    padding: 2px 6px;
    background: rgba(16,185,129,0.15);
    border-radius: 12px;
}

.expand-all-btn, .filter-btn {
    margin-left: auto;
    background: rgba(255,255,255,0.1);
    border: none;
    padding: 4px 12px;
    border-radius: 20px;
    color: #a1a1aa;
    font-size: 0.7rem;
    cursor: pointer;
}

.expand-all-btn:hover, .filter-btn:hover {
    background: rgba(255,255,255,0.2);
}

.filter-btn.active {
    background: #10b981;
    color: white;
}

/* Government Summary */
.gov-regions {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
    gap: 20px;
}

.gov-region {
    background: rgba(0,0,0,0.2);
    border-radius: 12px;
    padding: 12px;
}

.gov-region-header {
    font-weight: bold;
    margin-bottom: 10px;
    padding-bottom: 6px;
    border-bottom: 1px solid rgba(255,255,255,0.1);
}

.gov-region-sources {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
}

.gov-source-link {
    font-size: 0.7rem;
    color: #60a5fa;
    text-decoration: none;
    background: rgba(96,165,250,0.1);
    padding: 4px 8px;
    border-radius: 16px;
}

.gov-source-link:hover {
    background: rgba(96,165,250,0.2);
}

.gov-more {
    font-size: 0.65rem;
    color: #71717a;
    padding: 4px 8px;
}

/* All Sources */
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

.allsource-link:hover {
    text-decoration: underline;
}

.allsource-domain {
    font-size: 0.65rem;
    color: #71717a;
    max-width: 200px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.source-region {
    font-size: 0.6rem;
    background: rgba(139,92,246,0.2);
    padding: 2px 6px;
    border-radius: 10px;
    color: #a78bfa;
}

/* Statistics Grid */
.stats-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
    gap: 12px;
}

.stat-card {
    background: rgba(0,0,0,0.3);
    border-radius: 12px;
    padding: 12px;
    border-left: 2px solid #fbbf24;
}

.stat-value {
    font-size: 0.8rem;
    color: #fbbf24;
    margin-bottom: 8px;
    font-family: monospace;
}

.stat-source a {
    font-size: 0.65rem;
    color: #71717a;
    text-decoration: none;
}

.stat-source a:hover {
    color: #60a5fa;
}

/* Footer */
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

/* Error & Misc */
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

/* Responsive */
@media (max-width: 768px) {
    .answer-card, .citations-section, .gov-summary-section, .allsources-section, .stats-extracted-section, .deepdive-stats-card {
        padding: 16px;
    }
    
    .stats-footer {
        gap: 10px;
    }
    
    .citation-item {
        flex-direction: column;
    }
    
    .citation-source {
        flex-direction: column;
        align-items: flex-start;
    }
    
    .allsource-item {
        flex-wrap: wrap;
    }
    
    .allsource-domain {
        max-width: none;
        white-space: normal;
    }
    
    .answer-footer {
        flex-direction: column;
        align-items: flex-start;
    }
    
    .deepdive-grid {
        grid-template-columns: repeat(2, 1fr);
    }
    
    .verified-item {
        flex-direction: column;
    }
}
</style>
`;

// ============================================
// INITIALIZE
// ============================================
// Add styles to document
if (!document.querySelector('#debate-styles')) {
    const styleTag = document.createElement('style');
    styleTag.id = 'debate-styles';
    styleTag.textContent = styles;
    document.head.appendChild(styleTag);
}

// Set up event listeners
document.addEventListener('DOMContentLoaded', () => {
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        searchInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') searchDebate();
        });
    }
});

// Expose global functions
window.searchDebate = searchDebate;
window.setSearch = setSearch;
window.copyAnswerToClipboard = copyAnswerToClipboard;
window.toggleAllCitations = toggleAllCitations;
window.filterSources = filterSources;

console.log('DebateSpace Deep Dive UI loaded - Every sentence cited from government sources');
