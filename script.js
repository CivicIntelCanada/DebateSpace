// DebateSpace - Main Application Script
// Connects to Vercel API, keeps original layout

const searchForm = document.getElementById('searchForm');
const searchInput = document.getElementById('searchInput');
const searchBtn = document.getElementById('searchBtn');
const loadingDiv = document.getElementById('loading');
const errorDiv = document.getElementById('error');
const resultsDiv = document.getElementById('results');

// Rebuttal cache (saves to localStorage)
let rebuttalCache = {};

function loadCache() {
    const saved = localStorage.getItem('debatespace_cache');
    if (saved) {
        rebuttalCache = JSON.parse(saved);
    }
}

function saveCache() {
    localStorage.setItem('debatespace_cache', JSON.stringify(rebuttalCache));
}

function normalizeQuery(query) {
    return query.toLowerCase().trim().replace(/[^\w\s]/g, '');
}

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
    
    // Check cache first
    const normalized = normalizeQuery(query);
    if (rebuttalCache[normalized]) {
        displayResults(rebuttalCache[normalized], query);
        loadingDiv.style.display = 'none';
        searchBtn.disabled = false;
        resultsDiv.style.display = 'block';
        return;
    }
    
    try {
        const response = await fetch(`/api/search?query=${encodeURIComponent(query)}`);
        const data = await response.json();
        
        if (data.success && data.answer) {
            // Cache the result
            rebuttalCache[normalized] = data.answer;
            saveCache();
            displayResults(data.answer, query);
        } else {
            showError(data.error || 'Failed to fetch results. Please try again.');
        }
    } catch (err) {
        console.error('Error:', err);
        showError('Network error. Please check your connection and try again.');
    } finally {
        loadingDiv.style.display = 'none';
        searchBtn.disabled = false;
        resultsDiv.style.display = 'block';
    }
}

function showError(message) {
    errorDiv.textContent = `⚠️ ${message}`;
    errorDiv.style.display = 'block';
    resultsDiv.style.display = 'none';
}

function displayResults(answer, query) {
    let html = '';
    
    // Left Card
    html += `
        <div class="result-card left">
            <div class="card-title">⬅️ LEFT VIEW</div>
            ${answer.verdict ? `<div class="verdict">📊 ${answer.verdict}</div>` : ''}
            <div class="claim">${escapeHtml(answer.left || 'No left source found')}</div>
            <div class="source">🔗 Source: <a href="${answer.sources?.left || '#'}" target="_blank" rel="noopener noreferrer">${getDomain(answer.sources?.left) || 'Left Source'}</a></div>
            <div class="rebuttal">
                <h4>💬 Rebuttal Ready</h4>
                <p>${escapeHtml(answer.left || '')}</p>
                <button class="copy-btn" onclick="copyToClipboard('${escapeHtml(answer.left || '').replace(/'/g, "\\'")}')">📋 Copy Rebuttal</button>
            </div>
        </div>
    `;
    
    // Centre Card
    html += `
        <div class="result-card centre">
            <div class="card-title">⚖️ CENTRE VIEW</div>
            <div class="claim">${escapeHtml(answer.centre || 'No centre source found')}</div>
            <div class="source">🔗 Source: <a href="${answer.sources?.centre || '#'}" target="_blank" rel="noopener noreferrer">${getDomain(answer.sources?.centre) || 'Centre Source'}</a></div>
            ${answer.sources?.factcheck ? `<div class="source">✅ Fact Check: <a href="${answer.sources.factcheck}" target="_blank" rel="noopener noreferrer">Verify Here</a></div>` : ''}
        </div>
    `;
    
    // Right Card
    html += `
        <div class="result-card right">
            <div class="card-title">➡️ RIGHT VIEW</div>
            <div class="claim">${escapeHtml(answer.right || 'No right source found')}</div>
            <div class="source">🔗 Source: <a href="${answer.sources?.right || '#'}" target="_blank" rel="noopener noreferrer">${getDomain(answer.sources?.right) || 'Right Source'}</a></div>
            <div class="rebuttal">
                <h4>💬 Counter-Rebuttal</h4>
                <p>${escapeHtml(answer.right || '')}</p>
                <button class="copy-btn" onclick="copyToClipboard('${escapeHtml(answer.right || '').replace(/'/g, "\\'")}')">📋 Copy Counterpoint</button>
            </div>
        </div>
    `;
    
    // YouTube Section (if available)
    if (answer.youtube && answer.youtube.length > 0) {
        html += `
            <div class="result-card full-width" style="background: #f0f9ff;">
                <div class="card-title">🎥 YOUTUBE EXPLANATIONS</div>
                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(250px,1fr)); gap: 15px;">
                    ${answer.youtube.map(video => `
                        <div>
                            <a href="${video.url}" target="_blank" rel="noopener noreferrer"><strong>${escapeHtml(video.title).slice(0, 80)}</strong></a>
                            <p style="font-size:0.7rem; color:#666; margin-top:5px;">${escapeHtml(video.channel)}</p>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    }
    
    // Parliament Section (if available)
    if (answer.parliament) {
        html += `
            <div class="result-card full-width" style="background: #fefce8;">
                <div class="card-title">🏛️ PARLIAMENT / LIVE BRIEFINGS</div>
                <div><a href="${answer.parliament.url}" target="_blank" rel="noopener noreferrer">${escapeHtml(answer.parliament.title)}</a></div>
                <div class="source">📅 ${answer.parliament.date || 'Recent'}</div>
            </div>
        `;
    }
    
    // Wars Section (if available)
    if (answer.wars && answer.wars.length > 0) {
        html += `
            <div class="result-card full-width" style="background: #fef2f2;">
                <div class="card-title">⚔️ LIVE CONFLICT UPDATES</div>
                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px,1fr)); gap: 10px;">
                    ${answer.wars.map(war => `
                        <div>
                            <strong>${escapeHtml(war.name)}</strong><br>
                            Status: ${escapeHtml(war.status)}<br>
                            <a href="${war.source}" target="_blank" rel="noopener noreferrer">Live Map →</a>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    }
    
    resultsDiv.innerHTML = html;
    resultsDiv.style.display = 'grid';
}

function getDomain(url) {
    if (!url || url === '#') return null;
    try {
        return new URL(url).hostname.replace('www.', '');
    } catch {
        return null;
    }
}

function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function copyToClipboard(text) {
    navigator.clipboard.writeText(text);
    alert('✅ Copied to clipboard!');
}

// Initialize
loadCache();
