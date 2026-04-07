// ============================================
// DEBATESPACE - DEEP RESEARCH + YOUTUBE FIXED
// Government FIRST + Deep analysis + YouTube videos
// ============================================

export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    
    const { query } = req.query;
    if (!query || query.trim() === '') {
        return res.status(400).json({ error: 'No query provided' });
    }
    
    console.log(`[API] Deep research: "${query}"`);
    
    try {
        // Fetch ALL data in parallel
        const [govResults, tavilyResult, groqResult, youtubeResult] = await Promise.all([
            fetchAllGovernmentSources(query),
            fetchTavilyDeep(query),
            fetchGroqDeep(query),
            fetchYouTubeFixed(query)
        ]);
        
        console.log(`[YouTube] Found ${youtubeResult?.length || 0} videos`);
        console.log(`[Gov] Found ${govResults?.sources?.length || 0} government sources`);
        console.log(`[Tavily] Has answer: ${!!tavilyResult?.answer}`);
        console.log(`[Groq] Has analysis: ${!!groqResult?.analysis}`);
        
        // Build deep fact check
        const factCheck = buildDeepFactCheck(query, tavilyResult, groqResult, govResults);
        
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
                verdict: "🔍 RESEARCH FINDINGS",
                summary: `Research results for "${query}". Please review the sources below.`,
                citedClaims: [],
                tip: "Try using specific terms for better results"
            },
            youtube: []
        });
    }
}

// ============================================
// FETCH ALL GOVERNMENT SOURCES
// ============================================
async function fetchAllGovernmentSources(query) {
    const apiKey = process.env.GOOGLE_SEARCH_API_KEY;
    const cx = process.env.GOOGLE_SEARCH_CX_NA;
    
    if (!apiKey || !cx) return { sources: [] };
    
    const allResults = [];
    
    // Government domains to search
    const govDomains = [
        'canada.ca', 'gc.ca', 'statcan.gc.ca', 'bankofcanada.ca',
        'gov', 'usa.gov', 'dhs.gov', 'ice.gov', 'fletc.gov',
        'justice.gov', 'state.gov', 'defense.gov', 'mil',
        'gov.uk', 'parliament.uk', 'mod.uk',
        'un.org', 'who.int', 'worldbank.org'
    ];
    
    for (const domain of govDomains) {
        try {
            const url = `https://www.googleapis.com/customsearch/v1?key=${apiKey}&cx=${cx}&q=${encodeURIComponent(query)}&siteSearch=${domain}&siteSearchFilter=i&num=5`;
            const response = await fetch(url);
            
            if (response.ok) {
                const data = await response.json();
                if (data.items && data.items.length > 0) {
                    for (const item of data.items) {
                        allResults.push({
                            name: domain,
                            title: item.title,
                            url: item.link,
                            snippet: item.snippet,
                            isGovernment: true
                        });
                    }
                }
            }
        } catch (error) {
            console.error(`[${domain}] Error:`, error.message);
        }
    }
    
    // Also do a general government search
    try {
        const govQuery = `${query} government official data`;
        const url = `https://www.googleapis.com/customsearch/v1?key=${apiKey}&cx=${cx}&q=${encodeURIComponent(govQuery)}&num=10`;
        const response = await fetch(url);
        
        if (response.ok) {
            const data = await response.json();
            if (data.items) {
                for (const item of data.items) {
                    let isGov = false;
                    try {
                        const hostname = new URL(item.link).hostname;
                        if (hostname.includes('.gov') || hostname.includes('.gc.ca')) {
                            isGov = true;
                        }
                    } catch(e) {}
                    
                    allResults.push({
                        name: new URL(item.link).hostname.replace('www.', ''),
                        title: item.title,
                        url: item.link,
                        snippet: item.snippet,
                        isGovernment: isGov
                    });
                }
            }
        }
    } catch(e) {}
    
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
                max_results: 15
            })
        });
        
        const data = await response.json();
        console.log(`[Tavily] Answer received: ${data.answer?.substring(0, 100)}...`);
        
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
                        content: `You are a research analyst. Provide a detailed, factual analysis based on official government data. Include specific statistics, dates, and verifiable facts. Keep response under 600 words.`
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
        console.log(`[Groq] Analysis length: ${analysis?.length || 0}`);
        
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
// YOUTUBE API - FIXED
// ============================================
async function fetchYouTubeFixed(query) {
    const apiKey = process.env.YOUTUBE_API_KEY;
    
    console.log(`[YouTube] API Key present: ${!!apiKey}`);
    
    if (!apiKey) {
        console.log('[YouTube] No API key found');
        return getFallbackYouTube(query);
    }
    
    try {
        const searchQuery = `${query} explained documentary analysis`;
        const url = `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(searchQuery)}&type=video&maxResults=6&key=${apiKey}`;
        const response = await fetch(url);
        
        console.log(`[YouTube] Response status: ${response.status}`);
        
        if (!response.ok) {
            console.log('[YouTube] API error, using fallback');
            return getFallbackYouTube(query);
        }
        
        const data = await response.json();
        
        if (!data.items || data.items.length === 0) {
            console.log('[YouTube] No videos found, using fallback');
            return getFallbackYouTube(query);
        }
        
        console.log(`[YouTube] Found ${data.items.length} videos`);
        
        return data.items.map(item => ({
            title: item.snippet.title,
            url: `https://www.youtube.com/watch?v=${item.id.videoId}`,
            channel: item.snippet.channelTitle,
            thumbnail: item.snippet.thumbnails?.medium?.url || item.snippet.thumbnails?.default?.url || ''
        }));
        
    } catch (error) {
        console.error('[YouTube] Error:', error.message);
        return getFallbackYouTube(query);
    }
}

function getFallbackYouTube(query) {
    const encoded = encodeURIComponent(query);
    return [
        { title: `Search YouTube for "${query}"`, url: `https://www.youtube.com/results?search_query=${encoded}`, channel: "YouTube Search", thumbnail: "" },
        { title: `${query} - explained`, url: `https://www.youtube.com/results?search_query=${encoded}+explained`, channel: "YouTube Search", thumbnail: "" }
    ];
}

// ============================================
// BUILD DEEP FACT CHECK
// ============================================
function buildDeepFactCheck(query, tavilyResult, groqResult, govResults) {
    const citedClaims = [];
    
    // Add government sources first
    if (govResults?.sources) {
        for (const source of govResults.sources.slice(0, 15)) {
            if (source.url && source.snippet) {
                citedClaims.push({
                    claim: source.snippet,
                    source: source.isGovernment ? `🏛️ ${source.name}` : source.name,
                    url: source.url
                });
            }
        }
    }
    
    // Add Tavily sources
    if (tavilyResult?.sources && citedClaims.length < 20) {
        for (const source of tavilyResult.sources.slice(0, 10)) {
            if (source.url && source.snippet && !citedClaims.some(c => c.url === source.url)) {
                citedClaims.push({
                    claim: source.snippet,
                    source: source.name,
                    url: source.url
                });
            }
        }
    }
    
    // Build summary - prefer Groq for depth
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
    if (summary.length > 1000) {
        summary = summary.substring(0, 1000) + '...';
    }
    
    return {
        verdict: "✅ DEEP RESEARCH FINDINGS",
        summary: summary,
        citedClaims: citedClaims.slice(0, 20),
        tip: "🏛️ Government sources are prioritized. Click any source to verify.",
        sourceCount: {
            government: govResults?.sources?.filter(s => s.isGovernment).length || 0,
            total: citedClaims.length
        }
    };
}
