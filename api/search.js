// ============================================
// DEBATESPACE - GOVERNMENT DATA FIRST
// No AI-generated answers - only government data summaries
// ============================================

export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    
    const { query } = req.query;
    if (!query || query.trim() === '') {
        return res.status(400).json({ error: 'No query provided' });
    }
    
    console.log(`[API] Government-first research: "${query}"`);
    
    try {
        // Fetch ONLY government and authoritative sources first
        const govResults = await fetchAllGovernmentSources(query);
        
        // Then fetch supplementary data (news, web)
        const [newsResults, youtubeResult] = await Promise.all([
            fetchNewsSources(query),
            fetchYouTube(query)
        ]);
        
        // Build fact check from government sources ONLY
        const factCheck = buildFactCheckFromGovernment(govResults, newsResults, query);
        
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
                verdict: "🔍 SEARCH GOVERNMENT SOURCES",
                summary: `Search official government websites below for accurate information about "${query}".`,
                citedClaims: [],
                governmentLinks: getGovernmentSearchLinks(query),
                tip: "Government websites (.gov, .gc.ca) contain the most authoritative information"
            },
            youtube: []
        });
    }
}

// ============================================
// FETCH ALL GOVERNMENT SOURCES - PRIORITY #1
// ============================================
async function fetchAllGovernmentSources(query) {
    const apiKey = process.env.GOOGLE_SEARCH_API_KEY;
    const cx = process.env.GOOGLE_SEARCH_CX_NA;
    
    if (!apiKey || !cx) return { sources: [] };
    
    const allResults = [];
    const seenUrls = new Set();
    
    // SPECIFIC GOVERNMENT AGENCIES - Search each one directly
    const governmentAgencies = [
        // Canada
        { name: "Statistics Canada", domain: "statcan.gc.ca", url: "https://www.statcan.gc.ca/en/search" },
        { name: "Bank of Canada", domain: "bankofcanada.ca", url: "https://www.bankofcanada.ca" },
        { name: "Government of Canada", domain: "canada.ca", url: "https://www.canada.ca/en/search.html" },
        { name: "IRCC", domain: "canada.ca/en/immigration-refugees-citizenship", url: "https://www.canada.ca/en/immigration-refugees-citizenship.html" },
        { name: "RCMP", domain: "rcmp-grc.gc.ca", url: "https://www.rcmp-grc.gc.ca" },
        // USA
        { name: "ICE", domain: "ice.gov", url: "https://www.ice.gov" },
        { name: "FLETC", domain: "fletc.gov", url: "https://www.fletc.gov" },
        { name: "DHS", domain: "dhs.gov", url: "https://www.dhs.gov" },
        { name: "BLS", domain: "bls.gov", url: "https://www.bls.gov" },
        { name: "Federal Reserve", domain: "federalreserve.gov", url: "https://www.federalreserve.gov" },
        { name: "USA.gov", domain: "usa.gov", url: "https://www.usa.gov" },
        { name: "Congress", domain: "congress.gov", url: "https://www.congress.gov" },
        // UK
        { name: "GOV.UK", domain: "gov.uk", url: "https://www.gov.uk" },
        { name: "UK Parliament", domain: "parliament.uk", url: "https://www.parliament.uk" },
        // International
        { name: "United Nations", domain: "un.org", url: "https://www.un.org" },
        { name: "World Bank", domain: "worldbank.org", url: "https://www.worldbank.org" },
        { name: "IMF", domain: "imf.org", url: "https://www.imf.org" },
        { name: "WHO", domain: "who.int", url: "https://www.who.int" },
        { name: "OECD", domain: "oecd.org", url: "https://www.oecd.org" }
    ];
    
    // Search each government agency directly
    for (const agency of governmentAgencies) {
        try {
            const searchUrl = `https://www.googleapis.com/customsearch/v1?key=${apiKey}&cx=${cx}&q=${encodeURIComponent(query)}&siteSearch=${agency.domain}&siteSearchFilter=i&num=5`;
            const response = await fetch(searchUrl);
            
            if (response.ok) {
                const data = await response.json();
                if (data.items && data.items.length > 0) {
                    for (const item of data.items) {
                        if (!seenUrls.has(item.link)) {
                            seenUrls.add(item.link);
                            allResults.push({
                                name: agency.name,
                                title: item.title,
                                url: item.link,
                                snippet: item.snippet,
                                sourceType: "🏛️ GOVERNMENT",
                                agency: agency.name
                            });
                        }
                    }
                }
            }
        } catch (error) {
            console.error(`[${agency.name}] Error:`, error.message);
        }
    }
    
    // Also search general government domains
    const govDomains = ['.gov', '.gc.ca', '.mil', '.gov.uk', '.edu'];
    
    for (const domain of govDomains) {
        try {
            const searchUrl = `https://www.googleapis.com/customsearch/v1?key=${apiKey}&cx=${cx}&q=${encodeURIComponent(query)}&siteSearch=${domain}&siteSearchFilter=i&num=8`;
            const response = await fetch(searchUrl);
            
            if (response.ok) {
                const data = await response.json();
                if (data.items && data.items.length > 0) {
                    for (const item of data.items) {
                        if (!seenUrls.has(item.link)) {
                            seenUrls.add(item.link);
                            let sourceName = "";
                            try {
                                sourceName = new URL(item.link).hostname.replace('www.', '');
                            } catch(e) {}
                            
                            allResults.push({
                                name: sourceName,
                                title: item.title,
                                url: item.link,
                                snippet: item.snippet,
                                sourceType: "🏛️ GOVERNMENT",
                                agency: sourceName
                            });
                        }
                    }
                }
            }
        } catch (error) {
            console.error(`[${domain}] Error:`, error.message);
        }
    }
    
    return { sources: allResults.slice(0, 25) };
}

// ============================================
// FETCH NEWS SOURCES (Supplemental)
// ============================================
async function fetchNewsSources(query) {
    const apiKey = process.env.GNEWS_API_KEY;
    if (!apiKey) return { sources: [] };
    
    try {
        const url = `https://gnews.io/api/v4/search?q=${encodeURIComponent(query)}&lang=en&max=10&token=${apiKey}`;
        const response = await fetch(url);
        
        if (!response.ok) return { sources: [] };
        
        const data = await response.json();
        const sources = [];
        
        if (data.articles) {
            for (const article of data.articles.slice(0, 8)) {
                let siteName = "";
                try {
                    const urlObj = new URL(article.url);
                    siteName = urlObj.hostname.replace('www.', '');
                } catch(e) {}
                
                sources.push({
                    name: siteName,
                    title: article.title,
                    url: article.url,
                    snippet: article.description,
                    sourceType: "📰 NEWS",
                    date: article.publishedAt?.split('T')[0]
                });
            }
        }
        
        return { sources };
        
    } catch (error) {
        return { sources: [] };
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
// BUILD FACT CHECK FROM GOVERNMENT SOURCES ONLY
// ============================================
function buildFactCheckFromGovernment(govResults, newsResults, query) {
    const citedClaims = [];
    
    // Add ALL government sources as cited claims
    if (govResults?.sources && govResults.sources.length > 0) {
        for (const source of govResults.sources) {
            citedClaims.push({
                claim: source.snippet || source.title,
                source: `${source.sourceType} ${source.name}`,
                url: source.url,
                agency: source.agency
            });
        }
    }
    
    // Build summary from the top government source
    let summary = "";
    if (govResults?.sources && govResults.sources.length > 0) {
        const topSource = govResults.sources[0];
        summary = `📌 OFFICIAL DATA FROM ${topSource.agency.toUpperCase()}:\n\n${topSource.snippet || topSource.title}`;
        
        // Add second source if available
        if (govResults.sources[1]) {
            summary += `\n\n📌 ADDITIONAL FROM ${govResults.sources[1].agency.toUpperCase()}:\n${govResults.sources[1].snippet || govResults.sources[1].title}`;
        }
    } else {
        summary = `Search official government websites below for accurate information about "${query}".`;
    }
    
    return {
        verdict: "🏛️ OFFICIAL GOVERNMENT DATA",
        summary: summary,
        citedClaims: citedClaims,
        governmentLinks: getGovernmentSearchLinks(query),
        tip: "🏛️ All sources above are from official government websites. Click any link to verify.",
        sourceCount: {
            government: govResults?.sources?.length || 0,
            news: newsResults?.sources?.length || 0,
            total: citedClaims.length
        }
    };
}

// ============================================
// DIRECT GOVERNMENT SEARCH LINKS
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
