// ============================================
// DEBATESPACE - IN-DEPTH ANSWER + DEEP RESEARCH
// Priority: Government CX > Archives > Academic > News > Web
// Features: In-depth answer + deep research + inline citations
// ============================================

export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    
    const { query } = req.query;
    if (!query || query.trim() === '') {
        return res.status(400).json({ error: 'No query provided' });
    }
    
    console.log(`\n🔍 IN-DEPTH RESEARCH: "${query}"`);
    console.log(`⏰ Time: ${new Date().toISOString()}`);
    
    try {
        // LAYER 1: ALL GOVERNMENT CX SOURCES
        console.log(`\n🏛️ LAYER 1: All Government CX Search Engines...`);
        const govCXSources = await searchAllGovernmentCX(query);
        
        // LAYER 2: SPECIFIC GOVERNMENT AGENCIES
        console.log(`\n🏛️ LAYER 2: Specific Government Agencies...`);
        const agencySources = await searchSpecificAgencies(query);
        
        // LAYER 3: GOVERNMENT ARCHIVES (Historical/scrubbed data)
        console.log(`\n📜 LAYER 3: Government Archives & Historical Data...`);
        const archiveSources = await searchGovernmentArchives(query);
        
        // LAYER 4: ACADEMIC RESEARCH
        console.log(`\n🎓 LAYER 4: Academic Research...`);
        const academicSources = await searchAcademicResearch(query);
        
        // LAYER 5: NEWS ARTICLES
        console.log(`\n📰 LAYER 5: News Articles...`);
        const newsArticles = await searchNewsArticles(query);
        
        // LAYER 6: VIDEO SOURCES
        console.log(`\n📺 LAYER 6: Video Sources...`);
        const videoSources = await searchVideoSources(query);
        
        // LAYER 7: GENERAL WEB (Tavily)
        console.log(`\n🌐 LAYER 7: General Web Search...`);
        const webSources = await searchGeneralWeb(query);
        
        // Combine ALL sources
        const prioritySources = [...govCXSources, ...agencySources, ...archiveSources];
        const allSources = [...prioritySources, ...academicSources, ...videoSources, ...webSources];
        
        console.log(`\n📊 RESEARCH COMPLETE:`);
        console.log(`   Government CX: ${govCXSources.length}`);
        console.log(`   Agencies: ${agencySources.length}`);
        console.log(`   Archives: ${archiveSources.length}`);
        console.log(`   Academic: ${academicSources.length}`);
        console.log(`   News: ${newsArticles.length}`);
        console.log(`   Video: ${videoSources.length}`);
        console.log(`   Web: ${webSources.length}`);
        console.log(`   TOTAL SOURCES: ${allSources.length}`);
        
        // Generate IN-DEPTH ANSWER (detailed, with citations)
        const inDepthAnswer = await generateInDepthAnswer(query, allSources, prioritySources);
        
        // Generate DEEP RESEARCH (detailed findings)
        const deepResearch = await generateDeepResearch(query, allSources, prioritySources);
        
        return res.status(200).json({
            success: true,
            query: query,
            answer: inDepthAnswer,
            research: deepResearch,
            newsArticles: newsArticles,
            allSources: allSources.slice(0, 60),
            timestamp: new Date().toISOString()
        });
        
    } catch (error) {
        console.error('[API] Error:', error);
        return res.status(200).json({
            success: true,
            query: query,
            answer: {
                text: `Based on research, here is what we found about "${query}". Please review the sources below for detailed information.`,
                citations: []
            },
            research: {
                summary: `Research findings for "${query}". Please review the sources below.`,
                keyFindings: [],
                citations: []
            },
            newsArticles: [],
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
    
    const searchTerms = [query, `${query} official`, `${query} data`, `${query} report`];
    
    for (const engine of cxEngines) {
        if (!apiKey || !engine.cx) continue;
        
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
                                    source: `${engine.name} Gov - ${siteName}`,
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
        { domain: "fletc.gov", name: "FLETC", type: "Training" },
        { domain: "ice.gov", name: "ICE", type: "Immigration" },
        { domain: "dhs.gov", name: "DHS", type: "Homeland Security" },
        { domain: "justice.gov", name: "DOJ", type: "Justice" },
        { domain: "bls.gov", name: "BLS", type: "Labor Statistics" },
        { domain: "federalreserve.gov", name: "Federal Reserve", type: "Monetary" },
        { domain: "cdc.gov", name: "CDC", type: "Health" },
        { domain: "nih.gov", name: "NIH", type: "Research" },
        { domain: "statcan.gc.ca", name: "Statistics Canada", type: "Statistics" },
        { domain: "bankofcanada.ca", name: "Bank of Canada", type: "Monetary" },
        { domain: "canada.ca", name: "Government of Canada", type: "Federal" },
        { domain: "gov.uk", name: "GOV.UK", type: "Government" },
        { domain: "un.org", name: "United Nations", type: "International" },
        { domain: "who.int", name: "WHO", type: "Health" }
    ];
    
    for (const agency of agencies) {
        try {
            const url = `https://www.googleapis.com/customsearch/v1?key=${apiKey}&cx=${process.env.GOOGLE_SEARCH_CX_NA}&q=${encodeURIComponent(query)}&siteSearch=${agency.domain}&siteSearchFilter=i&num=6`;
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
                                source: `${agency.name} (${agency.type})`,
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
        { domain: "archive.org", name: "Internet Archive", type: "Digital Archive" },
        { domain: "archives.gov", name: "US National Archives", type: "Historical Records" },
        { domain: "census.gov", name: "US Census Bureau", type: "Historical Data" },
        { domain: "data.gov", name: "US Government Data", type: "Open Data" },
        { domain: "federalregister.gov", name: "Federal Register", type: "Official Records" },
        { domain: "govinfo.gov", name: "GovInfo", type: "Government Documents" }
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
                                source: `${archive.name} (${archive.type})`,
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
                        description: article.description?.substring(0, 200),
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
// LAYER 6: VIDEO SOURCES
// ============================================
async function searchVideoSources(query) {
    const sources = [];
    const apiKey = process.env.YOUTUBE_API_KEY;
    const encoded = encodeURIComponent(query);
    
    sources.push({
        title: `YouTube Search Results for "${query}"`,
        url: `https://www.youtube.com/results?search_query=${encoded}`,
        snippet: `Search YouTube for videos about "${query}". Click to find documentaries, news coverage, and educational content.`,
        source: "YouTube Search",
        type: "video"
    });
    
    if (apiKey) {
        try {
            const url = `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encoded}&type=video&maxResults=5&key=${apiKey}`;
            const response = await fetch(url);
            
            if (response.ok) {
                const data = await response.json();
                if (data.items && data.items.length > 0) {
                    for (const item of data.items) {
                        sources.push({
                            title: item.snippet.title,
                            url: `https://www.youtube.com/watch?v=${item.id.videoId}`,
                            snippet: item.snippet.description || `Video from ${item.snippet.channelTitle}`,
                            source: `YouTube: ${item.snippet.channelTitle}`,
                            type: "video"
                        });
                    }
                }
            }
        } catch (error) {
            console.error('[YouTube] Error:', error.message);
        }
    }
    
    return sources;
}

// ============================================
// LAYER 7: GENERAL WEB (Tavily)
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
// GENERATE IN-DEPTH ANSWER (Detailed, with citations)
// ============================================
async function generateInDepthAnswer(query, allSources, prioritySources) {
    const groqKey = process.env.GROQ_API_KEY;
    let answerText = "";
    const answerCitations = [];
    
    // Build citations from priority sources (government first)
    let citationId = 1;
    const sourceMap = new Map();
    
    for (const source of prioritySources.slice(0, 20)) {
        if (source.url && source.snippet) {
            sourceMap.set(citationId, source);
            answerCitations.push({
                id: citationId,
                source: source.source,
                url: source.url,
                text: source.snippet.substring(0, 300)
            });
            citationId++;
        }
    }
    
    // Add top web sources if needed
    if (answerCitations.length < 10) {
        for (const source of allSources.slice(0, 15)) {
            if (source.url && source.snippet && !sourceMap.has(source)) {
                sourceMap.set(citationId, source);
                answerCitations.push({
                    id: citationId,
                    source: source.source,
                    url: source.url,
                    text: source.snippet.substring(0, 300)
                });
                citationId++;
            }
        }
    }
    
    if (groqKey && answerCitations.length > 0) {
        try {
            const sourcesText = answerCitations.map(c => `[${c.id}] ${c.text}`).join('\n\n');
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
                            content: `You are a research analyst. Provide a DETAILED, COMPREHENSIVE answer to the user's question based ONLY on the sources.

RULES:
1. Write a thorough answer (3-5 paragraphs)
2. Cite EVERY factual claim with [X]
3. Include specific numbers, dates, and statistics
4. Organize information logically
5. DO NOT add information not in the sources
6. Be neutral and factual`
                        },
                        {
                            role: 'user',
                            content: `Question: ${query}\n\nNumber of sources: ${answerCitations.length}\n\nSources:\n${sourcesText}`
                        }
                    ],
                    temperature: 0.1,
                    max_tokens: 800
                })
            });
            
            if (response.ok) {
                const data = await response.json();
                answerText = data.choices?.[0]?.message?.content || `Based on ${answerCitations.length} sources, here is what we found about "${query}".`;
            } else {
                answerText = `Based on ${answerCitations.length} government and official sources, here is what we found about "${query}".`;
            }
        } catch (error) {
            answerText = `Based on ${answerCitations.length} sources, here is what we found about "${query}".`;
        }
    } else {
        answerText = `Based on ${answerCitations.length} government and official sources, here is what we found about "${query}".`;
    }
    
    return {
        text: answerText,
        citations: answerCitations
    };
}

// ============================================
// GENERATE DEEP RESEARCH
// ============================================
async function generateDeepResearch(query, allSources, prioritySources) {
    const groqKey = process.env.GROQ_API_KEY;
    const citations = [];
    const keyFindings = [];
    let researchText = "";
    
    // Build citations
    let citationId = 1;
    const orderedSources = [...prioritySources, ...allSources.filter(s => s.type === "academic"), ...allSources.filter(s => s.type === "video"), ...allSources.filter(s => s.type === "web")];
    
    for (const source of orderedSources.slice(0, 45)) {
        if (source.url && source.snippet) {
            let typeIcon = "";
            if (source.type === "government_cx") typeIcon = "🏛️ GOV";
            else if (source.type === "government") typeIcon = "🏛️ GOV";
            else if (source.type === "archive") typeIcon = "📜 ARCHIVE";
            else if (source.type === "academic") typeIcon = "🎓 ACADEMIC";
            else if (source.type === "video") typeIcon = "📺 VIDEO";
            else typeIcon = "🌐 WEB";
            
            citations.push({
                id: citationId,
                text: source.snippet.length > 450 ? source.snippet.substring(0, 450) + '...' : source.snippet,
                source: `${typeIcon} ${source.source}`,
                url: source.url,
                type: source.type
            });
            citationId++;
        }
    }
    
    // Extract key findings
    for (const source of prioritySources.slice(0, 15)) {
        if (source.snippet) {
            const sentences = source.snippet.split(/[.!?]+/);
            for (const sentence of sentences) {
                if (sentence.length > 40 && sentence.length < 200) {
                    if (sentence.match(/\d+/) || sentence.length > 60) {
                        keyFindings.push(sentence.trim() + '.');
                        break;
                    }
                }
            }
        }
    }
    
    // Generate deep research
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
                            content: `You are a senior research analyst. Create a DETAILED, FACTUAL research report based ONLY on the provided sources.

RULES:
1. Cite EVERY factual claim with [X]
2. Use MULTIPLE citations when supported [1][2][3]
3. Prioritize government and archive sources
4. Be specific with numbers, dates, and statistics
5. DO NOT add information not in the sources
6. Organize with clear sections`
                        },
                        {
                            role: 'user',
                            content: `Query: ${query}\n\nTotal Sources: ${citations.length}\nGovernment/Archive: ${prioritySources.length}\n\nSources:\n${sourcesText}`
                        }
                    ],
                    temperature: 0.1,
                    max_tokens: 2500
                })
            });
            
            if (response.ok) {
                const data = await response.json();
                researchText = data.choices?.[0]?.message?.content || `Research findings for "${query}" based on ${citations.length} sources.`;
                researchText = researchText.replace(/\d{3}-\d{3}\s*words?/gi, '');
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
