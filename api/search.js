// ============================================
// DEBATESPACE - GOVERNMENT DATA FIRST
// Prioritizes .gov, official sources over AI
// ============================================

export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    
    const { query } = req.query;
    if (!query || query.trim() === '') {
        return res.status(400).json({ error: 'No query provided' });
    }
    
    console.log(`[API] Government-first search: "${query}"`);
    
    try {
        // Fetch ALL government sources FIRST (priority)
        const govResults = await fetchAllGovernmentSources(query);
        
        // Then fetch supplementary data
        const [newsResult, youtubeResult] = await Promise.all([
            fetchGNews(query),
            fetchYouTube(query)
        ]);
        
        // Build fact check from government sources ONLY
        const factCheck = buildFactCheckFromGovernment(govResults, query);
        
        // Format news articles
        const formattedNews = formatNews(newsResult, query);
        
        return res.status(200).json({
            success: true,
            query: query,
            factCheck: factCheck,
            newsArticles: formattedNews,
            youtube: youtubeResult,
            timestamp: new Date().toISOString()
        });
        
    } catch (error) {
        console.error('[API] Error:', error);
        return res.status(200).json({
            success: true,
            query: query,
            factCheck: {
                verdict: "🔍 SEARCH GOVERNMENT SOURCES",
                summary: `Search official government websites below for accurate information about "${query}".`,
                citedClaims: [],
                governmentSearchLinks: getGovernmentSearchLinks(query),
                tip: "Government websites (.gov, .gc.ca) contain the most authoritative information"
            },
            newsArticles: getFallbackNews(query),
            youtube: []
        });
    }
}

// ============================================
// FETCH ALL 5 GOOGLE SEARCH ENGINES - PRIORITY
// ============================================
async function fetchAllGovernmentSources(query) {
    const apiKey = process.env.GOOGLE_SEARCH_API_KEY;
    
    const searchEngines = [
        { name: 'North America', cx: process.env.GOOGLE_SEARCH_CX_NA, priority: 1 },
        { name: 'Europe', cx: process.env.GOOGLE_SEARCH_CX_EU, priority: 2 },
        { name: 'Asia Pacific', cx: process.env.GOOGLE_SEARCH_CX_ASIA, priority: 3 },
        { name: 'Think Tanks', cx: process.env.GOOGLE_SEARCH_CX_TT, priority: 4 },
        { name: 'News', cx: process.env.GOOGLE_SEARCH_CX_NEWS, priority: 5 }
    ];
    
    const allResults = [];
    
    for (const engine of searchEngines) {
        if (!apiKey || !engine.cx) continue;
        
        try {
            // Get more results per engine (num=10)
            const url = `https://www.googleapis.com/customsearch/v1?key=${apiKey}&cx=${engine.cx}&q=${encodeURIComponent(query)}&num=10`;
            const response = await fetch(url);
            
            if (response.ok) {
                const data = await response.json();
                if (data.items && data.items.length > 0) {
                    for (const item of data.items) {
                        let siteName = "";
                        let isGovernment = false;
                        try {
                            const urlObj = new URL(item.link);
                            siteName = urlObj.hostname.replace('www.', '');
                            // Mark government sources
                            if (siteName.includes('.gov') || siteName.includes('.gc.ca') || 
                                siteName.includes('.mil') || siteName.includes('.edu')) {
                                isGovernment = true;
                            }
                        } catch (e) {
                            siteName = engine.name;
                        }
                        
                        allResults.push({
                            name: siteName,
                            title: item.title,
                            url: item.link,
                            snippet: item.snippet,
                            engine: engine.name,
                            isGovernment: isGovernment,
                            priority: engine.priority
                        });
                    }
                }
            }
        } catch (error) {
            console.error(`[${engine.name}] Error:`, error.message);
        }
    }
    
    // Remove duplicates by URL
    const uniqueResults = [];
    const seenUrls = new Set();
    for (const result of allResults) {
        if (!seenUrls.has(result.url)) {
            seenUrls.add(result.url);
            uniqueResults.push(result);
        }
    }
    
    // Sort: Government sources first, then by priority
    uniqueResults.sort((a, b) => {
        if (a.isGovernment && !b.isGovernment) return -1;
        if (!a.isGovernment && b.isGovernment) return 1;
        return a.priority - b.priority;
    });
    
    return { sources: uniqueResults.slice(0, 25) };
}

// ============================================
// BUILD FACT CHECK FROM GOVERNMENT SOURCES ONLY
// ============================================
function buildFactCheckFromGovernment(govResults, query) {
    const q = query.toLowerCase();
    const sources = govResults?.sources || [];
    
    // Separate government sources from others
    const govSources = sources.filter(s => s.isGovernment);
    const otherSources = sources.filter(s => !s.isGovernment);
    
    // Create cited claims from government sources FIRST
    const citedClaims = [];
    
    // Add government sources as claims (these are the most authoritative)
    for (const source of govSources.slice(0, 12)) {
        if (source.url && source.name) {
            citedClaims.push({
                claim: source.snippet || source.title,
                source: source.name.toUpperCase(),
                url: source.url,
                type: "Government Source"
            });
        }
    }
    
    // Add other authoritative sources if needed
    if (citedClaims.length < 5) {
        for (const source of otherSources.slice(0, 8)) {
            if (source.url && source.name) {
                citedClaims.push({
                    claim: source.snippet || source.title,
                    source: source.name,
                    url: source.url,
                    type: "Source"
                });
            }
        }
    }
    
    // Build summary based on government source snippets
    let summary = "";
    if (govSources.length > 0) {
        // Use the top government source as the summary
        const topGov = govSources[0];
        summary = topGov.snippet ? topGov.snippet : `Official government information about "${query}".`;
    } else {
        summary = `Search official government websites below for accurate information about "${query}".`;
    }
    
    return {
        verdict: "🏛️ GOVERNMENT SOURCES",
        summary: summary.length > 400 ? summary.substring(0, 400) + '...' : summary,
        citedClaims: citedClaims,
        governmentSearchLinks: getGovernmentSearchLinks(query),
        tip: "Click any source above to read the official government document",
        sourceCount: {
            government: govSources.length,
            total: sources.length
        }
    };
}

// ============================================
// DIRECT GOVERNMENT SEARCH LINKS (ALWAYS WORKS)
// ============================================
function getGovernmentSearchLinks(query) {
    const encoded = encodeURIComponent(query);
    const q = query.toLowerCase();
    
    const links = [
        { name: "Canada.ca", url: `https://www.canada.ca/en/search.html?q=${encoded}`, type: "Government of Canada" },
        { name: "USA.gov", url: `https://www.usa.gov/search?query=${encoded}`, type: "US Government" },
        { name: "GOV.UK", url: `https://www.gov.uk/search/all?q=${encoded}`, type: "UK Government" },
        { name: "Statistics Canada", url: `https://www.statcan.gc.ca/en/search?q=${encoded}`, type: "StatCan" },
        { name: "Bureau of Labor Statistics", url: `https://www.bls.gov/search/?q=${encoded}`, type: "US BLS" },
        { name: "European Union", url: `https://ec.europa.eu/search/?query=${encoded}`, type: "EU" },
        { name: "United Nations", url: `https://www.un.org/en/search?q=${encoded}`, type: "UN" },
        { name: "World Bank", url: `https://www.worldbank.org/en/search?q=${encoded}`, type: "World Bank" }
    ];
    
    // Add ICE-specific links
    if (q.includes('ice') || q.includes('immigration') || q.includes('training')) {
        links.unshift(
            { name: "ICE.gov", url: `https://www.ice.gov/search?search=${encoded}`, type: "ICE Official" },
            { name: "FLETC.gov", url: `https://www.fletc.gov/search/node/${encoded}`, type: "FLETC Training" },
            { name: "DHS.gov", url: `https://www.dhs.gov/search?query=${encoded}`, type: "Department of Homeland Security" }
        );
    }
    
    return links;
}

// ============================================
// GNEWS API
// ============================================
async function fetchGNews(query) {
    const apiKey = process.env.GNEWS_API_KEY;
    if (!apiKey) return [];
    
    try {
        const url = `https://gnews.io/api/v4/search?q=${encodeURIComponent(query)}&lang=en&max=15&token=${apiKey}`;
        const response = await fetch(url);
        
        if (!response.ok) return [];
        
        const data = await response.json();
        if (!data.articles || data.articles.length === 0) return [];
        
        return data.articles.map(article => {
            let siteName = "";
            try {
                const urlObj = new URL(article.url);
                siteName = urlObj.hostname.replace('www.', '');
            } catch (e) {
                siteName = article.source?.name || "News";
            }
            
            return {
                name: siteName,
                title: article.title,
                url: article.url,
                date: article.publishedAt ? article.publishedAt.split('T')[0] : new Date().toISOString().split('T')[0],
                description: article.description ? article.description.substring(0, 150) + '...' : 'Click to read'
            };
        });
        
    } catch (error) {
        console.error('[GNews] Error:', error.message);
        return [];
    }
}

// ============================================
// YOUTUBE API
// ============================================
async function fetchYouTube(query) {
    const apiKey = process.env.YOUTUBE_API_KEY;
    if (!apiKey) return [];
    
    try {
        const url = `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(query)}&type=video&maxResults=6&key=${apiKey}`;
        const response = await fetch(url);
        if (!response.ok) return [];
        
        const data = await response.json();
        if (!data.items || data.items.length === 0) return [];
        
        return data.items.map(item => ({
            title: item.snippet.title,
            url: `https://www.youtube.com/watch?v=${item.id.videoId}`,
            channel: item.snippet.channelTitle,
            thumbnail: item.snippet.thumbnails?.medium?.url || ''
        }));
        
    } catch (error) {
        return [];
    }
}

// ============================================
// FALLBACK FUNCTIONS
// ============================================
function formatNews(articles, query) {
    if (!articles || articles.length === 0) {
        return getFallbackNews(query);
    }
    return articles;
}

function getFallbackNews(query) {
    const encoded = encodeURIComponent(query);
    return [
        { name: "reuters.com", title: `Reuters - ${query}`, url: `https://www.reuters.com/search?news=${encoded}`, date: new Date().toISOString().split('T')[0] },
        { name: "apnews.com", title: `AP News - ${query}`, url: `https://apnews.com/search?q=${encoded}`, date: new Date().toISOString().split('T')[0] },
        { name: "bbc.com", title: `BBC News - ${query}`, url: `https://www.bbc.com/search?q=${encoded}`, date: new Date().toISOString().split('T')[0] }
    ];
}
