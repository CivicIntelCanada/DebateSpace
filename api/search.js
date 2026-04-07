// ============================================
// DEBATESPACE - MULTI-LAYER DEEP RESEARCH
// Systematic research across ALL data sources
// ============================================

export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    
    const { query } = req.query;
    if (!query || query.trim() === '') {
        return res.status(400).json({ error: 'No query provided' });
    }
    
    console.log(`\n========== STARTING DEEP RESEARCH ==========`);
    console.log(`[API] Query: "${query}"`);
    console.log(`[API] Time: ${new Date().toISOString()}`);
    
    try {
        // LAYER 1: GOVERNMENT SOURCES (Highest Priority)
        console.log(`\n--- LAYER 1: Government Sources ---`);
        const govSources = await searchGovernmentLayers(query);
        
        // LAYER 2: ACADEMIC & RESEARCH
        console.log(`\n--- LAYER 2: Academic & Research ---`);
        const academicSources = await searchAcademicLayers(query);
        
        // LAYER 3: NEWS & MEDIA
        console.log(`\n--- LAYER 3: News & Media ---`);
        const newsSources = await searchNewsLayers(query);
        
        // LAYER 4: GENERAL WEB
        console.log(`\n--- LAYER 4: General Web ---`);
        const webSources = await searchWebLayers(query);
        
        // LAYER 5: VIDEO CONTENT
        console.log(`\n--- LAYER 5: Video Content ---`);
        const videoSources = await searchVideoLayers(query);
        
        // Combine ALL sources
        const allSources = [...govSources, ...academicSources, ...newsSources, ...webSources];
        
        // Generate deep research summary
        const researchSummary = await generateDeepResearch(query, allSources);
        
        console.log(`\n========== RESEARCH COMPLETE ==========`);
        console.log(`Total sources: ${allSources.length}`);
        console.log(`Government sources: ${govSources.length}`);
        console.log(`Academic sources: ${academicSources.length}`);
        console.log(`News sources: ${newsSources.length}`);
        console.log(`Web sources: ${webSources.length}`);
        console.log(`Video sources: ${videoSources.length}`);
        
        return res.status(200).json({
            success: true,
            query: query,
            factCheck: {
                verdict: "✅ COMPREHENSIVE RESEARCH",
                summary: researchSummary.summary,
                keyFindings: researchSummary.keyFindings,
                citedClaims: researchSummary.citedClaims,
                tip: "Click any source above to verify the information",
                sourceBreakdown: {
                    government: govSources.length,
                    academic: academicSources.length,
                    news: newsSources.length,
                    web: webSources.length,
                    total: allSources.length
                }
            },
            youtube: videoSources,
            timestamp: new Date().toISOString()
        });
        
    } catch (error) {
        console.error('[API] Fatal Error:', error);
        return res.status(200).json({
            success: true,
            query: query,
            factCheck: {
                verdict: "🔍 RESEARCH RESULTS",
                summary: `Research results for "${query}". Please review the sources below.`,
                citedClaims: [],
                tip: "Try using more specific terms"
            },
            youtube: []
        });
    }
}

// ============================================
// LAYER 1: GOVERNMENT SOURCES
// ============================================
async function searchGovernmentLayers(query) {
    const apiKey = process.env.GOOGLE_SEARCH_API_KEY;
    const sources = [];
    const seenUrls = new Set();
    
    // Specific government agencies to search
    const agencies = [
        // Canada
        { name: "Statistics Canada", domain: "statcan.gc.ca", url: "https://www.statcan.gc.ca" },
        { name: "Bank of Canada", domain: "bankofcanada.ca", url: "https://www.bankofcanada.ca" },
        { name: "Government of Canada", domain: "canada.ca", url: "https://www.canada.ca" },
        { name: "IRCC", domain: "canada.ca/en/immigration-refugees-citizenship", url: "https://www.canada.ca/en/immigration-refugees-citizenship.html" },
        // USA
        { name: "ICE", domain: "ice.gov", url: "https://www.ice.gov" },
        { name: "FLETC", domain: "fletc.gov", url: "https://www.fletc.gov" },
        { name: "DHS", domain: "dhs.gov", url: "https://www.dhs.gov" },
        { name: "BLS", domain: "bls.gov", url: "https://www.bls.gov" },
        { name: "Federal Reserve", domain: "federalreserve.gov", url: "https://www.federalreserve.gov" },
        { name: "CDC", domain: "cdc.gov", url: "https://www.cdc.gov" },
        { name: "NIH", domain: "nih.gov", url: "https://www.nih.gov" },
        { name: "NASA", domain: "nasa.gov", url: "https://www.nasa.gov" },
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
    
    for (const agency of agencies) {
        try {
            const searchUrl = `https://www.googleapis.com/customsearch/v1?key=${apiKey}&cx=${process.env.GOOGLE_SEARCH_CX_NA}&q=${encodeURIComponent(query)}&siteSearch=${agency.domain}&siteSearchFilter=i&num=5`;
            const response = await fetch(searchUrl);
            
            if (response.ok) {
                const data = await response.json();
                if (data.items && data.items.length > 0) {
                    for (const item of data.items) {
                        if (!seenUrls.has(item.link)) {
                            seenUrls.add(item.link);
                            sources.push({
                                name: agency.name,
                                title: item.title,
                                url: item.link,
                                snippet: item.snippet,
                                type: "government",
                                layer: 1
                            });
                        }
                    }
                }
            }
        } catch (error) {
            console.error(`[${agency.name}] Error:`, error.message);
        }
    }
    
    return sources;
}

// ============================================
// LAYER 2: ACADEMIC & RESEARCH SOURCES
// ============================================
async function searchAcademicLayers(query) {
    const apiKey = process.env.GOOGLE_SEARCH_API_KEY;
    const sources = [];
    const seenUrls = new Set();
    
    const academicDomains = ['.edu', '.ac.uk', '.edu.au', 'scholar.google.com', 'researchgate.net', 'academia.edu'];
    
    for (const domain of academicDomains) {
        try {
            const searchUrl = `https://www.googleapis.com/customsearch/v1?key=${apiKey}&cx=${process.env.GOOGLE_SEARCH_CX_NA}&q=${encodeURIComponent(query)}&siteSearch=${domain}&siteSearchFilter=i&num=5`;
            const response = await fetch(searchUrl);
            
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
                            
                            sources.push({
                                name: siteName,
                                title: item.title,
                                url: item.link,
                                snippet: item.snippet,
                                type: "academic",
                                layer: 2
                            });
                        }
                    }
                }
            }
        } catch (error) {
            console.error(`[Academic ${domain}] Error:`, error.message);
        }
    }
    
    return sources;
}

// ============================================
// LAYER 3: NEWS & MEDIA SOURCES
// ============================================
async function searchNewsLayers(query) {
    const apiKey = process.env.GNEWS_API_KEY;
    const sources = [];
    
    if (!apiKey) return sources;
    
    try {
        const url = `https://gnews.io/api/v4/search?q=${encodeURIComponent(query)}&lang=en&max=15&token=${apiKey}`;
        const response = await fetch(url);
        
        if (response.ok) {
            const data = await response.json();
            if (data.articles && data.articles.length > 0) {
                for (const article of data.articles) {
                    let siteName = "";
                    try {
                        siteName = new URL(article.url).hostname.replace('www.', '');
                    } catch(e) {}
                    
                    sources.push({
                        name: siteName,
                        title: article.title,
                        url: article.url,
                        snippet: article.description,
                        type: "news",
                        layer: 3,
                        date: article.publishedAt?.split('T')[0]
                    });
                }
            }
        }
    } catch (error) {
        console.error('[GNews] Error:', error.message);
    }
    
    return sources;
}

// ============================================
// LAYER 4: GENERAL WEB SOURCES
// ============================================
async function searchWebLayers(query) {
    const apiKey = process.env.TAVILY_API_KEY;
    const sources = [];
    
    if (!apiKey) return sources;
    
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
        
        if (data.results && data.results.length > 0) {
            for (const result of data.results) {
                let siteName = "";
                try {
                    siteName = new URL(result.url).hostname.replace('www.', '');
                } catch(e) {}
                
                sources.push({
                    name: siteName,
                    title: result.title,
                    url: result.url,
                    snippet: result.content?.substring(0, 500),
                    type: "web",
                    layer: 4
                });
            }
        }
        
        return sources;
        
    } catch (error) {
        console.error('[Tavily] Error:', error.message);
        return sources;
    }
}

// ============================================
// LAYER 5: VIDEO SOURCES
// ============================================
async function searchVideoLayers(query) {
    const apiKey = process.env.YOUTUBE_API_KEY;
    const videos = [];
    
    if (!apiKey) {
        return getVideoFallback(query);
    }
    
    try {
        const searchUrl = `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(query)}&type=video&maxResults=6&key=${apiKey}`;
        const response = await fetch(searchUrl);
        
        if (response.ok) {
            const data = await response.json();
            if (data.items && data.items.length > 0) {
                // Get view counts
                const videoIds = data.items.map(item => item.id.videoId).join(',');
                const statsUrl = `https://www.googleapis.com/youtube/v3/videos?part=statistics&id=${videoIds}&key=${apiKey}`;
                const statsResponse = await fetch(statsUrl);
                let statsMap = {};
                
                if (statsResponse.ok) {
                    const statsData = await statsResponse.json();
                    if (statsData.items) {
                        statsMap = statsData.items.reduce((map, item) => {
                            map[item.id] = { views: parseInt(item.statistics?.viewCount || 0).toLocaleString() };
                            return map;
                        }, {});
                    }
                }
                
                for (const item of data.items) {
                    videos.push({
                        title: item.snippet.title,
                        url: `https://www.youtube.com/watch?v=${item.id.videoId}`,
                        channel: item.snippet.channelTitle,
                        thumbnail: item.snippet.thumbnails?.medium?.url || '',
                        views: statsMap[item.id.videoId]?.views || 'N/A'
                    });
                }
            }
        }
        
        if (videos.length === 0) {
            return getVideoFallback(query);
        }
        
        return videos;
        
    } catch (error) {
        console.error('[YouTube] Error:', error.message);
        return getVideoFallback(query);
    }
}

function getVideoFallback(query) {
    const encoded = encodeURIComponent(query);
    return [
        { title: `YouTube search: "${query}"`, url: `https://www.youtube.com/results?search_query=${encoded}`, channel: "YouTube Search", thumbnail: "", views: "Click to search" },
        { title: `${query} - documentary`, url: `https://www.youtube.com/results?search_query=${encoded}+documentary`, channel: "YouTube Search", thumbnail: "", views: "Click to search" },
        { title: `${query} - explained`, url: `https://www.youtube.com/results?search_query=${encoded}+explained`, channel: "YouTube Search", thumbnail: "", views: "Click to search" }
    ];
}

// ============================================
// GENERATE DEEP RESEARCH SUMMARY
// ============================================
async function generateDeepResearch(query, allSources) {
    const groqKey = process.env.GROQ_API_KEY;
    const citedClaims = [];
    let summary = "";
    let keyFindings = [];
    
    // Build cited claims from all sources
    for (const source of allSources.slice(0, 25)) {
        if (source.url && source.snippet) {
            let prefix = "";
            if (source.type === "government") prefix = "🏛️ ";
            if (source.type === "academic") prefix = "🎓 ";
            if (source.type === "news") prefix = "📰 ";
            
            citedClaims.push({
                claim: source.snippet.length > 400 ? source.snippet.substring(0, 400) + '...' : source.snippet,
                source: `${prefix}${source.name}`,
                url: source.url
            });
        }
    }
    
    // Use Groq to synthesize findings if available
    if (groqKey && allSources.length > 0) {
        try {
            const sourcesText = allSources.slice(0, 15).map(s => s.snippet).join('\n\n');
            const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${groqKey}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    model: 'llama-3.3-70b-versatile',
                    messages: [
                        {
                            role: 'system',
                            content: `You are a research synthesizer. Based on the provided source snippets, create a comprehensive summary of the key findings. Include specific data points, statistics, and conclusions. Be factual and neutral.`
                        },
                        {
                            role: 'user',
                            content: `Query: ${query}\n\nSource Snippets:\n${sourcesText}`
                        }
                    ],
                    temperature: 0.1,
                    max_tokens: 800
                })
            });
            
            if (response.ok) {
                const data = await response.json();
                summary = data.choices?.[0]?.message?.content || `Research findings for "${query}".`;
            } else {
                summary = `Research findings for "${query}" based on ${allSources.length} sources.`;
            }
        } catch (error) {
            summary = `Research findings for "${query}" based on ${allSources.length} sources.`;
        }
    } else {
        summary = `Research findings for "${query}" based on ${allSources.length} authoritative sources.`;
    }
    
    return {
        summary: summary,
        keyFindings: keyFindings,
        citedClaims: citedClaims
    };
}
