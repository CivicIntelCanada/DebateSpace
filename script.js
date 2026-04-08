// Debate Fact Checker - Vercel Backend Version
// Same UI, but WAY more sources and accuracy

// Source list (now just for display - actual search happens on Vercel)
const SOURCES = {
    left: ["The Guardian", "Vox", "The Nation", "Mother Jones", "The Intercept"],
    centre: ["Reuters", "Associated Press", "BBC News", "Politico", "The Hill"],
    right: ["Fox News", "National Review", "Washington Times", "Daily Wire", "NY Post"]
};

// Rebuttal library (now acts as cache, not primary source)
let rebuttalLibrary = {};

function loadRebuttals() {
    const saved = localStorage.getItem('debate_rebuttals');
    if (saved) {
        rebuttalLibrary = JSON.parse(saved);
    } else {
        rebuttalLibrary = {};
        saveRebuttals();
    }
}

function saveRebuttals() {
    localStorage.setItem('debate_rebuttals', JSON.stringify(rebuttalLibrary));
}

function normalizeQuery(query) {
    return query.toLowerCase().trim().replace(/[^\w\s]/g, '');
}

function findMatchingRebuttal(query) {
    const normalized = normalizeQuery(query);
    if (rebuttalLibrary[normalized]) return rebuttalLibrary[normalized];
    
    for (const [key, value] of Object.entries(rebuttalLibrary)) {
        if (normalized.includes(key) || key.includes(normalized)) {
            return value;
        }
    }
    return null;
}

// MAIN SEARCH FUNCTION - Calls Vercel API
async function searchDebate() {
    const query = document.getElementById('searchInput').value;
    if (!query.trim()) return;

    const loading = document.getElementById('loading');
    const resultsDiv = document.getElementById('results');

    loading.style.display = 'block';
    resultsDiv.innerHTML = '';

    try {
        // Check local cache first
        let rebuttal = findMatchingRebuttal(query);
        
        if (!rebuttal) {
            // Call Vercel API (this gives you ALL the sources, YouTube, parliament, etc.)
            resultsDiv.innerHTML = '<div class="result-card" style="grid-column:1/-1; text-align:center;">🔍 Searching live sources (YouTube, news, fact-checks, parliament)...</div>';
            
            const response = await fetch(`/api/search?query=${encodeURIComponent(query)}`);
            const data = await response.json();
            
            if (data.success && data.answer) {
                rebuttal = {
                    topic: query,
                    verdict: data.answer.verdict || "Check sources",
                    left: data.answer.left || "No left source found",
                    centre: data.answer.centre || "No centre source found",
                    right: data.answer.right || "No right source found",
                    sources: data.answer.sources || {},
                    youtube: data.answer.youtube || [],
                    parliament: data.answer.parliament || null,
                    wars: data.answer.wars || null
                };
                
                // Cache for next time
                const key = normalizeQuery(query);
                rebuttalLibrary[key] = rebuttal;
                saveRebuttals();
            } else {
                throw new Error(data.error || "No results");
            }
        }
        
        // Display results (same format as before, but with more data)
        displayResults(rebuttal);
        
    } catch (error) {
        console.error('Search error:', error);
        resultsDiv.innerHTML = `
            <div class="result-card" style="grid-column:1/-1; text-align:center; background:#fee;">
                <h3>⚠️ Error fetching results</h3>
                <p>${error.message || "Please try again"}</p>
                <p style="font-size:0.8rem;">Make sure Vercel is deployed and API routes are working.</p>
            </div>
        `;
    } finally {
        loading.style.display = 'none';
    }
}

// Updated display function - handles YouTube and parliament too
function displayResults(rebuttal) {
    const resultsDiv = document.getElementById('results');

    let html = `
        <div class="result-card left">
            <div class="card-title">⬅️ LEFT VIEW</div>
            ${rebuttal.verdict ? `<div class="verdict">📊 ${rebuttal.verdict}</div>` : ''}
            <div class="claim">${rebuttal.left}</div>
            <div class="source">🔗 Source: <a href="${rebuttal.sources.left || '#'}" target="_blank">${rebuttal.sources.left?.split('/')[2] || 'Left Source'}</a></div>
            <div class="rebuttal">
                <h4>💬 Rebuttal Ready</h4>
                <p>${rebuttal.left}</p>
                <button class="copy-btn" onclick="copyToClipboard('${rebuttal.left.replace(/'/g, "\\'")}')">📋 Copy Rebuttal</button>
            </div>
        </div>

        <div class="result-card centre">
            <div class="card-title">⚖️ CENTRE VIEW</div>
            <div class="claim">${rebuttal.centre}</div>
            <div class="source">🔗 Source: <a href="${rebuttal.sources.centre || '#'}" target="_blank">${rebuttal.sources.centre?.split('/')[2] || 'Centre Source'}</a></div>
            ${rebuttal.sources.factcheck ? `<div class="source">✅ Fact Check: <a href="${rebuttal.sources.factcheck}" target="_blank">View Verification</a></div>` : ''}
        </div>

        <div class="result-card right">
            <div class="card-title">➡️ RIGHT VIEW</div>
            <div class="claim">${rebuttal.right}</div>
            <div class="source">🔗 Source: <a href="${rebuttal.sources.right || '#'}" target="_blank">${rebuttal.sources.right?.split('/')[2] || 'Right Source'}</a></div>
            <div class="rebuttal">
                <h4>💬 Counter-Rebuttal</h4>
                <p>${rebuttal.right}</p>
                <button class="copy-btn" onclick="copyToClipboard('${rebuttal.right.replace(/'/g, "\\'")}')">📋 Copy Counterpoint</button>
            </div>
        </div>
    `;

    // YouTube section
    if (rebuttal.youtube && rebuttal.youtube.length > 0) {
        html += `
            <div class="result-card" style="grid-column: 1/-1; background: #f0f9ff;">
                <div class="card-title">🎥 YOUTUBE EXPLANATIONS</div>
                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(280px,1fr)); gap: 15px;">
                    ${rebuttal.youtube.map(video => `
                        <div>
                            <a href="${video.url}" target="_blank">
                                <strong>${video.title.slice(0, 80)}</strong>
                            </a>
                            <p style="font-size:0.75rem; color:#666;">${video.channel} • ${video.views} views</p>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    }

    // Parliament section
    if (rebuttal.parliament) {
        html += `
            <div class="result-card" style="grid-column: 1/-1; background: #fefce8;">
                <div class="card-title">🏛️ PARLIAMENT/LIVE BRIEFINGS</div>
                <div><a href="${rebuttal.parliament.url}" target="_blank">${rebuttal.parliament.title}</a></div>
                <div class="source">📅 ${rebuttal.parliament.date || 'Recent'}</div>
            </div>
        `;
    }

    // Wars section
    if (rebuttal.wars && rebuttal.wars.length > 0) {
        html += `
            <div class="result-card" style="grid-column: 1/-1; background: #fef2f2;">
                <div class="card-title">⚔️ LIVE CONFLICT UPDATES</div>
                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px,1fr)); gap: 10px;">
                    ${rebuttal.wars.map(war => `
                        <div>
                            <strong>${war.name}</strong><br>
                            Status: ${war.status}<br>
                            <a href="${war.source}" target="_blank">Live Map →</a>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    }

    resultsDiv.innerHTML = html;
}

function copyToClipboard(text) {
    navigator.clipboard.writeText(text);
    alert('✅ Rebuttal copied to clipboard!');
}

// Allow Enter key
document.getElementById('searchInput').addEventListener('keypress', function(e) {
    if (e.key === 'Enter') searchDebate();
});

// Initialize
loadRebuttals();
