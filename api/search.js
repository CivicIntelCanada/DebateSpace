// ============================================
// DEBATESPACE - ULTRA-DEEP RESEARCH
// Uses: 5 Google Search + Tavily + Groq + GNews + YouTube
// ============================================

export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    
    const { query } = req.query;
    if (!query || query.trim() === '') {
        return res.status(400).json({ error: 'No query provided' });
    }
    
    console.log(`[API] Ultra-deep research: "${query}"`);
    
    try {
        // Fetch ALL data sources in parallel
        const [govResults, tavilyResult, groqResult, newsResult, youtubeResult] = await Promise.all([
            fetchAllGovernmentSources(query),
            fetchTavilyDeep(query),
            fetchGroqUltraDeep(query),
            fetchGNews(query),
            fetchYouTubeWorking(query)
        ]);
        
        // Combine all sources for cited claims
        const allSources = [];
        
        if (govResults?.sources) allSources.push(...govResults.sources);
        if (tavilyResult?.sources) allSources.push(...tavilyResult.sources);
        if (newsResult) allSources.push(...newsResult);
        
        // Build ultra-deep fact check
        const factCheck = buildUltraDeepFactCheck(query, tavilyResult, groqResult, allSources, govResults);
        
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
            // Get more results per engine
            const url = `https://www.googleapis.com/customsearch/v1?key=${apiKey}&cx=${engine.cx}&q=${encodeURIComponent(query)}&num=10`;
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
    
    return { sources: allResults.slice(0, 30) };
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
                max_results: 20
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
                    snippet: result.content?.substring(0, 600)
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
// GROQ ULTRA-DEEP ANALYSIS
// ============================================
async function fetchGroqUltraDeep(query) {
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
                        content: `You are a senior research analyst. Provide a COMPREHENSIVE, DETAILED analysis based on official government data, academic research, and authoritative sources. Include:
1. Key statistics and data points with specific numbers
2. Historical context and trends over time
3. Official findings and conclusions from government sources
4. Multiple perspectives on the issue
5. Specific dates, locations, and names where relevant
6. Any controversies or debates surrounding the topic

Be thorough, factual, and neutral. Use specific numbers, dates, and citations. Keep response under 1000 words.`
                    },
                    {
                        role: 'user',
                        content: query
                    }
                ],
                temperature: 0.1,
                max_tokens: 1500
            })
        });
        
        if (!response.ok) return null;
        
        const data = await response.json();
        const analysis = data.choices?.[0]?.message?.content;
        
        console.log(`[Groq] Ultra-deep analysis length: ${analysis?.length || 0}`);
        
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
        const url = `https://gnews.io/api/v4/search?q=${encodeURIComponent(query)}&lang=en&max=15&token=${apiKey}`;
        const response = await fetch(url);
        
        if (!response.ok) return [];
        
        const data = await response.json();
        if (!data.articles || data.articles.length === 0) return [];
        
        return data.articles.slice(0, 10).map(article => {
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
// YOUTUBE API - WORKING
// ============================================
async function fetchYouTubeWorking(query) {
    const apiKey = process.env.YOUTUBE_API_KEY;
    
    console.log(`[YouTube] API Key: ${apiKey ? 'Present (starts with ' + apiKey.substring(0, 10) + '...)' : 'MISSING'}`);
    
    if (!apiKey) {
        return getYouTubeFallback(query);
    }
    
    try {
        // Multiple search attempts for better results
        const searchTerms = [
            `${query} documentary`,
            `${query} explained`,
            `${query} analysis`,
            `${query} history`
        ];
        
        let allVideos = [];
        
        for (const term of searchTerms.slice(0, 2)) {
            const url = `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(term)}&type=video&maxResults=5&key=${apiKey}`;
            const response = await fetch(url);
            
            if (response.ok) {
                const data = await response.json();
                if (data.items && data.items.length > 0) {
                    allVideos.push(...data.items);
                }
            }
        }
        
        if (allVideos.length === 0) {
            return getYouTubeFallback(query);
        }
        
        // Remove duplicates by video ID
        const uniqueVideos = [];
        const seenIds = new Set();
        for (const video of allVideos) {
            if (!seenIds.has(video.id.videoId)) {
                seenIds.add(video.id.videoId);
                uniqueVideos.push(video);
            }
        }
        
        // Get video statistics
        const videoIds = uniqueVideos.slice(0, 6).map(v => v.id.videoId).join(',');
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
        
        return uniqueVideos.slice(0, 6).map(video => ({
            title: video.snippet.title,
            url: `https://www.youtube.com/watch?v=${video.id.videoId}`,
            channel: video.snippet.channelTitle,
            thumbnail: video.snippet.thumbnails?.medium?.url || video.snippet.thumbnails?.default?.url || '',
            views: statsMap[video.id.videoId]?.views || 'N/A'
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
        { title: `${query} - documentary`, url: `https://www.youtube.com/results?search_query=${encoded}+documentary`, channel: "YouTube Search", thumbnail: "", views: "Click to search" },
        { title: `${query} - explained`, url: `https://www.youtube.com/results?search_query=${encoded}+explained`, channel: "YouTube Search", thumbnail: "", views: "Click to search" },
        { title: `${query} - analysis`, url: `https://www.youtube.com/results?search_query=${encoded}+analysis`, channel: "YouTube Search", thumbnail: "", views: "Click to search" }
    ];
}

// ============================================
// BUILD ULTRA-DEEP FACT CHECK
// ============================================
function buildUltraDeepFactCheck(query, tavilyResult, groqResult, allSources, govResults) {
    const citedClaims = [];
    
    // Add government sources first (priority)
    if (govResults?.sources) {
        for (const source of govResults.sources.slice(0, 15)) {
            if (source.url && source.snippet) {
                citedClaims.push({
                    claim: source.snippet.length > 400 ? source.snippet.substring(0, 400) + '...' : source.snippet,
                    source: `🏛️ ${source.name}`,
                    url: source.url
                });
            }
        }
    }
    
    // Add Tavily sources
    if (tavilyResult?.sources) {
        for (const source of tavilyResult.sources.slice(0, 10)) {
            if (source.url && source.snippet && !citedClaims.some(c => c.url === source.url)) {
                citedClaims.push({
                    claim: source.snippet.length > 400 ? source.snippet.substring(0, 400) + '...' : source.snippet,
                    source: source.name,
                    url: source.url
                });
            }
        }
    }
    
    // Add news sources
    if (allSources) {
        for (const source of allSources.slice(0, 8)) {
            if (source.url && source.snippet && !citedClaims.some(c => c.url === source.url)) {
                citedClaims.push({
                    claim: source.snippet.length > 400 ? source.snippet.substring(0, 400) + '...' : source.snippet,
                    source: `📰 ${source.name}`,
                    url: source.url
                });
            }
        }
    }
    
    // Build ultra-deep summary
    let summary = "";
    if (groqResult?.analysis) {
        summary = groqResult.analysis;
    } else if (tavilyResult?.answer) {
        summary = tavilyResult.answer;
    } else if (govResults?.sources?.[0]?.snippet) {
        summary = govResults.sources[0].snippet;
    } else {
        summary = `Ultra-deep research results for "${query}". Review the ${citedClaims.length} sources below for detailed information.`;
    }
    
    // Add key findings section
    let keyFindings = "";
    if (govResults?.sources && govResults.sources.length > 0) {
        const topGov = govResults.sources[0];
        keyFindings = `\n\n📌 KEY FINDING FROM ${topGov.name.toUpperCase()}:\n${topGov.snippet || topGov.title}`;
        summary += keyFindings;
    }
    
    // Limit summary length
    if (summary.length > 1200) {
        summary = summary.substring(0, 1200) + '...';
    }
    
    return {
        verdict: "✅ ULTRA-DEEP RESEARCH FINDINGS",
        summary: summary,
        citedClaims: citedClaims.slice(0, 25),
        tip: "🏛️ Government sources are prioritized. Click any source to verify.",
        sourceCount: {
            government: govResults?.sources?.length || 0,
            total: citedClaims.length
        }
    };
}
