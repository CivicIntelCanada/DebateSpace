// ============================================
// DEBATESPACE - COMPLETE API
// Uses Tavily + GNews + YouTube + Google Search
// ============================================

export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    
    const { query } = req.query;
    if (!query || query.trim() === '') {
        return res.status(400).json({ error: 'No query provided' });
    }
    
    console.log(`[API] Searching: "${query}"`);
    
    try {
        const [tavilyResult, newsResult, youtubeResult, govResults] = await Promise.all([
            fetchTavily(query),
            fetchGNews(query),
            fetchYouTube(query),
            fetchGovernmentSources(query)
        ]);
        
        const factCheck = buildFactCheck(query, tavilyResult, govResults);
        const formattedNews = formatNews(newsResult, query);
        
        return res.status(200).json({
            success: true,
            query: query,
            factCheck: factCheck,
            newsArticles: formattedNews,
            youtube: youtubeResult
        });
        
    } catch (error) {
        console.error('[API] Error:', error);
        return res.status(200).json({
            success: true,
            query: query,
            factCheck: {
                verdict: "🔍 SEARCH SOURCES",
                summary: `Search official sources below for "${query}".`,
                governmentSources: getGovernmentLinks(query)
            },
            newsArticles: [],
            youtube: []
        });
    }
}

async function fetchTavily(query) {
    const apiKey = process.env.TAVILY_API_KEY;
    if (!apiKey) return null;
    try {
        const response = await fetch('https://api.tavily.com/search', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                api_key: apiKey,
                query: query,
                search_depth: 'advanced',
                include_answer: true,
                max_results: 8
            })
        });
        const data = await response.json();
        const sources = (data.results || []).map(r => ({
            name: new URL(r.url).hostname.replace('www.', ''),
            title: r.title,
            url: r.url,
            snippet: r.content?.substring(0, 200)
        }));
        return { answer: data.answer, sources, hasAnswer: !!data.answer };
    } catch (error) { return null; }
}

async function fetchGNews(query) {
    const apiKey = process.env.GNEWS_API_KEY;
    if (!apiKey) return [];
    try {
        const response = await fetch(`https://gnews.io/api/v4/search?q=${encodeURIComponent(query)}&lang=en&max=15&token=${apiKey}`);
        if (!response.ok) return [];
        const data = await response.json();
        return (data.articles || []).map(a => ({
            name: new URL(a.url).hostname.replace('www.', ''),
            title: a.title,
            url: a.url,
            date: a.publishedAt?.split('T')[0],
            description: a.description?.substring(0, 150)
        }));
    } catch (error) { return []; }
}

async function fetchYouTube(query) {
    const apiKey = process.env.YOUTUBE_API_KEY;
    if (!apiKey) return [];
    try {
        const response = await fetch(`https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(query)}&type=video&maxResults=6&key=${apiKey}`);
        if (!response.ok) return [];
        const data = await response.json();
        return (data.items || []).map(item => ({
            title: item.snippet.title,
            url: `https://www.youtube.com/watch?v=${item.id.videoId}`,
            channel: item.snippet.channelTitle,
            thumbnail: item.snippet.thumbnails?.medium?.url
        }));
    } catch (error) { return []; }
}

async function fetchGovernmentSources(query) {
    const apiKey = process.env.GOOGLE_SEARCH_API_KEY;
    const cx = process.env.GOOGLE_SEARCH_CX_NA;
    if (!apiKey || !cx) return { sources: [] };
    try {
        const response = await fetch(`https://www.googleapis.com/customsearch/v1?key=${apiKey}&cx=${cx}&q=${encodeURIComponent(query)}&num=8`);
        if (!response.ok) return { sources: [] };
        const data = await response.json();
        const sources = (data.items || []).map(item => ({
            name: new URL(item.link).hostname.replace('www.', ''),
            title: item.title,
            url: item.link,
            snippet: item.snippet
        }));
        return { sources };
    } catch (error) { return { sources: [] }; }
}

function buildFactCheck(query, tavilyResult, govResults) {
    if (tavilyResult?.answer) {
        const citedClaims = (tavilyResult.sources || []).slice(0, 8).map(s => ({
            claim: s.snippet || s.title,
            source: s.name,
            url: s.url
        }));
        return {
            verdict: "🔍 RESEARCH FINDINGS",
            summary: tavilyResult.answer.length > 400 ? tavilyResult.answer.substring(0, 400) + '...' : tavilyResult.answer,
            citedClaims: citedClaims,
            governmentSources: govResults?.sources || getGovernmentLinks(query),
            tip: "Click any source above to verify the information"
        };
    }
    return {
        verdict: "🔍 SEARCH OFFICIAL SOURCES",
        summary: `Search official sources below for "${query}".`,
        citedClaims: [],
        governmentSources: getGovernmentLinks(query),
        tip: "Government websites contain the most authoritative information"
    };
}

function formatNews(articles, query) {
    if (!articles || articles.length === 0) {
        return [
            { name: "reuters.com", title: `Reuters - ${query}`, url: `https://www.reuters.com/search?news=${encodeURIComponent(query)}`, date: new Date().toISOString().split('T')[0] },
            { name: "apnews.com", title: `AP News - ${query}`, url: `https://apnews.com/search?q=${encodeURIComponent(query)}`, date: new Date().toISOString().split('T')[0] },
            { name: "bbc.com", title: `BBC News - ${query}`, url: `https://www.bbc.com/search?q=${encodeURIComponent(query)}`, date: new Date().toISOString().split('T')[0] }
        ];
    }
    return articles;
}

function getGovernmentLinks(query) {
    const encoded = encodeURIComponent(query);
    return [
        { name: "canada.ca", title: `Search Canada.ca for "${query}"`, url: `https://www.canada.ca/en/search.html?q=${encoded}` },
        { name: "usa.gov", title: `Search USA.gov for "${query}"`, url: `https://www.usa.gov/search?query=${encoded}` },
        { name: "gov.uk", title: `Search GOV.UK for "${query}"`, url: `https://www.gov.uk/search/all?q=${encoded}` },
        { name: "statcan.gc.ca", title: `Search Statistics Canada for "${query}"`, url: `https://www.statcan.gc.ca/en/search?q=${encoded}` }
    ];
}
