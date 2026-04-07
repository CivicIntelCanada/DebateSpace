// ============================================
// DEBATESPACE - MAXIMUM DEPTH RESEARCH SYSTEM
// Prioritizes: ALL Government CX sources > Archives > Academic > News > Web
// Features: Deep research, inline citations, news articles, working YouTube
// ============================================

export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    
    const { query } = req.query;
    if (!query || query.trim() === '') {
        return res.status(400).json({ error: 'No query provided' });
    }
    
    console.log(`\n🔍 MAXIMUM DEPTH RESEARCH: "${query}"`);
    console.log(`⏰ Time: ${new Date().toISOString()}`);
    
    try {
        // LAYER 1: ALL GOVERNMENT CX SOURCES (Priority #1 - Deepest)
        console.log(`\n🏛️ LAYER 1: All Government CX Search Engines...`);
        const govCXSources = await searchAllGovernmentCX(query);
        
        // LAYER 2: SPECIFIC GOVERNMENT AGENCIES (Direct search)
        console.log(`\n🏛️ LAYER 2: Specific Government Agencies...`);
        const agencySources = await searchSpecificAgencies(query);
        
        // LAYER 3: GOVERNMENT ARCHIVES (Historical/scrubbed data)
        console.log(`\n📜 LAYER 3: Government Archives & Historical Data...`);
        const archiveSources = await searchGovernmentArchives(query);
        
        // LAYER 4: ACADEMIC RESEARCH (University studies)
        console.log(`\n🎓 LAYER 4: Academic Research...`);
        const academicSources = await searchAcademicResearch(query);
        
        // LAYER 5: NEWS ARTICLES (GNews API)
        console.log(`\n📰 LAYER 5: News Articles...`);
        const newsArticles = await searchNewsArticles(query);
        
        // LAYER 6: GENERAL WEB (Tavily)
        console.log(`\n🌐 LAYER 6: General Web Search...`);
        const webSources = await searchGeneralWeb(query);
        
        // LAYER 7: YOUTUBE VIDEOS (Fixed)
        console.log(`\n📺 LAYER 7: YouTube Videos...`);
        const videoSources = await searchYouTubeVideos(query);
        
        // Combine ALL priority sources
        const prioritySources = [...govCXSources, ...agencySources, ...archiveSources];
        const allSources = [...prioritySources, ...academicSources, ...webSources];
        
        console.log(`\n📊 RESEARCH COMPLETE:`);
        console.log(`   Government CX: ${govCXSources.length}`);
        console.log(`   Agencies: ${agencySources.length}`);
        console.log(`   Archives: ${archiveSources.length}`);
        console.log(`   Academic: ${academicSources.length}`);
        console.log(`   News Articles: ${newsArticles.length}`);
        console.log(`   Web: ${webSources.length}`);
        console.log(`   YouTube: ${videoSources.length}`);
        console.log(`   TOTAL SOURCES: ${allSources.length}`);
        
        // Generate deep research with inline citations
        const research = await generateDeepResearchWithCitations(query, allSources, prioritySources);
        
        return res.status(200).json({
            success: true,
            query: query,
            research: research,
            newsArticles: newsArticles,
            youtube: videoSources,
            allSources: allSources.slice(0, 40),
            timestamp: new Date().toISOString()
        });
        
    } catch (error) {
        console.error('[API] Fatal Error:', error);
        return res.status(200).json({
            success: true,
            query: query,
            research: {
                summary: `Research results for "${query}". Please try a different search term.`,
                keyFindings: [],
                citations: []
            },
            newsArticles: [],
            youtube: [],
            allSources: []
        });
    }
}

// ============================================
// LAYER 1: ALL GOVERNMENT CX SEARCH ENGINES
// ============================================
async function searchAllGovernmentCX(query) {
    const apiKey = process.env.GOOGLE_SEARCH_API_KEY;
    const sources = [];
    const seenUrls = new Set();
    
    const cxEngines = [
        { name: 'North America', cx: process.env.GOOGLE_SEARCH_CX_NA, priority: 1 },
        { name: 'Asia Pacific', cx: process.env.GOOGLE_SEARCH_CX_ASIA, priority: 2 },
        { name: 'Europe', cx: process.env.GOOGLE_SEARCH_CX_EU, priority: 3 },
        { name: 'Think Tanks', cx: process.env.GOOGLE_SEARCH_CX_TT, priority: 4 },
        { name: 'News', cx: process.env.GOOGLE_SEARCH_CX_NEWS, priority: 5 }
    ];
    
    for (const engine of cxEngines) {
        if (!apiKey || !engine.cx) continue;
        
        // Multiple search attempts with different terms for deeper results
        const searchTerms = [query, `${query} official`, `${query} data`, `${query} report`];
        
        for (const term of searchTerms.slice(0, 2)) {
            try {
                const url = `https://www.googleapis.com/customsearch/v1?key=${apiKey}&cx=${engine.cx}&q=${encodeURIComponent(term)}&num=10`;
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
                                
                                sources.push({
                                    title: item.title,
                                    url: item.link,
                                    snippet: item.snippet,
                                    source: `${engine.name} - ${siteName}`,
                                    type: "government_cx"
                                });
                            }
                        }
                    }
                }
            } catch (error) {
                console.error(`[CX ${engine.name}] Error:`, error.message);
            }
        }
    }
    
    return sources;
}

// ============================================
// LAYER 2: SPECIFIC GOVERNMENT AGENCIES
// ============================================
async function searchSpecificAgencies(query) {
    const apiKey = process.env.GOOGLE_SEARCH_API_KEY;
    const sources = [];
    const seenUrls = new Set();
    
    const agencies = [
        // USA
        { domain: "fletc.gov", name: "FLETC" },
        { domain: "ice.gov", name: "ICE" },
        { domain: "dhs.gov", name: "DHS" },
        { domain: "justice.gov", name: "DOJ" },
        { domain: "bls.gov", name: "BLS" },
        { domain: "federalreserve.gov", name: "Federal Reserve" },
        { domain: "cdc.gov", name: "CDC" },
        { domain: "nih.gov", name: "NIH" },
        // Canada
        { domain: "statcan.gc.ca", name: "Statistics Canada" },
        { domain: "bankofcanada.ca", name: "Bank of Canada" },
        { domain: "canada.ca", name: "Government of Canada" },
        { domain: "rcmp-grc.gc.ca", name: "RCMP" },
        // UK
        { domain: "gov.uk", name: "GOV.UK" },
        { domain: "parliament.uk", name: "UK Parliament" },
        { domain: "mod.uk", name: "UK Ministry of Defence" },
        // International
        { domain: "un.org", name: "United Nations" },
        { domain: "who.int", name: "WHO" },
        { domain: "worldbank.org", name: "World Bank" },
        { domain: "imf.org", name: "IMF" },
        { domain: "nato.int", name: "NATO" }
    ];
    
    for (const agency of agencies) {
        try {
            const url = `https://www.googleapis.com/customsearch/v1?key=${apiKey}&cx=${process.env.GOOGLE_SEARCH_CX_NA}&q=${encodeURIComponent(query)}&siteSearch=${agency.domain}&siteSearchFilter=i&num=5`;
            const response = await fetch(url);
            
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
                                source: `${agency.name} (Official)`,
                                type: "government"
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
// LAYER 3: GOVERNMENT ARCHIVES
// ============================================
async function searchGovernmentArchives(query) {
    const apiKey = process.env.GOOGLE_SEARCH_API_KEY;
    const sources = [];
    const seenUrls = new Set();
    
    const archiveDomains = [
        { domain: "archive.org", name: "Internet Archive" },
        { domain: "archives.gov", name: "US National Archives" },
        { domain: "census.gov", name: "US Census Bureau" },
        { domain: "data.gov", name: "US Government Data" },
        { domain: "federalregister.gov", name: "Federal Register" },
        { domain: "govinfo.gov", name: "GovInfo" }
    ];
    
    for (const archive of archiveDomains) {
        try {
            const url = `https://www.googleapis.com/customsearch/v1?key=${apiKey}&cx=${process.env.GOOGLE_SEARCH_CX_NA}&q=${encodeURIComponent(query)}&siteSearch=${archive.domain}&siteSearchFilter=i&num=5`;
            const response = await fetch(url);
            
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
                                source: `${archive.name} (Archive)`,
                                type: "archive"
                            });
                        }
                    }
                }
            }
        } catch (error) {
            console.error(`[Archive ${archive.name}] Error:`, error.message);
        }
    }
    
    return sources;
}

// ============================================
// LAYER 4: ACADEMIC RESEARCH
// ============================================
async function searchAcademicResearch(query) {
    const apiKey = process.env.GOOGLE_SEARCH_API_KEY;
    const sources = [];
    const seenUrls = new Set();
    
    const academicDomains = ['.edu', '.ac.uk', '.edu.au', 'scholar.google.com', 'researchgate.net'];
    
    for (const domain of academicDomains) {
        try {
            const url = `https://www.googleapis.com/customsearch/v1?key=${apiKey}&cx=${process.env.GOOGLE_SEARCH_CX_NA}&q=${encodeURIComponent(query)}&siteSearch=${domain}&siteSearchFilter=i&num=5`;
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
                            
                            sources.push({
                                title: item.title,
                                url: item.link,
                                snippet: item.snippet,
                                source: `Academic: ${siteName}`,
                                type: "academic"
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
// LAYER 5: NEWS ARTICLES
// ============================================
async function searchNewsArticles(query) {
    const apiKey = process.env.GNEWS_API_KEY;
    const articles = [];
    
    if (!apiKey) return articles;
    
    try {
        const url = `https://gnews.io/api/v4/search?q=${encodeURIComponent(query)}&lang=en&max=25&token=${apiKey}`;
        const response = await fetch(url);
        
        if (response.ok) {
            const data = await response.json();
            if (data.articles && data.articles.length > 0) {
                for (const article of data.articles) {
                    let siteName = "";
                    try {
                        siteName = new URL(article.url).hostname.replace('www.', '');
                    } catch(e) {}
                    
                    articles.push({
                        title: article.title,
                        url: article.url,
                        source: siteName,
                        date: article.publishedAt?.split('T')[0],
                        description: article.description,
                        type: "news"
                    });
                }
            }
        }
    } catch (error) {
        console.error('[GNews] Error:', error.message);
    }
    
    return articles;
}

// ============================================
// LAYER 6: GENERAL WEB (Tavily)
// ============================================
async function searchGeneralWeb(query) {
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
// LAYER 7: YOUTUBE VIDEOS (Working with thumbnails)
// ============================================
async function searchYouTubeVideos(query) {
    const videos = [];
    const apiKey = process.env.YOUTUBE_API_KEY;
    const encoded = encodeURIComponent(query);
    
    if (apiKey) {
        try {
            // Search for videos
            const searchUrl = `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encoded}&type=video&maxResults=8&key=${apiKey}`;
            const searchResponse = await fetch(searchUrl);
            
            if (searchResponse.ok) {
                const searchData = await searchResponse.json();
                if (searchData.items && searchData.items.length > 0) {
                    // Get video IDs for statistics
                    const videoIds = searchData.items.map(item => item.id.videoId).join(',');
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
                    
                    for (const item of searchData.items) {
                        videos.push({
                            title: item.snippet.title,
                            url: `https://www.youtube.com/watch?v=${item.id.videoId}`,
                            channel: item.snippet.channelTitle,
                            thumbnail: item.snippet.thumbnails?.medium?.url || '',
                            views: statsMap[item.id.videoId]?.views || 'N/A',
                            type: "video"
                        });
                    }
                }
            }
        } catch (error) {
            console.error('[YouTube] API error:', error.message);
        }
    }
    
    // Always add search links as fallback
    videos.push({
        title: `🔍 Search YouTube for "${query}"`,
        url: `https://www.youtube.com/results?search_query=${encoded}`,
        channel: "YouTube Search",
        thumbnail: "",
        type: "search"
    });
    
    // Remove duplicates
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

// ============================================
// GENERATE DEEP RESEARCH WITH INLINE CITATIONS
// ============================================
async function generateDeepResearchWithCitations(query, allSources, prioritySources) {
    const groqKey = process.env.GROQ_API_KEY;
    const citations = [];
    const keyFindings = [];
    let researchText = "";
    
    // Build citations with source numbers
    let citationId = 1;
    const sourceMap = new Map();
    
    // Prioritize government and archive sources
    const orderedSources = [...prioritySources, ...allSources.filter(s => !prioritySources.includes(s))];
    
    for (const source of orderedSources.slice(0, 30)) {
        if (source.url && source.snippet) {
            sourceMap.set(citationId, source);
            
            let typeIcon = "";
            if (source.type === "government_cx") typeIcon = "🏛️";
            else if (source.type === "government") typeIcon = "🏛️";
            else if (source.type === "archive") typeIcon = "📜";
            else if (source.type === "academic") typeIcon = "🎓";
            else if (source.type === "web") typeIcon = "🌐";
            else typeIcon = "📄";
            
            citations.push({
                id: citationId,
                text: source.snippet.length > 400 ? source.snippet.substring(0, 400) + '...' : source.snippet,
                source: `${typeIcon} ${source.source}`,
                url: source.url,
                type: source.type
            });
            citationId++;
        }
    }
    
    // Extract key findings from priority sources
    for (const source of prioritySources.slice(0, 15)) {
        if (source.snippet) {
            const sentences = source.snippet.split(/[.!?]+/);
            for (const sentence of sentences) {
                if (sentence.length > 40 && sentence.length < 200) {
                    if (sentence.match(/\d+/) || sentence.length > 50) {
                        keyFindings.push(sentence.trim() + '.');
                        break;
                    }
                }
            }
        }
    }
    
    // Use Groq to generate research with citations
    if (groqKey && citations.length > 0) {
        try {
            const sourcesText = citations.map(c => `[${c.id}] ${c.text}`).join('\n\n');
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
                            content: `You are a research analyst. Create a detailed, factual research report based ONLY on the provided sources.

CRITICAL RULES:
1. Cite EVERY factual claim with [X] where X is the source number
2. Use MULTIPLE citations when a claim is supported by multiple sources [1][2][3]
3. DO NOT add information not in the sources
4. DO NOT use phrases like "200-300 words"
5. Be specific with numbers, dates, and statistics
6. Organize information logically

Example format: "ICE agents must complete 12 weeks of CITP training at FLETC [1][2]. The program includes physical fitness assessments [3]."`
                        },
                        {
                            role: 'user',
                            content: `Query: ${query}\n\nTotal Sources: ${citations.length}\n\nSources:\n${sourcesText}`
                        }
                    ],
                    temperature: 0.1,
                    max_tokens: 2000
                })
            });
            
            if (response.ok) {
                const data = await response.json();
                researchText = data.choices?.[0]?.message?.content || `Research findings for "${query}" based on ${citations.length} sources.`;
                researchText = researchText.replace(/\d{3}-\d{3}\s*words?/gi, '');
                researchText = researchText.replace(/Comprehensive Summary:?/gi, '');
                researchText = researchText.trim();
            } else {
                researchText = `Research findings for "${query}" based on ${citations.length} sources.`;
            }
        } catch (error) {
            researchText = `Research findings for "${query}" based on ${citations.length} sources.`;
        }
    } else {
        researchText = `Research findings for "${query}" based on ${citations.length} sources.`;
    }
    
    // Remove duplicate key findings
    const uniqueFindings = [];
    for (const finding of keyFindings) {
        if (!uniqueFindings.some(f => f === finding)) {
            uniqueFindings.push(finding);
        }
    }
    
    return {
        summary: researchText,
        keyFindings: uniqueFindings.slice(0, 12),
        citations: citations,
        sourceCounts: {
            government: prioritySources.length,
            academic: allSources.filter(s => s.type === "academic").length,
            total: citations.length
        }
    };
}
