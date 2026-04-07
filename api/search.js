// ============================================
// DEBATESPACE - COMPLETE DEEP RESEARCH SYSTEM
// Prioritizes: ALL Government CX sources > Archives > Academic > News > Web
// Features: Inline citations, source sections, news articles, YouTube
// ============================================

export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    
    const { query } = req.query;
    if (!query || query.trim() === '') {
        return res.status(400).json({ error: 'No query provided' });
    }
    
    console.log(`\n🔍 DEEP RESEARCH: "${query}"`);
    
    try {
        // LAYER 1: ALL GOVERNMENT CX SOURCES (Priority #1)
        console.log(`\n🏛️ LAYER 1: Government CX Sources...`);
        const govCXSources = await searchAllGovernmentCX(query);
        
        // LAYER 2: GOVERNMENT ARCHIVES (Historical/scrubbed data)
        console.log(`\n📜 LAYER 2: Government Archives...`);
        const archiveSources = await searchGovernmentArchives(query);
        
        // LAYER 3: ACADEMIC RESEARCH
        console.log(`\n🎓 LAYER 3: Academic Research...`);
        const academicSources = await searchAcademicResearch(query);
        
        // LAYER 4: NEWS ARTICLES
        console.log(`\n📰 LAYER 4: News Articles...`);
        const newsArticles = await searchNewsArticles(query);
        
        // LAYER 5: GENERAL WEB
        console.log(`\n🌐 LAYER 5: General Web...`);
        const webSources = await searchGeneralWeb(query);
        
        // LAYER 6: YOUTUBE VIDEOS
        console.log(`\n📺 LAYER 6: YouTube Videos...`);
        const videoSources = await searchYouTubeVideos(query);
        
        // Combine ALL government and archive sources (priority for claims)
        const prioritySources = [...govCXSources, ...archiveSources];
        const allSources = [...prioritySources, ...academicSources, ...webSources];
        
        console.log(`\n📊 RESEARCH COMPLETE:`);
        console.log(`   Government CX: ${govCXSources.length}`);
        console.log(`   Archives: ${archiveSources.length}`);
        console.log(`   Academic: ${academicSources.length}`);
        console.log(`   News Articles: ${newsArticles.length}`);
        console.log(`   Web: ${webSources.length}`);
        console.log(`   YouTube: ${videoSources.length}`);
        
        // Generate research with inline citations
        const research = await generateResearchWithCitations(query, allSources, prioritySources, newsArticles);
        
        return res.status(200).json({
            success: true,
            query: query,
            research: research,
            newsArticles: newsArticles,
            youtube: videoSources,
            allSources: allSources.slice(0, 30),
            timestamp: new Date().toISOString()
        });
        
    } catch (error) {
        console.error('[API] Error:', error);
        return res.status(200).json({
            success: true,
            query: query,
            research: {
                summary: `Research results for "${query}".`,
                keyFindings: [],
                citations: []
            },
            newsArticles: [],
            youtube: []
        });
    }
}

// ============================================
// PRIORITY 1: ALL GOVERNMENT CX SEARCH ENGINES
// ============================================
async function searchAllGovernmentCX(query) {
    const apiKey = process.env.GOOGLE_SEARCH_API_KEY;
    const sources = [];
    const seenUrls = new Set();
    
    // ALL 5 of your CX search engines
    const cxEngines = [
        { name: 'North America', cx: process.env.GOOGLE_SEARCH_CX_NA, priority: 1 },
        { name: 'Asia Pacific', cx: process.env.GOOGLE_SEARCH_CX_ASIA, priority: 2 },
        { name: 'Europe', cx: process.env.GOOGLE_SEARCH_CX_EU, priority: 3 },
        { name: 'Think Tanks', cx: process.env.GOOGLE_SEARCH_CX_TT, priority: 4 },
        { name: 'News', cx: process.env.GOOGLE_SEARCH_CX_NEWS, priority: 5 }
    ];
    
    for (const engine of cxEngines) {
        if (!apiKey || !engine.cx) continue;
        
        try {
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
                            
                            sources.push({
                                title: item.title,
                                url: item.link,
                                snippet: item.snippet,
                                source: `${engine.name} - ${siteName}`,
                                type: "government_cx",
                                priority: engine.priority
                            });
                        }
                    }
                }
            }
        } catch (error) {
            console.error(`[CX ${engine.name}] Error:`, error.message);
        }
    }
    
    // Sort by priority
    sources.sort((a, b) => a.priority - b.priority);
    return sources;
}

// ============================================
// LAYER 2: GOVERNMENT ARCHIVES (Historical/scrubbed)
// ============================================
async function searchGovernmentArchives(query) {
    const apiKey = process.env.GOOGLE_SEARCH_API_KEY;
    const sources = [];
    const seenUrls = new Set();
    
    const archiveDomains = [
        { domain: "archive.org", name: "Internet Archive", type: "digital archive" },
        { domain: "census.gov", name: "US Census Bureau", type: "historical data" },
        { domain: "archives.gov", name: "US National Archives", type: "government records" },
        { domain: "statcan.gc.ca", name: "Statistics Canada", type: "historical data" },
        { domain: "data.gov", name: "US Government Data", type: "open data" },
        { domain: "federalregister.gov", name: "Federal Register", type: "official records" },
        { domain: "govinfo.gov", name: "GovInfo", type: "government documents" }
    ];
    
    for (const archive of archiveDomains) {
        try {
            const searchUrl = `https://www.googleapis.com/customsearch/v1?key=${apiKey}&cx=${process.env.GOOGLE_SEARCH_CX_NA}&q=${encodeURIComponent(query)}&siteSearch=${archive.domain}&siteSearchFilter=i&num=5`;
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
// LAYER 3: ACADEMIC RESEARCH
// ============================================
async function searchAcademicResearch(query) {
    const apiKey = process.env.GOOGLE_SEARCH_API_KEY;
    const sources = [];
    const seenUrls = new Set();
    
    const academicDomains = ['.edu', '.ac.uk', '.edu.au', 'scholar.google.com', 'researchgate.net', 'jstor.org'];
    
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
// LAYER 4: NEWS ARTICLES
// ============================================
async function searchNewsArticles(query) {
    const apiKey = process.env.GNEWS_API_KEY;
    const articles = [];
    
    if (!apiKey) return articles;
    
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
// LAYER 5: GENERAL WEB (Tavily)
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
// LAYER 6: YOUTUBE VIDEOS (Working links)
// ============================================
async function searchYouTubeVideos(query) {
    const videos = [];
    const encoded = encodeURIComponent(query);
    
    // Direct YouTube search links - guaranteed to work
    const searchLinks = [
        { title: `🔍 Search YouTube for "${query}"`, url: `https://www.youtube.com/results?search_query=${encoded}`, channel: "YouTube", type: "search" },
        { title: `📚 "${query}" - Educational Videos`, url: `https://www.youtube.com/results?search_query=${encoded}+educational`, channel: "YouTube", type: "search" },
        { title: `📰 "${query}" - News Coverage`, url: `https://www.youtube.com/results?search_query=${encoded}+news`, channel: "YouTube", type: "search" },
        { title: `🎓 "${query}" - Documentaries`, url: `https://www.youtube.com/results?search_query=${encoded}+documentary`, channel: "YouTube", type: "search" }
    ];
    
    videos.push(...searchLinks);
    
    // Try API for thumbnails if available
    const apiKey = process.env.YOUTUBE_API_KEY;
    if (apiKey) {
        try {
            const url = `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encoded}&type=video&maxResults=6&key=${apiKey}`;
            const response = await fetch(url);
            
            if (response.ok) {
                const data = await response.json();
                if (data.items && data.items.length > 0) {
                    for (const item of data.items) {
                        videos.unshift({
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
            console.log('[YouTube] API error, using search links');
        }
    }
    
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
// GENERATE RESEARCH WITH INLINE CITATIONS
// ============================================
async function generateResearchWithCitations(query, allSources, prioritySources, newsArticles) {
    const groqKey = process.env.GROQ_API_KEY;
    const citations = [];
    const keyFindings = [];
    let researchText = "";
    
    // Build citations with source numbers for inline referencing
    let citationIndex = 1;
    const sourceMap = new Map();
    
    for (const source of prioritySources.slice(0, 20)) {
        if (source.url && source.snippet) {
            sourceMap.set(citationIndex, source);
            citations.push({
                id: citationIndex,
                text: source.snippet.length > 350 ? source.snippet.substring(0, 350) + '...' : source.snippet,
                source: source.source,
                url: source.url,
                type: source.type
            });
            citationIndex++;
        }
    }
    
    // Add additional sources if needed
    for (const source of allSources.slice(0, 15)) {
        if (source.url && source.snippet && !Array.from(sourceMap.values()).some(s => s.url === source.url)) {
            sourceMap.set(citationIndex, source);
            citations.push({
                id: citationIndex,
                text: source.snippet.length > 350 ? source.snippet.substring(0, 350) + '...' : source.snippet,
                source: source.source,
                url: source.url,
                type: source.type
            });
            citationIndex++;
        }
    }
    
    // Extract key findings from government sources
    for (const source of prioritySources.slice(0, 12)) {
        if (source.snippet) {
            const sentences = source.snippet.split(/[.!?]+/);
            for (const sentence of sentences) {
                if (sentence.length > 40 && sentence.length < 200) {
                    if (sentence.match(/\d+/) || sentence.match(/week|month|year|percent|%|training|agent|officer/i)) {
                        keyFindings.push(sentence.trim() + '.');
                        break;
                    }
                }
            }
        }
    }
    
    // Use Groq to create research with inline citations
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
                            content: `You are a research analyst. Create a factual research report based ONLY on the provided source excerpts.

IMPORTANT RULES:
1. Cite every claim using [X] where X is the source number
2. DO NOT add any information not in the sources
3. DO NOT include phrases like "200-300 words" or "summary"
4. Be neutral and factual
5. Use specific numbers and dates from the sources

Format each claim with its citation like this: "Factual statement [1]."`
                        },
                        {
                            role: 'user',
                            content: `Query: ${query}\n\nSources:\n${sourcesText}`
                        }
                    ],
                    temperature: 0.1,
                    max_tokens: 1500
                })
            });
            
            if (response.ok) {
                const data = await response.json();
                researchText = data.choices?.[0]?.message?.content || `Research findings for "${query}".`;
                
                // Clean up
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
        newsCount: newsArticles.length,
        sourceCounts: {
            government: prioritySources.length,
            total: citations.length
        }
    };
}
