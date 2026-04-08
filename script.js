// Debate Fact Checker - Main Search Engine
// Left, Centre, Right sources with auto-generation

// Source list with bias ratings
const SOURCES = {
    left: [
        { name: "The Guardian", url: "https://www.theguardian.com", rss: "https://www.theguardian.com/world/rss" },
        { name: "Vox", url: "https://www.vox.com", rss: "https://www.vox.com/rss/index.xml" },
        { name: "The Nation", url: "https://www.thenation.com", rss: "https://www.thenation.com/rss" }
    ],
    centre: [
        { name: "Reuters", url: "https://www.reuters.com", rss: "https://www.reuters.com/rss" },
        { name: "Associated Press", url: "https://apnews.com", rss: "http://hosted2.ap.org/atom/APTopNews" },
        { name: "BBC News", url: "https://www.bbc.com", rss: "http://feeds.bbci.co.uk/news/rss.xml" }
    ],
    right: [
        { name: "Fox News", url: "https://www.foxnews.com", rss: "http://feeds.foxnews.com/foxnews/latest" },
        { name: "National Review", url: "https://www.nationalreview.com", rss: "https://www.nationalreview.com/feed" },
        { name: "The Hill", url: "https://thehill.com", rss: "https://thehill.com/feed" }
    ]
};

// Pre-loaded rebuttal library (will grow over time)
let rebuttalLibrary = {};

// Load saved rebuttals from local storage or default
function loadRebuttals() {
    const saved = localStorage.getItem('debate_rebuttals');
    if (saved) {
        rebuttalLibrary = JSON.parse(saved);
    } else {
        // Default rebuttals for common topics
        rebuttalLibrary = {
            "inflation biden": {
                topic: "Biden and inflation",
                verdict: "Context dependent",
                left: "Inflation peaked at 9.1% in June 2022, now down to 2.9% (Feb 2025) - Biden's policies worked",
                centre: "Inflation rose due to global supply chain issues, then fell significantly",
                right: "Prices are still 19% higher than when Biden took office - permanent damage",
                sources: {
                    left: "https://www.epi.org/blog/inflation-is-falling/",
                    centre: "https://www.reuters.com/markets/us/us-inflation-data-2025-02-12/",
                    right: "https://www.heritage.org/budget-and-spending/commentary/inflation-is-down-prices-are-not"
                }
            },
            "trump economy": {
                topic: "Trump economy performance",
                verdict: "Mixed - pre-COVID strong, pandemic collapse",
                left: "Trump inherited Obama's recovery, added $7.8 trillion to debt",
                centre: "Low unemployment (3.5%) and stock market highs until COVID",
                right: "Best economy in 50 years before pandemic shutdowns",
                sources: {
                    left: "https://www.cbpp.org/research/economy/trump-budget",
                    centre: "https://www.bls.gov/charts/employment-situation/",
                    right: "https://www.whitehouse.gov/trump-administration-accomplishments/"
                }
            },
            "climate change": {
                topic: "Climate change reality",
                verdict: "Scientifically confirmed",
                left: "Climate crisis is existential threat requiring immediate action",
                centre: "97% of climate scientists agree on human-caused warming (IPCC)",
                right: "Climate changes naturally; focus on adaptation, not panic",
                sources: {
                    left: "https://www.sierraclub.org/climate",
                    centre: "https://www.ipcc.ch/report/ar6/wg1/",
                    right: "https://www.climatechangereconsidered.org/"
                }
            }
        };
        saveRebuttals();
    }
}

function saveRebuttals() {
    localStorage.setItem('debate_rebuttals', JSON.stringify(rebuttalLibrary));
}

// Normalize search query
function normalizeQuery(query) {
    return query.toLowerCase().trim().replace(/[^\w\s]/g, '');
}

// Search for matching rebuttal
function findMatchingRebuttal(query) {
    const normalized = normalizeQuery(query);
    
    // Check exact match
    if (rebuttalLibrary[normalized]) {
        return rebuttalLibrary[normalized];
    }
    
    // Check partial matches
    for (const [key, value] of Object.entries(rebuttalLibrary)) {
        if (normalized.includes(key) || key.includes(normalized)) {
            return value;
        }
    }
    
    return null;
}

// Search RSS feeds for latest news
async function searchRSS(topic, bias) {
    const sourcesList = SOURCES[bias];
    const results = [];
    
    for (const source of sourcesList) {
        try {
            // Use rss2json.com as free proxy (CORS friendly)
            const proxyUrl = `https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(source.rss)}`;
            const response = await fetch(proxyUrl);
            const data = await response.json();
            
            if (data.items) {
                // Find articles matching topic
                const matching = data.items.filter(item => 
                    item.title.toLowerCase().includes(topic.toLowerCase()) ||
                    (item.description && item.description.toLowerCase().includes(topic.toLowerCase()))
                ).slice(0, 2);
                
                matching.forEach(item => {
                    results.push({
                        title: item.title,
                        link: item.link,
                        source: source.name,
                        date: item.pubDate
                    });
                });
            }
        } catch (error) {
            console.error(`Error fetching ${source.name}:`, error);
        }
    }
    
    return results;
}

// Generate new rebuttal using free APIs
async function generateRebuttal(topic) {
    console.log(`Generating new rebuttal for: ${topic}`);
    
    // Try Wikipedia for background
    let wikipedia = null;
    try {
        const wikiResponse = await fetch(`https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(topic)}`);
        wikipedia = await wikiResponse.json();
    } catch (e) { console.log("Wikipedia fetch failed"); }
    
    // Try Google Fact Check API (no key needed for basic search)
    let factCheck = null;
    try {
        const factResponse = await fetch(`https://factchecktools.googleapis.com/v1alpha1/claims:search?query=${encodeURIComponent(topic)}`);
        factCheck = await factResponse.json();
    } catch (e) { console.log("Fact check API failed"); }
    
    // Get live news from each bias
    const leftNews = await searchRSS(topic, 'left');
    const centreNews = await searchRSS(topic, 'centre');
    const rightNews = await searchRSS(topic, 'right');
    
    // Create new rebuttal
    const newRebuttal = {
        topic: topic,
        verdict: factCheck?.claims?.[0]?.textualRating || "Check multiple sources",
        left: leftNews[0]?.title || wikipedia?.extract?.slice(0, 200) || "No left source found yet",
        centre: centreNews[0]?.title || "Search our news sources for latest",
        right: rightNews[0]?.title || "No right source found yet",
        sources: {
            left: leftNews[0]?.link || wikipedia?.content_urls?.desktop?.page || "#",
            centre: centreNews[0]?.link || "#",
            right: rightNews[0]?.link || "#",
            factcheck: factCheck?.claims?.[0]?.claimReview?.[0]?.url || null
        },
        generated: new Date().toISOString()
    };
    
    // Save to library
    const key = normalizeQuery(topic);
    rebuttalLibrary[key] = newRebuttal;
    saveRebuttals();
    
    return newRebuttal;
}

// Display results
function displayResults(rebuttal, liveNews) {
    const resultsDiv = document.getElementById('results');
    
    resultsDiv.innerHTML = `
        <div class="result-card left">
            <div class="card-title">⬅️ LEFT VIEW</div>
            ${rebuttal.verdict ? `<div class="verdict">📊 ${rebuttal.verdict}</div>` : ''}
            <div class="claim">${rebuttal.left}</div>
            <div class="source">🔗 Source: <a href="${rebuttal.sources.left}" target="_blank">${rebuttal.sources.left.split('/')[2] || 'Link'}</a></div>
            <div class="rebuttal">
                <h4>💬 Rebuttal Ready</h4>
                <p>${rebuttal.left}</p>
                <button class="copy-btn" onclick="copyToClipboard('${rebuttal.left.replace(/'/g, "\\'")}')">📋 Copy Rebuttal</button>
            </div>
        </div>
        
        <div class="result-card centre">
            <div class="card-title">⚖️ CENTRE VIEW</div>
            <div class="claim">${rebuttal.centre}</div>
            <div class="source">🔗 Source: <a href="${rebuttal.sources.centre}" target="_blank">${rebuttal.sources.centre.split('/')[2] || 'Link'}</a></div>
            ${rebuttal.sources.factcheck ? `<div class="source">✅ Fact Check: <a href="${rebuttal.sources.factcheck}" target="_blank">View Verification</a></div>` : ''}
        </div>
        
        <div class="result-card right">
            <div class="card-title">➡️ RIGHT VIEW</div>
            <div class="claim">${rebuttal.right}</div>
            <div class="source">🔗 Source: <a href="${rebuttal.sources.right}" target="_blank">${rebuttal.sources.right.split('/')[2] || 'Link'}</a></div>
            <div class="rebuttal">
                <h4>💬 Counter-Rebuttal</h4>
                <p>${rebuttal.right}</p>
                <button class="copy-btn" onclick="copyToClipboard('${rebuttal.right.replace(/'/g, "\\'")}')">📋 Copy Counterpoint</button>
            </div>
        </div>
    `;
    
    // Add live news section if available
    if (liveNews && (liveNews.left.length || liveNews.centre.length || liveNews.right.length)) {
        resultsDiv.innerHTML += `
            <div class="result-card" style="grid-column: 1/-1; background: #f0f9ff;">
                <div class="card-title">📰 LIVE NEWS (Last 24 hours)</div>
                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px,1fr)); gap: 15px;">
                    ${liveNews.left.map(n => `<div><strong>⬅️ Left:</strong> <a href="${n.link}" target="_blank">${n.title.slice(0,80)}</a></div>`).join('')}
                    ${liveNews.centre.map(n => `<div><strong>⚖️ Centre:</strong> <a href="${n.link}" target="_blank">${n.title.slice(0,80)}</a></div>`).join('')}
                    ${liveNews.right.map(n => `<div><strong>➡️ Right:</strong> <a href="${n.link}" target="_blank">${n.title.slice(0,80)}</a></div>`).join('')}
                </div>
            </div>
        `;
    }
}

// Copy to clipboard function
function copyToClipboard(text) {
    navigator.clipboard.writeText(text);
    alert('✅ Rebuttal copied to clipboard!');
}

// Main search function
async function searchDebate() {
    const query = document.getElementById('searchInput').value;
    if (!query.trim()) return;
    
    const loading = document.getElementById('loading');
    const resultsDiv = document.getElementById('results');
    
    loading.style.display = 'block';
    resultsDiv.innerHTML = '';
    
    try {
        // First, try to find existing rebuttal
        let rebuttal = findMatchingRebuttal(query);
        
        // If not found, generate new one
        if (!rebuttal) {
            resultsDiv.innerHTML = '<div class="result-card" style="grid-column:1/-1; text-align:center;">🔍 New topic detected! Generating rebuttal from live sources... (This may take 10-15 seconds)</div>';
            rebuttal = await generateRebuttal(query);
        }
        
        // Get live news from RSS
        const liveNews = {
            left: await searchRSS(query, 'left'),
            centre: await searchRSS(query, 'centre'),
            right: await searchRSS(query, 'right')
        };
        
        // Display everything
        displayResults(rebuttal, liveNews);
        
    } catch (error) {
        console.error('Search error:', error);
        resultsDiv.innerHTML = `
            <div class="result-card" style="grid-column:1/-1; text-align:center; background:#fee;">
                <h3>⚠️ Error fetching results</h3>
                <p>Please try again. Check your internet connection.</p>
                <p style="font-size:0.8rem;">Error: ${error.message}</p>
            </div>
        `;
    } finally {
        loading.style.display = 'none';
    }
}

// Allow Enter key to search
document.getElementById('searchInput').addEventListener('keypress', function(e) {
    if (e.key === 'Enter') searchDebate();
});

// Initialize on page load
loadRebuttals();
