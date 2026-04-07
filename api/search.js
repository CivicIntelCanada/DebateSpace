// ============================================
// DEBATESPACE - GOVERNMENT-FIRST DEEP RESEARCH
// Prioritizes .gov, official archives, scrubbed data
// ============================================

export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    
    const { query } = req.query;
    if (!query || query.trim() === '') {
        return res.status(400).json({ error: 'No query provided' });
    }
    
    console.log(`[API] Deep government research: "${query}"`);
    
    try {
        // Fetch ALL government sources FIRST (priority)
        const [govResults, tavilyResult, groqResult, youtubeResult] = await Promise.all([
            fetchAllGovernmentSources(query),
            fetchTavilyDeep(query),
            fetchGroqDeep(query),
            fetchYouTube(query)
        ]);
        
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
                finalAnswer: "Please try rephrasing your question for more specific government data.",
                citedClaims: [],
                tip: "Try using specific terms like 'official', 'government data', or 'statistics'"
            },
            youtube: []
        });
    }
}

// ============================================
// FETCH ALL 5 GOOGLE SEARCH ENGINES - PRIORITY
// ============================================
async function fetchAllGovernmentSources(query) {
    const apiKey = process.env.GOOGLE_SEARCH_API_KEY;
    
    // Expanded search engines with government priority
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
                        let isArchive = false;
                        try {
                            const urlObj = new URL(item.link);
                            siteName = urlObj.hostname.replace('www.', '');
                            // Mark government sources
                            if (siteName.includes('.gov') || siteName.includes('.gc.ca') || 
                                siteName.includes('.mil') || siteName.includes('.edu')) {
                                isGovernment = true;
                            }
                            // Mark archive sources
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
                            isGovernment: isGovernment,
                            isArchive: isArchive,
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
    
    // Sort: Government sources first, then archives, then by priority
    uniqueResults.sort((a, b) => {
        if (a.isGovernment && !b.isGovernment) return -1;
        if (!a.isGovernment && b.isGovernment) return 1;
        if (a.isArchive && !b.isArchive) return -1;
        if (!a.isArchive && b.isArchive) return 1;
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
                        content: `You are a government research analyst. Provide a detailed, factual analysis based on official government data. Include specific statistics, dates, and verifiable facts. Be neutral and academic. Keep response under 500 words.`
                    },
                    {
                        role: 'user',
                        content: query
                    }
                ],
                temperature: 0.1,
                max_tokens: 800
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
// BUILD DEEP FACT CHECK WITH FINAL ANSWER
// ============================================
function buildDeepFactCheckWithFinalAnswer(query, tavilyResult, groqResult, govSources) {
    const q = query.toLowerCase();
    
    // Create cited claims from government sources FIRST
    const citedClaims = [];
    
    // Add government sources as claims (these are the most authoritative)
    for (const source of govSources.slice(0, 15)) {
        if (source.url && source.name) {
            let claimText = source.snippet || source.title;
            // Add indicator for government sources
            const sourceIndicator = source.isGovernment ? '🏛️ ' : '';
            citedClaims.push({
                claim: claimText,
                source: sourceIndicator + source.name,
                url: source.url,
                isGovernment: source.isGovernment
            });
        }
    }
    
    // Add Tavily sources if needed
    if (citedClaims.length < 8 && tavilyResult?.sources) {
        for (const source of tavilyResult.sources.slice(0, 10)) {
            if (source.url && source.name && !citedClaims.some(c => c.url === source.url)) {
                citedClaims.push({
                    claim: source.snippet || source.title,
                    source: source.name,
                    url: source.url,
                    isGovernment: false
                });
            }
        }
    }
    
    // Build the summary - prefer Groq analysis for depth, then Tavily
    let summary = "";
    if (groqResult?.analysis) {
        summary = groqResult.analysis;
    } else if (tavilyResult?.answer) {
        summary = tavilyResult.answer;
    } else if (govSources.length > 0) {
        summary = govSources[0].snippet || `Government data for "${query}"`;
    } else {
        summary = `Deep research results for "${query}" from government and official sources.`;
    }
    
    // Generate FINAL ANSWER conclusion
    let finalAnswer = "";
    if (govSources.length > 0) {
        // Extract a conclusive statement from top government source
        const topGov = govSources[0];
        finalAnswer = `Based on official government data from ${topGov.name}, ${topGov.snippet ? topGov.snippet.substring(0, 200) : 'information is available at the source link above.'}`;
    } else if (groqResult?.analysis) {
        // Extract last sentence from Groq analysis as conclusion
        const sentences = groqResult.analysis.split(/[.!?]+/);
        const lastSentence = sentences[sentences.length - 2] || sentences[0];
        finalAnswer = lastSentence ? lastSentence.trim() + "." : "Please review the sources above for accurate information.";
    } else if (tavilyResult?.answer) {
        finalAnswer = tavilyResult.answer.split(/[.!?]+/).slice(-2).join(". ") + ".";
    } else {
        finalAnswer = `For accurate information about "${query}", please review the official government sources listed above.`;
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
