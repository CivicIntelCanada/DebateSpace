// ============================================
// DEBATESPACE - PERFECT DEEP RESEARCH
// Full citations, working YouTube, deep government data
// ============================================

export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    
    const { query } = req.query;
    if (!query || query.trim() === '') {
        return res.status(400).json({ error: 'No query provided' });
    }
    
    console.log(`\n========== DEEP RESEARCH: "${query}" ==========`);
    
    try {
        // Fetch ALL data sources
        const [govSources, newsSources, webSources, videoSources] = await Promise.all([
            fetchDeepGovernment(query),
            fetchNewsSources(query),
            fetchWebSources(query),
            fetchYouTubeSources(query)
        ]);
        
        // Combine all sources for citations
        const allSources = [...govSources, ...newsSources, ...webSources];
        
        // Generate comprehensive research
        const research = await generateDeepResearch(query, allSources, govSources);
        
        console.log(`\n========== RESULTS ==========`);
        console.log(`Government: ${govSources.length}`);
        console.log(`News: ${newsSources.length}`);
        console.log(`Web: ${webSources.length}`);
        console.log(`Videos: ${videoSources.length}`);
        console.log(`Total Citations: ${allSources.length}`);
        
        return res.status(200).json({
            success: true,
            query: query,
            research: {
                summary: research.summary,
                detailedAnalysis: research.detailedAnalysis,
                keyFindings: research.keyFindings,
                citations: research.citations,
                sourceCounts: {
                    government: govSources.length,
                    news: newsSources.length,
                    web: webSources.length,
                    total: allSources.length
                }
            },
            youtube: videoSources,
            timestamp: new Date().toISOString()
        });
        
    } catch (error) {
        console.error('[API] Error:', error);
        return res.status(200).json({
            success: true,
            query: query,
            research: {
                summary: `Research results for "${query}".`,
                detailedAnalysis: "Please review the sources below for detailed information.",
                citations: [],
                sourceCounts: { total: 0 }
            },
            youtube: getYouTubeFallback(query)
        });
    }
}

// ============================================
// DEEP GOVERNMENT SOURCES WITH DIRECT LINKS
// ============================================
async function fetchDeepGovernment(query) {
    const apiKey = process.env.GOOGLE_SEARCH_API_KEY;
    const sources = [];
    const seenUrls = new Set();
    
    // Comprehensive government agencies with direct URLs
    const agencies = [
        { name: "FLETC", domain: "fletc.gov", url: "https://www.fletc.gov", type: "US Training" },
        { name: "ICE", domain: "ice.gov", url: "https://www.ice.gov", type: "US Immigration" },
        { name: "DHS", domain: "dhs.gov", url: "https://www.dhs.gov", type: "US Homeland Security" },
        { name: "Statistics Canada", domain: "statcan.gc.ca", url: "https://www.statcan.gc.ca", type: "Canadian Statistics" },
        { name: "Bank of Canada", domain: "bankofcanada.ca", url: "https://www.bankofcanada.ca", type: "Canadian Monetary" },
        { name: "Government of Canada", domain: "canada.ca", url: "https://www.canada.ca", type: "Canadian Government" },
        { name: "BLS", domain: "bls.gov", url: "https://www.bls.gov", type: "US Labor Statistics" },
        { name: "Federal Reserve", domain: "federalreserve.gov", url: "https://www.federalreserve.gov", type: "US Monetary" },
        { name: "GOV.UK", domain: "gov.uk", url: "https://www.gov.uk", type: "UK Government" },
        { name: "UN", domain: "un.org", url: "https://www.un.org", type: "United Nations" },
        { name: "WHO", domain: "who.int", url: "https://www.who.int", type: "World Health" },
        { name: "World Bank", domain: "worldbank.org", url: "https://www.worldbank.org", type: "Global Development" }
    ];
    
    for (const agency of agencies) {
        try {
            // Direct agency search
            const searchUrl = `https://www.googleapis.com/customsearch/v1?key=${apiKey}&cx=${process.env.GOOGLE_SEARCH_CX_NA}&q=${encodeURIComponent(query)}&siteSearch=${agency.domain}&siteSearchFilter=i&num=5`;
            const response = await fetch(searchUrl);
            
            if (response.ok) {
                const data = await response.json();
                if (data.items && data.items.length > 0) {
                    for (const item of data.items) {
                        if (!seenUrls.has(item.link)) {
                            seenUrls.add(item.link);
                            sources.push({
                                title: item.title,
                                url: item.link,
                                snippet: item.snippet,
                                source: agency.name,
                                type: "government",
                                domain: agency.domain
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
// NEWS SOURCES
// ============================================
async function fetchNewsSources(query) {
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
                        title: article.title,
                        url: article.url,
                        snippet: article.description,
                        source: siteName,
                        type: "news",
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
// WEB SOURCES (Tavily)
// ============================================
async function fetchWebSources(query) {
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
                max_results: 15
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
                    title: result.title,
                    url: result.url,
                    snippet: result.content?.substring(0, 500),
                    source: siteName,
                    type: "web"
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
// YOUTUBE SOURCES - GUARANTEED WORKING
// ============================================
async function fetchYouTubeSources(query) {
    const apiKey = process.env.YOUTUBE_API_KEY;
    const videos = [];
    
    // Always include search links (guaranteed to work)
    videos.push(...getYouTubeSearchLinks(query));
    
    if (apiKey) {
        try {
            const url = `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(query)}&type=video&maxResults=6&key=${apiKey}`;
            const response = await fetch(url);
            
            if (response.ok) {
                const data = await response.json();
                if (data.items && data.items.length > 0) {
                    for (const item of data.items) {
                        videos.push({
                            title: item.snippet.title,
                            url: `https://www.youtube.com/watch?v=${item.id.videoId}`,
                            channel: item.snippet.channelTitle,
                            thumbnail: item.snippet.thumbnails?.medium?.url || '',
                            type: "video"
                        });
                    }
                }
            }
        } catch (error) {
            console.error('[YouTube] API error:', error.message);
        }
    }
    
    // Remove duplicates by URL
    const uniqueVideos = [];
    const seenUrls = new Set();
    for (const video of videos) {
        if (!seenUrls.has(video.url)) {
            seenUrls.add(video.url);
            uniqueVideos.push(video);
        }
    }
    
    return uniqueVideos.slice(0, 8);
}

function getYouTubeSearchLinks(query) {
    const encoded = encodeURIComponent(query);
    return [
        { title: `🔍 Search YouTube for "${query}"`, url: `https://www.youtube.com/results?search_query=${encoded}`, channel: "YouTube", thumbnail: "", type: "search_link" },
        { title: `📚 "${query}" - Educational Videos`, url: `https://www.youtube.com/results?search_query=${encoded}+educational`, channel: "YouTube", thumbnail: "", type: "search_link" },
        { title: `📰 "${query}" - News Coverage`, url: `https://www.youtube.com/results?search_query=${encoded}+news`, channel: "YouTube", thumbnail: "", type: "search_link" }
    ];
}

function getYouTubeFallback(query) {
    const encoded = encodeURIComponent(query);
    return [
        { title: `🔍 YouTube Search: "${query}"`, url: `https://www.youtube.com/results?search_query=${encoded}`, channel: "YouTube", thumbnail: "", type: "search_link" },
        { title: `📚 "${query}" - Explained`, url: `https://www.youtube.com/results?search_query=${encoded}+explained`, channel: "YouTube", thumbnail: "", type: "search_link" }
    ];
}

// ============================================
// GENERATE DEEP RESEARCH WITH CITATIONS
// ============================================
async function generateDeepResearch(query, allSources, govSources) {
    const groqKey = process.env.GROQ_API_KEY;
    const citations = [];
    let summary = "";
    let detailedAnalysis = "";
    let keyFindings = [];
    
    // Build citations from ALL sources
    for (const source of allSources.slice(0, 25)) {
        if (source.url && source.snippet) {
            let sourceType = "";
            if (source.type === "government") sourceType = "🏛️ GOVERNMENT";
            else if (source.type === "news") sourceType = "📰 NEWS";
            else sourceType = "🌐 SOURCE";
            
            citations.push({
                text: source.snippet.length > 300 ? source.snippet.substring(0, 300) + '...' : source.snippet,
                source: `${sourceType}: ${source.source}`,
                url: source.url,
                title: source.title
            });
        }
    }
    
    // Extract key findings from government sources
    for (const source of govSources.slice(0, 8)) {
        if (source.snippet) {
            const sentences = source.snippet.split(/[.!?]+/);
            for (const sentence of sentences) {
                if (sentence.length > 40 && sentence.length < 200) {
                    keyFindings.push(sentence.trim() + '.');
                    break;
                }
            }
        }
    }
    
    // Use Groq to synthesize research
    if (groqKey && allSources.length > 0) {
        try {
            const sourcesText = allSources.slice(0, 15).map(s => `[${s.type.toUpperCase()}] ${s.snippet}`).join('\n\n');
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
                            content: `You are a research analyst. Based on the provided sources, create:
1. A comprehensive summary (200-300 words)
2. A detailed analysis with specific data points (300-400 words)

Be factual, use specific numbers and dates.`
                        },
                        {
                            role: 'user',
                            content: `Query: ${query}\n\nSources:\n${sourcesText}`
                        }
                    ],
                    temperature: 0.1,
                    max_tokens: 1200
                })
            });
            
            if (response.ok) {
                const data = await response.json();
                const content = data.choices?.[0]?.message?.content || "";
                const parts = content.split(/\d+\.\s+/);
                if (parts.length >= 2) {
                    summary = parts[0] || `Research findings for "${query}".`;
                    detailedAnalysis = parts.slice(1).join('\n') || content;
                } else {
                    summary = content;
                    detailedAnalysis = content;
                }
            } else {
                summary = `Research findings for "${query}" based on ${allSources.length} sources.`;
                detailedAnalysis = `Based on ${govSources.length} government sources and ${allSources.length - govSources.length} additional sources.`;
            }
        } catch (error) {
            summary = `Research findings for "${query}".`;
            detailedAnalysis = `Review the ${allSources.length} sources below for detailed information.`;
        }
    } else {
        summary = `Research findings for "${query}" based on ${allSources.length} sources.`;
        detailedAnalysis = `This research includes ${govSources.length} government sources. Review the sources below for detailed information.`;
    }
    
    return {
        summary: summary,
        detailedAnalysis: detailedAnalysis,
        keyFindings: keyFindings.slice(0, 8),
        citations: citations
    };
}
