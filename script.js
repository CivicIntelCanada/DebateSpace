// ============================================
// DEBATESPACE - FULL WIDTH LANDSCAPE LAYOUT
// NO MAX-WIDTH - Takes 100% of viewport
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
    
    // Using mock data for immediate visual feedback
    setTimeout(() => {
        const mockData = generateMockData(query);
        renderFullWidth(mockData, query);
        loading.style.display = 'none';
    }, 500);
}

function generateMockData(query) {
    const q = query.toLowerCase();
    
    let answer = {
        summary: `Here are the key facts about "${query}" based on government and academic sources.`,
        details: [
            "📊 Data point 1: Key statistic and finding",
            "📈 Data point 2: Important trend or comparison",
            "🎯 Data point 3: Policy relevance and impact",
            "💵 Data point 4: Economic or social implication"
        ],
        source: "Government Data Sources",
        sourceUrl: "#"
    };
    
    if (q.includes('inflation')) {
        answer = {
            summary: "Inflation has moderated significantly from its 2022 peaks. Central bank rate hikes have helped cool the economy while avoiding a recession.",
            details: [
                "📊 US inflation rate: 3.1% (Jan 2025), down from 9.1% peak (June 2022)",
                "📈 Canada inflation rate: 2.9% (Jan 2025), down from 8.1% peak (June 2022)",
                "🎯 Federal Reserve target: 2% annual inflation",
                "💵 Core inflation (excluding food/energy): 2.8% in US, 2.5% in Canada"
            ],
            source: "Bureau of Labor Statistics / Statistics Canada",
            sourceUrl: "#"
        };
    }
    
    if (q.includes('carbon') || q.includes('climate')) {
        answer = {
            summary: "Carbon pricing is a key policy tool for reducing emissions. Evidence shows it effectively lowers emissions when set at adequate levels.",
            details: [
                "🌍 Canada carbon tax: $80/tonne (April 2025), rising to $170 by 2030",
                "💰 Rebates: 80% of households receive more back than they pay (PBO)",
                "📉 Emissions reduction: Estimated 50-80 million tonnes by 2030",
                "🏛️ Coverage: Applies to 90% of Canadian emissions"
            ],
            source: "Parliamentary Budget Officer / Environment Canada",
            sourceUrl: "#"
        };
    }
    
    const opinions = {
        left: {
            perspective: "Progressive perspectives emphasize systemic solutions, social justice, and government intervention. Left-leaning media highlight inequality and advocate for structural change, robust public services, and collective responsibility. They argue that market failures require government correction.",
            news: [
                { title: `Analysis: How ${q} affects working families`, source: "The Guardian", url: "#", description: "Progressive analysis of economic impacts on households." },
                { title: `Opinion: Government action needed on ${q}`, source: "The Nation", url: "#", description: "Left-leaning perspective calling for policy interventions." },
                { title: `${q} and the case for public investment`, source: "Washington Post", url: "#", description: "Analysis of how public spending could address key issues." }
            ]
        },
        centre: {
            perspective: "Centrist analysis focuses on evidence-based pragmatism, balanced reporting, and empirical data. Centre sources prioritize factual accuracy and cost-benefit analysis, drawing from both sides while rejecting ideological extremes.",
            news: [
                { title: `Fact-based analysis of ${q}`, source: "Reuters", url: "#", description: "Neutral examination of available data and research." },
                { title: `${q}: Balancing competing priorities`, source: "AP News", url: "#", description: "Centrist perspective on trade-offs and solutions." },
                { title: `What the data says about ${q}`, source: "BBC News", url: "#", description: "Evidence-based reporting on key metrics and outcomes." }
            ]
        },
        right: {
            perspective: "Conservative perspectives stress free markets, individual liberty, and limited government. Right-leaning media highlight personal responsibility, economic incentives, and skepticism of top-down solutions.",
            news: [
                { title: `${q} and economic freedom`, source: "Wall Street Journal", url: "#", description: "Conservative analysis of market-based approaches." },
                { title: `Opinion: Rethinking ${q} policy`, source: "National Review", url: "#", description: "Right-leaning critique of current approaches." },
                { title: `Free market solutions for ${q}`, source: "Fox News", url: "#", description: "Conservative perspective on policy alternatives." }
            ]
        }
    };
    
    const thinkTanks = [
        { name: "Brookings Institution", bias: "Centre-Left", url: "#" },
        { name: "Pew Research Center", bias: "Centre", url: "#" },
        { name: "Cato Institute", bias: "Right", url: "#" },
        { name: "Fraser Institute", bias: "Right (Canadian)", url: "#" },
        { name: "CCPA", bias: "Left (Canadian)", url: "#" },
        { name: "RAND Corporation", bias: "Centre", url: "#" }
    ];
    
    const videos = [
        { title: `${q} explained in 5 minutes`, channel: "Educational Channel", thumbnail: "https://img.youtube.com/vi/default/mqdefault.jpg", url: "#" },
        { title: `Debate: The future of ${q}`, channel: "University Lecture Series", thumbnail: "https://img.youtube.com/vi/default/mqdefault.jpg", url: "#" },
        { title: `${q} policy analysis`, channel: "Think Tank Forum", thumbnail: "https://img.youtube.com/vi/default/mqdefault.jpg", url: "#" },
        { title: `Understanding ${q}: A balanced overview`, channel: "Public Broadcasting", thumbnail: "https://img.youtube.com/vi/default/mqdefault.jpg", url: "#" }
    ];
    
    return { answer, opinions, thinkTanks, videos };
}

function renderFullWidth(data, query) {
    const container = document.getElementById('results');
    
    const renderNews = (newsArray) => {
        if (!newsArray || newsArray.length === 0) return '<div class="no-news">No news articles found</div>';
        return newsArray.map(article => `
            <div class="news-item">
                <a href="${article.url}" target="_blank" class="news-title">${article.title}</a>
                <div class="news-meta">${article.source}</div>
                ${article.description ? `<div class="news-preview">${article.description.substring(0, 100)}...</div>` : ''}
            </div>
        `).join('');
    };
    
    let html = `
        <!-- FACT CHECK CARD -->
        <div class="fact-card">
            <div class="fact-header">✅ FACT CHECK & ANSWER</div>
            <div class="fact-summary">${data.answer.summary}</div>
            <div class="fact-details">
                ${data.answer.details.map(d => `<div>${d}</div>`).join('')}
            </div>
            <div class="fact-source">Source: <a href="${data.answer.sourceUrl}" target="_blank">${data.answer.source} →</a></div>
        </div>
        
        <!-- THREE COLUMNS - FULL WIDTH -->
        <div class="columns-row">
            <div class="column left-col">
                <div class="column-header left-header">⬅️ LEFT PERSPECTIVE</div>
                <div class="column-opinion">${data.opinions.left.perspective}</div>
                <div class="column-news-label">📰 Supporting News</div>
                <div class="column-news-list">${renderNews(data.opinions.left.news)}</div>
            </div>
            
            <div class="column centre-col">
                <div class="column-header centre-header">⚖️ CENTRE PERSPECTIVE</div>
                <div class="column-opinion">${data.opinions.centre.perspective}</div>
                <div class="column-news-label">📰 Supporting News</div>
                <div class="column-news-list">${renderNews(data.opinions.centre.news)}</div>
            </div>
            
            <div class="column right-col">
                <div class="column-header right-header">➡️ RIGHT PERSPECTIVE</div>
                <div class="column-opinion">${data.opinions.right.perspective}</div>
                <div class="column-news-label">📰 Supporting News</div>
                <div class="column-news-list">${renderNews(data.opinions.right.news)}</div>
            </div>
        </div>
        
        <!-- THINK TANKS -->
        <div class="think-row">
            <div class="think-header">📚 THINK TANKS & RESEARCH</div>
            <div class="think-grid">
                ${data.thinkTanks.map(t => `
                    <a href="${t.url}" target="_blank" class="think-card">
                        <strong>${t.name}</strong>
                        <span class="think-bias ${(t.bias || '').toLowerCase().replace(/[^a-z-]/g, '-')}">${t.bias || 'Research'}</span>
                    </a>
                `).join('')}
            </div>
        </div>
        
        <!-- VIDEOS -->
        <div class="video-row">
            <div class="video-header">📺 VIDEO EXPLANATIONS</div>
            <div class="video-grid">
                ${data.videos.map(v => `
                    <div class="video-card" onclick="window.open('${v.url}', '_blank')">
                        <img src="${v.thumbnail}" alt="${v.title}">
                        <div class="video-title">${v.title.length > 55 ? v.title.substring(0,55)+'...' : v.title}</div>
                        <div class="video-channel">${v.channel}</div>
                    </div>
                `).join('')}
            </div>
        </div>
        
        <!-- STATS -->
        <div class="stats-footer">
            <span>🔍 "${query}"</span>
            <span>📰 9 Articles</span>
            <span>📺 4 Videos</span>
            <span>📚 6 Think Tanks</span>
        </div>
    `;
    
    container.innerHTML = html;
}

function setSearch(topic) {
    document.getElementById('searchInput').value = topic;
    searchDebate();
}

window.searchDebate = searchDebate;
window.setSearch = setSearch;

document.getElementById('searchInput')?.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') searchDebate();
});

console.log('DebateSpace - Full width landscape loaded');
