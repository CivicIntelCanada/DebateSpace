// ============================================
// DEBATESPACE - DEEP RESEARCH USING ALL APIS
// Combines: Google Search (5 engines) + Tavily + Groq + GNews
// Presents in clean layout with cited claims
// ============================================

export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    
    const { query } = req.query;
    if (!query || query.trim() === '') {
        return res.status(400).json({ error: 'No query provided' });
    }
    
    console.log(`[API] Deep research: "${query}"`);
    
    try {
        // Fetch from ALL APIs in parallel
        const [govResults, tavilyResult, groqResult, newsResult, youtubeResult] = await Promise.all([
            fetchAllGovernmentSources(query),
            fetchTavilyDeep(query),
            fetchGroqDeep(query),
            fetchGNews(query),
            fetchYouTube(query)
        ]);
        
        // Combine ALL sources
        const allSources = combineAllSources(govResults, tavilyResult);
        
        // Build deep research fact check
        const factCheck = buildDeepFactCheck(query, tavilyResult, groqResult, allSources);
        
        // Format news
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
                verdict: "🔍 RESEARCH FINDINGS",
                summary: `Deep research results for "${query}".`,
                citedClaims: [],
                tip: "Try rephrasing your question for more specific results"
            },
            newsArticles: getFallbackNews(query),
            youtube: []
        });
    }
}

// ============================================
// FETCH ALL 5 GOOGLE SEARCH ENGINES
// ============================================
async function fetchAllGovernmentSources(query) {
    const apiKey = process.env.GOOGLE_SEARCH_API_KEY;
    
    const searchEngines = [
        { name: 'North America', cx: process.env.GOOGLE_SEARCH_CX_NA },
        { name: 'Asia Pacific', cx: process.env.GOOGLE_SEARCH_CX_ASIA },
        { name: 'Europe', cx: process.env.GOOGLE_SEARCH_CX_EU },
        { name: 'Think Tanks', cx: process.env.GOOGLE_SEARCH_CX_TT },
        { name: 'News', cx: process.env.GOOGLE_SEARCH_CX_NEWS }
    ];
    
    const allResults = [];
    
    for (const engine of searchEngines) {
        if (!apiKey || !engine.cx) continue;
        
        try {
            const url = `https://www.googleapis.com/customsearch/v1?key=${apiKey}&cx=${engine.cx}&q=${encodeURIComponent(query)}&num=8`;
            const response = await fetch(url);
            
            if (response.ok) {
                const data = await response.json();
                if (data.items && data.items.length > 0) {
                    for (const item of data.items) {
                        let siteName = "";
                        try {
                            const urlObj = new URL(item.link);
                            siteName = urlObj.hostname.replace('www.', '');
                        } catch (e) {
                            siteName = engine.name;
                        }
                        
                        allResults.push({
                            name: siteName,
                            title: item.title,
                            url: item.link,
                            snippet: item.snippet,
                            engine: engine.name
                        });
                    }
                }
            }
        } catch (error) {
            console.error(`[${engine.name}] Error:`, error.message);
        }
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
// TAVILY DEEP SEARCH
// ============================================
async function fetchTavilyDeep(query) {
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
                max_results: 12
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
                } catch (e) {
                    siteName = "Source";
                }
                
                sources.push({
                    name: siteName,
                    title: result.title,
                    url: result.url,
                    snippet: result.content?.substring(0, 350)
                });
            }
        }
        
        return {
            answer: data.answer,
            sources: sources,
            hasAnswer: !!data.answer
        };
        
    } catch (error) {
        console.error('[Tavily] Error:', error.message);
        return null;
    }
}

// ============================================
// GROQ DEEP ANALYSIS
// ============================================
async function fetchGroqDeep(query) {
    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) return null;
    
    try {
        const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: 'llama-3.3-70b-versatile',
                messages: [
                    {
                        role: 'system',
                        content: `You are a research assistant. Provide a detailed, factual analysis of the topic. Include specific data points, statistics, dates, and key facts. Use a neutral, academic tone. Keep response under 400 words.`
                    },
                    {
                        role: 'user',
                        content: query
                    }
                ],
                temperature: 0.2,
                max_tokens: 600
            })
        });
        
        if (!response.ok) return null;
        
        const data = await response.json();
        return {
            analysis: data.choices?.[0]?.message?.content,
            hasAnalysis: true
        };
        
    } catch (error) {
        console.error('[Groq] Error:', error.message);
        return null;
    }
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
// COMBINE ALL SOURCES
// ============================================
function combineAllSources(govResults, tavilyResult) {
    const allSources = [];
    
    // Add government sources
    if (govResults?.sources) {
        allSources.push(...govResults.sources);
    }
    
    // Add Tavily sources
    if (tavilyResult?.sources) {
        allSources.push(...tavilyResult.sources);
    }
    
    // Remove duplicates by URL
    const uniqueSources = [];
    const seenUrls = new Set();
    for (const source of allSources) {
        if (!seenUrls.has(source.url)) {
            seenUrls.add(source.url);
            uniqueSources.push(source);
        }
    }
    
    return uniqueSources;
}

// ============================================
// BUILD DEEP FACT CHECK
// ============================================
function buildDeepFactCheck(query, tavilyResult, groqResult, allSources) {
    const q = query.toLowerCase();
    
    // Create cited claims from ALL sources
    const citedClaims = [];
    
    for (const source of allSources.slice(0, 20)) {
        if (source.url && source.name) {
            citedClaims.push({
                claim: source.snippet || source.title,
                source: source.name,
                url: source.url
            });
        }
    }
    
    // Build the summary - prefer Groq analysis for depth, then Tavily
    let summary = "";
    if (groqResult?.analysis) {
        summary = groqResult.analysis;
    } else if (tavilyResult?.answer) {
        summary = tavilyResult.answer;
    } else {
        summary = `Deep research results for "${query}" from government and official sources.`;
    }
    
    return {
        verdict: "✅ DEEP RESEARCH FINDINGS",
        summary: summary,
        citedClaims: citedClaims,
        tip: "Click any source above to verify the information directly",
        sourceCount: allSources.length
    };
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
