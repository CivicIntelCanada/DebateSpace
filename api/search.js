// ============================================
// DEBATESPACE - MAXIMUM DEPTH RESEARCH
// Government FIRST (all .gov, .gc.ca, .mil, .edu)
// Then archives, then news, then web
// YouTube videos always included
// ============================================

export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    
    const { query } = req.query;
    if (!query || query.trim() === '') {
        return res.status(400).json({ error: 'No query provided' });
    }
    
    console.log(`[API] Maximum depth research: "${query}"`);
    
    try {
        // Fetch ALL data sources in parallel with priority
        const [govResults, archiveResults, newsResults, webResults, youtubeResult] = await Promise.all([
            fetchAllGovernmentSources(query),      // Priority 1: .gov, .gc.ca, .mil
            fetchArchiveSources(query),            // Priority 2: Archives, census, historical data
            fetchNewsSources(query),               // Priority 3: News articles (supplemental)
            fetchWebSources(query),                // Priority 4: General web (Tavily)
            fetchYouTube(query)                    // Always: YouTube videos
        ]);
        
        // Combine ALL sources in priority order
        const allSources = combineSourcesByPriority(govResults, archiveResults, newsResults, webResults);
        
        // Build deep research fact check
        const factCheck = buildMaximumDepthFactCheck(query, govResults, archiveResults, newsResults, webResults, allSources);
        
        return res.status(200).json({
            success: true,
            query: query,
            factCheck: factCheck,
            youtube: youtubeResult,
            timestamp: new Date().toISOString()
        });
        
    } catch (error) {
        console.error('[API] Error:', error);
        return res.status(200).json({
            success: true,
            query: query,
            factCheck: {
                verdict: "🔍 DEEP RESEARCH",
                summary: `Research results for "${query}". Please review the sources below.`,
                citedClaims: [],
                tip: "Try using specific government terms or official names"
            },
            youtube: []
        });
    }
}

// ============================================
// PRIORITY 1: ALL GOVERNMENT SOURCES
// .gov, .gc.ca, .mil, .edu, official agencies
// ============================================
async function fetchAllGovernmentSources(query) {
    const apiKey = process.env.GOOGLE_SEARCH_API_KEY;
    
    const searchEngines = [
        { name: 'North America', cx: process.env.GOOGLE_SEARCH_CX_NA, priority: 1 },
        { name: 'Europe', cx: process.env.GOOGLE_SEARCH_CX_EU, priority: 2 },
        { name: 'Asia Pacific', cx: process.env.GOOGLE_SEARCH_CX_ASIA, priority: 3 }
    ];
    
    const allResults = [];
    
    for (const engine of searchEngines) {
        if (!apiKey || !engine.cx) continue;
        
        try {
            // Search for government-specific content
            const govQuery = `${query} site:.gov OR site:.gc.ca OR site:.mil OR site:.edu`;
            const url = `https://www.googleapis.com/customsearch/v1?key=${apiKey}&cx=${engine.cx}&q=${encodeURIComponent(govQuery)}&num=10`;
            const response = await fetch(url);
            
            if (response.ok) {
                const data = await response.json();
                if (data.items && data.items.length > 0) {
                    for (const item of data.items) {
                        let siteName = "";
                        let sourceType = "government";
                        try {
                            const urlObj = new URL(item.link);
                            siteName = urlObj.hostname.replace('www.', '');
                            if (siteName.includes('.gov')) sourceType = "🏛️ US GOVERNMENT";
                            else if (siteName.includes('.gc.ca')) sourceType = "🍁 CANADA GOVERNMENT";
                            else if (siteName.includes('.mil')) sourceType = "⚔️ MILITARY";
                            else if (siteName.includes('.edu')) sourceType = "🎓 ACADEMIC";
                        } catch (e) {
                            siteName = engine.name;
                        }
                        
                        allResults.push({
                            name: siteName,
                            title: item.title,
                            url: item.link,
                            snippet: item.snippet,
                            sourceType: sourceType,
                            priority: 1
                        });
                    }
                }
            }
        } catch (error) {
            console.error(`[Gov] Error:`, error.message);
        }
    }
    
    // Also search specific government agencies
    const agencies = [
        'dhs.gov', 'ice.gov', 'fletc.gov', 'state.gov', 'justice.gov',
        'treasury.gov', 'bls.gov', 'cdc.gov', 'nih.gov', 'nasa.gov',
        'statcan.gc.ca', 'bankofcanada.ca', 'rcmp-grc.gc.ca'
    ];
    
    for (const agency of agencies) {
        try {
            const url = `https://www.googleapis.com/customsearch/v1?key=${apiKey}&cx=${process.env.GOOGLE_SEARCH_CX_NA}&q=${encodeURIComponent(query)}&siteSearch=${agency}&siteSearchFilter=i&num=5`;
            const response = await fetch(url);
            
            if (response.ok) {
                const data = await response.json();
                if (data.items && data.items.length > 0) {
                    for (const item of data.items) {
                        allResults.push({
                            name: agency,
                            title: item.title,
                            url: item.link,
                            snippet: item.snippet,
                            sourceType: `🏛️ ${agency.toUpperCase()}`,
                            priority: 1
                        });
                    }
                }
            }
        } catch (e) {}
    }
    
    // Remove duplicates
    const uniqueResults = [];
    const seenUrls = new Set();
    for (const result of allResults) {
        if (!seenUrls.has(result.url)) {
            seenUrls.add(result.url);
            uniqueResults.push(result);
        }
    }
    
    return { sources: uniqueResults.slice(0, 20) };
}

// ============================================
// PRIORITY 2: ARCHIVE & HISTORICAL DATA
// ============================================
async function fetchArchiveSources(query) {
    const apiKey = process.env.GOOGLE_SEARCH_API_KEY;
    const cx = process.env.GOOGLE_SEARCH_CX_NA;
    
    if (!apiKey || !cx) return { sources: [] };
    
    const archiveTerms = ['archive', 'historical', 'census', 'data', 'statistics', 'record', 'documentation'];
    const archiveQuery = `${query} ${archiveTerms.join(' OR ')}`;
    
    try {
        const url = `https://www.googleapis.com/customsearch/v1?key=${apiKey}&cx=${cx}&q=${encodeURIComponent(archiveQuery)}&num=8`;
        const response = await fetch(url);
        
        if (!response.ok) return { sources: [] };
        
        const data = await response.json();
        const sources = [];
        
        if (data.items) {
            for (const item of data.items) {
                let siteName = "";
                try {
                    const urlObj = new URL(item.link);
                    siteName = urlObj.hostname.replace('www.', '');
                } catch (e) {}
                
                sources.push({
                    name: siteName,
                    title: item.title,
                    url: item.link,
                    snippet: item.snippet,
                    sourceType: "📚 ARCHIVE",
                    priority: 2
                });
            }
        }
        
        return { sources: sources.slice(0, 10) };
        
    } catch (error) {
        return { sources: [] };
    }
}

// ============================================
// PRIORITY 3: NEWS SOURCES
// ============================================
async function fetchNewsSources(query) {
    const apiKey = process.env.GNEWS_API_KEY;
    if (!apiKey) return { sources: [] };
    
    try {
        const url = `https://gnews.io/api/v4/search?q=${encodeURIComponent(query)}&lang=en&max=15&token=${apiKey}`;
        const response = await fetch(url);
        
        if (!response.ok) return { sources: [] };
        
        const data = await response.json();
        const sources = [];
        
        if (data.articles) {
            for (const article of data.articles) {
                let siteName = "";
                try {
                    const urlObj = new URL(article.url);
                    siteName = urlObj.hostname.replace('www.', '');
                } catch (e) {}
                
                sources.push({
                    name: siteName,
                    title: article.title,
                    url: article.url,
                    snippet: article.description,
                    sourceType: "📰 NEWS",
                    priority: 3,
                    date: article.publishedAt
                });
            }
        }
        
        return { sources: sources.slice(0, 10) };
        
    } catch (error) {
        return { sources: [] };
    }
}

// ============================================
// PRIORITY 4: WEB SOURCES (Tavily)
// ============================================
async function fetchWebSources(query) {
    const apiKey = process.env.TAVILY_API_KEY;
    if (!apiKey) return { sources: [] };
    
    try {
        const response = await fetch('https://api.tavily.com/search', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                api_key: apiKey,
                query: query,
                search_depth: 'advanced',
                include_answer: true,
                max_results: 15
            })
        });
        
        const data = await response.json();
        const sources = [];
        
        if (data.results) {
            for (const result of data.results) {
                let siteName = "";
                try {
                    const urlObj = new URL(result.url);
                    siteName = urlObj.hostname.replace('www.', '');
                } catch (e) {}
                
                sources.push({
                    name: siteName,
                    title: result.title,
                    url: result.url,
                    snippet: result.content?.substring(0, 500),
                    sourceType: "🌐 WEB",
                    priority: 4
                });
            }
        }
        
        return {
            answer: data.answer,
            sources: sources.slice(0, 10),
            hasAnswer: !!data.answer
        };
        
    } catch (error) {
        return { sources: [] };
    }
}

// ============================================
// YOUTUBE API - ALWAYS INCLUDED
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
// COMBINE SOURCES BY PRIORITY
// ============================================
function combineSourcesByPriority(govResults, archiveResults, newsResults, webResults) {
    const allSources = [];
    
    if (govResults?.sources) allSources.push(...govResults.sources);
    if (archiveResults?.sources) allSources.push(...archiveResults.sources);
    if (newsResults?.sources) allSources.push(...newsResults.sources);
    if (webResults?.sources) allSources.push(...webResults.sources);
    
    // Remove duplicates
    const uniqueSources = [];
    const seenUrls = new Set();
    for (const source of allSources) {
        if (!seenUrls.has(source.url)) {
            seenUrls.add(source.url);
            uniqueSources.push(source);
        }
    }
    
    // Sort by priority
    uniqueSources.sort((a, b) => (a.priority || 99) - (b.priority || 99));
    
    return uniqueSources;
}

// ============================================
// BUILD MAXIMUM DEPTH FACT CHECK
// ============================================
function buildMaximumDepthFactCheck(query, govResults, archiveResults, newsResults, webResults, allSources) {
    // Build comprehensive summary
    let summary = "";
    let citedClaims = [];
    
    // Add GOVERNMENT sources first (highest priority)
    if (govResults?.sources && govResults.sources.length > 0) {
        for (const source of govResults.sources.slice(0, 12)) {
            citedClaims.push({
                claim: source.snippet || source.title,
                source: source.sourceType || source.name,
                url: source.url,
                priority: "government"
            });
        }
        
        // Use first government source for summary
        if (govResults.sources[0]?.snippet) {
            summary = govResults.sources[0].snippet;
        }
    }
    
    // Add ARCHIVE sources
    if (archiveResults?.sources && archiveResults.sources.length > 0) {
        for (const source of archiveResults.sources.slice(0, 6)) {
            if (!citedClaims.some(c => c.url === source.url)) {
                citedClaims.push({
                    claim: source.snippet || source.title,
                    source: source.sourceType || source.name,
                    url: source.url,
                    priority: "archive"
                });
            }
        }
        
        if (!summary && archiveResults.sources[0]?.snippet) {
            summary = archiveResults.sources[0].snippet;
        }
    }
    
    // Add NEWS sources as supplement
    if (newsResults?.sources && newsResults.sources.length > 0) {
        for (const source of newsResults.sources.slice(0, 8)) {
            if (!citedClaims.some(c => c.url === source.url)) {
                citedClaims.push({
                    claim: source.snippet || source.title,
                    source: source.sourceType || source.name,
                    url: source.url,
                    priority: "news"
                });
            }
        }
        
        if (!summary && newsResults.sources[0]?.snippet) {
            summary = newsResults.sources[0].snippet;
        }
    }
    
    // Add WEB sources
    if (webResults?.sources && webResults.sources.length > 0) {
        for (const source of webResults.sources.slice(0, 5)) {
            if (!citedClaims.some(c => c.url === source.url)) {
                citedClaims.push({
                    claim: source.snippet || source.title,
                    source: source.sourceType || source.name,
                    url: source.url,
                    priority: "web"
                });
            }
        }
        
        if (!summary && webResults.answer) {
            summary = webResults.answer;
        }
    }
    
    // Final fallback
    if (!summary) {
        summary = `Deep research results for "${query}" from government archives and official sources.`;
    }
    
    // Limit summary length
    if (summary.length > 800) {
        summary = summary.substring(0, 800) + '...';
    }
    
    return {
        verdict: "✅ COMPREHENSIVE RESEARCH",
        summary: summary,
        citedClaims: citedClaims.slice(0, 25),
        tip: "🏛️ Government and archive sources are prioritized. Click any source to verify.",
        sourceCount: {
            government: govResults?.sources?.length || 0,
            archive: archiveResults?.sources?.length || 0,
            news: newsResults?.sources?.length || 0,
            total: citedClaims.length
        }
    };
}
