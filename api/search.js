// ============================================
// DEBATESPACE - MAXIMUM DEPTH RESEARCH
// Systematic deep dive across ALL data sources
// YouTube: Direct search links guaranteed to work
// ============================================

export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    
    const { query } = req.query;
    if (!query || query.trim() === '') {
        return res.status(400).json({ error: 'No query provided' });
    }
    
    console.log(`\n========== MAXIMUM DEPTH RESEARCH ==========`);
    console.log(`[API] Query: "${query}"`);
    console.log(`[API] Time: ${new Date().toISOString()}`);
    
    try {
        // LAYER 1: GOVERNMENT SOURCES (Deepest)
        console.log(`\n--- LAYER 1: Deep Government Search ---`);
        const govSources = await searchDeepGovernment(query);
        
        // LAYER 2: ACADEMIC & RESEARCH
        console.log(`\n--- LAYER 2: Deep Academic Search ---`);
        const academicSources = await searchDeepAcademic(query);
        
        // LAYER 3: NEWS & MEDIA
        console.log(`\n--- LAYER 3: Deep News Search ---`);
        const newsSources = await searchDeepNews(query);
        
        // LAYER 4: GENERAL WEB (Tavily)
        console.log(`\n--- LAYER 4: Deep Web Search ---`);
        const webSources = await searchDeepWeb(query);
        
        // LAYER 5: YOUTUBE (Guaranteed to work)
        console.log(`\n--- LAYER 5: Video Content ---`);
        const videoSources = await searchDeepYouTube(query);
        
        // Combine ALL sources
        const allSources = [...govSources, ...academicSources, ...newsSources, ...webSources];
        
        // Generate comprehensive research summary
        const researchSummary = await generateComprehensiveSummary(query, allSources, govSources);
        
        console.log(`\n========== RESEARCH COMPLETE ==========`);
        console.log(`Total Sources: ${allSources.length}`);
        console.log(`Government: ${govSources.length}`);
        console.log(`Academic: ${academicSources.length}`);
        console.log(`News: ${newsSources.length}`);
        console.log(`Web: ${webSources.length}`);
        console.log(`Videos: ${videoSources.length}`);
        
        return res.status(200).json({
            success: true,
            query: query,
            factCheck: {
                verdict: "✅ COMPREHENSIVE RESEARCH",
                summary: researchSummary.summary,
                detailedAnalysis: researchSummary.detailedAnalysis,
                keyDataPoints: researchSummary.keyDataPoints,
                citedClaims: researchSummary.citedClaims,
                sourceBreakdown: {
                    government: govSources.length,
                    academic: academicSources.length,
                    news: newsSources.length,
                    web: webSources.length,
                    total: allSources.length
                },
                tip: "🏛️ Government sources are prioritized. Click any source to verify."
            },
            youtube: videoSources,
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
                tip: "Try using more specific terms"
            },
            youtube: getYouTubeGuaranteed(query)
        });
    }
}

// ============================================
// LAYER 1: DEEP GOVERNMENT SEARCH
// ============================================
async function searchDeepGovernment(query) {
    const apiKey = process.env.GOOGLE_SEARCH_API_KEY;
    const sources = [];
    const seenUrls = new Set();
    
    // Comprehensive list of government agencies
    const agencies = [
        // Canada - Complete
        { name: "Statistics Canada", domain: "statcan.gc.ca", searchTerms: ["data", "statistics", "report"] },
        { name: "Bank of Canada", domain: "bankofcanada.ca", searchTerms: ["policy", "rate", "inflation"] },
        { name: "Government of Canada", domain: "canada.ca", searchTerms: ["official", "policy", "program"] },
        { name: "IRCC", domain: "canada.ca/en/immigration-refugees-citizenship", searchTerms: ["immigration", "visa", "permit"] },
        { name: "RCMP", domain: "rcmp-grc.gc.ca", searchTerms: ["enforcement", "security"] },
        { name: "Health Canada", domain: "hc-sc.gc.ca", searchTerms: ["health", "safety"] },
        { name: "Environment Canada", domain: "canada.ca/en/environment-climate-change", searchTerms: ["climate", "environment"] },
        // USA - Complete
        { name: "ICE", domain: "ice.gov", searchTerms: ["enforcement", "removal", "detention"] },
        { name: "FLETC", domain: "fletc.gov", searchTerms: ["training", "academy", "program"] },
        { name: "DHS", domain: "dhs.gov", searchTerms: ["security", "homeland", "protection"] },
        { name: "BLS", domain: "bls.gov", searchTerms: ["employment", "inflation", "wages"] },
        { name: "Federal Reserve", domain: "federalreserve.gov", searchTerms: ["monetary", "interest", "policy"] },
        { name: "CDC", domain: "cdc.gov", searchTerms: ["disease", "health", "outbreak"] },
        { name: "NIH", domain: "nih.gov", searchTerms: ["research", "medical", "study"] },
        { name: "NASA", domain: "nasa.gov", searchTerms: ["space", "science", "research"] },
        { name: "DOJ", domain: "justice.gov", searchTerms: ["law", "justice", "enforcement"] },
        { name: "State Department", domain: "state.gov", searchTerms: ["foreign", "policy", "international"] },
        { name: "Treasury", domain: "treasury.gov", searchTerms: ["economy", "finance", "tax"] },
        // UK
        { name: "GOV.UK", domain: "gov.uk", searchTerms: ["official", "policy", "service"] },
        { name: "UK Parliament", domain: "parliament.uk", searchTerms: ["legislation", "debate", "bill"] },
        { name: "Bank of England", domain: "bankofengland.co.uk", searchTerms: ["rate", "monetary", "policy"] },
        // International
        { name: "United Nations", domain: "un.org", searchTerms: ["global", "development", "peace"] },
        { name: "World Bank", domain: "worldbank.org", searchTerms: ["development", "economy", "data"] },
        { name: "IMF", domain: "imf.org", searchTerms: ["economic", "financial", "outlook"] },
        { name: "WHO", domain: "who.int", searchTerms: ["health", "global", "disease"] },
        { name: "OECD", domain: "oecd.org", searchTerms: ["economic", "policy", "data"] },
        { name: "NATO", domain: "nato.int", searchTerms: ["defense", "security", "alliance"] }
    ];
    
    for (const agency of agencies) {
        try {
            // Search multiple times with different terms
            for (const term of agency.searchTerms.slice(0, 2)) {
                const searchQuery = `${query} ${term}`;
                const searchUrl = `https://www.googleapis.com/customsearch/v1?key=${apiKey}&cx=${process.env.GOOGLE_SEARCH_CX_NA}&q=${encodeURIComponent(searchQuery)}&siteSearch=${agency.domain}&siteSearchFilter=i&num=5`;
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
            }
        } catch (error) {
            console.error(`[${agency.name}] Error:`, error.message);
        }
    }
    
    return sources;
}

// ============================================
// LAYER 2: DEEP ACADEMIC SEARCH
// ============================================
async function searchDeepAcademic(query) {
    const apiKey = process.env.GOOGLE_SEARCH_API_KEY;
    const sources = [];
    const seenUrls = new Set();
    
    const academicDomains = [
        '.edu', '.ac.uk', '.edu.au', '.ac.nz', '.ac.jp',
        'scholar.google.com', 'researchgate.net', 'academia.edu',
        'jstor.org', 'springer.com', 'sciencedirect.com', 'wiley.com'
    ];
    
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
            console.error(`[Academic] Error:`, error.message);
        }
    }
    
    return sources;
}

// ============================================
// LAYER 3: DEEP NEWS SEARCH
// ============================================
async function searchDeepNews(query) {
    const apiKey = process.env.GNEWS_API_KEY;
    const sources = [];
    
    if (!apiKey) return sources;
    
    try {
        const url = `https://gnews.io/api/v4/search?q=${encodeURIComponent(query)}&lang=en&max=20&token=${apiKey}`;
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
// LAYER 4: DEEP WEB SEARCH
// ============================================
async function searchDeepWeb(query) {
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
                max_results: 25
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
                    snippet: result.content?.substring(0, 600),
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
// LAYER 5: DEEP YOUTUBE SEARCH - GUARANTEED TO WORK
// ============================================
async function searchDeepYouTube(query) {
    // Return guaranteed working YouTube search links
    // These are direct search URLs that ALWAYS work
    return getYouTubeGuaranteed(query);
}

function getYouTubeGuaranteed(query) {
    const encoded = encodeURIComponent(query);
    const encodedExplained = encodeURIComponent(`${query} explained`);
    const encodedDocumentary = encodeURIComponent(`${query} documentary`);
    const encodedAnalysis = encodeURIComponent(`${query} analysis`);
    const encodedNews = encodeURIComponent(`${query} news`);
    
    return [
        {
            title: `🔍 YouTube Search Results for "${query}"`,
            url: `https://www.youtube.com/results?search_query=${encoded}`,
            channel: "YouTube",
            thumbnail: "",
            views: "Click to search",
            isSearchLink: true
        },
        {
            title: `📚 "${query}" - Explained Videos`,
            url: `https://www.youtube.com/results?search_query=${encodedExplained}`,
            channel: "YouTube",
            thumbnail: "",
            views: "Click to search",
            isSearchLink: true
        },
        {
            title: `🎥 "${query}" - Documentaries & Full Length`,
            url: `https://www.youtube.com/results?search_query=${encodedDocumentary}`,
            channel: "YouTube",
            thumbnail: "",
            views: "Click to search",
            isSearchLink: true
        },
        {
            title: `📊 "${query}" - Expert Analysis`,
            url: `https://www.youtube.com/results?search_query=${encodedAnalysis}`,
            channel: "YouTube",
            thumbnail: "",
            views: "Click to search",
            isSearchLink: true
        },
        {
            title: `📰 "${query}" - News Coverage`,
            url: `https://www.youtube.com/results?search_query=${encodedNews}`,
            channel: "YouTube",
            thumbnail: "",
            views: "Click to search",
            isSearchLink: true
        },
        {
            title: `🎓 "${query}" - Educational Content`,
            url: `https://www.youtube.com/results?search_query=${encoded}+educational`,
            channel: "YouTube",
            thumbnail: "",
            views: "Click to search",
            isSearchLink: true
        }
    ];
}

// ============================================
// GENERATE COMPREHENSIVE SUMMARY
// ============================================
async function generateComprehensiveSummary(query, allSources, govSources) {
    const groqKey = process.env.GROQ_API_KEY;
    const citedClaims = [];
    const keyDataPoints = [];
    let summary = "";
    let detailedAnalysis = "";
    
    // Build cited claims from all sources (prioritize government)
    const sortedSources = [...govSources, ...allSources.filter(s => !s.type === 'government')];
    
    for (const source of sortedSources.slice(0, 30)) {
        if (source.url && source.snippet) {
            let prefix = "";
            if (source.type === "government") prefix = "🏛️ GOVERNMENT: ";
            if (source.type === "academic") prefix = "🎓 ACADEMIC: ";
            if (source.type === "news") prefix = "📰 NEWS: ";
            if (source.type === "web") prefix = "🌐 SOURCE: ";
            
            citedClaims.push({
                claim: source.snippet.length > 450 ? source.snippet.substring(0, 450) + '...' : source.snippet,
                source: `${prefix}${source.name}`,
                url: source.url
            });
        }
    }
    
    // Extract key data points from government sources
    for (const source of govSources.slice(0, 10)) {
        if (source.snippet) {
            // Extract sentences with numbers/dates
            const sentences = source.snippet.split(/[.!?]+/);
            for (const sentence of sentences) {
                if (sentence.match(/\d+/) && sentence.length > 30 && sentence.length < 200) {
                    keyDataPoints.push(sentence.trim() + '.');
                }
            }
        }
    }
    
    // Use Groq to synthesize comprehensive findings
    if (groqKey && allSources.length > 0) {
        try {
            const sourcesText = allSources.slice(0, 20).map(s => `[${s.type.toUpperCase()}] ${s.snippet}`).join('\n\n');
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
                            content: `You are a senior research analyst. Based on the provided sources, create:
1. A comprehensive summary (200-300 words)
2. A detailed analysis with specific data points (300-400 words)

Be factual, use specific numbers and dates, and cite sources.`
                        },
                        {
                            role: 'user',
                            content: `Query: ${query}\n\nNumber of sources: ${allSources.length}\n\nSource Content:\n${sourcesText}`
                        }
                    ],
                    temperature: 0.1,
                    max_tokens: 1200
                })
            });
            
            if (response.ok) {
                const data = await response.json();
                const content = data.choices?.[0]?.message?.content || "";
                
                // Split into summary and detailed analysis
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
                detailedAnalysis = `Based on ${govSources.length} government sources, ${academicSources.length} academic sources, and ${allSources.length - govSources.length - academicSources.length} additional sources.`;
            }
        } catch (error) {
            summary = `Research findings for "${query}" based on ${allSources.length} authoritative sources.`;
            detailedAnalysis = `Review the ${allSources.length} sources below for detailed information.`;
        }
    } else {
        summary = `Research findings for "${query}" based on ${allSources.length} authoritative sources.`;
        detailedAnalysis = `This research includes ${govSources.length} government sources. Review the sources below for detailed information.`;
    }
    
    return {
        summary: summary,
        detailedAnalysis: detailedAnalysis,
        keyDataPoints: keyDataPoints.slice(0, 10),
        citedClaims: citedClaims
    };
}
