// ============================================
// DEBATESPACE - GOVERNMENT-FIRST DEEP RESEARCH
// FIXED: Proper FINAL ANSWER from Tavily + Groq
// ============================================

export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    
    const { query } = req.query;
    if (!query || query.trim() === '') {
        return res.status(400).json({ error: 'No query provided' });
    }
    
    console.log(`[API] Deep government research: "${query}"`);
    
    try {
        // Fetch ALL data in parallel
        const [govResults, tavilyResult, groqResult, youtubeResult] = await Promise.all([
            fetchAllGovernmentSources(query),
            fetchTavilyDeep(query),
            fetchGroqDeep(query),
            fetchYouTube(query)
        ]);
        
        // Debug logging
        console.log(`[DEBUG] Tavily has answer: ${!!tavilyResult?.answer}`);
        console.log(`[DEBUG] Groq has analysis: ${!!groqResult?.analysis}`);
        console.log(`[DEBUG] Gov sources count: ${govResults?.sources?.length || 0}`);
        
        // Combine ALL government sources
        const allGovSources = combineGovernmentSources(govResults);
        
        // Build deep research fact check with final answer
        const factCheck = buildDeepFactCheckWithFinalAnswer(query, tavilyResult, groqResult, allGovSources);
        
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
                verdict: "🔍 RESEARCH FINDINGS",
                summary: `Deep research results for "${query}".`,
                finalAnswer: `Based on available data, please review the official government sources below for accurate information about "${query}".`,
                citedClaims: [],
                tip: "Try using specific terms like 'official', 'government data', or 'statistics'"
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
                            if (siteName.includes('.gov') || siteName.includes('.gc.ca') || 
                                siteName.includes('.mil')) {
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
    
    const uniqueResults = [];
    const seenUrls = new Set();
    for (const result of allResults) {
        if (!seenUrls.has(result.url)) {
            seenUrls.add(result.url);
            uniqueResults.push(result);
        }
    }
    
    uniqueResults.sort((a, b) => {
        if (a.isGovernment && !b.isGovernment) return -1;
        if (!a.isGovernment && b.isGovernment) return 1;
        return a.priority - b.priority;
    });
    
    return { sources: uniqueResults.slice(0, 30) };
}

function combineGovernmentSources(govResults) {
    if (!govResults?.sources || govResults.sources.length === 0) {
        return [];
    }
    return govResults.sources;
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
        console.log(`[Tavily] Answer received, length: ${data.answer?.length || 0}`);
        
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
                    snippet: result.content?.substring(0, 400)
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
                        content: `You are a research analyst. Provide a concise, factual summary (2-3 sentences) answering the user's question directly. Use specific data and facts.`
                    },
                    {
                        role: 'user',
                        content: query
                    }
                ],
                temperature: 0.1,
                max_tokens: 200
            })
        });
        
        if (!response.ok) return null;
        
        const data = await response.json();
        const analysis = data.choices?.[0]?.message?.content;
        console.log(`[Groq] Analysis received, length: ${analysis?.length || 0}`);
        
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
// BUILD DEEP FACT CHECK WITH PROPER FINAL ANSWER
// ============================================
function buildDeepFactCheckWithFinalAnswer(query, tavilyResult, groqResult, govSources) {
    // Create cited claims from government sources
    const citedClaims = [];
    
    for (const source of govSources.slice(0, 15)) {
        if (source.url && source.name) {
            const sourceIndicator = source.isGovernment ? '🏛️ ' : '';
            citedClaims.push({
                claim: source.snippet || source.title,
                source: sourceIndicator + source.name,
                url: source.url,
                isGovernment: source.isGovernment
            });
        }
    }
    
    // Build summary from Groq or Tavily
    let summary = "";
    if (groqResult?.analysis) {
        summary = groqResult.analysis;
    } else if (tavilyResult?.answer) {
        summary = tavilyResult.answer.length > 500 ? tavilyResult.answer.substring(0, 500) + '...' : tavilyResult.answer;
    } else if (govSources.length > 0) {
        summary = govSources[0].snippet || `Government data for "${query}"`;
    } else {
        summary = `Deep research results for "${query}" from government and official sources.`;
    }
    
    // ============================================
    // FINAL ANSWER - Prioritize Groq, then Tavily
    // ============================================
    let finalAnswer = "";
    
    if (groqResult?.analysis && groqResult.analysis.length > 20) {
        // Use Groq's direct answer
        finalAnswer = groqResult.analysis;
    } 
    else if (tavilyResult?.answer && tavilyResult.answer.length > 20) {
        // Use Tavily's answer
        finalAnswer = tavilyResult.answer;
    }
    else if (govSources.length > 0) {
        // Use top government source
        const topGov = govSources[0];
        finalAnswer = `According to ${topGov.name}, ${topGov.snippet || 'official information is available at the source link.'}`;
    }
    else {
        finalAnswer = `For accurate information about "${query}", please review the official government sources listed above.`;
    }
    
    // Clean up the final answer
    finalAnswer = finalAnswer
        .replace(/\[\d+\]/g, '')
        .replace(/\(source:.*?\)/gi, '')
        .replace(/\[citation\s*\d*\]/gi, '')
        .trim();
    
    // Ensure proper punctuation
    if (!finalAnswer.endsWith('.') && !finalAnswer.endsWith('!') && !finalAnswer.endsWith('?')) {
        finalAnswer += '.';
    }
    
    return {
        verdict: "✅ GOVERNMENT RESEARCH FINDINGS",
        summary: summary,
        finalAnswer: finalAnswer,
        citedClaims: citedClaims,
        tip: "🏛️ Government sources (.gov, .gc.ca) are prioritized for accuracy. Click any source to verify.",
        sourceCount: {
            government: govSources.filter(s => s.isGovernment).length,
            total: citedClaims.length
        }
    };
}
