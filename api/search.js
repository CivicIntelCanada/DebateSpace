// ============================================
// DEBATESPACE - DEEPEST RESEARCH POSSIBLE
// Uses: All 5 Google Search Engines + Tavily + Groq + YouTube
// Prioritizes: .gov, .gc.ca, .mil, .edu, archives, census data
// ============================================

export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    
    const { query } = req.query;
    if (!query || query.trim() === '') {
        return res.status(400).json({ error: 'No query provided' });
    }
    
    console.log(`[API] Deepest research: "${query}"`);
    
    try {
        // Fetch from ALL sources in parallel
        const [govResults, archiveResults, tavilyResult, groqResult, youtubeResult] = await Promise.all([
            fetchAllGovernmentSources(query),
            fetchArchiveSources(query),
            fetchTavilyDeep(query),
            fetchGroqDeep(query),
            fetchYouTube(query)
        ]);
        
        // Combine ALL sources
        const allSources = combineAllSources(govResults, archiveResults, tavilyResult);
        
        // Build deep research fact check
        const factCheck = buildDeepestFactCheck(query, tavilyResult, groqResult, allSources, govResults, archiveResults);
        
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
                summary: `Deep research results for "${query}". Please review the sources below.`,
                citedClaims: [],
                tip: "Try using specific government terms or official names"
            },
            youtube: []
        });
    }
}

// ============================================
// FETCH ALL 5 GOOGLE SEARCH ENGINES - GOVERNMENT PRIORITY
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
            // Get up to 10 results per engine
            const url = `https://www.googleapis.com/customsearch/v1?key=${apiKey}&cx=${engine.cx}&q=${encodeURIComponent(query)}&num=10`;
            const response = await fetch(url);
            
            if (response.ok) {
                const data = await response.json();
                if (data.items && data.items.length > 0) {
                    for (const item of data.items) {
                        let siteName = "";
                        let isGovernment = false;
                        let isMilitary = false;
                        let isEducational = false;
                        try {
                            const urlObj = new URL(item.link);
                            siteName = urlObj.hostname.replace('www.', '');
                            if (siteName.includes('.gov') || siteName.includes('.gc.ca')) {
                                isGovernment = true;
                            }
                            if (siteName.includes('.mil')) {
                                isMilitary = true;
                            }
                            if (siteName.includes('.edu')) {
                                isEducational = true;
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
                            isMilitary: isMilitary,
                            isEducational: isEducational,
                            priority: engine.priority
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
    
    // Sort: Government > Military > Educational > Others
    uniqueResults.sort((a, b) => {
        if (a.isGovernment && !b.isGovernment) return -1;
        if (!a.isGovernment && b.isGovernment) return 1;
        if (a.isMilitary && !b.isMilitary) return -1;
        if (!a.isMilitary && b.isMilitary) return 1;
        if (a.isEducational && !b.isEducational) return -1;
        if (!a.isEducational && b.isEducational) return 1;
        return a.priority - b.priority;
    });
    
    return { sources: uniqueResults.slice(0, 25) };
}

// ============================================
// FETCH ARCHIVE SOURCES - Deep historical data
// ============================================
async function fetchArchiveSources(query) {
    const apiKey = process.env.GOOGLE_SEARCH_API_KEY;
    
    // Archive-specific search engines
    const archiveEngines = [
        { name: 'North America', cx: process.env.GOOGLE_SEARCH_CX_NA },
        { name: 'Europe', cx: process.env.GOOGLE_SEARCH_CX_EU }
    ];
    
    // Archive-specific keywords to prioritize
    const archiveTerms = ['archive', 'census', 'historical', 'data', 'statistics', 'record', 'document', 'report'];
    const archiveQuery = `${query} ${archiveTerms.join(' OR ')}`;
    
    const allResults = [];
    
    for (const engine of archiveEngines) {
        if (!apiKey || !engine.cx) continue;
        
        try {
            const url = `https://www.googleapis.com/customsearch/v1?key=${apiKey}&cx=${engine.cx}&q=${encodeURIComponent(archiveQuery)}&num=8`;
            const response = await fetch(url);
            
            if (response.ok) {
                const data = await response.json();
                if (data.items && data.items.length > 0) {
                    for (const item of data.items) {
                        let siteName = "";
                        let isArchive = false;
                        try {
                            const urlObj = new URL(item.link);
                            siteName = urlObj.hostname.replace('www.', '');
                            if (siteName.includes('archive') || siteName.includes('census') || 
                                siteName.includes('stat') || siteName.includes('data')) {
                                isArchive = true;
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
                            isArchive: isArchive
                        });
                    }
                }
            }
        } catch (error) {
            console.error(`[Archive] Error:`, error.message);
        }
    }
    
    return { sources: allResults.slice(0, 15) };
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
        console.log(`[Tavily] Answer length: ${data.answer?.length || 0}, Sources: ${data.results?.length || 0}`);
        
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
// GROQ DEEP ANALYSIS - Comprehensive research
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
                        content: `You are a senior research analyst. Provide a COMPREHENSIVE, DETAILED analysis based on official government data, academic research, and authoritative sources. Include:
1. Key statistics and data points
2. Historical context and trends
3. Official findings and conclusions
4. Any relevant controversies or debates
Be thorough, factual, and neutral. Use specific numbers, dates, and citations where possible. Keep response under 800 words.`
                    },
                    {
                        role: 'user',
                        content: query
                    }
                ],
                temperature: 0.1,
                max_tokens: 1200
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
function combineAllSources(govResults, archiveResults, tavilyResult) {
    const allSources = [];
    
    // Add government sources
    if (govResults?.sources) {
        allSources.push(...govResults.sources);
    }
    
    // Add archive sources
    if (archiveResults?.sources) {
        allSources.push(...archiveResults.sources);
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
// BUILD DEEPEST FACT CHECK
// ============================================
function buildDeepestFactCheck(query, tavilyResult, groqResult, allSources, govResults, archiveResults) {
    // Create cited claims from ALL sources
    const citedClaims = [];
    
    // Add government sources first (highest priority)
    if (govResults?.sources) {
        for (const source of govResults.sources.slice(0, 12)) {
            if (source.url && source.name) {
                let typeLabel = "";
                if (source.isGovernment) typeLabel = "🏛️ GOVERNMENT";
                if (source.isMilitary) typeLabel = "⚔️ MILITARY";
                if (source.isEducational) typeLabel = "🎓 ACADEMIC";
                
                citedClaims.push({
                    claim: source.snippet || source.title,
                    source: typeLabel ? `${typeLabel} ${source.name}` : source.name,
                    url: source.url,
                    priority: "government"
                });
            }
        }
    }
    
    // Add archive sources
    if (archiveResults?.sources) {
        for (const source of archiveResults.sources.slice(0, 8)) {
            if (source.url && source.name && !citedClaims.some(c => c.url === source.url)) {
                citedClaims.push({
                    claim: source.snippet || source.title,
                    source: `📚 ARCHIVE ${source.name}`,
                    url: source.url,
                    priority: "archive"
                });
            }
        }
    }
    
    // Add Tavily sources as supplement
    if (tavilyResult?.sources && citedClaims.length < 20) {
        for (const source of tavilyResult.sources.slice(0, 10)) {
            if (source.url && source.name && !citedClaims.some(c => c.url === source.url)) {
                citedClaims.push({
                    claim: source.snippet || source.title,
                    source: source.name,
                    url: source.url,
                    priority: "web"
                });
            }
        }
    }
    
    // Build the comprehensive summary
    let summary = "";
    if (groqResult?.analysis) {
        summary = groqResult.analysis;
    } else if (tavilyResult?.answer) {
        summary = tavilyResult.answer;
    } else if (govResults?.sources && govResults.sources.length > 0) {
        summary = govResults.sources[0].snippet || `Government data for "${query}"`;
    } else {
        summary = `Deep research results for "${query}" from government archives and official sources.`;
    }
    
    // Add source statistics to summary for context
    const govCount = govResults?.sources?.filter(s => s.isGovernment).length || 0;
    const archiveCount = archiveResults?.sources?.length || 0;
    const totalCount = citedClaims.length;
    
    const sourceNote = `\n\n[Sources: ${govCount} government, ${archiveCount} archive, ${totalCount} total verified sources]`;
    
    return {
        verdict: "✅ COMPREHENSIVE RESEARCH FINDINGS",
        summary: summary.length > 1500 ? summary.substring(0, 1500) + '...' : summary,
        citedClaims: citedClaims.slice(0, 25),
        tip: "🏛️ Government and archive sources are prioritized. Click any source to verify.",
        sourceCount: {
            government: govCount,
            archive: archiveCount,
            total: citedClaims.length
        }
    };
}
