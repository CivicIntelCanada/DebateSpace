// ============================================
// DEBATESPACE - DEEP RESEARCH USING ALL APIS
// Uses: 5 Google Search Engines + Tavily + Groq + GNews + YouTube
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
            fetchYouTubeWorking(query)
        ]);
        
        console.log(`[Results] Gov: ${govResults?.sources?.length || 0}, Tavily: ${!!tavilyResult?.answer}, Groq: ${!!groqResult?.analysis}, News: ${newsResult?.length || 0}, YouTube: ${youtubeResult?.length || 0}`);
        
        // Build deep research fact check
        const factCheck = buildDeepResearchFactCheck(query, tavilyResult, groqResult, govResults, newsResult);
        
        return res.status(200).json({
            success: true,
            query: query,
            factCheck: factCheck,
            youtube: youtubeResult || [],
            timestamp: new Date().toISOString()
        });
        
    } catch (error) {
        console.error('[API] Error:', error);
        return res.status(200).json({
            success: true,
            query: query,
            factCheck: {
                verdict: "🔍 RESEARCH RESULTS",
                summary: `Research results for "${query}". Please review the sources below.`,
                citedClaims: [],
                tip: "Try using specific terms for better results"
            },
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
    const seenUrls = new Set();
    
    for (const engine of searchEngines) {
        if (!apiKey || !engine.cx) continue;
        
        try {
            const url = `https://www.googleapis.com/customsearch/v1?key=${apiKey}&cx=${engine.cx}&q=${encodeURIComponent(query)}&num=8`;
            const response = await fetch(url);
            
            if (response.ok) {
                const data = await response.json();
                if (data.items && data.items.length > 0) {
                    for (const item of data.items) {
                        if (!seenUrls.has(item.link)) {
                            seenUrls.add(item.link);
                            let siteName = "";
                            try {
                                siteName = new URL(item.link).hostname.replace('www.', '');
                            } catch(e) {}
                            
                            allResults.push({
                                name: siteName,
                                title: item.title,
                                url: item.link,
                                snippet: item.snippet,
                                source: engine.name
                            });
                        }
                    }
                }
            }
        } catch (error) {
            console.error(`[${engine.name}] Error:`, error.message);
        }
    }
    
    return { sources: allResults.slice(0, 25) };
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
                max_results: 15
            })
        });
        
        const data = await response.json();
        
        const sources = [];
        if (data.results) {
            for (const result of data.results) {
                let siteName = "";
                try {
                    siteName = new URL(result.url).hostname.replace('www.', '');
                } catch(e) {}
                
                sources.push({
                    name: siteName,
                    title: result.title,
                    url: result.url,
                    snippet: result.content?.substring(0, 500)
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
                        content: `You are a research analyst. Provide a detailed, factual analysis based on official government data. Include specific statistics, dates, and verifiable facts. Keep response under 600 words. Be neutral and objective.`
                    },
                    {
                        role: 'user',
                        content: query
                    }
                ],
                temperature: 0.1,
                max_tokens: 900
            })
        });
        
        if (!response.ok) return null;
        
        const data = await response.json();
        const analysis = data.choices?.[0]?.message?.content;
        
        return {
            analysis: analysis,
            hasAnalysis: !!analysis
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
        const url = `https://gnews.io/api/v4/search?q=${encodeURIComponent(query)}&lang=en&max=10&token=${apiKey}`;
        const response = await fetch(url);
        
        if (!response.ok) return [];
        
        const data = await response.json();
        if (!data.articles || data.articles.length === 0) return [];
        
        return data.articles.slice(0, 8).map(article => {
            let siteName = "";
            try {
                siteName = new URL(article.url).hostname.replace('www.', '');
            } catch(e) {}
            
            return {
                name: siteName,
                title: article.title,
                url: article.url,
                snippet: article.description,
                date: article.publishedAt?.split('T')[0]
            };
        });
        
    } catch (error) {
        console.error('[GNews] Error:', error.message);
        return [];
    }
}

// ============================================
// YOUTUBE API - WORKING WITH THUMBNAILS
// ============================================
async function fetchYouTubeWorking(query) {
    const apiKey = process.env.YOUTUBE_API_KEY;
    
    console.log(`[YouTube] Checking API key: ${apiKey ? 'Present' : 'Missing'}`);
    
    if (!apiKey) {
        console.log('[YouTube] No API key - returning fallback');
        return getYouTubeFallback(query);
    }
    
    try {
        const searchQuery = `${query} documentary analysis explained`;
        const url = `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(searchQuery)}&type=video&maxResults=6&key=${apiKey}`;
        
        console.log(`[YouTube] Calling API: ${url.substring(0, 100)}...`);
        
        const response = await fetch(url);
        
        console.log(`[YouTube] Response status: ${response.status}`);
        
        if (!response.ok) {
            console.log(`[YouTube] API error: ${response.status}`);
            return getYouTubeFallback(query);
        }
        
        const data = await response.json();
        
        if (!data.items || data.items.length === 0) {
            console.log('[YouTube] No videos found');
            return getYouTubeFallback(query);
        }
        
        console.log(`[YouTube] Found ${data.items.length} videos`);
        
        // Get video statistics for view counts
        const videoIds = data.items.map(item => item.id.videoId).join(',');
        const statsUrl = `https://www.googleapis.com/youtube/v3/videos?part=statistics&id=${videoIds}&key=${apiKey}`;
        const statsResponse = await fetch(statsUrl);
        let statsMap = {};
        
        if (statsResponse.ok) {
            const statsData = await statsResponse.json();
            if (statsData.items) {
                statsMap = statsData.items.reduce((map, item) => {
                    map[item.id] = {
                        views: parseInt(item.statistics?.viewCount || 0).toLocaleString()
                    };
                    return map;
                }, {});
            }
        }
        
        return data.items.map(item => ({
            title: item.snippet.title,
            url: `https://www.youtube.com/watch?v=${item.id.videoId}`,
            channel: item.snippet.channelTitle,
            thumbnail: item.snippet.thumbnails?.medium?.url || item.snippet.thumbnails?.default?.url || '',
            views: statsMap[item.id.videoId]?.views || 'N/A'
        }));
        
    } catch (error) {
        console.error('[YouTube] Error:', error.message);
        return getYouTubeFallback(query);
    }
}

function getYouTubeFallback(query) {
    const encoded = encodeURIComponent(query);
    return [
        { title: `YouTube search: "${query}"`, url: `https://www.youtube.com/results?search_query=${encoded}`, channel: "YouTube Search", thumbnail: "", views: "Click to search" },
        { title: `${query} - explained`, url: `https://www.youtube.com/results?search_query=${encoded}+explained`, channel: "YouTube Search", thumbnail: "", views: "Click to search" },
        { title: `${query} - documentary`, url: `https://www.youtube.com/results?search_query=${encoded}+documentary`, channel: "YouTube Search", thumbnail: "", views: "Click to search" },
        { title: `${query} - analysis`, url: `https://www.youtube.com/results?search_query=${encoded}+analysis`, channel: "YouTube Search", thumbnail: "", views: "Click to search" },
        { title: `${query} - news coverage`, url: `https://www.youtube.com/results?search_query=${encoded}+news`, channel: "YouTube Search", thumbnail: "", views: "Click to search" }
    ];
}

// ============================================
// BUILD DEEP RESEARCH FACT CHECK
// ============================================
function buildDeepResearchFactCheck(query, tavilyResult, groqResult, govResults, newsResult) {
    const citedClaims = [];
    
    // Add government sources
    if (govResults?.sources) {
        for (const source of govResults.sources.slice(0, 12)) {
            if (source.url && source.snippet) {
                citedClaims.push({
                    claim: source.snippet.length > 350 ? source.snippet.substring(0, 350) + '...' : source.snippet,
                    source: `🏛️ ${source.name}`,
                    url: source.url
                });
            }
        }
    }
    
    // Add Tavily sources
    if (tavilyResult?.sources) {
        for (const source of tavilyResult.sources.slice(0, 8)) {
            if (source.url && source.snippet && !citedClaims.some(c => c.url === source.url)) {
                citedClaims.push({
                    claim: source.snippet.length > 350 ? source.snippet.substring(0, 350) + '...' : source.snippet,
                    source: source.name,
                    url: source.url
                });
            }
        }
    }
    
    // Add news sources
    if (newsResult && newsResult.length > 0) {
        for (const source of newsResult.slice(0, 5)) {
            if (source.url && source.snippet && !citedClaims.some(c => c.url === source.url)) {
                citedClaims.push({
                    claim: source.snippet.length > 350 ? source.snippet.substring(0, 350) + '...' : source.snippet,
                    source: `📰 ${source.name}`,
                    url: source.url
                });
            }
        }
    }
    
    // Build summary - prefer Groq for depth, then Tavily
    let summary = "";
    if (groqResult?.analysis) {
        summary = groqResult.analysis;
    } else if (tavilyResult?.answer) {
        summary = tavilyResult.answer;
    } else if (govResults?.sources?.[0]?.snippet) {
        summary = govResults.sources[0].snippet;
    } else {
        summary = `Deep research results for "${query}". Review the sources below for detailed information.`;
    }
    
    // Limit summary length
    if (summary.length > 800) {
        summary = summary.substring(0, 800) + '...';
    }
    
    return {
        verdict: "✅ DEEP RESEARCH FINDINGS",
        summary: summary,
        citedClaims: citedClaims.slice(0, 20),
        tip: "🏛️ Government sources are prioritized. Click any source to verify.",
        sourceCount: {
            government: govResults?.sources?.length || 0,
            news: newsResult?.length || 0,
            total: citedClaims.length
        }
    };
}
